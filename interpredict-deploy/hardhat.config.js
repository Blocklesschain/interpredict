import dotenv from "dotenv";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

dotenv.config({ path: ".env.local" });

const deployerKey = process.env.PRIVATE_KEY;
const interlinkToken = process.env.INTERLINK_TOKEN;
const interlinkRpcUrl = process.env.INTERLINK_RPC_URL || "https://evm-rpc.test-net.interlinklabs.ai/v1/rpc";
const interlinkChainId = Number(process.env.INTERLINK_CHAIN_ID || "19042026");

if (!Number.isSafeInteger(interlinkChainId) || interlinkChainId <= 0) {
  throw new Error("INTERLINK_CHAIN_ID must be a positive safe integer");
}

/** @type {import("hardhat/config").HardhatUserConfig} */
const config = {
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
      viaIR: true,
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },

  networks: {
    interlink_testnet: {
      type: "http",
      url: interlinkRpcUrl,
      chainId: interlinkChainId,
      accounts: deployerKey ? [deployerKey] : [],
      httpHeaders: interlinkToken ? { Authorization: `Bearer ${interlinkToken}` } : {},
    },
  },
};

export default config;
