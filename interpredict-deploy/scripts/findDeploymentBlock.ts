import { ethers } from "ethers";
import dotenv from "dotenv";
import { getBackendToken } from "../lib/interlinkAuthBackend.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const CONTRACT_ADDRESS =
  "0x3E5936F13e1194380A66c3c1d75D4D7342299CfF";

const RPC_URL =
  "https://evm-rpc.test-net.interlinklabs.ai/v1/rpc";

// RPC allows a maximum span of 10,000 blocks.
const BLOCK_CHUNK_SIZE = 10_000;

// Since the contract was deployed yesterday, search only the most recent
// 50,000 blocks. Increase this if no events are found.
const SEARCH_WINDOW = 50_000;

async function main() {
  console.log("🔑 Getting InterLink authentication token...");

  const rawToken = await getBackendToken();

  const connection = new ethers.FetchRequest(RPC_URL);
  connection.setHeader("Authorization", `Bearer ${rawToken}`);
  connection.setHeader("Content-Type", "application/json");

  const provider = new ethers.JsonRpcProvider(connection, undefined, {
    staticNetwork: true,
  });

  const latestBlock = await provider.getBlockNumber();

  const searchStart = Math.max(0, latestBlock - SEARCH_WINDOW);

  console.log(`Latest block : ${latestBlock}`);
  console.log(`Searching from block ${searchStart}...`);

  let firstLog: ethers.Log | null = null;

  for (
    let fromBlock = searchStart;
    fromBlock <= latestBlock;
    fromBlock += BLOCK_CHUNK_SIZE
  ) {
    const toBlock = Math.min(
      fromBlock + BLOCK_CHUNK_SIZE - 1,
      latestBlock
    );

    console.log(`Checking ${fromBlock} -> ${toBlock}`);

    const logs = await provider.getLogs({
      address: CONTRACT_ADDRESS,
      fromBlock,
      toBlock,
    });

    if (logs.length > 0) {
      logs.sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return a.blockNumber - b.blockNumber;
        }
        return a.index - b.index;
      });

      firstLog = logs[0];
      break;
    }
  }

  if (!firstLog) {
    console.log("\n❌ No events found.");
    console.log(
      "Increase SEARCH_WINDOW to 100000 and try again."
    );
    return;
  }

  const receipt = await provider.getTransactionReceipt(
    firstLog.transactionHash
  );

  console.log("\n=================================");
  console.log("FOUND!");
  console.log("=================================");
  console.log(`Block: ${firstLog.blockNumber}`);
  console.log(
    `Hex : ${ethers.toQuantity(firstLog.blockNumber)}`
  );
  console.log(`Tx  : ${firstLog.transactionHash}`);

  if (receipt?.contractAddress?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
    console.log("\n✅ This is the deployment transaction.");
  } else {
    console.log("\n⚠️ This is the earliest event, not necessarily the deployment transaction.");
  }

  console.log("\nAdd this to .env.local:\n");
  console.log(
    `INTERPREDICT_DEPLOYMENT_BLOCK=${ethers.toQuantity(firstLog.blockNumber)}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});