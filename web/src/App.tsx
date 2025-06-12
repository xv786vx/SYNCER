import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import YoutubeAuthSuccessPage from './pages/YoutubeAuthSuccessPage';
import './App.css'
import './index.css'

function App() {
  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <Router>
        <nav className="w-full flex justify-center items-center py-6 text-xl font-cascadia">
          <Link to="/" className="text-blue-400 hover:text-blue-200">Home</Link>
          <span className="mx-3 text-neutral-700">|</span>
          <Link to="/privacy-policy" className="text-green-400 hover:text-green-200">Privacy Policy</Link>
          <span className="mx-3 text-neutral-700">|</span>
          <Link to="/terms-of-service" className="text-pink-400 hover:text-pink-200">Terms of Service</Link>
        </nav>
        <div className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/youtube-auth-success" element={<YoutubeAuthSuccessPage />} />
            {/* Add more routes as needed */}
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;
