# Realtime Notes Backend - initial

This scaffold sets up an Express + TypeScript + Prisma backend with JWT auth and a basic WebSocket collaboration server.

**What's included**
- Prisma schema and client
- Auth routes (register / login) using JWT
- Notes CRUD + simple search and versioning
- WebSocket server with manual op-based sync + simple transform logic

**Local quick start (see .env.example in repo)**
1. Install dependencies
2. Set up DATABASE_URL and JWT_SECRET in `.env`
3. `npx prisma generate`
4. `npx prisma migrate dev --name init` (creates local DB and schema)
5. `npm run dev`


---