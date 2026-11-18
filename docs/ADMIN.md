# Admin dashboard — setup & roles

The staff dashboard lives at **`/#/admin`**. Staff sign in with **Google**; access is **invite-only** and every action is written to the **activity log**.

## 1. Database (Neon PostgreSQL via Vercel)

SQLite can't persist on Vercel, so the shop uses PostgreSQL. The database **`cheaplaptop-db`** (Neon, free plan, region `iad1`) is connected to the Vercel project from **Storage**, which injects `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) into Production and Preview.

On each deploy, `scripts/vercel-build.mjs` runs `prisma db push` to create or update the tables. On the first catalogue load, the 66 products from `public/data/products.json` are imported.

> `db push` runs without `--accept-data-loss`: a schema change that would delete data fails the build instead of dropping it.
> For local dev, copy both variables from Vercel → Storage → cheaplaptop-db → `.env.local` into your `.env`.

## 2. Google sign-in

1. **Google Cloud Console → APIs & Services → OAuth consent screen**: External, app name "Cheap Laptops Admin", your support email. Scopes: `openid`, `email`, `profile` (non-sensitive, no verification needed).
2. **Credentials → Create credentials → OAuth client ID → Web application**
   - Authorized JavaScript origins: `https://cheaplaptop.vercel.app`
   - Authorized redirect URIs: `https://cheaplaptop.vercel.app/api/auth/google/callback`
     (add `http://localhost:3000/api/auth/google/callback` for local dev)
3. Add to Vercel env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## 3. Other environment variables

| Variable | Value |
|---|---|
| `APP_URL` | `https://cheaplaptop.vercel.app` (no trailing slash). Builds the OAuth redirect URI. |
| `AUTH_SECRET` | 32+ random characters: `openssl rand -base64 48`. Signs session cookies. **Required in production.** |
| `OWNER_EMAILS` | Your Google email(s), comma-separated. They become **Owner** on first sign-in. |

Redeploy after adding the variables. Then open `/#/admin` → **Continue with Google**. You are the first Owner; invite the rest of the team from **Staff & roles**.

## Roles

| Role | For | Can |
|---|---|---|
| **Owner** | Business owner | Everything, including managing other owners |
| **Administrator** | IT / operations lead | Everything except managing owners |
| **Store manager** | Shop manager | Products & prices, stock, orders, sales/finance reports, view staff & activity |
| **Stock keeper** | Warehouse | View products, restock / damage / loss / stock counts |
| **Sales agent** | Shop floor / phone orders | Process orders, look up products & stock (no revenue figures) |
| **Viewer** | Accountant / analyst | Read-only, incl. finance figures |

Rules enforced on the server (not only hidden in the UI):

- Least privilege: each API route checks a permission (`src/lib/rbac.ts`).
- You can only grant roles **below your own** (owners can grant any). You can't change your own role or disable yourself.
- The store always keeps **at least one active owner**.
- Disabling someone or changing their role **signs them out immediately** (session version bump). "Sign out of all devices" does the same for yourself.
- Finance fields (cost price, revenue, stock value) are stripped from API responses for roles without `finance:view`.

## Stock management

Stock is a **ledger**: it never changes without a `StockMovement` row (who, when, why, before → after).

- Opening stock when a product is created.
- **Sale** when a customer orders (atomic, row-locked — no overselling).
- **Order cancelled** restores stock automatically.
- Manual: **Restock**, **Customer return**, **Damaged**, **Lost/stolen**, **Stock count correction**. Damage, loss and counts require a reason.
- Per-product **low-stock alert** threshold; alerts on the dashboard and the Inventory page.

Products that have been ordered can't be hard-deleted (order history must stay intact). **Archive** them instead, which hides them from the store.

## Security notes

- OAuth 2.0 authorization code flow with **PKCE** + `state`; only Google-verified emails are accepted, and the Google account ID is bound on first sign-in.
- Session: httpOnly, `Secure`, `SameSite=Lax` HMAC-signed cookie, 8 h, re-validated against the DB on each request.
- Mutations require a same-origin `Origin` header (CSRF).
