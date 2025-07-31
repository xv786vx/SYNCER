import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

function Home() {
  return (
    <div className="flex-1 w-full text-white relative">
      {/* Hero Section */}
      <section id="hero" className="min-h-screen flex flex-col items-center justify-center px-6 relative z-10 pt-12">
        <motion.div
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <motion.h1 className="text-8xl md:text-9xl font-cascadia font-bold text-white mb-8">
            {'syncer'.split('').map((letter, index) => (
              <motion.span
                key={index}
                className="inline-block"
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 }}
              >
                {letter}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            className="text-3xl md:text-2xl text-brand-gray-2 mb-12 font-cascadia font-light leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            Effortlessly sync your Spotify and YouTube playlists.
            <br />
            <span className="text-brand-green">Fast, private, and open source.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            <div className="flex flex-row gap-x-4 justify-center">
              {/* Chrome Store Button */}
              <a
                href="https://chromewebstore.google.com/detail/syncer/ggkbmppglbhmcoiplbopfldojdnehabh?authuser=0&hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-brand-accent-1 hover:bg-brand-accent-2 text-white hover:text-[#FFCD46] font-bold py-4 font-cascadia rounded-lg text-xl transition-all duration-300 hover:scale-105 w-[320px] h-[64px]"
                style={{ minWidth: 0 }}
              >
                {/* Monochrome Chrome SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-chrome-icon lucide-chrome mr-3"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" x2="12" y1="8" y2="8"/><line x1="3.95" x2="8.54" y1="6.06" y2="14"/><line x1="10.88" x2="15.46" y1="21.94" y2="14"/></svg>
                View on Chrome Store
              </a>
              {/* GitHub Button */}
              <a
                href="https://github.com/xv786vx/SYNCER"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-brand-accent-1 hover:bg-brand-accent-2 text-white hover:text-[#4078c0] font-bold py-4 font-cascadia rounded-lg text-xl transition-all duration-300 hover:scale-105 w-[320px] h-[64px]"
                style={{ minWidth: 0 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-github-icon lucide-github mr-3"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                View on GitHub
              </a>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Interactive Section */}
      <InteractiveSection />

      {/* Questions Section */}
      <section id="questions" className="min-h-screen flex flex-col items-center justify-center px-6 relative z-10 pt-12">
        <motion.div className="text-center max-w-4xl mx-auto" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
          <h2 className="text-5xl md:text-6xl font-cascadia font-bold text-white mb-8">Questions?</h2>
          <p className="text-xl text-brand-gray-2 mb-12 font-cascadia font-light">
            We're here to help! Reach out through any of these channels.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <motion.a href="https://github.com/xv786vx/SYNCER/issues" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-64 h-16 bg-brand-green hover:bg-brand-green-dark hover:text-green-100 hover:font-medium text-white font-cascadia rounded-lg text-lg transition-all duration-300 hover:scale-105" whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="w-5 h-5 mr-3 lucide lucide-github-icon lucide-github"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg> GitHub Issues
            </motion.a>
            <motion.a href="mailto:firas.aj76@gmail.com" className="inline-flex items-center justify-center w-64 h-16 bg-brand-red hover:bg-brand-red-dark hover:text-red-100 hover:font-medium text-white font-cascadia rounded-lg text-lg transition-all duration-300 hover:scale-105" whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="w-5 h-5 mr-3 lucide lucide-mail-icon lucide-mail"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg> Email
            </motion.a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

function InteractiveSection() {
  const lastScrollY = useRef(0);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [isInInteractiveMode, setIsInInteractiveMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const allPoints = [
    { type: "how", title: "Connect Your Accounts", description: "Securely link your Spotify and YouTube accounts through our Chrome extension using OAuth 2.0." },
    { type: "how", title: "Smart Song Matching", description: "Our fuzzy matching algorithm preprocesses and compares song titles and artists to find the best cross-platform match, accounting for variations in metadata." },
    { type: "how", title: "Bidirectional Sync", description: "Transfer playlists from Spotify to YouTube or vice versa. Your music follows you across platforms." },
    { type: "tech", title: "API Integration", description: "We integrate with Spotify Web API and YouTube Data API v3, respecting rate limits and usage quotas to ensure reliable service." },
    { type: "tech", title: "Rate Limiting", description: "Smart request batching ensure we never hit API limits, providing consistent performance for all users." },
    { type: "tech", title: "Privacy First", description: "All processing happens locally in your browser. We never store your playlist data or personal information on our servers, only authentication tokens." },
    { type: "tech", title: "Current Limitations", description: "Some songs may not be available across platforms due to licensing. We are improving our algorithms to overcome any issues!" }
  ];

  const enterInteractiveMode = (startIndex: number) => {
    setIsTransitioning(true);
    setCurrentPointIndex(startIndex);
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      document.getElementById('interactive')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        setIsInInteractiveMode(true);
        setIsTransitioning(false);
      }, 800);
    }, 100);
  };

  const exitToSection = (sectionId: string) => {
    setIsTransitioning(true);
    setIsInInteractiveMode(false);

    setTimeout(() => {
      document.body.style.overflow = '';
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => setIsTransitioning(false), 800);
    }, 100);
  };

  useEffect(() => {
    const heroEl = document.getElementById('hero');
    const questionsEl = document.getElementById('questions');

    const handleWheel = (e: WheelEvent) => {
      if (isInInteractiveMode && !isTransitioning) {
        e.preventDefault();
        e.stopPropagation();

        if (e.deltaY > 0) {
          if (currentPointIndex < allPoints.length - 1) setCurrentPointIndex(i => i + 1);
          else exitToSection('questions');
        } else {
          if (currentPointIndex > 0) setCurrentPointIndex(i => i - 1);
          else exitToSection('hero');
        }
      }
    };

    const handleScroll = () => {
      if (isInInteractiveMode || isTransitioning) return;

      const currentY = window.scrollY;
      const isScrollingDown = currentY > lastScrollY.current;
      lastScrollY.current = currentY;

      const heroRect = heroEl?.getBoundingClientRect();
      const questionsOffset = questionsEl?.offsetTop ?? document.body.scrollHeight;

      // Immediately enter interactive when any scroll down past the hero's bottom
      if (isScrollingDown && heroRect && heroRect.bottom < window.innerHeight) {
        enterInteractiveMode(0);
      }
      // Scroll-up so questions section crosses midpoint
      else if (!isScrollingDown && currentY > questionsOffset - window.innerHeight / 2) {
        enterInteractiveMode(allPoints.length - 1);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('wheel', handleWheel);
      document.body.style.overflow = '';
    };
  }, [isInInteractiveMode, isTransitioning, currentPointIndex, allPoints.length]);

  const currentPoint = allPoints[currentPointIndex];

  return (
    <section id="interactive" className="min-h-screen flex flex-col justify-center px-6 relative z-10 pb-16 pt-28">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <motion.h2
          className="text-5xl md:text-6xl font-cascadia font-bold text-white mb-6"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          How it works
        </motion.h2>
      </div>

      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
        <div className="relative">
          <div className="aspect-square overflow-hidden rounded-2xl shadow-2xl">
            <video 
              src="/syncer new promo vid.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover object-left md:object-center lg:object-right" 
              style={{ objectPosition: '61.6% center' }}
            />
          </div>
        </div>
        <div className="relative h-full flex items-center">
          <motion.div
            key={currentPointIndex}
            initial={{ opacity: 0, x: 50, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -50, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="w-full"
          >
            <div className="border-l-4 border-brand-green pl-8">
              <h3 className="text-3xl font-cascadia text-white mb-4">{currentPoint.title}</h3>
              <p className="text-brand-gray-2 text-xl leading-relaxed font-cascadia font-light">{currentPoint.description}</p>
            </div>
            <div className="mt-8 flex space-x-2">
              {allPoints.map((_, idx) => (
                <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentPointIndex ? 'bg-brand-accent-1 w-8' : 'bg-brand-gray-3 w-2'}`} />
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-sm text-brand-gray-2 font-cascadia font-light">{currentPointIndex + 1} of {allPoints.length}</div>
              {(isInInteractiveMode || isTransitioning) && (
                <div className="text-xs text-brand-gray-3 font-cascadia font-light">
                  {isTransitioning ? 'Transitioning...' :
                    currentPointIndex === 0 ? 'Scroll up to return to top, or down for next point' :
                    currentPointIndex === allPoints.length - 1 ? 'Scroll down to continue to questions, or up for previous point' : 'Scroll to navigate between points'
                  }
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default Home;
