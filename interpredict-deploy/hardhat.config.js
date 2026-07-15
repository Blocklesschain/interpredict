import "dotenv/config";

const deployerKey = process.env.PRIVATE_KEY;

/** @type {import('hardhat/config').HardhatUserConfig} */
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
    interlinkTestnet: {
      type: "http",
      url: "https://evm-rpc.test-net.interlinklabs.ai/v1/rpc",
      accounts: [deployerKey],
      httpHeaders: {
        Authorization: `Bearer ${process.env.INTERLINK_TOKEN || ""}`
      }
    }
  }
};

export default config;