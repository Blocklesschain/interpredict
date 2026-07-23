// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title InterPredict V2
/// @notice ERC-20 collateralized, DEC-governed, multi-outcome prediction markets.
contract InterPredict is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant TEAM_MARKET_ROLE = keccak256("TEAM_MARKET_ROLE");
    bytes32 public constant DEC_MANAGER_ROLE = keccak256("DEC_MANAGER_ROLE");
    uint256 internal constant BPS = 10_000;
    uint256 internal constant PROPOSAL_VOTING_DURATION = 24 hours;
    uint256 internal constant RESOLUTION_VOTING_DURATION = 3 hours;
    uint256 internal constant ADMIN_VERIFICATION_DURATION = 24 hours;
    uint256 internal constant ABANDONED_RESOLUTION_GRACE = 1 hours;
    uint256 internal constant TRADE_FEE_BPS = 50;
    uint256 internal constant COMMUNITY_TREASURY_BPS = 20;
    uint256 internal constant COMMUNITY_DEC_BPS = 20;
    uint256 internal constant COMMUNITY_CREATOR_BPS = 10;
    uint256 internal constant TEAM_TREASURY_BPS = 30;
    uint256 internal constant TEAM_DEC_BPS = 20;
    uint256 internal constant MIN_REPUTATION = 0;
    uint256 internal constant MAX_REPUTATION = 1_000;
    uint256 internal constant INITIAL_REPUTATION = 500;
    uint256 public constant REWARD_THRESHOLD = 400;
    uint256 internal constant HONEST_REPUTATION_GAIN = 10;
    uint256 internal constant INCORRECT_REPUTATION_LOSS = 20;
    uint256 public constant RESOLUTION_QUORUM_BPS = 5_000;
    uint256 internal constant MAX_QUESTION_BYTES = 280;
    uint256 internal constant MAX_DESCRIPTION_BYTES = 2_000;
    uint256 internal constant MAX_CRITERIA_BYTES = 2_000;
    uint256 internal constant MAX_URI_BYTES = 512;
    uint256 internal constant MAX_LABEL_BYTES = 64;

    error ZeroAddress();
    error UnsupportedTokenDecimals();
    error InvalidInput();
    error InvalidState();
    error DeadlineActive();
    error DeadlineExpired();
    error UnauthorizedCaller();
    error InactiveDECMember();
    error InvalidVote();
    error InvalidOutcome();
    error InsufficientLiquidity();
    error SlippageExceeded();
    error NothingClaimable();
    error NothingRefundable();
    error AlreadyProcessed();
    error NonExactTransfer();
    error InvalidURI();
    error InvalidText();
    error DuplicateOutcome();
    error BindingDECOutcome();
    error MarketPaused();
    error MarketNotPaused();
    error VerificationWindowActive();

    enum MarketOrigin { Community, Team }
    enum MarketCategory {
        Sports, Politics, Crypto, Blockchain, Technology, ArtificialIntelligence,
        Economics, Finance, Business, Science, Climate, Entertainment, Culture,
        Health, RealEstate, Gaming, Web3, Other
    }
    enum MarketState {
        Proposed, DECProposalVoting, Rejected, Cancelled, Approved, Active,
        TradingClosed, Unresolved, ResolutionRequested, DECResolutionVoting,
        AdminVerification, OutcomeConfirmed, Finalized, Resolved
    }
    enum ProposalVote { None, Approve, Reject }
    enum ProposalDecision { None, Approved, Rejected, Cancelled }
    enum DecisionReason { None, ApprovedByDEC, RejectedByDEC, TiedDECProposalVote, NoDECVotes, TradingEndPassed }
    enum ResolutionFailure { None, NoVotes, QuorumNotMet, TiedVote }

    struct CreateMarketParams {
        string question;
        string description;
        MarketCategory category;
        string customCategory;
        string thumbnailURI;
        string[] outcomes;
        uint64 tradingEndTime;
        string resolutionCriteria;
        string primaryEvidenceURI;
        string backupEvidenceURI;
    }

    struct Market {
        uint256 id;
        address creator;
        MarketOrigin origin;
        MarketCategory category;
        MarketState state;
        string question;
        string description;
        string customCategory;
        string thumbnailURI;
        string resolutionCriteria;
        string primaryEvidenceURI;
        string backupEvidenceURI;
        uint64 tradingEndTime;
        uint64 proposalVotingStartedAt;
        uint64 proposalVotingDeadline;
        uint64 proposalFinalizedAt;
        uint64 activatedAt;
        uint64 resolutionRequestedAt;
        uint64 resolutionVotingDeadline;
        uint64 resolutionFinalizedAt;
        uint64 outcomeConfirmedAt;
        uint64 finalizedAt;
        uint32 approvalVotes;
        uint32 rejectionVotes;
        uint32 resolutionSnapshot;
        uint32 resolutionVoterCount;
        uint8 leadingOutcome;
        uint8 winningOutcome;
        ProposalDecision proposalDecision;
        DecisionReason decisionReason;
        ResolutionFailure resolutionFailure;
        bool proposalFinalized;
        bool refundCompleted;
        bool resolutionVoteFinalized;
        bool adminConfirmed;
        bool seedReturned;
        bool activeMarketCancelled;
        uint256 originalSeed;
        uint256 tradingCollateral;
        uint256 marketVolume;
        uint256 creatorFeesEarned;
        uint256 creatorFeesClaimed;
        uint256 decRewardFunds;
        uint256 decRewardPerEligibleVoter;
        uint256 payoutRemaining;
        uint256 winningSharesRemaining;
        string adminVerificationReason;
        string adminEvidenceURI;
        string cancellationReason;
        string cancellationEvidenceURI;
        uint64 resolutionMembershipEpoch;
        uint64 adminVerificationDeadline;
        uint32 resolutionQuorum;
        address resolutionRequester;
    }

    struct DECMember {
        bool exists;
        bool active;
        bool removed;
        uint64 joinedAt;
        uint256 proposalVotes;
        uint256 resolutionVotes;
        uint256 honestResolutionVotes;
        uint256 incorrectResolutionVotes;
        uint256 reputation;
        uint256 totalRewardsEarned;
        uint256 totalRewardsClaimed;
        uint256 storedRewards;
    }

    struct MembershipCheckpoint {
        uint64 epoch;
        bool active;
    }

    IERC20 public immutable settlementToken;
    address public treasury;
    uint8 public immutable tokenDecimals;
    uint256 public immutable proposalFee;
    uint256 public immutable proposalSeed;
    uint256 public immutable minimumTrade;
    uint256 public totalMarkets;
    uint256 public activeDECMemberCount;
    uint256 public totalProposalSeedLiability;
    uint256 public totalCreatorSeedLiability;
    uint256 public totalTradingCollateralLiability;
    uint256 public totalCreatorFeeLiability;
    uint256 public totalDECRewardLiability;

    mapping(uint256 => Market) private _markets;
    mapping(uint256 => string[]) private _outcomes;
    mapping(uint256 => uint256[]) private _virtualBalances;
    mapping(uint256 => uint256[]) private _totalShares;
    mapping(uint256 => mapping(address => mapping(uint8 => uint256))) public userShares;
    mapping(uint256 => mapping(address => ProposalVote)) public proposalVotes;
    mapping(uint256 => mapping(address => uint8)) public resolutionVotes; // index + 1; zero = no vote
    mapping(uint256 => mapping(uint8 => uint32)) public resolutionVoteCounts;
    mapping(uint256 => mapping(address => bool)) public hasClaimedPayout;
    mapping(uint256 => mapping(address => bool)) public resolutionReputationSettled;
    mapping(uint256 => mapping(address => bool)) public hasTradedInMarket;
    mapping(uint256 => mapping(address => uint256)) public userNetContribution;
    mapping(uint256 => uint256) public participantCount;
    mapping(uint256 => uint256) public tradeCount;
    mapping(address => DECMember) public decMembers;
    address[] private _decMemberList;
    mapping(address => uint256[]) private _creatorMarkets;
    uint64 private _membershipEpoch;
    mapping(address => MembershipCheckpoint[]) private _decMembershipHistory;
    mapping(uint256 => mapping(address => bool)) private _resolutionRewardEligible;
    mapping(uint256 => mapping(uint8 => uint32)) private _resolutionRewardEligibleVoteCounts;
    mapping(uint256 => bool) public marketPaused;

    event CommunityMarketProposed(uint256 indexed marketId, address indexed creator, uint64 deadline, uint256 fee, uint256 seed);
    event TeamMarketCreated(uint256 indexed marketId, address indexed creator, uint256 seed);
    event MarketMetadata(uint256 indexed marketId, MarketCategory category, string customCategory, string thumbnailURI, string[] outcomes);
    event ProposalVoteCast(uint256 indexed marketId, address indexed member, ProposalVote vote);
    event ProposalApproved(uint256 indexed marketId, uint256 seed);
    event ProposalRejected(uint256 indexed marketId, DecisionReason reason);
    event ProposalCancelled(uint256 indexed marketId, DecisionReason reason);
    event ProposalRefunded(uint256 indexed marketId, address indexed recipient, uint256 amount);
    event MarketActivated(uint256 indexed marketId, MarketOrigin origin, uint64 activatedAt);
    event TradingClosed(uint256 indexed marketId);
    event OutcomePurchased(uint256 indexed marketId, address indexed trader, uint8 indexed outcomeIndex, uint256 grossAmount, uint256 fee, uint256 shares);
    event CreatorFeesClaimed(uint256 indexed marketId, address indexed creator, uint256 amount);
    event ResolutionRequested(uint256 indexed marketId, address indexed requester, uint32 decSnapshot, uint64 deadline);
    event ResolutionSnapshotCreated(uint256 indexed marketId, uint64 indexed membershipEpoch, uint32 memberCount, uint32 quorum, uint64 deadline);
    event ResolutionVoteCast(uint256 indexed marketId, address indexed member, uint8 outcomeIndex);
    event ResolutionVotingFinalized(uint256 indexed marketId, uint8 leadingOutcome, ResolutionFailure failure);
    event ResolutionParticipationSettled(uint256 indexed marketId, address indexed member, bool honest, uint256 reputation, uint256 reward);
    event OutcomeConfirmed(uint256 indexed marketId, uint8 winningOutcome, address indexed admin);
    event AdminVerificationTimedOut(uint256 indexed marketId, bool cancelled, uint8 winningOutcome);
    event ActiveMarketCancelled(uint256 indexed marketId, address indexed admin, string reason, string evidenceURI);
    event CancellationRefundClaimed(uint256 indexed marketId, address indexed trader, uint256 amount);
    event MarketFinalized(uint256 indexed marketId, uint8 winningOutcome, uint256 collateral);
    event PayoutClaimed(uint256 indexed marketId, address indexed account, uint256 amount);
    event CreatorSeedReturned(uint256 indexed marketId, address indexed creator, uint256 amount);
    event DECMemberStatusChanged(address indexed member, bool active);
    event DECReputationUpdated(address indexed member, uint256 reputation, bool honest);
    event DECRewardsClaimed(address indexed member, uint256 amount);
    event MarketPauseChanged(uint256 indexed marketId, bool paused, address indexed admin);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    constructor(address token_, address treasury_, address admin_) {
        if (
            token_ == address(0) || treasury_ == address(0) || admin_ == address(0)
                || token_ == address(this) || treasury_ == address(this) || admin_ == address(this)
        ) revert ZeroAddress();
        settlementToken = IERC20(token_);
        treasury = treasury_;
        tokenDecimals = IERC20Metadata(token_).decimals();
        if (tokenDecimals > 24) revert UnsupportedTokenDecimals();
        uint256 unit = 10 ** tokenDecimals;
        proposalFee = unit;
        proposalSeed = 10 * unit;
        minimumTrade = unit / 100 == 0 ? 1 : unit / 100;
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(TEAM_MARKET_ROLE, admin_);
        _grantRole(DEC_MANAGER_ROLE, admin_);
    }

    function createCommunityMarket(CreateMarketParams calldata p) external nonReentrant whenNotPaused returns (uint256 id) {
        _validateParams(p, block.timestamp + PROPOSAL_VOTING_DURATION);
        uint256 total = proposalFee + proposalSeed;
        _pullExact(msg.sender, total);
        _pushExact(treasury, proposalFee);
        id = _create(p, MarketOrigin.Community, msg.sender, proposalSeed);
        Market storage m = _markets[id];
        m.state = MarketState.DECProposalVoting;
        m.proposalVotingStartedAt = uint64(block.timestamp);
        m.proposalVotingDeadline = uint64(block.timestamp + PROPOSAL_VOTING_DURATION);
        totalProposalSeedLiability += proposalSeed;
        emit CommunityMarketProposed(id, msg.sender, m.proposalVotingDeadline, proposalFee, proposalSeed);
    }

    /// @notice Team creator supplies seed during creation; no unbacked activation is possible.
    function createTeamMarket(CreateMarketParams calldata p, uint256 seedAmount)
        external nonReentrant whenNotPaused onlyRole(TEAM_MARKET_ROLE) returns (uint256 id)
    {
        _validateParams(p, block.timestamp);
        if (seedAmount < proposalSeed) revert InvalidInput();
        _pullExact(msg.sender, seedAmount);
        id = _create(p, MarketOrigin.Team, msg.sender, seedAmount);
        Market storage m = _markets[id];
        m.proposalDecision = ProposalDecision.Approved;
        m.decisionReason = DecisionReason.ApprovedByDEC;
        _activate(m);
        emit TeamMarketCreated(id, msg.sender, seedAmount);
    }

    function _create(CreateMarketParams calldata p, MarketOrigin origin, address creator, uint256 seed)
        internal returns (uint256 id)
    {
        id = totalMarkets++;
        Market storage m = _markets[id];
        m.id = id; m.creator = creator; m.origin = origin; m.category = p.category;
        m.state = MarketState.Proposed; m.question = p.question; m.description = p.description;
        m.customCategory = p.customCategory; m.thumbnailURI = p.thumbnailURI;
        m.resolutionCriteria = p.resolutionCriteria; m.primaryEvidenceURI = p.primaryEvidenceURI;
        m.backupEvidenceURI = p.backupEvidenceURI; m.tradingEndTime = p.tradingEndTime;
        m.originalSeed = seed;
        for (uint256 i; i < p.outcomes.length; ++i) _outcomes[id].push(p.outcomes[i]);
        _creatorMarkets[creator].push(id);
        emit MarketMetadata(id, p.category, p.customCategory, p.thumbnailURI, p.outcomes);
    }

    function voteOnProposal(uint256 id, ProposalVote vote) external {
        Market storage m = _market(id);
        if (!_isActiveDEC(msg.sender)) revert InactiveDECMember();
        if (m.origin != MarketOrigin.Community || m.state != MarketState.DECProposalVoting) revert InvalidState();
        if (block.timestamp >= m.proposalVotingDeadline) revert DeadlineExpired();
        if (vote == ProposalVote.None || proposalVotes[id][msg.sender] != ProposalVote.None) revert InvalidVote();
        proposalVotes[id][msg.sender] = vote;
        if (vote == ProposalVote.Approve) ++m.approvalVotes; else ++m.rejectionVotes;
        ++decMembers[msg.sender].proposalVotes;
        emit ProposalVoteCast(id, msg.sender, vote);
    }

    function finalizeProposalVoting(uint256 id) external nonReentrant {
        Market storage m = _market(id);
        if (m.origin != MarketOrigin.Community || m.state != MarketState.DECProposalVoting) revert InvalidState();
        if (block.timestamp < m.proposalVotingDeadline) revert DeadlineActive();
        if (m.proposalFinalized) revert AlreadyProcessed();
        m.proposalFinalized = true; m.proposalFinalizedAt = uint64(block.timestamp);
        if (m.approvalVotes > m.rejectionVotes && block.timestamp < m.tradingEndTime) {
            m.proposalDecision = ProposalDecision.Approved; m.decisionReason = DecisionReason.ApprovedByDEC;
            totalProposalSeedLiability -= m.originalSeed;
            _activate(m);
            emit ProposalApproved(id, m.originalSeed);
        } else {
            DecisionReason reason;
            if (m.approvalVotes + m.rejectionVotes == 0) {
                m.state = MarketState.Cancelled; m.proposalDecision = ProposalDecision.Cancelled; reason = DecisionReason.NoDECVotes;
                emit ProposalCancelled(id, reason);
            } else {
                m.state = MarketState.Rejected; m.proposalDecision = ProposalDecision.Rejected;
                reason = block.timestamp >= m.tradingEndTime ? DecisionReason.TradingEndPassed :
                    (m.approvalVotes == m.rejectionVotes ? DecisionReason.TiedDECProposalVote : DecisionReason.RejectedByDEC);
                emit ProposalRejected(id, reason);
            }
            m.decisionReason = reason; m.refundCompleted = true;
            totalProposalSeedLiability -= m.originalSeed;
            _pushExact(m.creator, m.originalSeed);
            emit ProposalRefunded(id, m.creator, m.originalSeed);
        }
    }

    function _activate(Market storage m) internal {
        m.state = MarketState.Active; m.activatedAt = uint64(block.timestamp);
        totalCreatorSeedLiability += m.originalSeed;
        uint256 count = _outcomes[m.id].length;
        uint256 base = m.originalSeed / count;
        for (uint256 i; i < count; ++i) _virtualBalances[m.id].push(base + (i == 0 ? m.originalSeed % count : 0));
        for (uint256 i; i < count; ++i) _totalShares[m.id].push(0);
        emit MarketActivated(m.id, m.origin, m.activatedAt);
    }

    function quoteBuy(uint256 id, uint8 outcomeIndex, uint256 grossAmount)
        public view returns (uint256 fee, uint256 netAmount, uint256 shares, uint256 currentPrice, uint256 postTradePrice)
    {
        _market(id);
        if (outcomeIndex >= _outcomes[id].length) revert InvalidOutcome();
        if (grossAmount < minimumTrade) revert InvalidInput();
        uint256 totalVirtual = _sum(_virtualBalances[id]);
        uint256 selected = _virtualBalances[id][outcomeIndex];
        if (totalVirtual == 0 || selected == 0) revert InsufficientLiquidity();
        return InterPredictReader.quote(grossAmount, totalVirtual, selected);
    }

    function buyOutcome(uint256 id, uint8 outcomeIndex, uint256 grossAmount, uint256 minSharesOut)
        external nonReentrant whenNotPaused
    {
        Market storage m = _market(id);
        if (m.state != MarketState.Active || block.timestamp >= m.tradingEndTime) revert InvalidState();
        if (marketPaused[id]) revert MarketPaused();
        (uint256 fee, uint256 netAmount, uint256 shares,,) = quoteBuy(id, outcomeIndex, grossAmount);
        if (shares < minSharesOut || shares == 0) revert SlippageExceeded();
        _pullExact(msg.sender, grossAmount);
        (uint256 treasuryPart, uint256 decPart, uint256 creatorPart) =
            InterPredictReader.allocateFees(grossAmount, fee, m.origin == MarketOrigin.Community);
        _pushExact(treasury, treasuryPart);
        m.decRewardFunds += decPart; totalDECRewardLiability += decPart;
        if (creatorPart > 0) { m.creatorFeesEarned += creatorPart; totalCreatorFeeLiability += creatorPart; }
        m.tradingCollateral += netAmount; m.marketVolume += grossAmount; totalTradingCollateralLiability += netAmount;
        userNetContribution[id][msg.sender] += netAmount;
        _virtualBalances[id][outcomeIndex] += netAmount; _totalShares[id][outcomeIndex] += shares;
        userShares[id][msg.sender][outcomeIndex] += shares;
        if (!hasTradedInMarket[id][msg.sender]) { hasTradedInMarket[id][msg.sender] = true; ++participantCount[id]; }
        ++tradeCount[id];
        emit OutcomePurchased(id, msg.sender, outcomeIndex, grossAmount, fee, shares);
    }

    function claimCreatorFees(uint256 id) external nonReentrant {
        Market storage m = _market(id);
        if (m.origin != MarketOrigin.Community || msg.sender != m.creator) revert UnauthorizedCaller();
        uint256 amount = m.creatorFeesEarned - m.creatorFeesClaimed;
        if (amount == 0) revert NothingClaimable();
        m.creatorFeesClaimed += amount; totalCreatorFeeLiability -= amount;
        _pushExact(msg.sender, amount);
        emit CreatorFeesClaimed(id, msg.sender, amount);
    }

    function syncTradingClosed(uint256 id) public {
        Market storage m = _market(id);
        if (m.state != MarketState.Active) revert InvalidState();
        if (block.timestamp < m.tradingEndTime) revert DeadlineActive();
        m.state = MarketState.TradingClosed;
        _clearMarketPause(id);
        emit TradingClosed(id);
    }

    function requestResolution(uint256 id) external {
        Market storage m = _market(id);
        if (m.state == MarketState.Active && block.timestamp >= m.tradingEndTime) syncTradingClosed(id);
        if (m.state != MarketState.TradingClosed && m.state != MarketState.Unresolved) revert InvalidState();
        bool eligible = hasTradedInMarket[id][msg.sender] || msg.sender == m.creator || _isActiveDEC(msg.sender);
        if (!eligible && block.timestamp < uint256(m.tradingEndTime) + ABANDONED_RESOLUTION_GRACE) {
            revert UnauthorizedCaller();
        }
        m.state = MarketState.DECResolutionVoting; m.resolutionRequestedAt = uint64(block.timestamp);
        m.resolutionRequester = msg.sender;
        m.resolutionVotingDeadline = uint64(block.timestamp + RESOLUTION_VOTING_DURATION);
        m.resolutionSnapshot = uint32(activeDECMemberCount);
        m.resolutionMembershipEpoch = _membershipEpoch;
        m.resolutionQuorum = uint32((activeDECMemberCount * RESOLUTION_QUORUM_BPS + BPS - 1) / BPS);
        emit ResolutionRequested(id, msg.sender, m.resolutionSnapshot, m.resolutionVotingDeadline);
        emit ResolutionSnapshotCreated(
            id,
            m.resolutionMembershipEpoch,
            m.resolutionSnapshot,
            m.resolutionQuorum,
            m.resolutionVotingDeadline
        );
    }

    function voteOnResolution(uint256 id, uint8 outcomeIndex) external {
        Market storage m = _market(id);
        if (m.state != MarketState.DECResolutionVoting) revert InvalidState();
        if (block.timestamp >= m.resolutionVotingDeadline) revert DeadlineExpired();
        if (!_wasActiveAt(msg.sender, m.resolutionMembershipEpoch)) revert InactiveDECMember();
        if (outcomeIndex >= _outcomes[id].length) revert InvalidOutcome();
        if (resolutionVotes[id][msg.sender] != 0) revert InvalidVote();
        resolutionVotes[id][msg.sender] = outcomeIndex + 1; ++resolutionVoteCounts[id][outcomeIndex];
        ++m.resolutionVoterCount; ++decMembers[msg.sender].resolutionVotes;
        if (decMembers[msg.sender].reputation >= REWARD_THRESHOLD) {
            _resolutionRewardEligible[id][msg.sender] = true;
            ++_resolutionRewardEligibleVoteCounts[id][outcomeIndex];
        }
        emit ResolutionVoteCast(id, msg.sender, outcomeIndex);
    }

    function finalizeResolutionVoting(uint256 id) external {
        Market storage m = _market(id);
        if (m.state != MarketState.DECResolutionVoting) revert InvalidState();
        if (block.timestamp < m.resolutionVotingDeadline) revert DeadlineActive();
        if (m.resolutionVoteFinalized) revert AlreadyProcessed();
        m.resolutionVoteFinalized = true; m.resolutionFinalizedAt = uint64(block.timestamp);
        ResolutionFailure failure;
        uint8 leader; uint32 high; bool tied;
        for (uint8 i; i < _outcomes[id].length; ++i) {
            uint32 votes = resolutionVoteCounts[id][i];
            if (votes > high) { high = votes; leader = i; tied = false; }
            else if (votes == high && votes > 0) tied = true;
        }
        if (m.resolutionVoterCount == 0) failure = ResolutionFailure.NoVotes;
        else if (m.resolutionVoterCount < m.resolutionQuorum) failure = ResolutionFailure.QuorumNotMet;
        else if (tied) failure = ResolutionFailure.TiedVote;
        m.leadingOutcome = leader; m.resolutionFailure = failure; m.state = MarketState.AdminVerification;
        m.adminVerificationDeadline = uint64(block.timestamp + ADMIN_VERIFICATION_DURATION);
        emit ResolutionVotingFinalized(id, leader, failure);
    }

    function confirmOutcome(uint256 id, uint8 outcomeIndex, string calldata reason, string calldata evidenceURI)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        Market storage m = _market(id);
        if (m.state != MarketState.AdminVerification) revert InvalidState();
        if (block.timestamp >= m.adminVerificationDeadline) revert DeadlineExpired();
        if (outcomeIndex >= _outcomes[id].length) revert InvalidOutcome();
        _bounded(reason, 1, MAX_CRITERIA_BYTES);
        _validURI(evidenceURI, false);
        // Admin may resolve failed/tied votes from evidence, but a valid DEC plurality is binding.
        if (m.resolutionFailure == ResolutionFailure.None && outcomeIndex != m.leadingOutcome) revert BindingDECOutcome();
        m.winningOutcome = outcomeIndex; m.adminConfirmed = true; m.outcomeConfirmedAt = uint64(block.timestamp);
        m.adminVerificationReason = reason; m.adminEvidenceURI = evidenceURI;
        m.state = MarketState.OutcomeConfirmed;
        emit OutcomeConfirmed(id, outcomeIndex, msg.sender);
    }

    function executeAdminVerificationTimeout(uint256 id) external nonReentrant {
        Market storage m = _market(id);
        if (m.state != MarketState.AdminVerification) revert InvalidState();
        if (block.timestamp < m.adminVerificationDeadline) revert VerificationWindowActive();
        if (m.resolutionFailure == ResolutionFailure.None) {
            m.winningOutcome = m.leadingOutcome;
            m.outcomeConfirmedAt = uint64(block.timestamp);
            m.state = MarketState.OutcomeConfirmed;
            emit OutcomeConfirmed(id, m.leadingOutcome, address(0));
            emit AdminVerificationTimedOut(id, false, m.leadingOutcome);
        } else {
            _cancelMarket(id, m, "ADMIN_TIMEOUT", m.primaryEvidenceURI, msg.sender);
            emit AdminVerificationTimedOut(id, true, 0);
        }
    }

    /// @notice Emergency cancellation refunds net trading collateral lazily and
    /// remains available through failed resolution escalation.
    function cancelActiveMarket(uint256 id, string calldata reason, string calldata evidenceURI)
        external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE)
    {
        Market storage m = _market(id);
        bool cancellable = m.state == MarketState.Active || m.state == MarketState.TradingClosed
            || m.state == MarketState.Unresolved || m.state == MarketState.DECResolutionVoting
            || m.state == MarketState.AdminVerification;
        if (!cancellable) revert InvalidState();
        if (m.state == MarketState.AdminVerification && m.resolutionFailure == ResolutionFailure.None) {
            revert BindingDECOutcome();
        }
        _bounded(reason, 1, MAX_CRITERIA_BYTES);
        _validURI(evidenceURI, false);
        _cancelMarket(id, m, reason, evidenceURI, msg.sender);
    }

    function _cancelMarket(
        uint256 id,
        Market storage m,
        string memory reason,
        string memory evidenceURI,
        address actor
    ) internal {
        m.state = MarketState.Cancelled; m.activeMarketCancelled = true;
        m.cancellationReason = reason; m.cancellationEvidenceURI = evidenceURI;
        _clearMarketPause(id);
        uint256 decFunds = m.decRewardFunds;
        if (decFunds > 0) {
            m.decRewardFunds = 0; totalDECRewardLiability -= decFunds;
            _pushExact(treasury, decFunds);
        }
        emit ActiveMarketCancelled(id, actor, reason, evidenceURI);
    }

    function pauseProtocol() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpauseProtocol() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function pauseMarket(uint256 id) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Market storage m = _market(id);
        if (m.state != MarketState.Active) revert InvalidState();
        if (marketPaused[id]) revert MarketPaused();
        marketPaused[id] = true;
        emit MarketPauseChanged(id, true, msg.sender);
    }

    function resumeMarket(uint256 id) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Market storage m = _market(id);
        if (m.state != MarketState.Active) revert InvalidState();
        if (!marketPaused[id]) revert MarketNotPaused();
        marketPaused[id] = false;
        emit MarketPauseChanged(id, false, msg.sender);
    }

    function claimCancellationRefund(uint256 id) external nonReentrant {
        Market storage m = _market(id);
        if (m.state != MarketState.Cancelled || !m.activeMarketCancelled) revert InvalidState();
        uint256 amount = userNetContribution[id][msg.sender];
        if (amount == 0) revert NothingRefundable();
        userNetContribution[id][msg.sender] = 0;
        m.tradingCollateral -= amount; totalTradingCollateralLiability -= amount;
        _pushExact(msg.sender, amount);
        emit CancellationRefundClaimed(id, msg.sender, amount);
    }

    function finalizeMarket(uint256 id) external nonReentrant {
        Market storage m = _market(id);
        if (m.state != MarketState.OutcomeConfirmed) revert InvalidState();
        m.state = MarketState.Resolved; m.finalizedAt = uint64(block.timestamp);
        m.payoutRemaining = m.tradingCollateral; m.winningSharesRemaining = _totalShares[id][m.winningOutcome];
        uint256 rewardRecipients = _resolutionRewardEligibleVoteCounts[id][m.winningOutcome];
        m.decRewardPerEligibleVoter = rewardRecipients == 0 ? 0 : m.decRewardFunds / rewardRecipients;
        uint256 assignedRewards = m.decRewardPerEligibleVoter * rewardRecipients;
        uint256 rewardDust = m.decRewardFunds - assignedRewards;
        m.decRewardFunds = assignedRewards;
        if (rewardDust > 0) {
            totalDECRewardLiability -= rewardDust;
            _pushExact(treasury, rewardDust);
        }
        emit MarketFinalized(id, m.winningOutcome, m.tradingCollateral);
    }

    function claimPayout(uint256 id) external nonReentrant {
        Market storage m = _market(id);
        if (m.state != MarketState.Resolved || hasClaimedPayout[id][msg.sender]) revert InvalidState();
        uint256 shares = userShares[id][msg.sender][m.winningOutcome];
        uint256 amount;
        if (m.winningSharesRemaining == 0) {
            if (m.payoutRemaining == 0) revert NothingClaimable();
            amount = userNetContribution[id][msg.sender];
            if (amount == 0) revert NothingClaimable();
            userNetContribution[id][msg.sender] = 0;
        } else {
            if (shares == 0) revert NothingClaimable();
            amount = shares == m.winningSharesRemaining ? m.payoutRemaining :
                InterPredictReader.proRata(shares, m.payoutRemaining, m.winningSharesRemaining);
            m.winningSharesRemaining -= shares;
        }
        hasClaimedPayout[id][msg.sender] = true; userShares[id][msg.sender][m.winningOutcome] = 0;
        m.payoutRemaining -= amount;
        m.tradingCollateral -= amount;
        totalTradingCollateralLiability -= amount;
        _pushExact(msg.sender, amount);
        emit PayoutClaimed(id, msg.sender, amount);
    }

    function returnCreatorSeed(uint256 id) external nonReentrant {
        Market storage m = _market(id);
        if (msg.sender != m.creator) revert UnauthorizedCaller();
        if (
            (m.state != MarketState.Resolved && (m.state != MarketState.Cancelled || !m.activeMarketCancelled))
                || m.seedReturned
        ) revert InvalidState();
        m.seedReturned = true;
        totalCreatorSeedLiability -= m.originalSeed;
        _pushExact(m.creator, m.originalSeed);
        emit CreatorSeedReturned(id, m.creator, m.originalSeed);
    }

    function settleMyResolutionParticipation(uint256 id) public {
        _settleResolutionParticipation(id, msg.sender);
    }

    function settleResolutionParticipation(uint256 id, address voter) external {
        _settleResolutionParticipation(id, voter);
    }

    function _settleResolutionParticipation(uint256 id, address voter) internal {
        Market storage m = _market(id);
        DECMember storage d = decMembers[voter];
        if (m.state != MarketState.Resolved || resolutionVotes[id][voter] == 0) revert InvalidState();
        if (resolutionReputationSettled[id][voter]) revert AlreadyProcessed();
        resolutionReputationSettled[id][voter] = true;
        bool honest = resolutionVotes[id][voter] - 1 == m.winningOutcome;
        if (honest) { ++d.honestResolutionVotes; d.reputation = _min(MAX_REPUTATION, d.reputation + HONEST_REPUTATION_GAIN); }
        else { ++d.incorrectResolutionVotes; d.reputation = d.reputation > INCORRECT_REPUTATION_LOSS ? d.reputation - INCORRECT_REPUTATION_LOSS : MIN_REPUTATION; }
        uint256 reward;
        if (honest && _resolutionRewardEligible[id][voter]) {
            reward = m.decRewardPerEligibleVoter;
            if (reward > 0) {
                unchecked { m.decRewardFunds -= reward; }
                d.storedRewards += reward; d.totalRewardsEarned += reward;
            }
        }
        emit DECReputationUpdated(voter, d.reputation, honest);
        emit ResolutionParticipationSettled(id, voter, honest, d.reputation, reward);
    }

    function claimDECRewards() external nonReentrant {
        DECMember storage d = decMembers[msg.sender];
        uint256 amount = d.storedRewards;
        if (amount == 0) revert NothingClaimable();
        d.storedRewards = 0; d.totalRewardsClaimed += amount; totalDECRewardLiability -= amount;
        _pushExact(msg.sender, amount);
        emit DECRewardsClaimed(msg.sender, amount);
    }

    function addDECMember(address member) external onlyRole(DEC_MANAGER_ROLE) {
        if (member == address(0) || member == address(this) || decMembers[member].exists) revert InvalidInput();
        if (activeDECMemberCount == type(uint32).max) revert InvalidInput();
        decMembers[member] = DECMember(true, true, false, uint64(block.timestamp), 0, 0, 0, 0, INITIAL_REPUTATION, 0, 0, 0);
        _decMemberList.push(member); ++activeDECMemberCount;
        _recordMembership(member, true);
        emit DECMemberStatusChanged(member, true);
    }
    function setDECMemberActive(address member, bool active) external onlyRole(DEC_MANAGER_ROLE) {
        DECMember storage d = decMembers[member];
        if (!d.exists || d.removed || d.active == active) revert InvalidInput();
        d.active = active;
        if (active) {
            if (activeDECMemberCount == type(uint32).max) revert InvalidInput();
            ++activeDECMemberCount;
        } else --activeDECMemberCount;
        _recordMembership(member, active);
        emit DECMemberStatusChanged(member, active);
    }
    function removeDECMember(address member) external onlyRole(DEC_MANAGER_ROLE) {
        DECMember storage d = decMembers[member];
        if (!d.exists || d.removed) revert InvalidInput();
        if (d.active) --activeDECMemberCount;
        d.active = false; d.removed = true;
        _recordMembership(member, false);
        emit DECMemberStatusChanged(member, false);
    }
    function updateTreasury(address next) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (next == address(0) || next == address(this)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, next); treasury = next;
    }

    /// @notice Returns `abi.encode(Market)`; clients decode using the generated
    /// Market tuple schema while the linked reader keeps the core below EIP-170.
    function getMarket(uint256 id) external view returns (bytes memory) {
        _market(id);
        uint256 marketSlot;
        assembly {
            mstore(0, id)
            mstore(32, _markets.slot)
            marketSlot := keccak256(0, 64)
        }
        return InterPredictReader.read(marketSlot);
    }
    /// @notice Returns `abi.encode(string[] outcomes)`.
    function getMarketOutcomes(uint256 id) external view returns (bytes memory) {
        _market(id);
        uint256 outcomesSlot;
        assembly {
            mstore(0, id)
            mstore(32, _outcomes.slot)
            outcomesSlot := keccak256(0, 64)
        }
        return InterPredictReader.readOutcomes(outcomesSlot);
    }
    /// @notice Returns `abi.encode(uint256[] balances, uint256[] shares, uint256[] prices)`.
    function getMarketPricing(uint256 id) external view returns (bytes memory) {
        _market(id);
        uint256 balancesSlot;
        uint256 sharesSlot;
        assembly {
            mstore(0, id)
            mstore(32, _virtualBalances.slot)
            balancesSlot := keccak256(0, 64)
            mstore(32, _totalShares.slot)
            sharesSlot := keccak256(0, 64)
        }
        return InterPredictReader.readPricing(balancesSlot, sharesSlot);
    }
    function getCreatorMarkets(address creator) external view returns (uint256[] memory) { return _creatorMarkets[creator]; }
    function getDECMemberList() external view returns (address[] memory) { return _decMemberList; }
    function isActiveDECMember(address member) external view returns (bool) { return _isActiveDEC(member); }
    function isResolutionVoterEligible(uint256 id, address member) external view returns (bool) {
        Market storage m = _market(id);
        return m.resolutionRequestedAt != 0 && _wasActiveAt(member, m.resolutionMembershipEpoch);
    }
    function getResolutionSnapshotMembers(uint256 id) external view returns (address[] memory members) {
        Market storage m = _market(id);
        if (m.resolutionRequestedAt == 0) return new address[](0);
        members = new address[](m.resolutionSnapshot);
        uint256 found;
        for (uint256 i; i < _decMemberList.length && found < members.length; ++i) {
            address member = _decMemberList[i];
            if (_wasActiveAt(member, m.resolutionMembershipEpoch)) members[found++] = member;
        }
    }
    function creatorFeesClaimable(uint256 id) external view returns (uint256) {
        Market storage m = _market(id); return m.creatorFeesEarned - m.creatorFeesClaimed;
    }
    function decRewardsView(address member) external view returns (uint256 claimable, uint256 locked) {
        DECMember storage d = decMembers[member];
        claimable = d.storedRewards;
        locked = 0;
    }

    function _validateParams(CreateMarketParams calldata p, uint256 earliestEnd) internal pure {
        _bounded(p.question, 1, MAX_QUESTION_BYTES); _bounded(p.description, 0, MAX_DESCRIPTION_BYTES);
        _bounded(p.resolutionCriteria, 1, MAX_CRITERIA_BYTES); _validURI(p.thumbnailURI, false);
        _validURI(p.primaryEvidenceURI, false); _validURI(p.backupEvidenceURI, true);
        if (p.tradingEndTime <= earliestEnd) revert InvalidInput();
        if (p.outcomes.length < 2 || p.outcomes.length > 4) revert InvalidInput();
        if (p.category == MarketCategory.Other) _bounded(p.customCategory, 1, MAX_LABEL_BYTES);
        else if (bytes(p.customCategory).length != 0) revert InvalidInput();
        for (uint256 i; i < p.outcomes.length; ++i) {
            _bounded(p.outcomes[i], 1, MAX_LABEL_BYTES);
            bytes32 h = keccak256(bytes(p.outcomes[i]));
            for (uint256 j; j < i; ++j) if (h == keccak256(bytes(p.outcomes[j]))) revert DuplicateOutcome();
        }
    }
    function _validURI(string calldata uri, bool optional) internal pure {
        uint256 n = bytes(uri).length;
        if (optional && n == 0) return;
        if (n == 0 || n > MAX_URI_BYTES) revert InvalidURI();
        bytes32 h;
        assembly { h := calldataload(uri.offset) }
        bool ok = (n > 8 && bytes8(h) == bytes8("https://"))
            || (n > 7 && bytes7(h) == bytes7("ipfs://"))
            || (n > 5 && bytes5(h) == bytes5("ar://"));
        if (!ok) revert InvalidURI();
    }
    function _bounded(string calldata value, uint256 minLength, uint256 maxLength) internal pure {
        uint256 n = bytes(value).length;
        if (n < minLength || n > maxLength) revert InvalidText();
    }
    function _market(uint256 id) internal view returns (Market storage m) {
        if (id >= totalMarkets) revert InvalidInput();
        m = _markets[id];
    }
    function _isActiveDEC(address member) internal view returns (bool) { return decMembers[member].exists && decMembers[member].active && !decMembers[member].removed; }
    function _recordMembership(address member, bool active) internal {
        ++_membershipEpoch;
        _decMembershipHistory[member].push(MembershipCheckpoint(_membershipEpoch, active));
    }
    function _wasActiveAt(address member, uint64 epoch) internal view returns (bool) {
        MembershipCheckpoint[] storage checkpoints = _decMembershipHistory[member];
        uint256 low;
        uint256 high = checkpoints.length;
        while (low < high) {
            uint256 mid = (low + high) >> 1;
            if (checkpoints[mid].epoch <= epoch) low = mid + 1;
            else high = mid;
        }
        return high != 0 && checkpoints[high - 1].active;
    }
    function _pullExact(address from, uint256 amount) internal {
        uint256 beforeBalance = settlementToken.balanceOf(address(this));
        settlementToken.safeTransferFrom(from, address(this), amount);
        uint256 afterBalance = settlementToken.balanceOf(address(this));
        if (afterBalance < beforeBalance || afterBalance - beforeBalance != amount) revert NonExactTransfer();
    }
    function _pushExact(address to, uint256 amount) internal {
        if (to == address(this)) revert ZeroAddress();
        uint256 beforeProtocol = settlementToken.balanceOf(address(this));
        uint256 beforeRecipient = settlementToken.balanceOf(to);
        settlementToken.safeTransfer(to, amount);
        uint256 afterProtocol = settlementToken.balanceOf(address(this));
        uint256 afterRecipient = settlementToken.balanceOf(to);
        if (
            afterProtocol > beforeProtocol || beforeProtocol - afterProtocol != amount
                || afterRecipient < beforeRecipient || afterRecipient - beforeRecipient != amount
        ) revert NonExactTransfer();
    }
    function _clearMarketPause(uint256 id) internal {
        if (marketPaused[id]) {
            marketPaused[id] = false;
            emit MarketPauseChanged(id, false, msg.sender);
        }
    }
    function _sum(uint256[] storage values) internal view returns (uint256 total) { for (uint256 i; i < values.length; ++i) total += values[i]; }
    function _min(uint256 a, uint256 b) internal pure returns (uint256) { return a < b ? a : b; }
}

