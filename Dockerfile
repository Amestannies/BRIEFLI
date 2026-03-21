FROM node:20-alpine

WORKDIR /app

# Copy everything needed for the monorepo install
COPY package.json package-lock.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/

# Install dependencies (no audit, no vulnerability scan)
RUN npm install --no-audit --no-fund --workspace=apps/api --workspace=packages/shared --workspace=packages/ui --workspace=packages/config --include-workspace-root

# Copy API source
COPY apps/api/ ./apps/api/

# Build the API
WORKDIR /app/apps/api
RUN npm run build

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/main"]
