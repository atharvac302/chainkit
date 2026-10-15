import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "node:path";

// Load environment variables from the repository root .env file as well as local .env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

/**
 * Main deployment script for the RecordRegistry smart contract.
 *
 * Deploys the contract to the active Hardhat network (e.g. Sepolia, localhost, or hardhat),
 * waits for block confirmation, and outputs the deployed contract address and deployment
 * transaction hash for downstream environment configuration.
 *
 * @returns A promise that resolves when deployment is complete.
 */
async function main(): Promise<void> {
  console.log("==================================================");
  console.log("       ChainKit RecordRegistry Deployment         ");
  console.log("==================================================");
  console.log(`Target Network:   ${network.name}`);

  const networkData = await ethers.provider.getNetwork();
  console.log(`Chain ID:         ${networkData.chainId.toString()}`);

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  if (!deployer) {
    throw new Error(
      "No deployer signer available. Ensure DEPLOYER_PRIVATE_KEY is set in .env or accounts are configured in hardhat.config.ts."
    );
  }

  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log(`Deployer Address: ${deployerAddress}`);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} ETH`);
  console.log("--------------------------------------------------");
  console.log("Deploying RecordRegistry contract...");

  const RecordRegistryFactory = await ethers.getContractFactory("RecordRegistry", deployer);
  const recordRegistry = await RecordRegistryFactory.deploy();

  console.log("Waiting for deployment transaction to be mined...");
  await recordRegistry.waitForDeployment();

  const contractAddress = await recordRegistry.getAddress();
  const deploymentTx = recordRegistry.deploymentTransaction();
  const txHash = deploymentTx ? deploymentTx.hash : "N/A (already mined)";

  console.log("--------------------------------------------------");
  console.log("RecordRegistry deployed successfully!");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Transaction Hash: ${txHash}`);
  console.log("==================================================");
  console.log("Required .env configuration:");
  console.log(`RECORD_REGISTRY_ADDRESS=${contractAddress}`);
  console.log("==================================================");
}

// Execute deployment entry point with error handling
main().catch((error: unknown) => {
  console.error("Fatal deployment error:", error);
  process.exitCode = 1;
});