library InterPredictReader {
    function read(uint256 marketSlot) external view returns (bytes memory) {
        InterPredict.Market storage market;
        assembly {
            market.slot := marketSlot
        }
        return abi.encode(market);
    }

    function readOutcomes(uint256 outcomesSlot) external view returns (bytes memory) {
        string[] storage outcomes;
        assembly {
            outcomes.slot := outcomesSlot
        }
        return abi.encode(outcomes);
    }

    function readPricing(uint256 balancesSlot, uint256 sharesSlot) external view returns (bytes memory) {
        uint256[] storage balances;
        uint256[] storage shares;
        assembly {
            balances.slot := balancesSlot
            shares.slot := sharesSlot
        }
        uint256 total;
        for (uint256 i; i < balances.length; ++i) total += balances[i];
        uint256[] memory prices = new uint256[](balances.length);
        for (uint256 i; i < balances.length; ++i) {
            prices[i] = total == 0 ? 0 : Math.mulDiv(balances[i], 1e18, total);
        }
        return abi.encode(balances, shares, prices);
    }

    function quote(uint256 grossAmount, uint256 totalVirtual, uint256 selected)
        external pure
        returns (uint256 fee, uint256 netAmount, uint256 shares, uint256 currentPrice, uint256 postTradePrice)
    {
        fee = Math.mulDiv(grossAmount, 50, 10_000);
        netAmount = grossAmount - fee;
        shares = Math.mulDiv(netAmount, totalVirtual, selected);
        currentPrice = Math.mulDiv(selected, 1e18, totalVirtual);
        postTradePrice = Math.mulDiv(selected + netAmount, 1e18, totalVirtual + netAmount);
    }

    function allocateFees(uint256 grossAmount, uint256 fee, bool community)
        external pure returns (uint256 treasuryPart, uint256 decPart, uint256 creatorPart)
    {
        treasuryPart = Math.mulDiv(grossAmount, community ? 20 : 30, 10_000);
        decPart = Math.mulDiv(grossAmount, 20, 10_000);
        if (community) creatorPart = fee - treasuryPart - decPart;
        else treasuryPart += fee - treasuryPart - decPart;
    }

    function proRata(uint256 shares, uint256 payoutRemaining, uint256 winningSharesRemaining)
        external pure returns (uint256)
    {
        return Math.mulDiv(shares, payoutRemaining, winningSharesRemaining);
    }
}
