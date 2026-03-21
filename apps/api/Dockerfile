FROM node:20-alpine

WORKDIR /app

# Copy root package files (monorepo)
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# Install all deps (no audit)
RUN npm install --no-audit --no-fund --ignore-scripts

# Copy API source
COPY apps/api/ ./apps/api/

# Build
WORKDIR /app/apps/api
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/main"]
