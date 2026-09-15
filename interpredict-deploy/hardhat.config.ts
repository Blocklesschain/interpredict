import dotenv from "dotenv";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";

dotenv.config({ path: ".env.local" });

const deployerKey = process.env.PRIVATE_KEY;

/**
 * InterPredict V2 Hardhat configuration.
 *
 * - Registers the ethers and network-helpers plugins (Hardhat v3 API).
 * - The `interlink_testnet` network is only used for deployment; the token
 *   is resolved lazily inside the deploy script, NOT at config load time,
 *   so `hardhat test` (which uses the default edr-simulated network) never
 *   requires network access or secrets.
 */
const config = {
  plugins: [hardhatEthers, hardhatNetworkHelpers],

  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },

  networks: {
    interlink_testnet: {
      type: "http",
      url: "https://evm-rpc.test-net.interlinklabs.ai/v1/rpc",
      accounts: deployerKey ? [deployerKey] : [],
      httpHeaders: {
        // The Bearer token is injected by the deploy script at runtime.
        Authorization: "Bearer placeholder",
      },
    },
  },
};

export default config;