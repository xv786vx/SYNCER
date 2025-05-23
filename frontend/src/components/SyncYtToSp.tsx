import { useState } from 'react';
import { FaSpotify } from 'react-icons/fa';
import { APIErrorHandler } from '../utils/errorHandling';

interface SyncYtToSpProps {
  onSync: (playlistName: string) => Promise<void>;
}

export function SyncYtToSp({ onSync }: SyncYtToSpProps) {
  const [ytPlaylist, setYtPlaylist] = useState('');

  const handleSync = async () => {
    if (!ytPlaylist.trim()) {
      APIErrorHandler.handleError(new Error('Please enter a playlist name'));
      return;
    }
    await onSync(ytPlaylist);
    setYtPlaylist('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6 w-40 mx-auto">
        <p className="text-md text-center">Enter the name of your YouTube playlist below!</p>
        <input
          type="text"
          value={ytPlaylist}
          onChange={(e) => setYtPlaylist(e.target.value)}
          placeholder="..."
          className="bg-transparent border-0 border-b-2 border-red-700 focus:border-red-600 focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
        />
        <button
          onClick={handleSync}
          className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          Sync to <FaSpotify className="inline-block align-middle ml-1" />
        </button>
      </div>
    </div>
  );
} 