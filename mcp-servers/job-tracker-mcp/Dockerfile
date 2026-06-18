# --- Stage 1: builder ---
# Installs all deps (incl. dev) and compiles TS to dist/.
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency manifests first so this layer caches when source changes.
COPY package.json package-lock.json ./
RUN npm ci

# Now bring in source and compile.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Stage 2: runtime ---
# Fresh image, prod deps only, just dist/.
FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Prod deps only — leaves out tsx, typescript, @types/*.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Compiled JS from the builder stage.
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
