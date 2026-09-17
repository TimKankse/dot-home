
FROM node:24-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/node_modules ./node_modules

ENV PATH="/app/node_modules/.bin:${PATH}"

COPY docker-entrypoint.sh ./
COPY scripts/prepare-database.mjs ./scripts/prepare-database.mjs
RUN chmod +x docker-entrypoint.sh
RUN mkdir -p /app/config
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 9292

ENV PORT=9292
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/config/dothome.db"

VOLUME ["/app/config"]

CMD ["./docker-entrypoint.sh"]
