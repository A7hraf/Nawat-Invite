# ── Nawat Invites · production image ─────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build needs a syntactically valid secret; the real one is provided at runtime.
RUN APP_SECRET=build-time-placeholder-secret-0000000000000 DATABASE_URL=pglite:memory npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS run
WORKDIR /app
# Chromium + Arabic fonts for PDF reports
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-noto-core fonts-noto-ui-core fonts-kacst ca-certificates tini \
    && rm -rf /var/lib/apt/lists/* && groupadd -r nawat && useradd -r -g nawat -d /app nawat \
    && mkdir -p /data/uploads && chown -R nawat:nawat /data
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 CHROMIUM_PATH=/usr/bin/chromium UPLOAD_DIR=/data/uploads
COPY --from=build --chown=nawat:nawat /app/.next ./.next
COPY --from=build --chown=nawat:nawat /app/node_modules ./node_modules
COPY --from=build --chown=nawat:nawat /app/package.json /app/next.config.ts /app/tsconfig.json ./
COPY --from=build --chown=nawat:nawat /app/drizzle ./drizzle
COPY --from=build --chown=nawat:nawat /app/scripts ./scripts
COPY --from=build --chown=nawat:nawat /app/src ./src
USER nawat
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
# Apply migrations, seed (idempotent), then start.
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npx next start -p 3000"]
