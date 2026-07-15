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

// 2026-07-14 (chuqur tahlil natijasida topilgan bo'shliq): Telegram /start -> "Ilovani
// ochish" -> TelegramAuthGuard birinchi so'rovda avtomatik User yozuvini yaratadi (rol
// standart CREATOR, lekin creatorProfile/businessProfile HALI yo'q) - lekin frontend'da
// buni tekshirib /onboarding'ga yo'naltiruvchi hech qanday kod yo'q edi. Natijada yangi
// foydalanuvchi to'g'ridan-to'g'ri Bosh sahifaga tushib, "kampaniya yo'q" bo'sh holatini
// ko'rardi - rolni tanlash/profil to'ldirish qadami butunlay ko'rinmas edi.
//
// 2026-07-15 (standalone veb-sayt so'rovi) kengaytirildi: endi ilova Telegram
// TASHQARISIDA ham ochilishi mumkin (oddiy mobil brauzer). Bu holatda Telegram initData
// yo'q - avval bu holatda ilova "401 - hech narsa bloklanmaydi" tarzida jim ochilardi
// (creator/business sifatida hech qanday amal bajarib bo'lmasdi). Endi: initData ham,
// saqlangan veb-sessiya (telefon+OTP orqali olingan JWT) ham yo'q bo'lsa - /login'ga
// yo'naltiriladi. Ikkalasidan biri bo'lsa, odatdagidek onboarding-tekshiruvi davom etadi.
function useAppBootstrap() {
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const hasTelegram = Boolean(getTelegramWebApp()?.initData);
    const hasWebSession = Boolean(getWebToken());

    if (!hasTelegram && !hasWebSession) {
      if (!NO_AUTH_REQUIRED_PATHS.includes(location.pathname)) {
        navigate('/login', { replace: true });
      }
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
        // Veb-sessiya (JWT) orqali bo'lib, so'rov 401 bilan tugasa - token eskirgan/yaroqsiz,
        // uni tozalab qayta kirish sahifasiga yo'naltiramiz. Telegram orqali bo'lsa (initData
        // doim qayta tasdiqlanadi, TelegramAuthGuard avtomatik User yaratadi) bu deyarli hech
        // qachon sodir bo'lmaydi - shu sabab hech narsa bloklamaymiz (eski xulq saqlanadi).
        if (hasWebSession && !hasTelegram) {
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
  const hideNav = location.pathname === '/onboarding' || location.pathname === '/login';
  const checked = useAppBootstrap();

  if (!checked) {
    return <SplashScreen />;
  }

  return (
    <div className="h-full flex flex-col bg-canvas">
      <main className="flex-1 overflow-y-auto w-full max-w-lg mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />
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
