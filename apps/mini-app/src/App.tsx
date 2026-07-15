import { useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { apiClient } from './api/client';
import { getTelegramWebApp } from './lib/telegram';
import { getWebToken, clearWebToken } from './lib/webSession';
import Home from './pages/Home';
import CampaignDetail from './pages/CampaignDetail';
import CampaignApplicants from './pages/CampaignApplicants';
import Applications from './pages/Applications';
import ChatList from './pages/ChatList';
import ChatThread from './pages/ChatThread';
import Profile from './pages/Profile';
import Portfolio from './pages/Portfolio';
import Earnings from './pages/Earnings';
import Payments from './pages/Payments';
import CreatorAnalytics from './pages/CreatorAnalytics';
import BusinessAnalytics from './pages/BusinessAnalytics';
import Onboarding from './pages/Onboarding';
import CreateCampaign from './pages/CreateCampaign';
import MyCampaigns from './pages/MyCampaigns';
import Products from './pages/Products';
import WebLogin from './pages/WebLogin';
import BrowseCreators from './pages/BrowseCreators';
import CreatorProfile from './pages/CreatorProfile';

interface MeProfileCheck {
  creatorProfile?: unknown;
  businessProfile?: unknown;
}

const NO_AUTH_REQUIRED_PATHS = ['/login'];

// 2026-07-15: Telefon+SMS OTP orqali veb-kirish TAYYOR (backend, /login sahifasi -
// bularning barchasi kodda qoladi), lekin SMS provayder (Eskiz) hali ulanmagan va
// loyiha egasi buni haqiqiy foydalanuvchilarga ko'rsatishdan oldin butun ilovani
// tasdiqlamoqchi. Shuning uchun bu bayroq FALSE - oddiy foydalanuvchilar hech qachon
// /login'ga avtomatik yo'naltirilmaydi (Telegram tashqarisida ochilsa, eski xulq -
// jim, faqat ommaviy ko'rish rejimida ishlaydi). Eskiz ulanib, tasdiqlangach, bu yerni
// `true`ga o'zgartirish yetarli - qolgan hamma narsa (backend, WebLogin.tsx) tayyor.
const WEB_LOGIN_ENABLED = false;

// 2026-07-14 (chuqur tahlil natijasida topilgan bo'shliq): Telegram /start -> "Ilovani
// ochish" -> TelegramAuthGuard birinchi so'rovda avtomatik User yozuvini yaratadi (rol
// standart CREATOR, lekin creatorProfile/businessProfile HALI yo'q) - lekin frontend'da
// buni tekshirib /onboarding'ga yo'naltiruvchi hech qanday kod yo'q edi. Natijada yangi
// foydalanuvchi to'g'ridan-to'g'ri Bosh sahifaga tushib, "kampaniya yo'q" bo'sh holatini
// ko'rardi - rolni tanlash/profil to'ldirish qadami butunlay ko'rinmas edi.
function useAppBootstrap() {
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const hasTelegram = Boolean(getTelegramWebApp()?.initData);
    const hasWebSession = WEB_LOGIN_ENABLED && Boolean(getWebToken());

    if (!hasTelegram && !hasWebSession) {
      if (WEB_LOGIN_ENABLED && !NO_AUTH_REQUIRED_PATHS.includes(location.pathname)) {
        navigate('/login', { replace: true });
      }
      // WEB_LOGIN_ENABLED=false bo'lganda: Telegram tashqarisida (401) yoki tarmoq
      // xatosi - hech narsa bloklanmaydi, ilova odatdagidek (ommaviy ko'rish rejimida) ochiladi.
      setChecked(true);
      return undefined;
    }

    apiClient
      .get<MeProfileCheck>('/users/me')
      .then((me) => {
        if (cancelled) return;
        const hasProfile = Boolean(me.creatorProfile || me.businessProfile);
        if (!hasProfile && location.pathname !== '/onboarding') {
          navigate('/onboarding', { replace: true });
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (WEB_LOGIN_ENABLED && hasWebSession && !hasTelegram) {
          clearWebToken();
          navigate('/login', { replace: true });
        }
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return checked;
}

function SplashScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-canvas">
      <div className="h-12 w-12 rounded-2xl bg-accent-500 shadow-pop flex items-center justify-center text-white animate-pulse">
        <Sparkles size={22} />
      </div>
      <p className="text-sm font-semibold text-ink-400">InfluenceX</p>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  // 2026-07-15 (Collabstr tahlili - "hozirgi holat eski ko'rinadi" muammosi tuzatildi):
  // "/" manzili avval HAR DOIM Home.tsx (kreator kampaniya lentasi)ni ko'rsatardi - bu
  // Telegram ICHIDA to'g'ri, lekin ilova oddiy brauzer havolasi sifatida (Telegram
  // konteksti YO'Q) ochilganda mazmunsiz edi: Home.tsx autentifikatsiya so'raydigan
  // /campaigns'ga tayanadi, WEB_LOGIN_ENABLED=false bo'lgani uchun bo'sh/eski ko'rinardi.
  // Endi: Telegram konteksti bo'lmasa, "/" ANIQ Collabstr uslubidagi ommaviy kreator
  // vitrinasini (BrowseCreators - hech qanday login talab qilmaydi, GET /creators
  // ommaviy) ko'rsatadi - aynan shu havolani brauzerda ochganda ko'rinadigan narsa.
  const hasTelegramContext = Boolean(getTelegramWebApp()?.initData);
  const hideNav = location.pathname === '/onboarding' || location.pathname === '/login' || !hasTelegramContext;
  const checked = useAppBootstrap();

  if (!checked) {
    return <SplashScreen />;
  }

  return (
    <div className="h-full flex flex-col bg-canvas">
      <main className="flex-1 overflow-y-auto w-full max-w-lg mx-auto">
        <Routes>
          <Route path="/" element={hasTelegramContext ? <Home /> : <BrowseCreators />} />
          <Route path="/campaigns/new" element={<CreateCampaign />} />
          <Route path="/campaigns/mine" element={<MyCampaigns />} />
          <Route path="/products" element={<Products />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/campaigns/:id/applicants" element={<CampaignApplicants />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/chat" element={<ChatList />} />
          <Route path="/chat/:threadId" element={<ChatThread />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/earnings" element={<Earnings />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/analytics/creator" element={<CreatorAnalytics />} />
          <Route path="/analytics/business" element={<BusinessAnalytics />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<WebLogin />} />
          <Route path="/creators" element={<BrowseCreators />} />
          <Route path="/creators/:id" element={<CreatorProfile />} />
        </Routes>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
