#!/bin/bash
cd "$(dirname "$0")/backend"
echo "=== Pushing schema to DB and regenerating Prisma client ==="
DATABASE_URL="file:./dev.db" npx prisma@5.9.1 db push --skip-generate
DATABASE_URL="file:./dev.db" npx prisma@5.9.1 generate
echo "=== Prisma client regenerated. Restarting backend ==="
npm run start:dev
