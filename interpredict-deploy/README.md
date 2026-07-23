# InterPredict V2 Contracts

Hardhat 3 package for the InterPredict V2 protocol, its externally linked
`InterPredictReader`, comprehensive tests, artifact drift gates, and guarded
deployment verification.

## Install

```bash
npm ci
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run compile` | Compile Solidity 0.8.20 with optimizer and storage layout |
| `npm test` | Run the full Hardhat Mocha suite |
| `npm run test:fuzz` | Run fuzz/property/invariant-labelled tests |
| `npm run test:tooling` | Test link-placeholder and deployment utilities |
| `npm run abi:export` | Export ABI from the current artifact to root `lib/` |
| `npm run abi:check` | Reject ABI or canonical decoder-schema drift |
| `npm run size:check` | Enforce main/reader runtime release budgets |
| `npm run storage:export` | Intentionally refresh the reviewed storage baseline |
| `npm run storage:check` | Reject unintended storage-layout drift |
| `npm run validate` | Compose compile, tests, tooling, ABI, size, and storage checks |
| `npm run verify:deployment` | Read-only deployed code/link/role/manifest verification |
| `npm run deploy:interlink` | Guarded live deployment; requires explicit approval phrase |

## Architecture

The main runtime is linked to `InterPredictReader`. The public aggregate getters
return canonical ABI-encoded bytes. Never deploy the main artifact without the
exact reader library address or manually replace placeholder bytes.

Current reviewed budgets:

- `InterPredict`: measured 23,619 bytes; gate 23,750; EIP-170 limit 24,576.
- `InterPredictReader`: measured 3,046 bytes; gate 4,096.

The main runtime is 933 bytes smaller than the pre-hardening 24,552-byte build.
The reader is a separate attack surface, so both code hashes and every link
reference must be verified.

## Deployment safety

Copy `.env.example` to an untracked local file and review every value. The
deployment script refuses:

- a missing explicit confirmation phrase;
- a wrong chain;
- missing/incorrect settlement-token code, code hash, or decimals;
- insufficient deployer balance;
- zero/invalid constructor addresses;
- an EOA admin except under the exact reviewed testnet override;
- runtime bytecode over the configured budgets;
- an incorrect reader link;
- failed receipts or unexpected initial roles/state.

It writes a deployment manifest but does not change frontend configuration,
push source, verify on an explorer automatically, or deploy the web app.

Use the root [Deployment Runbook](../docs/DEPLOYMENT.md) and
[Migration Guide](../docs/MIGRATION_GUIDE.md). Running
`npm run deploy:interlink` is prohibited until explicit human approval.
