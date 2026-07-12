import { Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
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

export default function App() {
  const location = useLocation();
  const hideNav = location.pathname === '/onboarding';

  return (
    <div className="h-full flex flex-col">
      <main className="flex-1 overflow-y-auto">
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
        </Routes>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
