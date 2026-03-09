# Car App Backend Skeleton

This is the first API starter for the shared car search app.

## What it includes
- `GET /health`
- `GET /api/search-profiles`
- `GET /api/listings`
- `PATCH /api/listings/:id/state`
- `POST /api/search-jobs`
- `GET /api/search-jobs/:id`

It connects to the Supabase schema you already created.

## Stack
- Node.js
- TypeScript
- Fastify
- Supabase JS client
- Zod validation

## 1. Install Node.js
Use Node 20 or newer.

## 2. Install dependencies
```bash
npm install
```

## 3. Create `.env`
Copy `.env.example` to `.env` and fill in:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEFAULT_USER_ID`

## 4. Find `DEFAULT_USER_ID`
Run this in Supabase SQL Editor:
```sql
select id, email from users;
```
Use the seeded user's UUID as `DEFAULT_USER_ID`.

## 5. Start the API
```bash
npm run dev
```

By default it runs on:
- `http://localhost:3001`

## 6. Quick endpoint tests
### Health
```bash
curl http://localhost:3001/health
```

### Search profiles
```bash
curl http://localhost:3001/api/search-profiles
```

### Listings
```bash
curl "http://localhost:3001/api/listings?sortBy=score_desc"
```

### Update listing state
Replace `LISTING_ID` with a real UUID from `listing_overview`.
```bash
curl -X PATCH http://localhost:3001/api/listings/LISTING_ID/state \
  -H "Content-Type: application/json" \
  -d '{"favorite":true,"shortlisted":true,"rejected":false,"notes":"Looks promising"}'
```

### Create search job
Replace `PROFILE_ID` with a real UUID from `search_profiles`.
```bash
curl -X POST http://localhost:3001/api/search-jobs \
  -H "Content-Type: application/json" \
  -d '{"profileId":"PROFILE_ID"}'
```

### Get search job
```bash
curl http://localhost:3001/api/search-jobs/JOB_ID
```

## Important note
This is a backend skeleton.
The search-job route currently creates a placeholder job row and marks it complete.
It does **not** fetch live listings yet.
That will be the next implementation step.

## Best next step after this works
Connect the frontend dashboard to:
- `GET /api/search-profiles`
- `GET /api/listings`
- `PATCH /api/listings/:id/state`

Then replace the placeholder search-job behavior with the first real source adapter.
