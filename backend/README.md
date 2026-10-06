# EdgeWear authentication API

This Node.js API stores accounts and sessions in MongoDB. The frontend never connects directly to MongoDB and never receives database credentials.

## Configure MongoDB

1. Create a MongoDB database (for example, a MongoDB Atlas cluster) and allow the API server to connect to it in the cluster's network-access settings.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` to the connection string from MongoDB. Set `MONGODB_DB` if the URI does not specify a database.
3. Set `FRONTEND_ORIGINS` to the exact frontend origin or comma-separated origins. For local development, the API permits localhost origins.

Never commit `.env` or publish the MongoDB connection string.

## Run locally

In a terminal:

```sh
cd backend
npm install
npm run dev
```

In another terminal, create `frontend/.env.local`:

```dotenv
VITE_AUTH_API_URL=http://localhost:3001
```

Then run the frontend from `frontend/` with `npm run dev`. Configure the frontend's actual origin in `FRONTEND_ORIGINS` when running outside local development.

The API listens on `PORT` (default `3001`) and exposes `/api/auth/signup`, `/api/auth/signin`, `/api/auth/session`, and `/api/auth/signout`. It uses HttpOnly session cookies and salted scrypt password hashes; passwords are never stored as plain text. In production, serve the API over HTTPS and set `NODE_ENV=production`.

Because the app's Lovable preview/build targets Cloudflare Workers, deploy this MongoDB API separately on a Node.js host. Configure `VITE_AUTH_API_URL` in the frontend build to point to it. For browsers that block third-party cookies, use a custom API domain on the same site as the frontend or proxy the API through the frontend domain.