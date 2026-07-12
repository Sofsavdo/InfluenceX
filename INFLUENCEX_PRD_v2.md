# INFLUENCEX — PRODUCT REQUIREMENTS DOCUMENT v2.0
## Strategik pivot: Telegram Mini App orqali ishga tushirish

**Sana:** 2026-yil 11-iyul
**Status:** Qayta ko'rib chiqilgan PRD (v1 — umumiy platforma → v2 — Telegram Mini App-first strategiya)

---

## 0. Nima o'zgardi va nima uchun

Birinchi versiyadagi PRD to'liq miqyosli platformani (Next.js web + kelajakda mobil ilovalar) tasvirlagan edi. Bozorni chuqur tahlil qilgandan so'ng, quyidagi sabablarga ko'ra **birinchi bosqichda mahsulotni Telegram Mini App (Web App) sifatida ishga tushirish** strategik jihatdan ancha to'g'ri qaror ekani aniqlandi:

1. **Distribution muammosi yo'qoladi.** O'zbekistonda internet foydalanuvchilarining 76% i (~27 million kishi, 95% penetratsiya) Telegramdan foydalanadi — bu Instagram (11 mln) va YouTube (13 mln) dan sezilarli yuqori. Kreatorlar va bizneslar allaqachon Telegramda. App Store/Play Market orqali yangi ilovani yuklab olishga undash — eng qimmat va sekin o'sish kanali; Mini App esa mavjud Telegram-kanal va guruhlar orqali bir bosishda ochiladi.
2. **CAC (mijoz jalb qilish narxi) keskin pasayadi.** Native ilova uchun foydalanuvchini app store'ga yo'naltirish, install qildirish, ro'yxatdan o'tkazish — bir necha bosqichli funnel. Mini App'da funnel bitta: Telegram bot/kanal linki → to'g'ridan-to'g'ri ilova ichida ishlash.
3. **Ishga tushirish tezligi va narxi.** To'liq native yoki hatto to'liq web platforma 3-6 oy va $60,000+ talab qiladi. Mini App MVP 8-12 haftada, ancha kichik byudjetda ishga tushiriladi — bu "build-measure-learn" siklini tezlashtiradi.
4. **Auth muammosi hal qilinadi.** Telegram `initData` orqali foydalanuvchi avtomatik autentifikatsiya qilinadi — alohida ro'yxatdan o'tish/parol tizimi shart emas. Bu ayniqsa mikro-kreatorlar uchun kirish to'sig'ini deyarli yo'qqa chiqaradi.
5. **Bozorda bo'shliq bor.** Perfluence (MDH bozori yetakchisi) faqat rus tilida ishlaydi va rasmiy ilovasi yo'q — veb-platforma + Telegram-bot orqali ishlaydi. Global platformalar (Collabstr, Insense, Billo) O'zbekiston to'lov infratuzilmasini (Click/Payme/Uzum) qo'llab-quvvatlamaydi va mahalliy tilni bilmaydi. **O'zbek + rus + ingliz tillarida ishlaydigan, mahalliy to'lov tizimlariga ulangan Telegram-native creator marketplace hozircha mavjud emas** — bu InfluenceX uchun aniq differensiatsiya nuqtasi.

Native mobil ilovalar (iOS/Android) **rad etilmayapti** — ular Faza 3 sifatida saqlanadi va Mini App orqali validatsiya qilingan mahsulot-bozor moslashuvidan (PMF) so'ng quriladi, aynan React Native orqali backend/business logikaning katta qismini qayta ishlatib.

---

## 1. Chuqur bozor tahlili

### 1.1 Telegram Mini App ekotizimi (global kontekst)

