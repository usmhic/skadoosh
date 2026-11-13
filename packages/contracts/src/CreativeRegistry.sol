// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";

/// @title CreativeRegistry
/// @notice Public, timestamped attestations for original works, contribution agreements, and licences
///         issued on skaddosh. Anyone can verify that a licence certificate or contributor split is
///         genuine and unaltered by comparing hashes.
/// @dev Stores hashes only — never personal data. Ids are keccak256 of skaddosh database ids, and
///      `*Ref` values are salted hashes of account ids. Legal terms live off-chain; their SHA-256 is
///      recorded here (docs/RESEARCH.md §7).
contract CreativeRegistry is AccessControlDefaultAdminRules {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    uint16 public constant MAX_BPS = 10_000;

    enum LicenseTier {
        Personal,
        Commercial,
        Exclusive
    }

    struct Work {
        bytes32 contentHash;
        bytes32 creatorRef;
        uint64 registeredAt;
        uint64 updatedAt;
    }

    struct Contribution {
        bytes32 workId;
        bytes32 contributorRef;
        bytes32 agreementHash;
        uint16 splitBps;
        uint64 recordedAt;
        bool revoked;
    }

    struct License {
        bytes32 workId;
        bytes32 licenseeRef;
        bytes32 termsHash;
        LicenseTier tier;
        uint64 issuedAt;
        bool revoked;
    }

    mapping(bytes32 workId => Work) private _works;
    mapping(bytes32 contributionId => Contribution) private _contributions;
    mapping(bytes32 licenseId => License) private _licenses;

    event WorkRegistered(bytes32 indexed workId, bytes32 contentHash, bytes32 indexed creatorRef);
    event WorkContentUpdated(bytes32 indexed workId, bytes32 contentHash);
    event ContributionRecorded(
        bytes32 indexed contributionId,
        bytes32 indexed workId,
        bytes32 contributorRef,
        uint16 splitBps,
        bytes32 agreementHash
    );
    event ContributionRevoked(bytes32 indexed contributionId);
    event LicenseIssued(
        bytes32 indexed licenseId,
        bytes32 indexed workId,
        bytes32 licenseeRef,
        LicenseTier tier,
        bytes32 termsHash
    );
    event LicenseRevoked(bytes32 indexed licenseId);

    error AlreadyRecorded(bytes32 id);
    error UnknownWork(bytes32 workId);
    error UnknownRecord(bytes32 id);
    error InvalidSplit(uint16 splitBps);
    error EmptyHash();

    constructor(address admin, address registrar, uint48 adminTransferDelay)
        AccessControlDefaultAdminRules(adminTransferDelay, admin)
    {
        _grantRole(REGISTRAR_ROLE, registrar);
    }

    // ── Works ────────────────────────────────────────────────────────────────

    function registerWork(bytes32 workId, bytes32 contentHash, bytes32 creatorRef)
        external
        onlyRole(REGISTRAR_ROLE)
    {
        if (contentHash == bytes32(0)) revert EmptyHash();
        if (_works[workId].registeredAt != 0) revert AlreadyRecorded(workId);
        uint64 nowTs = uint64(block.timestamp);
        _works[workId] = Work(contentHash, creatorRef, nowTs, nowTs);
        emit WorkRegistered(workId, contentHash, creatorRef);
    }

    /// @notice Record a new content version. The original registration time is kept.
    function updateWorkContent(bytes32 workId, bytes32 contentHash) external onlyRole(REGISTRAR_ROLE) {
        if (contentHash == bytes32(0)) revert EmptyHash();
        Work storage work = _requireWork(workId);
        work.contentHash = contentHash;
        work.updatedAt = uint64(block.timestamp);
        emit WorkContentUpdated(workId, contentHash);
    }

    // ── Contributions ────────────────────────────────────────────────────────

    function recordContribution(
        bytes32 contributionId,
        bytes32 workId,
        bytes32 contributorRef,
        uint16 splitBps,
        bytes32 agreementHash
    ) external onlyRole(REGISTRAR_ROLE) {
        _requireWork(workId);
        if (splitBps > MAX_BPS) revert InvalidSplit(splitBps);
        if (agreementHash == bytes32(0)) revert EmptyHash();
        if (_contributions[contributionId].recordedAt != 0) revert AlreadyRecorded(contributionId);
        _contributions[contributionId] =
            Contribution(workId, contributorRef, agreementHash, splitBps, uint64(block.timestamp), false);
        emit ContributionRecorded(contributionId, workId, contributorRef, splitBps, agreementHash);
    }

    function revokeContribution(bytes32 contributionId) external onlyRole(REGISTRAR_ROLE) {
        Contribution storage c = _contributions[contributionId];
        if (c.recordedAt == 0) revert UnknownRecord(contributionId);
        c.revoked = true;
        emit ContributionRevoked(contributionId);
    }

    // ── Licences ─────────────────────────────────────────────────────────────

    function issueLicense(
        bytes32 licenseId,
        bytes32 workId,
        bytes32 licenseeRef,
        LicenseTier tier,
        bytes32 termsHash
    ) external onlyRole(REGISTRAR_ROLE) {
        _requireWork(workId);
        if (termsHash == bytes32(0)) revert EmptyHash();
        if (_licenses[licenseId].issuedAt != 0) revert AlreadyRecorded(licenseId);
        _licenses[licenseId] = License(workId, licenseeRef, termsHash, tier, uint64(block.timestamp), false);
        emit LicenseIssued(licenseId, workId, licenseeRef, tier, termsHash);
    }

    function revokeLicense(bytes32 licenseId) external onlyRole(REGISTRAR_ROLE) {
        License storage l = _licenses[licenseId];
        if (l.issuedAt == 0) revert UnknownRecord(licenseId);
        l.revoked = true;
        emit LicenseRevoked(licenseId);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function getWork(bytes32 workId) external view returns (Work memory) {
        return _works[workId];
    }

    function getContribution(bytes32 contributionId) external view returns (Contribution memory) {
        return _contributions[contributionId];
    }

    function getLicense(bytes32 licenseId) external view returns (License memory) {
        return _licenses[licenseId];
    }

    /// @notice True when the licence exists, is not revoked, and matches the given terms hash.
    function verifyLicense(bytes32 licenseId, bytes32 termsHash) external view returns (bool) {
        License storage l = _licenses[licenseId];
        return l.issuedAt != 0 && !l.revoked && l.termsHash == termsHash;
    }

    function _requireWork(bytes32 workId) private view returns (Work storage work) {
        work = _works[workId];
        if (work.registeredAt == 0) revert UnknownWork(workId);
    }
}
