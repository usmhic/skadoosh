// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {KudosToken} from "../src/KudosToken.sol";
import {CreativeRegistry} from "../src/CreativeRegistry.sol";

/// @title Deploy
/// @notice Idempotent deployment of KudosToken and CreativeRegistry.
/// @dev Contracts are deployed with CREATE2 through the canonical deterministic deployer, so their
///      addresses depend only on bytecode, constructor arguments, and `DEPLOY_SALT`. Running this
///      script again is safe: anything already deployed at its expected address is verified and
///      skipped. That's what lets CI "initialise if missing" without storing state (docs/CHAIN.md).
///
/// Environment (all required unless noted):
///   KUDOS_ADMIN_ADDRESS     multisig that holds DEFAULT_ADMIN_ROLE (never the deployer key)
///   CHAIN_OPERATOR_ADDRESS  platform relayer: mints, redeems, registers, can pause
///   KUDOS_VAULT_ADDRESS     (optional) platform vault allowed in closed-loop transfers
///   KUDOS_SUPPLY_CAP        (optional) whole Kudos, default 1,000,000,000
///   ADMIN_TRANSFER_DELAY    (optional) seconds, default 172800 (2 days)
///   DEPLOY_SALT             (optional) bytes32, default keccak256("skaddosh.v1")
contract Deploy is Script {
    struct Config {
        address admin;
        address operator;
        address vault;
        uint256 cap;
        uint48 adminDelay;
        bytes32 salt;
    }

    function run() external returns (address token, address registry) {
        Config memory cfg = _config();
        bytes memory tokenArgs = abi.encode(cfg.admin, cfg.operator, cfg.cap, cfg.adminDelay);
        bytes memory registryArgs = abi.encode(cfg.admin, cfg.operator, cfg.adminDelay);

        token = _predict(type(KudosToken).creationCode, tokenArgs, cfg.salt);
        registry = _predict(type(CreativeRegistry).creationCode, registryArgs, cfg.salt);

        vm.startBroadcast();
        if (token.code.length == 0) {
            KudosToken deployed = new KudosToken{salt: cfg.salt}(cfg.admin, cfg.operator, cfg.cap, cfg.adminDelay);
            require(address(deployed) == token, "Deploy: unexpected KudosToken address");
            console2.log("KudosToken deployed:", token);
        } else {
            console2.log("KudosToken already deployed:", token);
        }
        if (registry.code.length == 0) {
            CreativeRegistry deployed = new CreativeRegistry{salt: cfg.salt}(cfg.admin, cfg.operator, cfg.adminDelay);
            require(address(deployed) == registry, "Deploy: unexpected CreativeRegistry address");
            console2.log("CreativeRegistry deployed:", registry);
        } else {
            console2.log("CreativeRegistry already deployed:", registry);
        }
        vm.stopBroadcast();

        _verify(KudosToken(token), CreativeRegistry(registry), cfg);
        _record(token, registry, cfg);
    }

    function _config() internal view returns (Config memory cfg) {
        cfg.admin = vm.envAddress("KUDOS_ADMIN_ADDRESS");
        cfg.operator = vm.envAddress("CHAIN_OPERATOR_ADDRESS");
        cfg.vault = vm.envOr("KUDOS_VAULT_ADDRESS", address(0));
        cfg.cap = vm.envOr("KUDOS_SUPPLY_CAP", uint256(1_000_000_000)) * 1e18;
        cfg.adminDelay = uint48(vm.envOr("ADMIN_TRANSFER_DELAY", uint256(2 days)));
        cfg.salt = vm.envOr("DEPLOY_SALT", keccak256("skaddosh.v1"));
        require(cfg.admin != address(0) && cfg.operator != address(0), "Deploy: admin and operator required");
        require(cfg.admin != cfg.operator, "Deploy: admin must be a separate multisig");
        require(cfg.adminDelay >= 1 days, "Deploy: admin transfer delay below 1 day");
    }

    function _predict(bytes memory creationCode, bytes memory args, bytes32 salt) internal pure returns (address) {
        return vm.computeCreate2Address(salt, keccak256(abi.encodePacked(creationCode, args)), CREATE2_FACTORY);
    }

    /// @dev Fails loudly if an existing deployment doesn't match the expected configuration.
    function _verify(KudosToken token, CreativeRegistry registry, Config memory cfg) internal view {
        require(token.defaultAdmin() == cfg.admin, "Verify: token admin mismatch");
        require(token.hasRole(token.MINTER_ROLE(), cfg.operator), "Verify: operator lacks MINTER_ROLE");
        require(token.hasRole(token.REDEEMER_ROLE(), cfg.operator), "Verify: operator lacks REDEEMER_ROLE");
        require(token.cap() == cfg.cap, "Verify: cap mismatch");
        require(registry.defaultAdmin() == cfg.admin, "Verify: registry admin mismatch");
        require(registry.hasRole(registry.REGISTRAR_ROLE(), cfg.operator), "Verify: operator lacks REGISTRAR_ROLE");
        if (cfg.vault != address(0) && !token.hasRole(token.VAULT_ROLE(), cfg.vault)) {
            // VAULT_ROLE is granted by the admin multisig after deployment; remind the operator.
            console2.log("NOTE: admin must grant VAULT_ROLE to", cfg.vault);
        }
    }

    function _record(address token, address registry, Config memory cfg) internal {
        string memory key = "deployment";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "kudosToken", token);
        vm.serializeAddress(key, "creativeRegistry", registry);
        vm.serializeAddress(key, "admin", cfg.admin);
        vm.serializeAddress(key, "operator", cfg.operator);
        string memory json = vm.serializeBytes32(key, "salt", cfg.salt);
        vm.writeJson(json, string.concat(vm.projectRoot(), "/deployments/", vm.toString(block.chainid), ".json"));

        console2.log("Set these in the app environment:");
        console2.log(string.concat("CHAIN_ID=", vm.toString(block.chainid)));
        console2.log(string.concat("KUDOS_TOKEN_ADDRESS=", vm.toString(token)));
        console2.log(string.concat("CREATIVE_REGISTRY_ADDRESS=", vm.toString(registry)));
    }
}
