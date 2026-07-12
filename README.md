# InfluenceX — Faza 1 MVP (Telegram Mini App)

PRD v2 asosida qurilgan monorepo skeleti. To'liq bozor tahlili va strategiya uchun
`INFLUENCEX_PRD_v2.md` fayliga qarang (loyiha ildizidagi hujjat sifatida ilova qilingan bo'lishi mumkin).

## Tuzilma

```
apps/
  api/        NestJS backend (PostgreSQL + Prisma, escrow ledger, Telegram auth, WebSocket chat)
  mini-app/   Telegram Mini App (React + Vite + Tailwind, uz/ru/en)
  admin/      Admin Panel (Next.js, JWT auth — Moderator/Admin uchun)
packages/
  shared/     Umumiy enum/tip lar (api, mini-app, admin uchta joyda ham ishlatiladi)
```

## Nima ishlaydi (MVP skeleti)

- **Auth**: Creator/Business — Telegram `initData` HMAC tekshiruvi orqali avtomatik (parolsiz).
  Moderator/Admin — email+parol → JWT (Admin Panel uchun, chunki u Telegram ichida ochilmaydi).
- **Profillar**: Creator/Business profil CRUD, followers asosida avtomatik tier hisoblash.
- **Kampaniyalar**: yaratish, ommaviy feed, status oqimi (DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED).
- **Zayavkalar**: kreator zayavka beradi → biznes `CampaignApplicants.tsx` ekranida ko'rib chiqadi
  va qabul/rad qiladi → qabul qilinganda escrow + chat avtomatik ochiladi.
- **Escrow**: to'liq holat mashinasi (AWAITING_DEPOSIT → HELD → RELEASE_PENDING → RELEASED/REFUNDED/DISPUTED),
  har bir o'tish audit sifatida saqlanadi.
  - **Click** — HAQIQIY hamkorlik, to'liq ishlaydi: depozit uchun `my.click.uz/services/pay` invoice
    havolasi (`click.provider.ts`), Shop-API ikki bosqichli webhook Prepare/Complete
    (`click-webhook.controller.ts`, MD5 `sign_string` tekshiruvi bilan). Click'da avtomatik
    **chiqim (payout) API'si yo'q** — moderator Click Business ilovasi orqali blogerga qo'lda
    o'tkazadi, so'ng Admin Panel → Escrow sahifasida "Qo'lda to'lovni tasdiqlash" tugmasi orqali
    tasdiqlaydi (`PATCH /escrow/:id/confirm-manual-payout`, RELEASE_PENDING → RELEASED).
  - **Payme/Uzum** — HAMKORLIK HALI YO'Q, faqat stub adapter (`verifyWebhookSignature()` doim
    `true`). Rasmiy hamkorlik tuzilgach `payment-providers/{payme,uzum}.provider.ts` da haqiqiy
    Merchant API bilan almashtiriladi.
- **Chat**: real-vaqt WebSocket (`socket.io`), Mini App ichida (Telegram DM emas — nizolarda dalil
  sifatida ishlatish uchun). Dastlabki tarix REST orqali, keyingi xabarlar `chat.gateway.ts` orqali jonli keladi.
  Socket ulanishi `initData` bilan tasdiqlanadi (HMAC handshake middleware), foydalanuvchi faqat
  o'ziga tegishli thread'larga qo'shilishi va faqat o'z nomidan yozishi mumkin.
- **Reyting**: 1-5 baho → 0-100 creatorScore/businessScore avtomatik qayta hisoblanadi.
- **Kreator to'lov rekvizitlari**: Profil sahifasida payoutProvider/payoutAccount (Payme/Click/Uzum) —
  escrow "release" shu maydonlarsiz ishlamaydi (himoya: to'lov yo'qolib qolmasligi uchun).
- **AI Brief Generator**: `POST /ai/brief` — biznes mahsulotini tavsiflaydi, OpenAI/Gemini
  professional kampaniya brifini (sarlavha, tavsif, maqsad, tavsiya etilgan byudjet/talablar)
  avtomatik yaratadi. Mini App'da "Kampaniya yaratish" ekraniga integratsiya qilingan.
- **Telegram Bot**: `/start` buyrug'iga Mini App ochish tugmasi bilan javob beradi; zayavka qabul
  qilinganda, to'lov qabul qilinganda/chiqarilganda va nizo ochilganda/hal qilinganda avtomatik
  bildirishnoma yuboradi (`telegram-bot.service.ts`).
