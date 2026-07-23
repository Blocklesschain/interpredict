import { existsSync, readFileSync } from "node:fs";
import { network } from "hardhat";
import { assertLibraryLinked } from "./deployment-utils.mjs";

const EIP170_LIMIT = 24_576;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function runtimeBytes(bytecode) {
  return (bytecode.length - 2) / 2;
}

async function main() {
  const connection = await network.create();
  const { ethers } = connection;
  const provider = ethers.provider;
  const expectedChainId = BigInt(required("INTERLINK_CHAIN_ID"));
  const actualNetwork = await provider.getNetwork();
  if (actualNetwork.chainId !== expectedChainId) {
    throw new Error(`Connected chain ${actualNetwork.chainId} does not match ${expectedChainId}`);
  }

  const protocolAddress = ethers.getAddress(required("INTERPREDICT_ADDRESS"));
  const readerAddress = ethers.getAddress(required("INTERPREDICT_READER_ADDRESS"));
  const [protocolCode, readerCode] = await Promise.all([
    provider.getCode(protocolAddress),
    provider.getCode(readerAddress),
  ]);
  if (protocolCode === "0x" || readerCode === "0x") throw new Error("A configured deployment address has no code");
  const protocolArtifact = JSON.parse(readFileSync(
    new URL("../artifacts/contracts/InterPredict.sol/InterPredict.json", import.meta.url),
    "utf8",
  ));
  assertLibraryLinked(protocolArtifact, protocolCode, "InterPredictReader", readerAddress);

  const protocol = await ethers.getContractAt("InterPredict", protocolAddress);
  const settlementToken = ethers.getAddress(await protocol.settlementToken());
  const treasury = ethers.getAddress(await protocol.treasury());
  const tokenDecimals = Number(await protocol.tokenDecimals());
  const paused = await protocol.paused();
  const admin = ethers.getAddress(required("ADMIN_ADDRESS"));
  const adminCode = await provider.getCode(admin);
  if (adminCode === "0x" && process.env.ALLOW_EOA_ADMIN !== "REVIEWED_TESTNET_EOA_ADMIN") {
    throw new Error("ADMIN_ADDRESS is an EOA without the explicit reviewed testnet override");
  }
  const roleChecks = {
    defaultAdmin: await protocol.hasRole(await protocol.DEFAULT_ADMIN_ROLE(), admin),
    teamMarket: await protocol.hasRole(await protocol.TEAM_MARKET_ROLE(), admin),
    decManager: await protocol.hasRole(await protocol.DEC_MANAGER_ROLE(), admin),
  };
  if (!Object.values(roleChecks).every(Boolean)) throw new Error("ADMIN_ADDRESS is missing a constructor role");

  const result = {
    network: connection.networkName,
    chainId: actualNetwork.chainId.toString(),
    InterPredict: {
      address: protocolAddress,
      runtimeBytes: runtimeBytes(protocolCode),
      runtimeCodeHash: ethers.keccak256(protocolCode),
      settlementToken,
      treasury,
      tokenDecimals,
      paused,
      roleChecks,
    },
    InterPredictReader: {
      address: readerAddress,
      runtimeBytes: runtimeBytes(readerCode),
      runtimeCodeHash: ethers.keccak256(readerCode),
    },
  };

  if (result.InterPredict.runtimeBytes > EIP170_LIMIT || result.InterPredictReader.runtimeBytes > EIP170_LIMIT) {
    throw new Error("A deployed runtime exceeds EIP-170");
  }

  const manifestPath = process.env.DEPLOYMENT_MANIFEST?.trim();
  if (manifestPath) {
    if (!existsSync(manifestPath)) throw new Error(`DEPLOYMENT_MANIFEST does not exist: ${manifestPath}`);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const comparisons = [
      [manifest.chainId === result.chainId, "chainId"],
      [ethers.getAddress(manifest.InterPredict.address) === protocolAddress, "InterPredict address"],
      [ethers.getAddress(manifest.libraries.InterPredictReader.address) === readerAddress, "reader address"],
      [manifest.InterPredict.runtimeCodeHash === result.InterPredict.runtimeCodeHash, "InterPredict code hash"],
      [
        manifest.libraries.InterPredictReader.runtimeCodeHash === result.InterPredictReader.runtimeCodeHash,
        "reader code hash",
      ],
    ];
    for (const [passed, label] of comparisons) {
      if (!passed) throw new Error(`Deployment manifest mismatch: ${label}`);
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Deployment verification failed");
  process.exitCode = 1;
});
