# Car App Frontend Skeleton

This is the first real frontend package connected to the backend API.

## What it does
- loads saved search profiles from `/api/search-profiles`
- loads listings from `/api/listings`
- supports local result filters
- toggles favorite and shortlist state through `PATCH /api/listings/:id/state`
- saves shared notes for a selected listing
- proxies API requests to your local backend during development

## Requirements
- Node.js 20+
- Backend skeleton already running on `http://localhost:3001`

## Setup

### 1. Extract the package
Unzip the folder anywhere on your PC.

### 2. Open Command Prompt in the folder

```bat
cd path\to\car_app_frontend_skeleton
```

### 3. Install packages

```bat
npm.cmd install
```

### 4. Create `.env`

```bat
copy .env.example .env
```

Edit `.env` only if your backend is not on port 3001.

### 5. Start the frontend

```bat
npm.cmd run dev
```

### 6. Open in browser

```text
http://localhost:5173
```

## Expected behavior
- the top bar should show your saved search profile
- cards should load from Supabase-backed API data
- favorite and shortlist buttons should update the backend
- selecting a card should show note editing on the right

## If the frontend cannot talk to the backend
Check that your backend is running and that this works first:

- `http://localhost:3001/health`
- `http://localhost:3001/api/search-profiles`
- `http://localhost:3001/api/listings?sortBy=score_desc`

## Current scope
This package is a frontend skeleton. It does **not** yet do:
- real `POST /api/search-jobs` polling flow
- compare page
- authentication
- hosted deployment

Those are the next layers after this live connection step.
