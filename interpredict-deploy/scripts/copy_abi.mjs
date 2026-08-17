import { readFileSync, writeFileSync } from 'fs';

const artifact = JSON.parse(
  readFileSync('artifacts/contracts/InterPredictV2.sol/InterPredictV2.json', 'utf8')
);

writeFileSync('../lib/interpredictAbi.json', JSON.stringify(artifact.abi, null, 2));
console.log('ABI updated,', artifact.abi.length, 'entries');