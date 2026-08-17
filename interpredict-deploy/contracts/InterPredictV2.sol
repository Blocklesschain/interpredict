// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title InterPredictV2
/// @notice Community-driven forecasting market on the InterLink testnet.
/// @dev Native ITL (msg.value) is used for stakes, payouts, creator fees and
///      DEC rewards. TESTNET ONLY — no Mainnet deployment.
contract InterPredictV2 is AccessControl, ReentrancyGuard, Pausable {
    // ---------------------------------------------------------------------
    // Roles
    // ---------------------------------------------------------------------
    bytes32 public constant TEAM_ROLE = keccak256("TEAM_MARKET_ROLE");
    bytes32 public constant DEC_ROLE = keccak256("DEC_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_VERIFIER_ROLE");
    bytes32 public constant PAUSE_ROLE = keccak256("PAUSER_ROLE");

    // ---------------------------------------------------------------------
    // Enums
    // ---------------------------------------------------------------------
    enum Origin { Community, Team }

    enum Category {
        Sports, Politics, Crypto, Blockchain, Technology, AI, Economics,
        Finance, Business, Science, Climate, Entertainment, Culture, Health,
        RealEstate, Gaming, Web3, Other
    }

    enum State {
        Proposed,            // 0
        DECReview,           // 1
        Rejected,            // 2
        Cancelled,           // 3
        Approved,            // 4
        Active,              // 5
        Closed,              // 6  (derived: endTime passed)
        Unresolved,          // 7  (derived: ended, no resolution)
        ResolutionRequested, // 8
        DECResolutionVoting, // 9
        AdminVerification,   // 10
        Confirmed,           // 11
        Finalized,           // 12
        Resolved             // 13 (derived: all claims settled)
    }

    enum ProposalVote { None, Approve, Reject }

    // ---------------------------------------------------------------------
    // Custom errors
    // ---------------------------------------------------------------------
    error InvalidMarketState();
    error AlreadyParticipated();
    error AlreadyVoted();
    error ResolutionAlreadyRequested();
    error Unauthorized();
    error InvalidOutcome();
    error MarketClosed();
    error MarketNotEnded();
    error InsufficientFee();
    error InvalidQuestion();
    error InvalidOutcomes();
    error DuplicateOutcome();
    error NothingToClaim();
    error NotFinalized();
    error NotCreator();
    error NotActiveDEC();
    error MarketDoesNotExist();
    error InvalidEndTime();
    error SlippageExceeded();
    error NoSharesToExit();

    // ---------------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------------
    uint256 public constant PROPOSAL_FEE = 1 ether;
    uint256 public constant SEED_AMOUNT = 10 ether;
    uint256 public constant MIN_STAKE = 0.001 ether;
    uint256 public constant PROPOSAL_VOTING_WINDOW = 24 hours;
    uint256 public constant RESOLUTION_VOTING_WINDOW = 3 hours;
    uint256 public constant MAX_OUTCOMES = 4;
    uint256 public constant MIN_OUTCOMES = 2;
    uint256 public constant MAX_QUESTION_LEN = 256;
    uint256 public constant MAX_OUTCOME_LEN = 64;
    uint256 public constant MAX_CUSTOM_CATEGORY_LEN = 32;
    uint256 public constant MAX_THUMBNAIL_LEN = 256;
    uint256 public constant FEE_BPS = 50;          // 0.5% participation fee
    uint256 public constant SETTLE_BPS = 500;       // 5% settlement fee
    uint256 public constant RESOLUTION_QUORUM_BPS = 500; // 5% quorum
    uint256 public constant REPUTATION_INCREASE = 10;
    uint256 public constant REPUTATION_DECREASE = 20;
    uint256 public constant MAX_REPUTATION = 1000;
    uint256 public constant EXIT_FEE_BPS = 50;       // 0.5% exit fee
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Fee split (community markets) — participation fee
    uint256 public constant COMMUNITY_TREASURY_BPS = 20;
    uint256 public constant COMMUNITY_DEC_BPS = 20;
    // remainder goes to creator fee pool

    // Fee split (team markets) — participation fee
    uint256 public constant TEAM_TREASURY_BPS = 30;
    // remainder goes to DEC pool

    // Settlement fee split (community markets)
    uint256 public constant SETTLE_TREASURY_BPS = 200;
    uint256 public constant SETTLE_DEC_BPS = 200;
    // remainder goes to creator fee pool

    // Settlement fee split (team markets)
    uint256 public constant SETTLE_TEAM_TREASURY_BPS = 300;
    // remainder goes to DEC pool

    // ---------------------------------------------------------------------
    // Structs
    // ---------------------------------------------------------------------
    struct MarketContext {
        string question;
        string description;
        Category category;
        string customCategory;
        string thumbnailUri;
        Origin origin;
        address creator;
        uint256 endTime;
        string resolutionCriteria;
    }

    struct MarketVoting {
        uint256 proposalVotingStart;
        uint256 proposalVotingDeadline;
        uint256 approvalVotes;
        uint256 rejectionVotes;
        bool proposalFinalized;
        ProposalVote proposalDecision;
        uint256 proposalFinalizedAt;
        uint256 refundAmount;
        address refundRecipient;
        bool refunded;
    }

    struct MarketResolution {
        uint256 activeDecSnapshot;
        uint256 quorum;
        uint256 totalResolutionVotes;
        uint8 confirmedOutcome;
        bool outcomeConfirmed;
        bool finalized;
    }

    struct MarketFinance {
        uint256 totalVolume;
        uint256 participantCount;
        uint256 creatorFeesEarned;
        uint256 creatorFeesClaimed;
        uint256 creatorSeedClaimed;
        bool cancelled;
        string cancelReason;
        uint256 cancelledAt;
    }

    struct DecMember {
        bool active;
        uint256 proposalVotes;
        uint256 resolutionVotes;
        uint256 totalParticipation;
        uint256 honestVotes;
        uint256 incorrectVotes;
        uint256 reputation;
        uint256 totalRewardsEarned;
        uint256 totalRewardsClaimed;
        uint256 unclaimedRewards;
    }

    struct MarketParams {
        string question;
        string description;
        Category category;
        string customCategory;
        string thumbnailUri;
        string[] outcomes;
        uint256 endTime;
        string resolutionCriteria;
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------
    address payable public treasury;
    uint256 public totalMarkets;
    uint256 public decRewardPool;
    uint256 public totalDecMembers;
    uint256 public decRewardThreshold;
    address[] public decMemberList;

    mapping(uint256 => MarketContext) public marketContext;
    mapping(uint256 => MarketVoting) public marketVoting;
    mapping(uint256 => MarketResolution) public marketResolution;
    mapping(uint256 => MarketFinance) public marketFinance;
    mapping(uint256 => State) public marketState;
    mapping(uint256 => string[]) public outcomeLabels;
    mapping(uint256 => uint256[]) public outcomePools;
    mapping(uint256 => uint256[]) public creatorSeedPools;
    mapping(uint256 => uint256[]) public resolutionVoteCounts;

    mapping(uint256 => mapping(address => bool)) public hasVotedOnProposal;
    mapping(uint256 => mapping(address => ProposalVote)) public proposalVote;
    mapping(uint256 => mapping(address => bool)) public hasVotedOnResolution;
    mapping(uint256 => mapping(address => uint8)) public resolutionVote;
    mapping(uint256 => mapping(address => bool)) public hasParticipated;
    mapping(uint256 => mapping(uint8 => mapping(address => uint256))) public shares;
    mapping(uint256 => mapping(address => bool)) public hasClaimedWinnings;
    mapping(address => DecMember) public decMember;
    mapping(uint256 => mapping(address => bool)) public decRewardDistributed;
    mapping(uint256 => mapping(address => bool)) public hasExited;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------
    event MarketProposed(uint256 indexed id, string question, Category category, Origin origin, address indexed creator);
    event MarketDeployed(uint256 indexed id, string question, address indexed creator);
    event MarketActivated(uint256 indexed id);
    event MarketApproved(uint256 indexed id);
    event MarketRejected(uint256 indexed id, string reason);
    event MarketCancelled(uint256 indexed id, string reason);
    event ProposalVoteCast(uint256 indexed id, address indexed voter, ProposalVote vote);
    event ProposalFinalized(uint256 indexed id, ProposalVote decision, uint256 timestamp);
    event ParticipationRecorded(uint256 indexed id, address indexed participant, uint8 outcomeIndex, uint256 gross, uint256 net, uint256 sharesOut, uint256 fee);
    event ResolutionRequested(uint256 indexed id, address indexed requester, uint256 deadline);
    event ResolutionVoteCast(uint256 indexed id, address indexed voter, uint8 outcomeIndex);
    event ResolutionFinalized(uint256 indexed id, bool quorumReached, uint8 winningOutcome);
    event OutcomeConfirmed(uint256 indexed id, uint8 outcomeIndex);
    event MarketFinalized(uint256 indexed id);
    event WinningsClaimed(uint256 indexed id, address indexed claimant, uint256 amount);
    event CreatorFeeClaimed(uint256 indexed id, address indexed creator, uint256 amount);
    event CreatorSeedClaimed(uint256 indexed id, address indexed creator, uint256 amount);
    event DECMemberJoined(address indexed member);
    event DECMemberRemoved(address indexed member);
    event DECMemberActivated(address indexed member);
    event DECMemberSuspended(address indexed member);
    event DECRewardClaimed(address indexed member, uint256 amount);
    event ReputationUpdated(address indexed member, uint256 reputation);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PositionExited(uint256 indexed id, address indexed participant, uint256 grossPayout, uint256 fee, uint256 netPayout);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------
    modifier marketExists(uint256 id) {
        if (id >= totalMarkets) revert MarketDoesNotExist();
        _;
    }

    modifier onlyActiveDec() {
        if (!hasRole(DEC_ROLE, msg.sender) || !decMember[msg.sender].active) {
            revert NotActiveDEC();
        }
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor(address payable _treasury, address _admin) {
        treasury = _treasury;
        decRewardThreshold = 50;
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(PAUSE_ROLE, _admin);
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------
    function updateTreasury(address payable _newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit TreasuryUpdated(treasury, _newTreasury);
        treasury = _newTreasury;
    }

    function updateDecRewardThreshold(uint256 _newThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        decRewardThreshold = _newThreshold;
    }

    function pause() external onlyRole(PAUSE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSE_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // DEC membership management
    // ---------------------------------------------------------------------
    function addDecMember(address _member) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (hasRole(DEC_ROLE, _member)) revert Unauthorized();
        _grantRole(DEC_ROLE, _member);
        decMember[_member] = DecMember(true, 0, 0, 0, 0, 0, MAX_REPUTATION, 0, 0, 0);
        decMemberList.push(_member);
        totalDecMembers++;
        emit DECMemberJoined(_member);
    }

    function removeDecMember(address _member) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!hasRole(DEC_ROLE, _member)) revert Unauthorized();
        _revokeRole(DEC_ROLE, _member);
        decMember[_member].active = false;
        emit DECMemberRemoved(_member);
    }

    function activateDecMember(address _member) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!hasRole(DEC_ROLE, _member)) revert Unauthorized();
        decMember[_member].active = true;
        emit DECMemberActivated(_member);
    }

    function suspendDecMember(address _member) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!hasRole(DEC_ROLE, _member)) revert Unauthorized();
        decMember[_member].active = false;
        emit DECMemberSuspended(_member);
    }

    function isActiveDecMember(address _member) public view returns (bool) {
        return hasRole(DEC_ROLE, _member) && decMember[_member].active;
    }

    function getAllDecMembers() external view returns (address[] memory) {
        return decMemberList;
    }

    function getActiveDecMemberCount() public view returns (uint256) {
        uint256 count;
        for (uint256 i; i < decMemberList.length; i++) {
            if (isActiveDecMember(decMemberList[i])) count++;
        }
        return count;
    }

    // ---------------------------------------------------------------------
    // Validation helpers
    // ---------------------------------------------------------------------
    function _validateOutcomes(string[] calldata outcomes) internal pure {
        uint256 n = outcomes.length;
        if (n < MIN_OUTCOMES || n > MAX_OUTCOMES) revert InvalidOutcomes();
        for (uint256 i; i < n; i++) {
            if (bytes(outcomes[i]).length == 0 || bytes(outcomes[i]).length > MAX_OUTCOME_LEN) {
                revert InvalidOutcomes();
            }
            for (uint256 j = i + 1; j < n; j++) {
                if (keccak256(bytes(outcomes[i])) == keccak256(bytes(outcomes[j]))) {
                    revert DuplicateOutcome();
                }
            }
        }
    }

    // ---------------------------------------------------------------------
    // Market creation
    // ---------------------------------------------------------------------
    function deployTeamMarket(MarketParams calldata params)
        external
        payable
        onlyRole(TEAM_ROLE)
        whenNotPaused
        returns (uint256)
    {
        if (bytes(params.question).length == 0 || bytes(params.question).length > MAX_QUESTION_LEN) {
            revert InvalidQuestion();
        }
        if (params.endTime <= block.timestamp) revert InvalidEndTime();
        if (bytes(params.thumbnailUri).length > MAX_THUMBNAIL_LEN || bytes(params.resolutionCriteria).length == 0) {
            revert InvalidQuestion();
        }
        if (msg.value < SEED_AMOUNT) revert InsufficientFee();
        _validateOutcomes(params.outcomes);

        uint256 id = totalMarkets++;
        marketContext[id] = MarketContext(
            params.question,
            params.description,
            params.category,
            params.customCategory,
            params.thumbnailUri,
            Origin.Team,
            msg.sender,
            params.endTime,
            params.resolutionCriteria
        );
        outcomePools[id] = new uint256[](params.outcomes.length);
        creatorSeedPools[id] = new uint256[](params.outcomes.length);
        resolutionVoteCounts[id] = new uint256[](params.outcomes.length);
        outcomeLabels[id] = params.outcomes;
        marketState[id] = State.Active;
        _allocateSeed(id, msg.value);
        emit MarketDeployed(id, params.question, msg.sender);
        emit MarketActivated(id);
        return id;
    }

    function proposeMarket(MarketParams calldata params)
        external
        payable
        whenNotPaused
        returns (uint256)
    {
        if (bytes(params.question).length == 0 || bytes(params.question).length > MAX_QUESTION_LEN) {
            revert InvalidQuestion();
        }
        if (msg.value != PROPOSAL_FEE + SEED_AMOUNT) revert InsufficientFee();
        if (params.endTime <= block.timestamp + PROPOSAL_VOTING_WINDOW) revert InvalidEndTime();
        if (bytes(params.thumbnailUri).length > MAX_THUMBNAIL_LEN || bytes(params.resolutionCriteria).length == 0) {
            revert InvalidQuestion();
        }
        if (params.category == Category.Other) {
            if (bytes(params.customCategory).length == 0 || bytes(params.customCategory).length > MAX_CUSTOM_CATEGORY_LEN) {
                revert InvalidQuestion();
            }
        }
        _validateOutcomes(params.outcomes);

        // Transfer proposal fee to treasury
        (bool feeSent, ) = treasury.call{value: PROPOSAL_FEE}("");
        if (!feeSent) revert InsufficientFee();

        uint256 id = totalMarkets++;
        marketContext[id] = MarketContext(
            params.question,
            params.description,
            params.category,
            params.customCategory,
            params.thumbnailUri,
            Origin.Community,
            msg.sender,
            params.endTime,
            params.resolutionCriteria
        );
        outcomePools[id] = new uint256[](params.outcomes.length);
        creatorSeedPools[id] = new uint256[](params.outcomes.length);
        resolutionVoteCounts[id] = new uint256[](params.outcomes.length);
        outcomeLabels[id] = params.outcomes;
        marketState[id] = State.Proposed;
        marketVoting[id] = MarketVoting(0, 0, 0, 0, false, ProposalVote.None, 0, SEED_AMOUNT, msg.sender, false);
        emit MarketProposed(id, params.question, params.category, Origin.Community, msg.sender);
        return id;
    }

    // ---------------------------------------------------------------------
    // Proposal voting
    // ---------------------------------------------------------------------
    function enterProposalReview(uint256 id) external marketExists(id) {
        if (marketState[id] != State.Proposed || marketContext[id].origin != Origin.Community) {
            revert InvalidMarketState();
        }
        marketState[id] = State.DECReview;
        MarketVoting storage voting = marketVoting[id];
        voting.proposalVotingStart = block.timestamp;
        voting.proposalVotingDeadline = block.timestamp + PROPOSAL_VOTING_WINDOW;
    }

    function voteOnProposal(uint256 id, ProposalVote vote) external onlyActiveDec marketExists(id) {
        if (vote != ProposalVote.Approve && vote != ProposalVote.Reject) revert InvalidOutcome();
        MarketVoting storage voting = marketVoting[id];
        if (marketState[id] != State.DECReview ||
            block.timestamp >= voting.proposalVotingDeadline ||
            hasVotedOnProposal[id][msg.sender] ||
            marketContext[id].origin != Origin.Community) {
            revert InvalidMarketState();
        }
        hasVotedOnProposal[id][msg.sender] = true;
        proposalVote[id][msg.sender] = vote;
        if (vote == ProposalVote.Approve) voting.approvalVotes++;
        else voting.rejectionVotes++;
        decMember[msg.sender].proposalVotes++;
        decMember[msg.sender].totalParticipation++;
        emit ProposalVoteCast(id, msg.sender, vote);
    }

    function finalizeProposalVoting(uint256 id) external marketExists(id) nonReentrant {
        MarketVoting storage voting = marketVoting[id];
        if (marketState[id] != State.DECReview || block.timestamp < voting.proposalVotingDeadline || voting.proposalFinalized) {
            revert InvalidMarketState();
        }
        voting.proposalFinalized = true;
        voting.proposalFinalizedAt = block.timestamp;
        uint256 total = voting.approvalVotes + voting.rejectionVotes;
        if (total == 0) {
            marketState[id] = State.Cancelled;
            voting.proposalDecision = ProposalVote.None;
            _refundCreator(id);
            emit MarketCancelled(id, "NoDECVotes");
        } else if (voting.approvalVotes > voting.rejectionVotes) {
            marketState[id] = State.Approved;
            voting.proposalDecision = ProposalVote.Approve;
            _activateMarket(id);
            emit MarketApproved(id);
        } else {
            marketState[id] = State.Rejected;
            voting.proposalDecision = ProposalVote.Reject;
            _refundCreator(id);
            emit MarketRejected(id, voting.approvalVotes == voting.rejectionVotes ? "Tied" : "Rejected");
        }
        emit ProposalFinalized(id, voting.proposalDecision, block.timestamp);
    }

    function _refundCreator(uint256 id) internal {
        MarketVoting storage voting = marketVoting[id];
        if (voting.refunded) return;
        voting.refunded = true;
        (bool sent, ) = payable(voting.refundRecipient).call{value: voting.refundAmount}("");
        if (!sent) revert InsufficientFee();
    }

    function _activateMarket(uint256 id) internal {
        if (marketContext[id].endTime <= block.timestamp) revert InvalidEndTime();
        marketState[id] = State.Active;
        _allocateSeed(id, SEED_AMOUNT);
        emit MarketActivated(id);
    }

    function _allocateSeed(uint256 id, uint256 total) internal {
        uint256 n = outcomeLabels[id].length;
        uint256 base = total / n;
        uint256 remainder = total - (base * n);
        for (uint256 i; i < n; i++) {
            uint256 amount = base;
            if (i == 0) amount += remainder;
            creatorSeedPools[id][i] = amount;
            outcomePools[id][i] += amount;
        }
    }

    // ---------------------------------------------------------------------
    // Participation
    // ---------------------------------------------------------------------
    function getTotalPool(uint256 id) public view returns (uint256) {
        uint256 total;
        uint256[] memory pools = outcomePools[id];
        for (uint256 i; i < pools.length; i++) total += pools[i];
        return total;
    }

    function getOutcomePrice(uint256 id, uint8 outcomeIndex) public view returns (uint256) {
        if (outcomeIndex >= outcomeLabels[id].length) revert InvalidOutcome();
        uint256 totalPool = getTotalPool(id);
        return totalPool == 0 ? 0 : (outcomePools[id][outcomeIndex] * 1e18) / totalPool;
    }

    function getSharesOut(uint256 id, uint8 outcomeIndex, uint256 net) public view returns (uint256) {
        if (outcomeIndex >= outcomeLabels[id].length) revert InvalidOutcome();
        uint256 totalPool = getTotalPool(id);
        if (totalPool == 0) return net;
        uint256 pool = outcomePools[id][outcomeIndex];
        return pool == 0 ? net : (net * totalPool) / pool;
    }

    function participate(uint256 id, uint8 outcomeIndex, uint256 minShares)
        external
        payable
        whenNotPaused
        nonReentrant
        marketExists(id)
    {
        if (marketState[id] != State.Active ||
            block.timestamp >= marketContext[id].endTime ||
            outcomeIndex >= outcomeLabels[id].length ||
            msg.value < MIN_STAKE) {
            revert InvalidMarketState();
        }
        if (hasParticipated[id][msg.sender]) revert AlreadyParticipated();

        uint256 fee = (msg.value * FEE_BPS) / BPS_DENOMINATOR;
        uint256 net = msg.value - fee;
        uint256 sharesOut = getSharesOut(id, outcomeIndex, net);
        if (sharesOut < minShares) revert SlippageExceeded();

        outcomePools[id][outcomeIndex] += net;
        shares[id][outcomeIndex][msg.sender] += sharesOut;
        hasParticipated[id][msg.sender] = true;
        marketFinance[id].participantCount++;
        marketFinance[id].totalVolume += msg.value;
        _distributeParticipationFee(id, fee);
        emit ParticipationRecorded(id, msg.sender, outcomeIndex, msg.value, net, sharesOut, fee);
    }

    function _distributeParticipationFee(uint256 id, uint256 fee) internal {
        if (marketContext[id].origin == Origin.Community) {
            uint256 treasuryShare = (fee * COMMUNITY_TREASURY_BPS) / FEE_BPS;
            uint256 decShare = (fee * COMMUNITY_DEC_BPS) / FEE_BPS;
            uint256 creatorShare = fee - treasuryShare - decShare;
            (bool sent, ) = treasury.call{value: treasuryShare}("");
            if (!sent) revert InsufficientFee();
            decRewardPool += decShare;
            marketFinance[id].creatorFeesEarned += creatorShare;
        } else {
            uint256 treasuryShare = (fee * TEAM_TREASURY_BPS) / FEE_BPS;
            uint256 decShare = fee - treasuryShare;
            (bool sent, ) = treasury.call{value: treasuryShare}("");
            if (!sent) revert InsufficientFee();
            decRewardPool += decShare;
        }
    }

    // ---------------------------------------------------------------------
    // Exit Position (sell shares while market is active)
    // ---------------------------------------------------------------------
    function exitPosition(uint256 id, uint8 outcomeIndex, uint256 minPayout)
        external
        whenNotPaused
        nonReentrant
        marketExists(id)
    {
        if (marketState[id] != State.Active ||
            block.timestamp >= marketContext[id].endTime ||
            outcomeIndex >= outcomeLabels[id].length) {
            revert InvalidMarketState();
        }
        if (hasExited[id][msg.sender]) revert NoSharesToExit();

        uint256 userShares = shares[id][outcomeIndex][msg.sender];
        if (userShares == 0) revert NoSharesToExit();

        uint256 totalPool = getTotalPool(id);
        uint256 outcomePool = outcomePools[id][outcomeIndex];
        if (outcomePool == 0 || totalPool == 0) revert NoSharesToExit();

        // Calculate payout: user's proportional share of the outcome pool
        uint256 grossPayout = (userShares * totalPool) / outcomePool;
        uint256 exitFee = (grossPayout * EXIT_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netPayout = grossPayout - exitFee;
        if (netPayout < minPayout) revert SlippageExceeded();

        // Burn the user's shares and reduce the outcome pool
        shares[id][outcomeIndex][msg.sender] = 0;
        hasExited[id][msg.sender] = true;
        outcomePools[id][outcomeIndex] -= netPayout;

        // Distribute exit fee
        _distributeParticipationFee(id, exitFee);

        // Send net payout to user
        (bool sent, ) = payable(msg.sender).call{value: netPayout}("");
        if (!sent) revert InsufficientFee();

        emit PositionExited(id, msg.sender, grossPayout, exitFee, netPayout);
    }

    // ---------------------------------------------------------------------
    // Resolution
    // ---------------------------------------------------------------------
    function requestResolution(uint256 id) external marketExists(id) {
        State state = marketState[id];
        if ((state != State.Active && state != State.Closed && state != State.Unresolved) ||
            block.timestamp < marketContext[id].endTime) {
            revert MarketNotEnded();
        }
        if (state == State.Finalized || state == State.Resolved ||
            state == State.Cancelled || state == State.Rejected) {
            revert InvalidMarketState();
        }
        bool isTrader = hasParticipated[id][msg.sender];
        bool isCreator = marketContext[id].creator == msg.sender;
        bool isDec = isActiveDecMember(msg.sender);
        if (!isTrader && !isCreator && !isDec) revert Unauthorized();

        marketState[id] = State.ResolutionRequested;
        MarketResolution storage resolution = marketResolution[id];
        resolution.activeDecSnapshot = getActiveDecMemberCount();
        resolution.quorum = (resolution.activeDecSnapshot * RESOLUTION_QUORUM_BPS) / BPS_DENOMINATOR;
        if (resolution.quorum == 0 && resolution.activeDecSnapshot > 0) resolution.quorum = 1;
        emit ResolutionRequested(id, msg.sender, block.timestamp + RESOLUTION_VOTING_WINDOW);
    }

    function voteOnResolution(uint256 id, uint8 outcomeIndex) external onlyActiveDec marketExists(id) {
        MarketResolution storage resolution = marketResolution[id];
        if (marketState[id] != State.DECResolutionVoting &&
            marketState[id] != State.ResolutionRequested) {
            revert InvalidMarketState();
        }
        if (outcomeIndex >= outcomeLabels[id].length) revert InvalidOutcome();
        if (hasVotedOnResolution[id][msg.sender]) revert AlreadyVoted();

        // Enter resolution voting if not already
        if (marketState[id] == State.ResolutionRequested) {
            marketState[id] = State.DECResolutionVoting;
        }

        hasVotedOnResolution[id][msg.sender] = true;
        resolutionVote[id][msg.sender] = outcomeIndex;
        resolutionVoteCounts[id][outcomeIndex]++;
        resolution.totalResolutionVotes++;
        decMember[msg.sender].resolutionVotes++;
        decMember[msg.sender].totalParticipation++;
        emit ResolutionVoteCast(id, msg.sender, outcomeIndex);
    }

    function finalizeResolutionVoting(uint256 id) external marketExists(id) {
        MarketResolution storage resolution = marketResolution[id];
        if (marketState[id] != State.DECResolutionVoting) revert InvalidMarketState();

        if (resolution.totalResolutionVotes < resolution.quorum) {
            marketState[id] = State.AdminVerification;
            emit ResolutionFinalized(id, false, 0);
            return;
        }

        uint8 winningOutcome;
        uint256 highestVotes;
        bool tied;
        uint256[] memory votes = resolutionVoteCounts[id];
        for (uint8 i; i < votes.length; i++) {
            if (votes[i] > highestVotes) {
                highestVotes = votes[i];
                winningOutcome = i;
                tied = false;
            } else if (votes[i] == highestVotes && highestVotes > 0) {
                tied = true;
            }
        }

        marketState[id] = State.AdminVerification;
        emit ResolutionFinalized(id, true, tied ? winningOutcome : winningOutcome);
    }

    function confirmOutcome(uint256 id, uint8 outcomeIndex, string calldata)
        external
        onlyRole(ADMIN_ROLE)
        marketExists(id)
    {
        if (marketState[id] != State.AdminVerification ||
            outcomeIndex >= outcomeLabels[id].length ||
            marketResolution[id].outcomeConfirmed) {
            revert InvalidMarketState();
        }
        MarketResolution storage resolution = marketResolution[id];
        resolution.confirmedOutcome = outcomeIndex;
        resolution.outcomeConfirmed = true;
        marketState[id] = State.Confirmed;
        emit OutcomeConfirmed(id, outcomeIndex);

        // Update DEC reputation
        for (uint256 i; i < decMemberList.length; i++) {
            address member = decMemberList[i];
            if (hasVotedOnResolution[id][member] && !decRewardDistributed[id][member]) {
                decRewardDistributed[id][member] = true;
                if (resolutionVote[id][member] == outcomeIndex) {
                    decMember[member].honestVotes++;
                    decMember[member].reputation =
                        decMember[member].reputation + REPUTATION_INCREASE > MAX_REPUTATION
                            ? MAX_REPUTATION
                            : decMember[member].reputation + REPUTATION_INCREASE;
                } else {
                    decMember[member].incorrectVotes++;
                    decMember[member].reputation =
                        decMember[member].reputation > REPUTATION_DECREASE
                            ? decMember[member].reputation - REPUTATION_DECREASE
                            : 0;
                }
                emit ReputationUpdated(member, decMember[member].reputation);
            }
        }
    }

    function finalizeMarket(uint256 id) external marketExists(id) {
        if (marketState[id] != State.Confirmed || marketResolution[id].finalized) {
            revert InvalidMarketState();
        }
        marketResolution[id].finalized = true;
        marketState[id] = State.Finalized;
        emit MarketFinalized(id);
    }

    // ---------------------------------------------------------------------
    // Claims
    // ---------------------------------------------------------------------
    function claimWinnings(uint256 id) external nonReentrant marketExists(id) {
        if (!marketResolution[id].finalized || hasClaimedWinnings[id][msg.sender]) {
            revert InvalidMarketState();
        }
        uint8 winningOutcome = marketResolution[id].confirmedOutcome;
        uint256 userShares = shares[id][winningOutcome][msg.sender];
        if (userShares == 0) revert NothingToClaim();
        hasClaimedWinnings[id][msg.sender] = true;
        shares[id][winningOutcome][msg.sender] = 0;
        uint256 totalPool = getTotalPool(id);
        uint256 winningPool = outcomePools[id][winningOutcome];
        if (winningPool == 0) revert NothingToClaim();
        uint256 grossPayout = (userShares * totalPool) / winningPool;
        uint256 settleFee = (grossPayout * SETTLE_BPS) / BPS_DENOMINATOR;
        uint256 netPayout = grossPayout - settleFee;
        _distributeSettlementFee(id, settleFee);
        (bool sent, ) = payable(msg.sender).call{value: netPayout}("");
        if (!sent) revert InsufficientFee();
        emit WinningsClaimed(id, msg.sender, netPayout);
    }

    function _distributeSettlementFee(uint256 id, uint256 fee) internal {
        if (marketContext[id].origin == Origin.Community) {
            uint256 treasuryShare = (fee * SETTLE_TREASURY_BPS) / SETTLE_BPS;
            uint256 decShare = (fee * SETTLE_DEC_BPS) / SETTLE_BPS;
            uint256 creatorShare = fee - treasuryShare - decShare;
            (bool sent, ) = treasury.call{value: treasuryShare}("");
            if (!sent) revert InsufficientFee();
            decRewardPool += decShare;
            marketFinance[id].creatorFeesEarned += creatorShare;
        } else {
            uint256 treasuryShare = (fee * SETTLE_TEAM_TREASURY_BPS) / SETTLE_BPS;
            uint256 decShare = fee - treasuryShare;
            (bool sent, ) = treasury.call{value: treasuryShare}("");
            if (!sent) revert InsufficientFee();
            decRewardPool += decShare;
        }
    }

    function claimCreatorFee(uint256 id) external nonReentrant marketExists(id) {
        if (marketContext[id].origin != Origin.Community ||
            marketContext[id].creator != msg.sender ||
            !marketResolution[id].finalized) {
            revert NotCreator();
        }
        uint256 claimable = marketFinance[id].creatorFeesEarned - marketFinance[id].creatorFeesClaimed;
        if (claimable == 0) revert NothingToClaim();
        marketFinance[id].creatorFeesClaimed += claimable;
        (bool sent, ) = payable(msg.sender).call{value: claimable}("");
        if (!sent) revert InsufficientFee();
        emit CreatorFeeClaimed(id, msg.sender, claimable);
    }

    function claimCreatorSeed(uint256 id) external nonReentrant marketExists(id) {
        if (marketContext[id].creator != msg.sender ||
            !marketResolution[id].finalized ||
            marketFinance[id].creatorSeedClaimed != 0) {
            revert NotCreator();
        }
        uint256 total;
        for (uint256 i; i < creatorSeedPools[id].length; i++) {
            total += creatorSeedPools[id][i];
        }
        if (total == 0) revert NothingToClaim();
        if (address(this).balance < getTotalPool(id) + decRewardPool) revert InsufficientFee();
        marketFinance[id].creatorSeedClaimed = total;
        (bool sent, ) = payable(msg.sender).call{value: total}("");
        if (!sent) revert InsufficientFee();
        emit CreatorSeedClaimed(id, msg.sender, total);
    }

    function claimDecRewards() external nonReentrant {
        if (!isActiveDecMember(msg.sender) || decMember[msg.sender].reputation < decRewardThreshold) {
            revert NotActiveDEC();
        }
        uint256 claimable = decMember[msg.sender].unclaimedRewards;
        if (claimable == 0) revert NothingToClaim();
        decMember[msg.sender].unclaimedRewards = 0;
        decMember[msg.sender].totalRewardsClaimed += claimable;
        (bool sent, ) = payable(msg.sender).call{value: claimable}("");
        if (!sent) revert InsufficientFee();
        emit DECRewardClaimed(msg.sender, claimable);
    }

    function allocateDecRewards(uint256 id) external marketExists(id) {
        if (!marketResolution[id].finalized) revert NotFinalized();
        uint256 eligibleCount;
        address[] memory eligible = new address[](decMemberList.length);
        for (uint256 i; i < decMemberList.length; i++) {
            address member = decMemberList[i];
            if (isActiveDecMember(member) && decMember[member].reputation >= decRewardThreshold) {
                eligible[eligibleCount] = member;
                eligibleCount++;
            }
        }
        if (eligibleCount == 0 || decRewardPool == 0) return;
        uint256 reward = decRewardPool / eligibleCount;
        uint256 totalDistributed = reward * eligibleCount;
        for (uint256 i; i < eligibleCount; i++) {
            address member = eligible[i];
            decMember[member].unclaimedRewards += reward;
            decMember[member].totalRewardsEarned += reward;
        }
        decRewardPool -= totalDistributed;
    }

    // ---------------------------------------------------------------------
    // Cancellation
    // ---------------------------------------------------------------------
    function cancelMarket(uint256 id, string calldata reason, string calldata)
        external
        onlyRole(ADMIN_ROLE)
        marketExists(id)
    {
        if (marketState[id] == State.Finalized ||
            marketState[id] == State.Resolved ||
            marketFinance[id].cancelled) {
            revert InvalidMarketState();
        }
        marketFinance[id].cancelled = true;
        marketFinance[id].cancelReason = reason;
        marketFinance[id].cancelledAt = block.timestamp;
        marketState[id] = State.Cancelled;
        MarketVoting storage voting = marketVoting[id];
        if (marketContext[id].origin == Origin.Community && !voting.refunded && voting.refundAmount > 0) {
            voting.refunded = true;
            (bool sent, ) = payable(voting.refundRecipient).call{value: voting.refundAmount}("");
            if (!sent) revert InsufficientFee();
        }
        emit MarketCancelled(id, reason);
    }

    // ---------------------------------------------------------------------
    // Getters
    // ---------------------------------------------------------------------
    function getOutcomeLabels(uint256 id) external view returns (string[] memory) {
        return outcomeLabels[id];
    }

    function getOutcomePools(uint256 id) external view returns (uint256[] memory) {
        return outcomePools[id];
    }

    function getOutcomePrices(uint256 id) external view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](outcomeLabels[id].length);
        uint256 totalPool = getTotalPool(id);
        for (uint256 i; i < prices.length; i++) {
            prices[i] = totalPool > 0 ? (outcomePools[id][i] * 1e18) / totalPool : 0;
        }
        return prices;
    }

    function getUserShares(uint256 id, uint8 outcomeIndex, address user) external view returns (uint256) {
        return shares[id][outcomeIndex][user];
    }

    function getDecMemberInfo(address member) external view returns (DecMember memory) {
        return decMember[member];
    }

    receive() external payable {}
}