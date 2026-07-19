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
        bool oracleResolutionRequested;
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
    event OracleResolutionRequested(
        uint256 indexed marketId,
        string question,
        uint256 marketEndTime
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
    // 🆕 NEW: lets the frontend build a full DEC member directory
    event DecMemberJoined(address indexed member, uint256 timestamp);

    // --- STATE VARIABLES ---
    address public immutable owner;
    address public oracle;

    uint256 public constant MARKET_STAKE = 1 ether; // Native ITL Stake
    uint256 public constant VOTING_DURATION = 1 days;

    // 🧮 Dynamically Evaluated Platform Fee Structure (5.0% Total)
    uint256 public constant TOTAL_PLATFORM_FEE_BPS = 500; // 5.0% flat fee deducted from total winnings
    uint256 public constant DEC_POOL_FEE_BPS = 200; // 2.0% allocated to the DEC Committee Pool
    uint256 public constant CREATOR_FEE_BPS = 100; // 1.0% allocated to non-team creators
    uint256 public constant TEAM_BASE_FEE_BPS = 200; // 2.0% allocated to team on community markets
    uint256 public constant TEAM_EXCLUSIVE_FEE_BPS = 300; // 3.0% allocated to team on team-created markets

    uint256 public totalMarkets;
    uint256 public decPool;
    uint256 public totalDecMembers;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public yesShares;
    mapping(uint256 => mapping(address => uint256)) public noShares;
    mapping(address => bool) public isDecMember;
    mapping(uint256 => mapping(address => bool)) public hasVotedOnCuration;
    mapping(address => uint256) public decRewardsClaimedTracker;

    // 🆕 NEW: enumerable list of DEC members for the admin directory UI
    address[] public decMemberList;

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
        oracle = _oracle; //  Settled to team wallet
    }

    // --- CORE LIFE-CYCLE FUNCTIONS ---

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
        require(!hasVotedOnCuration[_marketId][msg.sender], "Already voted");

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
            // ❌ The Proposal was REJECTED
            market.state = MarketState.Resolved;
            market.winningOutcome = Outcome.DRAW;

            // 🧮 10% Curation Penalty to Team Treasury, 90% Refund to Creator
            uint256 teamPenalty = (MARKET_STAKE * 1000) / 10000; // 10% (0.1 ITL)
            uint256 creatorRefund = MARKET_STAKE - teamPenalty; // 90% (0.9 ITL)

            // 1. Send 10% penalty to the Team Treasury Address
            address payable treasury = payable(
                0x6E832252eA4c78068EE109d953724D2762431992
            );
            (bool successTeam, ) = treasury.call{value: teamPenalty}("");
            require(successTeam, "Team penalty routing failed");

            // 2. Send 90% refund back to the Creator's Wallet
            (bool successCreator, ) = address(market.creator).call{
                value: creatorRefund
            }("");
            require(successCreator, "Refund failed");
        }
    }

    function buyShares(uint256 _marketId, bool _isYes) external payable {
        Market storage market = markets[_marketId];
        require(market.state == MarketState.Active, "Market is not active");
        require(block.timestamp < market.marketEndTime, "Trading closed");
        require(msg.value > 0, "Wager must be > 0");

        if (_isYes) {
            yesShares[_marketId][msg.sender] += msg.value;
            market.totalYesPool += msg.value;
        } else {
            noShares[_marketId][msg.sender] += msg.value;
            market.totalNoPool += msg.value;
        }

        emit SharePurchased(_marketId, msg.sender, _isYes, msg.value);
    }

    // --- AUTOMATED FIRST-PARTY ORACLE SIGNALER ---

    function requestOracleResolution(uint256 _marketId) external {
        Market storage market = markets[_marketId];
        require(market.state == MarketState.Active, "Market is not active");

        require(
            block.timestamp >= market.marketEndTime,
            "Trading window is still active"
        );
        require(
            !market.oracleResolutionRequested,
            "Oracle resolution already initialized"
        );

        market.oracleResolutionRequested = true;

        emit OracleResolutionRequested(
            _marketId,
            market.question,
            market.marketEndTime
        );
    }

    // --- SETTLEMENT LAYER ---

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

        // 🟢 LOCAL SCOPE BLOCK: Eradicates the compiler "Stack too deep" bug in slither
        {
            uint256 totalPool = market.totalYesPool + market.totalNoPool;

            if (market.winningOutcome == Outcome.YES) {
                uint256 userShares = yesShares[_marketId][msg.sender];
                require(userShares > 0, "No winning YES shares found");

                yesShares[_marketId][msg.sender] = 0;
                winnings = (userShares * totalPool) / market.totalYesPool;
            } else if (market.winningOutcome == Outcome.NO) {
                uint256 userShares = noShares[_marketId][msg.sender];
                require(userShares > 0, "No winning NO shares found");

                noShares[_marketId][msg.sender] = 0;
                winnings = (userShares * totalPool) / market.totalNoPool;
            } else {
                uint256 userYes = yesShares[_marketId][msg.sender];
                uint256 userNo = noShares[_marketId][msg.sender];
                winnings = userYes + userNo;
                require(
                    winnings > 0,
                    "No assets tied to pool query allocation"
                );

                yesShares[_marketId][msg.sender] = 0;
                noShares[_marketId][msg.sender] = 0;
            }
        }

        // 🧮 Compute total 5.0% flat fee and 2.0% DEC fee
        uint256 totalPlatformFee = (winnings * TOTAL_PLATFORM_FEE_BPS) / 10000; // 5.0% Total
        uint256 decFeeAllocation = (winnings * DEC_POOL_FEE_BPS) / 10000; // 2.0% to DEC Pool

        uint256 teamTreasuryFee;
        uint256 creatorFee = 0;

        // Dynamic Allocation Rule: Did the Team (Owner) deploy this market?
        if (market.creator == owner) {
            // Team Market: 3% goes to Team Treasury (Creator share is absorbed)
            teamTreasuryFee = (winnings * TEAM_EXCLUSIVE_FEE_BPS) / 10000;
        } else {
            // Community Market: 2% goes to Team, leaving 1% in escrow for automatic creator release
            teamTreasuryFee = (winnings * TEAM_BASE_FEE_BPS) / 10000;
            creatorFee = totalPlatformFee - decFeeAllocation - teamTreasuryFee; // Exactly 1.0% (100 BPS equivalent)
        }

        uint256 netWinnings = winnings - totalPlatformFee;

        // 1. Accumulate the 2% fee in the DEC pool for committee claims
        decPool += decFeeAllocation;

        emit PayoutClaimed(_marketId, msg.sender, netWinnings);

        // Define target team treasury address
        address payable treasury = payable(
            0x6E832252eA4c78068EE109d953724D2762431992
        );

        // 2. Route the designated fee instantly to the Team Treasury Wallet
        (bool successTeam, ) = treasury.call{value: teamTreasuryFee}("");
        require(successTeam, "Team platform fee routing failed");

        // 3. AUTOMATIC NON-BLOCKING PUSH: Instantly release the 1.0% creator fee to community creator
        if (creatorFee > 0 && market.creator != address(0)) {
            (bool successCreator, ) = payable(market.creator).call{
                value: creatorFee
            }("");
            if (!successCreator) {
                // 🟢 FALLBACK CATCH: If the creator's wallet reverts (e.g. broken contract),
                // automatically reroute the 1% creator fee to the Team Treasury so they can manually handle it!
                (bool successFallback, ) = treasury.call{value: creatorFee}("");
                require(successFallback, "Fallback treasury routing failed");
            }
        }

        // 4. Send the remaining net winnings back to the claiming user
        (bool successUser, ) = address(msg.sender).call{value: netWinnings}("");
        require(successUser, "Payout transfer execution failed");
    }

    // 🟢 SECURED: Stops reentrancy on native mobile wallets!
    function joinCommittee() external payable {
        require(msg.value == 0.1 ether, "Incorrect registration fee");
        require(!isDecMember[msg.sender], "Already a member");

        // 1. Effects Step: Update all state variables FIRST (Stops Reentrancy!)
        isDecMember[msg.sender] = true;
        totalDecMembers++;
        decMemberList.push(msg.sender); // 🆕 NEW: track member for the directory

        // 2. Interaction Step: Perform the external token transfer LAST
        address payable treasury = payable(
            0x6E832252eA4c78068EE109d953724D2762431992
        );
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "Treasury transfer failed");

        emit DecMemberJoined(msg.sender, block.timestamp); // 🆕 NEW
    }

    // 🆕 NEW: lets the frontend fetch the full DEC member directory in one call
    function getAllDecMembers() external view returns (address[] memory) {
        return decMemberList;
    }

    function claimDecRewards() external {
        require(isDecMember[msg.sender], "Only committee members can claim");
        require(totalDecMembers > 0, "No active members registered");

        // 1. Calculate the staker's cumulative share of the decPool
        uint256 totalSharePerNode = decPool / totalDecMembers;

        // 2. Subtract what this specific staker has already withdrawn
        uint256 claimable = totalSharePerNode -
            decRewardsClaimedTracker[msg.sender];
        require(claimable > 0, "No claimable rewards available");

        // 3. Update their claimed tracker state BEFORE sending any assets (Prevents Reentrancy)
        decRewardsClaimedTracker[msg.sender] = totalSharePerNode;

        // 4. Send the rewards securely
        (bool success, ) = payable(msg.sender).call{value: claimable}("");
        require(success, "Rewards transfer failed");
    }

    function updateOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "New oracle cannot be zero address");
        address oldOracle = oracle;
        oracle = _newOracle;
        emit OracleUpdated(oldOracle, _newOracle);
    }
}
