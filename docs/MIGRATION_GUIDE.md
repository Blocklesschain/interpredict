# InterPredict V1 to V2 Migration Guide

## Migration model

InterPredict V2 is a breaking redeployment, not an in-place upgrade. V1 used
native-currency, binary-market, oracle-oriented storage and a different fee and
governance model. V2 uses an ERC-20 settlement token, two-to-four outcome
arrays, explicit liability buckets, role-managed DEC membership, membership
epochs, and linked reader bytecode.

There is no contract function that imports V1 markets, positions, balances,
votes, or membership. Never reinterpret V1 storage through the V2 ABI. Keep the
V1 address and ABI available for historical reads and claims that remain valid
under V1.

## Before deployment

1. Freeze the reviewed source commit and generated artifacts.
2. Run the complete app and protocol validation suites.
3. Export and review the V2 storage layout and canonical ABI.
4. Independently review the settlement token. V2 supports only exact-transfer,
   non-rebasing standard ERC-20 behavior.
5. Select a treasury and a contract-based admin, preferably a reviewed
   multisig. Prepare the signer, threshold, recovery, and role policy.
6. Inventory the intended team-market accounts, DEC managers, and initial DEC
   members.
7. Snapshot V1 operational state and public events for historical discovery.
8. Publish the V1 cutoff policy, V2 addresses, chain ID, token address, and
   support process before asking users to transact.

## V2 deployment sequence

1. Deploy `InterPredictReader`.
2. Link the exact reader address into `InterPredict`.
3. Deploy `InterPredict(settlementToken, treasury, admin)`.
4. Verify both runtime bytecodes, constructor arguments, code hashes, and every
   reader link-reference byte.
5. Verify immutable token address/decimals, treasury, chain ID, role ownership,
   pause state, and zero initial liabilities.
6. Grant team-market and DEC-manager roles through the admin process.
7. Add initial DEC members and independently verify their on-chain status.
8. Preserve the generated deployment manifest and explorer-verification
   records.

The deployment script deliberately requires an explicit confirmation phrase,
reviewed token code hash and decimals, minimum deployer balance, and a
contract-admin check. See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Application cutover

Set the V2 values in the hosting environment:

```text
NEXT_PUBLIC_CONTRACT_ADDRESS=<V2 InterPredict>
NEXT_PUBLIC_SETTLEMENT_TOKEN_ADDRESS=<same token returned by settlementToken()>
NEXT_PUBLIC_CONTRACT_DEPLOYMENT_BLOCK=<V2 deployment block>
INTERLINK_RPC_URL=<reviewed authenticated RPC URL>
INTERLINK_CHAIN_ID=<reviewed chain ID>
SERVICE_WALLET_PRIVATE_KEY=<dedicated minimally funded read/keeper signer>
CRON_SECRET=<high-entropy keeper secret>
```

Export the ABI from the exact compiled artifact and run `npm run protocol:abi:check`.
The V2 getters `getMarket`, `getMarketOutcomes`, and `getMarketPricing` return
canonical ABI-encoded bytes and must be decoded through the shared schema in
`lib/interpredictProtocol.ts`.

Deploy the frontend only after:

- the configured settlement-token address equals the contract getter;
- the deployment block is correct;
- newest-first market pagination and direct market-ID lookup work;
- public documents describe V2 economics;
- desktop/mobile lifecycle and wallet regression checks pass;
- the scheduled keeper is configured as one logical writer.

## V1 user-state treatment

V1 data does not disappear when the V2 UI becomes primary. Preserve a read-only
V1 route or external index containing:

- V1 market metadata and terminal state;
- wallet positions and eligible V1 claims;
- proposal/creator history;
- DEC participation and reward history;
- canonical V1 contract and explorer links.

Do not manufacture V2 balances from V1 events or issue an unreviewed token
airdrop. Any economic migration, reimbursement, or claim bridge is a separate
governance and security project requiring a snapshot specification, dispute
window, liability funding, and independent tests.

## Rollback and incident response

V2 contract transactions cannot be rolled back by reverting a website release.
Before the public cutover, rehearse:

- restoring the previous frontend configuration;
- pausing protocol creation/trading or a single affected market;
- continuing permissionless finalization, refunds, payouts, and seed/reward
  claims while paused;
- rotating compromised operational signers;
- publishing a signed incident notice with exact addresses and block heights.

Never point the V1 frontend at V2 or V2 at V1. A frontend rollback must restore
the matching address, ABI, token model, deployment block, and documentation as
one atomic configuration release.

## Acceptance checklist

- [ ] Independent contract and deployment review complete
- [ ] Main and reader size gates pass
- [ ] ABI and storage-layout drift checks pass
- [ ] Full unit, integration, fuzz/property, invariant, lint, type, and build checks pass
- [ ] Both contracts verified and linked-address bytes confirmed
- [ ] Multisig/roles/DEC membership independently confirmed
- [ ] V1 historical access and user communication ready
- [ ] Staging lifecycle exercise completed with test tokens
- [ ] Monitoring, alerts, keeper locking, and incident ownership ready
- [ ] Explicit human go/no-go approval recorded

