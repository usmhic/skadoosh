# Kudos

Kudos stand for support and value given to creators and their projects. They come in two
temperatures:

| | **✺ Hot Kudos** | **❄ Cold Kudos** |
|---|---|---|
| One-liner | Kudos you can use | Kudos you've committed to a project |
| Liquid? | Yes. Spend them anywhere on skaddosh | No. They stay with one project |
| Where they come from | Signup grant, weekly allowance, purchases, Kudos you receive, returns, refunds | Only from backing: Hot becomes Cold when you back a project |
| What they do | Give to work, unlock confidential work, comment, back projects | Fund the project milestone by milestone, earn returns, and build your reputation as an early believer |
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

1. **Closed loop.** Kudos can only be used on skaddosh. Supporters can't cash them out.
2. **No transfers or trading.** Kudos only move through product actions (give, back, unlock,
   comment). There is no peer-to-peer send, no order book, and no secondary market for backing
   positions.
3. **Capped returns, paid in Kudos.** Returns are a thank-you with a ceiling, not a claim on
   revenue or equity. They're only paid in Kudos.
4. **No paid discovery.** Kudos can't buy placement. Discovery ranks by *distinct* supporters, so
   one big spender counts as one person.
5. **Auditability.** Every balance change is a ledger row with a reason and a reference.
6. **Atomic balances.** Debits are conditional updates (`balance >= amount`) inside a transaction,
   so concurrent requests can't overdraw.
7. **Creator payouts (future)** need KYC, regional compliance, and **legal review before launch**.
   Turning Kudos earned by creators into money is a separate, regulated surface, and supporters
   never touch it.
