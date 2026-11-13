# Research: ownership, licensing, Kudos on-chain, and identity

This document records the research behind skaddosh's second product iteration: a gallery of
original creative work where people appreciate it, back it, license it, and contribute to it. It
explains which network, which identity provider, and which ownership model we chose, and why.
It is product and engineering research, **not legal advice**. Every item marked ⚖️ needs counsel
before launch in a given country.

Research date: October 2026. Sources are listed at the end. Several are vendor or secondary sources,
and they are weighted accordingly.

---

## 1. Four different things people mean by "supporting a creator"

The most important design decision is keeping four ideas apart. They have different economics,
different legal treatment, and different UI.

| | **Appreciation** | **Backing** | **Licensing** | **Ownership** |
|---|---|---|---|---|
| What you do | Give Kudos | Commit Kudos to a project in progress | Buy the right to use a work | Hold a share of the copyright or of the work's revenue |
| What you get | Thanks, and recognition on the work | Backer number, early-believer mark, capped Kudos returns, refund if cancelled | A licence certificate with defined rights | A legal claim |
| Expectation of profit | None | Capped thank-you paid in Kudos | None. You're buying a use right | Yes, if bought with money |
| Legal character | Gift | Reward-style crowdfunding | Contract (copyright licence) | Contract, or a **security** if sold to the public for money ⚖️ |
| On skaddosh | ✅ | ✅ (since v0.2) | ✅ (this iteration) | ✅ **for contributors who earn it with work**. ❌ **not sold to the public** |

**Giving Kudos never grants ownership or licence rights.** That rule shows up in the UI, the terms,
the contracts, and the database.

## 2. Market gaps

| Platform type | What works | Gap skaddosh fills |
|---|---|---|
| Portfolios (Behance, Dribbble) | Visual showcase | Weak discovery for new work, and new work struggles for organic visibility. AI-generated portfolios flood feeds. Thumbnail-centric, so software, research, and writing fit badly. No way to support, license, or collaborate. |
| Memberships (Patreon) | Recurring income for people who already have an audience | ~10% flat fee for new creators since Aug 2025, plus processing. Built for creators who are already famous, not for finding early believers. |
| Crowdfunding (Kickstarter) | Pre-sales for physical products | ~41% overall success rate (about 20% in tech). All-or-nothing campaigns. Backers get nothing when a project succeeds beyond a reward. |
| Creator coins (Zora) and fractional royalties (Royal.io and others) | Liquidity, novelty | Speculation dominates ("memetic speculation"). Rug-pull risk when an account disappears. Fractional royalty platforms collided with securities law and several shut down (Royal.io 2024). Mirror and Sound.xyz consolidated or pivoted. |
| On-chain IP (Story Protocol PIL) | Programmable licence terms and remix revenue share | Crypto-native audience and its own chain. Courts haven't settled how much smart-contract licences are worth on their own, so they pair with off-chain legal text. |

**The gap:** no product combines (a) a beautiful, discovery-first gallery for *any* original
human work, (b) real support that rewards early believers *without* speculation, (c) simple,
legally sound licensing, and (d) transparent credit and revenue splits for collaborators, all
without forcing people to learn crypto.

## 3. Business model

| Revenue | Price | Why it's fair |
|---|---|---|
| Kudos packs | Fixed price per Kudo through Paddle as merchant of record (tax handled) | People are buying a way to support creators, like store credit |
| Licence fee | 10% of every licence sale (`LICENSE_PLATFORM_FEE_BPS`) | We only earn when a creator earns |
| Portfolio Pro (existing) | Subscription | Custom domains, analytics, inbox |
| Verification | Included free for creators | Trust is the product. Provider cost is ~$0.80–1.50 per check |

There is no fee on appreciation or backing, so supporting a creator is never taxed by the
platform. Creator payouts (Kudos → money) are the next regulated surface; see §6.

**Unit economics (illustrative):** at $0.10 per Kudo, a $25 commercial licence (250 Kudos) yields
$2.50 for the platform. One verification costs ~$1, so a creator's first licence sale covers
their verification.

## 4. Network choice: Base

