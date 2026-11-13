// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";

/// @title Kudos
/// @notice The skaddosh appreciation token. One KUDOS (1e18 units) equals one Kudo in the app.
/// @dev Design goals (docs/CHAIN.md, docs/RESEARCH.md §5):
///  - Supply mirrors the off-chain ledger: Kudos are minted when a user exports Hot Kudos to their
///    wallet and burned when they return them. Every mint/burn carries a ledger reference.
///  - Closed loop by default: holders can only move Kudos to or from platform vault addresses.
///    Opening peer-to-peer transfers is a one-way admin decision that requires legal sign-off.
///  - No revenue rights, no upgradeability, hard supply cap, pausable, two-step admin transfer.
contract KudosToken is ERC20, ERC20Permit, ERC20Capped, ERC20Pausable, AccessControlDefaultAdminRules {
    /// @notice Issues Kudos exported from the skaddosh ledger.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    /// @notice Burns Kudos returned to the skaddosh ledger.
    bytes32 public constant REDEEMER_ROLE = keccak256("REDEEMER_ROLE");
    /// @notice Can pause in an incident. Only the admin can unpause.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    /// @notice Platform addresses that may send or receive while transfers are restricted.
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    /// @notice Whether holders may transfer Kudos between arbitrary addresses.
    bool public transfersOpen;

    event Issued(address indexed to, uint256 amount, bytes32 indexed ref);
    event Redeemed(address indexed from, uint256 amount, bytes32 indexed ref);
    event TransfersOpened(address indexed by);

    error TransfersRestricted(address from, address to);
    error ZeroAddress();
    error ZeroAmount();

    /// @param admin The multisig that governs roles (DEFAULT_ADMIN_ROLE).
    /// @param operator The platform relayer that mints, redeems, and can pause.
    /// @param cap_ Maximum total supply, in token units (whole Kudos × 1e18).
    /// @param adminTransferDelay Seconds a new admin must wait before accepting the role.
    constructor(address admin, address operator, uint256 cap_, uint48 adminTransferDelay)
        ERC20("Kudos", "KUDOS")
        ERC20Permit("Kudos")
        ERC20Capped(cap_)
        AccessControlDefaultAdminRules(adminTransferDelay, admin)
    {
        if (operator == address(0)) revert ZeroAddress();
        _grantRole(MINTER_ROLE, operator);
        _grantRole(REDEEMER_ROLE, operator);
        _grantRole(PAUSER_ROLE, operator);
    }

    // ── Issuance ─────────────────────────────────────────────────────────────

    /// @notice Mint exported Kudos to `to`. `ref` identifies the off-chain ledger operation.
    function mint(address to, uint256 amount, bytes32 ref) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _mint(to, amount);
        emit Issued(to, amount, ref);
    }

    /// @notice Burn Kudos the holder has approved, crediting them back to the off-chain ledger.
    /// @dev For smart-contract wallets, which approve with a transaction instead of a signature.
    function redeem(address from, uint256 amount, bytes32 ref) external onlyRole(REDEEMER_ROLE) {
        _redeem(from, amount, ref);
    }

    /// @notice Gasless return: burn Kudos using the holder's EIP-2612 permit signature.
    /// @dev The permit call is wrapped in try/catch so a front-run permit can't block redemption;
    ///      the allowance check in `_spendAllowance` still enforces authorisation.
    function redeemWithPermit(
        address from,
        uint256 amount,
        bytes32 ref,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyRole(REDEEMER_ROLE) {
        try this.permit(from, _msgSender(), amount, deadline, v, r, s) {} catch {}
        _redeem(from, amount, ref);
    }

    function _redeem(address from, uint256 amount, bytes32 ref) private {
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _spendAllowance(from, _msgSender(), amount);
        _burn(from, amount);
        emit Redeemed(from, amount, ref);
    }

    // ── Governance ───────────────────────────────────────────────────────────

    /// @notice Permanently allow peer-to-peer transfers. Irreversible by design.
    function openTransfers() external onlyRole(DEFAULT_ADMIN_ROLE) {
        transfersOpen = true;
        emit TransfersOpened(_msgSender());
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ── Hooks ────────────────────────────────────────────────────────────────

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Pausable)
    {
        bool isTransfer = from != address(0) && to != address(0);
        if (isTransfer && !transfersOpen && !hasRole(VAULT_ROLE, from) && !hasRole(VAULT_ROLE, to)) {
            revert TransfersRestricted(from, to);
        }
        super._update(from, to, value);
    }
}
