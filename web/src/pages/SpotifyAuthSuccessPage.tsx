function SpotifyAuthSuccessPage() {
    return (
      <div className="flex-1 w-full h-full bg-black text-white flex flex-col items-center justify-center font-cascadia">
        <h1 className="text-4xl font-bold mb-4">Spotify Auth Success</h1>
        <p className="text-lg">You have successfully authenticated with Spotify. You can now close this window and open the Chrome extension!</p>
      </div>
    );
  }
  
  export default SpotifyAuthSuccessPage;
  