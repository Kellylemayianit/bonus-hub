# Bonas Hub

B2B listing and inquiry platform on Cloudflare Workers + D1. Builds steps 1-2 of the plan:
skeleton, auth, onboarding, approval state machine, admin approval queue.

## Run it
    npm install
    npx wrangler d1 create bonas-hub        # paste database_id into wrangler.toml
    npm run db:local
    echo 'ADMIN_EMAILS = "you@example.com"' >> wrangler.toml   # under [vars]
    npm run dev

Register with the admin email to get /admin. In dev, the verification code shows on screen
and Turnstile/Supabase are skipped when their secrets are not set.

## Secrets (production)
    wrangler secret put TURNSTILE_SECRET        # and TURNSTILE_SITE_KEY as a var
    wrangler secret put SUPABASE_SERVICE_KEY    # plus SUPABASE_URL var; private bucket "verification-docs"

## Layout
- migrations/0001_init.sql  full data model (FTS5 on products, indexes)
- src/lib/state.js          account lifecycle (pure, tested): the backbone
- src/routes/               auth, onboarding, admin
- src/templates/            shared template functions (SSR now; hydration in step 4)
- test/                     npm test

## Next (build order)
3 profiles + product posting (Cloudinary signed uploads), 4 public browse/search + edge cache,
5 requests/inquiries/chat, 6 rest of admin (reports, audit log view, categories), 7 polish.
Step 7 includes rewording "Secure Transactions" and "Buyer Protection" in the mockup.
