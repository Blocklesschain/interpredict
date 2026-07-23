# InterPredict V2

InterPredict is an ERC-20-collateralized, multi-outcome prediction-market
application for the Interlink Network. Community markets pass through
Decentralized Ecosystem Curation (DEC); team-role markets activate immediately
with fully funded seed liquidity. Trading, proposal voting, resolution voting,
evidence escalation, claims, and liabilities are enforced on-chain.

> **Release status:** local production-readiness review. No push, merge,
> testnet deployment, production deployment, or live address change is
> authorized by this repository state.

## V2 behavior

- two, three, or four outcomes;
- one-token community proposal fee plus ten-token seed;
- team-market seed of at least ten tokens;
- 24-hour community proposal vote;
- trade-time 50-basis-point fee;
- three-hour DEC resolution vote;
- epoch-frozen DEC eligibility and upward-rounded 50% quorum;
- 24-hour evidence-backed admin verification with permissionless timeout;
- permissionless voter reputation settlement;
- vested DEC rewards that remain claimable after later ineligibility;
- exact ERC-20 transfer checks;
- global and per-market emergency pauses;
- explicit proposal, creator-seed, trading, creator-fee, and DEC liabilities.

V2 is a breaking redeployment from the native-currency binary V1 contract. See
[Migration Guide](docs/MIGRATION_GUIDE.md).

## Repository

| Path | Purpose |
| --- | --- |
| `app/` | Next.js routes, connected application, and server APIs |
| `components/` | Shared responsive UI and protocol workflow components |
| `lib/` | Generated ABI, canonical decoders, lifecycle/history helpers |
| `interpredict-deploy/` | Solidity, Hardhat tests, artifact gates, and deployment scripts |
| `docs/` | Specification, architecture, compliance, audit, diagrams, and runbooks |

The main contract is externally linked to `InterPredictReader`. The current
optimized runtimes are 23,619 bytes for `InterPredict` and 3,046 bytes for the
reader. Both deployed bytecodes and the link address must be verified.

## Local setup

Use npm with the checked-in lockfile:

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Populate only local/test values; never commit
private keys, RPC bearer tokens, cron secrets, or production configuration.

Important application variables:

```text
NEXT_PUBLIC_CONTRACT_ADDRESS=<InterPredict V2>
NEXT_PUBLIC_SETTLEMENT_TOKEN_ADDRESS=<token returned by settlementToken()>
NEXT_PUBLIC_CONTRACT_DEPLOYMENT_BLOCK=<first V2 event block>
NEXT_PUBLIC_SETTLEMENT_TOKEN_SYMBOL=tITL
INTERLINK_RPC_URL=<authenticated RPC>
INTERLINK_CHAIN_ID=<exact expected chain>
SERVICE_WALLET_PRIVATE_KEY=<dedicated minimally funded service signer>
CRON_SECRET=<high-entropy keeper bearer secret>
```

The deployment block is strongly recommended: wallet history loads logs in
bounded block ranges and otherwise must begin at block zero.

## Validation

Application:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Protocol:

```bash
cd interpredict-deploy
npm ci
npm run compile
npm test
npm run test:fuzz
npm run test:tooling
npm run abi:check
npm run size:check
npm run storage:check
```

Root `npm run validate` and deploy-package `npm run validate` compose the
release checks. Also run `git diff --check`. Dependency-audit and static-analysis
findings require human review; do not apply a breaking automatic audit fix.

## ABI and APIs

The public `getMarket`, `getMarketOutcomes`, and `getMarketPricing` getters
return canonical ABI-encoded bytes to keep the main runtime below EIP-170. All
clients decode through `lib/interpredictProtocol.ts`; the artifact tooling
guards ABI, storage layout, decoder schema, linked bytecode, and size drift.

`GET /api/markets` uses bounded newest-first offset pagination by default.
Treat `nextCursor` as opaque. It supports `order=asc|desc`, exact `id=<marketId>`
lookup, filters, partial-failure telemetry, pause/deadline/quorum data, and
settlement-token metadata.

The authenticated keeper performs only deterministic or permissionless
lifecycle calls. It is not an oracle and is not required for on-chain deadline
enforcement. Its in-process overlap flag is not a distributed lock; production
requires one logical scheduler and distributed lease or nonce coordination.

## Deployment

Do not deploy until the audit and go/no-go are approved. The reviewed process
deploys and verifies `InterPredictReader` first, then the linked main contract,
then roles and DEC membership. It never updates frontend production addresses
automatically.

Read:

- [Deployment Runbook](docs/DEPLOYMENT.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [Protocol Architecture](docs/PROTOCOL_UPGRADE_ARCHITECTURE.md)
- [Protocol Diagrams](docs/PROTOCOL_DIAGRAMS.md)
- [Complete Specification](docs/INTERPREDICT_COMPLETE_PROTOCOL_SPECIFICATION.md)
- [Compliance Matrix](docs/PROTOCOL_COMPLIANCE_MATRIX.md)
- [Post-Implementation Audit](docs/POST_IMPLEMENTATION_AUDIT.md)
- [UI Regression Review](docs/UI_REGRESSION_REVIEW.md)

## Security boundaries

- Verify chain, main address, reader link, token address/decimals/code hash, and
  deployment block independently.
- Configure only exact-transfer, non-rebasing ERC-20 settlement tokens.
- Use a multisig/contract admin and least-privilege operational accounts.
- Keep the keeper signer separate from every administrative role.
- Never disclose a seed phrase or private key to this application.
- Tests and internal review reduce risk but do not replace an independent audit.

## Community

- Telegram: [t.me/InterPredict](https://t.me/InterPredict)
- X: [x.com/InterPredict](https://x.com/InterPredict)
