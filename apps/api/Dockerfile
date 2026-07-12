# InfluenceX API (NestJS) - production Docker image.
# Build context MUST be the monorepo ROOT (not apps/api/), chunki bu yerda
# packages/shared'ga bog'liqlik bor: `docker build -f apps/api/Dockerfile .`
# Railway'da: Root Directory = repo ildizi, Dockerfile Path = apps/api/Dockerfile.

# ---- 1-bosqich: bog'liqliklarni o'rnatish + build ----
FROM node:20-alpine AS builder
WORKDIR /repo

# Prisma'ning musl query engine'i uchun openssl kerak (Alpine'da standart o'rnatilmagan).
RUN apk add --no-cache openssl

# Monorepo workspace'lari uchun avval FAQAT package.json'larni nusxalaymiz -
# bu Docker layer keshini samarali ishlatadi (kod o'zgarsa ham, dependencylar
# o'zgarmasa, `npm install` qatlami qayta bajarilmaydi).
COPY package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json

# Eslatma: lockfile hali repo'da yo'q (birinchi haqiqiy `npm install` CI/CD'da
# ishga tushganda yaratiladi) - shuning uchun `npm ci` emas, `npm install`.
# Lockfile qo'shilgandan keyin bu qatorni `npm ci` ga almashtirish tavsiya etiladi
# (tezroq va aniqroq reproducible build uchun).
RUN npm install

# Endi qolgan manba kodni nusxalaymiz
COPY packages/shared packages/shared
COPY apps/api apps/api

# packages/shared avval kompilyatsiya qilinadi (dist/ - boshqa barcha
# workspace'lar shu compiled JS'ga bog'liq, xom .ts emas).
RUN npm run build --workspace=packages/shared

# Prisma Client sxema asosida generatsiya qilinadi (DATABASE_URL shart emas -
# faqat schema.prisma fayli kifoya).
RUN npm run prisma:generate --workspace=apps/api

# NestJS'ni kompilyatsiya qilish (tsc -> dist/)
RUN npm run build --workspace=apps/api

# Faqat production bog'liqliklarini qoldirib, devDependencies'ni olib tashlaymiz
RUN npm prune --omit=dev

# ---- 2-bosqich: yengil runtime image ----
FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production

RUN apk add --no-cache openssl
RUN addgroup -S influencex && adduser -S influencex -G influencex

# MUHIM: npm workspaces bog'liqliklarni ILDIZ node_modules'ga hoisting qiladi
# (apps/api/node_modules odatda mavjud emas) - shuning uchun faqat ildiz
# node_modules nusxalanadi. Prisma Client generatsiyasi ham shu yerga tushadi
# (node_modules/@prisma/client, node_modules/.prisma/client).
COPY --from=builder /repo/node_modules node_modules
COPY --from=builder /repo/packages/shared/dist packages/shared/dist
COPY --from=builder /repo/packages/shared/package.json packages/shared/package.json
COPY --from=builder /repo/apps/api/dist apps/api/dist
COPY --from=builder /repo/apps/api/prisma apps/api/prisma
COPY --from=builder /repo/apps/api/package.json apps/api/package.json

USER influencex
WORKDIR /repo/apps/api

EXPOSE 3000

# Konteyner ishga tushganda avval Prisma migratsiyalari qo'llaniladi (production'da
# xavfsiz - faqat pending migratsiyalarni qo'llaydi, `migrate dev` kabi interaktiv
# emas), so'ng API ishga tushadi. Railway'da buni alohida "Release Command"ga
# ko'chirish ham mumkin, lekin shu yerda ham xavfsiz standart sifatida qoldiriladi.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
