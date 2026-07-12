# InfluenceX — Deploy qo'llanmasi (Docker + Railway)

Bu fayl kod bazasi bilan birga tayyorlangan, lekin **hali haqiqiy deploy amalga
oshirilmagan** (foydalanuvchi so'rovi bo'yicha — "railway'da deploy qilamiz, lekin
hozir emas"). Quyidagilar Railway'da deploy qilishga tayyor bo'lgan konfiguratsiya
va bosqichma-bosqich ko'rsatma.

## 1. Arxitektura

Monorepo uchta mustaqil deploy qilinadigan xizmatdan iborat, hammasi bitta
`packages/shared` (umumiy enum/tip) paketiga bog'liq:

| Xizmat | Papka | Texnologiya | Port |
|---|---|---|---|
| API | `apps/api` | NestJS + Prisma + PostgreSQL | 3000 |
| Mini App | `apps/mini-app` | React/Vite SPA (Telegram WebApp), nginx orqali xizmat qiladi | 8080 |
| Admin Panel | `apps/admin` | Next.js (standalone) | 3001 |

Qo'shimcha infratuzilma: PostgreSQL 16, Redis 7 (hozircha faol foydalanilmayapti,
lekin escrow/chat kelajakdagi kesh/queue ehtiyojlari uchun tayyorlab qo'yilgan).

## 2. Mahalliy sinov (Docker Compose)

```bash
docker compose up --build
```

Bu quyidagilarni ishga tushiradi: `postgres:5432`, `redis:6379`, `api:3000`,
`mini-app:5173->8080`, `admin:3001`. Birinchi marta ishga tushirilganda API
konteyneri avtomatik `prisma migrate deploy` bajaradi (Dockerfile CMD'ida).

`docker-compose.yml` — **faqat mahalliy sinov uchun**, Railway'da ishlatilmaydi
(Railway'da har bir xizmat alohida joylashtiriladi).

## 3. Railway'da joylashtirish (haqiqiy deploy qilinadigan payt uchun bosqichlar)

### 3.1. Infratuzilma xizmatlari
1. Railway loyihasida **PostgreSQL** plagin xizmatini qo'shing — `DATABASE_URL`
   avtomatik generatsiya qilinadi.
2. Kerak bo'lsa **Redis** plagin xizmatini ham qo'shing.

### 3.2. Har bir ilova uchun alohida xizmat yarating
Railway monorepo'ni bitta reponing 3 marta ulanishi orqali qo'llab-quvvatlaydi —
har birida boshqacha Root Directory/Dockerfile:

**API xizmati:**
- "Deploy from GitHub repo" → shu repo'ni tanlang
- Settings → Root Directory: `/` (repo ildizi — `packages/shared`ga kirish SHART)
- Settings → Config File Path: `apps/api/railway.toml`
- Environment Variables (pastdagi 4-bo'limga qarang)

**Mini App xizmati:**
- Root Directory: `/`, Config File Path: `apps/mini-app/railway.toml`
- Build Variables: `VITE_API_BASE_URL=https://<api-xizmati>.up.railway.app/api/v1`
  (build vaqtida kerak — Vite buni statik JS'ga yozadi, runtime env emas)

**Admin Panel xizmati:**
- Root Directory: `/`, Config File Path: `apps/admin/railway.toml`
- Build Variables: `NEXT_PUBLIC_API_BASE_URL=https://<api-xizmati>.up.railway.app/api/v1`
  (xuddi shunday — Next.js buni build vaqtida statik JS'ga yozadi)

### 3.3. Domenlar
Railway har bir xizmatga avtomatik `*.up.railway.app` domen beradi. Keyinchalik
maxsus domen (masalan `api.influencex.uz`, `admin.influencex.uz`) ulash mumkin.
Telegram Mini App uchun BotFather orqali "Menu Button" havolasi shu Mini App
domenining `MINI_APP_URL`siga o'rnatiladi.

## 4. Environment o'zgaruvchilari

To'liq ro'yxat va izohlar `.env.example`da. Eng muhimlari:

**API xizmati (runtime):**
- `DATABASE_URL` — Railway PostgreSQL plagini avtomatik beradi
- `REDIS_URL` — Railway Redis plagini avtomatik beradi (ixtiyoriy)
- `JWT_SECRET` — uzun tasodifiy satr (Admin Panel login uchun)
- `CORS_ORIGIN` — **production'da SHART** aniq domenlar bilan cheklansin
  (masalan `https://influencex-admin.up.railway.app`), `*` faqat dev uchun
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` — BotFather'dan
- `S3_*` — MinIO/Selectel/Yandex Object Storage yoki AWS S3 hisob ma'lumotlari
- `CLICK_*` — Click.uz hamkorlik shartnomasidan (haqiqiy integratsiya ishlaydi)
- `PAYME_*`, `UZUM_*` — hozircha stub (hamkorlik tasdiqlanmagan), qiymat shart emas

**Mini App (build-vaqti):** `VITE_API_BASE_URL`

**Admin Panel (build-vaqti):** `NEXT_PUBLIC_API_BASE_URL`

## 5. Ma'lumotlar bazasi migratsiyalari

`apps/api/Dockerfile`ning CMD qatorida `npx prisma migrate deploy` avtomatik
bajariladi, konteyner har safar qayta ishga tushganda. Bu production-xavfsiz
(faqat pending migratsiyalarni qo'llaydi, ma'lumotlarni yo'qotmaydi).

Agar migratsiyani deploy'dan ALOHIDA, nazorat ostida bajarish kerak bo'lsa
(masalan katta jadval o'zgarishlarida), Railway'ning "Release Command" sozlamasidan
foydalanib, uni Dockerfile CMD'idan ajratish mumkin.

## 6. Prisma + Alpine muhim eslatma

`apps/api/prisma/schema.prisma`da `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]`
ko'rsatilgan — bu **Docker'da `node:20-alpine` (musl libc) image ichida Prisma Query
Engine topilmasligi** degan keng tarqalgan production xatosining oldini oladi.
Agar kelajakda boshqa Docker base image (masalan `node:20-slim`, Debian-asoslangan)
ga o'tilsa, bu qatorni olib tashlash yoki mos binaryTarget qo'shish kerak bo'ladi.

## 7. `packages/shared` build bosqichi

`packages/shared` endi `tsc` bilan `dist/`ga kompilyatsiya qilinadi (`npm run build
--workspace=packages/shared`), xom `.ts` fayllarga emas. Bu 2026-07-11'da qo'shildi:
avval `package.json`ning `main`/`types` maydonlari to'g'ridan-to'g'ri `src/index.ts`ga
ishora qilardi — bu Jest (ts-jest orqali) uchun ishlagan, lekin **`node dist/main.js`
orqali ishga tushirilgan compiled API uchun ishlamas edi** (Node xom TypeScript'ni
o'qiy olmaydi). Har uchala Dockerfile ham avval `packages/shared`ni build qiladi,
so'ng tegishli ilovani.

## 8. Hali qilinmagan narsalar (deploy vaqtida e'tiborga olinsin)

- Health-check endpoint (`GET /api/v1/health`) hali maxsus qo'shilmagan —
  `railway.toml`da hozircha `/api/v1` ildiziga so'rov yuborilyapti.
- Lockfile (`package-lock.json`) hali repo'da yo'q — birinchi haqiqiy `npm install`
  CI/CD'da uni yaratadi; keyin Dockerfile'lardagi `npm install`ni `npm ci`ga
  almashtirish tavsiya etiladi (tezroq, reproducible build).
- Payme/Uzum hali stub (`PRODUCTION_READINESS_REPORT.md`ga qarang) — production'ga
  chiqishdan oldin haqiqiy hamkorlik va webhook imzo tekshiruvi qo'shilishi SHART.
