import { ethers } from "ethers";
import "dotenv/config";

async function main() {
  console.log("\n====================================================");
  console.log("🚦 SCRIPT STARTUP: Initializing InterPredict Deployment...");
  console.log("====================================================\n");

  const rpcUrl = "https://evm-rpc.test-net.interlinklabs.ai/v1/rpc";
  const accessToken = `Bearer ${process.env.INTERLINK_TOKEN}`;
  let rawKey = process.env.PRIVATE_KEY || "";

  // 🔐 Deployed Team Oracle Address - Passed securely to constructor
  const oracleAddress = "0x6E832252eA4c78068EE109d953724D2762431992";

  const privateKey = rawKey.startsWith("0x") ? rawKey.slice(2).trim() : rawKey.trim();

  console.log("🔍 System Environment Check:");
  console.log(`- Token Loaded: ${process.env.INTERLINK_TOKEN ? "✅ YES" : "❌ NO"}`);
  console.log(`- Key Cleaned Length: ${privateKey.length} characters`);
  console.log("----------------------------------------------------\n");

  console.log("📡 Connecting directly to Interlink Testnet gateway...");

  const connection = new ethers.FetchRequest(rpcUrl);
  connection.setHeader("Authorization", accessToken);
  connection.setHeader("Content-Type", "application/json");

  const provider = new ethers.JsonRpcProvider(connection, undefined, {
    staticNetwork: true
  });

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`🔒 Authenticated Signer Address: ${wallet.address}`);

  const artifactPath = "../artifacts/contracts/InterPredict.sol/InterPredict.json";
  const { default: contractArtifact } = await import(artifactPath, { with: { type: "json" } });

  console.log("🚀 Submitting deployment transaction via locked transport channel...");

  const factory = new ethers.ContractFactory(contractArtifact.abi, contractArtifact.bytecode, wallet);

  // 📥 Submitting oracleAddress as the constructor argument
  const contractInstance = await factory.deploy(oracleAddress);

  console.log("⏳ Transaction submitted safely. Waiting for block confirmation...");
  await contractInstance.waitForDeployment();

  console.log("\n----------------------------------------------------------------");
  console.log(`🎉 InterPredict successfully deployed to: ${await contractInstance.getAddress()}`);
  console.log("----------------------------------------------------------------\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed unexpectedly:");
    console.error(error);
    process.exit(1);
  });