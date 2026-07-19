import "@nomicfoundation/hardhat-toolbox";

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Prevents the 'Stack too deep' error during compilation
    },
  },
  networks: {
    interlink_testnet: {
      url: "https://evm-rpc.test-net.interlinklabs.ai/v1/rpc",
      accounts: [process.env.PRIVATE_KEY],
      httpHeaders: {
        Authorization: "Bearer " + process.env.INTERLINK_TOKEN
      }
    }
  }
};

export default config;