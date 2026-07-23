import { expect } from "chai";
import fc from "fast-check";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();
const { loadFixture, time } = networkHelpers;

const DAY = 24 * 60 * 60;
const HOUR = 60 * 60;
const E = ethers.parseEther;
const MAX_UINT256 = ethers.MaxUint256;

const Origin = Object.freeze({ Community: 0n, Team: 1n });
const State = Object.freeze({
  Proposed: 0n,
  DECProposalVoting: 1n,
  Rejected: 2n,
  Cancelled: 3n,
  Approved: 4n,
  Active: 5n,
  TradingClosed: 6n,
  Unresolved: 7n,
  ResolutionRequested: 8n,
  DECResolutionVoting: 9n,
  AdminVerification: 10n,
  OutcomeConfirmed: 11n,
  Finalized: 12n,
  Resolved: 13n,
});
const ProposalDecision = Object.freeze({ None: 0n, Approved: 1n, Rejected: 2n, Cancelled: 3n });
const DecisionReason = Object.freeze({
  None: 0n,
  ApprovedByDEC: 1n,
  RejectedByDEC: 2n,
  TiedDECProposalVote: 3n,
  NoDECVotes: 4n,
  TradingEndPassed: 5n,
});
const ResolutionFailure = Object.freeze({ None: 0n, NoVotes: 1n, QuorumNotMet: 2n, TiedVote: 3n });

const MARKET_TUPLE = `tuple(
  uint256 id,address creator,uint8 origin,uint8 category,uint8 state,
  string question,string description,string customCategory,string thumbnailURI,
  string resolutionCriteria,string primaryEvidenceURI,string backupEvidenceURI,
  uint64 tradingEndTime,uint64 proposalVotingStartedAt,uint64 proposalVotingDeadline,
  uint64 proposalFinalizedAt,uint64 activatedAt,uint64 resolutionRequestedAt,
  uint64 resolutionVotingDeadline,uint64 resolutionFinalizedAt,uint64 outcomeConfirmedAt,
  uint64 finalizedAt,uint32 approvalVotes,uint32 rejectionVotes,uint32 resolutionSnapshot,
  uint32 resolutionVoterCount,uint8 leadingOutcome,uint8 winningOutcome,uint8 proposalDecision,
  uint8 decisionReason,uint8 resolutionFailure,bool proposalFinalized,bool refundCompleted,
  bool resolutionVoteFinalized,bool adminConfirmed,bool seedReturned,bool activeMarketCancelled,
  uint256 originalSeed,uint256 tradingCollateral,uint256 marketVolume,uint256 creatorFeesEarned,
  uint256 creatorFeesClaimed,uint256 decRewardFunds,uint256 decRewardPerEligibleVoter,
  uint256 payoutRemaining,uint256 winningSharesRemaining,string adminVerificationReason,
  string adminEvidenceURI,string cancellationReason,string cancellationEvidenceURI,
  uint64 resolutionMembershipEpoch,uint64 adminVerificationDeadline,uint32 resolutionQuorum,
  address resolutionRequester
)`;
const abiCoder = ethers.AbiCoder.defaultAbiCoder();