| Criterion | Base | Arbitrum One | OP Mainnet | Polygon PoS | Ethereum L1 |
|---|---|---|---|---|---|
| ERC-20 transfer cost (typical 2026) | ~$0.001–0.01 | ~$0.005–0.05 | ~$0.01–0.05 | ~$0.001–0.005 | $5–50+ |
| Security model | Ethereum L2 (OP Stack). **L2BEAT Stage 1** since Apr 2025, permissionless fault proofs, 10-member Security Council | Ethereum L2, Stage 1 (BoLD) | Ethereum L2, Stage 1 | Separate sidechain with its own validator set | Ethereum itself |
| Non-crypto onboarding | Coinbase onramps, passkey smart wallets, native USDC, paymasters | Good | Good | Good | Expensive |
| Developer experience | EVM equivalent; Foundry, viem, OpenZeppelin work unchanged | Same | Same | Same | Same |
| Sustainability | Large share of L2 activity; Superchain standard; Coinbase-backed | Large DeFi ecosystem | Superchain | Mature but different trust model | Most durable, too expensive per action |

**Recommendation: Base** (testnet: Base Sepolia, chain id 84532; mainnet: 8453). It has sub-cent
fees, inherits Ethereum security at Stage 1, and offers the best path to "no crypto knowledge
needed" through smart wallets and onramps. Because it's standard EVM, the contracts and tooling are
portable. Moving to Arbitrum or OP Mainnet is a redeploy plus a config change, and the chain id is
an environment variable. Polygon PoS is a little cheaper but is not an Ethereum rollup.

## 5. The Kudos token design

**Goal:** Kudos become a real, verifiable ERC-20 without becoming a speculative or investment
asset.

1. **ERC-20 with restricted transfers by default (closed loop).** Holders can keep Kudos in their
   own wallet, see them in any wallet app, and return them to skaddosh. Peer-to-peer transfers and
   trading are **disabled** until the admin multisig flips a **one-way switch**. That is a
   documented business decision that requires legal sign-off ⚖️. While closed:
   - There is no secondary market, so there's no price and no speculation.
   - Under MiCA, a utility token that is offered to the public or admitted to trading needs a
     notified white paper (Art. 4–6, no prior approval). A non-transferable credit that can only be
     redeemed with its issuer is a much weaker case for that, and the free-crypto-asset exclusion
     may cover allowances ⚖️.
   - In the US, the SEC/CFTC interpretive release of 17 Mar 2026 keeps Howey. It singles out
     *revenue-sharing and fractionalization* as what triggers an investment-contract analysis, and
     says marketing statements matter. Kudos carry no revenue right, and we never market them as an
     investment.
2. **Supply mirrors the off-chain ledger.** Kudos are minted only when a user *exports* Hot Kudos
   from their skaddosh balance to their own wallet, and burned when they *return* them. On-chain
   supply is therefore exactly the number of Kudos that live outside the app, and every mint and
   burn carries a reference to its ledger row.
3. **Gasless for users.** The platform relayer pays gas, which costs fractions of a cent on Base.
   Returning Kudos uses an EIP-2612 *permit* signature, so users never need ETH.
4. **Defence in depth:**
   - Roles are separated: admin multisig, minter/redeemer relayer, pauser.
   - Admin transfer is two-step with a delay (`AccessControlDefaultAdminRules`).
   - Supply has a hard cap.
   - The contracts are pausable and non-upgradeable, so what was audited is what runs.
   - Custom errors.
   - Fuzz tests and Slither run in CI.
5. **Jurisdiction gate.** On-chain features only work for verified users whose identity-document
   country appears in `CHAIN_ALLOWED_COUNTRIES` (empty means nobody). **Morocco:** virtual
   currencies are still unauthorised. Bank Al-Maghrib, the AMMC, and the Office des Changes renewed
   their joint warning on 31 Aug 2026, and Bill 42.25 is still a draft. Do **not** enable `MA` until
   that law passes and a licence path exists ⚖️.

A second contract, **CreativeRegistry**, writes **public, timestamped attestations** for work
registration, contribution agreements, and licences. It stores **hashes only, never personal
data** (GDPR), so anyone can verify that a licence certificate or contribution split is genuine
and unaltered.

## 6. Ownership, contributions, and revenue

- **Contributor splits (built).** A creator and a collaborator agree, in-app with consent from
  both, on a role, a credit, and optionally a revenue split in basis points. The split applies to
  the creator's share of everything the project earns in Kudos (gifts after backer returns,
  licence proceeds after the platform fee, unlocks). The creator always keeps at least 10%. The
  agreement text is hashed and attested on-chain. This is co-creation compensation, which is
  common in music royalty splits. It is **not a public offering**, because nobody buys in with
  money.
