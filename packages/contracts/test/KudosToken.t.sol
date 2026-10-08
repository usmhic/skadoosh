// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {KudosToken} from "../src/KudosToken.sol";

contract KudosTokenTest is Test {
    KudosToken internal token;

    address internal admin = makeAddr("admin");
    address internal operator = makeAddr("operator");
    address internal vault = makeAddr("vault");
    address internal bob = makeAddr("bob");
    uint256 internal alicePk = 0xA11CE;
    address internal alice = vm.addr(alicePk);

    uint256 internal constant ONE = 1e18;
    uint256 internal constant CAP = 1_000_000_000 * ONE;
    bytes32 internal constant REF = keccak256("ledger-op-1");

    bytes32 internal constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    event Issued(address indexed to, uint256 amount, bytes32 indexed ref);
    event Redeemed(address indexed from, uint256 amount, bytes32 indexed ref);

    function setUp() public {
        token = new KudosToken(admin, operator, CAP, 2 days);
        vm.startPrank(admin);
        token.grantRole(token.VAULT_ROLE(), vault);
        vm.stopPrank();
    }

    // ── Metadata & roles ─────────────────────────────────────────────────────

    function test_metadata() public view {
        assertEq(token.name(), "Kudos");
        assertEq(token.symbol(), "KUDOS");
        assertEq(token.decimals(), 18);
        assertEq(token.cap(), CAP);
        assertFalse(token.transfersOpen());
    }

    function test_roles() public view {
        assertEq(token.defaultAdmin(), admin);
        assertTrue(token.hasRole(token.MINTER_ROLE(), operator));
        assertTrue(token.hasRole(token.REDEEMER_ROLE(), operator));
        assertTrue(token.hasRole(token.PAUSER_ROLE(), operator));
        assertFalse(token.hasRole(token.MINTER_ROLE(), admin));
    }

    function test_constructor_rejectsZeroOperator() public {
        vm.expectRevert(KudosToken.ZeroAddress.selector);
        new KudosToken(admin, address(0), CAP, 2 days);
    }

    // ── Minting ──────────────────────────────────────────────────────────────

    function test_mint_emitsIssued() public {
        vm.expectEmit(address(token));
        emit Issued(alice, 5 * ONE, REF);
        vm.prank(operator);
        token.mint(alice, 5 * ONE, REF);
        assertEq(token.balanceOf(alice), 5 * ONE);
        assertEq(token.totalSupply(), 5 * ONE);
    }

    function test_mint_onlyMinter() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, bob, token.MINTER_ROLE()
            )
        );
        vm.prank(bob);
        token.mint(bob, ONE, REF);
    }

    function test_mint_rejectsZero() public {
        vm.startPrank(operator);
        vm.expectRevert(KudosToken.ZeroAddress.selector);
        token.mint(address(0), ONE, REF);
        vm.expectRevert(KudosToken.ZeroAmount.selector);
        token.mint(alice, 0, REF);
        vm.stopPrank();
    }

    function test_mint_respectsCap() public {
        vm.prank(operator);
        token.mint(alice, CAP, REF);
        vm.expectRevert(abi.encodeWithSelector(ERC20Capped.ERC20ExceededCap.selector, CAP + 1, CAP));
        vm.prank(operator);
        token.mint(alice, 1, REF);
    }

    // ── Closed-loop transfers ────────────────────────────────────────────────

    function test_transfer_restrictedBetweenHolders() public {
        _mint(alice, 3);
        vm.expectRevert(abi.encodeWithSelector(KudosToken.TransfersRestricted.selector, alice, bob));
        vm.prank(alice);
        token.transfer(bob, ONE);
    }

    function test_transfer_allowedToAndFromVault() public {
        _mint(alice, 3);
        vm.prank(alice);
        token.transfer(vault, ONE);
        vm.prank(vault);
        token.transfer(bob, ONE);
        assertEq(token.balanceOf(bob), ONE);
    }

    function test_openTransfers_isAdminOnlyAndUnlocksTransfers() public {
        _mint(alice, 3);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, operator, bytes32(0)
            )
        );
        vm.prank(operator);
        token.openTransfers();

        vm.prank(admin);
        token.openTransfers();
        assertTrue(token.transfersOpen());
        vm.prank(alice);
        token.transfer(bob, ONE);
        assertEq(token.balanceOf(bob), ONE);
    }

    // ── Redemption ───────────────────────────────────────────────────────────

    function test_redeemWithPermit_burnsGaslessly() public {
        _mint(alice, 10);
        (uint8 v, bytes32 r, bytes32 s, uint256 deadline) = _permit(alicePk, operator, 4 * ONE);

        vm.expectEmit(address(token));
        emit Redeemed(alice, 4 * ONE, REF);
        vm.prank(operator);
        token.redeemWithPermit(alice, 4 * ONE, REF, deadline, v, r, s);

        assertEq(token.balanceOf(alice), 6 * ONE);
        assertEq(token.totalSupply(), 6 * ONE);
        assertEq(token.allowance(alice, operator), 0);
        assertEq(token.nonces(alice), 1);
    }

    function test_redeemWithPermit_survivesFrontRunPermit() public {
        _mint(alice, 10);
        (uint8 v, bytes32 r, bytes32 s, uint256 deadline) = _permit(alicePk, operator, 4 * ONE);
        // An observer submits the permit first; redemption must still succeed.
        vm.prank(bob);
        token.permit(alice, operator, 4 * ONE, deadline, v, r, s);
        vm.prank(operator);
        token.redeemWithPermit(alice, 4 * ONE, REF, deadline, v, r, s);
        assertEq(token.balanceOf(alice), 6 * ONE);
    }

    function test_redeemWithPermit_cannotReplay() public {
        _mint(alice, 10);
        (uint8 v, bytes32 r, bytes32 s, uint256 deadline) = _permit(alicePk, operator, 4 * ONE);
        vm.startPrank(operator);
        token.redeemWithPermit(alice, 4 * ONE, REF, deadline, v, r, s);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, operator, 0, 4 * ONE)
        );
        token.redeemWithPermit(alice, 4 * ONE, REF, deadline, v, r, s);
        vm.stopPrank();
    }

    function test_redeemWithPermit_rejectsExpiredSignature() public {
        _mint(alice, 10);
        (uint8 v, bytes32 r, bytes32 s, uint256 deadline) = _permit(alicePk, operator, 4 * ONE);
        vm.warp(deadline + 1);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, operator, 0, 4 * ONE)
        );
        vm.prank(operator);
        token.redeemWithPermit(alice, 4 * ONE, REF, deadline, v, r, s);
    }

    function test_redeemWithPermit_rejectsForgedSigner() public {
        _mint(alice, 10);
        (uint8 v, bytes32 r, bytes32 s, uint256 deadline) = _permit(0xB0B, operator, 4 * ONE);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, operator, 0, 4 * ONE)
        );
        vm.prank(operator);
        token.redeemWithPermit(alice, 4 * ONE, REF, deadline, v, r, s);
    }

    function test_redeem_withApproval() public {
        _mint(alice, 10);
        vm.prank(alice);
        token.approve(operator, 2 * ONE);
        vm.prank(operator);
        token.redeem(alice, 2 * ONE, REF);
        assertEq(token.balanceOf(alice), 8 * ONE);
    }

    function test_redeem_onlyRedeemer() public {
        _mint(alice, 10);
        vm.prank(alice);
        token.approve(bob, 2 * ONE);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, bob, token.REDEEMER_ROLE()
            )
        );
        vm.prank(bob);
        token.redeem(alice, 2 * ONE, REF);
    }

    // ── Pausing ──────────────────────────────────────────────────────────────

    function test_pause_blocksMovementAndOnlyAdminUnpauses() public {
        _mint(alice, 3);
        vm.prank(operator);
        token.pause();

        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(operator);
        token.mint(alice, ONE, REF);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(alice);
        token.transfer(vault, ONE);

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, operator, bytes32(0)
            )
        );
        vm.prank(operator);
        token.unpause();

        vm.prank(admin);
        token.unpause();
        vm.prank(operator);
        token.mint(alice, ONE, REF);
    }

    // ── Admin handover ───────────────────────────────────────────────────────

    function test_adminTransfer_isTwoStepWithDelay() public {
        address newAdmin = makeAddr("newAdmin");
        vm.prank(admin);
        token.beginDefaultAdminTransfer(newAdmin);

        vm.expectRevert();
        vm.prank(newAdmin);
        token.acceptDefaultAdminTransfer();

        vm.warp(block.timestamp + 2 days + 1);
        vm.prank(newAdmin);
        token.acceptDefaultAdminTransfer();
        assertEq(token.defaultAdmin(), newAdmin);
    }

    // ── Fuzz: supply always equals minted minus redeemed ─────────────────────

    function testFuzz_supplyConservation(uint256 minted, uint256 redeemed) public {
        minted = bound(minted, 1, CAP);
        uint256 redeemAmount = bound(redeemed, 1, minted);
        vm.prank(operator);
        token.mint(alice, minted, REF);

        (uint8 v, bytes32 r, bytes32 s, uint256 deadline) = _permit(alicePk, operator, redeemAmount);
        vm.prank(operator);
        token.redeemWithPermit(alice, redeemAmount, REF, deadline, v, r, s);

        assertEq(token.totalSupply(), minted - redeemAmount);
        assertEq(token.balanceOf(alice), token.totalSupply());
    }

    function testFuzz_holdersCannotTransferWhileClosed(address to, uint256 amount) public {
        vm.assume(to != address(0) && to != vault && to != alice);
        amount = bound(amount, 1, CAP);
        vm.prank(operator);
        token.mint(alice, amount, REF);
        vm.expectRevert(abi.encodeWithSelector(KudosToken.TransfersRestricted.selector, alice, to));
        vm.prank(alice);
        token.transfer(to, amount);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    function _mint(address to, uint256 wholeKudos) internal {
        vm.prank(operator);
        token.mint(to, wholeKudos * ONE, REF);
    }

    /// @dev Signs a permit for `alice`'s tokens with key `pk`. A key other than alice's
    ///      produces a forged signature, which the token must reject.
    function _permit(uint256 pk, address spender, uint256 value)
        internal
        view
        returns (uint8 v, bytes32 r, bytes32 s, uint256 deadline)
    {
        deadline = block.timestamp + 1 hours;
        bytes32 structHash =
            keccak256(abi.encode(PERMIT_TYPEHASH, alice, spender, value, token.nonces(alice), deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
        (v, r, s) = vm.sign(pk, digest);
    }
}
