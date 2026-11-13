# Kudos on Base

skaddosh works fully without a blockchain. When on-chain features are switched on, two things change:

1. **Kudos can live in your own wallet.** A member can send Kudos to a wallet they control, where
   they are an ERC-20 token (`KUDOS`) on Base, and bring them back later.
2. **Records become independently checkable.** Published works, accepted contributor agreements, and
   licences are attested in a registry contract, so anyone can check a licence certificate or a credit
   without trusting our database.

Nothing about ownership changes on-chain. Holding Kudos never grants a share of anyone's work, and the
registry stores fingerprints (hashes), not people or content. Why Base, and the alternatives considered,
are in [RESEARCH.md](RESEARCH.md#4-network-choice-base).

## Contracts

Both live in `packages/contracts` (Foundry, Solidity 0.8.28, OpenZeppelin 5.6.1).

### `KudosToken` (ERC-20 "Kudos", symbol `KUDOS`, 18 decimals)

One token equals one app Kudo. The off-chain ledger stays the source of truth: supply only exists
because a member exported Kudos, and every mint or burn has a matching `export_onchain`,
`export_refund`, or `import_onchain` row in `kudos_ledger`.

| Role | Holder | Can do |
| --- | --- | --- |
| `DEFAULT_ADMIN_ROLE` | A Safe multisig | Grant and revoke roles, unpause, `openTransfers()`. Handover needs a 2-day (at least 1-day) delay via `AccessControlDefaultAdminRules`. |
| `MINTER_ROLE` | Operator (server hot key) | `mint(to, amount, ref)` when a member exports. |
| `REDEEMER_ROLE` | Operator | `redeemWithPermit` / `redeem` to burn Kudos a member brings back. |
| `PAUSER_ROLE` | Operator | `pause()` in an incident. Only the admin can unpause. |
| `VAULT_ROLE` | Optional, admin-granted | An address members may transfer to and from while transfers are restricted. |

Other properties:

- **Closed loop.** While `transfersOpen` is false, holders can't transfer between wallets, except to
  and from addresses with `VAULT_ROLE`. That keeps Kudos a community currency, not a tradable asset.
  `openTransfers()` is one-way and admin-only. Don't call it without legal review (see Jurisdictions).
- **Capped supply.** Set at deployment (`KUDOS_SUPPLY_CAP`, default one billion).
- **Redeeming with a permit.** The member signs an EIP-2612 permit in their wallet, and the operator
  pays gas to burn. If someone front-runs the permit, the `try/catch` falls back to the existing
  allowance, so redeeming can't be griefed.
- `ref` on mint and burn is `keccak256("skaddosh:" + operationId)`, linking each event to one ledger row.

### `CreativeRegistry`

Hash-only attestations, written by the operator (`REGISTRAR_ROLE`):

| Record | Written when | Stored |
| --- | --- | --- |
| Work | A project is first published | `workId`, SHA-256 of a manifest (title, creator, medium, created date), `creatorRef` |
| Contribution | Both people accept a contributor agreement | Work, `contributorRef`, split in bps, co-owner flag, SHA-256 of the agreement text |
| Licence | A licence is bought | Work, tier, `licenseeRef`, SHA-256 of the rendered terms |

`creatorRef`, `contributorRef`, and `licenseeRef` are `HMAC-SHA256(CHAIN_REF_SALT, userId)`. They're
stable per person, but can't be linked to an account without the salt. Revocations (an ended
contribution, a revoked licence) are separate events, so history stays visible. Anyone can call
`verifyLicense(licenseId, termsHash)`. Certificate pages (`/licenses/:code`) link to the transaction.

## How the app talks to the chain

`packages/api/src/lib/chain.ts` reads the configuration once and never throws. If anything is
missing, on-chain features switch off with a logged reason and the rest of the app carries on.
Chain writes go through a queue (`chain_operation` table, `lib/chain-ops.ts`):

```
pending → submitting → submitted → confirmed
                                 ↘ failed (retried up to 5 times, then refunded for exports)
```

- Each operation is unique on `(kind, refId)`, so a double-click or a replayed request can't mint twice.
- Workers claim a row with a conditional update. Transactions from the single operator key are
  serialised to avoid nonce races.
- **Export:** the member's Hot Kudos are debited in the same transaction that enqueues the mint. If
  the mint finally fails, `export_refund` credits them back, exactly once.
- **Import:** the server checks the permit signature and enqueues the burn. Hot Kudos are credited
  (`import_onchain`) only after the burn confirms. The `refId` is the signature hash, so replays are
  rejected.
- `POST /api/chain/reconcile` with `Authorization: Bearer $CRON_SECRET` resumes stuck operations and
  confirms submitted ones. Run it every few minutes from your scheduler (for example, a cron job
  calling `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/chain/reconcile`).

### Who can use it

`chain.status` decides eligibility. A member needs all of the following:

1. On-chain features are enabled.
2. They are identity-verified (see [IDENTITY.md](IDENTITY.md)).
3. The country on their verified ID is listed in `CHAIN_ALLOWED_COUNTRIES`.
4. They have linked a wallet by signing a one-time message (`personal_sign`). The nonce is an HMAC
   with a 10-minute lifetime. Smart-contract wallets are supported through ERC-1271 via the RPC.