- Telegram Mini App'lar (TMA) bilan **500 million+ kishi muntazam ishlaydi** — bu Telegramning umumiy foydalanuvchi bazasining yarmi.
- 2026-yilga kelib TMA'lar to'liq ekran rejimi, yaxshilangan to'lovlar va Web3 (TON) integratsiyasini qo'llab-quvvatlaydi — savdo, utility va marketplace turdagi ilovalar uchun yetarlicha yetuk platforma.
- **Cheklovlar:** TMA'lar qurilma apparat ta'minotiga (Bluetooth, background processing) cheklangan kirishga ega; qidiruv tizimlarida ko'rinmaydi (SEO yo'q — faqat to'g'ridan-to'g'ri havolalar/Telegram katalogi orqali topiladi); Telegram tanaffusga uchrasa, ilova ham ishlamay qoladi; **Telegram o'zi to'lovlarni ushlab turmaydi yoki qayta ishlamaydi** — faqat uchinchi tomon to'lov provayderlariga (Payment Platform) kirish beradi.
- Bu oxirgi nuqta **escrow arxitekturasi uchun hal qiluvchi ahamiyatga ega** (pastda 4.5-bo'limga qarang): to'liq escrow tizimini Telegram emas, InfluenceX'ning o'z backend'i (NestJS + PostgreSQL ledger) + litsenziyalangan to'lov tashkilotlari orqali qurish kerak bo'ladi.

### 1.2 Raqobatchilar tahlili

| Platforma | Bozor | Kuchli tomonlari | Zaif tomonlari |
|---|---|---|---|
| **Perfluence** | MDH (Rossiya asosiy) | 498,000+ blogger bazasi, 240+ kompaniya, CPA/fix/barter modellarini qo'llab-quvvatlaydi, katta jamoasi (1000+ mutaxassis) | Faqat rus tilida; O'zbekiston to'lov tizimlariga (Click/Payme) ulanmagan; minimal 1,000 obunachi talabi mikro-kreatorlarni chetlab o'tadi; og'ir, agentlik-markazlashgan model — o'z-o'ziga xizmat qilish tajribasi zaif |
| **UGC Market** (ugc-market.ru va shu turdagi platformalar) | MDH | Faqat UGC-kontentga ixtisoslashgan, tranzaksiya xavfsizligini ta'minlaydi | Distribution/reach modelini qo'llab-quvvatlamaydi (faqat kontent, auditoriya orqali reklama emas); mahalliy til/to'lov yo'q |
| **Collabstr / Insense / Billo** (global) | AQSh/G'arb | Yetuk UX, 100K+ tekshirilgan kreator, kuchli brend ishonchi | Ingliz tilida; AQSh dollarida narxlash; Click/Payme/Uzcard/Humo bilan integratsiya yo'q; O'rta Osiyo kreatorlari deyarli yo'q |
| **Mahalliy O'zbek bozori** | O'zbekiston | Jedai Media, Add-Effect, MunaMedia kabi **agentliklar** mavjud | Bular **agentlik xizmati**, o'z-xizmat platforma emas — narx shaffof emas, escrow yo'q, komissiya yashirin, skeylanmaydi |

**Xulosa:** To'g'ridan-to'g'ri O'zbek/O'rta Osiyo bozoriga qaratilgan, o'z-xizmat (self-service), escrow-himoyalangan, ko'p tilli creator marketplace **amalda mavjud emas**. Bu "blue ocean" imkoniyat, lekin bozor hali tarbiyalanmagan (ta'lim/ishonch qurish kerak bo'ladi) — buni GTM strategiyasida hisobga olish kerak.

### 1.3 O'zbekiston / Markaziy Osiyo bozori chuqur tahlili

- **Telegram penetratsiyasi:** ~27 million foydalanuvchi, internet foydalanuvchilarining 76%, 195,000+ kanal (Rossiyadan keyin 2-o'rin), kunlik 1.3 milliard kanal ko'rishlari. Bu — reklama va distribution uchun ulkan, deyarli monopol kanal.
- **Raqamli reklama bozori:** 2028-yilga borib $368.3 million ga yetishi prognoz qilinmoqda. Media yosh — 27 yosh, bu demografik jihatdan raqamli reklama uchun ideal.
- **Kontent tendentsiyasi:** O'zbek tilidagi kontent ishlab chiqaruvchi bloggerlar soni sezilarli o'smoqda; brendlar mikro/nano-kreatorlarga (kichik, lekin sodiq auditoriya) ko'proq ishonch bildirmoqda — bu InfluenceX'ning micro-creator segmentiga mos keladi.
- **To'lov infratuzilmasi:** Click, Payme va Uzum Bank birgalikda bozorning 90%+ ini qamrab oladi. Bularning barchasi uchun tayyor kutubxonalar (masalan, PayTechUZ) va Telegram-bot integratsiyasi namunalari mavjud — texnik risk past.
- **Regulyativ muhit (KRITIK):** O'zbekiston Markaziy banki "To'lovlar va to'lov tizimlari to'g'risida"gi qonun (№578, 01.11.2019) asosida **mijoz mablag'larini ushlab turadigan har qanday tashkilot to'lov tashkiloti litsenziyasiga ega bo'lishi** yoki litsenziyalangan operator (Payme, Click, Uzum) orqali ishlashi kerak. **InfluenceX o'zi mustaqil ravishda uchinchi shaxs (biznes/kreator) mablag'larini "custody" qilishi mumkin emas** — shu sababli to'lov modeli "Xizmat sotib olish + Hamkorga to'lov" tuzilmasi asosida qurilgan (4.5-bo'limga qarang).

---

## 2. Yangilangan foydalanuvchi rollari va oqimlari

Rollar (Creator, Business, Moderator, Admin) o'zgarmaydi, lekin **kirish/autentifikatsiya oqimi butunlay soddalashadi**:

- **MVP (Mini App):** Creator va Business Telegram akkaunti orqali avtomatik autentifikatsiya qilinadi (`initData` HMAC tekshiruvi). Profil to'ldirish — onboarding wizard shaklida, Mini App ichida.
- **Moderator va Admin:** alohida **veb-asoslangan Admin Panel** (Next.js, brauzerda) orqali ishlaydi — chunki moderatsiya/moliyaviy nazorat ishi katta ekran, ko'p oynali ish faoliyatini talab qiladi, Mini App formatiga mos emas.

---

## 3. Hamkorlik modellari — MVP uchun ustuvorlashtirish

| Model | Faza | Izoh |
|---|---|---|
| **Fixed Payment** | MVP (Faza 1) | Asosiy model, birinchi kunidan ishlashi shart |
| **Barter** | MVP (Faza 1) | Texnik jihatdan oddiy (pul o'tkazmasi yo'q, faqat tasdiqlash oqimi) |
| **CPA** | ~~Faza 2~~ — BAJARILDI (2026-07-12) | Konversiya tracking (`trackClick` → deep-link redirect, `report/confirm/reject/markPaid` oqimi) `apps/api/src/conversions/`da amalga oshirildi. Moderator tomonidan qo'lda tasdiqlash — Click'da avtomatik chiqim API yo'qligi sababli (xuddi escrow'dagi kabi). |
| **Hybrid** | ~~Faza 2~~ — BAJARILDI (2026-07-12) | Fixed + CPA kombinatsiyasi — kampaniya yaratishda `collaborationModel=HYBRID` + `cpaRate` maydoni bilan qo'llab-quvvatlanadi (`CreateCampaign.tsx`). |

**Eslatma (2026-07-12):** Ushbu jadval PRD v2'ning original Faza 1/Faza 2 rejalashtirishini
tarixiy hujjat sifatida saqlab qoladi, lekin foydalanuvchi ko'rsatmasi bilan ("MVP emas, to'liq
funksional loyiha") CPA va Hybrid Faza 2'dan oldinga olib o'tilib, kod bazasida to'liq amalga
oshirildi — pastdagi "4.x" bo'limlar hali MVP doirasini tasvirlaydi, lekin haqiqiy loyiha bundan
ancha kengroq. To'liq joriy holat uchun `README.md`dagi "To'liq funksiyalar ro'yxati" bo'limiga
qarang.

---

## 4. MVP mahsulot doirasi (Telegram Mini App, Faza 1)

### 4.1 Kreator profili (Mini App ekrani)
Ism, avatar (Telegram profil rasmidan avtomatik), mamlakat/shahar, tillar, kategoriyalar, ijtimoiy tarmoq havolalari (Instagram/TikTok/YouTube/Telegram), obunachilar soni, portfolio (rasm/video, S3'ga yuklanadi), reyting, creator score.

### 4.2 Biznes profili
Kompaniya nomi, logotip, tavsif, soha, veb-sayt, kontakt shaxs, business score, verifikatsiya statusi.

### 4.3 Kampaniya yaratish va zayavkalar
To'liq PRD v1'dagi maydonlar saqlanadi (sarlavha, tavsif, mahsulot, maqsad, kontent turi, hamkorlik modeli, byudjet, kreatorlar soni, muddat, talablar). Kampaniya oqimi (public → zayavka → tanlash → escrow → chat → kontent → tasdiqlash → to'lov) o'zgarmaydi, faqat UI Mini App ekranlariga moslashtiriladi (pastdan tab-navigatsiya: Bosh sahifa / Kampaniyalar / Chat / Profil).

### 4.4 Kontent turlari — MVP uchun qisqartirilgan ro'yxat
**MVP'da:** Reel, Story, Post, UGC Video, Product Review.
**Faza 2'da qo'shiladi:** Voice Review, Short/Long Video, YouTube Integration (bular ko'proq validatsiya va murakkab fayl formatlarini talab qiladi).

### 4.5 To'lov tizimi — QAYTA LOYIHALANGAN v2.1 (Xizmat sotib olish + Hamkorga to'lov modeli)

**Muammo:** Telegram o'zi pulni ushlab turmaydi; O'zbekiston qonunchiligi **uchinchi shaxs mablag'larini** litsenziyasiz custody (ushlab turish/o'tkazish) qilishni taqiqlaydi.

**Tuzatilgan yechim (2026-07-11 yangilanishi):** Dastlabki v2.0'da tasvirlangan "escrow" modeli InfluenceX'ni **biznes va kreator o'rtasidagi vositachi/pul saqlovchi** sifatida ko'rsatgan edi — bu huquqiy jihatdan noaniq va litsenziya talab qilish xavfini oshiradi. Tahlil natijasida quyidagi **aniqroq shartnoma tuzilmasi** tanlandi:

**Asosiy printsip: ikkita mustaqil bitim, bitta pul aylanishi emas.**

1. **Biznes ↔ InfluenceX (Xizmat ko'rsatish shartnomasi).** Biznes InfluenceX'dan "kreativ kampaniya boshqaruvi xizmati"ni sotib oladi va butun kampaniya summasini InfluenceX'ga to'laydi. Bu — InfluenceX uchun **oddiy savdo daromadi** (xizmat sotish), "mijoz puli" yoki "escrow" emas. Payme/Click/Uzum bu yerda faqat to'lov relsi (litsenziyalangan operator) — xuddi har qanday online-do'kon kabi.
2. **InfluenceX ↔ Kreator (Hamkorlik / pudratchi xizmat ko'rsatish shartnomasi).** InfluenceX kreator bilan mustaqil shartnoma tuzadi va unga ishlab chiqargan kontenti/hamkorligi evaziga **o'z xarajati sifatida** haq to'laydi. Bu — InfluenceX'ning o'z pudratchisiga to'lovi, "biznes puli"ni kreatorga "qaytarish" emas.
3. Natijada InfluenceX hisobiga tushgan har bir so'm yoki **(a) o'zining xizmat daromadi**, yoki **(b) o'zining pudratchiga xarajati** — hech qachon "uchinchi shaxsning transit puli" emas. Shu sababli InfluenceX Markaziy bankning **"to'lov tashkiloti" litsenziyasiga muhtoj emas**; u faqat Payme/Click/Uzum'ning oddiy **tadbirkor-mijozi** sifatida ishlaydi (xuddi Uzum Market, boshqa marketpleyslar kabi).

**Ichki ledger (foydalanuvchiga "himoyalangan to'lov" sifatida ko'rsatiladi, lekin huquqiy tabiati boshqacha):**
Texnik arxitektura deyarli o'zgarmaydi — `Escrow`/`EscrowTransaction` jadvallari xuddi avvalgidek AWAITING_DEPOSIT → HELD → RELEASE_PENDING → RELEASED/REFUNDED/DISPUTED holatlarini kuzatadi. Farq faqat **buxgalteriya va shartnoma talqinida**: "HELD" holati endi "mijoz puli muzlatilgan" emas, balki **"xizmat summasi daromad sifatida qabul qilindi, kreatorga to'lov (kreditorlik qarzi) hali amalga oshirilmagan"** deb hisoblanadi — bu har qanday pudratchilar bilan ishlaydigan kompaniya (masalan qurilish bosh pudratchisi) uchun standart amaliyot.

**Ko'rib chiqilgan muqobil variant — Komissiya/Agentlik shartnomasi (Fuqarolik Kodeksi):** O'zbekistonda Uzum Market, Wildberries UZ kabi marketpleyslar xaridor to'lovini sotuvchi nomidan/topshirig'i bilan qabul qilib, komissiyasini (odatda 10-20%) ushlab qolib qolganini sotuvchiga o'tkazadi — bu ham CBU litsenziyasisiz ishlaydi, chunki Fuqarolik Kodeksining komissiya/agentlik shartnomalari tartibga soladi, Payment Systems qonuni emas. Bu variant mavjud 10%/15% komissiya monetizatsiya modelini o'zgarishsiz saqlaydi va soliq bazasi faqat komissiyadan hisoblanadi (to'liq summadan emas). **Farqi:** bu yerda InfluenceX baribir "boshqa birovning puli"ni (qisqa muddat) o'tkazuvchi hisoblanadi, shuning uchun chegara xizmat-sotish variantiga qaraganda ozroq aniq.

**Tavsiya:** MVP uchun **"Xizmat sotib olish + Hamkorga to'lov"** varianti (yuqoridagi 1-2-band) tanlandi — u eng past huquqiy noaniqlikka ega va foydalanuvchi tomonidan tasdiqlangan biznes mantiqiga (biznes InfluenceX xizmatiga to'laydi, InfluenceX kreatorga hamkorlik uchun to'laydi) to'g'ridan-to'g'ri mos keladi. Miqyos oshgach va soliq optimallashtirish zarur bo'lsa, Komissiya/Agentlik varianti (Faza 2-3) qayta ko'rib chiqilishi mumkin.

**⚠️ Muhim eslatma:** Bu yuridik xulosa emas. Ikkala variant ham amalda keng qo'llanilsa-da, aniq shartnoma matnlari (Xizmat ko'rsatish shartnomasi, Hamkorlik/pudratchi shartnomasi) va soliq rejimi tanlovi (umumiy / soddalashtirilgan / IT Park) O'zbekiston yuristi va soliq maslahatchisi bilan ishga tushirishdan oldin tasdiqlanishi SHART.

**Nizo holatida:** Moderator Admin Panel orqali dalillarni ko'rib chiqadi, kreatorga to'lov (RELEASED) yoki bizneska qaytarim/kompensatsiya (REFUNDED) haqida qaror qabul qiladi — bu InfluenceX'ning o'z ichki moliyaviy qarori, chunki mablag' allaqachon InfluenceX daromadi hisoblanadi.

> ⚠️ **Muhim eslatma:** Bu bo'lim yuridik xulosa emas — ishga tushirishdan oldin O'zbekiston fintech huquqi bo'yicha maxsus yurist bilan escrow modelini tasdiqlash SHART.

### 4.6 Chat
MVP'da ikkita variant ko'rib chiqiladi: (a) Mini App ichida WebSocket-asoslangan real-vaqt chat (to'liq nazorat, moderatsiya imkoniyati) yoki (b) Telegram'ning o'zidagi shaxsiy xabar funksiyasidan foydalanish (tezroq, lekin moderatsiya/dalil saqlash qiyinroq). **Tavsiya: (a)** — chunki nizolarda dalil sifatida chat tarixini saqlash va moderatorga ko'rsatish zarur, bu Telegram DM'da kontrol qilinmaydi.

### 4.7 Reyting va Admin Panel
O'zgarishsiz saqlanadi (PRD v1 bo'yicha). Admin Panel — alohida Next.js veb-ilova (Mini App emas).

### 4.8 Ko'p tillilik (uz / ru / en)
Loyiha 3 tilda ishlaydi. i18n arxitekturasi:
- Mini App: `react-i18next` yoki `@telegram-apps/sdk` bilan integratsiyalangan til tanlovi (Telegram foydalanuvchi tilidan avtomatik aniqlash + qo'lda o'zgartirish).
- Admin Panel/Marketing sayt: `next-intl`.
- Barcha foydalanuvchi kontenti (kampaniya tavsiflari, profil) — foydalanuvchi qaysi tilda kiritsa shunda saqlanadi; tizim matnlari (UI) uchta tilga to'liq tarjima qilinadi (uz-Lotin ustuvor, keyin ru, keyin en).

---

## 5. AI tizimi — MVP/Faza 2 taqsimoti

| Modul | Faza | Sabab |
|---|---|---|
| AI Brief Generator | Faza 1 (MVP) | Oddiy OpenAI/Gemini prompt-chaqiruvi, tez qo'shiladi, biznes uchun katta qiymat, past texnik risk |
| AI Pricing Engine | Faza 2 | Tarixiy performance ma'lumotlari kerak — MVP'da hali yetarli data yo'q |
| AI Creator Matching | Faza 2 | Xuddi shunday — algoritm sifatli ishlashi uchun kritik massa kerak |
| AI Fraud Detection | Faza 2 (lekin qoralama qoidalar MVP'dan) | To'liq AI modeli keyinroq; MVP'da oddiy qoidalar (masalan, obunachi/engagement nisbati anomaliyasi) + qo'lda moderatsiya bilan boshlanadi |

---

## 6. Texnologik stack — yangilangan

| Qatlam | Texnologiya | Izoh |
|---|---|---|
| **Mini App frontend** | React + Vite + `@telegram-apps/sdk` (yoki Telegram WebApp JS SDK), TailwindCSS | Next.js emas — Mini App to'liq client-side SPA, SSR keraksiz, Vite tezroq build/dev tsikli beradi |
| **Admin Panel + Marketing sayt** | Next.js, TypeScript, TailwindCSS | SEO kerak bo'lgan yagona qism — chunki Mini App qidiruv tizimlarida ko'rinmaydi, alohida marketing landing sayt trafik jalb qilish uchun zarur |
| **Backend** | Node.js + NestJS | O'zgarishsiz |
| **Bot qatlami** | Telegram Bot API (webhook) | Bildirishnomalar, deep-link marshrutlash, `initData` generatsiyasi |
| **Ma'lumotlar bazasi** | PostgreSQL | O'zgarishsiz |
| **Kesh** | Redis | O'zgarishsiz |
| **Fayl saqlash** | S3-compatible | Portfolio, kontent yuklamalari |
| **Realtime** | WebSocket | Chat, bildirishnomalar |
| **To'lovlar** | Click, Payme, Uzum (asosiy) + Telegram Stars (faqat premium/subscription kabi raqamli funksiyalar uchun, escrow uchun EMAS) | 4.5-bo'limga qarang |
| **AI** | OpenAI, Gemini | O'zgarishsiz |
| **Infratuzilma** | Docker, Railway (MVP tezkor joylashtirish) → AWS/Hetzner (miqyos oshgach) | Railway — MVP bosqichida tezroq va arzon |
| **Auth** | Telegram `initData` HMAC-SHA256 tekshiruvi (MVP) → +Email/parol (Faza 3, native ilovalar uchun) | |

---

## 7. Yangilangan MVP doirasi (yakuniy ro'yxat)

1. Telegram orqali avtomatik autentifikatsiya
2. Kreator profili (portfolio bilan)
3. Biznes profili
4. Kampaniya yaratish (Fixed + Barter modellar)
5. Zayavka berish/ko'rib chiqish
6. Escrow (Payme/Click integratsiyasi orqali, ledger-asoslangan)
7. Mini App ichidagi real-vaqt chat
8. Reyting/sharh tizimi
9. Admin Panel (foydalanuvchilar, kampaniyalar, to'lovlar, nizolar, verifikatsiya)
10. Qo'lda + qoida-asoslangan verifikatsiya
11. AI Brief Generator
12. 3 tilli interfeys (uz/ru/en)

**Kelajakdagi funksiyalar (yangilandi, 2026-07-12):** ~~CPA Tracking~~ va ~~Hybrid kampaniyalar~~
BAJARILDI (yuqoriga qarang). Hali kelajakda qoladi: Affiliate tizimi, Referral havolalar, Promo
kodlar, Marketplace integratsiyalari, Shop integratsiyalari, **Native mobil ilovalar**, Creator
Financing, Creator Loans, Creator Insurance, Kengaytirilgan AI Analytics (hozirgi AI — formula/
evristika-asoslangan Pricing/Matching/Fraud Detection — allaqachon amalga oshirilgan, "kengaytirilgan"
deganda LLM-asoslangan chuqurroq tahlil nazarda tutiladi).

---

## 8. Bosqichma-bosqich yo'l xaritasi

| Faza | Muddat (taxminiy) | Maqsad |
|---|---|---|
| **Faza 0 — Validatsiya** | 2 hafta | Landing sahifa + Telegram kanal orqali kutish ro'yxati (waitlist), 20-30 ta biznes va 50+ kreator bilan muammo-yechim intervyulari |
| **Faza 1 — Mini App MVP** | 8-12 hafta | 6-bo'limdagi to'liq ro'yxat; yopiq beta (10-15 biznes, 50-100 kreator, Toshkent markazlashgan) |
| **Faza 2 — Ommaviy ishga tushirish va AI** | ~~Beta'dan keyin 3-6 oy~~ — kod bazasi tomoni MUDDATIDAN OLDIN BAJARILDI (2026-07-12) | AI Pricing/Matching/Fraud Detection, CPA/Hybrid, obuna rejalari (Starter/Growth/Pro), Featured Placement, kreator/biznes analitika sahifalari, admin daromad hisobotlari — barchasi kodlashtirildi va test qilindi. Ochiq qolgan narsa — bozorga chiqarish (haqiqiy beta foydalanuvchilar, marketing, Faza 0/1 validatsiyasi), kod emas. |
| **Faza 3 — Native mobil ilovalar** | Faza 2 PMF tasdiqlangandan keyin 6-12 oy | React Native (iOS/Android), Mini App backend/business logikasini qayta ishlatadi |
| **Faza 4 — Mintaqaviy kengayish** | Faza 3 bilan parallel/keyin | Qozog'iston, Qirg'iziston — Telegram penetratsiyasi yuqori bo'lgan qo'shni bozorlar; Affiliate tizimi, Creator Financing |

---

## 9. Go-to-Market strategiyasi (Telegramga xos)

1. **Distribution kanali sifatida Telegram:** mavjud O'zbek marketing/blogger Telegram-kanallari (masalan, @uzbekmarketing kabi) bilan hamkorlik, TGStat orqali tegishli kanallarni aniqlash.
2. **Agentliklar bilan hamkorlik, raqobat emas:** Jedai Media, Add-Effect, MunaMedia kabi mavjud agentliklarni **birinchi biznes-mijozlar** sifatida jalb qilish — ular allaqachon kreatorlar bazasiga ega, InfluenceX ularga vositachilik ish yukini kamaytiradi.
3. **Micro-creator-first akvizitsiya:** bozor tahlili shuni ko'rsatadiki, mikro/nano-kreatorlarga ishonch kuchayib bormoqda — past chegara (0 dan platformaga qo'shilish) va tezkor to'lov (ishonchni qurish uchun) asosiy tortishuv nuqtasi bo'ladi.
5. **Tilga asoslangan differensiatsiya:** marketingda aniq pozitsiyalash — "Perfluence'dan farqli o'laroq, o'zbek tilida, Click/Payme bilan ishlaydigan yagona creator marketplace."

---

## 10. Risklar va ularni yumshatish

| Risk | Ta'sir | Yumshatish |
|---|---|---|
| Telegram platformasiga to'liq bog'liqlik (outage, siyosat o'zgarishi) | Yuqori | Foydalanuvchi va tranzaksiya ma'lumotlari to'liq InfluenceX'ning o'z bazasida (PostgreSQL) saqlanadi, Telegram faqat interfeys/auth qatlami — ma'lumotlar migratsiyasi har doim mumkin |
| To'lov modeli noto'g'ri talqin qilinishi (CBU "to'lov tashkiloti" sifatida ko'rilishi xavfi) | Yuqori | 4.5-bo'limdagi "Xizmat sotib olish + Hamkorga to'lov" shartnoma tuzilmasi (ikkita mustaqil bitim) + fintech yuristi bilan shartnoma matnlarini ishga tushirishdan oldin tasdiqlash |
| Mini App SEO'da ko'rinmasligi | O'rta | Alohida Next.js marketing sayt + Telegram-kanal orqali organik o'sish + SMM |
| Soxta obunachi/engagement firibgarligi | O'rta | MVP'da qo'lda tekshirish + qoida-asoslangan bayroqlar, Faza 2'da to'liq AI Fraud Detection |
| Bozorni "tarbiyalash" zarurati (yangi kategoriya) | O'rta | Faza 0 validatsiya bosqichi + agentliklar bilan hamkorlik orqali ishonchni tezroq qurish |
| Raqobatchilarning tezkor javobi (Perfluence O'zbek tiliga o'tishi) | Past-O'rta | Mahalliy to'lov integratsiyasi va Telegram-native UX texnik "moat" yaratadi — tezda nusxalab bo'lmaydi |

---

## 11. MVP muvaffaqiyat ko'rsatkichlari (KPI)

- Faza 1 oxiriga: 100+ faol kreator profili, 20+ faol biznes, 30+ yakunlangan kampaniya
- O'rtacha to'lov (biznes to'lovidan kreator hamkorlik haqi to'languncha) vaqti: <48 soat
- Kreator/biznes NPS: 40+
- Nizolar nisbati: <5% yakunlangan kampaniyalardan
- Faza 0 → Faza 1 konversiya: waitlist'dan kamida 30% faol foydalanuvchiga aylanishi
