# skaddosh product direction

> **Original work finds its first believers here.**

skaddosh is a home for original, human-made creative work: a place to show it, find people who
care about it early, and turn the good ideas into projects that last. Kudos are what holds it
together.

This document covers the product: who it's for, the core loop, and how each surface works. The
Kudos economy has its own spec in [KUDOS.md](./KUDOS.md). Engineering boundaries are in
[ARCHITECTURE.md](../ARCHITECTURE.md).

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

Four destinations, always visible:

| | Destination | Purpose |
|---|---|---|
| ✦ | **Discover** (`/`) | The front door: modes, circles, mixed pieces and projects |
| ◎ | **Circles** (`/circles`) | Craft-based communities |
| K | **Kudos** (`/kudos`) | Your wallet: Hot, Cold, backings, returns, history |
| ✎ | **Studio** (`/studio`) | Make things |

The header wallet chip shows **Hot · Cold** at all times, because Kudos are the center of the
product.

### Discover

Discover is one page with **modes** rather than one infinite feed:

| Mode | What it surfaces | Ranking |
|---|---|---|
| **For you** | Pieces and projects in your interests | Recency blended with distinct-supporter momentum |
| **Following** | Updates from projects you back and creators you follow | Newest first |
| **Rising** | Work picking up support right now | Distinct supporters in the last 14 days, scaled down for creators who already have many supporters |
| **Seeking backers** | Projects in *Idea* or *Making* with a backing goal | Momentum plus how close the project is to its goal |
| **Open collabs** | Projects with open roles | Newest first |
| **New voices** | Creators with fewer than 10 supporters | Newest first |

Cards for pieces and projects share one layout: cover or accent, title, creator, and a single
Kudos line (`✺ 42 Kudos · ❄ 310 backing`). Cards show no follower counts.

### Project pages (`/projects/:id`)

The project page is the most important page on the platform. Top to bottom:

1. **Hero:** cover, title, one-line pitch, stage track (Idea → Making → Released → Sustaining).
2. **Kudos panel:** Cold Kudos backed vs. goal, number of backers, the backer terms in plain
   language ("Backers share 10% of the Kudos this project earns, up to 2× what they put in"), and
   two actions: **Give Kudos** and **Back this project**.
3. **Story:** the creator's description.
4. **Milestones:** the plan, what each one releases, and which are delivered.
5. **Process log:** dated updates from the creator. This is also where human authorship shows,
   because people can watch the work get made.
6. **Open roles:** collaboration asks, with a "Raise your hand" action.
7. **Backers wall:** backer numbers (#1, #2, …) and an *Early believer* mark for anyone who backed
   during *Idea*.
8. **Made by humans:** the originality confirmation and AI-use disclosure.

### Creator profiles (`/:username`)

A profile answers "who is this, and can I trust them?" in about five seconds:

* Name, bio, location, **Follow**.
* **Reputation signals** (see below).
* Tabs: **Work** (pieces), **Projects**, **Believes in** (projects they back), and **Portfolio**
  (the existing portfolio builder for creators who want a full story page).

### Reputation: signals, not scores

Reputation is computed live from what happened. There is no single number to game.

| Signal | Meaning | Why it matters |
|---|---|---|
| **Backed by** | Distinct people who have given Kudos to or backed this creator | Breadth of support, which is harder to fake than volume |
| **Delivered** | Milestones delivered out of milestones promised | Tells backers whether this person follows through |
| **Supports** | Distinct creators this person has given to or backed | Rewards being part of the community, not just taking from it |
| **Early believer** | Projects this person backed during *Idea* that went on to ship | Rewards taste and turns supporters into curators |
| **Process posts** | Updates published on their projects | Shows the work being made by a human |

### Circles (`/circles`)

Circles are craft-based communities such as Short Fiction, Poetry, Essays & Ideas, Visual Art,
Music & Sound, Games & Interactive, Film & Scripts, and Research & Archives. In the first version
a circle is a curated set of tags and work types with its own Discover page. Later phases add
membership, critique threads, monthly prompts, and circle-run backing rounds (see roadmap).

### Collaboration

Projects can list **open roles** ("Illustrator for 12 chapter plates", "Arabic → French
translator"). Raising your hand sends a message to the creator's inbox. Later phases add accepted
collaborators with credits on the project page and a share of returns.

### Studio

The studio's project editor gains a **Kudos & backing** section (stage, pitch, backing goal,
backer share, return cap), a **milestones** editor, a **process log** composer, **open roles**, and
the **Made by humans** disclosure. Publishing a project requires confirming the work is original
and human-made.

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
* **Enforcement (later phase):** community reports, with circle stewards reviewing them;
  confirmed violations remove the work and freeze its Kudos.

## 6. Visual and interaction language

* **Paper and ink.** A warm paper background, deep ink text, Fraunces for display and Manrope
  for UI. It should read like a creative studio, not a trading dashboard.
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
| **1: Foundations** | Hot/Cold ledger, giving to pieces and projects, backing with stage weights, milestones and releases, returns with caps, cancel-and-thaw, 48-hour change of heart, weekly allowance, project pages, process log, open roles, follows, reputation signals, Discover modes, tag-based Circles, wallet page, AI disclosure | **This change** |
| 2: Circles | Membership, critique threads, monthly prompts, circle stewards, circle-run backing rounds | Next |
| 3: Collaboration | Accepted collaborators, credits, collaborator share of returns, project↔piece linking | Next |
| 4: Trust | Automatic thaw for dormant projects (no update in 90 days), reports and moderation, weighting new accounts' Kudos lower in reputation | Planned |
| 5: Sustainability | Creator payouts (KYC, region rules, legal review), memberships for released projects, mobile parity | Planned |

## 8. Success measures

* Share of new creators who receive Kudos from at least 5 distinct people within 30 days.
* Share of backed projects that deliver at least one milestone.
* Share of Kudos that circulate (are spent by creators on other creators) rather than sit idle.
* Median number of early believers per released project.
