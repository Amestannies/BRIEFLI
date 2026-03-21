FROM node:20-alpine

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Copy monorepo root manifests
COPY package.json package-lock.json ./

# Copy all package manifests (needed for workspace install)
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/

# Install all workspace dependencies
RUN npm install --no-audit --no-fund --include-workspace-root

# Copy source for packages that need to be built first
COPY packages/ ./packages/

# Build @briefli/shared so the API can import from it
RUN npm run build --workspace=packages/shared

# Copy API source
COPY apps/api/ ./apps/api/

# Generate Prisma client
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Build the API
WORKDIR /app/apps/api
RUN npm run build

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/main"]
