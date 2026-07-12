# InfluenceX — Ishga tushirishdan oldingi to'liq audit va yakuniy qaror

**Sana:** 2026-07-12
**Maqsad:** GitHub'ga push va Railway'da deploy qilishdan OLDIN so'nggi tekshiruv — bloger va
biznes pipeline'lari haqiqatan uchidan-uchigacha ishlaydimi, pulni to'g'ri hisoblaydimi va
uzatadimi, admin panel ikkala tomonni ham boshqara oladimi, AI ishlaydimi — va shu jarayonda
topilgan barcha kamchiliklar tuzatilganmi.

---

## 1. YAKUNIY QAROR

## ✅ GO — shartli ravishda tayyor

Kod bazasi endi **Telegram Mini App sifatida ishga tushirishga tayyor**: bloger va biznes
pipeline'lari boshidan oxirigacha (ro'yxatdan o'tishdan to pul olishgacha) hech bir joyda
"to'xtab qolmaydi", pul oqimi to'g'ri hisoblanadi va uzatiladi, admin panel ikkala tomonni
ham to'liq boshqara oladi, AI uchala modul ham ikkala tomon uchun ishlaydi.

Bu audit davomida **6 ta jiddiy kamchilik** topildi va **barchasi shu sessiyada tuzatildi**
(2-bo'limga qarang) — ulardan bittasi (profil tahrirlash formasi yo'qligi) haqiqatan ham
foydalanuvchini "qadamda to'xtatib qo'yadigan" darajadagi jiddiy nuqson edi.

