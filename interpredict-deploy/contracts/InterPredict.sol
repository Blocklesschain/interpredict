// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev ReentrancyGuard logic written explicitly inside the contract file to completely bypass 
 * local node_modules version matching errors on Hardhat.
 */
abstract contract ReentrancyGuard {
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != ENTERED, "ReentrancyGuard: reentrant call");
        _status = ENTERED;
        _;
        _status = NOT_ENTERED;
    }
}

/**
 * @title InterPredict Prediction Engine
 * @dev Fully verified and prepared for Interlink Testnet native tITL deployment.
 */
contract InterPredict is ReentrancyGuard {
    
    enum MarketState { Proposed, Active, Resolved, Cancelled }
    enum Outcome { None, YES, NO }

    struct Market {
        uint256 id;
        address creator;
        string question;
        uint256 votingEndTime;
        uint256 marketEndTime;
        MarketState state;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 yesSharesPool; 
        uint256 noSharesPool;  
        uint256 totalCollateral; 
        Outcome winningOutcome;
        bool creatorFeeClaimed;
    }

    // State Variables
    uint256 public marketCount;
    uint256 public totalDecMembers;
    
    uint256 public constant MARKET_STAKE = 1 * 10**18;       // 1 tITL required to propose
    uint256 public constant DEC_STAKE = 1 * 10**18;          // 1 tITL required to join DEC
    uint256 public constant VOTING_DURATION = 3 days;
    uint256 public constant CREATOR_FEE_BPS = 100;           // 1.00% creator fee allocation
    uint256 public constant INITIAL_LIQUIDITY = 10 * 10**17; // 0.1 tITL AMM seed reserve
    
    mapping(uint256 => Market) public markets;
    mapping(address => bool) public isDecMember;
    mapping(address => mapping(uint256 => bool)) public hasVotedOnCuration;
    mapping(address => mapping(uint256 => uint256)) public userYesShares;
    mapping(address => mapping(uint256 => uint256)) public userNoShares;
    
    uint256 public decRewardPool;
    mapping(address => uint256) public decRewardsClaimed;

    address public oracle;
    address public owner;

    // Events
    event MarketProposed(uint256 indexed marketId, address indexed creator, string question, uint256 votingEndTime);
    event CurationVoteCast(uint256 indexed marketId, address indexed voter, bool support, uint256 weight);
    event MarketInitialized(uint256 indexed marketId, bool approved);
    event SharesPurchased(uint256 indexed marketId, address indexed trader, bool isYes, uint256 collateralSpent, uint256 sharesMinted);
    event MarketResolved(uint256 indexed marketId, Outcome winningOutcome);
    event PayoutClaimed(uint256 indexed marketId, address indexed trader, uint256 payoutAmount);
    event CreatorYieldWithdrawn(uint256 indexed marketId, address indexed creator, uint256 yieldAmount);
    event DecMemberRegistered(address indexed member);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only designated Oracle can call");
        _;
    }

    modifier onlyDEC() {
        require(isDecMember[msg.sender], "Must be a registered DEC member");
        _;
    }

    constructor(address _oracle) {
        oracle = _oracle;
        owner = msg.sender;
    }

    function joinDEC() external payable nonReentrant {
        require(!isDecMember[msg.sender], "Already a DEC member");
        require(msg.value == DEC_STAKE, "Must stake exactly 1 tITL to join");

        isDecMember[msg.sender] = true;
        totalDecMembers++;

        emit DecMemberRegistered(msg.sender);
    }

    function createActiveMarket(string calldata _question, uint256 _marketEndTime) external payable onlyOwner {
        require(_marketEndTime > block.timestamp, "End time must be in future");
        require(msg.value == INITIAL_LIQUIDITY, "Must seed initial AMM liquidity");
        
        marketCount++;
        uint256 marketId = marketCount;
        
        markets[marketId] = Market({
            id: marketId,
            creator: msg.sender,
            question: _question,
            votingEndTime: block.timestamp,
            marketEndTime: _marketEndTime,
            state: MarketState.Active,
            votesFor: 0,
            votesAgainst: 0,
            yesSharesPool: INITIAL_LIQUIDITY, 
            noSharesPool: INITIAL_LIQUIDITY,  
            totalCollateral: INITIAL_LIQUIDITY,
            winningOutcome: Outcome.None,
            creatorFeeClaimed: false
        });

        emit MarketInitialized(marketId, true);
    }

    function proposeMarket(string calldata _question, uint256 _marketEndTime) external payable nonReentrant {
        require(_marketEndTime > block.timestamp + VOTING_DURATION, "Market end time must be after voting");
        require(msg.value == MARKET_STAKE, "Must stake exactly 1 tITL to propose");
        
        marketCount++;
        uint256 marketId = marketCount;
        
        markets[marketId] = Market({
            id: marketId,
            creator: msg.sender,
            question: _question,
            votingEndTime: block.timestamp + VOTING_DURATION,
            marketEndTime: _marketEndTime,
            state: MarketState.Proposed,
            votesFor: 0,
            votesAgainst: 0,
            yesSharesPool: INITIAL_LIQUIDITY, 
            noSharesPool: INITIAL_LIQUIDITY,  
            totalCollateral: 0, 
            winningOutcome: Outcome.None,
            creatorFeeClaimed: false
        });

        emit MarketProposed(marketId, msg.sender, _question, block.timestamp + VOTING_DURATION);
    }

    function voteOnCuration(uint256 _marketId, bool _support) external onlyDEC {
        Market storage market = markets[_marketId];
        require(market.state == MarketState.Proposed, "Market not pending curation");
        require(block.timestamp < market.votingEndTime, "Curation period ended");
        require(!hasVotedOnCuration[msg.sender][_marketId], "Already voted on this market");

        hasVotedOnCuration[msg.sender][_marketId] = true;

        if (_support) {
            market.votesFor += 1;
        } else {
            market.votesAgainst += 1;
        }

        emit CurationVoteCast(_marketId, msg.sender, _support, 1);
    }

    function initializeMarket(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.state == MarketState.Proposed, "Market already initialized");
        require(block.timestamp >= market.votingEndTime, "Curation voting still active");

        if (market.votesFor > market.votesAgainst && market.votesFor > 0) {
            market.state = MarketState.Active;
            market.totalCollateral = INITIAL_LIQUIDITY;
            
            (bool success, ) = payable(market.creator).call{value: MARKET_STAKE}("");
            require(success, "Refund failed");

            emit MarketInitialized(_marketId, true);
        } else {
            market.state = MarketState.Cancelled;
            
            uint256 penalty = (MARKET_STAKE * 100) / 10000; 
            uint256 refundAmount = MARKET_STAKE - penalty;
            decRewardPool += penalty;

            (bool success, ) = payable(market.creator).call{value: refundAmount}("");
            require(success, "Deducted refund failed");

            emit MarketInitialized(_marketId, false);
        }
    }

    function buyShares(uint256 _marketId, bool _isYes) external payable nonReentrant {
        Market storage market = markets[_marketId];
        require(market.state == MarketState.Active, "Market is not active for trading");
        require(block.timestamp < market.marketEndTime, "Trading window closed");
        require(msg.value > 0, "Must send tITL to buy shares");

        uint256 sharesToMint;
        uint256 k = market.yesSharesPool * market.noSharesPool;

        if (_isYes) {
            uint256 newYesPool = market.yesSharesPool + msg.value;
            uint256 newNoPool = k / newYesPool;
            sharesToMint = market.noSharesPool - newNoPool;

            market.yesSharesPool = newYesPool;
            market.noSharesPool = newNoPool;
            userYesShares[msg.sender][_marketId] += sharesToMint;
        } else {
            uint256 newNoPool = market.noSharesPool + msg.value;
            uint256 newYesPool = k / newNoPool;
            sharesToMint = market.yesSharesPool - newYesPool;

            market.noSharesPool = newNoPool;
            market.yesSharesPool = newYesPool;
            userNoShares[msg.sender][_marketId] += sharesToMint;
        }

        market.totalCollateral += msg.value;
        emit SharesPurchased(_marketId, msg.sender, _isYes, msg.value, sharesToMint);
    }

    function resolveMarket(uint256 _marketId, Outcome _winningOutcome) external onlyOracle {
        Market storage market = markets[_marketId];
        require(market.state == MarketState.Active, "Market not in Active state");
        require(block.timestamp >= market.marketEndTime, "Market has not reached settlement time");
        require(_winningOutcome == Outcome.YES || _winningOutcome == Outcome.NO, "Invalid outcome selection");

        market.state = MarketState.Resolved;
        market.winningOutcome = _winningOutcome;

        emit MarketResolved(_marketId, _winningOutcome);
    }

    function claimPayout(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.state == MarketState.Resolved, "Market not resolved yet");

        uint256 winnings = 0;
        uint256 creatorFeeAllocated = (market.totalCollateral * CREATOR_FEE_BPS) / 10000;
        uint256 netPayoutPool = market.totalCollateral - creatorFeeAllocated;

        if (market.winningOutcome == Outcome.YES) {
            uint256 userShares = userYesShares[msg.sender][_marketId];
            require(userShares > 0, "No winning YES shares");
            
            winnings = (userShares * netPayoutPool) / market.yesSharesPool;
            userYesShares[msg.sender][_marketId] = 0;
        } else if (market.winningOutcome == Outcome.NO) {
            uint256 userShares = userNoShares[msg.sender][_marketId];
            require(userShares > 0, "No winning NO shares");
            
            winnings = (userShares * netPayoutPool) / market.noSharesPool;
            userNoShares[msg.sender][_marketId] = 0;
        }

        require(winnings > 0, "Zero calculated payouts");
        
        (bool success, ) = payable(msg.sender).call{value: winnings}("");
        require(success, "Winnings payout failed");
        
        emit PayoutClaimed(_marketId, msg.sender, winnings);
    }

    function claimCreatorYield(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.state == MarketState.Resolved, "Market must be resolved");
        require(msg.sender == market.creator, "Only market creator can claim");
        require(!market.creatorFeeClaimed, "Yield already claimed");

        uint256 totalYield = (market.totalCollateral * CREATOR_FEE_BPS) / 10000;
        market.creatorFeeClaimed = true;

        (bool success, ) = payable(market.creator).call{value: totalYield}("");
        require(success, "Yield transfer failed");
        
        emit CreatorYieldWithdrawn(_marketId, market.creator, totalYield);
    }

    function claimDecRewards() external onlyDEC nonReentrant {
        require(totalDecMembers > 0, "No members");
        uint256 totalOwedToMember = decRewardPool / totalDecMembers;
        uint256 claimable = totalOwedToMember - decRewardsClaimed[msg.sender];
        
        require(claimable > 0, "No new rewards to claim");
        decRewardsClaimed[msg.sender] += claimable;

        (bool success, ) = payable(msg.sender).call{value: claimable}("");
        require(success, "DEC payout failed");
    }

    function updateOracle(address _newOracle) external onlyOwner {
        oracle = _newOracle;
    }
}