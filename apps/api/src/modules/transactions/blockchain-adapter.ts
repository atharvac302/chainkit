/**
 * @fileoverview EVM Blockchain adapter using Viem for smart contract anchoring and receipt verification.
 */

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Hash,
  type PublicClient,
  type WalletClient,
  type Chain,
} from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { AppError } from '../../lib/errors.js';
import { toBytes32Hex } from '../../lib/crypto.js';

/**
 * RecordRegistry smart contract ABI.
 */
export const RECORD_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'anchor',
    inputs: [
      { name: 'recordHash', type: 'bytes32' },
      { name: 'externalReference', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'isAnchored',
    inputs: [{ name: 'recordHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRecord',
    inputs: [{ name: 'recordHash', type: 'bytes32' }],
    outputs: [
      { name: 'externalReference', type: 'string' },
      { name: 'submitter', type: 'address' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'blockNumber', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'RecordAnchored',
    inputs: [
      { name: 'recordHash', type: 'bytes32', indexed: true },
      { name: 'externalReference', type: 'string', indexed: false },
      { name: 'submitter', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const;

/**
 * Status of an EVM transaction receipt.
 */
export type TxReceiptStatus = 'success' | 'reverted' | 'unknown';

/**
 * Result returned from receipt query.
 */
export interface TxReceiptResult {
  status: TxReceiptStatus;
  blockNumber?: bigint;
  transactionHash: string;
}

/**
 * Generic blockchain adapter interface for notarization and verification.
 */
export interface BlockchainAdapter {
  anchor(recordHash: string, externalReference?: string): Promise<string>;
  getReceipt(txHash: string): Promise<TxReceiptResult>;
  isAnchored(recordHash: string): Promise<boolean>;
}

/**
 * Configuration options for EvmBlockchainAdapter.
 */
export interface EvmAdapterConfig {
  rpcUrl: string;
  chainId: number;
  contractAddress: `0x${string}`;
  relayerPrivateKey: `0x${string}`;
}

/**
 * Concrete EVM implementation using Viem public and wallet clients.
 */
export class EvmBlockchainAdapter implements BlockchainAdapter {
  private readonly publicClient: PublicClient;
  private readonly walletClient: WalletClient;
  private readonly account: PrivateKeyAccount;
  private readonly contractAddress: `0x${string}`;
  public readonly chainId: number;

  /**
   * Initializes the EVM Blockchain Adapter.
   *
   * @param config - Connection configuration including RPC URL, chain ID, contract, and relayer key.
   */
  constructor(config: EvmAdapterConfig) {
    this.chainId = config.chainId;
    this.contractAddress = config.contractAddress;

    const chain: Chain = defineChain({
      id: config.chainId,
      name: `ChainKit-${config.chainId}`,
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: {
        default: { http: [config.rpcUrl] },
        public: { http: [config.rpcUrl] },
      },
    });

    this.account = privateKeyToAccount(config.relayerPrivateKey);

    this.publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain,
      transport: http(config.rpcUrl),
    });
  }

  /**
   * Anchors a cryptographic record hash and optional external reference onto the blockchain.
   *
   * @param recordHash - 32-byte content hash in hex format.
   * @param externalReference - Optional external identifier or reference string.
   * @returns Submitted transaction hash.
   */
  public async anchor(recordHash: string, externalReference = ''): Promise<string> {
    try {
      const formattedBytes32 = toBytes32Hex(recordHash);

      const txHash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: RECORD_REGISTRY_ABI,
        functionName: 'anchor',
        args: [formattedBytes32, externalReference],
        account: this.account,
        chain: null,
      });

      return txHash;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError(
        'BLOCKCHAIN_ANCHOR_ERROR',
        502,
        `Failed to submit record anchor transaction: ${message}`,
        { error: message }
      );
    }
  }

  /**
   * Queries the transaction receipt for an on-chain transaction.
   *
   * @param txHash - The transaction hash to inspect.
   * @returns Receipt status and block number if confirmed.
   */
  public async getReceipt(txHash: string): Promise<TxReceiptResult> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({
        hash: txHash as Hash,
      });

      if (!receipt) {
        return {
          status: 'unknown',
          transactionHash: txHash,
        };
      }

      return {
        status: receipt.status === 'success' ? 'success' : 'reverted',
        blockNumber: receipt.blockNumber,
        transactionHash: txHash,
      };
    } catch {
      // Transaction might still be pending or not mined yet
      return {
        status: 'unknown',
        transactionHash: txHash,
      };
    }
  }

  /**
   * Queries whether a record hash has already been anchored in the registry contract.
   *
   * @param recordHash - 32-byte content hash.
   * @returns True if already recorded on-chain, false otherwise.
   */
  public async isAnchored(recordHash: string): Promise<boolean> {
    try {
      const formattedBytes32 = toBytes32Hex(recordHash);

      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: RECORD_REGISTRY_ABI,
        functionName: 'isAnchored',
        args: [formattedBytes32],
      });

      return Boolean(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError(
        'BLOCKCHAIN_READ_ERROR',
        502,
        `Failed to read anchor status from smart contract: ${message}`,
        { error: message }
      );
    }
  }
}
