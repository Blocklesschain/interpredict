import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const repositoryDirectory = resolve(projectDirectory, "..");
const artifactDirectory = join(projectDirectory, "artifacts", "contracts", "InterPredict.sol");
const buildInfoDirectory = join(projectDirectory, "artifacts", "build-info");
const abiPath = join(repositoryDirectory, "lib", "interpredictAbi.json");
const storagePath = join(projectDirectory, "storage-layout", "InterPredict.storage.json");
const EIP170_LIMIT = 24_576;
const MAIN_SIZE_LIMIT = Number(process.env.MAX_INTERPREDICT_RUNTIME_BYTES || "23750");
const READER_SIZE_LIMIT = Number(process.env.MAX_READER_RUNTIME_BYTES || "4096");

function fail(message) {
  throw new Error(message);
}

function readJson(path) {
  if (!existsSync(path)) fail(`Missing ${path}. Run npm run compile first.`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function artifact(contractName) {
  return readJson(join(artifactDirectory, `${contractName}.json`));
}

export function normalizeLinkedBytecode(hex) {
  if (typeof hex !== "string" || !hex.startsWith("0x")) fail("Artifact bytecode is malformed");
  const body = hex.slice(2).replace(/__\$[0-9a-fA-F]{34}\$__/g, "0".repeat(40));
  if (!/^[0-9a-fA-F]*$/.test(body) || body.length % 2 !== 0) {
    fail("Artifact bytecode contains an invalid or malformed link placeholder");
  }
  return `0x${body}`;
}

function byteLength(hex) {
  return (normalizeLinkedBytecode(hex).length - 2) / 2;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function findStorageLayout() {
  if (!existsSync(buildInfoDirectory)) fail("Hardhat build-info is missing. Run npm run compile first.");
  const candidates = readdirSync(buildInfoDirectory)
    .filter(name => name.endsWith(".output.json"))
    .map(name => join(buildInfoDirectory, name))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);

  for (const candidate of candidates) {
    const build = readJson(candidate);
    const contracts = build.output?.contracts ?? {};
    const sourceName = Object.keys(contracts).find(name => name.endsWith("/contracts/InterPredict.sol"));
    const layout = sourceName && contracts[sourceName]?.InterPredict?.storageLayout;
    if (layout) {
      return {
        contract: "InterPredict",
        sourceName: "contracts/InterPredict.sol",
        compiler: "0.8.20",
        storage: layout.storage,
        types: layout.types,
      };
    }
  }
  fail("No InterPredict storage layout was found. Force a compile after enabling storageLayout output.");
}

function marketSchemaComponents() {
  const protocolSource = readFileSync(join(repositoryDirectory, "lib", "interpredictProtocol.ts"), "utf8");
  const declaration = protocolSource.match(
    /export const MARKET_PARAM_TYPE = \[([\s\S]*?)\]\.join\(''\)/,
  );
  if (!declaration) fail("Could not locate MARKET_PARAM_TYPE in lib/interpredictProtocol.ts");
  const schema = [...declaration[1].matchAll(/'([^']*)'/g)].map(match => match[1]).join("");
  if (!schema.startsWith("tuple(") || !schema.endsWith(")")) {
    fail("MARKET_PARAM_TYPE must be a flat tuple schema");
  }
  return schema.slice(6, -1).split(",").map(component => {
    const [type, name, ...rest] = component.trim().split(/\s+/);
    if (!type || !name || rest.length > 0) fail(`Malformed Market schema component: ${component}`);
    return { type, name };
  });
}

function storageAbiType(typeId, types) {
  const definition = types[typeId];
  if (!definition) fail(`Storage type ${typeId} is missing`);
  if (definition.label.startsWith("enum ")) return `uint${Number(definition.numberOfBytes) * 8}`;
  if (definition.label.startsWith("contract ")) return "address";
  return definition.label.replace(/^struct .+$/, "tuple");
}

function assertMarketSchemaParity() {
  const layout = findStorageLayout();
  const markets = layout.storage.find(entry => entry.label === "_markets");
  if (!markets) fail("Storage layout does not contain _markets");
  const mapping = layout.types[markets.type];
  const marketStruct = mapping?.value && layout.types[mapping.value];
  if (!marketStruct?.members) fail("Could not resolve the Market struct from _markets storage");
  const storageComponents = marketStruct.members.map(member => ({
    name: member.label,
    type: storageAbiType(member.type, layout.types),
  }));
  const clientComponents = marketSchemaComponents();
  if (canonicalJson(storageComponents) !== canonicalJson(clientComponents)) {
    fail(
      "MARKET_PARAM_TYPE does not match the compiled Market struct member order/types. "
      + `Storage=${JSON.stringify(storageComponents)} Client=${JSON.stringify(clientComponents)}`,
    );
  }
}

function handleAbi(mode) {
  const protocolArtifact = artifact("InterPredict");
  const nextAbi = protocolArtifact.abi;
  const marketGetter = nextAbi.find(entry => entry.type === "function" && entry.name === "getMarket");
  if (
    !marketGetter
    || marketGetter.outputs?.length !== 1
    || marketGetter.outputs[0].type !== "bytes"
  ) {
    fail("Compiled ABI must expose getMarket(uint256) -> bytes for the linked-reader architecture.");
  }
  const readerLinks = Object.values(protocolArtifact.linkReferences ?? {})
    .flatMap(source => Object.keys(source));
  if (!readerLinks.includes("InterPredictReader")) {
    fail("InterPredict artifact is not linked to InterPredictReader.");
  }
  assertMarketSchemaParity();
  const next = canonicalJson(nextAbi);
  if (mode === "export") {
    writeFileSync(abiPath, next, "utf8");
    console.log(`Exported ${abiPath} (${JSON.parse(next).length} ABI entries).`);
    return;
  }
  if (mode !== "check") fail("ABI mode must be export or check");
  if (!existsSync(abiPath)) fail(`Missing checked-in ABI at ${abiPath}`);
  const current = canonicalJson(JSON.parse(readFileSync(abiPath, "utf8")));
  if (current !== next) {
    fail("Checked-in ABI differs from the compiled InterPredict artifact. Run npm run abi:export and review the diff.");
  }
  console.log(`ABI check passed (${JSON.parse(next).length} entries, sha256 ${sha256(next)}).`);
}

function handleSize(mode) {
  if (mode !== "check") fail("Size mode must be check");
  const checks = [
    ["InterPredict", MAIN_SIZE_LIMIT],
    ["InterPredictReader", READER_SIZE_LIMIT],
  ];
  let failed = false;
  for (const [name, limit] of checks) {
    if (!Number.isSafeInteger(limit) || limit <= 0 || limit > EIP170_LIMIT) {
      fail(`Invalid runtime size limit for ${name}: ${limit}`);
    }
    const bytes = byteLength(artifact(name).deployedBytecode);
    console.log(`${name}: ${bytes} runtime bytes; configured limit ${limit}; EIP-170 margin ${EIP170_LIMIT - bytes}.`);
    failed ||= bytes > limit;
  }
  if (failed) fail("One or more runtime bytecode limits were exceeded.");
}

function handleStorage(mode) {
  const next = canonicalJson(findStorageLayout());
  if (mode === "export") {
    mkdirSync(dirname(storagePath), { recursive: true });
    writeFileSync(storagePath, next, "utf8");
    console.log(`Exported ${storagePath} (sha256 ${sha256(next)}).`);
    return;
  }
  if (mode !== "check") fail("Storage mode must be export or check");
  if (!existsSync(storagePath)) {
    fail(`Missing storage baseline at ${storagePath}. Run npm run storage:export after the final reviewed layout.`);
  }
  const current = canonicalJson(JSON.parse(readFileSync(storagePath, "utf8")));
  if (current !== next) {
    fail("Compiled storage layout differs from the reviewed baseline. Export only after migration review.");
  }
  console.log(`Storage layout check passed (sha256 ${sha256(next)}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [kind, mode] = process.argv.slice(2);
  if (kind === "abi") handleAbi(mode);
  else if (kind === "size") handleSize(mode);
  else if (kind === "storage") handleStorage(mode);
  else fail("Usage: node scripts/artifact-tools.mjs <abi|size|storage> <export|check>");
}
