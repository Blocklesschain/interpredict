# InterPredict V2 Contract Test Inventory

The Hardhat/Mocha suite contains **117 tests**. Every full title below includes
the root suite, section, and individual test title exactly as reported by Mocha.

1. `InterPredict V2 post-implementation contract audit > Community proposal creation > transfers exactly 11 tITL, routes exactly 1 tITL to treasury, and records exactly 10 tITL of proposal seed`
2. `InterPredict V2 post-implementation contract audit > Community proposal creation > rejects community creation when the creator has insufficient balance`
3. `InterPredict V2 post-implementation contract audit > Community proposal creation > rejects community creation when the creator has insufficient allowance`
4. `InterPredict V2 post-implementation contract audit > Community proposal creation > accepts a community proposal with exactly 2 outcomes`
5. `InterPredict V2 post-implementation contract audit > Community proposal creation > accepts a community proposal with exactly 3 outcomes`
6. `InterPredict V2 post-implementation contract audit > Community proposal creation > accepts a community proposal with exactly 4 outcomes`
7. `InterPredict V2 post-implementation contract audit > Community proposal creation > rejects a proposal with fewer than two outcomes`
8. `InterPredict V2 post-implementation contract audit > Community proposal creation > rejects a proposal with more than four outcomes`
9. `InterPredict V2 post-implementation contract audit > Community proposal creation > rejects an empty outcome label`
10. `InterPredict V2 post-implementation contract audit > Community proposal creation > rejects a duplicate outcome label`
11. `InterPredict V2 post-implementation contract audit > Community proposal creation > rejects an invalid category value and invalid custom-category combinations`
12. `InterPredict V2 post-implementation contract audit > Community proposal creation > rejects an empty thumbnail URI`
13. `InterPredict V2 post-implementation contract audit > Community proposal creation > rejects unsupported evidence and thumbnail URI schemes`
14. `InterPredict V2 post-implementation contract audit > Community proposal creation > rejects a market end time that is past or not strictly after the proposal window`
15. `InterPredict V2 post-implementation contract audit > Community proposal creation > rejects oversized market metadata`
16. `InterPredict V2 post-implementation contract audit > Community proposal creation > derives proposal economics from settlement-token decimals instead of assuming 18 decimals`
17. `InterPredict V2 post-implementation contract audit > Team markets > lets an authorized team account create an immediately active market`
18. `InterPredict V2 post-implementation contract audit > Team markets > bypasses DEC proposal voting and records automatic approval for a team market`
19. `InterPredict V2 post-implementation contract audit > Team markets > rejects team-market creation by an unauthorized wallet`
20. `InterPredict V2 post-implementation contract audit > Team markets > fully backs the supplied team seed and rejects zero or unfunded seed amounts`
21. `InterPredict V2 post-implementation contract audit > Team markets > uses the team fee path with 30 bps treasury, 20 bps DEC, and no creator fee`
22. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > sets the proposal-voting deadline to exactly 24 hours after voting starts`
23. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > accepts approval and rejection votes from active DEC members`
24. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > rejects proposal votes from inactive DEC members and unauthorized wallets`
25. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > rejects duplicate proposal votes`
26. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > rejects proposal voting at or after the deadline`
27. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > rejects proposal finalization before the deadline`
28. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > allows any wallet to finalize a proposal after the deadline`
29. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > produces the same proposal result and accounting regardless of finalization caller`
30. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > activates a community market when approvals outnumber rejections`
31. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > rejects and refunds a community market when rejections outnumber approvals`
32. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > treats equal nonzero proposal votes as rejection and refunds exactly 10 tITL`
33. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > cancels a zero-vote proposal and automatically refunds exactly 10 tITL`
34. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > keeps the 1 tITL proposal fee in treasury after rejection, tie, and no-vote cancellation`
35. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > prevents duplicate proposal finalization and duplicate automatic refunds`
36. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > cannot refund approved community markets or team markets through proposal finalization`
37. `InterPredict V2 post-implementation contract audit > Proposal voting and deterministic outcomes > atomically reverts a failed automatic refund and permits a successful retry after token recovery`
38. `InterPredict V2 post-implementation contract audit > Seed allocation > splits the 10 tITL seed deterministically across 2 outcomes`
39. `InterPredict V2 post-implementation contract audit > Seed allocation > splits the 10 tITL seed deterministically across 3 outcomes`
40. `InterPredict V2 post-implementation contract audit > Seed allocation > splits the 10 tITL seed deterministically across 4 outcomes`
41. `InterPredict V2 post-implementation contract audit > Seed allocation > keeps creator seed liability separate from proposal, trading, fee, and reward liabilities`
42. `InterPredict V2 post-implementation contract audit > Seed allocation > prevents creator seed withdrawal before market finalization`
43. `InterPredict V2 post-implementation contract audit > Seed allocation > documents that a team seed smaller than the outcome count activates a zero-liquidity outcome`
44. `InterPredict V2 post-implementation contract audit > Trading and pricing > rejects trading before community proposal activation`
45. `InterPredict V2 post-implementation contract audit > Trading and pricing > allows trading immediately after activation`
46. `InterPredict V2 post-implementation contract audit > Trading and pricing > rejects trading after market end without keeper synchronization`
47. `InterPredict V2 post-implementation contract audit > Trading and pricing > rejects zero and below-minimum trades`
48. `InterPredict V2 post-implementation contract audit > Trading and pricing > rejects an invalid trading outcome`
49. `InterPredict V2 post-implementation contract audit > Trading and pricing > enforces minimum-shares slippage protection`
50. `InterPredict V2 post-implementation contract audit > Trading and pricing > quotes and executes coherent 2-outcome pricing`
51. `InterPredict V2 post-implementation contract audit > Trading and pricing > quotes and executes coherent 3-outcome pricing`
52. `InterPredict V2 post-implementation contract audit > Trading and pricing > quotes and executes coherent 4-outcome pricing`
53. `InterPredict V2 post-implementation contract audit > Trading and pricing > keeps displayed probabilities bounded and coherent within integer-rounding tolerance`
54. `InterPredict V2 post-implementation contract audit > Trading and pricing > records participation, gross volume, trade count, and unique participant count`
55. `InterPredict V2 post-implementation contract audit > Trading fees and creator claims > charges a total trade fee of exactly 50 basis points`
56. `InterPredict V2 post-implementation contract audit > Trading fees and creator claims > allocates community fees as 20 bps treasury, 20 bps DEC, and 10 bps creator`
57. `InterPredict V2 post-implementation contract audit > Trading fees and creator claims > allocates team fees as 30 bps treasury, 20 bps DEC, and zero creator fee`
58. `InterPredict V2 post-implementation contract audit > Trading fees and creator claims > rounds fee allocation deterministically without distributing more than the collected fee`
59. `InterPredict V2 post-implementation contract audit > Trading fees and creator claims > allows only the community creator to claim exactly the earned creator fee once`
60. `InterPredict V2 post-implementation contract audit > Trading fees and creator claims > rejects creator-fee claims from team markets`
61. `InterPredict V2 post-implementation contract audit > Adversarial token and validation limitations > documents fee-on-transfer settlement-token undercollateralization`
62. `InterPredict V2 post-implementation contract audit > Adversarial token and validation limitations > documents exact URI-prefix behavior for Arweave and http-prefixed junk`
63. `InterPredict V2 post-implementation contract audit > Resolution eligibility and deadlines > allows a trader to request resolution after trading closes`
64. `InterPredict V2 post-implementation contract audit > Resolution eligibility and deadlines > allows the market creator to request resolution after trading closes`
65. `InterPredict V2 post-implementation contract audit > Resolution eligibility and deadlines > allows an active DEC member to request resolution after trading closes`
66. `InterPredict V2 post-implementation contract audit > Resolution eligibility and deadlines > rejects resolution requests from an unrelated wallet`
67. `InterPredict V2 post-implementation contract audit > Resolution eligibility and deadlines > rejects a suspended DEC requester unless independently eligible as a trader or creator`
68. `InterPredict V2 post-implementation contract audit > Resolution eligibility and deadlines > rejects resolution requests before trading closes`
69. `InterPredict V2 post-implementation contract audit > Resolution eligibility and deadlines > rejects duplicate resolution requests`
70. `InterPredict V2 post-implementation contract audit > Resolution eligibility and deadlines > prevents rejected and proposal-cancelled markets from entering resolution`
71. `InterPredict V2 post-implementation contract audit > Resolution eligibility and deadlines > starts resolution voting immediately with a deadline exactly three hours later`
72. `InterPredict V2 post-implementation contract audit > Resolution eligibility and deadlines > accepts resolution votes before the deadline`
73. `InterPredict V2 post-implementation contract audit > Resolution eligibility and deadlines > rejects resolution votes at or after the deadline`
74. `InterPredict V2 post-implementation contract audit > Resolution eligibility and deadlines > rejects resolution finalization before the deadline`
75. `InterPredict V2 post-implementation contract audit > Resolution eligibility and deadlines > allows permissionless resolution finalization with a caller-independent result`
76. `InterPredict V2 post-implementation contract audit > DEC snapshot and quorum > snapshots the active DEC count when resolution is requested`
77. `InterPredict V2 post-implementation contract audit > DEC snapshot and quorum > uses safe upward quorum rounding for an odd DEC snapshot`
78. `InterPredict V2 post-implementation contract audit > DEC snapshot and quorum > does not change the count snapshot when DEC members are added after resolution starts`
79. `InterPredict V2 post-implementation contract audit > DEC snapshot and quorum > uses current active status, not snapshot membership, to determine voting eligibility`
80. `InterPredict V2 post-implementation contract audit > DEC snapshot and quorum > escalates a leading outcome that lacks quorum to admin verification`
81. `InterPredict V2 post-implementation contract audit > DEC snapshot and quorum > records a unique highest outcome after quorum`
82. `InterPredict V2 post-implementation contract audit > DEC snapshot and quorum > escalates a tied highest vote to admin verification`
83. `InterPredict V2 post-implementation contract audit > DEC snapshot and quorum > escalates a no-vote resolution to admin verification`
84. `InterPredict V2 post-implementation contract audit > Admin verification > allows an authorized admin to confirm the binding DEC outcome`
85. `InterPredict V2 post-implementation contract audit > Admin verification > rejects outcome confirmation by an unauthorized wallet`
86. `InterPredict V2 post-implementation contract audit > Admin verification > rejects an invalid confirmed outcome index`
87. `InterPredict V2 post-implementation contract audit > Admin verification > requires both a reason and an evidence reference for admin verification`
88. `InterPredict V2 post-implementation contract audit > Admin verification > prevents a valid DEC plurality from being silently changed by admin`
89. `InterPredict V2 post-implementation contract audit > Admin verification > requires documented admin action to resolve tied and no-quorum results`
90. `InterPredict V2 post-implementation contract audit > Admin verification > makes the confirmed outcome immutable after confirmation and finalization`
91. `InterPredict V2 post-implementation contract audit > DEC reputation and rewards > increases reputation for an honest resolution vote and decreases it for an incorrect vote`
92. `InterPredict V2 post-implementation contract audit > DEC reputation and rewards > prevents resolution-vote correctness from being processed twice`
93. `InterPredict V2 post-implementation contract audit > DEC reputation and rewards > locks stored rewards below threshold, restores claims and accrual after recovery, and prevents duplicates`
94. `InterPredict V2 post-implementation contract audit > DEC reputation and rewards > documents the stranded DEC liability when a correct voter becomes ineligible`
95. `InterPredict V2 post-implementation contract audit > DEC reputation and rewards > routes all DEC funds to treasury when admin confirmation differs and no voter selected the winner`
96. `InterPredict V2 post-implementation contract audit > DEC reputation and rewards > allows the confirmed correct voter to earn the DEC allocation on a no-quorum market`
97. `InterPredict V2 post-implementation contract audit > DEC reputation and rewards > routes DEC funds to treasury and creates no DEC reward on active-market cancellation`
98. `InterPredict V2 post-implementation contract audit > Winner and creator claims > pays the full pari-mutuel collateral pool to the sole winning trader`
99. `InterPredict V2 post-implementation contract audit > Winner and creator claims > rejects losing and duplicate winning payout claims`
100. `InterPredict V2 post-implementation contract audit > Winner and creator claims > refunds net contributions when the confirmed outcome has no purchased shares`
101. `InterPredict V2 post-implementation contract audit > Winner and creator claims > keeps claim-order rounding within one wei and gives the last claimant only the legitimate remainder`
102. `InterPredict V2 post-implementation contract audit > Winner and creator claims > returns creator seed only through the creator while always paying the creator`
103. `InterPredict V2 post-implementation contract audit > Winner and creator claims > remains exactly solvent after winner, DEC reward, and creator-seed claims`
104. `InterPredict V2 post-implementation contract audit > Active-market cancellation > allows authorized cancellation and rejects unauthorized cancellation`
105. `InterPredict V2 post-implementation contract audit > Active-market cancellation > refunds net trader collateral, preserves creator fees, routes DEC funds, returns seed, and stays solvent`
106. `InterPredict V2 post-implementation contract audit > Liability and lifecycle invariants > maintains exact asset coverage through proposal, trading, resolution, and every claim`
107. `InterPredict V2 post-implementation contract audit > Liability and lifecycle invariants > covers proposal-refund liabilities before and after deterministic refund execution`
108. `InterPredict V2 post-implementation contract audit > Liability and lifecycle invariants > does not let treasury administration consume outstanding user liabilities`
109. `InterPredict V2 post-implementation contract audit > Liability and lifecycle invariants > keeps total fee allocation at or below collected fees across deterministic property cases`
110. `InterPredict V2 post-implementation contract audit > Liability and lifecycle invariants > prevents final outcomes and resolved lifecycle state from moving backward`
111. `InterPredict V2 post-implementation contract audit > Additional role and resolution-vote validation > rejects team-market creation when the authorized team account has insufficient allowance`
112. `InterPredict V2 post-implementation contract audit > Additional role and resolution-vote validation > rejects a resolution vote from an unauthorized or suspended DEC wallet before the deadline`
113. `InterPredict V2 post-implementation contract audit > Additional role and resolution-vote validation > rejects duplicate resolution votes before the deadline`
114. `InterPredict V2 post-implementation contract audit > Additional role and resolution-vote validation > rejects an invalid resolution outcome before the deadline`
115. `InterPredict V2 post-implementation contract audit > Seed allocation > emits a complete proposal refund audit record`

The three additional assertions added during the remediation are included in
the current 117-test count; the numbered historical inventory above is retained
as the prior title snapshot.

## Independent validation

- `npx hardhat test`: **117 passing (117 mocha), 0 failing**
- `npm test` in `interpredict-deploy`: **117 passing, 0 failing**
- Focus/skip scan: **no `.only` or `.skip` markers**
