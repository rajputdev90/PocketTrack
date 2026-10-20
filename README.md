# PocketTrack

A student-oriented personal finance tracker built with React, TypeScript, Vite, and Supabase. It supports browser-local use without credentials and owner-scoped persistence with Supabase when configured.

## Run locally

```sh
npm install
npm run dev
```

With no `.env.local`, PocketTrack runs in **Local workspace** mode and saves to this browser's local storage. That data is not synced or backed up.

## Connect Supabase

1. Create a Supabase project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. In the project's **Connect** panel, select **React** and **Vite**, then copy the Project URL and publishable key. You can also find keys under **Project Settings → API Keys**.
3. Put the values in the root `.env.local` file as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never use a secret or service-role key in this client app.
4. Review and run the SQL files in `supabase/migrations/` in filename order. The additive migrations add profiles, shared/custom categories, normalized category budgets, valuation history, owner-safe references, stronger RLS, and an atomic budget-save function. They preserve existing rows. Do not run migrations against important existing data without first reviewing the target project's schema and backing it up.
5. In **Authentication → Providers → Email**, enable email sign-in. For development you may disable email confirmation; for production configure SMTP and keep confirmation enabled.
6. Restart Vite. Create an account in the app, then sign in. Each data table has row-level security tied to `auth.uid()`.

For production, set the deployed domain as the Supabase **Site URL** and add the production and local app URLs under **Authentication → URL Configuration → Redirect URLs**. Keep email confirmation enabled and configure a trusted SMTP provider.

Only the public/publishable Supabase key belongs in frontend configuration. Never put a service-role key in `.env.local` or frontend code. Local browser data does not automatically migrate into Supabase.

## Financial model

- Monthly expenses include only transactions whose type is `expense`; income and transfers are separate.
- Remaining budget is configured monthly budget less qualifying expenses. An unset budget is presented as unset.
- Savings value is opening balances plus contribution events, less withdrawals, plus manual valuation deltas. Contributions and withdrawals do not affect income or spending. Source-to-source transfer activity is reserved in the data model and not implemented in the current UI.
- A manually entered valuation is not a live price. Goals are planning amounts and are not included as additional savings.
- Amounts are stored as `numeric(14,2)` in Postgres. The browser formats INR by default.

## Current limits

The first release has working transaction, budget, savings-source, goal, analytics, rule-based coach, theme, currency, and monthly PDF workflows. Local mode is single-browser only. Supabase schema and RLS are included, but multi-source transfers, user-created categories, category transactions linked to savings, a conversational AI provider, notifications, and account deletion are not included. Review the migration and configure Supabase before production use.

## Deploy

### Prepare and protect configuration

- Use Node.js `20.19+` or `22.12+` (`package.json` records this requirement).
- `.env.local`, `.env` and other `.env.*` files are ignored by Git. `.env.example` contains placeholders only and is safe to commit.
- Never put a Supabase secret/service-role key, database password, or AI provider key in a `VITE_` variable. Vite embeds `VITE_` values in the browser bundle.
- Before the first push, confirm `git status` does not list `.env.local` or any credential file.

### Deploy with GitHub and Vercel

1. Push this project to a **private** GitHub repository while it is still in development.
2. In Vercel, choose **Add New → Project**, import the GitHub repository, and keep the detected **Vite** framework settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm ci`
3. In the Vercel project's **Settings → Environment Variables**, add these for Development, Preview, and Production as appropriate:
   - `VITE_SUPABASE_URL` — Supabase Project URL.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable key (`sb_publishable_…`).
4. Deploy. `vercel.json` rewrites app routes to `index.html`, so refreshes and direct links such as `/transactions` continue to load the React app.
5. For future changes, push a commit to the connected branch. Vercel creates a deployment automatically; pushes to the production branch (normally `main`) update Production, while other branches create Preview deployments.
6. If environment variables change, save them in Vercel and redeploy (Deployments → latest deployment → **Redeploy**). Environment variable changes do not update an already-built bundle.

### Supabase production URL settings

In Supabase **Authentication → URL Configuration**:

- Set **Site URL** to the Vercel production domain, for example `https://your-project.vercel.app`.
- Add `http://localhost:5173/**` for local development and `https://your-project.vercel.app/**` to **Redirect URLs**. Add your custom production domain too, if you configure one.
- If OAuth providers are enabled, use the Supabase callback URL shown in **Authentication → Providers** in each provider's console. Provider client secrets stay in Supabase, never in Vercel frontend variables.

For email confirmation and password recovery in production, verify the email templates and configure a trusted SMTP provider. Use the same app origin for auth redirects.

### Database and security pre-launch check

The reviewed migrations are in `supabase/migrations/` and should be applied once, in filename order, to the intended Supabase project. The current project was set up by running these scripts in SQL Editor; before launch, confirm each migration is reflected in the schema and that RLS is enabled on every private table. Do not reset the project to resolve deployment issues. The two-user isolation script at `supabase/tests/rls_two_user_isolation.sql` can be used with two separate test accounts to verify one account cannot read or change the other's records. Do not run it against live user data without reviewing the script and using disposable test accounts.

### Verify and troubleshoot

Run `npm ci`, `npm test`, and `npm run build` locally before pushing. Check the Vercel build log if a deployment fails. Common fixes:

- **Missing Supabase configuration:** add both Vite variables in Vercel Settings → Environment Variables, for the deployment environment, then redeploy.
- **Supabase URL/key error:** use the Project URL and publishable key, without quotes or whitespace; do not use a secret/service-role key.
- **Auth redirects to localhost or fails:** correct the Supabase Site URL and Redirect URLs, and the OAuth provider callback URL if applicable.
- **A route returns 404 after refresh:** ensure `vercel.json` is present in the deployed commit.
- **Build fails on Node version:** use Node `20.19+` or `22.12+` in the deployment settings.

Vercel environment variables are injected at build time. Only the Project URL and publishable key belong in this client-only app. No deployment is considered complete until its Vercel deployment reports **Ready** and the deployed URL is checked.
