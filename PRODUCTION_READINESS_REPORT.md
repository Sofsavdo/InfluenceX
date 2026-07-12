# InfluenceX — Ishlab chiqarishga tayyorlik tahlili

**Sana:** 2026-07-11
**Hujjat maqsadi:** Hozirgi kodbazani (`apps/api`, `apps/mini-app`, `apps/admin`) haqiqiy foydalanuvchilar bilan doimiy ishlaydigan production muhitiga chiqarish nuqtai nazaridan tekshirish — nima tayyor, nima yo'q, qanday tartibda harakat qilish kerak.

---

> **2026-07-12 yangilanish:** Ushbu hujjat 2026-07-11'da yozilgan va o'sha kundagi holatni
> aks ettiradi. Shundan beri (Vazifa #41-51) quyidagilar QO'SHILDI va ushbu hujjatda "yo'q" deb
> belgilangan ko'plab bo'shliqlar YOPILDI: kontent topshirish checkpoint'i, to'liq escrow/to'lov
> UI, CPA/Hybrid konversiya kuzatuvi, Portfolio CRUD, Earnings/Payments sahifalari, Analytics
> (creator+business), Admin Revenue Reports, xavfsizlik qattiqlashtirish (rate limiting + Click
> replay-attack himoyasi), Subscription Plans + Featured Placement, va Docker/Railway deploy
> konfiguratsiyasi (hali ishga tushirilmagan, ataylab). Quyidagi matnda bular alohida
> **"YANGILANDI (2026-07-12)"** belgisi bilan ko'rsatilgan — asl 07-11 matni tarixiy kontekst
> uchun saqlangan. Eng ishonchli, joriy holat uchun `README.md`dagi "To'liq funksiyalar ro'yxati"
> bo'limiga qarang.

---

## 1. Qisqa javob

**Yo'q, loyiha hozircha production/doimiy operatsiyalarga tayyor emas.** Bu MVP darajasida yaxshi arxitekturalangan, ko'p qismi ishlaydigan kod bazasi — lekin u hech qachon haqiqiy Node.js muhitida ishga tushirilmagan (`npm install` bu sessiyada muvaffaqiyatli yakunlanmadi — muhit cheklovi), hech qachon deploy qilinmagan, va bir nechta production'ni birinchi kunidayoq buzadigan jiddiy muammolar shu tahlil davomida topildi va tuzatildi (pastga qarang, 3-bo'lim). Bundan tashqari, infratuzilma, xavfsizlik, huquqiy va monitoring bo'yicha butun bir qatlam umuman mavjud emas.

Bu "loyiha to'xtadi" degani emas — bu "kodlash bosqichi katta yakunga yetdi, endi ishga tushirish bosqichi boshlanishi kerak" degani. Ikkalasi turli xil ish turlari (dasturlash vs DevOps/yuridik/moliyaviy tayyorgarlik).

---

## 2. Hozirgi holat — nima ishlaydi