- **Copyright co-ownership (recorded).** A split can be marked as a *co-ownership* agreement. The
  platform records that both parties accepted the template, with timestamps and a hash. Transfers
  or assignments of copyright beyond that need a signed written instrument in most jurisdictions
  ⚖️, and the UI says so.
- **Selling fractional ownership or revenue rights to the public (not built).** That is a
  securities offering in the US (Reg CF caps raises at $5M per 12 months through a FINRA funding
  portal) and falls under ECSPR or MiFID II in the EU (€5M threshold). Royal.io's fate shows the
  risk. The right path is a **licensed partner** (a Reg CF portal or an ECSP-authorised platform)
  that skaddosh links to. Until then backers get capped *Kudos* thank-yous, not revenue rights.
- **Creator payouts (next).** Converting earned Kudos to money makes skaddosh a payments
  intermediary. Paddle is merchant of record for our sales but isn't built for marketplace payouts.
  The planned path is Stripe Connect (Express accounts, KYC handled per payout country), gated on
  verified identity.

## 7. Licensing

Three tiers, written in plain language. Each has a fixed, versioned legal text whose SHA-256 hash
is stored on every licence and attested on-chain.

| Tier | Typical use | Exclusive? |
|---|---|---|
| **Personal** | Personal, non-commercial use (wallpaper, study, fan reading) | No |
| **Commercial** | Commercial use with attribution, no resale of the work itself | No |
| **Exclusive** | Commercial use, and the creator stops selling new Commercial or Exclusive licences | One buyer |

Prices are in Kudos, and buyers get a certificate page anyone can verify. We drew on Creative
Commons' clarity, a16z's "Can't Be Evil" (licence text referenced from the contract), and Story's
PIL (on-chain parameters with off-chain legal text). The templates are deliberately short and
should be reviewed by counsel before production ⚖️.

## 8. Identity verification

| Provider | Price (indicative) | Coverage | Notes |
|---|---|---|---|
| **Veriff** | ~$0.80–1.39 per verification plus a monthly minimum | 190–230+ countries | EU-based (Estonia), GDPR-native, hosted accessible flow, HMAC-signed decision webhooks, configurable media retention |
| Sumsub | $1.35 per verification (Basic, $149/mo minimum) | 220+ | Strong AML; minimum spend |
| Stripe Identity | $1.50 per verification | Documents from 120+ countries, but business eligibility is limited (US, UK, JP, EU beta) | Doesn't fit a Morocco- or EU-based operator |
| Persona | Sales-led | n/a | Flexible but enterprise-oriented |
| Didit | Free core KYC, paid checks from ~$0.30 | Claims 220+ | Cheapest; younger vendor; the webhook signature scheme varies by version |

**Recommendation: Veriff** as the default provider, behind a small provider interface so Didit or
Sumsub can be swapped in by configuration. skaddosh **never receives or stores identity
documents or selfies**. The provider hosts the capture flow and sends us a signed decision. We keep
only the status, the document's issuing country, the provider session id, a reason code, and
timestamps. See [IDENTITY.md](./IDENTITY.md).

**Who must verify:** anyone who *earns* or *moves value*: publishing a project, selling licences,
accepting a contributor split, or exporting Kudos on-chain. Readers and supporters can browse and
give Kudos without verifying, which keeps the community open while making the creator side
trustworthy.

## 9. Originality

Verification proves a *person* is behind an account. Originality is shown by:
- the "Made by humans" declaration and AI-use disclosure on every work (from v0.2);
- the process log;
- a CreativeRegistry timestamp of the work's content hash, which establishes when a creator
  registered something.

None of these proves authorship on its own. Together they make deception costly and visible.

---

## Sources