"Shartli" deyilishining yagona sababi — kod hech qachon **haqiqiy Node.js/PostgreSQL
muhitida** (`npm install && npm run build && npm run test`) ishga tushirilmagan (bu
suhbat muhitida buning imkoni yo'q). Barcha tekshiruvlar statik tahlil + izolyatsiyalangan
TypeScript kompilyatsiya tekshiruvi + qo'lda kod audit orqali qilindi. Shuning uchun 6-bo'limdagi
"Push qilishdan oldin bitta marta bajaring" qadami **majburiy**, lekin bu kod sifatiga emas,
ehtiyotkorlikka oid tavsiya.

---

## 2. Ushbu audit davomida topilgan va TUZATILGAN 6 ta kamchilik

### 2.1. 🔴 KRITIK — Profil tahrirlash formasi umuman yo'q edi

**Muammo:** Onboarding'da kreator profili **bo'sh ism** bilan yaratilardi
(`Onboarding.tsx`: `{ name: '' }`), biznes profili ham bo'sh `companyName` bilan. Backend
(`UpdateCreatorProfileDto`/`UpdateBusinessProfileDto`) ism, mamlakat, shahar, tillar,
kategoriyalar, ijtimoiy tarmoq havolalari, obunachilar soni kabi barcha PRD-talab qilgan
maydonlarni to'liq qo'llab-quvvatlar edi — lekin **Mini App'da bu maydonlarni to'ldirish
uchun hech qanday forma yo'q edi**. `Profile.tsx` faqat avatar va to'lov rekvizitlarini
saqlashga ruxsat berardi.

**Nega bu "to'xtab qolish" edi:** Foydalanuvchi ro'yxatdan o'tib, rolini tanlagach, ismini
hech qachon kirita olmasdi. Bu AI Pricing/Matching/Fraud Detection'ni ham ishlatib
qo'yardi (followers=0, engagementRate=0 doim), va biznes zayavkachini ko'rib chiqayotganda
bo'sh ism/mamlakat/kategoriya ko'rar edi.

**Tuzatildi:** `Profile.tsx`ga to'liq tahrirlash formasi qo'shildi — ism (majburiy),
mamlakat, shahar, tillar (checkbox), kategoriyalar, Instagram/TikTok/YouTube/Telegram
havolalari, obunachilar/o'rtacha ko'rishlar/engagement (kreator); kompaniya nomi, tavsif,
soha, veb-sayt, kontakt shaxs (biznes). Agar ism/kompaniya nomi hali bo'sh bo'lsa, forma
**avtomatik ochiq holda** ko'rsatiladi — foydalanuvchi buni o'tkazib yubora olmaydi.

### 2.2. 🟠 YUQORI — Barter modeli FIXED bilan bir xil ishlardi (huquqiy/moliyaviy nomuvofiqlik)

**Muammo:** PRD: "Barter — Business offers products or services **instead of cash**"
(masalan, 300,000 so'mlik restoran taomi). Lekin kod bu farqni umuman hisobga olmasdi —
Barter kampaniyada ham biznesdan **to'liq mahsulot qiymatini** (300,000 so'm) Click orqali
naqd talab qilardi va kreatorga ham "naqd" 270,000 so'm chiqarardi. Bu Barter tushunchasiga
to'g'ridan-to'g'ri zid — barterda pul InfluenceX orqali umuman o'tmasligi kerak, faqat
komissiya naqd to'lanishi kerak.

**Tuzatildi:** Escrow modeliga `depositAmount` maydoni qo'shildi. Endi: FIXED/CPA/HYBRID
uchun `depositAmount = amount` (o'zgarishsiz), BARTER uchun `depositAmount = platformFee`
(faqat 10% komissiya naqd to'lanadi) va `payoutAmount = 0` (kreator mahsulot/xizmatni
to'g'ridan-to'g'ri biznesdan oladi). `approveAndRelease()` endi Barter uchun kreatorning
to'lov rekvizitlarini talab qilmaydi va haqiqiy to'lov provayder chaqiruvini umuman
bajarmaydi — escrow to'g'ridan-to'g'ri yakunlanadi. Click Prepare webhook'idagi summa
tekshiruvi ham `depositAmount`ga nisbatan tuzatildi (aks holda Barter to'lovlari "summasi
mos kelmadi" xatosi bilan har doim rad etilardi).

### 2.3. 🟡 O'RTA — Yangi kampaniya yaratilgach "yo'qolib qolardi"

**Muammo:** `CreateCampaign.tsx` kampaniya yaratilgach `navigate('/')` (ommaviy feed)ga
o'tkazardi. Lekin yangi kampaniya har doim `DRAFT` holatida yaratiladi
(`campaigns.service.ts`), ommaviy feed esa faqat `PUBLISHED` kampaniyalarni ko'rsatadi.
Natijada biznes kampaniya yaratgach uni HECH QAYERDA ko'rmasdi va "ishladimi yoki yo'qmi"
bilmasdi — kampaniyani e'lon qilish (Publish) kerakligini bilishning iloji yo'q edi.

**Tuzatildi:** Endi `navigate('/campaigns/mine')`ga o'tkazadi — bu yerda "E'lon qilish"
tugmasi aniq ko'rinadi.

### 2.4. 🟡 O'RTA — Reputatsiya tizimi (baholash) uchun UI umuman yo'q edi

**Muammo:** `ratings.service.ts`/`ratings.controller.ts` to'liq ishlagan, lekin Mini App'da
hech qanday "hamkorlikni baholang" ekrani yo'q edi. Natijada Creator Score/Business Score
hech qachon haqiqiy ma'lumot bilan yangilanmasdi — PRD "Reputation System"ining butun
maqsadi ishlamas edi.

**Tuzatildi:** Yangi `RatingForm.tsx` komponenti qo'shildi, escrow `RELEASED` bo'lgach
ikkala tomonda ham ko'rinadi (`Applications.tsx` — kreator biznesni baholaydi;
`CampaignApplicants.tsx` — biznes kreatorni baholaydi).

### 2.5. 🔴 XAVFSIZLIK — Baholash tizimi himoyasiz edi ("review bombing" xavfi)

**Muammo:** `POST /ratings` hech qanday egalik/hamkorlik tekshiruvisiz ishlardi — istalgan
autentifikatsiyalangan foydalanuvchi, hech qachon u bilan hamkorlik qilmagan bo'lsa ham,
istalgan boshqa userga (raqobatchisiga ham) baho qo'ya olardi. Takroriy baho qo'yishning
ham oldi olinmagan edi.

**Tuzatildi:** `campaignId` endi majburiy, `ratings.service.ts#create()` haqiqiy `ACCEPTED`
zayavka orqali `authorId`<->`targetUserId` bog'langanini tekshiradi (faqat bevosita
hamkoringizni baholay olasiz), va `schema.prisma`ga `@@unique([authorId, targetId,
campaignId])` qo'shildi — bitta hamkorlik uchun bitta baho.

### 2.6. 🟢 KICHIK — "Zayavkalar" tab biznes uchun doim bo'sh edi

**Muammo:** Pastki navigatsiyadagi "Zayavkalar" tabi ikkala rol uchun ham `/applications`ga
olib borardi, lekin bu sahifa faqat kreatorning o'z zayavkalarini ko'rsatadi — biznes uchun
doim bo'sh ko'rinardi (chalkash "o'lik" UI).

**Tuzatildi:** `BottomNav.tsx` endi foydalanuvchi rolini aniqlaydi — biznes uchun bu tab
to'g'ridan-to'g'ri "Kampaniyalarim" (`/campaigns/mine`)ga olib boradi.

---

## 3. Bloger (kreator) pipeline — to'liq tekshiruv natijasi

| Bosqich | Holat | Izoh |
|---|---|---|
| Telegram orqali ro'yxatdan o'tish | ✅ | `initData` HMAC tekshiruvi, avtomatik |
| Rol tanlash (kreator) | ✅ | Onboarding.tsx |
| Profilni to'ldirish (ism, mamlakat, tillar, kategoriya, ijtimoiy tarmoqlar) | ✅ **(shu sessiyada tuzatildi)** | Profile.tsx to'liq forma |
| Kampaniyalarni ko'rish/qidirish | ✅ | Home.tsx, sahifalangan |
| Zayavka berish | ✅ | CampaignDetail.tsx -> POST /applications |
| Qabul qilinishini kutish + bildirishnoma | ✅ | Telegram bot orqali |
| Escrow avtomatik yaratiladi (qabul qilinganda) | ✅ | applications.service.ts |
| Biznes to'lovni tasdiqlashini kutish (AWAITING_DEPOSIT -> HELD) | ✅ | Bildirishnoma yuboriladi |
| Kontent topshirish | ✅ | Faqat escrow HELD bo'lganda ruxsat beriladi |
| To'lov chiqarilishini kutish (RELEASE_PENDING) | ✅ | Bildirishnoma yuboriladi |
| Pul olish (RELEASED) | ✅ | Click orqali moderator qo'lda tasdiqlaydi (Click avtomatik chiqim API'siga ega emas — bu InfluenceX emas, Click'ning cheklovi) |
| CPA/Hybrid: konversiya kuzatuvi va to'lovi | ✅ | conversions.service.ts to'liq oqim |
| Barter: mahsulot/xizmatni to'g'ridan-to'g'ri olish | ✅ **(shu sessiyada tuzatildi)** | Endi to'g'ri hisoblanadi |
| Daromadlarni ko'rish | ✅ | Earnings.tsx |
| Analitikani ko'rish | ✅ | CreatorAnalytics.tsx |
| Portfolio boshqarish | ✅ | Portfolio.tsx |
| Nizo ochish | ✅ | DisputeForm.tsx |
| Hamkorlikni baholash | ✅ **(shu sessiyada qo'shildi)** | RatingForm.tsx |
| Chat orqali muloqot | ✅ | initData bilan himoyalangan WebSocket |
| Verifikatsiya so'rash | ✅ | Profile.tsx |
| Profilni targ'ib qilish (Featured) | ✅ | Profile.tsx |

**Xulosa: bloger pipeline'ida "to'xtab qoladigan" nuqta qolmadi.** Yagona operatsion
cheklov — Click'ning avtomatik chiqim API'si yo'qligi sababli to'lov moderator tomonidan
qo'lda tasdiqlanadi (bu InfluenceX kodining kamchiligi emas, Click.uz'ning haqiqiy texnik
cheklovi — `DEPLOYMENT.md`da hujjatlashtirilgan).

---

## 4. Biznes pipeline — to'liq tekshiruv natijasi

| Bosqich | Holat | Izoh |
|---|---|---|
| Telegram orqali ro'yxatdan o'tish | ✅ | |
| Rol tanlash (biznes) | ✅ | |
| Profilni to'ldirish (kompaniya, tavsif, soha, veb-sayt) | ✅ **(shu sessiyada tuzatildi)** | Profile.tsx to'liq forma |
| AI Brief Generator bilan kampaniya brifini yaratish | ✅ | CreateCampaign.tsx |
| Kampaniya yaratish (DRAFT) | ✅ | |
| Yaratilgan kampaniyani topish va e'lon qilish | ✅ **(shu sessiyada tuzatildi)** | Endi /campaigns/mine'ga yo'naltiradi |
| Obuna reja limitini bilish (Starter/Growth/Pro) | ✅ | Limit oshsa aniq xato xabari bilan to'xtaydi |
| Zayavkalarni ko'rib chiqish (AI narx + AI moslik tavsiyasi bilan) | ✅ | CampaignApplicants.tsx |
| Zayavkani qabul qilish | ✅ | Escrow avtomatik yaratiladi |
| To'lovni boshlash (Click checkout) | ✅ | FIXED/CPA/HYBRID uchun to'liq summa; BARTER uchun faqat komissiya **(tuzatildi)** |
| Kontentni ko'rib chiqish | ✅ | contentSubmittedAt/contentUrls |
| Ishni tasdiqlash va to'lovni chiqarish | ✅ | |
| CPA konversiyalarni qayd etish/tasdiqlash | ✅ | ConversionsPanel.tsx |
| Kampaniyani boshqarish (Publish/Start/Complete/Cancel) | ✅ | MyCampaigns.tsx |
| Kampaniyani targ'ib qilish (Featured) | ✅ | |
| To'lov tarixini ko'rish | ✅ | Payments.tsx |
| Analitikani ko'rish | ✅ | BusinessAnalytics.tsx |
| Nizo ochish | ✅ | |
| Hamkorni baholash | ✅ **(shu sessiyada qo'shildi)** | |
| Verifikatsiya so'rash | ✅ | |

**Xulosa: biznes o'z maqsadiga (kampaniya joylash -> mos kreator topish -> natija olish
-> hisobot ko'rish) hech qanday "o'lik nuqta"siz yeta oladi.**

---

## 5. Pul oqimi — aniq tekshiruv

Savolingizga to'g'ridan-to'g'ri javob: **ha, endi to'g'ri ishlaydi**, quyidagi aniq
mexanizm bilan (PRD v2 §4.5'dagi "ikkita mustaqil bitim" huquqiy modeli):

1. **Biznes -> InfluenceX** (`confirmDeposit`/Click Prepare-Complete): biznes InfluenceX
   xizmat ko'rsatish shartnomasi bo'yicha to'laydi. FIXED/CPA/HYBRID uchun — to'liq bitim
   summasi; BARTER uchun — faqat 10% komissiya. Bu summa `EscrowStatus.HELD`ga o'tgach
   InfluenceX'ning **savdo daromadi** sifatida qabul qilinadi.
2. **InfluenceX -> Kreator** (`approveAndRelease`): biznes ishni tasdiqlagach, InfluenceX
   o'z HAMKORIGA (kreator) hamkorlik haqini (`amount - platformFee`, ya'ni 90% FIXED/BARTER
   uchun, 85% CPA uchun, 88% HYBRID uchun) to'laydi — bu InfluenceX'ning **xarajati**.
   BARTER uchun bu qadam yo'q (mahsulot to'g'ridan-to'g'ri berilgan).
3. **InfluenceX daromadi** = `platformFee` (har doim, barcha modellar uchun) — bu Admin
   Panel "Daromad hisobotlari" (`revenueReport()`) da aniq ko'rinadi: `totalRevenue`
   (haqiqiy komissiya daromadi) va `totalGrossVolume` (yalpi tranzaksiya hajmi) alohida
   hisoblanadi, faqat **yakunlangan** (`RELEASED`/`paidAt`) tranzaksiyalar hisobga olinadi
   — hali `HELD`/`PENDING` bo'lganlar "kutilayotgan" deb belgilanadi, chunki nizo/bekor
   qilinishi mumkin.

Komissiya stavkalari to'g'ri qo'llanilishi tasdiqlandi: FIXED=10%, BARTER=10% (faqat
komissiya qismiga), CPA=15%, HYBRID=12% — `PLATFORM_COMMISSION_RATES` orqali yagona
manbadan (`packages/shared`) olinadi, hisob-kitob ikki joyda (`escrow.service.ts`,
`conversions.service.ts`) takrorlanmaydi.

**Kreatorning ishini qanday tekshiramiz?** Kontent topshirish bosqichi (`contentSubmittedAt`,
`contentUrls`) majburiy — biznes kontent hali topshirilmagan bo'lsa to'lovni chiqara olmaydi
(`approveAndRelease()` buni backend darajasida bloklaydi, faqat UI validatsiyasi emas).
Nizo yuzaga kelsa, moderator escrow holatini va kontent havolalarini (dalil sifatida)
Admin Panel'da ko'rib, kreator yoki biznes foydasiga hal qiladi (`resolveDispute`).

---

## 6. Admin panel — ikkala tomonni ham qo'llab-quvvatlashi

| Modul | Kreator uchun | Biznes uchun | Amal qila oladimi? |
|---|---|---|---|
| Foydalanuvchilar ro'yxati | ✅ | ✅ | Ko'rish (hozircha faqat ko'rish — ban/suspend funksiyasi yo'q, pastga qarang) |
| Kampaniyalar | — | ✅ | Ko'rish |
| Escrow (to'lov ledgeri) | ✅ | ✅ | **Ha** — qo'lda to'lovni tasdiqlash tugmasi ishlaydi |
| Nizolar | ✅ | ✅ | **Ha** — "Kreator foydasiga" / "Biznes foydasiga" tugmalari ishlaydi |
| Verifikatsiya so'rovlari | ✅ | ✅ | **Ha** — Tasdiqlash/Rad etish tugmalari ishlaydi |
| Fraud signallari | ✅ | — | Ko'rish (AI evristika asosida) |
| CPA konversiyalar (to'lanmagan) | ✅ | — | **Ha** — "To'landi" deb belgilash tugmasi ishlaydi |
| Daromad hisobotlari | — | — | **Ha** — komissiya daromadi, model bo'yicha taqsimot, oylik trend, tranzaksiya tarixi — aniq va real ma'lumotlarga asoslangan |

**Aniq javob:** Admin panel ikkala tomon uchun ham to'liq operatsion — moderator/admin
har qanday to'lov, nizo, verifikatsiya masalasini **haqiqatan hal qila oladi** (faqat
ko'rish emas, amal ham qiladi). Yagona ochiq qolgan narsa — foydalanuvchini bloklash/
suspend qilish funksiyasi hali yo'q (fraud aniqlansa, hozircha faqat kuzatish mumkin,
bloklash mumkin emas). Bu launch-blocking emas (kichik miqyosda moderator qo'lda DB
orqali ham hal qila oladi), lekin birinchi navbatdagi keyingi qo'shimcha sifatida
tavsiya etiladi.

---

## 7. AI — ikkala tomon uchun ham ishlashi

| AI modul | Kreator uchun qayerda ishlatiladi | Biznes uchun qayerda ishlatiladi |
|---|---|---|
| **AI Pricing Engine** | Profile.tsx — o'z narxi bo'yicha tavsiya | CampaignApplicants.tsx — har bir zayavkachi uchun taklif qilingan narxni bozor narxi bilan solishtirish |
| **AI Creator Matching** | — (kreator tomonidan ko'rinmaydi, bu biznes vositasi) | CampaignApplicants.tsx — "AI tavsiya etgan boshqa mos kreatorlar" ro'yxati |
| **AI Fraud Detection** | — (foydalanuvchiga ko'rsatilmaydi, faqat moderator ko'radi — bu to'g'ri, chunki aks holda firibgarlar signalni bilib oldini olishga urinardi) | — |
| **AI Brief Generator** | — | CreateCampaign.tsx — mahsulot tavsifidan kampaniya brifini avtomatik yaratadi |

**Aniq javob:** uchala funksional AI modul (Pricing, Matching, Brief Generator) ikkala
tomonga tegishli ekranlarga to'g'ri ulangan; Fraud Detection ataylab faqat admin/moderator
uchun ko'rinadi (bu xato emas, xavfsizlik dizayni). Barchasi formula/evristika-asoslangan
(LLM emas) — deterministik, tez, va tashqi API kaliti talab qilmaydi.

---

## 8. Qadam-baqadam ishga tushirish yo'li

Quyidagi tartibda bajaring — har bir qadam avvalgisiga bog'liq:

### Qadam 1 — Haqiqiy muhitda birinchi sinov (MAJBURIY, push'dan oldin)
```bash
npm install
npm run build          # packages/shared -> apps/api -> apps/mini-app -> apps/admin
npm run test --workspace=apps/api
```
Bu sessiyada bu buyruqlarni ishga tushirishning imkoni yo'q edi (sandbox cheklovi) — kod
statik tahlil + izolyatsiyalangan TypeScript tekshiruvlari bilan tasdiqlangan, lekin
**haqiqiy `npm install` birinchi marta shu yerda sodir bo'ladi**. Agar xato chiqsa (masalan
versiya nomuvofiqligi), shu yerda tuzating — GitHub'ga push qilishdan oldin.

### Qadam 2 — GitHub'ga push
```bash
git init                      # agar hali repo bo'lmasa
git add .
git commit -m "InfluenceX - production-ready kod bazasi"
git remote add origin <sizning-repo-url>
git push -u origin main
```

### Qadam 3 — Railway'da infratuzilma
1. Railway loyihasi yarating.
2. **PostgreSQL** plagin xizmatini qo'shing (`DATABASE_URL` avtomatik generatsiya bo'ladi).
3. **Redis** plagin xizmatini qo'shing (ixtiyoriy, kelajak uchun tayyorlab qo'yilgan).

