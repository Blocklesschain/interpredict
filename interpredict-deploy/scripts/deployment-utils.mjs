export function assertLibraryLinked(artifact, deployedBytecode, libraryName, libraryAddress) {
  if (typeof deployedBytecode !== "string" || !/^0x[0-9a-fA-F]+$/.test(deployedBytecode)) {
    throw new Error("Deployed bytecode is malformed");
  }
  const references = Object.values(artifact.deployedLinkReferences ?? {})
    .flatMap(source => source[libraryName] ?? []);
  if (references.length === 0) {
    throw new Error(`Artifact contains no deployed link references for ${libraryName}`);
  }
  const expected = libraryAddress.toLowerCase().replace(/^0x/, "");
  for (const reference of references) {
    if (reference.length !== 20) {
      throw new Error(`${libraryName} link reference is ${reference.length} bytes instead of 20`);
    }
    const start = 2 + reference.start * 2;
    const linked = deployedBytecode.slice(start, start + reference.length * 2).toLowerCase();
    if (linked !== expected) {
      throw new Error(`${libraryName} link reference does not match ${libraryAddress}`);
    }
  }
}