- **Admin Panel**: Dashboard, Foydalanuvchilar, Kampaniyalar, Escrow (+qo'lda to'lov tasdiqlash),
  Nizolarni hal qilish, Verifikatsiya, Fraud signallari. Mobil ekranlarda hamburger-menyu bilan
  responsiv (`Sidebar.tsx` slide-in + backdrop).
- **3 til**: Mini App i18next bilan (uz/ru/en, Telegram tilidan avtomatik aniqlanadi).

## To'liq funksiyalar ro'yxati (2026-07-12 yakuniy holat) — MVP emas, to'liq funksional loyiha

Ushbu bo'lim yuqoridagi "MVP skeleti"dan keyin qo'shilgan barcha funksiyalarni jamlaydi.
Loyiha endi PRD'dagi Faza 1 + Faza 2'ning katta qismini qamrab oladi:

- **Kontent topshirish nazorat nuqtasi**: PRD workflow 8-9-bosqich endi majburiy —
  kreator `POST /applications/:id/submit-content` orqali ishlagan kontentini (URL/fayl)
  topshirmaguncha, biznes to'lovni chiqara olmaydi (`approveAndRelease()` shu tekshiruvni
  amalga oshiradi).
- **To'liq to'lov/escrow UI**: depozitni boshlash, ishni tasdiqlab to'lovni chiqarish,
  qaytarish (refund) va nizo ochish — hammasi Mini App'da ishlaydi
  (`CampaignApplicants.tsx`, `Applications.tsx`, `DisputeForm.tsx`). Avval bular faqat
  backend API sifatida mavjud edi, UI orqali umuman chaqirib bo'lmasdi.
- **CPA/Hybrid konversiya kuzatuvi** (PRD "CPA (Cost Per Action)"): biznes haqiqiy
  savdo/lid/ro'yxatdan o'tish/obuna hodisasini qayd etadi (`POST /applications/:id/conversions`),
  tasdiqlaydi/rad etadi, moderator Click orqali qo'lda to'lab `mark-paid` bilan yakunlaydi
  (escrow bilan bir xil "avtomatik chiqim yo'q" cheklovi). Trafik kuzatuvi:
  `GET /track/:applicationId` → `campaign.landingUrl`ga 302 redirect + `clickCount`.
  Mini App: `ConversionsPanel.tsx` (ikkala rol uchun), Admin Panel: "Konversiyalar (CPA)" sahifasi.
- **Portfolio CRUD** (PRD "Creator Profiles"): kreator ishlagan namunalarini
  (rasm/video + izoh) qo'shadi/o'chiradi (`/portfolio`), biznes zayavkachini ko'rib
  chiqishda shu namunalarni ko'radi (`GET /portfolio/creator/:creatorId`, ochiq).
- **Earnings (Creator) / Payments (Business)**: PRD Dashboard sahifalari — jami
  ishlab topilgan/sarflangan va kutilayotgan mablag'lar + tranzaksiyalar tarixi
  (`GET /earnings/creator`, `GET /earnings/business`).
- **Analytics (Creator/Business)**: PRD Dashboard sahifalari — zayavkalar funneli,
  qabul qilinish darajasi, CPA bosish/konversiya ko'rsatkichlari, biznes uchun eng
  ishonchli hamkor kreatorlar ro'yxati. Barcha ko'rsatkichlar haqiqiy DB
  yozuvlaridan hisoblanadi (`GET /analytics/creator`, `GET /analytics/business`).
- **Admin Revenue Reports** (PRD Admin Panel moduli): InfluenceX'ning haqiqiy
  komissiya daromadi (platformFee, yalpi tranzaksiya hajmidan ajratilgan), model
  bo'yicha va oylik taqsimot (`GET /admin/revenue`, Admin Panel "Daromad hisobotlari").