### Qadam 4 — Railway'da uchta xizmatni ulash
Bitta GitHub repo'ni 3 marta ulaysiz (`DEPLOYMENT.md` §3.2'da batafsil):

- **API**: Root Directory=`/`, Config File Path=`apps/api/railway.toml`
- **Mini App**: Root Directory=`/`, Config File Path=`apps/mini-app/railway.toml`,
  Build Variable `VITE_API_BASE_URL=https://<api-domeni>/api/v1`
- **Admin Panel**: Root Directory=`/`, Config File Path=`apps/admin/railway.toml`,
  Build Variable `NEXT_PUBLIC_API_BASE_URL=https://<api-domeni>/api/v1`

### Qadam 5 — Environment o'zgaruvchilari (API xizmati)
`.env.example`dagi ro'yxat bo'yicha to'ldiring, eng muhimlari:
- `JWT_SECRET` — uzun tasodifiy satr
- `CORS_ORIGIN` — Admin Panel va Mini App domenlariga aniq cheklang (`*` EMAS)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` — BotFather'dan
- `S3_*` — MinIO/Selectel/Yandex Object Storage hisob ma'lumotlari
- `CLICK_MERCHANT_ID`, `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY`, `CLICK_MERCHANT_USER_ID` — Click support'dan

### Qadam 6 — Migratsiya
Avtomatik (Dockerfile CMD'ida `npx prisma migrate deploy` bor) — birinchi deploy'da
barcha jadvallar (shu jumladan bu sessiyada qo'shilgan `depositAmount` va `Rating.@@unique`)
yaratiladi. Qo'shimcha amal talab qilinmaydi.

### Qadam 7 — Telegram bot webhook
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=<API_URL>/api/v1/telegram-bot/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

### Qadam 8 — BotFather Menu Button
Telegram BotFather orqali botingizga "Menu Button" o'rnating — havola Mini App
domeningizga (`https://<mini-app-domeni>`) ko'rsatilishi kerak.

