import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";
import { assertLibraryLinked } from "./deployment-utils.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const EXPECTED_CONFIRMATION = "REVIEWED_INTERPREDICT_V2_DEPLOYMENT";
const EIP170_LIMIT = 24_576;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function integer(name, fallback, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function addresses(ethers, name) {
  const raw = process.env[name]?.trim();
  if (!raw) return [];
  const result = [...new Set(raw.split(",").map(value => value.trim()).filter(Boolean))];
  for (const value of result) {
    if (!ethers.isAddress(value) || value === ethers.ZeroAddress) {
      throw new Error(`${name} contains an invalid or zero address: ${value}`);
    }
  }
  return result.map(ethers.getAddress);
}

function artifact(contractName) {
  const path = resolve(projectDirectory, "artifacts", "contracts", "InterPredict.sol", `${contractName}.json`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function runtimeBytes(bytecode) {
  return (bytecode.length - 2) / 2;
}

async function waitFor(transaction, confirmations) {
  const receipt = await transaction.wait(confirmations);
  if (!receipt || receipt.status !== 1) throw new Error(`Transaction ${transaction.hash} failed`);
  return receipt;
}

async function main() {
  if (required("DEPLOYMENT_CONFIRMATION") !== EXPECTED_CONFIRMATION) {
    throw new Error(`DEPLOYMENT_CONFIRMATION must equal ${EXPECTED_CONFIRMATION}`);
  }
  required("PRIVATE_KEY");
  required("INTERLINK_TOKEN");

  const expectedChainId = BigInt(integer("INTERLINK_CHAIN_ID", "19042026", { minimum: 1 }));
  const confirmations = integer("DEPLOY_CONFIRMATIONS", "2", { minimum: 1, maximum: 20 });
  const expectedDecimals = integer(
    "SETTLEMENT_TOKEN_DECIMALS",
    required("SETTLEMENT_TOKEN_DECIMALS"),
    { minimum: 0, maximum: 24 },
  );
  const expectedCodeHash = required("SETTLEMENT_TOKEN_CODEHASH").toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(expectedCodeHash)) {
    throw new Error("SETTLEMENT_TOKEN_CODEHASH must be a 32-byte lowercase or uppercase hex value");
  }

  const connection = await network.create();
  const { ethers } = connection;
  const provider = ethers.provider;
  const actualNetwork = await provider.getNetwork();
  if (actualNetwork.chainId !== expectedChainId) {
    throw new Error(`Refusing deployment on chain ${actualNetwork.chainId}; expected ${expectedChainId}`);
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("Configured deployment signer is unavailable");
  const deployerAddress = ethers.getAddress(await deployer.getAddress());
  const minimumBalance = BigInt(required("MIN_DEPLOYER_BALANCE_WEI"));
  const deployerBalance = await provider.getBalance(deployerAddress);
  if (deployerBalance < minimumBalance) {
    throw new Error(`Deployer native balance ${deployerBalance} is below MIN_DEPLOYER_BALANCE_WEI`);
  }

  const settlementToken = ethers.getAddress(required("SETTLEMENT_TOKEN_ADDRESS"));
  const treasury = ethers.getAddress(required("TREASURY_ADDRESS"));
  const admin = ethers.getAddress(required("ADMIN_ADDRESS"));
  if ([settlementToken, treasury, admin].includes(ethers.ZeroAddress)) {
    throw new Error("Constructor addresses cannot be zero");
  }
  const adminCode = await provider.getCode(admin);
  const eoaAdminOverride = process.env.ALLOW_EOA_ADMIN === "REVIEWED_TESTNET_EOA_ADMIN";
  if (adminCode === "0x" && !eoaAdminOverride) {
    throw new Error(
      "ADMIN_ADDRESS must be a deployed multisig/contract. "
      + "A reviewed testnet-only EOA requires ALLOW_EOA_ADMIN=REVIEWED_TESTNET_EOA_ADMIN.",
    );
  }

  const tokenCode = await provider.getCode(settlementToken);
  if (tokenCode === "0x") throw new Error("SETTLEMENT_TOKEN_ADDRESS has no deployed bytecode");
  const tokenCodeHash = ethers.keccak256(tokenCode).toLowerCase();
  if (tokenCodeHash !== expectedCodeHash) {
    throw new Error(`Settlement-token code hash ${tokenCodeHash} does not match the reviewed hash`);
  }
  const token = new ethers.Contract(
    settlementToken,
    [
      "function decimals() view returns (uint8)",
      "function balanceOf(address) view returns (uint256)",
    ],
    provider,
  );
  if (Number(await token.decimals()) !== expectedDecimals) {
    throw new Error("Settlement-token decimals do not match SETTLEMENT_TOKEN_DECIMALS");
  }

  const maxCoreBytes = integer("MAX_INTERPREDICT_RUNTIME_BYTES", "23750", {
    minimum: 1,
    maximum: EIP170_LIMIT,
  });
  const maxReaderBytes = integer("MAX_READER_RUNTIME_BYTES", "4096", {
    minimum: 1,
    maximum: EIP170_LIMIT,
  });
  const coreArtifact = artifact("InterPredict");
  const readerArtifact = artifact("InterPredictReader");
  if (runtimeBytes(coreArtifact.deployedBytecode) > maxCoreBytes) {
    throw new Error("Compiled InterPredict runtime exceeds MAX_INTERPREDICT_RUNTIME_BYTES");
  }
  if (runtimeBytes(readerArtifact.deployedBytecode) > maxReaderBytes) {
    throw new Error("Compiled InterPredictReader runtime exceeds MAX_READER_RUNTIME_BYTES");
  }

  console.log(`Deploying on ${connection.networkName} (${actualNetwork.chainId}) as ${deployerAddress}`);
  console.log(`Deployer native balance: ${deployerBalance}`);
  console.log(`Reviewed settlement token: ${settlementToken} (${expectedDecimals} decimals, ${tokenCodeHash})`);

  const readerFactory = await ethers.getContractFactory("InterPredictReader", deployer);
  const reader = await readerFactory.deploy();
  const readerDeployment = reader.deploymentTransaction();
  if (!readerDeployment) throw new Error("Reader deployment transaction is unavailable");
  const readerReceipt = await waitFor(readerDeployment, confirmations);
  const readerAddress = ethers.getAddress(await reader.getAddress());

  const protocolFactory = await ethers.getContractFactory("InterPredict", {
    signer: deployer,
    libraries: { InterPredictReader: readerAddress },
  });
  const protocol = await protocolFactory.deploy(settlementToken, treasury, admin);
  const protocolDeployment = protocol.deploymentTransaction();
  if (!protocolDeployment) throw new Error("Protocol deployment transaction is unavailable");
  const protocolReceipt = await waitFor(protocolDeployment, confirmations);
  const protocolAddress = ethers.getAddress(await protocol.getAddress());

  const deployedReaderCode = await provider.getCode(readerAddress);
  const deployedProtocolCode = await provider.getCode(protocolAddress);
  const deployedReaderBytes = runtimeBytes(deployedReaderCode);
  const deployedProtocolBytes = runtimeBytes(deployedProtocolCode);
  if (deployedReaderBytes > maxReaderBytes || deployedProtocolBytes > maxCoreBytes) {
    throw new Error("Deployed bytecode exceeds the reviewed runtime-size gate");
  }
  assertLibraryLinked(coreArtifact, deployedProtocolCode, "InterPredictReader", readerAddress);

  const defaultAdminRole = await protocol.DEFAULT_ADMIN_ROLE();
  const teamRole = await protocol.TEAM_MARKET_ROLE();
  const decManagerRole = await protocol.DEC_MANAGER_ROLE();
  const constructorChecks = [
    [ethers.getAddress(await protocol.settlementToken()) === settlementToken, "settlementToken"],
    [ethers.getAddress(await protocol.treasury()) === treasury, "treasury"],
    [Number(await protocol.tokenDecimals()) === expectedDecimals, "tokenDecimals"],
    [await protocol.hasRole(defaultAdminRole, admin), "DEFAULT_ADMIN_ROLE"],
    [await protocol.hasRole(teamRole, admin), "TEAM_MARKET_ROLE"],
    [await protocol.hasRole(decManagerRole, admin), "DEC_MANAGER_ROLE"],
    [(await protocol.paused()) === false, "initial pause state"],
  ];
  for (const [passed, label] of constructorChecks) {
    if (!passed) throw new Error(`Post-deployment constructor assertion failed: ${label}`);
  }

  const teamAccounts = addresses(ethers, "TEAM_MARKET_ACCOUNTS");
  const decManagerAccounts = addresses(ethers, "DEC_MANAGER_ACCOUNTS");
  const decMembers = addresses(ethers, "DEC_MEMBERS");
  const bootstrapRequested = teamAccounts.length + decManagerAccounts.length + decMembers.length > 0;
  if (bootstrapRequested && !(await protocol.hasRole(defaultAdminRole, deployerAddress))) {
    throw new Error(
      "Optional bootstrap requires the deployer to hold DEFAULT_ADMIN_ROLE. Leave lists empty and use the admin multisig.",
    );
  }

  const bootstrapTransactions = [];
  for (const account of teamAccounts) {
    if (!(await protocol.hasRole(teamRole, account))) {
      const transaction = await protocol.grantRole(teamRole, account);
      await waitFor(transaction, confirmations);
      bootstrapTransactions.push(transaction.hash);
    }
  }
  for (const account of decManagerAccounts) {
    if (!(await protocol.hasRole(decManagerRole, account))) {
      const transaction = await protocol.grantRole(decManagerRole, account);
      await waitFor(transaction, confirmations);
      bootstrapTransactions.push(transaction.hash);
    }
  }
  for (const account of decMembers) {
    const member = await protocol.decMembers(account);
    if (Boolean(member.exists) && !(await protocol.isActiveDECMember(account))) {
      throw new Error(
        `DEC_MEMBERS contains existing inactive/removed member ${account}; `
        + "bootstrap will not mutate historical membership",
      );
    }
    if (!Boolean(member.exists)) {
      const transaction = await protocol.addDECMember(account);
      await waitFor(transaction, confirmations);
      bootstrapTransactions.push(transaction.hash);
    }
  }

  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    network: connection.networkName,
    chainId: actualNetwork.chainId.toString(),
    confirmations,
    deployer: deployerAddress,
    constructorArguments: { settlementToken, treasury, admin },
    settlementToken: { address: settlementToken, decimals: expectedDecimals, runtimeCodeHash: tokenCodeHash },
    libraries: {
      InterPredictReader: {
        address: readerAddress,
        transactionHash: readerDeployment.hash,
        blockNumber: readerReceipt.blockNumber,
        runtimeBytes: deployedReaderBytes,
        runtimeCodeHash: ethers.keccak256(deployedReaderCode),
      },
    },
    InterPredict: {
      address: protocolAddress,
      transactionHash: protocolDeployment.hash,
      blockNumber: protocolReceipt.blockNumber,
      runtimeBytes: deployedProtocolBytes,
      runtimeCodeHash: ethers.keccak256(deployedProtocolCode),
    },
    bootstrap: {
      teamAccounts,
      decManagerAccounts,
      decMembers,
      transactionHashes: bootstrapTransactions,
    },
  };
  const manifestDirectory = resolve(projectDirectory, "deployments", actualNetwork.chainId.toString());
  mkdirSync(manifestDirectory, { recursive: true });
  const manifestPath = resolve(manifestDirectory, `InterPredict-${protocolAddress}.json`);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`InterPredictReader deployed to ${readerAddress}`);
  console.log(`InterPredict V2 deployed to ${protocolAddress}`);
  console.log(`Deployment manifest written to ${manifestPath}`);
  console.log("No frontend or production address was changed automatically.");
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Deployment failed");
  process.exitCode = 1;
});
