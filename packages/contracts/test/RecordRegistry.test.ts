import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import type { RecordRegistry } from "../typechain-types";

/**
 * Test fixture return type representing deployed contract and test signers.
 */
interface DeploymentFixture {
  recordRegistry: RecordRegistry;
  deployer: SignerWithAddress;
  submitter1: SignerWithAddress;
  submitter2: SignerWithAddress;
  submitter3: SignerWithAddress;
}

describe("RecordRegistry", () => {
  /**
   * Deploys a fresh instance of the RecordRegistry contract for test isolation.
   *
   * @returns An object containing the deployed contract instance and signers.
   */
  async function deployRecordRegistryFixture(): Promise<DeploymentFixture> {
    const [deployer, submitter1, submitter2, submitter3] = await ethers.getSigners();

    if (!deployer || !submitter1 || !submitter2 || !submitter3) {
      throw new Error("Insufficient signers available for test suite");
    }

    const RecordRegistryFactory = await ethers.getContractFactory("RecordRegistry", deployer);
    const recordRegistry = (await RecordRegistryFactory.deploy()) as unknown as RecordRegistry;
    await recordRegistry.waitForDeployment();

    return {
      recordRegistry,
      deployer,
      submitter1,
      submitter2,
      submitter3,
    };
  }

  /**
   * Utility helper to create a deterministic 32-byte hash from a string payload.
   *
   * @param payload - Input string to be hashed with Keccak-256.
   * @returns A 0x-prefixed 32-byte hexadecimal hash string.
   */
  function hashString(payload: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(payload));
  }

  describe("Deployment & Initialization", () => {
    it("should deploy successfully and provide a valid contract address", async () => {
      const { recordRegistry } = await loadFixture(deployRecordRegistryFixture);
      const address = await recordRegistry.getAddress();
      expect(address).to.properAddress;
    });

    it("should return false for never-anchored record hashes", async () => {
      const { recordRegistry } = await loadFixture(deployRecordRegistryFixture);
      const unanchoredHash = hashString("chainkit-unanchored-test-hash");
      const isAnchored = await recordRegistry.isAnchored(unanchoredHash);
      expect(isAnchored).to.be.false;
    });

    it("should return false for the zero hash before any action", async () => {
      const { recordRegistry } = await loadFixture(deployRecordRegistryFixture);
      const isAnchored = await recordRegistry.isAnchored(ethers.ZeroHash);
      expect(isAnchored).to.be.false;
    });
  });

  describe("Anchoring Records", () => {
    it("should anchor a valid hash successfully and emit RecordAnchored event with correct args", async () => {
      const { recordRegistry, submitter1 } = await loadFixture(deployRecordRegistryFixture);
      const recordHash = hashString("document-checksum-2026-10-14-001");
      const externalRef = hashString("tenant-uuid-1111-2222");

      await expect(
        recordRegistry.connect(submitter1).anchor(recordHash, externalRef)
      )
        .to.emit(recordRegistry, "RecordAnchored")
        .withArgs(recordHash, externalRef, submitter1.address);
    });

    it("should return true from isAnchored after anchoring, and false for never-anchored hash", async () => {
      const { recordRegistry, submitter1 } = await loadFixture(deployRecordRegistryFixture);
      const recordHash = hashString("anchored-record-content");
      const unanchoredHash = hashString("unanchored-record-content");
      const externalRef = hashString("external-id-12345");

      // Verify initial state
      expect(await recordRegistry.isAnchored(recordHash)).to.be.false;
      expect(await recordRegistry.isAnchored(unanchoredHash)).to.be.false;

      // Anchor record
      await recordRegistry.connect(submitter1).anchor(recordHash, externalRef);

      // Verify updated state
      expect(await recordRegistry.isAnchored(recordHash)).to.be.true;
      expect(await recordRegistry.isAnchored(unanchoredHash)).to.be.false;
    });

    it("should ensure external reference and submitter in event match submitted values", async () => {
      const { recordRegistry, submitter2 } = await loadFixture(deployRecordRegistryFixture);
      const recordHash = hashString("invoice-payload-audit");
      const externalRef = hashString("external-invoice-ref-789");

      const tx = await recordRegistry.connect(submitter2).anchor(recordHash, externalRef);

      await expect(tx)
        .to.emit(recordRegistry, "RecordAnchored")
        .withArgs(recordHash, externalRef, submitter2.address);
    });

    it("should allow anchoring with zero hash as external reference when reference is omitted", async () => {
      const { recordRegistry, submitter1 } = await loadFixture(deployRecordRegistryFixture);
      const recordHash = hashString("record-without-external-ref");
      const emptyRef = ethers.ZeroHash;

      await expect(
        recordRegistry.connect(submitter1).anchor(recordHash, emptyRef)
      )
        .to.emit(recordRegistry, "RecordAnchored")
        .withArgs(recordHash, emptyRef, submitter1.address);

      expect(await recordRegistry.isAnchored(recordHash)).to.be.true;
    });
  });

  describe("Validation & Error Cases", () => {
    it("should reject zero hash (bytes32(0)) with EmptyRecordHash()", async () => {
      const { recordRegistry, submitter1 } = await loadFixture(deployRecordRegistryFixture);
      const zeroHash = ethers.ZeroHash;
      const externalRef = hashString("valid-ref-for-zero-hash-test");

      await expect(
        recordRegistry.connect(submitter1).anchor(zeroHash, externalRef)
      ).to.be.revertedWithCustomError(recordRegistry, "EmptyRecordHash");

      // Ensure zero hash is not recorded as anchored
      expect(await recordRegistry.isAnchored(zeroHash)).to.be.false;
    });

    it("should reject duplicate hash with AlreadyAnchored()", async () => {
      const { recordRegistry, submitter1 } = await loadFixture(deployRecordRegistryFixture);
      const recordHash = hashString("duplicate-prevention-record");
      const firstRef = hashString("ref-attempt-one");
      const secondRef = hashString("ref-attempt-two");

      // First anchoring attempt succeeds
      await recordRegistry.connect(submitter1).anchor(recordHash, firstRef);
      expect(await recordRegistry.isAnchored(recordHash)).to.be.true;

      // Second anchoring attempt with the same recordHash must fail
      await expect(
        recordRegistry.connect(submitter1).anchor(recordHash, secondRef)
      ).to.be.revertedWithCustomError(recordRegistry, "AlreadyAnchored");
    });

    it("should reject duplicate hash even if attempted by a different account", async () => {
      const { recordRegistry, submitter1, submitter2 } = await loadFixture(
        deployRecordRegistryFixture
      );
      const recordHash = hashString("cross-account-duplicate-test");
      const ref1 = hashString("ref-submitter-1");
      const ref2 = hashString("ref-submitter-2");

      // Submitter 1 anchors first
      await recordRegistry.connect(submitter1).anchor(recordHash, ref1);
      expect(await recordRegistry.isAnchored(recordHash)).to.be.true;

      // Submitter 2 attempts to anchor the same recordHash
      await expect(
        recordRegistry.connect(submitter2).anchor(recordHash, ref2)
      ).to.be.revertedWithCustomError(recordRegistry, "AlreadyAnchored");
    });
  });

  describe("Multi-Record & Multi-Account Anchoring", () => {
    it("should allow different hashes to be anchored independently", async () => {
      const { recordRegistry, submitter1 } = await loadFixture(deployRecordRegistryFixture);
      const hash1 = hashString("independent-hash-alpha");
      const hash2 = hashString("independent-hash-beta");
      const hash3 = hashString("independent-hash-gamma");
      const sharedRef = hashString("shared-tenant-ref");

      // Anchor hash 1
      await recordRegistry.connect(submitter1).anchor(hash1, sharedRef);
      expect(await recordRegistry.isAnchored(hash1)).to.be.true;
      expect(await recordRegistry.isAnchored(hash2)).to.be.false;
      expect(await recordRegistry.isAnchored(hash3)).to.be.false;

      // Anchor hash 2
      await recordRegistry.connect(submitter1).anchor(hash2, sharedRef);
      expect(await recordRegistry.isAnchored(hash1)).to.be.true;
      expect(await recordRegistry.isAnchored(hash2)).to.be.true;
      expect(await recordRegistry.isAnchored(hash3)).to.be.false;

      // Anchor hash 3
      await recordRegistry.connect(submitter1).anchor(hash3, sharedRef);
      expect(await recordRegistry.isAnchored(hash1)).to.be.true;
      expect(await recordRegistry.isAnchored(hash2)).to.be.true;
      expect(await recordRegistry.isAnchored(hash3)).to.be.true;
    });

    it("should allow multiple records to be anchored by different accounts", async () => {
      const { recordRegistry, submitter1, submitter2, submitter3 } = await loadFixture(
        deployRecordRegistryFixture
      );

      const testEntries: Array<{
        hash: string;
        ref: string;
        submitter: SignerWithAddress;
      }> = [
        {
          hash: hashString("record-by-account-1"),
          ref: hashString("tenant-account-1"),
          submitter: submitter1,
        },
        {
          hash: hashString("record-by-account-2"),
          ref: hashString("tenant-account-2"),
          submitter: submitter2,
        },
        {
          hash: hashString("record-by-account-3"),
          ref: hashString("tenant-account-3"),
          submitter: submitter3,
        },
      ];

      for (const entry of testEntries) {
        await expect(
          recordRegistry.connect(entry.submitter).anchor(entry.hash, entry.ref)
        )
          .to.emit(recordRegistry, "RecordAnchored")
          .withArgs(entry.hash, entry.ref, entry.submitter.address);

        expect(await recordRegistry.isAnchored(entry.hash)).to.be.true;
      }
    });

    it("should handle sequential anchoring of multiple distinct records in volume", async () => {
      const { recordRegistry, submitter1 } = await loadFixture(deployRecordRegistryFixture);
      const totalRecords = 8;
      const records: string[] = [];

      for (let i = 0; i < totalRecords; i++) {
        const hash = hashString(`high-volume-batch-record-${i}`);
        const ref = hashString(`high-volume-batch-ref-${i}`);
        records.push(hash);

        await recordRegistry.connect(submitter1).anchor(hash, ref);
      }

      for (const hash of records) {
        expect(await recordRegistry.isAnchored(hash)).to.be.true;
      }
    });
  });
});