- **Subscription Plans** (PRD Monetization): Starter (3)/Growth (20)/Pro (cheksiz)
  faol kampaniya limiti — `campaigns.service.ts#updateStatus` DRAFT→PUBLISHED
  o'tishida HAQIQATAN tekshiradi va limit to'lsa rad etadi. Tarif tanlovi hozircha
  o'z-o'zidan xizmat (self-service, haqiqiy oylik billing kelajakda qo'shiladi —
  Payme/Uzum stub'lari uchun qabul qilingan xuddi shu halol yondashuv).
- **Featured Placement** (PRD Monetization): biznes kampaniyasini (`POST
  /campaigns/:id/feature`), kreator profilini (`POST /users/me/promote-profile`)
  7 kunga "targ'ib qilingan" deb belgilaydi — ommaviy feedda birinchi chiqadi
  (`Home.tsx`, ⭐ belgi bilan), muddati o'tgach avtomatik yo'qoladi.
  Biznes uchun "Mening kampaniyalarim" (`/campaigns/mine`) — PRD "Active Campaigns"
  sahifasi, avval umuman mavjud emas edi.
- **Xavfsizlik kuchaytirilishi**: `@nestjs/throttler` bilan global so'rov chegaralash
  (100/daqiqa), Admin login uchun qattiqroq limit (5/daqiqa, brute-force himoyasi),
  Click webhook uchun kengroq limit (300/daqiqa, haqiqiy to'lovlar rad etilmasligi
  uchun). Click webhook'da **replay-himoya**: `sign_string` to'g'ri bo'lsa ham,
  `sign_time` 15 daqiqadan eski/kelajakdagi bo'lsa so'rov rad etiladi (tutib olingan
  so'rovni qayta yuborish orqali soxta to'lov tasdiqlashning oldini oladi).
- **Docker + Railway deploy tayyorgarligi**: har uch xizmat (`api`, `mini-app`,
  `admin`) uchun ko'p bosqichli (multi-stage) Dockerfile + `railway.toml`,
  mahalliy sinov uchun `docker-compose.yml`. To'liq qo'llanma: `DEPLOYMENT.md`.
  Shu jarayonda ikkita HAQIQIY production-blocker xato topilib tuzatildi:
  `packages/shared` hech qachon JS'ga kompilyatsiya qilinmagan edi (compiled
  `node dist/main.js` ishga tushganda `require('@influencex/shared')` xom
  TypeScript'ga urilib buzilardi) va Prisma'da Alpine (musl libc) uchun
  `binaryTargets` ko'rsatilmagan edi (Query Engine konteynerda topilmas edi).

## AI Algoritmlari (Faza 1) — 2026-07-11

Asl PRD "AI System" bo'limidagi to'rtta modulning uchtasi endi ishlaydi (LLM chaqiruvisiz,
formula/evristika-asoslangan — tez va tushuntirib bo'ladigan; Faza 2'da haqiqiy ML/tashqi
ma'lumot bilan boyitiladi):

- **AI Pricing Engine** (`pricing/pricing.service.ts`) — followers, engagement rate, tier,
  kontent turi va Creator Score asosida adolatli narx oralig'ini (min/tavsiya/max, UZS) hisoblaydi.
  `GET /pricing/recommend/:creatorId?contentType=&collaborationModel=`. Kreator profilida
  ("AI tavsiya etgan narx") va biznesning "Zayavkalar" ekranida (har bir taklif narxi yonida)
  ko'rsatiladi.
- **AI Creator Matching** (`matching/matching.service.ts`) — kampaniya talablariga (kategoriya,
  geografiya, followers oralig'i, til, platforma) va kreator ko'rsatkichlariga (Creator Score)
  qarab og'irlangan (weighted) skorlash bilan mos kreatorlarni tavsiya qiladi.
  `GET /campaigns/:id/recommended-creators` (faqat kampaniya egasi biznes). CampaignApplicants.tsx
  ekranida hali murojaat qilmagan mos kreatorlar ro'yxati sifatida ko'rinadi.
- **AI Fraud Detection** (`fraud/fraud-detection.service.ts`) — g'ayrioddiy yuqori/past engagement,
  ko'rishlar/obunachilar nisbati anomaliyalari kabi evristikalar asosida shubhali profillarni
  aniqlaydi (0-100 suspicionScore + sabablar). `GET /admin/fraud-signals` (Admin Panel →
  "Fraud signallari"). Bu YAKUNIY qaror emas — moderator profilni qo'lda tekshiradi.
- **AI Brief Generator** — avvaldan mavjud (`ai/ai.service.ts`, OpenAI/Gemini).

## Ishga tushirish (lokal)

Talab qilinadi: Node.js 20+, PostgreSQL, Redis (ixtiyoriy MVP bosqichida), npm.

```bash
# 1. Bog'liqliklarni o'rnatish (repo ildizida)
npm install

# 2. .env sozlash
cp .env.example apps/api/.env
# apps/api/.env ichida DATABASE_URL, TELEGRAM_BOT_TOKEN, JWT_SECRET va h.k.ni to'ldiring

# 3. Ma'lumotlar bazasi
npm run prisma:generate --workspace=apps/api
npm run prisma:migrate --workspace=apps/api
npm run prisma:seed --workspace=apps/api   # boshlang'ich admin@influencex.uz hisobini yaratadi

# 4. Ishga tushirish (har birini alohida terminalda)
npm run dev:api        # http://localhost:3000/api/v1
npm run dev:mini-app    # http://localhost:5173 (Telegram WebView'da sinash uchun ngrok/ HTTPS tunnel kerak)
npm run dev:admin       # http://localhost:3001
```

### Yoki Docker bilan (2026-07-12 qo'shildi)

```bash
docker compose up --build
```

Bitta buyruq bilan PostgreSQL, Redis va uchala xizmatni (`api`, `mini-app`, `admin`)
ishga tushiradi, API konteyneri avtomatik `prisma migrate deploy` bajaradi. Railway'da
haqiqiy deploy qilish uchun to'liq qo'llanma: **`DEPLOYMENT.md`** (hali deploy qilinmagan,
lekin kod/konfiguratsiya to'liq tayyor — Dockerfile'lar, `railway.toml`'lar,
environment o'zgaruvchilari ro'yxati).

## Keyingi qadamlar (PRD v2 §8 Faza 1 doirasida)

1. ~~Click uchun `.env` ga haqiqiy `CLICK_MERCHANT_ID`, `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY`,
   `CLICK_MERCHANT_USER_ID` qiymatlarini kiriting~~ — KOD TOMONI BAJARILDI (Merchant/Shop API,
   Prepare/Complete webhook, imzo tekshiruvi, 2026-07-12'da replay-attack himoyasi ham qo'shildi).
   Haqiqiy qiymatlarni `.env`ga kiritish faqat production deploy vaqtida kerak bo'ladi — hozircha
   bajarilmagan (foydalanuvchi so'rovi: "railway'da deploy qilamiz, lekin hozir emas").
2. Telegram bot webhookni ro'yxatdan o'tkazing: `setWebhook?url=<API_URL>/api/v1/telegram-bot/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>`.
   Bu ham faqat haqiqiy `<API_URL>` mavjud bo'lgach (production deploy'dan keyin) bajariladi.
3. ~~S3-compatible storage integratsiyasi~~ — BAJARILDI (2026-07-11): `apps/api/src/uploads/`
   (`POST /uploads/presign`, Telegram initData bilan himoyalangan) client uchun presigned PUT
   URL yaratadi - fayl to'g'ridan-to'g'ri client'dan S3'ga yuklanadi (API serveri orqali o'tmaydi).
   Mini App: Profile.tsx (avatar/logo), ChatThread.tsx (fayl biriktirish), Portfolio.tsx
   (2026-07-12'da qo'shildi) shu oqimga ulangan. MinIO/Selectel/Yandex Object Storage kabi
   S3-compatible provayderlar bilan ishlaydi (`S3_FORCE_PATH_STYLE`). Eslatma: hajm chegarasi
   (`maxBytes`) hozircha faqat hujjatlashtirilgan, presigned PUT'da amalda majburlanmaydi
   (`Content-Length-Range` shart POST policy talab qiladi) - ishlab chiqarishda bucket
   policy/CDN darajasida qattiqlashtirish tavsiya etiladi.
4. ~~Chat socket handshake'ini `initData` bilan tasdiqlash~~ — BAJARILDI (2026-07-11):
   `chat.gateway.ts` endi `server.use()` middleware orqali har bir socket ulanishda
   `auth.initData`ni HMAC bilan qayta tekshiradi va `socket.data.userId`ga bog'laydi;
   `joinThread` endi thread ishtirokchisi ekanini tekshiradi (begona odam qo'shila olmaydi);
   `sendMessage` endi client-yuborilgan `userId`ni emas, tasdiqlangan `socket.data.userId`ni
   ishlatadi (spoofing imkonsiz).
5. ~~Unit testlar~~ — DEYARLI TO'LIQ BAJARILDI (2026-07-12 holatiga yangilandi),
   `npm run test --workspace=apps/api`. Qamrov endi quyidagilarni o'z ichiga oladi: `escrow`
   (komissiya, holat mashinasi, Click Prepare/Complete + replay-attack himoyasi), `auth`
   (HMAC tekshiruvi), `applications`, `chat`, `conversions` (CPA report/confirm/reject/markPaid),
   `portfolio`, `earnings`, `analytics`, `admin` (revenue report), `campaigns` (obuna reja
   limitlari, Featured Placement), `users` (subscription plan, promote profile). Hali qolgan:
   HTTP darajasidagi E2E testlar (haqiqiy test DB bilan) va `ai`, `telegram-bot`, `uploads`,
   `ratings` modullari uchun unit testlar.
6. Xizmat ko'rsatish shartnomasi (Biznes) va Hamkorlik shartnomasi (Kreator) matnlari — yurist bilan
   tayyorlanib, onboarding oqimida foydalanuvchi tomonidan qabul qilinishi kerak (4.5-bo'lim).
   Hali BAJARILMAGAN — bu yagona toza yuridik hujjat ishi, kodga bog'liq emas.
7. ~~Biznes tomonidagi "Zayavkalarni ko'rib chiqish/qabul qilish" Mini App ekrani~~ — BAJARILDI
   (2026-07-11): `CampaignApplicants.tsx` (`/campaigns/:id/applicants`), `CampaignDetail.tsx` endi
   kampaniya egasi biznesga forma o'rniga shu ekranga havola ko'rsatadi. Shu bilan birga xavfsizlik
   nuqsoni tuzatildi: `GET /applications/campaign/:campaignId` avval HIMOYASIZ (auth'siz) edi —
   endi faqat kampaniya egasi biznes ko'ra oladi (`TelegramAuthGuard` + egalik tekshiruvi).
8. ~~CPA/Hybrid konversiya kuzatuvi, Portfolio, Earnings/Payments, Analytics, Admin daromad
   hisobotlari, obuna rejalari (Starter/Growth/Pro) va Featured Placement~~ — BAJARILDI
   (2026-07-12). To'liq ro'yxat yuqoridagi "To'liq funksiyalar ro'yxati" bo'limida.
9. ~~Xavfsizlik qattiqlashtirish: global rate limiting (`@nestjs/throttler`), admin login uchun
   qattiqroq limit, Click webhook uchun replay-attack himoyasi (`sign_time` ±15 daqiqa)~~ —
   BAJARILDI (2026-07-12).
10. ~~Docker + Railway deploy konfiguratsiyasi (Dockerfile'lar, `railway.toml`'lar,
    `docker-compose.yml`, `packages/shared` build bosqichi, Prisma+Alpine `binaryTargets`)~~ —
    KOD/KONFIGURATSIYA TOMONI TAYYOR (2026-07-12), lekin **hali haqiqiy deploy qilinmagan**
    (foydalanuvchi so'rovi bo'yicha ataylab kutilyapti). To'liq qo'llanma: `DEPLOYMENT.md`.
11. Haqiqiy production deploy — hali BOSHLANMAGAN (ataylab, foydalanuvchi ko'rsatmasiga ko'ra).
    Vaqti kelganda: Railway'da PostgreSQL/Redis plaginlari + 3 xizmat sozlash (`DEPLOYMENT.md`
    §3), so'ng 1- va 2-bandlardagi real Click/Telegram sozlamalarini production domenlarga
    ko'rsatish.
12. Qolgan chinakam bo'shliqlar (production'ga chiqishdan oldin yopilishi kerak,
    `DEPLOYMENT.md` §8'da ham hujjatlashtirilgan):
    - Health-check endpoint (`GET /api/v1/health`) hali maxsus qo'shilmagan.
    - Lockfile (`package-lock.json`) hali repo'da yo'q — CI/CD'dagi birinchi `npm install`
      uni yaratadi, keyin Dockerfile'larda `npm ci`ga o'tish tavsiya etiladi.
    - Payme/Uzum hamkorligi hali tasdiqlanmagan — provider/webhook kodlari stub holatida.

## Muhim eslatma (huquqiy) — 2026-07-11 yangilanishi

`apps/api/src/escrow/` endi ikkita mustaqil bitim sifatida qurilgan (PRD v2 §4.5):

1. **Biznes -> InfluenceX**: kampaniya boshqaruvi xizmati uchun to'lov (InfluenceX savdo daromadi).
2. **InfluenceX -> Kreator**: hamkorlik/pudratchi haqi (InfluenceX xarajati, o'z pudratchisiga to'lov).

Hech qanday bosqichda "uchinchi shaxs puli" ushlab turilmaydi — shuning uchun InfluenceX Markaziy
bankning "to'lov tashkiloti" litsenziyasiga muhtoj emas, faqat Payme/Click/Uzum'ning oddiy
tadbirkor-mijozi sifatida ishlaydi. `Escrow` model nomi va holat mashinasi (AWAITING_DEPOSIT →
HELD → RELEASE_PENDING → RELEASED/REFUNDED/DISPUTED) o'zgarmadi — faqat huquqiy/buxgalteriya
talqini aniqlashtirildi. Ishlab chiqarishga chiqarishdan oldin ikkala shartnoma matni (Xizmat
ko'rsatish shartnomasi, Hamkorlik shartnomasi) va soliq rejimi tanlovi yurist/soliq maslahatchisi
tomonidan tasdiqlanishi SHART.

**Click integratsiyasi holati (2026-07-11):** Click bilan hamkorlik tasdiqlangan va Merchant/Shop
API to'liq ulangan (depozit invoice, Prepare/Complete webhook, imzo tekshiruvi). Click'da chiqim
API'si yo'qligi sababli bloger to'lovi hozircha yarim-avtomat: tizim RELEASE_PENDING holatiga
o'tkazadi va moderatorga bildirishnoma yuboradi, moderator Click Business orqali qo'lda to'lab,
Admin Panel'da tasdiqlaydi. Payme va Uzum bilan hali rasmiy hamkorlik yo'q — ularning
provider/webhook kodlari stub holatida qoladi.

## Unumdorlik, xavfsizlik va tuzatilgan xatolar — 2026-07-11 (davom)

- **Kampaniya feed sahifalash**: `GET /campaigns` endi majburiy `page`/`pageSize` (standart 20,
  maksimal 50) bilan qaytadi (`{items, page, pageSize, total, totalPages}`), Home.tsx "Yana
  ko'rsatish" tugmasi bilan bosqichma-bosqich yuklaydi — katalog kattalashganda API sekinlashmaydi.
- **Maxfiylik tuzatildi**: `GET /campaigns/:id` (ochiq/auth'siz) ilgari zayavkachilarning to'liq
  ro'yxatini (ism, taklif narxi) ham qaytarardi — endi faqat `_count.applications` ko'rsatadi,
  to'liq ro'yxat faqat himoyalangan `GET /applications/campaign/:id` orqali.
- **DB indekslar qo'shildi** (`schema.prisma`): `CreatorProfile` (country, tier, followers —
  AI Matching/Pricing/Fraud so'rovlari uchun), `Campaign.businessId`, `CampaignApplication.creatorId`,
  `Escrow` (status, depositReference), `EscrowTransaction.escrowId`, `Dispute.status`, `Rating.targetId`,
  `VerificationRequest` (userId, status).
- **Sxema xatosi tuzatildi**: `VerificationRequest` modelida `userId` skalyar maydoni umuman
  e'lon qilinmagan edi (`@relation(fields: [userId], ...)` mavjud bo'lmagan maydonga ishora
  qilardi) — bu `prisma generate`ni butunlay buzardi. Tuzatildi + verifikatsiya so'rovini
  YARATISH endpointi ham yo'q edi, endi qo'shildi: `POST /users/me/verification-request`
  (Profile.tsx'da "Verifikatsiya so'rash" tugmasi, hujjat S3'ga yuklanadi).
- **Kod xatosi tuzatildi**: `PaymeProvider`/`UzumProvider`'ning `verifyWebhookSignature()` metodi
  interfeysga mos kelmaydigan parametrsiz imzo bilan e'lon qilingan edi — `escrow-webhooks.controller.ts`
  uni 2 argument bilan chaqirganda bu TypeScript kompilyatsiyasini butunlay buzardi (`tsc` orqali
  aniqlandi). Ikkala provayderda ham to'g'ri imzoga tuzatildi.
- **`engagementRate` endi saqlanadi**: `UpdateCreatorProfileDto`da bu maydon yo'q edi, shuning
  uchun AI Pricing/Fraud Detection har doim 0% ko'rar edi — endi kreator profilida to'ldirilishi
  mumkin (kelajakda Instagram/TikTok API orqali avtomatlashtiriladi).
