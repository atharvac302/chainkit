import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "node:path";

// Load environment variables from the monorepo root .env file and local package directory
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const RPC_URL: string = process.env.RPC_URL ?? "";
const DEPLOYER_PRIVATE_KEY: string = process.env.DEPLOYER_PRIVATE_KEY ?? "";

/**
 * Hardhat user configuration for ChainKit smart contracts.
 * Configured for Solidity 0.8.24, local Hardhat network, localhost, Sepolia testnet,
 * and TypeChain code generation with Ethers v6.
 */
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: RPC_URL,
      accounts: DEPLOYER_PRIVATE_KEY.length > 0 ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
