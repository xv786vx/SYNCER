import { useState } from 'react';
import { FaSpotify } from 'react-icons/fa';
import { APIErrorHandler } from '../utils/errorHandling';

interface SyncYtToSpProps {
  onSync: (playlistName: string, userId: string) => Promise<void>;
  userId: string;
  quotaExceeded: boolean;
  quota: { total: number; limit: number } | null;
  countdown: number;
  formatMs: (ms: number) => string;
  isReadyToSync: boolean | null;
}

export function SyncYtToSp({ onSync, userId, quotaExceeded, quota, countdown, formatMs, isReadyToSync }: SyncYtToSpProps) {
  const [ytPlaylist, setYtPlaylist] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  const handleSync = async () => {
    if (!ytPlaylist.trim()) {
      APIErrorHandler.handleError(new Error('Please enter a playlist name'));
      return;
    }
    
    try {
      setIsCheckingAuth(true);
      console.log('Syncing Youtube playlist:', ytPlaylist);
      await onSync(ytPlaylist, userId);
      setYtPlaylist('');
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
        <p className="text-md text-center">Enter the name of your YouTube playlist below!</p>
        <input
          type="text"
          value={ytPlaylist}
          onChange={(e) => setYtPlaylist(e.target.value)}
          placeholder="Playlist Name..."
          className="bg-transparent border-0 border-b-2 border-brand-red-dark focus:border-brand-red focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
          disabled={isCheckingAuth || !isReadyToSync || quotaExceeded}
        />
        <button
          onClick={handleSync}
          className="w-full py-2 bg-brand-green-dark text-white rounded-md hover:bg-brand-green focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isCheckingAuth || !isReadyToSync || quotaExceeded}
        >
          {isCheckingAuth ? 'Checking Auth...' : quotaExceeded ? 'Quota Exceeded' : <>Sync to <FaSpotify className="inline-block align-middle ml-1" /></>}
        </button>
        {!isReadyToSync && (
          <p className="text-xs text-center text-yellow-400">Please authenticate with both Spotify and YouTube first.</p>
        )}
        {quotaExceeded && quota && (
          <div className="text-center text-xs text-red-400">
            <p>You have exceeded your daily YouTube API quota.</p>
            <p>Quota resets in: {formatMs(countdown)}</p>
            <p>({quota.total} / {quota.limit})</p>
          </div>
        )}
      </div>
    </div>
  );
}