Exports are limited to 1–1,000 Kudos per operation (`KUDOS.EXPORT_MIN/MAX`).

## Jurisdictions

`CHAIN_ALLOWED_COUNTRIES` is empty by default, so nobody can move Kudos on-chain until you list
countries on purpose. Before listing a country, check local rules on virtual assets.

- **Morocco (MA): keep it disabled.** Holding and trading virtual currencies is still prohibited
  under the 2017 Office des Changes / Bank Al-Maghrib / AMMC notice, reaffirmed by a joint warning on
  31 August 2026. The virtual-assets bill (Bill 42.25) is still a draft. Moroccan members keep full
  use of Kudos inside skaddosh. Revisit this when the law is adopted.
- Opening transfers (`openTransfers()`) or letting supporters cash out would change the legal
  character of Kudos (an e-money or crypto-asset service in many places, MiCA in the EU). That needs
  legal review and probably a licensed partner. It isn't part of this release.

## Configuration

App (server-only, never `NEXT_PUBLIC_*`):

| Variable | Meaning |
| --- | --- |
| `CHAIN_ENABLED` | `true` to switch on. Anything else keeps it off. |
| `CHAIN_ID` | `8453` Base, `84532` Base Sepolia, `31337` Anvil |
| `CHAIN_RPC_URL` | An RPC endpoint you trust. Use a paid provider in production. |
| `KUDOS_TOKEN_ADDRESS`, `CREATIVE_REGISTRY_ADDRESS` | From `packages/contracts/deployments/<chainId>.json` |
| `CHAIN_OPERATOR_PRIVATE_KEY` | Hot key holding MINTER, REDEEMER, PAUSER, and REGISTRAR. Keep it funded with a little ETH on Base. |
| `CHAIN_REF_SALT` | 32+ random bytes. Never change it after launch, or account references stop matching. |
| `CHAIN_ALLOWED_COUNTRIES` | Comma-separated ISO codes, for example `FR,DE,NL` |
| `CRON_SECRET` | Bearer token for the reconcile route |

Deployment (`script/Deploy.s.sol`): `KUDOS_ADMIN_ADDRESS` (the Safe), `CHAIN_OPERATOR_ADDRESS`
(the address of the operator key; it must differ from the admin), and optionally
`KUDOS_VAULT_ADDRESS`, `KUDOS_SUPPLY_CAP` (whole Kudos), `ADMIN_TRANSFER_DELAY` (seconds), and `DEPLOY_SALT`.

## Deploying

The deploy script is **idempotent**. It predicts CREATE2 addresses from `DEPLOY_SALT`, deploys only
contracts with no code at their address, then checks roles and the cap on what's there. Running it again
is safe and simply verifies. It writes `deployments/<chainId>.json`.

### Locally (Anvil)

```bash
anvil &
cd packages/contracts
KUDOS_ADMIN_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
CHAIN_OPERATOR_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

These are Anvil's public test keys. Never use them anywhere else. Then set the `CHAIN_*` variables
with `CHAIN_ID=31337`.

### Base Sepolia and Base (GitHub Actions)

`.github/workflows/contracts-deploy.yml`:

1. In **Settings → Environments**, create `base-sepolia` and `base`. Add required reviewers to `base`.
2. Per environment, add secrets `DEPLOYER_PRIVATE_KEY` (a funded key used only for deploying),
   `CHAIN_RPC_URL`, and `ETHERSCAN_API_KEY` (for verification). Add variables
   `KUDOS_ADMIN_ADDRESS`, `CHAIN_OPERATOR_ADDRESS`, and optionally `KUDOS_VAULT_ADDRESS` and
   `KUDOS_SUPPLY_CAP`.
3. Run **Deploy contracts** with `network` and `broadcast`. Without `broadcast` it only simulates.
   Pushes to `dev` that touch contract sources re-run the Base Sepolia deployment, which does nothing
   when the contracts already exist. Until the secrets exist, the job skips with a notice.
4. Download the `deployments-<network>` artifact, commit the JSON, and set the addresses in the app
   environment.

`contracts-ci.yml` runs format, build, tests (4,096 fuzz runs), the ABI drift check, and Slither
(failing on medium and above) on every change.

### After deploying to Base

- Make the admin a Safe with at least 2 of 3 signers. Never use a single key.
- Fund the operator with a small amount of ETH and watch its balance. Rotate the key by granting the
  roles to a new address from the Safe, then revoking the old one.
- If you need a custody or vault address for the closed loop, grant `VAULT_ROLE` from the Safe.
- If you see suspicious mints, the operator can `pause()`. Investigate, rotate the key, and unpause
  from the Safe.

## Regenerating the ABI

`pnpm --filter @skaddosh/contracts contracts:abi` rebuilds `abi/index.ts` from the compiled
artifacts. CI fails if it drifts (`contracts:abi:check`). The API imports it as `@skaddosh/contracts/abi`.
