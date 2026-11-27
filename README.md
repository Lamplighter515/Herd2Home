# Herd 2 Home

Indiana pilot SaaS for small farms: **strong herd management** plus a thin processor → freezer → checkout spine, with a **public mobile buyer storefront**.

Multi-tenant farms, multi-species animals/lots, and status lifecycle:

`pasture → booked/at locker → hanging → in freezer → sold/reserved`

Checkout distinguishes **inspected retail** vs **custom-exempt live shares**, with farm or butcher pickup. Stripe is stubbed (`stripePaymentIntentId` only).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite
- Cookie session auth for farmers; public shop needs no login

## Setup

```bash
pnpm install
cp .env.example .env   # already fine for local SQLite
pnpm db:push
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — guests go to the public shop; signed-in farmers go to ops.

### Public buyer storefront

| URL | What |
| --- | --- |
| [/shop](http://localhost:3000/shop) | Discover pilot farms with available product |
| [/shop/hughes-family-farm](http://localhost:3000/shop/hughes-family-farm) | Example farm shop (retail cuts + live shares) |
| [/shop/sugar-creek-livestock](http://localhost:3000/shop/sugar-creek-livestock) | Sugar Creek shop |
| [/shop/white-river-pastures](http://localhost:3000/shop/white-river-pastures) | White River shop |
| [/shop/cart](http://localhost:3000/shop/cart) | Cart (one farm per order) |
| [/shop/checkout](http://localhost:3000/shop/checkout) | Buyer info, pickup choice, place reservation |

**Sale modes in the shop**

- **Inspected retail** — freezer packages sold by cut/weight; add to cart normally.
- **Custom-exempt live shares** — reserve a quarter / half / whole of a living animal and name owners on the roster. Not sold by the pound.

Pickup is **on-farm** or **butcher/locker** when the farm has a locker on file. Checkout creates a reserved order and stub Stripe id; packages move to `RESERVED`.

### Seed farmer login

| Field    | Value                     |
| -------- | ------------------------- |
| Email    | `nathan@herd2home.local`  |
| Password | `pilot1234`               |

Ops UI: [/login](http://localhost:3000/login) → dashboard, herd, processor, freezer, butchers, checkout (farm-side order list). Seed creates **3 Indiana pilot farms**. Use the farm switcher in the header. Each farm page links to its public shop (`/shop/[slug]`).

## Scripts

| Script        | Description                |
| --- | --- |
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
| Herd CRUD, lots, search/filter, lifecycle | Implemented |
| Public mobile shop (browse, cart, checkout) | Implemented |
| Processor jobs + cut sheets | Thin read UI + seed |
| Freezer inventory | Thin read UI + seed |
| Butcher profiles/pricing | Thin read UI + seed |
| Stripe capture | Stub field only |

## Product notes

Working name is temporary. Indiana is the sole launch geography for compliance copy/defaults. National shipping, SNAP Online, genetics tools, and a two-sided consumer marketplace are out of v1.
