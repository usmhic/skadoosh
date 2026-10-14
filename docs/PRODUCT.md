# skaddosh product direction

> **Original work finds its first believers here.**

skaddosh is a home for original, human-made creative work: a place to show it, find people who
care about it early, and turn the good ideas into projects that last. Kudos are what holds it
together.

This document covers the product: who it's for, the core loop, and how each surface works. The
Kudos economy has its own spec in [KUDOS.md](./KUDOS.md), on-chain Kudos and attestations are in
[CHAIN.md](./CHAIN.md), identity verification is in [IDENTITY.md](./IDENTITY.md), and the market,
regulatory, and business-model research is in [RESEARCH.md](./RESEARCH.md). Engineering boundaries
are in [ARCHITECTURE.md](../ARCHITECTURE.md).

### Four ways to support, and what each one is not

| | Appreciate | Back | License | Contribute |
|---|---|---|---|---|
| What you do | Give 1–5 Hot Kudos | Commit Hot Kudos as Cold to a project in its early days | Buy permission to use a work | Do part of the work, under an agreement both people accept |
| What you get | The creator's thanks and a place in their supporters | A backer number, milestone-based release, and capped returns in Kudos | A licence certificate with plain terms | Credit, optionally a share of the project's Kudos income, and optionally co-ownership of your contribution |
| What it isn't | Ownership of anything | Equity, debt, or a security | Ownership. The creator keeps the copyright | An investment. Supporters can't buy splits |

Kudos never automatically grant ownership. Legally meaningful rights come only from a licence or a
contributor agreement, each rendered from a versioned template, hashed, and (when enabled) attested
on Base.

---

## 1. What problem are we solving?

Independent creators (writers, illustrators, game makers, musicians, researchers, designers)
tend to hit the same five walls:

| Wall | What it looks like today | What skaddosh does |
|---|---|---|
| **Getting discovered** | Feeds reward people who already have an audience, post a lot, or pay to boost. | Discovery ranks by *how many different people* support something recently, scaled to the creator's size. There are no paid boosts. |
| **Building credibility** | Follower counts are cheap to fake and don't show whether you finish things. | Reputation is a handful of signals you can check: how many people back you, how many milestones you delivered, and how many creators *you* support. |
| **Finding early supporters** | Early fans are invisible, and nothing rewards them for spotting talent first. | Early backers carry more weight in returns, and their record of early picks makes them visible scouts. |
| **Funding ideas** | Crowdfunding is all-or-nothing, built around a campaign, and leaves backers to hope. | Backing releases in step with delivered milestones. If a project is cancelled, everything not yet released goes back to the backers. |
| **Sustaining a project** | Once a project ships, its early supporters get nothing back. | Successful projects send a capped share of the Kudos they earn back to their backers. |

This is **not** a social network (no engagement-bait feed, no vanity metrics), **not** a
crowdfunding site (no campaigns, no all-or-nothing deadlines), and **not** a crypto app (no
tokens, wallets, chains, speculation, or trading). It's a creator ecosystem with one small,
understandable currency.

## 2. Principles

1. **The creator and their idea stay at the center.** Every surface leads back to a person and
   something they made.
2. **Original and human-made.** AI can help with the *process* (research, editing, tooling,
   translation). It can't *be* the work. Every project says openly what AI was used for.
3. **Support is a verb.** Kudos are the main thing you do here. Liking is replaced by giving.
4. **Reward earliness, not size.** Discovery and returns favour people who show up early and
   creators who are still small.
5. **Credibility you can check.** Show what happened (delivered 3 of 4 milestones) rather than a
   score.
6. **Simple first.** Each mechanic has to fit in one sentence on screen. Anything that doesn't
   waits.
