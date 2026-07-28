import dotenv from "dotenv";
import { getBackendToken } from "./lib/interlinkAuthBackend";

dotenv.config({ path: ".env.local" });

const deployerKey = process.env.PRIVATE_KEY;

if (!deployerKey) {
  throw new Error("PRIVATE_KEY is missing from .env.local");
}

const interlinkToken = await getBackendToken();

/** @type {import("hardhat/config").HardhatUserConfig} */
const config = {
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
      accounts: [deployerKey],
      httpHeaders: {
        Authorization: `Bearer ${interlinkToken}`,
      },
    },
  },
};

export default config;