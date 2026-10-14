# Kudos

Kudos stand for support and value given to creators and their projects. They come in two
temperatures:

| | **✺ Hot Kudos** | **❄ Cold Kudos** |
|---|---|---|
| One-liner | Kudos you can use | Kudos you've committed to a project |
| Liquid? | Yes. Spend them anywhere on skaddosh | No. They stay with one project |
| Where they come from | Signup grant, weekly allowance, purchases, Kudos you receive, licence sales, contributor shares, returns, refunds | Only from backing: Hot becomes Cold when you back a project |
| What they do | Give to work, unlock confidential work, buy licences, comment, back projects | Fund the project milestone by milestone, earn returns, and build your reputation as an early believer |
| How they leave | You spend them | Released to the creator (as Hot) when milestones are delivered, or thawed back to you (as Hot) if the project is cancelled |

Every movement is written to an append-only **ledger** (`kudos_ledger`), so every wallet balance
and project total can be audited.

All numbers below live in `packages/api/src/lib/kudos-economy.ts`, and unit tests cover them.
Change the code and this table together.

| Constant | Value |
|---|---|
| Signup grant | 25 Hot |
| Weekly allowance | 10 Hot, once every 7 days, only while your Hot balance is under 100 |
| Give to a piece or project | 1–5 Hot per gesture |
| Comment | 3 Hot |
| Back a project | 5–500 Hot per backing (you can top up) |
| Stage weight | Idea **1.5×** · Making **1.25×** |
| Backer share | 0–30% of the Kudos the project earns (default 10%) |
| Return cap | 100–300% of what each backer put in (default 200%) |
| Change of heart | Withdraw a backing within 48 hours, as long as none of it has been released |
| Milestones | Up to 6 per project. Their release percentages add up to at most 100% |
| Licence platform fee | 10% of the price, rounded down (`LICENSE_PLATFORM_FEE_BPS` = 1000) |
| Contributor splits | Up to 90% in total across contributors (`MAX_CONTRIBUTOR_SPLIT_BPS` = 9000). The creator always keeps at least 10% |
| Send to wallet | 1–1,000 Kudos per transfer (`EXPORT_MIN` / `EXPORT_MAX`) |

---

## Flows

### 1. Earning Hot Kudos

* **Signup:** 25 Hot.
* **Weekly allowance:** claim 10 Hot every 7 days while your balance is under 100. It's meant to
  be given away, which is why it stops once you've built up a balance. Anyone can support
  creators without paying.
* **Purchase:** packs of 25–250 through Paddle (unchanged).
* **Receiving:** when someone gives Kudos to your piece or project, they land in your Hot balance
  (after the backer share, if the project has backers).
* **Returns and refunds:** see below.

### 2. Giving Kudos (appreciation)

`works.sendKudos` and `projects.giveKudos` move 1–5 Hot from the giver to the creator. You can't
give to your own work.

For a **project** that has backers, the creator's **backer share** of each gift goes to the
backers first (see *Returns*), and the creator receives the rest.

### 3. Backing a project (Hot → Cold)

You can back projects in the **Idea** or **Making** stage. Backing:

1. Takes `amount` Hot from your balance.
2. Credits `amount` Cold to your backing position on that project.
3. Records your **weighted amount**: `amount × stage weight` (Idea 1.5×, Making 1.25×). Each top-up
   is weighted by the stage at the moment you add it, so backing early always counts for more.
