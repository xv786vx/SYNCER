import Dither from '../components/Dither';

export default function MarqueePromo() {
  return (
    <div
      className="relative flex items-center justify-center w-[440px] h-[280px] overflow-hidden rounded-2xl shadow-xl"
      style={{ minWidth: 440, minHeight: 280 }}
    >
      {/* Dither background */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <Dither />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center px-2">
        <h1 className="font-cascadia font-bold text-4xl text-brand-gray-1 mb-2 drop-shadow-lg tracking-tight">syncer</h1>
        <p className="font-cascadia font-normal text-base text-brand-gray-1 mb-1 drop-shadow-md">
          Sync your <span className="text-brand-green-dark">Spotify</span> & <span className="text-brand-red-dark">YouTube</span> playlists
        </p>
        <p className="font-cascadia text-xs text-brand-gray-2 mb-4">
          Powered by React, FastAPI, Celery, and Tailwind CSS
        </p>
        <a
          href="https://chrome.google.com/webstore/category/extensions"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block underline text-brand-green font-cascadia font-bold text-lg py-2 px-6 rounded-lg shadow-md transition-colors hover:text-brand-gray-1"
        >
          Add to Chrome
        </a>
      </div>
      {/* Subtle logo in the background */}
      <img
        src="/iconweb128.png"
        alt="Syncer Logo"
        className="absolute right-4 bottom-3 w-12 h-12 opacity-15 pointer-events-none z-0"
        style={{ filter: 'drop-shadow(0 2px 8px #0008)' }}
      />
    </div>
  );
}
