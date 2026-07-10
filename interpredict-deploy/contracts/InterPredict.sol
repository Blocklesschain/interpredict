// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract InterPredict {
    // --- ENUMS & STRUCTS ---
    enum MarketState {
        Proposed,
        Active,
        Resolved
    }
    enum Outcome {
        YES,
        NO,
        DRAW
    }

    struct Market {
        uint256 id;
        string question;
        uint256 marketEndTime;
        uint256 votingEndTime;
        uint256 totalYesPool;
        uint256 totalNoPool;
        MarketState state;
        Outcome winningOutcome;
        address creator;
        bool creatorFeeClaimed;
        uint256 votesForActive;
        uint256 votesAgainstActive;
    }

    // --- EVENTS ---
    event MarketProposed(
        uint256 indexed marketId,
        string question,
        uint256 votingEndTime
    );
    event MarketInitialized(uint256 indexed marketId, uint256 marketEndTime);
    event SharePurchased(
        uint256 indexed marketId,
        address indexed trader,
        bool isYes,
        uint256 amount
    );
    event MarketResolved(uint256 indexed marketId, Outcome winningOutcome);
    event PayoutClaimed(
        uint256 indexed marketId,
        address indexed trader,
        uint256 amount
    );
    event CreatorYieldClaimed(
        uint256 indexed marketId,
        address indexed creator,
        uint256 amount
    );
    event DecRewardsClaimed(address indexed decMember, uint256 amount);
    event OracleUpdated(
        address indexed previousOracle,
        address indexed newOracle
    );

    // --- STATE VARIABLES ---
    address public immutable owner;
    address public oracle;

    uint256 public constant MARKET_STAKE = 1 ether;
    uint256 public constant VOTING_DURATION = 1 days;
    uint256 public constant PLATFORM_FEE_BPS = 200;
    uint256 public constant CREATOR_FEE_BPS = 100;

    uint256 public totalMarkets;
    uint256 public decPool;
    uint256 public totalDecMembers;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public yesShares;
    mapping(uint256 => mapping(address => uint256)) public noShares;
    mapping(address => bool) public isDecMember;
    mapping(uint256 => mapping(address => bool)) public hasVotedOnCuration;
    mapping(address => uint256) public decRewardsClaimedTracker;

    // --- MODIFIERS ---
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can resolve");
        _;
    }

    // --- CONSTRUCTOR ---
    constructor(address _oracle) {
        require(_oracle != address(0), "Oracle cannot be zero address");
        owner = msg.sender;
        oracle = _oracle;
    }

    // --- CORE DEPLOYMENT FUNCTIONS ---

    function createActiveMarket(
        string calldata _question,
        uint256 _marketEndTime
    ) external payable onlyOwner {
        require(_marketEndTime > block.timestamp, "End time must be in future");

        uint256 marketId = totalMarkets++;
        Market storage market = markets[marketId];
        market.id = marketId;
        market.question = _question;
        market.marketEndTime = _marketEndTime;
        market.state = MarketState.Active;
        market.creator = msg.sender;

        emit MarketInitialized(marketId, _marketEndTime);
    }

    function proposeMarket(
        string calldata _question,
        uint256 _marketEndTime
    ) external payable {
        require(msg.value == MARKET_STAKE, "Must lock strict stake parameters");
        require(
            _marketEndTime > block.timestamp + VOTING_DURATION,
            "Market end time must be after voting"
        );

        uint256 marketId = totalMarkets++;
        Market storage market = markets[marketId];
        market.id = marketId;
        market.question = _question;
        market.marketEndTime = _marketEndTime;
        market.votingEndTime = block.timestamp + VOTING_DURATION;
        market.state = MarketState.Proposed;
        market.creator = msg.sender;

        emit MarketProposed(marketId, _question, market.votingEndTime);
    }

    function voteOnCuration(uint256 _marketId, bool _support) external {
        require(isDecMember[msg.sender], "Only DEC committee can curate");
        Market storage market = markets[_marketId];
        require(
            market.state == MarketState.Proposed,
            "Market not pending curation"
        );
        require(
            block.timestamp < market.votingEndTime,
            "Curation period ended"
        );
        require(
            !hasVotedOnCuration[_marketId][msg.sender],
            "Already voted on this query"
        );

        hasVotedOnCuration[_marketId][msg.sender] = true;
        if (_support) {
            market.votesForActive++;
        } else {
            market.votesAgainstActive++;
        }
    }

    function initializeMarket(uint256 _marketId) external {
        Market storage market = markets[_marketId];
        require(
            market.state == MarketState.Proposed,
            "Market already initialized"
        );
        require(
            block.timestamp >= market.votingEndTime,
            "Curation voting still active"
        );

        if (
            market.votesForActive >= market.votesAgainstActive &&
            market.votesForActive > 0
        ) {
            market.state = MarketState.Active;
            emit MarketInitialized(_marketId, market.marketEndTime);
        } else {
            market.state = MarketState.Resolved;
            market.winningOutcome = Outcome.DRAW;

            uint256 refundAmount = MARKET_STAKE;
            (bool success, ) = address(market.creator).call{
                value: refundAmount
            }("");
            require(success, "Refund failed");
        }
    }

    function buyShares(uint256 _marketId, bool _isYes) external payable {
        Market storage market = markets[_marketId];
        require(
            market.state == MarketState.Active,
            "Market is not active for trading"
        );
        require(
            block.timestamp < market.marketEndTime,
            "Trading window closed"
        );
        require(msg.value > 0, "Wager must be greater than zero");

        if (_isYes) {
            yesShares[_marketId][msg.sender] += msg.value;
            market.totalYesPool += msg.value;
        } else {
            noShares[_marketId][msg.sender] += msg.value;
            market.totalNoPool += msg.value;
        }

        emit SharePurchased(_marketId, msg.sender, _isYes, msg.value);
    }

    // --- SETTLEMENT LAYER (Hardened Mathematics Matrix) ---

    function resolveMarket(
        uint256 _marketId,
        Outcome _winningOutcome
    ) external onlyOracle {
        Market storage market = markets[_marketId];
        require(
            market.state == MarketState.Active,
            "Market not in Active state"
        );
        require(
            block.timestamp >= market.marketEndTime,
            "Market has not reached settlement time"
        );

        market.state = MarketState.Resolved;
        market.winningOutcome = _winningOutcome;

        emit MarketResolved(_marketId, _winningOutcome);
    }

    function claimPayout(uint256 _marketId) external {
        Market storage market = markets[_marketId];
        require(
            market.state == MarketState.Resolved,
            "Market not resolved yet"
        );

        uint256 winnings = 0;
        uint256 totalPool = market.totalYesPool + market.totalNoPool;

        if (market.winningOutcome == Outcome.YES) {
            uint256 userShares = yesShares[_marketId][msg.sender];
            require(userShares > 0, "No winning YES shares found");

            yesShares[_marketId][msg.sender] = 0;

            //Multiply user shares by total pool before executing division math
            winnings = (userShares * totalPool) / market.totalYesPool;
        } else if (market.winningOutcome == Outcome.NO) {
            uint256 userShares = noShares[_marketId][msg.sender];
            require(userShares > 0, "No winning NO shares found");

            noShares[_marketId][msg.sender] = 0;

            //Multiply user shares by total pool before executing division math
            winnings = (userShares * totalPool) / market.totalNoPool;
        } else {
            uint256 userYes = yesShares[_marketId][msg.sender];
            uint256 userNo = noShares[_marketId][msg.sender];
            winnings = userYes + userNo;
            require(winnings > 0, "No assets tied to pool query allocation");

            yesShares[_marketId][msg.sender] = 0;
            noShares[_marketId][msg.sender] = 0;
        }

        uint256 platformFee = (winnings * PLATFORM_FEE_BPS) / 10000;
        uint256 netWinnings = winnings - platformFee;
        decPool += platformFee;

        emit PayoutClaimed(_marketId, msg.sender, netWinnings);

        (bool success, ) = address(msg.sender).call{value: netWinnings}("");
        require(success, "Payout transfer execution failed");
    }

    function claimCreatorYield(uint256 _marketId) external {
        Market storage market = markets[_marketId];
        require(
            market.state == MarketState.Resolved,
            "Market must be resolved"
        );
        require(msg.sender == market.creator, "Only market creator can claim");
        require(!market.creatorFeeClaimed, "Yield already claimed");

        market.creatorFeeClaimed = true;

        uint256 totalPool = market.totalYesPool + market.totalNoPool;
        uint256 totalYield = (totalPool * CREATOR_FEE_BPS) / 10000;

        emit CreatorYieldClaimed(_marketId, msg.sender, totalYield);

        (bool success, ) = address(market.creator).call{value: totalYield}("");
        require(success, "Yield settlement routing failed");
    }

    // --- GOVERNANCE INTERFACE ENGINE ---

    function joinCommittee() external payable {
        require(
            msg.value == MARKET_STAKE,
            "Must lock active entry requirement allocation"
        );
        require(!isDecMember[msg.sender], "Already registered as member node");

        isDecMember[msg.sender] = true;
        totalDecMembers++;
    }

    function claimDecRewards() external {
        require(
            isDecMember[msg.sender],
            "Not a valid committee validator credential node"
        );
        require(
            totalDecMembers > 0,
            "Zero division safety protocol constraint flag"
        );

        uint256 totalSharePerNode = decPool / totalDecMembers;
        uint256 claimable = totalSharePerNode -
            decRewardsClaimedTracker[msg.sender];
        require(
            claimable > 0,
            "All outstanding committee network yields claimed"
        );

        decRewardsClaimedTracker[msg.sender] = totalSharePerNode;

        emit DecRewardsClaimed(msg.sender, claimable);

        (bool success, ) = address(msg.sender).call{value: claimable}("");
        require(success, "Rewards distribution failed");
    }

    // --- ADMINISTRATION SYSTEM OPERATIONS ---

    function updateOracle(address _newOracle) external onlyOwner {
        require(
            _newOracle != address(0),
            "New oracle cannot be the zero address"
        );

        address oldOracle = oracle;
        oracle = _newOracle;

        emit OracleUpdated(oldOracle, _newOracle);
    }
}
