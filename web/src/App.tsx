import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import YoutubeAuthSuccessPage from './pages/YoutubeAuthSuccessPage';
import SpotifyAuthSuccessPage from './pages/SpotifyAuthSuccessPage';
import Dither from './components/Dither';
import MarqueePromo from './pages/MarqueePromo';
import './App.css'
import './index.css'

function App() {
  return (
    <div className="min-h-screen w-screen bg-black flex flex-col relative overflow-hidden">
      {/* Dither background - global */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <Dither />
      </div>
      <nav className="w-full flex justify-center items-center py-6 text-xl font-cascadia relative z-10 bg-black">
        <Link to="/" className="text-brand-gray-2 hover:text-brand-gray-1">Home</Link>
        <span className="mx-3 text-brand-accent-3">|</span>
        <Link to="/privacy-policy" className="text-brand-green-dark hover:text-brand-green">Privacy Policy</Link>
        <span className="mx-3 text-brand-accent-3">|</span>
        <Link to="/terms-of-service" className="text-brand-red-dark hover:text-brand-red">Terms of Service</Link>
      </nav>
      {/* Main content above dither */}
      <div className="flex-1 flex flex-col relative z-10 min-h-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/youtube-auth-success" element={<YoutubeAuthSuccessPage />} />
          <Route path="/spotify-auth-success" element={<SpotifyAuthSuccessPage />} />
          <Route path="/marquee-promo" element={<MarqueePromo />} />
          {/* Add more routes as needed */}
        </Routes>
      </div>
    </div>
  );
}

export default App;