| Soha | Holat |
|---|---|
| Auth (Telegram initData + JWT admin) | Ishlaydi |
| Creator/Business profillar | Ishlaydi, **portfolio CRUD ham qo'shildi (YANGILANDI 2026-07-12)** |
| Kampaniya yaratish/feed/sahifalash | Ishlaydi |
| Zayavka oqimi + biznes ko'rib chiqish ekrani | Ishlaydi |
| Escrow ledger (holat mashinasi) | Ishlaydi (Click bilan real, Payme/Uzum stub) |
| Chat (WebSocket, initData bilan himoyalangan) | Ishlaydi |
| Fayl yuklash (S3 presigned URL) | Ishlaydi |
| Reyting / Creator Score / Business Score | Ishlaydi |
| AI Brief Generator / Pricing / Matching / Fraud Detection | Ishlaydi (evristika/formula, LLM'siz uchtasi) |
| CPA/Hybrid konversiya kuzatuvi | Ishlaydi (qo'lda tasdiqlash oqimi bilan) — **YANGI 2026-07-12** |
| Portfolio / Earnings / Payments / Analytics sahifalari | Ishlaydi — **YANGI 2026-07-12** |
| Subscription Plans + Featured Placement | Ishlaydi — **YANGI 2026-07-12** |
| Rate limiting + Click replay-attack himoyasi | Ishlaydi — **YANGI 2026-07-12** |
| Telegram bot bildirishnomalari | Ishlaydi |
| Admin Panel (Users/Campaigns/Escrow/Disputes/Verification/Fraud/**Revenue Reports**) | Ishlaydi, mobil-responsiv — **YANGILANDI 2026-07-12** |
| Unit testlar | Ancha kengaydi (escrow, auth, applications, chat, conversions, portfolio, earnings, analytics, admin, campaigns, users) — **YANGILANDI 2026-07-12** |

Bu ro'yxat o'zi ancha katta — muammo funksionallik yo'qligida emas, balki **"ishlaydi (mening statik tahlilimda)" bilan "productionda ishonchli ishlaydi" orasidagi masofada**.

---

## 3. Ushbu tahlil davomida topilgan va TUZATILGAN kritik xatolar

Bular "kelajakda qilish kerak" emas — bular **hozir tuzatildi**, chunki ular birinchi haqiqiy so'rovdayoq production'ni buzardi:

1. **BigInt JSON serializatsiya xatosi** — `User.telegramId` (va Click tranzaksiya ID'lari) Prisma'da `BigInt` turida. Node.js'ning standart `JSON.stringify()` BigInt'ni serializatsiya qila olmaydi va xato tashlaydi. Bu **`GET /users/me`** — ilovadagi ENG KO'P chaqiriladigan endpoint — har safar 500 xato bilan ishlamay qolishini anglatardi. Bu xato hech qachon aniqlanmagan edi, chunki loyiha hech qachon haqiqiy Node muhitida ishga tushirilmagan. **Tuzatildi:** `main.ts`da global `BigInt.prototype.toJSON()` polyfill.
2. **CORS butunlay ochiq** (`origin: '*'`) — ham asosiy API'da (`main.ts`), ham chat WebSocket'da (`chat.gateway.ts`). Islab chiqarishda bu istalgan sayt InfluenceX API'siga so'rov yubora olishini anglatadi (CSRF/ma'lumot o'g'irlash xavfi). **Tuzatildi:** `CORS_ORIGIN` environment o'zgaruvchisi orqali sozlanadigan qilindi (hozircha standart qiymat hali ham `*` — MVP qulayligi uchun, lekin production checklist'ida bu birinchi o'zgartiriladigan narsa, pastga qarang).
3. **`VerificationRequest` sxema xatosi** — `userId` skalyar maydoni umuman e'lon qilinmagan edi, bu `prisma generate`ni butunlay buzardi (loyihaning eng asosiy build qadami). Tuzatildi + yaratish endpointi (avval umuman yo'q edi) qo'shildi.
4. **`PaymeProvider`/`UzumProvider` metod imzosi xatosi** — `verifyWebhookSignature()` interfeys talab qilgan 2 ta parametrsiz e'lon qilingan edi, chaqiruvchi kod esa 2 ta argument bilan chaqirardi — bu TypeScript kompilyatsiyasini (`tsc build`) butunlay buzardi. Tuzatildi.
5. **`engagementRate` hech qachon saqlanmasdi** — profil yangilash DTO'sida bu maydon yo'q edi, shuning uchun yangi AI Pricing/Fraud Detection algoritmlari har doim 0% ko'rar edi. Tuzatildi.
6. **Zayavkachilar ro'yxati himoyasiz oqib chiqardi** (`GET /campaigns/:id` orqali kim bo'lsa ham ism/taklif narxini ko'ra olardi) va **chat WebSocket** har qanday client-yuborilgan `userId`ga ishonardi (spoofing mumkin edi). Ikkalasi ham tuzatildi.

**Xulosa:** bu ro'yxat o'zi shuni ko'rsatadiki — **kod hech qachon ishga tushirilmagan/build qilinmagan muhitda jiddiy, oshkor xatolar yashirin qolishi mumkin**. Production'ga chiqishdan oldin haqiqiy `npm install && npm run build && npm run test` muhitida ishga tushirish **shart**, chunki bu tahlil faqat statik o'qish + qisman `tsc` tekshiruvi bilan cheklangan edi (to'liq `node_modules` o'rnatib bo'lmadi — muhit tarmoq/vaqt cheklovi).

---

## 4. Ishlab chiqarishga tayyorlik bo'shliqlari (kategoriya bo'yicha)

### 4.1 Infratuzilma / DevOps — ENG KATTA BO'SHLIQ
- Hech qanday deploy hech qachon qilinmagan (Railway/AWS/Hetzner — PRD'da rejalashtirilgan, lekin sozlanmagan).
- CI/CD pipeline yo'q (test/build/deploy avtomatlashtirilmagan).
- ~~Docker fayllari mavjudligi tekshirilishi kerak~~ — **YANGILANDI (2026-07-12):** har uchala xizmat uchun Dockerfile, `docker-compose.yml`, `railway.toml`'lar tayyor (`DEPLOYMENT.md`). Hali ishga tushirilmagan/deploy qilinmagan — ataylab, foydalanuvchi ko'rsatmasi bilan.
- Staging/production muhit ajratilmagan.
- Domen, SSL sertifikat, DNS sozlanmagan.
- Monitoring/log agregatsiya yo'q (Sentry, Grafana, yoki hech bo'lmaganda struktura log yo'q — hozir faqat `console.log`/NestJS `Logger` konsolga yozadi).
- Postgres backup/disaster recovery strategiyasi yo'q.
- Redis paketda bor, lekin hech qanday kodda ishlatilmagan (caching layer yo'q — hozircha kerak emas, lekin PRD uni infratuzilma sifatida va'da qiladi).
- ~~Rate limiting yo'q~~ — **YANGILANDI (2026-07-12):** global `@nestjs/throttler` (100 so'rov/daqiqa), admin login uchun qattiqroq limit (5/daqiqa), Click webhook uchun kengroq limit (300/daqiqa) qo'shildi.

### 4.2 Xavfsizlik
- CORS (yuqorida tuzatildi, lekin production qiymatlari hali kiritilmagan).
- ~~Click webhook'da `sign_time`ning "yangiligi" tekshirilmaydi~~ — **YANGILANDI (2026-07-12):** `isClickSignTimeFresh()` ±15 daqiqa tolerantlik bilan qo'shildi, Prepare va Complete ikkalasida ham tekshiriladi.
- ~~Admin login uchun brute-force himoya yo'q~~ — **QISMAN YANGILANDI (2026-07-12):** rate limit (5 urinish/daqiqa) qo'shildi. CAPTCHA/2FA hali yo'q.
- Fayl yuklashda virus/zararli kontent skanerlash yo'q (S3 orqali to'g'ridan-to'g'ri yuklanadi).
- Dependency zaifliklarini tekshirish (`npm audit`, Snyk va h.k.) hech qachon ishga tushirilmagan.
- Hech qanday penetration test/xavfsizlik auditi qilinmagan.

### 4.3 Test qamrovi
- **YANGILANDI (2026-07-12):** unit testlar endi 11 modulda (escrow, auth util, applications, chat, conversions, portfolio, earnings, analytics, admin, campaigns, users). Hali testsiz: ratings, ai (pricing/matching/fraud), uploads, telegram-bot.
- E2E testlar (haqiqiy HTTP so'rov + test DB bilan) umuman yo'q.
- Frontend (mini-app, admin) uchun hech qanday test yo'q.
- Yuklama (load) testi qilinmagan — necha nafar bir vaqtda so'rov berганда tizim chidashini bilmaymiz.

### 4.4 Huquqiy / muvofiqlik
- Xizmat ko'rsatish shartnomasi (Biznes) va Hamkorlik shartnomasi (Kreator) matnlari yo'q — yurist tayyorlashi kerak.
- Maxfiylik siyosati (Privacy Policy) va foydalanuvchi shaxsiy ma'lumotlarini qayta ishlash bo'yicha O'zbekiston qonunchiligiga (shaxsiy ma'lumotlar to'g'risidagi qonun) muvofiqlik tekshirilmagan.
- Soliq rejimi (InfluenceX'ning xizmat daromadi qanday soliqqa tortilishi, kreatorlarga to'lov qanday hisobga olinishi) hali soliq maslahatchisi bilan tasdiqlanmagan (PRD §4.5'da qayd etilgan).
- Click bilan haqiqiy shartnoma/merchant hisobi ishlatilayotgan bo'lsa ham, boshqa ikki provayder (Payme, Uzum) bilan rasmiy shartnoma yo'q.

### 4.5 To'lovlar
- Faqat Click haqiqiy — Payme va Uzum butunlay stub (`verifyWebhookSignature()` doim `true` qaytaradi — bu HAQIQIY XAVFSIZLIK TESHIGI, agar tasodifan production'da yoqilib qolsa, soxta "to'lov muvaffaqiyatli" xabarlarini qabul qiladi).
- Click'da avtomatik chiqim (payout) API'si yo'qligi sababli, HAR BIR kreator to'lovi moderatorning qo'lda ishi — bu 10-20 ta faol kampaniyada ishlaydi, lekin yuzlab/minglab tranzaksiyada operatsion tiqilinch (bottleneck) bo'ladi.
- To'lov muvaffaqiyatsiz bo'lganda avtomatik qayta urinish (retry) yo'q.
- Buxgalteriya/moliyaviy hisobot eksporti (soliq organiga, kompaniya buxgalteriyasiga) yo'q.
- ~~CPA/Hybrid uchun haqiqiy konversiya kuzatish tizimi yo'q~~ — **YANGILANDI (2026-07-12):** `apps/api/src/conversions/` to'liq amalga oshirildi — `GET /track/:applicationId` deep-link redirect orqali klikni qayd qiladi, `report/confirm/reject/markPaid` oqimi bilan (Click'dagi kabi qo'lda moderator tasdiqlashi bilan, chunki avtomatik chiqim API yo'q).

### 4.6 Mahsulot to'liqligi (PRD'ga nisbatan)
- ~~Content submission checkpoint yo'q~~ — **YANGILANDI (2026-07-12):** kreator endi aniq "kontent yubordim" holatini belgilaydi (`contentSubmittedAt`/`contentUrls`), biznes faqat shundan keyin release qila oladi.
- ~~Creator/Business Dashboard'dagi "Analytics" va "Earnings" yo'q~~ — **YANGILANDI (2026-07-12):** `Earnings.tsx`, `Payments.tsx`, `CreatorAnalytics.tsx`, `BusinessAnalytics.tsx` barchasi qo'shildi.
- ~~Business Dashboard "Payments" sahifasi yo'q~~ — **YANGILANDI (2026-07-12):** yuqoriga qarang.
- ~~Portfolio uchun API/UI yo'q~~ — **YANGILANDI (2026-07-12):** to'liq CRUD (`apps/api/src/portfolio/`, `Portfolio.tsx`).
- ~~Admin Panel "Revenue Reports" moduli yo'q~~ — **YANGILANDI (2026-07-12):** `GET /admin/revenue` + `apps/admin/.../revenue/page.tsx`.
- ~~Subscription Plans va Featured Placement umuman yo'q~~ — **YANGILANDI (2026-07-12):** ikkalasi ham to'liq amalga oshirildi (obuna reja limitlari kampaniya yaratishda majburlanadi, Featured — pullik targ'ib qilish, `MyCampaigns.tsx`/`Profile.tsx`da UI bilan).

---

## 5. Rol bo'yicha imkoniyatlar holati

| Imkoniyat | Creator (Bloger) | Business | Moderator | Admin |
|---|---|---|---|---|
| Ro'yxatdan o'tish/profil | ✅ | ✅ | ✅ (JWT) | ✅ (JWT) |
| Kampaniya yaratish/ko'rish | — | ✅ | — | ✅ (ko'rish) |
| Zayavka berish/ko'rib chiqish | ✅ | ✅ | — | — |
| Escrow/to'lov holatini kuzatish | ✅ (o'zinikini) | ✅ (o'zinikini) | — | ✅ (hammasi) |
| Qo'lda to'lovni tasdiqlash | — | — | ✅ | ✅ |
| Chat | ✅ | ✅ | — | — |
| Nizo ochish/hal qilish | ✅ ochadi | ✅ ochadi | ✅ hal qiladi | ✅ hal qiladi |
| Fayl/rasm yuklash | ✅ | ✅ | — | — |
| Verifikatsiya so'rash/ko'rib chiqish | ✅ so'raydi | ✅ so'raydi | ✅ ko'rib chiqadi | ✅ ko'rib chiqadi |
| AI narx tavsiyasi | ✅ ko'radi | ✅ ko'radi | — | — |
| AI kreator tavsiyasi | — | ✅ | — | — |
| Fraud signallari | — | — | ✅ | ✅ |
| **Portfolio boshqarish** | ✅ (2026-07-12) | — | — | — |
| **Daromad/to'lov tarixi sahifasi** | ✅ (2026-07-12) | ✅ (2026-07-12) | — | — |
| **Analytics** | ✅ (2026-07-12) | ✅ (2026-07-12) | — | — |
| **Kontent topshirish/tasdiqlash bosqichi** | ✅ (2026-07-12) | ✅ (2026-07-12) | — | — |
| **CPA konversiya kuzatuvi** | ✅ (2026-07-12) | ✅ (2026-07-12) | — | ✅ tasdiqlaydi |
| **Revenue Reports** | — | — | — | ✅ (2026-07-12) |
| **Obuna reja / Featured Placement** | ✅ (2026-07-12) | ✅ (2026-07-12) | — | — |
| **Platforma/narx sozlamalari** | — | — | — | ❌ YO'Q |

---

## 6. Qanday operatsion jarayonlarga duch kelamiz

Kod ishga tushgandan keyin, KUNDALIK operatsiyalarda InfluenceX jamoasi (moderator/admin) quyidagilarga duch keladi — bularning barchasi uchun HOZIRDA faqat qisman vosita bor:

1. **Har bir Click to'lovi uchun qo'lda chiqim** — moderator Click Business ilovasini ochib, kreatorga qo'lda pul o'tkazib, keyin Admin Panel'da tasdiqlashi kerak. 5-10 kampaniyada muammo emas, 100+ kunlik tranzaksiyada bu to'liq bitta odamning ish vaqti bo'lib qoladi. **Avtomatlashtirish yoki jamoa kengaytirish rejasi kerak.**
2. **Nizolarni ko'rib chiqish** — dalil sifatida faqat chat tarixi bor (screenshot/rasm bo'lishi mumkin). Moderator uchun aniq "checklist" yoki SLA (necha soat ichida javob berish kerak) yo'q — bu jarayon hujjatlashtirilishi kerak.
3. **Fraud signallarini tekshirish** — tizim signal beradi, lekin KIM, QANCHA TEZ-TEZ bu ro'yxatni ko'rib chiqishi, va soxta-ijobiy (false positive) signal berilgan halol kreatorga qanday munosabatda bo'lish (masalan haqiqatan ham engagement yuqori bo'lgan sifatli kontent) — bu operatsion siyosat hali yozilmagan.
4. **Verifikatsiya so'rovlari** — hujjat yuklanadi, lekin qaysi hujjat turlari qabul qilinishi, qalbakilashtirishni qanday aniqlash (masalan Photoshop bilan tahrirlangan pasport) — moderator uchun yo'riqnoma yo'q.
5. **Payme/Uzum hamkorligi kelganda** — bu ikkalasi hozircha stub, ular ulanganda ham xuddi Click kabi qo'lda tekshiruv/sozlash bosqichidan o'tishi kerak (webhook URL, muhit o'zgaruvchilari, test tranzaksiyalar).
6. **Foydalanuvchi qo'llab-quvvatlash (support)** — hech qanday tizim (ticket, umumiy Telegram bot orqali savol-javob) yo'q. Foydalanuvchi muammoga duch kelsa, qayerga murojaat qilishini bilmaydi.

---

## 7. Kelajakda nima kerak bo'ladi (PRD "Future Features" bilan mos)

Bular hozir ataylab MVP'dan tashqarida qoldirilgan (PRD'ning o'zida ham "Future Features" deb belgilangan), lekin biznes o'sishi bilan navbatma-navbat kerak bo'ladi:

- ~~CPA to'liq amalga oshirilishi~~ va ~~Hybrid kampaniyalar~~ — **BAJARILDI (2026-07-12)**, yuqoriga qarang.
- **Affiliate tizimi / Referral linklar / Promo kodlar** — yangi ma'lumotlar modeli va kuzatuv kerak.
- **Marketplace/Shop integratsiyalari** — masalan Uzum Market, Instagram Shop bilan bog'lanish (texnik jihatdan murakkab, tashqi API'larga bog'liq).
- **Mobil ilovalar** (native iOS/Android) — Telegram Mini App'dan tashqari.
- **Creator Financing/Loans/Insurance** — bu moliyaviy xizmat, litsenziya talab qilishi mumkin (xuddi hozirgi escrow/to'lov modeli kabi huquqiy tahlil talab qiladi).
- **Kengaytirilgan AI Analytics** — hozirgi 3 ta algoritm (Pricing/Matching/Fraud) formula-asoslangan; kelajakda haqiqiy tashqi ma'lumot (Instagram/TikTok Graph API orqali haqiqiy auditoriya tahlili) bilan kuchaytirilishi kerak — bu fraud detection'ning haqiqiy qiymatini oshiradi (hozirgi versiya faqat InfluenceX ichidagi o'z-o'zidan e'lon qilingan raqamlarga tayanadi, bu firibgarlar tomonidan osongina "chiroyli" qilib ko'rsatilishi mumkin).

---

## 8. Tavsiya etilgan bosqichlar (production'gacha)

### Bosqich 0 — Texnik mustahkamlash (2-4 hafta, kod allaqachon katta qismi tayyor)
1. Haqiqiy muhitda `npm install && npm run build && npm run test` — barcha yashirin xatolarni topish (bu sessiyada imkonsiz edi).
2. Docker + staging muhitga deploy (Railway yoki Hetzner, PRD bo'yicha).
3. CI/CD (GitHub Actions yoki shunga o'xshash) — har bir push'da test+build.
4. `CORS_ORIGIN`ni haqiqiy domenlarga qattiqlashtirish.
5. Monitoring (Sentry xatolar uchun, oddiy uptime monitor) ulash.
6. Postgres avtomatik backup sozlash.
7. Load test (masalan 100-500 bir vaqtdagi foydalanuvchi bilan).

### Bosqich 1 — Huquqiy va moliyaviy tayyorgarlik (parallel ravishda boradi)
1. Yurist bilan ikkala shartnoma matni (Xizmat ko'rsatish, Hamkorlik) va Maxfiylik siyosati.
2. Soliq maslahatchisi bilan InfluenceX daromadining soliq rejimi.
3. Click bilan production kalitlari (hozirgi `.env.example`dagi `REPLACE_ME`larni to'ldirish).

### Bosqich 2 — Pilot/yumshoq ishga tushirish (production, lekin cheklangan)
1. Kichik hajmdagi (masalan 20-50) haqiqiy biznes+kreator bilan yopiq pilot.
2. Har bir to'lov/nizo qo'lda kuzatiladi (avtomatlashtirish hali to'liq emas).
3. Bosqich 0'da topilgan real xatolarni tuzatish.

### Bosqich 3 — To'liq ishga tushirish va operatsion masshtablash
1. Qo'lda Click chiqim jarayonini avtomatlashtirish yo'llarini qidirish (Click bilan muzokara yoki boshqa yechim).
2. Payme/Uzum'ni ulash.
3. Support tizimi (masalan alohida Telegram bot yoki ticket tizimi).
4. ~~Portfolio/Analytics/Earnings/Revenue Reports sahifalarini qo'shish~~ — BAJARILDI (2026-07-12).

---

## 9. Yakuniy xulosa

Kodlash nuqtai nazaridan **MVP funksional doirasi katta qismi bilan yakunlangan** — bu ancha katta yutuq. Lekin **"loyiha tugadi" va "production'ga tayyor" ikki xil narsa**: hozirgi holatda bu kod hech qachon ishga tushirilmagan, deploy qilinmagan, xavfsizlik/yuridik/moliyaviy tomondan tasdiqlanmagan. Ushbu tahlil davomida topilgan va tuzatilgan besh-oltita jiddiy xato (BigInt crash, CORS, sxema xatosi, metod imzosi xatosi) buni yaqqol ko'rsatadi — **haqiqiy muhitda sinov o'tkazmasdan "tayyor" deb hisoblash xavfli**.

### 9.1. Yangilanish (2026-07-12) — MVP'dan to'liq funksional loyihaga

Yuqoridagi xulosa 07-11 kunidagi holatga tegishli edi. O'shandan beri foydalanuvchi ko'rsatmasi
("MVP emas, to'liq funksional, raqobatbardosh loyiha") bo'yicha 11 ta qo'shimcha vazifa
(#41-51) kodlashtirildi va test qilindi: kontent topshirish checkpoi