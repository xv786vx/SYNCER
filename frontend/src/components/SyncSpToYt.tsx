import { useState } from 'react';
import { SiYoutube } from 'react-icons/si';
import { APIErrorHandler } from '../utils/errorHandling';

interface SyncSpToYtProps {
  onSync: (playlistName: string) => Promise<void>;
}

export function SyncSpToYt({ onSync }: SyncSpToYtProps) {
  const [spPlaylist, setSpPlaylist] = useState('');

  const handleSync = async () => {
    if (!spPlaylist.trim()) {
      APIErrorHandler.handleError(new Error('Please enter a playlist name'));
      return;
    }
    await onSync(spPlaylist);
    setSpPlaylist('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6 w-40 mx-auto">
        <p className="text-md text-center">Enter the name of your Spotify playlist below!</p>
        <input
          type="text"
          value={spPlaylist}
          onChange={(e) => setSpPlaylist(e.target.value)}
          placeholder="..."
          className="bg-transparent border-0 border-b-2 border-green-600 focus:border-green-500 focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
        />
        <button
          onClick={handleSync}
          className="w-full py-2 bg-red-700 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Sync to <SiYoutube className="inline-block align-text-bottom ml-0.5" />
        </button>
      </div>
    </div>
  );
} 