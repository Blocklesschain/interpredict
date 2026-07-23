# InterPredict V2 Deployment Runbook

## Safety status

This runbook prepares a reviewed deployment; it is not authorization to deploy.
Do not run `deploy:interlink`, change hosted addresses, or submit role
transactions until the final audit is accepted and a human go/no-go is
recorded.

## Toolchain

- Node.js and npm compatible with the checked-in lockfiles
- Hardhat 3 and Solidity 0.8.20
- Access to the authenticated Interlink RPC
- A dedicated funded deployer
- A reviewed settlement token
- A contract-based admin, normally a multisig

Install deterministically:

```bash
cd interpredict-deploy
npm ci
```

## Preflight validation

From `interpredict-deploy`:

```bash
npm run compile
npm test
npm run test:fuzz
npm run test:tooling
npm run abi:check
npm run size:check
npm run storage:check
```

From the repository root:

```bash
npm ci
npm run validate
```

Review all output, dependency-audit findings, the source diff, generated ABI,
storage layout, and artifacts. A green build is necessary but does not replace
independent protocol review.

## Environment

Copy `interpredict-deploy/.env.example` to an untracked local environment file
and populate every required value:

| Variable | Purpose |
| --- | --- |
| `INTERLINK_RPC_URL` | Authenticated RPC endpoint |
| `INTERLINK_CHAIN_ID` | Exact expected chain |
| `INTERLINK_TOKEN` | RPC authentication token |
| `PRIVATE_KEY` | Dedicated deployer key |
| `SETTLEMENT_TOKEN_ADDRESS` | Exact-transfer ERC-20 |
| `SETTLEMENT_TOKEN_CODEHASH` | Reviewed runtime-code hash |
| `SETTLEMENT_TOKEN_DECIMALS` | Reviewed decimals |
| `TREASURY_ADDRESS` | Nonzero treasury, not the protocol |
| `ADMIN_ADDRESS` | Reviewed deployed multisig/contract |
| `DEPLOY_CONFIRMATIONS` | Receipt confirmations |
| `MIN_DEPLOYER_BALANCE_WEI` | Minimum acceptable gas balance |
| `MAX_INTERPREDICT_RUNTIME_BYTES` | Main-contract release gate, 23,750 |
| `MAX_READER_RUNTIME_BYTES` | Reader release gate, 4,096 |

`DEPLOYMENT_CONFIRMATION` must equal
`REVIEWED_INTERPREDICT_V2_DEPLOYMENT`. An EOA admin is rejected unless the exact
testnet-only override `REVIEWED_TESTNET_EOA_ADMIN` is consciously provided.
Never use that override for production.

Optional comma-separated bootstrap lists are:

- `TEAM_MARKET_ACCOUNTS`
- `DEC_MANAGER_ACCOUNTS`
- `DEC_MEMBERS`

Bootstrap is possible only when the deployer controls the configured admin.
With a multisig admin, leave these empty and execute reviewed post-deployment
transactions through the multisig.

## Deployment

After human approval only:

```bash
npm run deploy:interlink
```

The script:

1. validates environment, chain, deployer balance, token bytecode/code hash and
   decimals, constructor addresses, artifact sizes, and admin type;
2. deploys `InterPredictReader`;
3. deploys the main contract with that exact library link;
4. waits for configured confirmations;
5. verifies on-chain runtime sizes and link-reference bytes;
6. verifies constructor getters, initial roles, and pause state;
7. optionally grants roles/adds DEC members;
8. writes a deployment manifest under
   `interpredict-deploy/deployments/<chainId>/`.

The script does not update frontend environment variables or deploy the web
application.

## Independent verification

Populate:

```text
INTERPREDICT_READER_ADDRESS=
INTERPREDICT_ADDRESS=
DEPLOYMENT_MANIFEST=
```

Then run:

```bash
npm run verify:deployment
```

Verify separately:

- explorer source for both contracts;
- main and reader runtime-code hashes and lengths;
- constructor token, treasury, and admin;
- every deployed link-reference byte equals the reader address;
- `DEFAULT_ADMIN_ROLE`, `TEAM_MARKET_ROLE`, and `DEC_MANAGER_ROLE`;
- token decimals and exact-transfer behavior;
- initial `paused() == false`, all aggregate liabilities zero, and
  `totalMarkets() == 0`;
- deployment transaction block and manifest hashes.

## Role and keeper policy

Use least privilege. The deployer should not remain admin unless it is the
approved multisig. Grant team-market and DEC-manager roles only to reviewed
accounts and record every transaction.

The keeper signer is operational, not administrative. It needs gas only and
must not hold admin, team, or DEC-manager roles. Run one logical scheduled
invocation at a time. The route’s module-local overlap guard protects only one
warm process; serverless instances can overlap. Production must therefore use a
single scheduler plus a distributed lease/lock, or a coordinated nonce manager
and idempotent retry policy. Alert on nonce conflicts, repeated reverts, stalled
cursors, RPC timeouts, and low gas.

The keeper uses bounded newest lifecycle scanning, deterministic rotation,
bounded transaction attempts, rotating DEC-settlement windows, and response
telemetry. Contracts enforce all deadlines and permissionless transitions even
when the keeper is offline.

## Frontend/API release

Configure the root `.env.example` values in staging. Always set
`NEXT_PUBLIC_CONTRACT_DEPLOYMENT_BLOCK` to bound event-history scans. Confirm
that the public token address matches `settlementToken()` and that
`/api/markets` returns the deployed token metadata.

Exercise at least:

- two-, three-, and four-outcome creation/trading;
- proposal approval/rejection/tie/no-vote;
- team market creation;
- snapshot voting, quorum, tie/no-quorum, admin verification and timeout;
- pause/resume, active cancellation and refunds;
- payout, creator fee/seed, DEC settlement/reward claims;
- account and chain changes;
- newest-first pagination and exact-ID lookup.

Only after staging acceptance should an authorized operator update production
addresses and release the frontend.