7. **A closed loop, not a market.** Kudos can't be traded between users, cashed out by
   supporters, or speculated on. See [KUDOS.md § Guardrails](./KUDOS.md#guardrails).

## 3. The core loop

```
   make ──▶ share ──▶ receive Kudos ──▶ get backed ──▶ deliver milestones ──▶ release
    ▲                                                                            │
    └──────── creators spend what they earn backing other creators ◀── returns ◀─┘
```

* **Make & share.** A creator publishes a *piece* (writing today, other media later) or opens a
  *project* (a living page for something bigger that's still in progress).
* **Kudos.** Readers give Hot Kudos to pieces and projects they value. Those Kudos go to the
  creator, who can spend them in turn. That's how Kudos circulate.
* **Back.** For projects still in *Idea* or *Making*, supporters commit Hot Kudos, which become
  Cold Kudos held for that project. The earlier you back, the more weight your backing carries.
* **Deliver.** The creator delivers milestones in public. Each delivery releases a share of the
  Cold Kudos to the creator.
* **Return.** Once a project earns Kudos, a share chosen by the creator flows back to its backers,
  up to a cap.

## 4. The experience

### Navigation

Few destinations, always visible:

| Destination | Purpose |
|---|---|
| **Explore** (`/`) | The gallery: every medium, filtered by chips, sorted by mode |
| **How it works** (`/how-it-works`, signed out) | The four ways to support, verification, originality, and on-chain Kudos in plain words |
| **Kudos** (`/kudos`) | Your wallet: Hot, Cold, backings, licences you hold, history, and optionally your own wallet |
| **Studio** (`/studio`) | Make things, plus a "Needs you" inbox for verification and collaboration requests |

On mobile web and in the app, the same destinations are a bottom tab bar. The header wallet chip
shows **Hot · Cold**. New members go through `/welcome` (you, what you make, verify).

### Explore

Explore is a masonry gallery of covers. Projects without a cover get a generated one, drawn from
their medium and accent colour. **Medium chips** (Art, Design, Software, Music, Writing, Film, Games,
Photography, Research) filter it, and **modes** sort it:

| Mode | What it surfaces | Ranking |
|---|---|---|
| **For you** | Pieces and projects in your interests | Recency blended with distinct-supporter momentum |
| **Following** | Updates from projects you back and creators you follow | Newest first |
| **Rising** | Work picking up support right now | Distinct supporters in the last 14 days, scaled down for creators who already have many supporters |
| **Seeking backers** | Projects in *Idea* or *Making* with a backing goal | Momentum plus how close the project is to its goal |
| **Open collabs** | Projects with open roles | Newest first |
| **New voices** | Creators with fewer than 10 supporters | Newest first |

Tiles for pieces and projects share one layout: the cover, a stage badge, a thin backing bar while a
project is seeking backers, then the title in the display serif, the creator with their Verified mark,
the medium, and the Kudos count. Tiles show no follower counts. The old `/circles` URLs redirect to
the matching medium.

### Project pages (`/projects/:id`)

The project page is the most important page on the platform. Top to bottom:

1. **Hero:** a large cover, the medium and stage, the title in the display serif, the creator with
   their Verified mark.
2. **Support card** (sticky on desktop): Cold Kudos backed vs. goal, backers, and four rows, one for
   each way to support (Appreciate, Back, License, Contribute), each with one sentence on what it is.
   Under them is the line "None of these makes you an owner of the work".
3. **Story:** the creator's description, set in the reading serif.
4. **Milestones** and the **process log**, which is also where human authorship shows.
5. **People behind it:** the creator's share and each accepted contributor (role, split, co-owner,
   the agreement, and its attestation). Pending proposals show who they're waiting on.
6. **Looking for:** open roles, each with "Offer to help", which opens a proposal with role,
   contribution, requested share, and co-ownership.
7. **License this work:** the tiers on sale, what each allows and forbids, and a purchase dialog
   showing the full terms before you agree.
8. **Backers wall** with backer numbers and *Early believer* marks, and **Made by humans**.

### Creator profiles (`/:username`)

A profile answers "who is this, and can I trust them?" in about five seconds:

* Name in the display serif, the Verified mark, bio, location, website, **Follow**.
* **Reputation signals** (see below).
* A gallery with tabs: **Work** (projects and pieces), **Contributes to** (projects they're
  credited on, with their role), **Believes in** (projects they back), and **Collections**. A
  **Portfolio** button links to the full portfolio page when there is one.

### Reputation: signals, not scores

Reputation is computed live from what happened. There is no single number to game.

| Signal | Meaning | Why it matters |
|---|---|---|
| **Backed by** | Distinct people who have given Kudos to or backed this creator | Breadth of support, which is harder to fake than volume |
| **Delivered** | Milestones delivered out of milestones promised | Tells backers whether this person follows through |
| **Supports** | Distinct creators this person has given to or backed | Rewards being part of the community, not just taking from it |
| **Early believer** | Projects this person backed during *Idea* that went on to ship | Rewards taste and turns supporters into curators |
| **Process posts** | Updates published on their projects | Shows the work being made by a human |

### Mediums

Every project has one **medium**: art, design, software, music, writing, film, games, photography,
research, or other. Mediums replaced the tag-based Circles. They're simpler to choose, they drive
the Explore chips and "For you", and they set the generated cover. Community features that Circles
promised (critique, prompts) can come back per medium later.

### Collaboration and contributor splits

Projects list **open roles**. Anyone can **offer to help**, and the creator can **invite** someone by
username. Both paths produce the same proposal: role, contribution, an optional split of the
creator side of income (contributors share up to 90% in total), and optional co-ownership of the
contribution. The proposal is only active once the other person accepts the exact agreement text,
whose hash is recorded and attested. See [KUDOS.md § Contributor splits](./KUDOS.md#9-contributor-splits).

### Licensing

Creators can sell **Personal**, **Commercial**, and **Exclusive** licences, priced in Kudos. Terms
come from versioned, plain-language templates. Buyers get a certificate at `/licenses/:code` that
anyone can verify. It shows whether the terms are intact and links to the on-chain record. Selling an
Exclusive licence closes the other commercial tiers.

### Identity verification

Creators verify once, with Veriff, before publishing, selling licences, or starting a revenue split.
skaddosh keeps only the result and the issuing country, never documents or selfies. Readers and
supporters never need to verify. Verified people get a small green mark. See [IDENTITY.md](./IDENTITY.md).

### Studio

The studio's project editor has a **medium** picker, a **Kudos & backing** section (stage, pitch,
backing goal, backer share, return cap), a **milestones** editor, a **process log** composer,
**open roles**, **People behind it** (invite collaborators, accept offers), **Licensing** (tiers and
prices), and the **Made by humans** disclosure. Publishing a project requires a verified identity and
confirming the work is original and human-made. The Studio home starts with a **Needs you** list
(verification, offers, and invitations) and ends with **Licences sold**.

## 5. Originality and AI

skaddosh is for original human creative work.

* **Allowed and disclosed:** using AI for research, editing and proofreading, translation, tools
  and code, or reference and assets that are clearly secondary to the work.
* **Not allowed:** work whose core is AI-generated (generated prose, generated images presented
  as art, generated music, and so on).
* **How it shows up:**
  * Each project carries a *Made by humans* confirmation and an AI-use disclosure, both shown
    publicly.
  * The process log is the strongest proof of authorship, so Discover and reputation both reward
    it.
  * Platform AI features (translation, summaries) are labelled as platform features. They never
    change the creator's original.
* **Enforcement (later phase):** community reports, with stewards reviewing them;
  confirmed violations remove the work and freeze its Kudos.

## 6. Visual and interaction language

* **Paper and ink.** A warm paper background, deep ink text, and ink as the primary colour.
  **Instrument Serif** for display, **Newsreader** for long-form reading, **Geist** for UI, and
  Geist Mono for codes and hashes. It should read like a gallery, not a trading dashboard.
* **The mark.** An ink tile with a paper four-point spark and a small ember dot: a moment of
  appreciation landing on a piece of work. The wordmark is set in the display serif.
* **The work comes first.** Covers are big, chrome is quiet, and actions sit in one support card
  rather than being scattered as buttons.
* **No crypto jargon.** The interface says "your own wallet" and "Send to wallet", and never shows
  token names, gas, or chain IDs. On-chain records are offered as "On record ↗" links.
* **Two temperatures.** Hot Kudos are **ember** (warm orange) and Cold Kudos are **glacier**
  (cool blue). Those are the only two "money" colours, and they're always paired with their marks
  ✺ and ❄.
* **No charts of value over time.** No balances in big numbers or green and red. Kudos show up as
  support counts and progress bars.
* **Plain sentences beat tooltips.** Every Kudos action says what will happen in one sentence
  before you confirm.
* **Calm defaults.** No infinite scroll on profiles, no notification badges for vanity events.

## 7. Roadmap

| Phase | Scope | Status |
|---|---|---|
| **1: Foundations** | Hot/Cold ledger, giving to pieces and projects, backing with stage weights, milestones and releases, returns with caps, cancel-and-thaw, 48-hour change of heart, weekly allowance, project pages, process log, open roles, follows, reputation signals, Discover modes, wallet page, AI disclosure | Done |
| **2: Ownership** | Gallery and mediums, new identity, contributor agreements and splits, licences and certificates, identity verification, Kudos as an ERC-20 on Base, CreativeRegistry attestations, mobile Explore, Project, Kudos, and Verify | **This change** |
| 3: Community | Critique threads and monthly prompts per medium, stewards, project↔piece linking | Next |
| 4: Trust | Automatic thaw for dormant projects (no update in 90 days), reports and moderation, weighting new accounts' Kudos lower in reputation | Planned |
| 5: Sustainability | Creator payouts (KYC, region rules, legal review), memberships for released projects, mobile parity | Planned |

## 8. Success measures

* Share of new creators who receive Kudos from at least 5 distinct people within 30 days.
* Share of backed projects that deliver at least one milestone.
* Share of Kudos that circulate (are spent by creators on other creators) rather than sit idle.
* Median number of early believers per released project.
