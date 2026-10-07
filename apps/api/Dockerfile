FROM node:20-alpine AS base
# Prisma needs the openssl binary to detect libssl and pick the matching engine
RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install

# Copy source
COPY packages/shared ./packages/shared/
COPY apps/api ./apps/api/

WORKDIR /app/apps/api

RUN pnpm prisma generate

EXPOSE 3001

CMD ["pnpm", "start:dev"]
