// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {CreativeRegistry} from "../src/CreativeRegistry.sol";

contract CreativeRegistryTest is Test {
    CreativeRegistry internal registry;

    address internal admin = makeAddr("admin");
    address internal registrar = makeAddr("registrar");
    address internal stranger = makeAddr("stranger");

    bytes32 internal constant WORK = keccak256("proj_salt_atlas");
    bytes32 internal constant CONTENT = keccak256("content-v1");
    bytes32 internal constant CREATOR = keccak256("salted-user-ref");
    // keccak256 is evaluated at compile time; sha256 would be a precompile call that consumes vm.prank.
    bytes32 internal constant TERMS = keccak256("commercial-v1");

    event LicenseIssued(
        bytes32 indexed licenseId,
        bytes32 indexed workId,
        bytes32 licenseeRef,
        CreativeRegistry.LicenseTier tier,
        bytes32 termsHash
    );

    function setUp() public {
        registry = new CreativeRegistry(admin, registrar, 2 days);
    }

    function _register() internal {
        vm.prank(registrar);
        registry.registerWork(WORK, CONTENT, CREATOR);
    }

    function test_registerWork() public {
        vm.warp(1_800_000_000);
        _register();
        CreativeRegistry.Work memory w = registry.getWork(WORK);
        assertEq(w.contentHash, CONTENT);
        assertEq(w.creatorRef, CREATOR);
        assertEq(w.registeredAt, 1_800_000_000);
    }

    function test_registerWork_rejectsDuplicateAndEmpty() public {
        _register();
        vm.startPrank(registrar);
        vm.expectRevert(abi.encodeWithSelector(CreativeRegistry.AlreadyRecorded.selector, WORK));
        registry.registerWork(WORK, CONTENT, CREATOR);
        vm.expectRevert(CreativeRegistry.EmptyHash.selector);
        registry.registerWork(keccak256("other"), bytes32(0), CREATOR);
        vm.stopPrank();
    }

    function test_onlyRegistrarWrites() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, registry.REGISTRAR_ROLE()
            )
        );
        vm.prank(stranger);
        registry.registerWork(WORK, CONTENT, CREATOR);
    }

    function test_updateWorkContent_keepsRegistrationTime() public {
        vm.warp(1_800_000_000);
        _register();
        vm.warp(1_900_000_000);
        vm.prank(registrar);
        registry.updateWorkContent(WORK, keccak256("content-v2"));
        CreativeRegistry.Work memory w = registry.getWork(WORK);
        assertEq(w.registeredAt, 1_800_000_000);
        assertEq(w.updatedAt, 1_900_000_000);
        assertEq(w.contentHash, keccak256("content-v2"));
    }

    function test_contribution_recordAndRevoke() public {
        _register();
        bytes32 id = keccak256("contrib-1");
        vm.startPrank(registrar);
        registry.recordContribution(id, WORK, keccak256("contributor"), 2_500, keccak256("agreement"));
        vm.expectRevert(abi.encodeWithSelector(CreativeRegistry.AlreadyRecorded.selector, id));
        registry.recordContribution(id, WORK, keccak256("contributor"), 2_500, keccak256("agreement"));
        registry.revokeContribution(id);
        vm.stopPrank();
        CreativeRegistry.Contribution memory c = registry.getContribution(id);
        assertEq(c.splitBps, 2_500);
        assertTrue(c.revoked);
    }

    function test_contribution_rejectsBadSplitOrUnknownWork() public {
        vm.startPrank(registrar);
        vm.expectRevert(abi.encodeWithSelector(CreativeRegistry.UnknownWork.selector, WORK));
        registry.recordContribution(keccak256("c"), WORK, CREATOR, 100, keccak256("a"));
        vm.stopPrank();
        _register();
        vm.expectRevert(abi.encodeWithSelector(CreativeRegistry.InvalidSplit.selector, uint16(10_001)));
        vm.prank(registrar);
        registry.recordContribution(keccak256("c"), WORK, CREATOR, 10_001, keccak256("a"));
    }

    function test_license_issueVerifyRevoke() public {
        _register();
        bytes32 id = keccak256("lic-1");
        vm.expectEmit(address(registry));
        emit LicenseIssued(id, WORK, keccak256("buyer"), CreativeRegistry.LicenseTier.Commercial, TERMS);
        vm.prank(registrar);
        registry.issueLicense(id, WORK, keccak256("buyer"), CreativeRegistry.LicenseTier.Commercial, TERMS);

        assertTrue(registry.verifyLicense(id, TERMS));
        assertFalse(registry.verifyLicense(id, keccak256("tampered")));

        vm.prank(registrar);
        registry.revokeLicense(id);
        assertFalse(registry.verifyLicense(id, TERMS));
    }

    function test_license_unknownRecords() public {
        vm.expectRevert(abi.encodeWithSelector(CreativeRegistry.UnknownRecord.selector, keccak256("nope")));
        vm.prank(registrar);
        registry.revokeLicense(keccak256("nope"));
        assertFalse(registry.verifyLicense(keccak256("nope"), TERMS));
    }

    function testFuzz_licenseIdsAreUnique(bytes32 id, bytes32 terms) public {
        vm.assume(terms != bytes32(0));
        _register();
        vm.startPrank(registrar);
        registry.issueLicense(id, WORK, CREATOR, CreativeRegistry.LicenseTier.Personal, terms);
        vm.expectRevert(abi.encodeWithSelector(CreativeRegistry.AlreadyRecorded.selector, id));
        registry.issueLicense(id, WORK, CREATOR, CreativeRegistry.LicenseTier.Personal, terms);
        vm.stopPrank();
        assertTrue(registry.verifyLicense(id, terms));
    }
}
