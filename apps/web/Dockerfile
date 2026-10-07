FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN pnpm install

# Copy source
COPY packages/shared ./packages/shared/
COPY apps/web ./apps/web/

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "dev"]
