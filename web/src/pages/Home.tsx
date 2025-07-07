function Home() {
  return (
    <div className="flex-1 w-full h-full text-white flex flex-col relative min-h-screen">

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 relative text-center">
        <div className="w-full max-w-4xl mx-auto">
          <h1 className="text-7xl font-cascadia font-bold text-white mb-6">syncer</h1>
          <p className="text-lg text-brand-gray-2 max-w-xl text-center mb-8 font-cascadia mx-auto">
            Effortlessly sync your Spotify and YouTube playlists. Fast, private, and open source. Contact us at <a href="mailto:firas.aj76@gmail.com" className="underline text-brand-green-dark hover:text-brand-green">firas.aj76@gmail.com</a>.
          </p>
          
          <video
            src="/syncer new promo vid.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full max-w-2xl h-96 object-contain rounded-lg mb-8 mx-auto block"
          >
            Your browser does not support the video tag.
          </video>

          <div className="text-center">
            <a 
              href="https://chrome.google.com/webstore/category/extensions" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-brand-accent-1 hover:bg-brand-accent-2 text-brand-gray-2 hover:text-brand-gray-1 font-bold py-3 px-6 font-cascadia rounded-lg text-xl transition-colors inline-block"
            >
              Add to Chrome
            </a>
          </div>
        </div>
      </div>

      {/* Simple test div container */}
      <div className="w-full bg-gray-800 p-6 text-center">
        <h2 className="text-2xl font-cascadia text-white mb-4">Test Section</h2>
        <p className="text-brand-gray-2">This is a simple test container to check for horizontal scroll issues.</p>
      </div>
    </div>
  );
}

export default Home;
