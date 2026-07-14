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
    interlinkTestnet: {
      url: "https://evm-rpc.test-net.interlinklabs.ai/v1/rpc",
      // REPLACE the placeholder below with your secret PRIVATE KEY (not your public address)
      accounts: ["830839d41dac6aa3d3d1860c0e5de43e8ce0801d28ace6d7a71c3ab0a92de4e9"],
      httpHeaders: {
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJpbnRlcmxpbmstd2FsbGV0IiwiZXhwIjoxNzg0MDYyMzg4LCJpYXQiOjE3ODQwNjE0ODgsImlzcyI6ImludGVybGluayIsImp0aSI6ImRjNWI1ZWVkNWQyMGY0OTk4YWFiMzc5MyIsInN1YiI6IjB4NkU4MzIyNTJlQTRjNzgwNjhFRTEwOWQ5NTM3MjREMjc2MjQzMTk5MiIsIndhbGxldEFkZHJlc3MiOiIweDZFODMyMjUyZUE0Yzc4MDY4RUUxMDlkOTUzNzI0RDI3NjI0MzE5OTIifQ.GC-DS4QaglZ2QJa3luSwfKFIe-tOhnTf3_gsMU8t1EI"
      }
    }
  }
};

export default config;