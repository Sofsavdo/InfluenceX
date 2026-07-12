# InfluenceX Admin Panel (Next.js) - production Docker image.
# Build context MUST be the monorepo ROOT: `docker build -f apps/admin/Dockerfile .`
# Railway'da: Root Directory = repo ildizi, Dockerfile Path = apps/admin/Dockerfile.

# ---- 1-bosqich: build ----
FROM node:20-alpine AS builder
WORKDIR /repo

COPY package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/admin/package.json apps/admin/package.json

RUN npm install

COPY packages/shared packages/shared
COPY apps/admin apps/admin

RUN npm run build --workspace=packages/shared

# MUHIM: NEXT_PUBLIC_* o'zgaruvchilar Next.js tomonidan BUILD vaqtida statik
# JS'ga "yopishtiriladi" (runtime env emas) - shuning uchun bu yerda ARG/ENV
# sifatida build bosqichida berilishi SHART (docker-compose.yml / Railway
# "Build Variables" orqali).
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN npm run build --workspace=apps/admin

# ---- 2-bosqich: Next.js "standalone" runtime (next.config.mjs: output: 'standalone') ----
# Bu rejim faqat runtime uchun zarur fayllarni (minimal node_modules + server.js)
# .next/standalone ichiga yig'adi - image hajmi to'liq node_modules'siz ancha kichik.
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S influencex && adduser -S influencex -G influencex

COPY --from=builder /repo/apps/admin/.next/standalone ./
COPY --from=builder /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /repo/apps/admin/public ./apps/admin/public

USER influencex
EXPOSE 3001
ENV PORT=3001

# standalone build'ning kirish nuqtasi monorepo tuzilmasini saqlaydi:
# apps/admin/server.js (workspace root'dan chaqiriladi).
CMD ["node", "apps/admin/server.js"]
