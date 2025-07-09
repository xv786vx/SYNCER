import { Routes, Route, Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax transform for dither background - reduced range to prevent black bar
  const ditherY = useTransform(scrollYProgress, [0, 1], ["0%", "0%"]);

  return (
    <div ref={containerRef} className="min-h-screen w-full bg-black flex flex-col relative">
      {/* Parallax Dither background - global */}
      <motion.div 
        className="fixed inset-0 z-0 w-full h-full"
        style={{ y: ditherY }}
      >
        <Dither />
      </motion.div>
      
      <nav className="fixed top-0 left-0 w-full flex justify-center items-center py-6 text-xl font-cascadia z-50 bg-black/80 backdrop-blur-sm">
        <Link to="/" className="text-brand-gray-2 hover:text-brand-gray-1 transition-colors">Home</Link>
        <span className="mx-3 text-brand-accent-3">|</span>
        <Link to="/privacy-policy" className="text-brand-green-dark hover:text-brand-green transition-colors">Privacy Policy</Link>
        <span className="mx-3 text-brand-accent-3">|</span>
        <Link to="/terms-of-service" className="text-brand-red-dark hover:text-brand-red transition-colors">Terms of Service</Link>
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
