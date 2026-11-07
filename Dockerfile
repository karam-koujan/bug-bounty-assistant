# Dockerfile for ai-search-assistant
# -------------------------------------------------
# This image builds and runs the Next.js AI‑search‑assistant app.
# It is designed to work on any machine with Docker installed.
# -------------------------------------------------
# 1️⃣  Base image – Node 22 (Alpine for a smaller footprint)
#    Use the `node:22-alpine` tag; on ARM64/macM1 it will still work
#    because Docker pulls the appropriate manifest.
FROM node:22-alpine AS base

# 2️⃣  Create a non‑root user (best practice) and set the working directory
RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup
WORKDIR /app

# 3️⃣  Install build dependencies (python3, make, g++ are needed for sharp, etc.)
#    Alpine uses apk; Debian/Ubuntu users would use apt‑get.
#    We keep the image lean by installing only what the app needs.
RUN apk add --no-cache \
      bash \
      git \
      openssl \
      python3 \
      make \
      g++ \
      ca-certificates

# 4️⃣  Copy package manifests first (leverages Docker cache)
COPY package.json package-lock.json ./

# 5️⃣  Install production dependencies only (devDependencies are not needed at runtime)
#    --omit=dev tells pnpm/npm to skip dev deps.
#    If you use pnpm, replace npm ci with `pnpm fetch --prod && pnpm install --frozen-lockfile`
RUN npm ci --omit=dev

# 6️⃣  Copy the source code (everything outside of node_modules/.next)
COPY . .

# 7️⃣  Fix ownership so the non‑root user can write logs / db if needed
RUN chown -R nodeuser:nodegroup /app
USER nodeuser

# 8️⃣  Expose the default Next.js port
EXPOSE 3000

# 9️⃣  Default command – start the dev server (or production server)
#    `npm run dev` uses Turbopack (if available) or the default webpack dev server.
#    For production you may prefer `npm start` which runs `next start -p 3000`.
#    The environment variables (AI_PROVIDER, AI_API_KEY, AI_BASE_URL, AI_MODEL,
#    DATABASE_URL, etc.) should be supplied at runtime via a .env file or Docker run -e.
#
#    **Important**: Never commit real secrets. Copy `.env.example` to `.env.local`
#    and adjust values for your environment before building, or pass them at runtime.
CMD ["npm", "run", "dev"]

# -------------------------------------------------
# OPTIONAL: Production stage (uncomment if you want a separate production build)
#
# FROM node:22-alpine AS production
# WORKDIR /app
# COPY --from=base /app/node_modules ./node_modules
# COPY --from=base /app/public ./public
# COPY --from=base /app/package.json ./package.json
# COPY --from=base /app/.next ./.next
# USER nodeuser
# EXPOSE 3000
# ENV NODE_ENV production
# CMD ["npm", "start"]