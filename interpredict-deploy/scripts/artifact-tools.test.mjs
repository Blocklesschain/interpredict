import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLinkedBytecode } from "./artifact-tools.mjs";
import { assertLibraryLinked } from "./deployment-utils.mjs";

test("normalizes a validated Hardhat link placeholder without changing byte length", () => {
  const placeholder = `__$${"a".repeat(34)}$__`;
  const linked = `0x60${placeholder}61`;
  const normalized = normalizeLinkedBytecode(linked);
  assert.equal(normalized, `0x60${"0".repeat(40)}61`);
  assert.equal((normalized.length - 2) / 2, (linked.length - 2) / 2);
})

test("rejects malformed or unresolved non-Hardhat placeholders", () => {
  assert.throws(() => normalizeLinkedBytecode("0x60__$short$__61"), /invalid|malformed/i);
  assert.throws(() => normalizeLinkedBytecode("not-bytecode"), /malformed/i);
})

test("verifies the deployed reader address at every artifact link reference", () => {
  const reader = `0x${"12".repeat(20)}`;
  const artifact = {
    deployedLinkReferences: {
      "project/contracts/InterPredict.sol": {
        InterPredictReader: [{ start: 1, length: 20 }],
      },
    },
  };
  assert.doesNotThrow(() => assertLibraryLinked(artifact, `0x60${reader.slice(2)}61`, "InterPredictReader", reader));
  assert.throws(
    () => assertLibraryLinked(artifact, `0x60${"34".repeat(20)}61`, "InterPredictReader", reader),
    /does not match/i,
  );
})