function wrapProtocol(contract) {
  return new Proxy(contract, {
    get(target, property, receiver) {
      if (property === "connect") {
        return (signer) => wrapProtocol(target.connect(signer));
      }
      if (property === "getMarket") {
        return async (id) => abiCoder.decode([MARKET_TUPLE], await target.getMarket(id))[0];
      }
      if (property === "getMarketOutcomes") {
        return async (id) => abiCoder.decode(["string[]"], await target.getMarketOutcomes(id))[0];
      }
      if (property === "getMarketPricing") {
        return async (id) =>
          abiCoder.decode(
            ["uint256[]", "uint256[]", "uint256[]"],
            await target.getMarketPricing(id),
          );
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

async function deployLinkedProtocol(token, treasury, admin) {
  const reader = await ethers.deployContract("InterPredictReader");
  const factory = await ethers.getContractFactory("InterPredict", {
    libraries: { InterPredictReader: reader.target },
  });
  const rawProtocol = await factory.deploy(token, treasury, admin);
  return { protocol: wrapProtocol(rawProtocol), rawProtocol, reader };
}

async function deployFixture() {
  const [
    admin,
    treasury,
    creator,
    decA,
    decB,
    decC,
    traderA,
    traderB,
    traderC,
    outsider,
    caller,
    decD,
    decE,
    poor,
    alternateTreasury,
    decF,
  ] = await ethers.getSigners();

  const token = await ethers.deployContract("MockToken");
  const { protocol, rawProtocol, reader } = await deployLinkedProtocol(
    token.target,
    treasury.address,
    admin.address,
  );
  const funded = [admin, creator, decA, decB, decC, traderA, traderB, traderC, outsider, caller, decD, decE, decF];
  for (const account of funded) {
    await token.mint(account.address, E("1000000"));
  }
  for (const member of [decA, decB, decC]) {
    await protocol.connect(admin).addDECMember(member.address);
  }

  return {
    admin,
    treasury,
    creator,
    decA,
    decB,
    decC,
    traderA,
    traderB,
    traderC,
    outsider,
    caller,
    decD,
    decE,
    decF,
    poor,
    alternateTreasury,
    token,
    protocol,
    rawProtocol,
    reader,
  };
}

async function deployFailingTokenFixture() {
  const [admin, treasury, creator, decA, caller] = await ethers.getSigners();
  const token = await ethers.deployContract("MockFailingToken");
  const { protocol, rawProtocol, reader } = await deployLinkedProtocol(
    token.target,
    treasury.address,
    admin.address,
  );
  await token.mint(creator.address, E("100"));
  await protocol.connect(admin).addDECMember(decA.address);
  return { admin, treasury, creator, decA, caller, token, protocol, rawProtocol, reader };
}

async function validParams(overrides = {}) {
  const now = await time.latest();
  return {
    question: "Which network will lead?",
    description: "An auditable multi-outcome prediction market.",
    category: 2,
    customCategory: "",
    thumbnailURI: "ipfs://interpredict-market-thumbnail",
    outcomes: ["Bitcoin", "Ethereum", "Solana"],
    tradingEndTime: now + 7 * DAY,
    resolutionCriteria: "The outcome with the highest verified value at the deadline.",
    primaryEvidenceURI: "https://example.com/evidence",
    backupEvidenceURI: "",
    ...overrides,
  };
}

async function approveExact(token, owner, spender, amount) {
  await token.connect(owner).approve(spender, amount);
}

async function createCommunity(f, overrides = {}, creator = f.creator) {
  const params = await validParams(overrides);
  const id = await f.protocol.totalMarkets();
  await approveExact(f.token, creator, f.protocol.target, E("11"));
  await f.protocol.connect(creator).createCommunityMarket(params);
  return { id, params };
}

async function finalizeCommunity(f, id, votes = [[f.decA, 1]], caller = f.caller) {
  for (const [member, vote] of votes) {
    await f.protocol.connect(member).voteOnProposal(id, vote);
  }
  const pending = await f.protocol.getMarket(id);
  await time.increaseTo(Number(pending.proposalVotingDeadline));
  await f.protocol.connect(caller).finalizeProposalVoting(id);
  return f.protocol.getMarket(id);
}

async function createActiveCommunity(f, overrides = {}, creator = f.creator) {
  const created = await createCommunity(f, overrides, creator);
  await finalizeCommunity(f, created.id);
  return created;
}

async function createTeam(f, overrides = {}, seed = E("10"), team = f.admin) {
  const params = await validParams(overrides);
  const id = await f.protocol.totalMarkets();
  await approveExact(f.token, team, f.protocol.target, seed);
  await f.protocol.connect(team).createTeamMarket(params, seed);
  return { id, params };
}

async function buy(f, id, outcomeIndex, grossAmount, trader = f.traderA, minSharesOut) {
  await approveExact(f.token, trader, f.protocol.target, grossAmount);
  const quote = await f.protocol.quoteBuy(id, outcomeIndex, grossAmount);
  await f.protocol
    .connect(trader)
    .buyOutcome(id, outcomeIndex, grossAmount, minSharesOut ?? quote.shares);
  return quote;
}

async function closeMarket(f, id) {
  const market = await f.protocol.getMarket(id);
  await time.increaseTo(Number(market.tradingEndTime));
}

async function startResolution(f, id, requester = f.admin) {
  await closeMarket(f, id);
  await f.protocol.connect(requester).requestResolution(id);
  return f.protocol.getMarket(id);
}

async function finishResolutionVoting(f, id, votes, caller = f.caller) {
  for (const [member, outcome] of votes) {
    await f.protocol.connect(member).voteOnResolution(id, outcome);
  }
  const voting = await f.protocol.getMarket(id);
  await time.increaseTo(Number(voting.resolutionVotingDeadline));
  await f.protocol.connect(caller).finalizeResolutionVoting(id);
  return f.protocol.getMarket(id);
}

async function resolveTeamMarket(
  f,
  {
    outcomes = ["Yes", "No"],
    trades = [],
    votes = [
      [f.decA, 0],
      [f.decB, 0],
    ],
    winner = 0,
    requester = f.admin,
    seed = E("10"),
  } = {},
) {
  const { id } = await createTeam(
    f,
    { outcomes, tradingEndTime: (await time.latest()) + 60 },
    seed,
  );
  for (const trade of trades) {
    await buy(f, id, trade.outcome, trade.amount, trade.trader);
  }
  await startResolution(f, id, requester);
  const verification = await finishResolutionVoting(f, id, votes);
  await f.protocol
    .connect(f.admin)
    .confirmOutcome(id, winner, "Verified against the declared evidence.", "https://example.com/final");
  await f.protocol.connect(f.caller).finalizeMarket(id);
  return { id, verification, market: await f.protocol.getMarket(id) };
}

async function prepareAdminVerification(
  f,
  {
    outcomes = ["Yes", "No"],
    votes = [
      [f.decA, 0],
      [f.decB, 0],
    ],
    trades = [],
  } = {},
) {
  const { id } = await createTeam(f, {
    outcomes,
    tradingEndTime: (await time.latest()) + 60,
  });
  for (const trade of trades) {
    await buy(f, id, trade.outcome, trade.amount, trade.trader);
  }
  await startResolution(f, id, f.admin);
  const market = await finishResolutionVoting(f, id, votes);
  return { id, market };
}

async function aggregateLiabilities(protocol) {
  return (
    (await protocol.totalProposalSeedLiability()) +
    (await protocol.totalCreatorSeedLiability()) +
    (await protocol.totalTradingCollateralLiability()) +
    (await protocol.totalCreatorFeeLiability()) +
    (await protocol.totalDECRewardLiability())
  );
}

async function expectExactCoverage(token, protocol) {
  expect(await token.balanceOf(protocol.target)).to.equal(await aggregateLiabilities(protocol));
}

describe("InterPredict V2 post-implementation contract audit", function () {
  describe("Community proposal creation", function () {
    it("transfers exactly 11 tITL, routes exactly 1 tITL to treasury, and records exactly 10 tITL of proposal seed", async function () {
      const f = await loadFixture(deployFixture);
      const creatorBefore = await f.token.balanceOf(f.creator.address);
      const treasuryBefore = await f.token.balanceOf(f.treasury.address);

      await createCommunity(f);

      expect(creatorBefore - (await f.token.balanceOf(f.creator.address))).to.equal(E("11"));
      expect((await f.token.balanceOf(f.treasury.address)) - treasuryBefore).to.equal(E("1"));
      expect(await f.token.balanceOf(f.protocol.target)).to.equal(E("10"));
      expect(await f.protocol.totalProposalSeedLiability()).to.equal(E("10"));
      expect((await f.protocol.getMarket(0)).originalSeed).to.equal(E("10"));
    });

    it("rejects community creation when the creator has insufficient balance", async function () {
      const f = await loadFixture(deployFixture);
      const params = await validParams();
      await approveExact(f.token, f.poor, f.protocol.target, E("11"));
      await expect(f.protocol.connect(f.poor).createCommunityMarket(params))
        .to.be.revertedWithCustomError(f.token, "ERC20InsufficientBalance");
    });

    it("rejects community creation when the creator has insufficient allowance", async function () {
      const f = await loadFixture(deployFixture);
      const params = await validParams();
      await approveExact(f.token, f.creator, f.protocol.target, E("10.999999999999999999"));
      await expect(f.protocol.connect(f.creator).createCommunityMarket(params))
        .to.be.revertedWithCustomError(f.token, "ERC20InsufficientAllowance");
    });

    for (const outcomeCount of [2, 3, 4]) {
      it(`accepts a community proposal with exactly ${outcomeCount} outcomes`, async function () {
        const f = await loadFixture(deployFixture);
        const outcomes = ["One", "Two", "Three", "Four"].slice(0, outcomeCount);
        await createCommunity(f, { outcomes });
        expect(await f.protocol.getMarketOutcomes(0)).to.deep.equal(outcomes);
      });
    }

    it("rejects a proposal with fewer than two outcomes", async function () {
      const f = await loadFixture(deployFixture);
      const params = await validParams({ outcomes: ["Only"] });
      await approveExact(f.token, f.creator, f.protocol.target, E("11"));
      await expect(f.protocol.connect(f.creator).createCommunityMarket(params)).to.be.revertedWithCustomError(f.protocol, "InvalidInput");
    });

    it("rejects a proposal with more than four outcomes", async function () {
      const f = await loadFixture(deployFixture);
      const params = await validParams({ outcomes: ["One", "Two", "Three", "Four", "Five"] });
      await approveExact(f.token, f.creator, f.protocol.target, E("11"));
      await expect(f.protocol.connect(f.creator).createCommunityMarket(params)).to.be.revertedWithCustomError(f.protocol, "InvalidInput");
    });

    it("rejects an empty outcome label", async function () {
      const f = await loadFixture(deployFixture);
      const params = await validParams({ outcomes: ["Yes", ""] });
      await approveExact(f.token, f.creator, f.protocol.target, E("11"));
      await expect(f.protocol.connect(f.creator).createCommunityMarket(params)).to.be.revertedWithCustomError(f.protocol, "InvalidText");
    });

    it("rejects a duplicate outcome label", async function () {
      const f = await loadFixture(deployFixture);
      const params = await validParams({ outcomes: ["Same", "Same"] });
      await approveExact(f.token, f.creator, f.protocol.target, E("11"));
      await expect(f.protocol.connect(f.creator).createCommunityMarket(params)).to.be.revertedWithCustomError(f.protocol, "DuplicateOutcome");
    });

    it("rejects an invalid category value and invalid custom-category combinations", async function () {
      const f = await loadFixture(deployFixture);
      await approveExact(f.token, f.creator, f.protocol.target, MAX_UINT256);
      await expect(
        f.protocol.connect(f.creator).createCommunityMarket(await validParams({ category: 18 })),
      ).to.revert(ethers);
      await expect(
        f.protocol
          .connect(f.creator)
          .createCommunityMarket(await validParams({ category: 17, customCategory: "" })),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidText");
      await expect(
        f.protocol
          .connect(f.creator)
          .createCommunityMarket(await validParams({ category: 2, customCategory: "Custom" })),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidInput");
    });

    it("rejects an empty thumbnail URI", async function () {
      const f = await loadFixture(deployFixture);
      const params = await validParams({ thumbnailURI: "" });
      await approveExact(f.token, f.creator, f.protocol.target, E("11"));
      await expect(f.protocol.connect(f.creator).createCommunityMarket(params)).to.be.revertedWithCustomError(f.protocol, "InvalidURI");
    });

    it("rejects unsupported evidence and thumbnail URI schemes", async function () {
      const f = await loadFixture(deployFixture);
      await approveExact(f.token, f.creator, f.protocol.target, MAX_UINT256);
      await expect(
        f.protocol
          .connect(f.creator)
          .createCommunityMarket(await validParams({ primaryEvidenceURI: "ftp://example.com" })),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidURI");
      await expect(
        f.protocol
          .connect(f.creator)
          .createCommunityMarket(await validParams({ thumbnailURI: "data:image/png;base64,AA==" })),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidURI");
    });

    it("rejects a market end time that is past or not strictly after the proposal window", async function () {
      const f = await loadFixture(deployFixture);
      const now = await time.latest();
      await approveExact(f.token, f.creator, f.protocol.target, MAX_UINT256);
      await expect(
        f.protocol.connect(f.creator).createCommunityMarket(await validParams({ tradingEndTime: now - 1 })),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidInput");
      await expect(
        f.protocol
          .connect(f.creator)
          .createCommunityMarket(await validParams({ tradingEndTime: (await time.latest()) + DAY })),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidInput");
    });

    it("rejects oversized market metadata", async function () {
      const f = await loadFixture(deployFixture);
      const params = await validParams({ question: "q".repeat(281) });
      await approveExact(f.token, f.creator, f.protocol.target, E("11"));
      await expect(f.protocol.connect(f.creator).createCommunityMarket(params)).to.be.revertedWithCustomError(f.protocol, "InvalidText");
    });

    it("derives proposal economics from settlement-token decimals instead of assuming 18 decimals", async function () {
      const [admin, treasury, creator] = await ethers.getSigners();
      const token = await ethers.deployContract("MockTokenWithDecimals", [6]);
      const { protocol } = await deployLinkedProtocol(token.target, treasury.address, admin.address);
      await token.mint(creator.address, 11_000_000n);
      await token.connect(creator).approve(protocol.target, 11_000_000n);
      await protocol.connect(creator).createCommunityMarket(await validParams());
      expect(await protocol.proposalFee()).to.equal(1_000_000n);
      expect(await protocol.proposalSeed()).to.equal(10_000_000n);
      expect(await token.balanceOf(treasury.address)).to.equal(1_000_000n);
      expect(await protocol.totalProposalSeedLiability()).to.equal(10_000_000n);
    });
  });

  describe("Team markets", function () {
    it("lets an authorized team account create an immediately active market", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f);
      const market = await f.protocol.getMarket(id);
      expect(market.origin).to.equal(Origin.Team);
      expect(market.state).to.equal(State.Active);
      expect(market.activatedAt).to.be.greaterThan(0n);
    });

    it("bypasses DEC proposal voting and records automatic approval for a team market", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f);
      const market = await f.protocol.getMarket(id);
      expect(market.proposalVotingStartedAt).to.equal(0n);
      expect(market.proposalVotingDeadline).to.equal(0n);
      expect(market.proposalDecision).to.equal(ProposalDecision.Approved);
      await expect(f.protocol.connect(f.decA).voteOnProposal(id, 1)).to.be.revertedWithCustomError(f.protocol, "InvalidState");
    });

    it("rejects team-market creation by an unauthorized wallet", async function () {
      const f = await loadFixture(deployFixture);
      const params = await validParams();
      await approveExact(f.token, f.creator, f.protocol.target, E("10"));
      await expect(
        f.protocol.connect(f.creator).createTeamMarket(params, E("10")),
      ).to.be.revertedWithCustomError(f.protocol, "AccessControlUnauthorizedAccount");
    });

    it("fully backs the supplied team seed and rejects zero or unfunded seed amounts", async function () {
      const f = await loadFixture(deployFixture);
      const params = await validParams();
      await approveExact(f.token, f.admin, f.protocol.target, E("12"));
      await f.protocol.connect(f.admin).createTeamMarket(params, E("12"));
      expect(await f.token.balanceOf(f.protocol.target)).to.equal(E("12"));
      expect(await f.protocol.totalCreatorSeedLiability()).to.equal(E("12"));
      expect((await f.protocol.getMarket(0)).originalSeed).to.equal(E("12"));

      await expect(
        f.protocol.connect(f.admin).createTeamMarket(await validParams(), 0),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidInput");
      await approveExact(f.token, f.poor, f.protocol.target, E("10"));
      const teamRole = await f.protocol.TEAM_MARKET_ROLE();
      await f.protocol.connect(f.admin).grantRole(teamRole, f.poor.address);
      await expect(
        f.protocol.connect(f.poor).createTeamMarket(await validParams(), E("10")),
      ).to.be.revertedWithCustomError(f.token, "ERC20InsufficientBalance");
    });

    it("uses the team fee path with 30 bps treasury, 20 bps DEC, and no creator fee", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f);
      const treasuryBefore = await f.token.balanceOf(f.treasury.address);
      await buy(f, id, 1, E("100"));
      const market = await f.protocol.getMarket(id);
      expect((await f.token.balanceOf(f.treasury.address)) - treasuryBefore).to.equal(E("0.3"));
      expect(market.decRewardFunds).to.equal(E("0.2"));
      expect(market.creatorFeesEarned).to.equal(0n);
      expect(market.tradingCollateral).to.equal(E("99.5"));
    });
  });

  describe("Proposal voting and deterministic outcomes", function () {
    it("sets the proposal-voting deadline to exactly 24 hours after voting starts", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      const market = await f.protocol.getMarket(id);
      expect(market.proposalVotingDeadline - market.proposalVotingStartedAt).to.equal(BigInt(DAY));
    });

    it("accepts approval and rejection votes from active DEC members", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      await f.protocol.connect(f.decA).voteOnProposal(id, 1);
      await f.protocol.connect(f.decB).voteOnProposal(id, 2);
      const market = await f.protocol.getMarket(id);
      expect(market.approvalVotes).to.equal(1n);
      expect(market.rejectionVotes).to.equal(1n);
      expect(await f.protocol.proposalVotes(id, f.decA.address)).to.equal(1n);
      expect(await f.protocol.proposalVotes(id, f.decB.address)).to.equal(2n);
    });

    it("rejects proposal votes from inactive DEC members and unauthorized wallets", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      await f.protocol.connect(f.admin).setDECMemberActive(f.decA.address, false);
      await expect(f.protocol.connect(f.decA).voteOnProposal(id, 1)).to.be.revertedWithCustomError(f.protocol, "InactiveDECMember");
      await expect(f.protocol.connect(f.outsider).voteOnProposal(id, 1)).to.be.revertedWithCustomError(f.protocol, "InactiveDECMember");
    });

    it("rejects duplicate proposal votes", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      await f.protocol.connect(f.decA).voteOnProposal(id, 1);
      await expect(f.protocol.connect(f.decA).voteOnProposal(id, 2)).to.be.revertedWithCustomError(f.protocol, "InvalidVote");
    });

    it("rejects proposal voting at or after the deadline", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      const market = await f.protocol.getMarket(id);
      await time.increaseTo(Number(market.proposalVotingDeadline));
      await expect(f.protocol.connect(f.decA).voteOnProposal(id, 1)).to.be.revertedWithCustomError(f.protocol, "DeadlineExpired");
    });

    it("rejects proposal finalization before the deadline", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      await expect(f.protocol.connect(f.outsider).finalizeProposalVoting(id))
        .to.be.revertedWithCustomError(f.protocol, "DeadlineActive");
    });

    it("allows any wallet to finalize a proposal after the deadline", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      await f.protocol.connect(f.decA).voteOnProposal(id, 1);
      const market = await f.protocol.getMarket(id);
      await time.increaseTo(Number(market.proposalVotingDeadline));
      await f.protocol.connect(f.outsider).finalizeProposalVoting(id);
      expect((await f.protocol.getMarket(id)).state).to.equal(State.Active);
    });

    it("produces the same proposal result and accounting regardless of finalization caller", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      await f.protocol.connect(f.decA).voteOnProposal(id, 2);
      const market = await f.protocol.getMarket(id);
      await time.increaseTo(Number(market.proposalVotingDeadline));
      const snapshot = await networkHelpers.takeSnapshot();

      await f.protocol.connect(f.outsider).finalizeProposalVoting(id);
      const first = await f.protocol.getMarket(id);
      const firstBalance = await f.token.balanceOf(f.creator.address);

      await snapshot.restore();
      await f.protocol.connect(f.creator).finalizeProposalVoting(id);
      const second = await f.protocol.getMarket(id);
      expect(second.state).to.equal(first.state);
      expect(second.proposalDecision).to.equal(first.proposalDecision);
      expect(second.decisionReason).to.equal(first.decisionReason);
      expect(await f.token.balanceOf(f.creator.address)).to.equal(firstBalance);
    });

    it("activates a community market when approvals outnumber rejections", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      const result = await finalizeCommunity(f, id, [
        [f.decA, 1],
        [f.decB, 1],
        [f.decC, 2],
      ]);
      expect(result.state).to.equal(State.Active);
      expect(result.proposalDecision).to.equal(ProposalDecision.Approved);
      expect(result.decisionReason).to.equal(DecisionReason.ApprovedByDEC);
      expect(result.refundCompleted).to.equal(false);
    });

    it("rejects and refunds a community market when rejections outnumber approvals", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      const creatorBefore = await f.token.balanceOf(f.creator.address);
      const result = await finalizeCommunity(f, id, [
        [f.decA, 2],
        [f.decB, 2],
        [f.decC, 1],
      ]);
      expect(result.state).to.equal(State.Rejected);
      expect(result.proposalDecision).to.equal(ProposalDecision.Rejected);
      expect(result.decisionReason).to.equal(DecisionReason.RejectedByDEC);
      expect(await f.token.balanceOf(f.creator.address)).to.equal(creatorBefore + E("10"));
    });

    it("treats equal nonzero proposal votes as rejection and refunds exactly 10 tITL", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      const creatorBefore = await f.token.balanceOf(f.creator.address);
      const result = await finalizeCommunity(f, id, [
        [f.decA, 1],
        [f.decB, 2],
      ]);
      expect(result.state).to.equal(State.Rejected);
      expect(result.decisionReason).to.equal(DecisionReason.TiedDECProposalVote);
      expect(result.refundCompleted).to.equal(true);
      expect(await f.token.balanceOf(f.creator.address)).to.equal(creatorBefore + E("10"));
    });

    it("cancels a zero-vote proposal and automatically refunds exactly 10 tITL", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      const creatorBefore = await f.token.balanceOf(f.creator.address);
      const result = await finalizeCommunity(f, id, []);
      expect(result.state).to.equal(State.Cancelled);
      expect(result.proposalDecision).to.equal(ProposalDecision.Cancelled);
      expect(result.decisionReason).to.equal(DecisionReason.NoDECVotes);
      expect(result.refundCompleted).to.equal(true);
      expect(await f.token.balanceOf(f.creator.address)).to.equal(creatorBefore + E("10"));
    });

    it("keeps the 1 tITL proposal fee in treasury after rejection, tie, and no-vote cancellation", async function () {
      for (const votes of [
        [[0, 2]],
        [
          [0, 1],
          [1, 2],
        ],
        [],
      ]) {
        const f = await loadFixture(deployFixture);
        const { id } = await createCommunity(f);
        const treasuryBeforeFinalization = await f.token.balanceOf(f.treasury.address);
        const members = [f.decA, f.decB];
        await finalizeCommunity(
          f,
          id,
          votes.map(([index, vote]) => [members[index], vote]),
        );
        expect(await f.token.balanceOf(f.treasury.address)).to.equal(treasuryBeforeFinalization);
      }
    });

    it("prevents duplicate proposal finalization and duplicate automatic refunds", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      await finalizeCommunity(f, id, [[f.decA, 2]]);
      const creatorAfter = await f.token.balanceOf(f.creator.address);
      await expect(f.protocol.finalizeProposalVoting(id)).to.be.revertedWithCustomError(f.protocol, "InvalidState");
      expect(await f.token.balanceOf(f.creator.address)).to.equal(creatorAfter);
    });

    it("cannot refund approved community markets or team markets through proposal finalization", async function () {
      const f = await loadFixture(deployFixture);
      const active = await createActiveCommunity(f);
      const team = await createTeam(f);
      expect((await f.protocol.getMarket(active.id)).refundCompleted).to.equal(false);
      expect((await f.protocol.getMarket(team.id)).refundCompleted).to.equal(false);
      await expect(f.protocol.finalizeProposalVoting(active.id)).to.be.revertedWithCustomError(f.protocol, "InvalidState");
      await expect(f.protocol.finalizeProposalVoting(team.id)).to.be.revertedWithCustomError(f.protocol, "InvalidState");
    });

    it("atomically reverts a failed automatic refund and permits a successful retry after token recovery", async function () {
      const f = await loadFixture(deployFailingTokenFixture);
      const params = await validParams();
      await f.token.connect(f.creator).approve(f.protocol.target, E("11"));
      await f.protocol.connect(f.creator).createCommunityMarket(params);
      await f.protocol.connect(f.decA).voteOnProposal(0, 2);
      const pending = await f.protocol.getMarket(0);
      await f.token.setBlockedRecipient(f.creator.address, true);
      await time.increaseTo(Number(pending.proposalVotingDeadline));

      await expect(f.protocol.connect(f.caller).finalizeProposalVoting(0))
        .to.be.revertedWithCustomError(f.token, "BlockedRecipient");
      const rolledBack = await f.protocol.getMarket(0);
      expect(rolledBack.state).to.equal(State.DECProposalVoting);
      expect(rolledBack.proposalFinalized).to.equal(false);
      expect(rolledBack.refundCompleted).to.equal(false);
      expect(await f.protocol.totalProposalSeedLiability()).to.equal(E("10"));

      await f.token.setBlockedRecipient(f.creator.address, false);
      await f.protocol.connect(f.caller).finalizeProposalVoting(0);
      expect((await f.protocol.getMarket(0)).refundCompleted).to.equal(true);
      expect(await f.protocol.totalProposalSeedLiability()).to.equal(0n);
    });
  });

  describe("Seed allocation", function () {
    for (const [outcomes, expected] of [
      [["Yes", "No"], [E("5"), E("5")]],
      [
        ["A", "B", "C"],
        [E("10") / 3n + (E("10") % 3n), E("10") / 3n, E("10") / 3n],
      ],
      [["A", "B", "C", "D"], [E("2.5"), E("2.5"), E("2.5"), E("2.5")]],
    ]) {
      it(`splits the 10 tITL seed deterministically across ${outcomes.length} outcomes`, async function () {
        const f = await loadFixture(deployFixture);
        const { id } = await createActiveCommunity(f, { outcomes });
        const [balances] = await f.protocol.getMarketPricing(id);
        expect(balances).to.deep.equal(expected);
        expect(balances.reduce((sum, value) => sum + value, 0n)).to.equal(E("10"));
      });
    }

    it("keeps creator seed liability separate from proposal, trading, fee, and reward liabilities", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createActiveCommunity(f);
      expect((await f.protocol.getMarket(id)).originalSeed).to.equal(E("10"));
      expect(await f.protocol.totalProposalSeedLiability()).to.equal(0n);
      expect(await f.protocol.totalCreatorSeedLiability()).to.equal(E("10"));
      expect(await f.protocol.totalTradingCollateralLiability()).to.equal(0n);
      expect(await f.protocol.totalCreatorFeeLiability()).to.equal(0n);
      expect(await f.protocol.totalDECRewardLiability()).to.equal(0n);
      await expectExactCoverage(f.token, f.protocol);
    });

    it("prevents creator seed withdrawal before market finalization", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createActiveCommunity(f);
      await expect(f.protocol.connect(f.creator).returnCreatorSeed(id))
        .to.be.revertedWithCustomError(f.protocol, "InvalidState");
      await expect(f.protocol.connect(f.outsider).returnCreatorSeed(id))
        .to.be.revertedWithCustomError(f.protocol, "UnauthorizedCaller");
      expect(await f.protocol.totalCreatorSeedLiability()).to.equal(E("10"));
    });

    it("emits a complete proposal refund audit record", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      await finalizeCommunity(f, id, [[f.decA, 2]]);
      const events = await f.protocol.queryFilter(f.protocol.filters.ProposalRefunded(id));
      expect(events).to.have.length(1);
      expect(events[0].args.recipient).to.equal(f.creator.address);
      expect(events[0].args.amount).to.equal(E("10"));
      expect(events[0].blockNumber).to.be.greaterThan(0);
    });

    it("rejects a team seed below the protocol minimum before any liquidity is recorded", async function () {
      const f = await loadFixture(deployFixture);
      const seed = E("9.999999999999999999");
      await approveExact(f.token, f.admin, f.protocol.target, seed);
      await expect(
        f.protocol.connect(f.admin).createTeamMarket(
          await validParams({ outcomes: ["A", "B", "C", "D"] }),
          seed,
        ),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidInput");
      expect(await f.protocol.totalMarkets()).to.equal(0n);
      expect(await f.protocol.totalCreatorSeedLiability()).to.equal(0n);
    });
  });

  describe("Trading and pricing", function () {
    it("rejects trading before community proposal activation", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      await approveExact(f.token, f.traderA, f.protocol.target, E("1"));
      await expect(
        f.protocol.connect(f.traderA).buyOutcome(id, 0, E("1"), 0),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidState");
    });

    it("allows trading immediately after activation", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createActiveCommunity(f);
      const quote = await buy(f, id, 0, E("5"));
      expect(await f.protocol.userShares(id, f.traderA.address, 0)).to.equal(quote.shares);
      expect((await f.protocol.getMarket(id)).tradingCollateral).to.equal(E("4.975"));
    });

    it("rejects trading after market end without keeper synchronization", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await closeMarket(f, id);
      expect((await f.protocol.getMarket(id)).state).to.equal(State.Active);
      await approveExact(f.token, f.traderA, f.protocol.target, E("1"));
      await expect(
        f.protocol.connect(f.traderA).buyOutcome(id, 0, E("1"), 0),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidState");
    });

    it("rejects zero and below-minimum trades", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f);
      await approveExact(f.token, f.traderA, f.protocol.target, E("1"));
      await expect(f.protocol.connect(f.traderA).buyOutcome(id, 0, 0, 0)).to.be.revertedWithCustomError(f.protocol, "InvalidInput");
      const minimum = await f.protocol.minimumTrade();
      await expect(
        f.protocol.connect(f.traderA).buyOutcome(id, 0, minimum - 1n, 0),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidInput");
    });

    it("rejects an invalid trading outcome", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { outcomes: ["Yes", "No"] });
      await approveExact(f.token, f.traderA, f.protocol.target, E("1"));
      await expect(
        f.protocol.connect(f.traderA).buyOutcome(id, 2, E("1"), 0),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidOutcome");
    });

    it("enforces minimum-shares slippage protection", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f);
      const gross = E("10");
      const quote = await f.protocol.quoteBuy(id, 1, gross);
      await approveExact(f.token, f.traderA, f.protocol.target, gross);
      await expect(
        f.protocol.connect(f.traderA).buyOutcome(id, 1, gross, quote.shares + 1n),
      ).to.be.revertedWithCustomError(f.protocol, "SlippageExceeded");
    });

    for (const outcomeCount of [2, 3, 4]) {
      it(`quotes and executes coherent ${outcomeCount}-outcome pricing`, async function () {
        const f = await loadFixture(deployFixture);
        const outcomes = ["A", "B", "C", "D"].slice(0, outcomeCount);
        const { id } = await createTeam(f, { outcomes });
        const [beforeBalances, , beforePrices] = await f.protocol.getMarketPricing(id);
        const selected = outcomeCount - 1;
        const gross = E("3");
        const quote = await f.protocol.quoteBuy(id, selected, gross);
        const totalBefore = beforeBalances.reduce((sum, value) => sum + value, 0n);
        expect(quote.currentPrice).to.equal(beforeBalances[selected] * E("1") / totalBefore);
        expect(quote.fee).to.equal(gross * 50n / 10_000n);
        expect(quote.shares).to.be.greaterThan(0n);

        await buy(f, id, selected, gross);
        const [, , afterPrices] = await f.protocol.getMarketPricing(id);
        expect(afterPrices[selected]).to.be.greaterThan(beforePrices[selected]);
        for (let index = 0; index < outcomeCount; index += 1) {
          if (index !== selected) {
            expect(afterPrices[index]).to.be.lessThan(beforePrices[index]);
          }
        }
      });
    }

    it("keeps displayed probabilities bounded and coherent within integer-rounding tolerance", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { outcomes: ["A", "B", "C", "D"] });
      await buy(f, id, 0, E("37"));
      await buy(f, id, 2, E("11"), f.traderB);
      const [, , prices] = await f.protocol.getMarketPricing(id);
      for (const price of prices) {
        expect(price).to.be.greaterThan(0n);
        expect(price).to.be.lessThan(E("1"));
      }
      const sum = prices.reduce((total, price) => total + price, 0n);
      expect(sum).to.be.at.most(E("1"));
      expect(E("1") - sum).to.be.lessThan(BigInt(prices.length));
    });

    it("records participation, gross volume, trade count, and unique participant count", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f);
      await buy(f, id, 0, E("5"), f.traderA);
      await buy(f, id, 1, E("7"), f.traderA);
      await buy(f, id, 2, E("9"), f.traderB);
      expect(await f.protocol.hasTradedInMarket(id, f.traderA.address)).to.equal(true);
      expect(await f.protocol.hasTradedInMarket(id, f.traderB.address)).to.equal(true);
      expect(await f.protocol.participantCount(id)).to.equal(2n);
      expect(await f.protocol.tradeCount(id)).to.equal(3n);
      expect((await f.protocol.getMarket(id)).marketVolume).to.equal(E("21"));
    });
  });

  describe("Trading fees and creator claims", function () {
    it("charges a total trade fee of exactly 50 basis points", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f);
      const gross = E("100");
      const quote = await f.protocol.quoteBuy(id, 0, gross);
      expect(quote.fee).to.equal(E("0.5"));
      expect(quote.netAmount).to.equal(E("99.5"));
      expect(quote.fee + quote.netAmount).to.equal(gross);
    });

    it("allocates community fees as 20 bps treasury, 20 bps DEC, and 10 bps creator", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createActiveCommunity(f);
      const treasuryBefore = await f.token.balanceOf(f.treasury.address);
      await buy(f, id, 1, E("100"));
      const market = await f.protocol.getMarket(id);
      expect((await f.token.balanceOf(f.treasury.address)) - treasuryBefore).to.equal(E("0.2"));
      expect(market.decRewardFunds).to.equal(E("0.2"));
      expect(market.creatorFeesEarned).to.equal(E("0.1"));
      expect(await f.protocol.totalCreatorFeeLiability()).to.equal(E("0.1"));
      expect(await f.protocol.totalDECRewardLiability()).to.equal(E("0.2"));
    });

    it("allocates team fees as 30 bps treasury, 20 bps DEC, and zero creator fee", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f);
      const treasuryBefore = await f.token.balanceOf(f.treasury.address);
      await buy(f, id, 1, E("100"));
      const market = await f.protocol.getMarket(id);
      expect((await f.token.balanceOf(f.treasury.address)) - treasuryBefore).to.equal(E("0.3"));
      expect(market.decRewardFunds).to.equal(E("0.2"));
      expect(market.creatorFeesEarned).to.equal(0n);
      expect(await f.protocol.creatorFeesClaimable(id)).to.equal(0n);
    });

    it("rounds fee allocation deterministically without distributing more than the collected fee", async function () {
      const f = await loadFixture(deployFixture);
      const community = await createActiveCommunity(f);
      const team = await createTeam(f);
      const gross = (await f.protocol.minimumTrade()) + 123n;

      const communityTreasuryBefore = await f.token.balanceOf(f.treasury.address);
      const communityQuote = await buy(f, community.id, 0, gross);
      const communityMarket = await f.protocol.getMarket(community.id);
      const communityTreasury =
        (await f.token.balanceOf(f.treasury.address)) - communityTreasuryBefore;
      expect(
        communityTreasury + communityMarket.decRewardFunds + communityMarket.creatorFeesEarned,
      ).to.equal(communityQuote.fee);

      const teamTreasuryBefore = await f.token.balanceOf(f.treasury.address);
      const teamQuote = await buy(f, team.id, 0, gross, f.traderB);
      const teamMarket = await f.protocol.getMarket(team.id);
      const teamTreasury = (await f.token.balanceOf(f.treasury.address)) - teamTreasuryBefore;
      expect(teamTreasury + teamMarket.decRewardFunds).to.equal(teamQuote.fee);
    });

    it("allows only the community creator to claim exactly the earned creator fee once", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createActiveCommunity(f);
      await buy(f, id, 0, E("100"));
      const creatorBefore = await f.token.balanceOf(f.creator.address);
      await expect(f.protocol.connect(f.outsider).claimCreatorFees(id)).to.be.revertedWithCustomError(f.protocol, "UnauthorizedCaller");
      await f.protocol.connect(f.creator).claimCreatorFees(id);
      expect((await f.token.balanceOf(f.creator.address)) - creatorBefore).to.equal(E("0.1"));
      expect(await f.protocol.totalCreatorFeeLiability()).to.equal(0n);
      await expect(f.protocol.connect(f.creator).claimCreatorFees(id)).to.be.revertedWithCustomError(f.protocol, "NothingClaimable");
    });

    it("rejects creator-fee claims from team markets", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f);
      await buy(f, id, 0, E("100"));
      await expect(f.protocol.connect(f.admin).claimCreatorFees(id)).to.be.revertedWithCustomError(f.protocol, "UnauthorizedCaller");
    });
  });

  describe("Adversarial token and validation limitations", function () {
    it("rejects fee-on-transfer collateral atomically instead of recording an underfunded liability", async function () {
      const [admin, treasury, creator] = await ethers.getSigners();
      const token = await ethers.deployContract("MockFeeOnTransferToken");
      const { protocol } = await deployLinkedProtocol(token.target, treasury.address, admin.address);
      await token.mint(creator.address, E("100"));
      await token.connect(creator).approve(protocol.target, E("11"));
      await expect(protocol.connect(creator).createCommunityMarket(await validParams()))
        .to.be.revertedWithCustomError(protocol, "NonExactTransfer");
      expect(await protocol.totalMarkets()).to.equal(0n);
      expect(await protocol.totalProposalSeedLiability()).to.equal(0n);
      expect(await token.balanceOf(protocol.target)).to.equal(0n);
      expect(await token.balanceOf(treasury.address)).to.equal(0n);
    });

    it("accepts Arweave and rejects an http-prefixed malformed URI", async function () {
      const f = await loadFixture(deployFixture);
      await approveExact(f.token, f.creator, f.protocol.target, MAX_UINT256);
      await f.protocol
        .connect(f.creator)
        .createCommunityMarket(await validParams({ thumbnailURI: "ar://valid-reference" }));
      expect((await f.protocol.getMarket(0)).thumbnailURI).to.equal("ar://valid-reference");
      await expect(
        f.protocol
          .connect(f.creator)
          .createCommunityMarket(await validParams({ thumbnailURI: "httpjunk" })),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidURI");
    });
  });

  describe("Resolution eligibility and deadlines", function () {
    it("allows a trader to request resolution after trading closes", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await buy(f, id, 0, E("1"), f.traderA);
      await closeMarket(f, id);
      await f.protocol.connect(f.traderA).requestResolution(id);
      expect((await f.protocol.getMarket(id)).state).to.equal(State.DECResolutionVoting);
      expect((await f.protocol.getMarket(id)).resolutionRequester).to.equal(f.traderA.address);
    });

    it("allows the market creator to request resolution after trading closes", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await closeMarket(f, id);
      await f.protocol.connect(f.admin).requestResolution(id);
      expect((await f.protocol.getMarket(id)).state).to.equal(State.DECResolutionVoting);
    });

    it("allows an active DEC member to request resolution after trading closes", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await closeMarket(f, id);
      await f.protocol.connect(f.decA).requestResolution(id);
      expect((await f.protocol.getMarket(id)).state).to.equal(State.DECResolutionVoting);
    });

    it("rejects resolution requests from an unrelated wallet", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await closeMarket(f, id);
      await expect(f.protocol.connect(f.outsider).requestResolution(id)).to.be.revertedWithCustomError(f.protocol, "UnauthorizedCaller");
    });

    it("rejects a suspended DEC requester unless independently eligible as a trader or creator", async function () {
      const f = await loadFixture(deployFixture);
      const first = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await f.protocol.connect(f.admin).setDECMemberActive(f.decA.address, false);
      await closeMarket(f, first.id);
      await expect(f.protocol.connect(f.decA).requestResolution(first.id)).to.be.revertedWithCustomError(f.protocol, "UnauthorizedCaller");

      await f.protocol.connect(f.admin).setDECMemberActive(f.decA.address, true);
      const second = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await buy(f, second.id, 0, E("1"), f.decA);
      await f.protocol.connect(f.admin).setDECMemberActive(f.decA.address, false);
      await closeMarket(f, second.id);
      await f.protocol.connect(f.decA).requestResolution(second.id);
      expect((await f.protocol.getMarket(second.id)).state).to.equal(State.DECResolutionVoting);

      const teamRole = await f.protocol.TEAM_MARKET_ROLE();
      await f.protocol.connect(f.admin).grantRole(teamRole, f.decB.address);
      const third = await createTeam(
        f,
        { tradingEndTime: (await time.latest()) + 60 },
        E("10"),
        f.decB,
      );
      await f.protocol.connect(f.admin).setDECMemberActive(f.decB.address, false);
      await closeMarket(f, third.id);
      await f.protocol.connect(f.decB).requestResolution(third.id);
      expect((await f.protocol.getMarket(third.id)).state).to.equal(State.DECResolutionVoting);
    });

    it("rejects resolution requests before trading closes", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f);
      await expect(f.protocol.connect(f.admin).requestResolution(id)).to.be.revertedWithCustomError(f.protocol, "InvalidState");
    });

    it("rejects duplicate resolution requests", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await startResolution(f, id, f.admin);
      await expect(f.protocol.connect(f.admin).requestResolution(id)).to.be.revertedWithCustomError(f.protocol, "InvalidState");
    });

    it("prevents rejected and proposal-cancelled markets from entering resolution", async function () {
      const f = await loadFixture(deployFixture);
      const rejected = await createCommunity(f);
      await finalizeCommunity(f, rejected.id, [[f.decA, 2]]);
      await expect(f.protocol.connect(f.creator).requestResolution(rejected.id)).to.be.revertedWithCustomError(f.protocol, "InvalidState");

      const cancelled = await createCommunity(f);
      await finalizeCommunity(f, cancelled.id, []);
      await expect(f.protocol.connect(f.creator).requestResolution(cancelled.id)).to.be.revertedWithCustomError(f.protocol, "InvalidState");
    });

    it("starts resolution voting immediately with a deadline exactly three hours later", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      const market = await startResolution(f, id);
      expect(market.state).to.equal(State.DECResolutionVoting);
      expect(market.resolutionVotingDeadline - market.resolutionRequestedAt).to.equal(
        BigInt(3 * HOUR),
      );
    });

    it("accepts resolution votes before the deadline", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await startResolution(f, id);
      await f.protocol.connect(f.decA).voteOnResolution(id, 1);
      expect(await f.protocol.resolutionVotes(id, f.decA.address)).to.equal(2n);
    });

    it("rejects resolution votes at or after the deadline", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      const voting = await startResolution(f, id);
      await time.increaseTo(Number(voting.resolutionVotingDeadline));
      await expect(f.protocol.connect(f.decA).voteOnResolution(id, 0)).to.be.revertedWithCustomError(f.protocol, "DeadlineExpired");
    });

    it("rejects resolution finalization before the deadline", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await startResolution(f, id);
      await expect(f.protocol.connect(f.outsider).finalizeResolutionVoting(id))
        .to.be.revertedWithCustomError(f.protocol, "DeadlineActive");
    });

    it("allows permissionless resolution finalization with a caller-independent result", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await startResolution(f, id);
      await f.protocol.connect(f.decA).voteOnResolution(id, 1);
      await f.protocol.connect(f.decB).voteOnResolution(id, 1);
      const voting = await f.protocol.getMarket(id);
      await time.increaseTo(Number(voting.resolutionVotingDeadline));
      const snapshot = await networkHelpers.takeSnapshot();

      await f.protocol.connect(f.outsider).finalizeResolutionVoting(id);
      const first = await f.protocol.getMarket(id);
      await snapshot.restore();
      await f.protocol.connect(f.creator).finalizeResolutionVoting(id);
      const second = await f.protocol.getMarket(id);
      expect(second.leadingOutcome).to.equal(first.leadingOutcome);
      expect(second.resolutionFailure).to.equal(first.resolutionFailure);
      expect(second.state).to.equal(State.AdminVerification);
    });
  });

  describe("DEC snapshot and quorum", function () {
    it("snapshots the active DEC count when resolution is requested", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      const voting = await startResolution(f, id);
      expect(voting.resolutionSnapshot).to.equal(3n);
      expect(await f.protocol.activeDECMemberCount()).to.equal(3n);
    });

    it("uses safe upward quorum rounding for an odd DEC snapshot", async function () {
      const f = await loadFixture(deployFixture);
      const first = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await startResolution(f, first.id);
      const oneVote = await finishResolutionVoting(f, first.id, [[f.decA, 0]]);
      expect(oneVote.resolutionSnapshot).to.equal(3n);
      expect(oneVote.resolutionVoterCount).to.equal(1n);
      expect(oneVote.resolutionFailure).to.equal(ResolutionFailure.QuorumNotMet);

      const second = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await startResolution(f, second.id);
      const twoVotes = await finishResolutionVoting(f, second.id, [
        [f.decA, 0],
        [f.decB, 0],
      ]);
      expect(twoVotes.resolutionSnapshot).to.equal(3n);
      expect(twoVotes.resolutionVoterCount).to.equal(2n);
      expect(twoVotes.resolutionFailure).to.equal(ResolutionFailure.None);
    });

    it("freezes the count, quorum, address set, and rejects members added after the snapshot", async function () {
      const f = await loadFixture(deployFixture);
      await f.protocol.connect(f.admin).setDECMemberActive(f.decC.address, false);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      const voting = await startResolution(f, id);
      expect(voting.resolutionSnapshot).to.equal(2n);
      await f.protocol.connect(f.admin).addDECMember(f.decD.address);
      await f.protocol.connect(f.admin).addDECMember(f.decE.address);
      expect(await f.protocol.activeDECMemberCount()).to.equal(4n);
      expect(voting.resolutionQuorum).to.equal(1n);
      expect(await f.protocol.getResolutionSnapshotMembers(id)).to.deep.equal([
        f.decA.address,
        f.decB.address,
      ]);
      expect(await f.protocol.isResolutionVoterEligible(id, f.decD.address)).to.equal(false);
      await expect(f.protocol.connect(f.decD).voteOnResolution(id, 0))
        .to.be.revertedWithCustomError(f.protocol, "InactiveDECMember");
      const finalized = await finishResolutionVoting(f, id, [[f.decA, 0]]);
      expect(finalized.resolutionSnapshot).to.equal(2n);
      expect(finalized.resolutionFailure).to.equal(ResolutionFailure.None);
    });

    it("keeps snapshotted members eligible after suspension or removal and excludes a replacement", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      const voting = await startResolution(f, id);
      expect(voting.resolutionSnapshot).to.equal(3n);
      await f.protocol.connect(f.admin).setDECMemberActive(f.decC.address, false);
      await f.protocol.connect(f.admin).removeDECMember(f.decB.address);
      await f.protocol.connect(f.admin).addDECMember(f.decD.address);
      expect(await f.protocol.getResolutionSnapshotMembers(id)).to.deep.equal([
        f.decA.address,
        f.decB.address,
        f.decC.address,
      ]);
      await f.protocol.connect(f.decC).voteOnResolution(id, 0);
      await f.protocol.connect(f.decB).voteOnResolution(id, 0);
      await expect(f.protocol.connect(f.decD).voteOnResolution(id, 0))
        .to.be.revertedWithCustomError(f.protocol, "InactiveDECMember");
      const finalized = await finishResolutionVoting(f, id, []);
      expect(finalized.resolutionSnapshot).to.equal(3n);
      expect(finalized.resolutionFailure).to.equal(ResolutionFailure.None);
    });

    it("escalates a leading outcome that lacks quorum to admin verification", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await startResolution(f, id);
      const finalized = await finishResolutionVoting(f, id, [[f.decA, 1]]);
      expect(finalized.leadingOutcome).to.equal(1n);
      expect(finalized.resolutionFailure).to.equal(ResolutionFailure.QuorumNotMet);
      expect(finalized.state).to.equal(State.AdminVerification);
    });

    it("records a unique highest outcome after quorum", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await startResolution(f, id);
      const finalized = await finishResolutionVoting(f, id, [
        [f.decA, 2],
        [f.decB, 2],
      ]);
      expect(finalized.leadingOutcome).to.equal(2n);
      expect(finalized.resolutionFailure).to.equal(ResolutionFailure.None);
    });

    it("escalates a tied highest vote to admin verification", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await startResolution(f, id);
      const finalized = await finishResolutionVoting(f, id, [
        [f.decA, 0],
        [f.decB, 1],
      ]);
      expect(finalized.resolutionFailure).to.equal(ResolutionFailure.TiedVote);
      expect(finalized.state).to.equal(State.AdminVerification);
    });

    it("escalates a no-vote resolution to admin verification", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await startResolution(f, id);
      const finalized = await finishResolutionVoting(f, id, []);
      expect(finalized.resolutionFailure).to.equal(ResolutionFailure.NoVotes);
      expect(finalized.state).to.equal(State.AdminVerification);
    });
  });

  describe("Admin verification", function () {
    it("allows an authorized admin to confirm the binding DEC outcome", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await prepareAdminVerification(f);
      await f.protocol
        .connect(f.admin)
        .confirmOutcome(id, 0, "Documented verification", "https://example.com/final");
      const market = await f.protocol.getMarket(id);
      expect(market.state).to.equal(State.OutcomeConfirmed);
      expect(market.winningOutcome).to.equal(0n);
      expect(market.adminConfirmed).to.equal(true);
    });

    it("rejects outcome confirmation by an unauthorized wallet", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await prepareAdminVerification(f);
      await expect(
        f.protocol
          .connect(f.outsider)
          .confirmOutcome(id, 0, "Documented verification", "https://example.com/final"),
      ).to.be.revertedWithCustomError(f.protocol, "AccessControlUnauthorizedAccount");
    });

    it("rejects an invalid confirmed outcome index", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await prepareAdminVerification(f);
      await expect(
        f.protocol
          .connect(f.admin)
          .confirmOutcome(id, 2, "Documented verification", "https://example.com/final"),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidOutcome");
    });

    it("requires both a reason and an evidence reference for admin verification", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await prepareAdminVerification(f);
      await expect(
        f.protocol.connect(f.admin).confirmOutcome(id, 0, "", "https://example.com/final"),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidText");
      await expect(
        f.protocol.connect(f.admin).confirmOutcome(id, 0, "Reason", ""),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidURI");
    });

    it("prevents a valid DEC plurality from being silently changed by admin", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await prepareAdminVerification(f);
      await expect(
        f.protocol
          .connect(f.admin)
          .confirmOutcome(id, 1, "Contrary result", "https://example.com/final"),
      ).to.be.revertedWithCustomError(f.protocol, "BindingDECOutcome");
    });

    it("requires documented admin action to resolve tied and no-quorum results", async function () {
      const f = await loadFixture(deployFixture);
      const tied = await prepareAdminVerification(f, {
        votes: [
          [f.decA, 0],
          [f.decB, 1],
        ],
      });
      await expect(
        f.protocol.connect(f.admin).confirmOutcome(tied.id, 1, "", "https://example.com/final"),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidText");
      await f.protocol
        .connect(f.admin)
        .confirmOutcome(tied.id, 1, "Tie resolved from evidence", "https://example.com/final");

      const noQuorum = await prepareAdminVerification(f, { votes: [[f.decA, 0]] });
      await expect(
        f.protocol.connect(f.admin).confirmOutcome(noQuorum.id, 1, "Reason", ""),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidURI");
      await f.protocol
        .connect(f.admin)
        .confirmOutcome(noQuorum.id, 1, "Quorum failure resolved", "https://example.com/final");
    });

    it("makes the confirmed outcome immutable after confirmation and finalization", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await prepareAdminVerification(f);
      await f.protocol
        .connect(f.admin)
        .confirmOutcome(id, 0, "Documented verification", "https://example.com/final");
      await expect(
        f.protocol
          .connect(f.admin)
          .confirmOutcome(id, 1, "Second attempt", "https://example.com/final"),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidState");
      await f.protocol.finalizeMarket(id);
      expect((await f.protocol.getMarket(id)).winningOutcome).to.equal(0n);
      await expect(
        f.protocol
          .connect(f.admin)
          .confirmOutcome(id, 1, "Third attempt", "https://example.com/final"),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidState");
    });
  });

  describe("DEC reputation and rewards", function () {
    it("lets any caller settle honest and incorrect participation so a voter cannot evade penalties", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await resolveTeamMarket(f, {
        votes: [
          [f.decA, 1],
          [f.decB, 0],
          [f.decC, 0],
        ],
        winner: 0,
      });
      await f.protocol.connect(f.outsider).settleResolutionParticipation(id, f.decA.address);
      await f.protocol.connect(f.caller).settleResolutionParticipation(id, f.decB.address);
      const incorrect = await f.protocol.decMembers(f.decA.address);
      const honest = await f.protocol.decMembers(f.decB.address);
      expect(incorrect.reputation).to.equal(480n);
      expect(incorrect.incorrectResolutionVotes).to.equal(1n);
      expect(honest.reputation).to.equal(510n);
      expect(honest.honestResolutionVotes).to.equal(1n);
    });

    it("prevents resolution-vote correctness from being processed twice", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await resolveTeamMarket(f);
      await f.protocol.settleResolutionParticipation(id, f.decA.address);
      await expect(
        f.protocol.connect(f.outsider).settleResolutionParticipation(id, f.decA.address),
      ).to.be.revertedWithCustomError(f.protocol, "AlreadyProcessed");
    });

    it("vests vote-time eligible rewards atomically during permissionless settlement", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await resolveTeamMarket(f, {
        trades: [{ trader: f.traderA, outcome: 0, amount: E("100") }],
      });
      expect((await f.protocol.getMarket(id)).decRewardPerEligibleVoter).to.equal(E("0.1"));
      await f.protocol.connect(f.outsider).settleResolutionParticipation(id, f.decA.address);
      expect((await f.protocol.decMembers(f.decA.address)).storedRewards).to.equal(E("0.1"));
      expect((await f.protocol.decMembers(f.decA.address)).totalRewardsEarned).to.equal(E("0.1"));
      expect((await f.protocol.getMarket(id)).decRewardFunds).to.equal(E("0.1"));
    });

    it("allows a reward earned before later reputation loss to remain claimable", async function () {
      const f = await loadFixture(deployFixture);
      const initial = await resolveTeamMarket(f, {
        trades: [{ trader: f.traderA, outcome: 0, amount: E("100") }],
      });
      await f.protocol.settleResolutionParticipation(initial.id, f.decA.address);
      for (let index = 0; index < 6; index += 1) {
        const penalty = await resolveTeamMarket(f, {
          votes: [
            [f.decA, 1],
            [f.decB, 0],
            [f.decC, 0],
          ],
          winner: 0,
        });
        await f.protocol.settleResolutionParticipation(penalty.id, f.decA.address);
      }
      expect((await f.protocol.decMembers(f.decA.address)).reputation).to.equal(390n);
      expect(await f.protocol.decRewardsView(f.decA.address)).to.deep.equal([E("0.1"), 0n]);
      const before = await f.token.balanceOf(f.decA.address);
      await f.protocol.connect(f.decA).claimDECRewards();
      expect((await f.token.balanceOf(f.decA.address)) - before).to.equal(E("0.1"));
      expect((await f.protocol.decMembers(f.decA.address)).storedRewards).to.equal(0n);
    });

    it("lets a removed correct voter settle and claim a reward earned while eligible", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, {
        outcomes: ["Yes", "No"],
        tradingEndTime: (await time.latest()) + 60,
      });
      await buy(f, id, 0, E("100"));
      await startResolution(f, id);
      await f.protocol.connect(f.decA).voteOnResolution(id, 0);
      await f.protocol.connect(f.decB).voteOnResolution(id, 0);
      await f.protocol.connect(f.admin).removeDECMember(f.decB.address);
      const voting = await f.protocol.getMarket(id);
      await time.increaseTo(Number(voting.resolutionVotingDeadline));
      await f.protocol.finalizeResolutionVoting(id);
      await f.protocol
        .connect(f.admin)
        .confirmOutcome(id, 0, "Verified", "https://example.com/final");
      await f.protocol.finalizeMarket(id);
      await f.protocol.settleResolutionParticipation(id, f.decB.address);
      expect((await f.protocol.decMembers(f.decB.address)).storedRewards).to.equal(E("0.1"));
      const before = await f.token.balanceOf(f.decB.address);
      await f.protocol.connect(f.decB).claimDECRewards();
      expect((await f.token.balanceOf(f.decB.address)) - before).to.equal(E("0.1"));
    });

    it("does not retroactively allocate a reward to a voter below threshold at vote time", async function () {
      const f = await loadFixture(deployFixture);
      for (let index = 0; index < 6; index += 1) {
        const penalty = await resolveTeamMarket(f, {
          votes: [[f.decA, 1], [f.decB, 0], [f.decC, 0]],
          winner: 0,
        });
        await f.protocol.settleResolutionParticipation(penalty.id, f.decA.address);
      }
      expect((await f.protocol.decMembers(f.decA.address)).reputation).to.equal(380n);
      const old = await resolveTeamMarket(f, {
        trades: [{ trader: f.traderA, outcome: 0, amount: E("100") }],
      });
      expect((await f.protocol.getMarket(old.id)).decRewardPerEligibleVoter).to.equal(E("0.2"));
      await f.protocol.settleResolutionParticipation(old.id, f.decA.address);
      expect((await f.protocol.decMembers(f.decA.address)).storedRewards).to.equal(0n);
      for (let index = 0; index < 2; index += 1) {
        const recovery = await resolveTeamMarket(f);
        await f.protocol.settleResolutionParticipation(recovery.id, f.decA.address);
      }
      expect((await f.protocol.decMembers(f.decA.address)).reputation).to.equal(410n);
      expect((await f.protocol.decMembers(f.decA.address)).storedRewards).to.equal(0n);
    });

    it("routes all DEC funds to treasury when admin confirmation differs and no voter selected the winner", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, {
        outcomes: ["Yes", "No"],
        tradingEndTime: (await time.latest()) + 60,
      });
      await buy(f, id, 0, E("100"));
      await startResolution(f, id);
      const verification = await finishResolutionVoting(f, id, [[f.decA, 0]]);
      expect(verification.resolutionFailure).to.equal(ResolutionFailure.QuorumNotMet);
      expect(verification.leadingOutcome).to.equal(0n);
      const treasuryBefore = await f.token.balanceOf(f.treasury.address);
      await f.protocol
        .connect(f.admin)
        .confirmOutcome(id, 1, "External evidence overrides no-quorum vote", "https://example.com/final");
      await f.protocol.finalizeMarket(id);
      expect((await f.token.balanceOf(f.treasury.address)) - treasuryBefore).to.equal(E("0.2"));
      expect(await f.protocol.totalDECRewardLiability()).to.equal(0n);
      await f.protocol.settleResolutionParticipation(id, f.decA.address);
      expect((await f.protocol.decMembers(f.decA.address)).reputation).to.equal(480n);
    });

    it("allows the confirmed correct voter to earn the DEC allocation on a no-quorum market", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, {
        outcomes: ["Yes", "No"],
        tradingEndTime: (await time.latest()) + 60,
      });
      await buy(f, id, 0, E("100"));
      await startResolution(f, id);
      const verification = await finishResolutionVoting(f, id, [[f.decA, 0]]);
      expect(verification.resolutionFailure).to.equal(ResolutionFailure.QuorumNotMet);
      await f.protocol
        .connect(f.admin)
        .confirmOutcome(id, 0, "Evidence confirms the lone vote", "https://example.com/final");
      await f.protocol.finalizeMarket(id);
      await f.protocol.settleResolutionParticipation(id, f.decA.address);
      expect((await f.protocol.decMembers(f.decA.address)).storedRewards).to.equal(E("0.2"));
    });

    it("routes DEC funds to treasury and creates no DEC reward on active-market cancellation", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f);
      await buy(f, id, 0, E("100"));
      const treasuryBefore = await f.token.balanceOf(f.treasury.address);
      await f.protocol
        .connect(f.admin)
        .cancelActiveMarket(id, "Source unavailable", "https://example.com/cancellation");
      expect((await f.token.balanceOf(f.treasury.address)) - treasuryBefore).to.equal(E("0.2"));
      expect(await f.protocol.totalDECRewardLiability()).to.equal(0n);
      await expect(f.protocol.settleResolutionParticipation(id, f.decA.address))
        .to.be.revertedWithCustomError(f.protocol, "InvalidState");
    });
  });

  describe("Winner and creator claims", function () {
    it("pays the full pari-mutuel collateral pool to the sole winning trader", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await resolveTeamMarket(f, {
        trades: [
          { trader: f.traderA, outcome: 0, amount: E("5") },
          { trader: f.traderB, outcome: 1, amount: E("7") },
        ],
      });
      const collateral = (await f.protocol.getMarket(id)).tradingCollateral;
      const before = await f.token.balanceOf(f.traderA.address);
      await f.protocol.connect(f.traderA).claimPayout(id);
      expect((await f.token.balanceOf(f.traderA.address)) - before).to.equal(collateral);
      const market = await f.protocol.getMarket(id);
      expect(market.payoutRemaining).to.equal(0n);
      expect(market.tradingCollateral).to.equal(0n);
    });

    it("rejects losing and duplicate winning payout claims", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await resolveTeamMarket(f, {
        trades: [
          { trader: f.traderA, outcome: 0, amount: E("5") },
          { trader: f.traderB, outcome: 1, amount: E("7") },
        ],
      });
      await expect(f.protocol.connect(f.traderB).claimPayout(id)).to.be.revertedWithCustomError(f.protocol, "NothingClaimable");
      await f.protocol.connect(f.traderA).claimPayout(id);
      await expect(f.protocol.connect(f.traderA).claimPayout(id)).to.be.revertedWithCustomError(f.protocol, "InvalidState");
    });

    it("refunds net contributions when the confirmed outcome has no purchased shares", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await resolveTeamMarket(f, {
        trades: [
          { trader: f.traderA, outcome: 1, amount: E("5") },
          { trader: f.traderB, outcome: 1, amount: E("7") },
        ],
        winner: 0,
      });
      const aContribution = await f.protocol.userNetContribution(id, f.traderA.address);
      const bContribution = await f.protocol.userNetContribution(id, f.traderB.address);
      const aBefore = await f.token.balanceOf(f.traderA.address);
      const bBefore = await f.token.balanceOf(f.traderB.address);
      await f.protocol.connect(f.traderA).claimPayout(id);
      await f.protocol.connect(f.traderB).claimPayout(id);
      expect((await f.token.balanceOf(f.traderA.address)) - aBefore).to.equal(aContribution);
      expect((await f.token.balanceOf(f.traderB.address)) - bBefore).to.equal(bContribution);
      expect((await f.protocol.getMarket(id)).payoutRemaining).to.equal(0n);
    });

    it("keeps claim-order rounding within one wei and gives the last claimant only the legitimate remainder", async function () {
      const f = await loadFixture(deployFixture);
      const trades = [
        { trader: f.traderA, outcome: 0, amount: E("1") + 123n },
        { trader: f.traderB, outcome: 0, amount: E("3") + 777n },
        { trader: f.traderC, outcome: 1, amount: E("2") + 17n },
      ];
      const first = await resolveTeamMarket(f, { trades });
      const second = await resolveTeamMarket(f, { trades });
      const collateral = (await f.protocol.getMarket(first.id)).tradingCollateral;

      const aBeforeFirst = await f.token.balanceOf(f.traderA.address);
      await f.protocol.connect(f.traderA).claimPayout(first.id);
      const aFirst = (await f.token.balanceOf(f.traderA.address)) - aBeforeFirst;
      const bBeforeFirst = await f.token.balanceOf(f.traderB.address);
      await f.protocol.connect(f.traderB).claimPayout(first.id);
      const bSecond = (await f.token.balanceOf(f.traderB.address)) - bBeforeFirst;

      const bBeforeSecond = await f.token.balanceOf(f.traderB.address);
      await f.protocol.connect(f.traderB).claimPayout(second.id);
      const bFirst = (await f.token.balanceOf(f.traderB.address)) - bBeforeSecond;
      const aBeforeSecond = await f.token.balanceOf(f.traderA.address);
      await f.protocol.connect(f.traderA).claimPayout(second.id);
      const aSecond = (await f.token.balanceOf(f.traderA.address)) - aBeforeSecond;

      const aDifference = aFirst > aSecond ? aFirst - aSecond : aSecond - aFirst;
      const bDifference = bFirst > bSecond ? bFirst - bSecond : bSecond - bFirst;
      expect(aDifference).to.be.at.most(1n);
      expect(bDifference).to.be.at.most(1n);
      expect(aFirst + bSecond).to.equal(collateral);
      expect(aSecond + bFirst).to.equal(collateral);
      expect((await f.protocol.getMarket(first.id)).payoutRemaining).to.equal(0n);
      expect((await f.protocol.getMarket(second.id)).payoutRemaining).to.equal(0n);
    });

    it("returns creator seed only through the creator while always paying the creator", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await resolveTeamMarket(f);
      const creatorBefore = await f.token.balanceOf(f.admin.address);
      const callerBefore = await f.token.balanceOf(f.outsider.address);
      await expect(f.protocol.connect(f.outsider).returnCreatorSeed(id))
        .to.be.revertedWithCustomError(f.protocol, "UnauthorizedCaller");
      await f.protocol.connect(f.admin).returnCreatorSeed(id);
      expect((await f.token.balanceOf(f.admin.address)) - creatorBefore).to.equal(E("10"));
      expect(await f.token.balanceOf(f.outsider.address)).to.equal(callerBefore);
      expect((await f.protocol.getMarket(id)).seedReturned).to.equal(true);
      await expect(f.protocol.connect(f.admin).returnCreatorSeed(id))
        .to.be.revertedWithCustomError(f.protocol, "InvalidState");
    });

    it("remains exactly solvent after winner, DEC reward, and creator-seed claims", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await resolveTeamMarket(f, {
        trades: [
          { trader: f.traderA, outcome: 0, amount: E("100") },
          { trader: f.traderB, outcome: 1, amount: E("40") },
        ],
      });
      await expectExactCoverage(f.token, f.protocol);
      await f.protocol.settleResolutionParticipation(id, f.decA.address);
      await f.protocol.settleResolutionParticipation(id, f.decB.address);
      await f.protocol.connect(f.decA).claimDECRewards();
      await f.protocol.connect(f.decB).claimDECRewards();
      await f.protocol.connect(f.traderA).claimPayout(id);
      await f.protocol.connect(f.admin).returnCreatorSeed(id);
      expect(await aggregateLiabilities(f.protocol)).to.equal(0n);
      expect(await f.token.balanceOf(f.protocol.target)).to.equal(0n);
    });
  });

  describe("Active-market cancellation", function () {
    it("allows authorized cancellation and rejects unauthorized cancellation", async function () {
      const f = await loadFixture(deployFixture);
      const unauthorized = await createTeam(f);
      await expect(
        f.protocol
          .connect(f.outsider)
          .cancelActiveMarket(unauthorized.id, "Reason", "https://example.com/cancel"),
      ).to.be.revertedWithCustomError(f.protocol, "AccessControlUnauthorizedAccount");

      await f.protocol
        .connect(f.admin)
        .cancelActiveMarket(unauthorized.id, "Reason", "https://example.com/cancel");
      const market = await f.protocol.getMarket(unauthorized.id);
      expect(market.state).to.equal(State.Cancelled);
      expect(market.activeMarketCancelled).to.equal(true);
    });

    it("refunds net trader collateral, preserves creator fees, routes DEC funds, returns seed, and stays solvent", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createActiveCommunity(f);
      await buy(f, id, 0, E("100"), f.traderA);
      await buy(f, id, 1, E("25"), f.traderB);
      const aContribution = await f.protocol.userNetContribution(id, f.traderA.address);
      const bContribution = await f.protocol.userNetContribution(id, f.traderB.address);
      const treasuryBeforeCancellation = await f.token.balanceOf(f.treasury.address);

      await f.protocol
        .connect(f.admin)
        .cancelActiveMarket(id, "Evidence became unavailable", "https://example.com/cancel");
      let market = await f.protocol.getMarket(id);
      expect(market.state).to.equal(State.Cancelled);
      expect(market.tradingCollateral).to.equal(aContribution + bContribution);
      expect(market.creatorFeesEarned).to.equal(E("0.125"));
      expect(market.decRewardFunds).to.equal(0n);
      expect((await f.token.balanceOf(f.treasury.address)) - treasuryBeforeCancellation).to.equal(
        E("0.25"),
      );
      expect(await f.protocol.totalDECRewardLiability()).to.equal(0n);
      await expectExactCoverage(f.token, f.protocol);

      const aBefore = await f.token.balanceOf(f.traderA.address);
      const bBefore = await f.token.balanceOf(f.traderB.address);
      await f.protocol.connect(f.traderA).claimCancellationRefund(id);
      await f.protocol.connect(f.traderB).claimCancellationRefund(id);
      expect((await f.token.balanceOf(f.traderA.address)) - aBefore).to.equal(aContribution);
      expect((await f.token.balanceOf(f.traderB.address)) - bBefore).to.equal(bContribution);
      await expect(
        f.protocol.connect(f.traderA).claimCancellationRefund(id),
      ).to.be.revertedWithCustomError(f.protocol, "NothingRefundable");

      const creatorBefore = await f.token.balanceOf(f.creator.address);
      await f.protocol.connect(f.creator).claimCreatorFees(id);
      await f.protocol.connect(f.creator).returnCreatorSeed(id);
      expect((await f.token.balanceOf(f.creator.address)) - creatorBefore).to.equal(E("10.125"));
      market = await f.protocol.getMarket(id);
      expect(market.seedReturned).to.equal(true);
      expect(market.creatorFeesClaimed).to.equal(E("0.125"));
      expect(market.tradingCollateral).to.equal(0n);
      expect(await aggregateLiabilities(f.protocol)).to.equal(0n);
      expect(await f.token.balanceOf(f.protocol.target)).to.equal(0n);
    });
  });

  describe("Liability and lifecycle invariants", function () {
    it("maintains exact asset coverage through proposal, trading, resolution, and every claim", async function () {
      const f = await loadFixture(deployFixture);
      const created = await createCommunity(f, { outcomes: ["A", "B", "C", "D"] });
      await expectExactCoverage(f.token, f.protocol);
      await finalizeCommunity(f, created.id);
      await expectExactCoverage(f.token, f.protocol);

      for (const trade of [
        { trader: f.traderA, outcome: 0, amount: E("13") + 7n },
        { trader: f.traderB, outcome: 1, amount: E("17") + 11n },
        { trader: f.traderC, outcome: 2, amount: E("19") + 13n },
        { trader: f.traderA, outcome: 0, amount: E("23") + 17n },
      ]) {
        await buy(f, created.id, trade.outcome, trade.amount, trade.trader);
        await expectExactCoverage(f.token, f.protocol);
      }

      await startResolution(f, created.id, f.traderA);
      await expectExactCoverage(f.token, f.protocol);
      await finishResolutionVoting(f, created.id, [
        [f.decA, 0],
        [f.decB, 0],
      ]);
      await expectExactCoverage(f.token, f.protocol);
      await f.protocol
        .connect(f.admin)
        .confirmOutcome(created.id, 0, "Verified", "https://example.com/final");
      await f.protocol.finalizeMarket(created.id);
      await expectExactCoverage(f.token, f.protocol);

      await f.protocol.connect(f.creator).claimCreatorFees(created.id);
      await expectExactCoverage(f.token, f.protocol);
      await f.protocol.settleResolutionParticipation(created.id, f.decA.address);
      await f.protocol.settleResolutionParticipation(created.id, f.decB.address);
      await f.protocol.connect(f.decA).claimDECRewards();
      await expectExactCoverage(f.token, f.protocol);
      await f.protocol.connect(f.decB).claimDECRewards();
      await expectExactCoverage(f.token, f.protocol);
      await f.protocol.connect(f.traderA).claimPayout(created.id);
      await expectExactCoverage(f.token, f.protocol);
      await f.protocol.connect(f.creator).returnCreatorSeed(created.id);
      await expectExactCoverage(f.token, f.protocol);
      expect(await f.token.balanceOf(f.protocol.target)).to.equal(0n);
    });

    it("covers proposal-refund liabilities before and after deterministic refund execution", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createCommunity(f);
      expect(await f.protocol.totalProposalSeedLiability()).to.equal(E("10"));
      await expectExactCoverage(f.token, f.protocol);
      await finalizeCommunity(f, id, [[f.decA, 2]]);
      expect(await f.protocol.totalProposalSeedLiability()).to.equal(0n);
      expect(await f.token.balanceOf(f.protocol.target)).to.equal(0n);
      await expectExactCoverage(f.token, f.protocol);
    });

    it("does not let treasury administration consume outstanding user liabilities", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f);
      await buy(f, id, 0, E("100"));
      const balanceBefore = await f.token.balanceOf(f.protocol.target);
      const liabilitiesBefore = await aggregateLiabilities(f.protocol);
      await f.protocol.connect(f.admin).updateTreasury(f.alternateTreasury.address);
      expect(await f.protocol.treasury()).to.equal(f.alternateTreasury.address);
      expect(await f.token.balanceOf(f.protocol.target)).to.equal(balanceBefore);
      expect(await aggregateLiabilities(f.protocol)).to.equal(liabilitiesBefore);
      await expectExactCoverage(f.token, f.protocol);
    });

    it("keeps total fee allocation at or below collected fees across deterministic property cases", async function () {
      const f = await loadFixture(deployFixture);
      const community = await createActiveCommunity(f);
      const team = await createTeam(f);
      const amounts = [
        await f.protocol.minimumTrade(),
        (await f.protocol.minimumTrade()) + 1n,
        E("0.1") + 19n,
        E("1") + 23n,
        E("17") + 29n,
        E("101") + 31n,
      ];

      for (let index = 0; index < amounts.length; index += 1) {
        const gross = amounts[index];
        const communityBefore = await f.protocol.getMarket(community.id);
        const communityTreasuryBefore = await f.token.balanceOf(f.treasury.address);
        const communityQuote = await buy(
          f,
          community.id,
          index % 3,
          gross,
          index % 2 === 0 ? f.traderA : f.traderB,
        );
        const communityAfter = await f.protocol.getMarket(community.id);
        const allocatedCommunity =
          (await f.token.balanceOf(f.treasury.address)) -
          communityTreasuryBefore +
          (communityAfter.decRewardFunds - communityBefore.decRewardFunds) +
          (communityAfter.creatorFeesEarned - communityBefore.creatorFeesEarned);
        expect(allocatedCommunity).to.equal(communityQuote.fee);
        await expectExactCoverage(f.token, f.protocol);

        const teamBefore = await f.protocol.getMarket(team.id);
        const teamTreasuryBefore = await f.token.balanceOf(f.treasury.address);
        const teamQuote = await buy(
          f,
          team.id,
          index % 3,
          gross,
          index % 2 === 0 ? f.traderB : f.traderC,
        );
        const teamAfter = await f.protocol.getMarket(team.id);
        const allocatedTeam =
          (await f.token.balanceOf(f.treasury.address)) -
          teamTreasuryBefore +
          (teamAfter.decRewardFunds - teamBefore.decRewardFunds);
        expect(allocatedTeam).to.equal(teamQuote.fee);
        await expectExactCoverage(f.token, f.protocol);
      }
    });

    it("prevents final outcomes and resolved lifecycle state from moving backward", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await resolveTeamMarket(f, {
        trades: [{ trader: f.traderA, outcome: 0, amount: E("1") }],
      });
      const resolved = await f.protocol.getMarket(id);
      expect(resolved.state).to.equal(State.Resolved);
      expect(resolved.winningOutcome).to.equal(0n);
      await approveExact(f.token, f.traderB, f.protocol.target, E("1"));
      await expect(
        f.protocol.connect(f.traderB).buyOutcome(id, 1, E("1"), 0),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidState");
      await expect(f.protocol.connect(f.admin).requestResolution(id)).to.be.revertedWithCustomError(f.protocol, "InvalidState");
      await expect(f.protocol.connect(f.decA).voteOnResolution(id, 1)).to.be.revertedWithCustomError(f.protocol, "InvalidState");
      await expect(f.protocol.finalizeMarket(id)).to.be.revertedWithCustomError(f.protocol, "InvalidState");
      await expect(
        f.protocol
          .connect(f.admin)
          .cancelActiveMarket(id, "Late cancellation", "https://example.com/cancel"),
      ).to.be.revertedWithCustomError(f.protocol, "InvalidState");
      const unchanged = await f.protocol.getMarket(id);
      expect(unchanged.state).to.equal(State.Resolved);
      expect(unchanged.winningOutcome).to.equal(0n);
    });
  });

  describe("Additional role and resolution-vote validation", function () {
    it("rejects team-market creation when the authorized team account has insufficient allowance", async function () {
      const f = await loadFixture(deployFixture);
      const params = await validParams();
      await approveExact(f.token, f.admin, f.protocol.target, E("9.999999999999999999"));
      await expect(
        f.protocol.connect(f.admin).createTeamMarket(params, E("10")),
      ).to.be.revertedWithCustomError(f.token, "ERC20InsufficientAllowance");
    });

    it("rejects an outsider but preserves the eligibility of a DEC member suspended after the snapshot", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await startResolution(f, id);
      await expect(f.protocol.connect(f.outsider).voteOnResolution(id, 0)).to.be.revertedWithCustomError(f.protocol, "InactiveDECMember");
      await f.protocol.connect(f.admin).setDECMemberActive(f.decA.address, false);
      await expect(f.protocol.connect(f.decA).voteOnResolution(id, 0))
        .to.emit(f.protocol, "ResolutionVoteCast")
        .withArgs(id, f.decA.address, 0);
    });

    it("rejects duplicate resolution votes before the deadline", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, { tradingEndTime: (await time.latest()) + 60 });
      await startResolution(f, id);
      await f.protocol.connect(f.decA).voteOnResolution(id, 0);
      await expect(f.protocol.connect(f.decA).voteOnResolution(id, 1)).to.be.revertedWithCustomError(f.protocol, "InvalidVote");
    });

    it("rejects an invalid resolution outcome before the deadline", async function () {
      const f = await loadFixture(deployFixture);
      const { id } = await createTeam(f, {
        outcomes: ["Yes", "No"],
        tradingEndTime: (await time.latest()) + 60,
      });
      await startResolution(f, id);
      await expect(f.protocol.connect(f.decA).voteOnResolution(id, 2)).to.be.revertedWithCustomError(f.protocol, "InvalidOutcome");
    });
  });
});
