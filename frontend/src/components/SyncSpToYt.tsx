import { useState } from 'react';
import { SiYoutube } from 'react-icons/si';
import { APIErrorHandler } from '../utils/errorHandling';

interface SyncSpToYtProps {
  onSync: (playlistName: string, userId: string) => Promise<void>;
  userId: string;
}

export function SyncSpToYt({ onSync, userId }: SyncSpToYtProps) {
  const [spPlaylist, setSpPlaylist] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  const handleSync = async () => {
    if (!spPlaylist.trim()) {
      APIErrorHandler.handleError(new Error('Please enter a playlist name'));
      return;
    }
    
    try {
      setIsCheckingAuth(true);
      console.log('Syncing Spotify playlist:', spPlaylist);
      await onSync(spPlaylist, userId);
      setSpPlaylist('');
    } catch (error) {
      console.error('Error during sync:', error);
      APIErrorHandler.handleError(error as Error, 'Failed to sync playlist');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-10">
      <div className="flex flex-col gap-6 w-40 mx-auto font-cascadia">
        <p className="text-md text-center">Enter the name of your Spotify playlist below!</p>
        <input
          type="text"
          value={spPlaylist}
          onChange={(e) => setSpPlaylist(e.target.value)}
          placeholder="Playlist Name..."
          className="bg-transparent border-0 border-b-2 border-brand-green-dark focus:border-brand-green focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
          disabled={isCheckingAuth}
        />
        <button
          onClick={handleSync}
          className="w-full py-2 bg-brand-red-dark text-white rounded-md hover:bg-brand-red focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isCheckingAuth}
        >
          {isCheckingAuth ? 'Checking Auth...' : <>Sync to <SiYoutube className="inline-block align-text-bottom ml-0.5" /></>}
        </button>
      </div>
    </div>
  );
}