# Herd 2 Home

Indiana pilot SaaS scaffold for small farms: **strong herd management** plus a thin processor → freezer → checkout spine.

Multi-tenant farms, multi-species animals/lots, and herd-book lifecycle:

`on farm → reserved share → booked/at locker → hanging → in freezer → sold` (+ dead/culled)

**Herd v1.1** adds class/stage (heifer vs cow), sale flags + path, weight/health/breeding history, meat-withdrawal gating, share roster, animal timeline, tag/EID search, group lot moves, and a light breeding calendar.

**Cost tracking** adds purchase/acquisition price on animals, a farm cost ledger (hay, feed, vet, haul, processing, other), and allocation across animals (equal per head default; also animal-days, weight gain, manual). Animal and lot pages show cost basis; $/lb and margin remain a light stub until yield/sale rollup.

Checkout data model distinguishes **inspected retail** vs **custom-exempt live shares**, with farm or butcher pickup. Stripe is stubbed (`stripePaymentIntentId` only).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite
- Cookie session auth (email/password)

## Setup

```bash
pnpm install
cp .env.example .env   # already fine for local SQLite
pnpm db:push
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seed login

| Field    | Value                     |
| -------- | ------------------------- |
| Email    | `nathan@herd2home.local`  |
| Password | `pilot1234`               |

Seed creates **3 Indiana pilot farms** (Hughes Family Farm, Sugar Creek Livestock, White River Pastures). Use the farm switcher in the header.

## Scripts

| Script        | Description                |
| ------------- | -------------------------- |
| `pnpm dev`    | Start Next.js dev server   |
| `pnpm build`  | Production build           |
| `pnpm start`  | Run production server      |
| `pnpm db:push`| Push Prisma schema to SQLite |
| `pnpm db:seed`| Seed pilot data            |
| `pnpm db:studio` | Prisma Studio           |

## What’s strong vs stubbed

| Area | Status |
| --- | --- |
| Auth + multi-farm tenancy | Implemented |
| Herd book (edit, class, sale path, weights, health/withdrawal, breeding, timeline, share roster, calendar, group moves) | Implemented (v1.1) |
| Cost / feed ledger + purchase price + allocation methods | Implemented (equal per head default) |
| Processor jobs + cut sheets | Thin read UI + seed |
| Freezer inventory | Thin read UI + seed |
| Butcher profiles/pricing | Thin read UI + seed |
| Checkout (inspected + custom-exempt) | Thin read UI + seed; Stripe stub field |

## Product notes

Working name is temporary. Indiana is the sole launch geography for compliance copy/defaults. National shipping, SNAP Online, genetics tools, and a public marketplace are out of v1.
