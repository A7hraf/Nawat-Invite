# ── Nawat Invites · production image ─────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# The build needs a syntactically valid secret; the real one is provided at runtime.
RUN APP_SECRET=build-time-placeholder-secret-0000000000000 DATABASE_URL=pglite:memory npm run build \
 && npm prune --omit=dev

FROM node:22-bookworm-slim AS run
WORKDIR /app
# Chromium + Arabic fonts for PDF reports; tini for clean signal handling
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-noto-core fonts-noto-ui-core fonts-kacst ca-certificates tini \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -r nawat && useradd -r -g nawat -d /app nawat \
 && mkdir -p /data/uploads && chown -R nawat:nawat /data /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 CHROMIUM_PATH=/usr/bin/chromium UPLOAD_DIR=/data/uploads
COPY --from=build --chown=nawat:nawat /app/.next ./.next
COPY --from=build --chown=nawat:nawat /app/node_modules ./node_modules
COPY --from=build --chown=nawat:nawat /app/package.json /app/next.config.mjs /app/tsconfig.json ./
COPY --from=build --chown=nawat:nawat /app/drizzle ./drizzle
COPY --from=build --chown=nawat:nawat /app/scripts ./scripts
COPY --from=build --chown=nawat:nawat /app/src ./src
COPY --from=build --chown=nawat:nawat /app/public ./public
USER nawat
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
# Apply migrations, seed (idempotent: plans, themes, first admin), then start.
CMD ["sh", "-c", "node_modules/.bin/tsx --conditions=react-server scripts/migrate.ts && node_modules/.bin/tsx --conditions=react-server scripts/seed.ts && exec node_modules/.bin/next start -p ${PORT:-3000}"]
