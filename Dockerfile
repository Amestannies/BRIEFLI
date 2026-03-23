FROM node:20-alpine

# Install openssl for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files for dependency install
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only (no build needed — using pre-built dist)
RUN npm install --omit=dev --no-audit --no-fund --include-workspace-root

# Copy pre-built dist files (built locally before pushing)
COPY packages/shared/dist/ ./packages/shared/dist/
COPY apps/api/dist/ ./apps/api/dist/

# Copy Prisma schema and generate client for this platform
COPY apps/api/prisma/ ./apps/api/prisma/
RUN npx prisma generate --schema=./apps/api/prisma/schema.prisma

EXPOSE 3001
ENV NODE_ENV=production
WORKDIR /app/apps/api
CMD ["node", "dist/main"]