4. Gives you a permanent **backer number** (#1, #2, …) the first time you back. Backing during
   *Idea* also earns the **Early believer** mark.

You can't back your own project.

### 4. Releasing Cold Kudos to the creator

Cold Kudos are released to the creator as **Hot** in step with delivery:

* The creator defines milestones, each with a `releasePercent`.
* When a milestone is marked **delivered** (with a public note), the cumulative delivered
  percentage `P` goes up. For every backing:
  `release = floor(amount × P / 100) − alreadyReleased` (never negative, never more than what's
  still locked).
* When the project moves to **Released**, `P` becomes 100% and everything still locked is
  released.
* If someone backs *after* some milestones have been delivered, their share for those milestones
  is released at the next delivery. Late backers are funding a creator who has already shown they
  deliver.

### 5. Returns (successful projects pay back early supporters)

Every time a project receives Kudos (a gift or a confidential unlock):

```
pool        = floor(incoming × backerShare%)
for each backing that hasn't reached its cap:
  portion   = floor(pool × weightedAmount / Σ weightedAmount of eligible backings)
  portion   = min(portion, amount × returnCap% − returnedSoFar)
creator gets  incoming − Σ portions
```

* Returns are paid in **Hot** Kudos, which the backer can spend straight away.
* Each backing stops earning at its **cap** (default 2× what was put in). That keeps backing about
  support with an upside, not speculation.
* Rounding always favours the creator (whatever is left over goes to them).

**Example.** Amal backs *Salt Atlas* for 40 during *Idea* (weighted 60). Theo backs it for 40
during *Making* (weighted 50). The project's backer share is 10% and its cap is 200%. A reader
gives 5 Kudos, which makes the pool 0 after rounding, so the creator gets all 5. A circle later
unlocks the confidential edition for 50 Kudos: the pool is 5, so Amal gets `floor(5 × 60/110) = 2`,
Theo gets `floor(5 × 50/110) = 2`, and the creator gets 46. Amal keeps earning until she has
received 80.

### 6. Thawing Cold Kudos back to Hot

* **Change of heart:** within 48 hours of your latest top-up, if none of your backing has been
  released yet, you can withdraw it and get every Cold Kudo back as Hot.
* **Cancellation:** if the creator cancels a project, every backer's still-locked Cold Kudos thaw
  back to Hot right away.
* **Dormancy (phase 4):** a project with no process update for 90 days will thaw automatically.
  Until then, the project page shows "Last update N days ago" so backers can judge for themselves.

### 7. Spending Hot Kudos

| Spend | Cost | Goes to |
|---|---|---|
| Give to a piece | 1–5 | Creator |
| Give to a project | 1–5 | Backers' share, then the creator |
| Unlock confidential work | Creator-set (0–500) | Creator (projects: backers' share first) |
| Comment | 3 | Burned (anti-spam) |
| Back a project | 5–500 | Becomes Cold |
| Buy a licence | Creator-set per tier | 10% platform fee, then backers' share, contributor splits, and the creator |

### 8. Licences

A creator can sell three standard licences for a project: **Personal**, **Commercial**, and
**Exclusive**. They set the price of each in Kudos (`licenses.setOffers`), and selling requires a
verified identity. When someone buys:

1. The buyer is debited `price` Hot (`license_spend`).
2. The platform keeps `floor(price × 10%)`. The fee leaves circulation and is recorded on the licence
   (`platform_fee_kudos`).
3. The rest goes through `distributeProjectIncome`. Backer returns come first, as for any project
   income. The creator side is then split with contributors (`contributor_share`), and the creator
   gets the remainder (`license_earn`). Licence income doesn't count toward "Kudos received" or
   discovery, because a purchase isn't appreciation.
4. The terms are rendered from a versioned template (`packages/db/src/legal.ts`), and their SHA-256
   hash is stored on the licence and attested on Base when on-chain features are on. Each licence gets
   a public certificate at `/licenses/SKD-XXX-XXXX`, which re-renders the terms and checks the hash.
5. Selling an Exclusive licence closes the Commercial and Exclusive offers. Personal licences can
   still be sold.

A licence is permission to use the work. It never transfers ownership.

### 9. Contributor splits

A creator can invite a collaborator, or a collaborator can offer to help. Each proposal names a
role, what was contributed, an optional split in basis points of the **creator side** of income, and
an optional co-ownership flag. Nothing applies until the other person accepts the exact agreement
text. That text is snapshotted and hashed when it's proposed. Rules:

- Accepted splits total at most 90%, so the creator always keeps at least 10%.
- A split above 0 needs the contributor to be identity-verified before it can be accepted.
- Shares apply to future income only: Kudos given, unlocks, and licences. Each contributor gets
  `floor(amount × bps / 10,000)`, and the creator keeps the remainder, including rounding.
- Either person can end the arrangement. Past shares stay paid, and the end is attested.

A split is a share of Kudos income on skaddosh. It isn't equity or a security, and supporters can't
buy one.

### 10. Kudos in your own wallet

When on-chain features are enabled ([CHAIN.md](./CHAIN.md)), a verified member in an allowed
country can link a wallet and:

- **Send to wallet:** debit Hot (`export_onchain`) and mint the same amount of `KUDOS` on Base. If the
  mint finally fails, the Kudos are refunded once (`export_refund`).
- **Bring back:** sign a permit, the operator burns the tokens, and Hot is credited after the burn
  confirms (`import_onchain`).

The token keeps the closed loop. Holders can't transfer it between wallets, so it's a way to hold
Kudos yourself, not to trade them.

---

## Reputation inputs

Kudos feed reputation directly (see [PRODUCT.md § Reputation](./PRODUCT.md#reputation-signals-not-scores)):

* **Backed by:** distinct givers plus backers, across all of a creator's pieces and projects.
* **Supports:** distinct creators a person has given to or backed.
* **Early believer:** backings made during *Idea* on projects that are now *Released* or
  *Sustaining*.
* **Delivered:** milestones delivered ÷ milestones defined.

## Guardrails

These keep Kudos a community currency and not a financial product:

1. **Closed loop.** Kudos can only be used on skaddosh. Supporters can't cash them out. Kudos held
   as a token on Base can only come back to skaddosh, because wallet-to-wallet transfers are disabled
   in the contract.
2. **No transfers or trading.** Kudos only move through product actions (give, back, unlock,
   comment, license). There is no peer-to-peer send, no order book, and no secondary market for
   backing positions.
3. **Kudos never buy ownership.** Giving and backing never grant rights in a work. Licences grant
   permission to use it. Ownership and income shares come only from contributor agreements that both
   people accept.
4. **Capped returns, paid in Kudos.** Returns are a thank-you with a ceiling, not a claim on
   revenue or equity. They're only paid in Kudos.
5. **No paid discovery.** Kudos can't buy placement. Discovery ranks by *distinct* supporters, so
   one big spender counts as one person.
6. **Auditability.** Every balance change is a ledger row with a reason and a reference.
7. **Atomic balances.** Debits are conditional updates (`balance >= amount`) inside a transaction,
   so concurrent requests can't overdraw.
8. **Creator payouts (future)** need KYC, regional compliance, and **legal review before launch**.
   Turning Kudos earned by creators into money is a separate, regulated surface, and supporters
   never touch it.
