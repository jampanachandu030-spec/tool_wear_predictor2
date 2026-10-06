# Tool Wear Predictor

This repository is organized into three areas:

- `frontend/`: the existing Vite, React, and TanStack Start application.
- `backend/`: Node.js authentication API that stores accounts and sessions in MongoDB.
- `database/`: reserved for database schemas and migrations.

## Run the frontend

```sh
cd frontend
npm ci
npm run dev
```

See [frontend/README.md](frontend/README.md) for project-specific setup notes.

## MongoDB-backed authentication

The sign-in and sign-up forms use a separate Node.js API for MongoDB access. Follow [backend/README.md](backend/README.md) to configure the database and run/deploy the API, then set `VITE_AUTH_API_URL` for the frontend. Do not put the MongoDB URI in a `VITE_*` variable or commit it to the repository.