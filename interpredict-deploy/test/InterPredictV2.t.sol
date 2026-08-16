// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {InterPredictV2} from "../contracts/InterPredictV2.sol";

contract InterPredictV2Test is Test {
    InterPredictV2 internal market;
    address internal admin;
    address internal treasury;
    address internal team;
    address internal dec1;
    address internal dec2;
    address internal dec3;
    address internal user1;
    address internal user2;

    bytes32 internal constant TEAM_ROLE = keccak256("TEAM_MARKET_ROLE");
    bytes32 internal constant ADMIN_ROLE = keccak256("ADMIN_VERIFIER_ROLE");

    uint256 internal constant PROPOSAL_FEE = 1 ether;
    uint256 internal constant SEED_AMOUNT = 10 ether;
    uint256 internal constant DAY = 24 hours;

    // State enum indices
    uint8 internal constant S_PROPOSED = 0;
    uint8 internal constant S_DEC_REVIEW = 1;
    uint8 internal constant S_REJECTED = 2;
    uint8 internal constant S_CANCELLED = 3;
    uint8 internal constant S_ACTIVE = 5;
    uint8 internal constant S_RES_REQ = 8;
    uint8 internal constant S_ADMIN_VER = 10;
    uint8 internal constant S_CONFIRMED = 11;
    uint8 internal constant S_FINALIZED = 12;

    function setUp() public {
        admin = makeAddr("admin");
        treasury = makeAddr("treasury");
        team = makeAddr("team");
        dec1 = makeAddr("dec1");
        dec2 = makeAddr("dec2");
        dec3 = makeAddr("dec3");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(team, 100 ether);

        market = new InterPredictV2(payable(treasury), admin);
        vm.startPrank(admin);
        market.grantRole(TEAM_ROLE, team);
        market.addDecMember(dec1);
        market.addDecMember(dec2);
        market.addDecMember(dec3);
        vm.stopPrank();
    }

    function _params() internal view returns (InterPredictV2.MarketParams memory) {
        string[] memory outcomes = new string[](2);
        outcomes[0] = "Yes";
        outcomes[1] = "No";
        return InterPredictV2.MarketParams({
            question: "Will Interlink process 10M transactions this week?",
            description: "A test market",
            category: InterPredictV2.Category.Crypto,
            customCategory: "",
            thumbnailUri: "https://example.com/thumb.png",
            outcomes: outcomes,
            endTime: block.timestamp + 7 days,
            resolutionCriteria: "Resolved by official Interlink stats"
        });
    }

    function _deployTeamMarket() internal returns (uint256) {
        vm.prank(team);
        return market.deployTeamMarket{value: SEED_AMOUNT}(_params());
    }

    function _proposeAndEnter() internal returns (uint256) {
        vm.prank(user1);
        uint256 id = market.proposeMarket{value: PROPOSAL_FEE + SEED_AMOUNT}(_params());
        vm.prank(user1);
        market.enterProposalReview(id);
        return id;
    }

    // ------------------------------------------------------------------
    // Deployment
    // ------------------------------------------------------------------
    function test_Deployment_SetsTreasuryAndRoles() public view {
        assertEq(market.treasury(), treasury);
        assertTrue(market.hasRole(ADMIN_ROLE, admin));
        assertTrue(market.hasRole(market.DEFAULT_ADMIN_ROLE(), admin));
    }

    // ------------------------------------------------------------------
    // Team market deployment
    // ------------------------------------------------------------------
    function test_TeamMarket_DeploysToActive() public {
        uint256 id = _deployTeamMarket();
        assertEq(uint8(market.marketState(id)), S_ACTIVE);
        assertEq(market.totalMarkets(), 1);
    }

    function test_TeamMarket_RejectsNonTeam() public {
        vm.prank(user1);
        // onlyRole(TEAM_ROLE) reverts with OpenZeppelin's AccessControlUnauthorizedAccount
        vm.expectRevert();
        market.deployTeamMarket{value: SEED_AMOUNT}(_params());
    }

    function test_TeamMarket_RejectsInsufficientSeed() public {
        vm.prank(team);
        vm.expectRevert(InterPredictV2.InsufficientFee.selector);
        market.deployTeamMarket{value: 5 ether}(_params());
    }

    function test_TeamMarket_RejectsInvalidEndTime() public {
        InterPredictV2.MarketParams memory p = _params();
        p.endTime = block.timestamp; // equal to now → endTime <= block.timestamp
        vm.prank(team);
        vm.expectRevert(InterPredictV2.InvalidEndTime.selector);
        market.deployTeamMarket{value: SEED_AMOUNT}(p);
    }

    function test_TeamMarket_RejectsDuplicateOutcomes() public {
        InterPredictV2.MarketParams memory p = _params();
        p.outcomes[1] = "Yes";
        vm.prank(team);
        vm.expectRevert(InterPredictV2.DuplicateOutcome.selector);
        market.deployTeamMarket{value: SEED_AMOUNT}(p);
    }

    function test_TeamMarket_RejectsTooFewOutcomes() public {
        InterPredictV2.MarketParams memory p = _params();
        string[] memory outcomes = new string[](1);
        outcomes[0] = "OnlyOne";
        p.outcomes = outcomes;
        vm.prank(team);
        vm.expectRevert(InterPredictV2.InvalidOutcomes.selector);
        market.deployTeamMarket{value: SEED_AMOUNT}(p);
    }

    function test_TeamMarket_RejectsTooManyOutcomes() public {
        InterPredictV2.MarketParams memory p = _params();
        string[] memory outcomes = new string[](5);
        outcomes[0] = "A";
        outcomes[1] = "B";
        outcomes[2] = "C";
        outcomes[3] = "D";
        outcomes[4] = "E";
        p.outcomes = outcomes;
        vm.prank(team);
        vm.expectRevert(InterPredictV2.InvalidOutcomes.selector);
        market.deployTeamMarket{value: SEED_AMOUNT}(p);
    }

    // ------------------------------------------------------------------
    // Community proposal
    // ------------------------------------------------------------------
    function test_Proposal_CreatesInProposedState() public {
        vm.prank(user1);
        uint256 id = market.proposeMarket{value: PROPOSAL_FEE + SEED_AMOUNT}(_params());
        assertEq(uint8(market.marketState(id)), S_PROPOSED);
        assertEq(market.totalMarkets(), 1);
    }

    function test_Proposal_RejectsWrongFee() public {
        vm.prank(user1);
        vm.expectRevert(InterPredictV2.InsufficientFee.selector);
        market.proposeMarket{value: SEED_AMOUNT}(_params());
    }

    function test_Proposal_RejectsEmptyQuestion() public {
        InterPredictV2.MarketParams memory p = _params();
        p.question = "";
        vm.prank(user1);
        vm.expectRevert(InterPredictV2.InvalidQuestion.selector);
        market.proposeMarket{value: PROPOSAL_FEE + SEED_AMOUNT}(p);
    }

    // ------------------------------------------------------------------
    // Proposal voting
    // ------------------------------------------------------------------
    function test_ProposalVoting_EntersDecReview() public {
        uint256 id = _proposeAndEnter();
        assertEq(uint8(market.marketState(id)), S_DEC_REVIEW);
    }

    function test_ProposalVoting_RejectsNonDec() public {
        uint256 id = _proposeAndEnter();
        vm.prank(user2);
        vm.expectRevert(InterPredictV2.NotActiveDEC.selector);
        market.voteOnProposal(id, InterPredictV2.ProposalVote.Approve);
    }

    function test_ProposalVoting_RecordsVotes() public {
        uint256 id = _proposeAndEnter();
        vm.prank(dec1);
        market.voteOnProposal(id, InterPredictV2.ProposalVote.Approve);
        vm.prank(dec2);
        market.voteOnProposal(id, InterPredictV2.ProposalVote.Reject);

        (,, uint256 approvalVotes, uint256 rejectionVotes,,,,,,) = market.marketVoting(id);
        assertEq(approvalVotes, 1);
        assertEq(rejectionVotes, 1);
    }

    function test_ProposalVoting_RejectsDuplicateVote() public {
        uint256 id = _proposeAndEnter();
        vm.prank(dec1);
        market.voteOnProposal(id, InterPredictV2.ProposalVote.Approve);
        vm.prank(dec1);
        vm.expectRevert(InterPredictV2.InvalidMarketState.selector);
        market.voteOnProposal(id, InterPredictV2.ProposalVote.Approve);
    }

    function test_ProposalVoting_ApprovesWhenApproveGreater() public {
        uint256 id = _proposeAndEnter();
        vm.prank(dec1);
        market.voteOnProposal(id, InterPredictV2.ProposalVote.Approve);
        vm.prank(dec2);
        market.voteOnProposal(id, InterPredictV2.ProposalVote.Approve);
        vm.prank(dec3);
        market.voteOnProposal(id, InterPredictV2.ProposalVote.Reject);

        vm.warp(block.timestamp + DAY + 1);
        market.finalizeProposalVoting(id);
        assertEq(uint8(market.marketState(id)), S_ACTIVE);
    }

    function test_ProposalVoting_RejectsWhenRejectGreater() public {
        uint256 id = _proposeAndEnter();
        vm.prank(dec1);
        market.voteOnProposal(id, InterPredictV2.ProposalVote.Reject);
        vm.prank(dec2);
        market.voteOnProposal(id, InterPredictV2.ProposalVote.Reject);
        vm.prank(dec3);
        market.voteOnProposal(id, InterPredictV2.ProposalVote.Approve);

        vm.warp(block.timestamp + DAY + 1);
        market.finalizeProposalVoting(id);
        assertEq(uint8(market.marketState(id)), S_REJECTED);
    }

    function test_ProposalVoting_CancelsWhenNoVotes() public {
        uint256 id = _proposeAndEnter();
        vm.warp(block.timestamp + DAY + 1);
        market.finalizeProposalVoting(id);
        assertEq(uint8(market.marketState(id)), S_CANCELLED);
    }

    function test_ProposalVoting_CannotFinalizeBeforeDeadline() public {
        uint256 id = _proposeAndEnter();
        vm.expectRevert(InterPredictV2.InvalidMarketState.selector);
        market.finalizeProposalVoting(id);
    }

    // ------------------------------------------------------------------
    // Participation
    // ------------------------------------------------------------------
    function test_Participation_Records() public {
        uint256 id = _deployTeamMarket();
        vm.prank(user1);
        market.participate{value: 1 ether}(id, 0, 1);
        assertTrue(market.hasParticipated(id, user1));
        (uint256 totalVolume, uint256 participantCount,,,,,,) = market.marketFinance(id);
        assertEq(totalVolume, 1 ether);
        assertEq(participantCount, 1);
    }

    function test_Participation_RejectsDuplicate() public {
        uint256 id = _deployTeamMarket();
        vm.prank(user1);
        market.participate{value: 1 ether}(id, 0, 1);
        vm.prank(user1);
        vm.expectRevert(InterPredictV2.AlreadyParticipated.selector);
        market.participate{value: 1 ether}(id, 1, 1);
    }

    function test_Participation_RejectsBelowMinStake() public {
        uint256 id = _deployTeamMarket();
        vm.prank(user1);
        vm.expectRevert(InterPredictV2.InvalidMarketState.selector);
        market.participate{value: 0.0001 ether}(id, 0, 1);
    }

    function test_Participation_RejectsInvalidOutcome() public {
        uint256 id = _deployTeamMarket();
        vm.prank(user1);
        vm.expectRevert(InterPredictV2.InvalidMarketState.selector);
        market.participate{value: 1 ether}(id, 5, 1);
    }

    function test_Participation_RejectsAfterEndTime() public {
        uint256 id = _deployTeamMarket();
        vm.warp(block.timestamp + 8 days);
        vm.prank(user1);
        vm.expectRevert(InterPredictV2.InvalidMarketState.selector);
        market.participate{value: 1 ether}(id, 0, 1);
    }

    // ------------------------------------------------------------------
    // Resolution
    // ------------------------------------------------------------------
    function _deployAndEnd() internal returns (uint256) {
        InterPredictV2.MarketParams memory p = _params();
        p.endTime = block.timestamp + 2 days;
        vm.prank(team);
        uint256 id = market.deployTeamMarket{value: SEED_AMOUNT}(p);
        vm.prank(user1);
        market.participate{value: 1 ether}(id, 0, 1);
        vm.warp(block.timestamp + 2 days + 1);
        return id;
    }

    function test_Resolution_TraderCanRequest() public {
        uint256 id = _deployAndEnd();
        vm.prank(user1);
        market.requestResolution(id);
        assertEq(uint8(market.marketState(id)), S_RES_REQ);
    }

    function test_Resolution_RejectsBeforeEndTime() public {
        uint256 id = _deployTeamMarket();
        vm.prank(user1);
        market.participate{value: 1 ether}(id, 0, 1);
        vm.prank(user1);
        vm.expectRevert(InterPredictV2.MarketNotEnded.selector);
        market.requestResolution(id);
    }

    function test_Resolution_RejectsUnauthorized() public {
        uint256 id = _deployAndEnd();
        vm.prank(user2);
        vm.expectRevert(InterPredictV2.Unauthorized.selector);
        market.requestResolution(id);
    }

    function test_Resolution_RecordsDecVotes() public {
        uint256 id = _deployAndEnd();
        vm.prank(user1);
        market.requestResolution(id);
        vm.prank(dec1);
        market.voteOnResolution(id, 0);
        vm.prank(dec2);
        market.voteOnResolution(id, 0);

        (,, uint256 totalResolutionVotes,,,) = market.marketResolution(id);
        assertEq(totalResolutionVotes, 2);
    }

    function test_Resolution_RejectsDuplicateVote() public {
        uint256 id = _deployAndEnd();
        vm.prank(user1);
        market.requestResolution(id);
        vm.prank(dec1);
        market.voteOnResolution(id, 0);
        vm.prank(dec1);
        vm.expectRevert(InterPredictV2.AlreadyVoted.selector);
        market.voteOnResolution(id, 0);
    }

    function test_Resolution_RejectsNonDecVote() public {
        uint256 id = _deployAndEnd();
        vm.prank(user1);
        market.requestResolution(id);
        vm.prank(user2);
        vm.expectRevert(InterPredictV2.NotActiveDEC.selector);
        market.voteOnResolution(id, 0);
    }

    function test_Resolution_FullFlowToFinalized() public {
        uint256 id = _deployAndEnd();
        vm.prank(user1);
        market.requestResolution(id);
        vm.prank(dec1);
        market.voteOnResolution(id, 0);
        vm.prank(dec2);
        market.voteOnResolution(id, 0);
        vm.prank(dec3);
        market.voteOnResolution(id, 0);

        market.finalizeResolutionVoting(id);
        assertEq(uint8(market.marketState(id)), S_ADMIN_VER);

        vm.prank(admin);
        market.confirmOutcome(id, 0, "");
        assertEq(uint8(market.marketState(id)), S_CONFIRMED);

        market.finalizeMarket(id);
        assertEq(uint8(market.marketState(id)), S_FINALIZED);
    }

    function test_Resolution_RejectsNonAdminConfirm() public {
        uint256 id = _deployAndEnd();
        vm.prank(user1);
        market.requestResolution(id);
        vm.prank(dec1);
        market.voteOnResolution(id, 0);
        market.finalizeResolutionVoting(id);
        vm.prank(user1);
        vm.expectRevert();
        market.confirmOutcome(id, 0, "");
    }

    // ------------------------------------------------------------------
    // Claims
    // ------------------------------------------------------------------
    function _finalizeMarket() internal returns (uint256) {
        uint256 id = _deployAndEnd();
        vm.prank(user1);
        market.requestResolution(id);
        vm.prank(dec1);
        market.voteOnResolution(id, 0);
        vm.prank(dec2);
        market.voteOnResolution(id, 0);
        vm.prank(dec3);
        market.voteOnResolution(id, 0);
        market.finalizeResolutionVoting(id);
        vm.prank(admin);
        market.confirmOutcome(id, 0, "");
        market.finalizeMarket(id);
        return id;
    }

    function test_Claims_WinningParticipantCanClaim() public {
        uint256 id = _finalizeMarket();
        vm.prank(user1);
        market.claimWinnings(id);
        assertTrue(market.hasClaimedWinnings(id, user1));
    }

    function test_Claims_RejectsDoubleClaim() public {
        uint256 id = _finalizeMarket();
        vm.prank(user1);
        market.claimWinnings(id);
        vm.prank(user1);
        vm.expectRevert(InterPredictV2.InvalidMarketState.selector);
        market.claimWinnings(id);
    }

    function test_Claims_RejectsNonParticipant() public {
        uint256 id = _finalizeMarket();
        vm.prank(user2);
        vm.expectRevert(InterPredictV2.NothingToClaim.selector);
        market.claimWinnings(id);
    }

    // ------------------------------------------------------------------
    // DEC membership
    // ------------------------------------------------------------------
    function test_Dec_AddAndRemove() public {
        vm.prank(admin);
        market.addDecMember(user1);
        assertTrue(market.isActiveDecMember(user1));

        vm.prank(admin);
        market.removeDecMember(user1);
        assertFalse(market.isActiveDecMember(user1));
    }

    function test_Dec_RejectsDuplicateAdd() public {
        vm.prank(admin);
        vm.expectRevert(InterPredictV2.Unauthorized.selector);
        market.addDecMember(dec1);
    }

    function test_Dec_RejectsNonAdminAdd() public {
        vm.prank(user1);
        vm.expectRevert();
        market.addDecMember(user2);
    }

    // ------------------------------------------------------------------
    // Cancellation
    // ------------------------------------------------------------------
    function test_Cancel_AdminCanCancel() public {
        uint256 id = _deployTeamMarket();
        vm.prank(admin);
        market.cancelMarket(id, "Test cancel", "");
        assertEq(uint8(market.marketState(id)), S_CANCELLED);
    }

    function test_Cancel_NonAdminCannotCancel() public {
        uint256 id = _deployTeamMarket();
        vm.prank(user1);
        vm.expectRevert();
        market.cancelMarket(id, "Test", "");
    }

    function test_Cancel_CannotCancelFinalized() public {
        uint256 id = _finalizeMarket();
        vm.prank(admin);
        vm.expectRevert(InterPredictV2.InvalidMarketState.selector);
        market.cancelMarket(id, "Test", "");
    }

    // ------------------------------------------------------------------
    // Pause
    // ------------------------------------------------------------------
    function test_Pause_PausesAndUnpauses() public {
        vm.prank(admin);
        market.pause();
        vm.prank(team);
        vm.expectRevert();
        market.deployTeamMarket{value: SEED_AMOUNT}(_params());

        vm.prank(admin);
        market.unpause();
        _deployTeamMarket();
        assertEq(market.totalMarkets(), 1);
    }
}