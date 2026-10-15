// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RecordRegistry
 * @author ChainKit Platform Team
 * @notice On-chain registry for anchoring tamper-evident cryptographic record hashes.
 * @dev Provides immutable, timestamped proof-of-existence on EVM blockchains.
 * Emits events on anchoring for efficient off-chain indexing and audit verification.
 */
contract RecordRegistry {
    /// @dev Internal mapping storing the anchor status of each 32-byte record hash.
    mapping(bytes32 => bool) private anchored;

    /**
     * @notice Emitted whenever a new record hash is successfully anchored.
     * @param recordHash The 32-byte cryptographic hash of the record content.
     * @param externalReference A secondary 32-byte identifier (e.g. tenant UUID, database ID, or entity reference).
     * @param submitter The address of the account or relayer that initiated the anchor transaction.
     */
    event RecordAnchored(
        bytes32 indexed recordHash,
        bytes32 indexed externalReference,
        address indexed submitter
    );

    /**
     * @notice Reverted when an operation is attempted with an empty (zero) record hash (`bytes32(0)`).
     */
    error EmptyRecordHash();

    /**
     * @notice Reverted when attempting to anchor a record hash that has already been anchored.
     */
    error AlreadyAnchored();

    /**
     * @notice Anchors a cryptographic record hash along with an external reference identifier.
     * @dev Enforces the following constraints:
     * - `recordHash` must not be `bytes32(0)` (reverts with `EmptyRecordHash`).
     * - `recordHash` must not have been previously anchored (reverts with `AlreadyAnchored`).
     * On success, marks the record hash as anchored and emits a `RecordAnchored` event.
     * @param recordHash The 32-byte cryptographic hash (e.g. Keccak-256 or SHA-256) of the record.
     * @param externalReference A 32-byte external reference identifier for indexing and correlation.
     */
    function anchor(bytes32 recordHash, bytes32 externalReference) external {
        if (recordHash == bytes32(0)) {
            revert EmptyRecordHash();
        }
        if (anchored[recordHash]) {
            revert AlreadyAnchored();
        }

        anchored[recordHash] = true;
        emit RecordAnchored(recordHash, externalReference, msg.sender);
    }

    /**
     * @notice Checks whether a given record hash has been anchored in this registry.
     * @param recordHash The 32-byte cryptographic hash of the record to query.
     * @return True if the record hash is anchored, false otherwise.
     */
    function isAnchored(bytes32 recordHash) external view returns (bool) {
        return anchored[recordHash];
    }
}
