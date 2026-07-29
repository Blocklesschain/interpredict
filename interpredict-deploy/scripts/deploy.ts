import { ethers } from "ethers";
import dotenv from "dotenv";
import { getBackendToken } from "../lib/interlinkAuthBackend.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  console.log("\n====================================================");
  console.log("🚦 SCRIPT STARTUP: Initializing InterPredict Protocol Upgrade Deployment...");
  console.log("====================================================\n");

  const rpcUrl = "https://evm-rpc.test-net.interlinklabs.ai/v1/rpc";

  // --- AUTO TOKEN: no more reading a static INTERLINK_TOKEN from .env ---
  console.log("🔑 Requesting backend auth token (auto-refreshing)...");
  const rawToken = await getBackendToken();
  const accessToken = `Bearer ${rawToken}`;
  console.log("✅ Got a fresh token from getBackendToken()\n");

  let rawKey = process.env.PRIVATE_KEY || "";

  // Contract constructor parameters (native token - no ERC20 address needed)
  const treasuryAddress = process.env.TREASURY_ADDRESS || "0x6E832252eA4c78068EE109d953724D2762431992";
  const adminAddress = process.env.ADMIN_ADDRESS || "0x6E832252eA4c78068EE109d953724D2762431992";

  const privateKey = rawKey.startsWith("0x") ? rawKey.slice(2).trim() : rawKey.trim();

  console.log("🔍 System Environment Check:");
  console.log(`- Backend Wallet Key Loaded: ${process.env.INTERLINK_BACKEND_PRIVATE_KEY ? "✅ YES" : "❌ NO"}`);
  console.log(`- Deploy Key Loaded: ${rawKey ? "✅ YES" : "❌ NO"}`);
  console.log(`- Treasury Address: ${treasuryAddress}`);
  console.log(`- Admin Address: ${adminAddress}`);
  console.log(`- Key Cleaned Length: ${privateKey.length} characters`);
  console.log("----------------------------------------------------\n");

  console.log("📡 Connecting directly to Interlink Testnet gateway...");

  const connection = new ethers.FetchRequest(rpcUrl);
  connection.setHeader("Authorization", accessToken);
  connection.setHeader("Content-Type", "application/json");

  const provider = new ethers.JsonRpcProvider(connection, undefined, {
    staticNetwork: true,
  });

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`🔒 Authenticated Signer Address: ${wallet.address}`);

  const artifactPath = "../artifacts/contracts/InterPredict.sol/InterPredict.json";
  const { default: contractArtifact } = await import(artifactPath, { with: { type: "json" } });

  console.log("🚀 Submitting deployment transaction...");

  const factory = new ethers.ContractFactory(contractArtifact.abi, contractArtifact.bytecode, wallet);

  // Deploy with treasury address and admin address (native token - no ERC20)
  const contractInstance = await factory.deploy(treasuryAddress, adminAddress) as any;

  console.log("⏳ Transaction submitted. Waiting for block confirmation...");
  await contractInstance.waitForDeployment();

  const deployedAddress = await contractInstance.getAddress();
  console.log("\n----------------------------------------------------------------");
  console.log(`🎉 InterPredict Protocol Upgrade deployed to: ${deployedAddress}`);
  console.log("----------------------------------------------------------------\n");

  // After deployment, set up roles
  console.log("🔐 Setting up roles...");

  // --- ROLE FIX: compute hashes locally instead of calling non-existent getters ---
  const TEAM_MARKET_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TEAM_MARKET_ROLE"));
  const DEC_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DEC_ROLE"));

  const teamMarketTx = await contractInstance.grantRole(TEAM_MARKET_ROLE, adminAddress);
  await teamMarketTx.wait();
  console.log(`✅ TEAM_MARKET_ROLE granted to ${adminAddress}`);

  const decTx = await contractInstance.grantRole(DEC_ROLE, adminAddress);
  await decTx.wait();
  console.log(`✅ DEC_ROLE granted to ${adminAddress}`);

  console.log("\n📝 Deployment Summary:");
  console.log(`- Contract: ${deployedAddress}`);
  console.log(`- Treasury: ${treasuryAddress}`);
  console.log(`- Admin: ${adminAddress}`);
  console.log("\n✅ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed unexpectedly:");
    console.error(error);
    process.exit(1);
  });