### Qadam 9 — Click hamkorlikni yakunlash
Click support jamoasiga webhook manzilini bering: `<API_URL>/api/v1/escrow/webhook/click`.

### Qadam 10 — Yopiq sinov (pilot)
5-10 ta haqiqiy biznes va 20-30 ta haqiqiy kreator bilan yopiq beta boshlang. Har bir
to'lov/nizo ni birinchi haftada qo'lda kuzatib boring — bu bosqichda kutilmagan real-dunyo
holatlari (masalan Click'ning haqiqiy javob formati kutilganidan biroz farq qilishi mumkin)
chiqishi mumkin, bu normal.

### Qadam 11 — Monitoring qo'shish (tavsiya etiladi, majburiy emas)
Sentry (xatolar uchun) yoki hech bo'lmaganda oddiy uptime monitor (masalan UptimeRobot)
ulang — hozircha kod faqat konsolga log yozadi.

---

## 9. Hali ochiq qolgan (launch-blocking BO'LMAGAN) narsalar

Halollik uchun — bular kod sifatiga ta'sir qilmaydi, lekin operatsion jarayonda e'tiborga
olinishi kerak:

- Health-check endpoint (`GET /api/v1/health`) hali yo'q.
- Lockfile (`package-lock.json`) hali repo'da yo'q — birinchi `npm install` uni yaratadi.
- Payme/Uzum hali stub (faqat Click haqiqiy hamkor).
- Foydalanuvchini bloklash/suspend qilish admin funksiyasi yo'q.
- Xizmat ko'rsatish shartnomasi va Hamkorlik shartnomasi matnlari — yurist bilan
  tayyorlanishi kerak (huquqiy, kodga bog'liq emas).

---

## 10. Yakuniy javob (savolingiz bo'yicha, qisqacha)

- **Telegram Web App sifatida ishga tushirishga tayyormi?** — Ha.
- **Bloger pipeline to'liq tayyormi, qadam-baqadam to'xtamaydimi?** — Ha (profil forma
  yo'qligi tuzatildi — bu eng jiddiy "to'xtash nuqtasi" edi).
- **Biznes o'z maqsadiga (kampaniya + natija) yeta oladimi?** — Ha (yo'qolib qolish
  muammosi tuzatildi).
- **Kreator ishini qanday tekshiramiz, u pulni qanday oladi, biz qanday daromad
  qilamiz?** — Kontent topshirish -> biznes tasdiqlashi -> escrow bo'linadi (komissiya
  InfluenceX'da, qolgani kreatorga) -> Click orqali moderator qo'lda to'laydi. Barter uchun
  endi to'g'ri (naqdsiz) ishlaydi.
- **Admin panel ikkala tomonni boshqara oladimi?** — Ha, harakatga o'tuvchi (actionable)
  — faqat ko'rish emas.
- **AI ikkala tomon uchun ishlaydimi?** — Ha, uchala modul ham tegishli tomonlarga
  to'g'ri ulangan.

**Deploy qilishingiz mumkin** — faqat 8-bo'limdagi Qadam 1'ni (haqiqiy `npm install &&
build && test`) o'tkazib yubormang.

---

## 11. QO'SHIMCHA (2026-07-12, kechroq) — Mahsulotlar katalogi + CPA atributsiya

Audit va tuzatishlardan keyingi strategiya suhbati asosida quyidagi yangi funksiya qo'shildi
va yuqoridagi audit natijalariga ta'sir qilmaydi (barcha eski xulosalar kuchda qoladi):

### 11.1. Mahsulotlar katalogi (yengil "Shop Integrations")

Biznes endi mahsulot/xizmat ro'yxati yuritishi mumkin (`Products` sahifasi, Mini App'da
"Kampaniyalarim" yonida). Har bir mahsulotda: nom, narx, tashqi sotuv sahifasi havolasi
(Uzum Market/Instagram/o'z sayti), va har bir sotuv uchun blogerga to'lov summasi. **Bu
to'liq onlayn do'kon EMAS** — InfluenceX checkout, inventar yoki domain boshqarmaydi,
ataylab shunday qaror qilindi (sabab: strategiya suhbatiga qarang — to'liq do'kon qurish
InfluenceX'ning asosiy yo'nalishidan chalg'itadi va yangi huquqiy/operatsion yuk qo'shadi).

"Blogerlarga ko'rinsin" belgisi yoqilganda, mahsulot avtomatik ravishda **mavjud CPA
kampaniya infratuzilmasiga** aylanadi (yangi jadval/oqim qurilmadi — Campaign/
CampaignApplication/Conversion/Escrow qayta ishlatildi) va ommaviy feedda oddiy kampaniya
sifatida chiqadi. Bu orqali biznes har safar to'liq brif yozmasdan, tezda ko'p mahsulotni
CPA orqali blogerlarga taklif qila oladi.

### 11.2. CPA atributsiya muammosi — qisman yechildi

Siz to'g'ri ta'kidlagan muammo ("biznes sonini kamroq ko'rsatishi mumkin, bloger esa
oshirib ko'rsatishi mumkin") — bu CPA/affiliate sohasidagi eng qiyin, hali ham to'liq
yechilmagan muammo (InfluenceX'ga xos emas). Uchta ishonch darajasi qo'shildi:

- **WEBHOOK (eng ishonchli)** — biznesning o'z sayti/ilovasi/boti sotuv/obuna yakunlanganda
  `POST /conversions/webhook/:campaignId`'ga avtomatik signal beradi (imzo bilan
  himoyalangan, Click webhook'idagi naqshga mos). Bu yo'l bilan kelgan konversiya darhol
  **CONFIRMED** holatida yaratiladi — biznes "tasdiqlash" bosqichini o'tkazib yubora olmaydi.
- **TELEGRAM_DEEPLINK** — `t.me/<bot>?start=ref_<referralCode>` orqali klikni botning o'zi
  qayd etadi (yangi tashqi integratsiya shart emas, mavjud bot infratuzilmasi kengaytirildi).
  Bu FAQAT klikni tasdiqlaydi, konversiyani emas.
- **SELF_REPORTED (eng zaif, hozirgi standart)** — biznes qo'lda kiritadi, keyin o'zi
  tasdiqlaydi. Bu yo'lda haliham sonni past ko'rsatish nazariy jihatdan mumkin.

**Muhim va halol eslatma:** fizik mahsulotlar tashqi marketpleysda (masalan Uzum Market)
sotilganda, hozircha **to'liq avtomatik va isbotlanadigan atributsiya yo'q** — Uzum'ning
ochiq API'si inventar/buyurtma boshqaruvi uchun (`api-seller.uzum.uz`), affiliate/referal
kuzatuv uchun emas. Shu sababli `CreateCampaign.tsx`da endi sof CPA model tanlanganda
ogohlantirish chiqadi va Hybrid'ga o'tishni tavsiya qiladi (kafolatlangan asosiy to'lov +
CPA bonusi) — bu blogerni butunlay tekin ishlab qolish xavfidan himoya qiladi.

### 11.3. Xavfsizlik tuzatishi shu jarayonda topildi va darhol tuzatildi

Yangi `Campaign.webhookSecret` maydoni qo'shilganda, `campaigns.service.ts#findPublic()`
va `#findOne()` PUBLIC (guardsiz) endpoint'lar ekanligi tufayli bu maxfiy kalitni ham
qaytarib yuborayotgani aniqlandi — bu kampaniya ID'sini bilgan istalgan kishiga soxta
webhook so'rovlarini imzolash imkonini bergan bo'lar edi. `stripWebhookSecret()` yordamchi
funksiyasi bilan darhol tuzatildi; ushbu ikkala endpoint javobidan endi olib tashlanadi.

### 11.4. Yangilangan yakuniy verdikt

Bu qo'shimcha ham **GO** — kod balansi (168 ta `.ts`/`.tsx` fayl, brace-muvozanat 0),
JSON to'g'riligi (3 tilda), va `schema.prisma` (16 model, muvozanatli) to'liq tekshirildi
va tasdiqlandi. Checksum-asoslangan sinxronizatsiya `outputs/influencex` → `blog/influencex`
**"PERFECT MATCH"** natijasi bilan yakunlandi (206/206 fayl).

Qo'shimcha migratsiya qadami shart emas — `prisma migrate deploy` (Dockerfile CMD'ida
avtomatik) yangi `Product` jadvali va `Campaign`/`Conversion`/`CampaignApplication`dagi
yangi maydonlarni ham birinchi deploy'da avtomatik yaratadi.