- Fees: [Spark chain fee comparison](https://www.spark.money/tools/chain-fee-comparison), [Spark stablecoin transfer costs](https://www.spark.money/tools/stablecoin-transfer-cost-comparison), [Cryptorefills L2 comparison](https://www.cryptorefills.com/en/insights/base-vs-arbitrum-vs-polygon-cheapest-layer-2-networks-for-crypto-payments-in-2026), [ERC20Fees](https://www.erc20fees.com/erc20-fees-comparison/), [Eco: Arbitrum vs Optimism](https://eco.com/support/en/articles/15183711-arbitrum-vs-optimism-2026-fees-tvl-ecosystem)
- L2 security: [L2BEAT – Base](https://www.l2beat.com/scaling/projects/base), [The Block – Base Stage 1](https://www.theblock.co/post/352320/base-stage-1), [CryptoSlate – Base Stage 1](https://cryptoslate.com/base-becomes-10th-l2-network-to-reach-at-least-stage-1-decentralization/), [Coin Bureau L2 analysis](https://coinbureau.com/analysis/what-is-the-best-layer-2)
- MiCA: [Norton Rose Fulbright guide](https://www.nortonrosefulbright.com/en/knowledge/publications/2cec201e/regulating-crypto-assets-in-europe-practical-guide-to-mica), [LegalBison white paper requirements](https://legalbison.com/blog/mica-white-paper-requirements/), [Springer: utility tokens under MiCA](https://link.springer.com/chapter/10.1007/978-3-031-74889-9_10)
- US: [SEC interpretive release 33-11412 (2026)](https://www.sec.gov/files/rules/interp/2026/33-11412.pdf), [Sidley summary](https://datamatters.sidley.com/2026/03/24/sec-releases-landmark-interpretation-on-application-of-u-s-securities-laws-to-crypto-assets-in-coordination-with-cftc/), [Greenberg Traurig](https://www.gtlaw.com/en/insights/2026/3/sec-clarifies-status-of-crypto-assets-under-federal-securities-laws-signals-potential-exemptive-and-safe-harbor-framework), [VG Law: token taxonomy](https://www.vglawfirm.com/sec-crypto-interpretation-token-taxonomy-2026)
- Crowdfunding: [EU ECSPR overview (FMA)](https://www.fma.gv.at/en/financial-service-providers/crowdfunding-service-providers/european-crowdfunding-service-providers-under-the-ecspr/), [European Commission](https://finance.ec.europa.eu/financial-markets/financial-markets-policy/securities-markets/crowdfunding_en), [Reg CF guide](https://beancount.io/blog/2026/05/18/regulation-crowdfunding-section-4a6-startups-raise-5-million-public-form-c-sec-funding-portals-safe-notes-bookkeeping-guide), [KingsCrowd H1 2026](https://kingscrowd.com/h1-2026-investment-crowdfunding-lower-volume-higher-concentration-selective-strength/)
- Morocco: [Morocco World News (Jul 2026)](https://www.moroccoworldnews.com/2026/07/330814/bam-confirms-progress-on-crypto-law-to-curb-moroccos-growing-underground-market/), [Library of Congress blog](https://blogs.loc.gov/law/2026/03/recent-legal-developments-in-cryptocurrency-and-virtual-asset-regulation-in-uae-jordan-and-morocco/), [Lafrouji Avocats: Bill 42.25](https://lafroujiavocats.com/en/morocco-crypto-law-2026/)
- Licensing: [Story PIL overview](https://docs.story.foundation/concepts/programmable-ip-license/overview), [a16z Can't Be Evil licenses](https://a16zcrypto.com/introducing-nft-licenses/), [UMA on programmable IP](https://blog.uma.xyz/articles/the-future-of-ip-is-programmable)
- Identity: [Veriff API docs](https://devdocs.veriff.com/apidocs), [Veriff webhooks guide](https://devdocs.veriff.com/docs/webhooks-guide), [Didit webhooks](https://docs.didit.me/integration/webhooks), [Stripe Identity use cases](https://docs.stripe.com/identity/use-cases), [Trust Swiftly pricing comparison](https://trustswiftly.com/blog/identity-verification-pricing-comparison-and-alternatives/), [iDenfy KYC comparison](https://idenfy.com/blog/best-kyc-providers/)
- Market: [Kickstarter stats](https://www.kickstarter.com/help/stats), [Patreon fees 2026](https://www.unilink.us/blog/patreon-fees-explained-2026), [Behance alternatives](https://www.inspoai.io/blogs/behance-alternatives), [Blockworks on Zora](https://blockworks.com/news/zora-app-accounts-debate), [Music NFT post-mortem 2026](https://www.chartlex.com/blog/business/music-nft-web3-post-mortem-2026)
