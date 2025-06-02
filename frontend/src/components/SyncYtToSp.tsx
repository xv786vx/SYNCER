import { useState } from 'react';
import { FaSpotify } from 'react-icons/fa';
import { APIErrorHandler } from '../utils/errorHandling';

interface SyncYtToSpProps {
  onSync: (playlistName: string, userId: string) => Promise<void>;
  userId: string;
}

export function SyncYtToSp({ onSync, userId }: SyncYtToSpProps) {
  const [ytPlaylist, setYtPlaylist] = useState('');

  const handleSync = async () => {
    if (!ytPlaylist.trim()) {
      APIErrorHandler.handleError(new Error('Please enter a playlist name'));
      return;
    }
    await onSync(ytPlaylist, userId);
    setYtPlaylist('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6 w-40 mx-auto font-cascadia">
        <p className="text-md text-center">Enter the name of your YouTube playlist below!</p>
        <input
          type="text"
          value={ytPlaylist}
          onChange={(e) => setYtPlaylist(e.target.value)}
          placeholder="Playlist Name..."
          className="bg-transparent border-0 border-b-2 border-brand-red-dark focus:border-brand-red focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
        />
        <button
          onClick={handleSync}
          className="w-full py-2 bg-brand-green-dark text-white rounded-md hover:bg-brand-green focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          Sync to <FaSpotify className="inline-block align-middle ml-1" />
        </button>
      </div>
    </div>
  );
}