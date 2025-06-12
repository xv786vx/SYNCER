import { useState } from 'react';
import { APIErrorHandler } from '../utils/errorHandling';

interface MergePlaylistsProps {
  onMerge: (ytPlaylist: string, spPlaylist: string, mergeName: string, userId: string) => Promise<void>;
  userId: string;
  ensureYoutubeAuth: () => Promise<void>;
}

export function MergePlaylists({ onMerge, userId, ensureYoutubeAuth }: MergePlaylistsProps) {
  const [mergeYtPlaylist, setMergeYtPlaylist] = useState('');
  const [mergeSpPlaylist, setMergeSpPlaylist] = useState('');
  const [mergeName, setMergeName] = useState('');

  const handleMerge = async () => {
    if (!mergeYtPlaylist.trim() || !mergeSpPlaylist.trim()) {
      APIErrorHandler.handleError(new Error('Please enter both playlist names'));
      return;
    }
    await ensureYoutubeAuth();
    await onMerge(mergeYtPlaylist, mergeSpPlaylist, mergeName, userId);
    setMergeYtPlaylist('');
    setMergeSpPlaylist('');
    setMergeName('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 w-40 mx-auto font-cascadia">
        <p className="text-md text-center text-sm">Enter the names of the Spotify and YouTube playlists you want to merge!</p>
        <input
          type="text"
          value={mergeYtPlaylist}
          onChange={(e) => setMergeYtPlaylist(e.target.value)}
          placeholder="YouTube Playlist name..."
          className="text-xs bg-transparent border-0 border-b-2 border-brand-red-dark focus:border-brand-red focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
        />
        <input
          type="text"
          value={mergeSpPlaylist}
          onChange={(e) => setMergeSpPlaylist(e.target.value)}
          placeholder="Spotify Playlist name..."
          className="text-xs bg-transparent border-0 border-b-2 border-brand-green-dark focus:border-brand-green focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
        />
        <input
          type="text"
          value={mergeName}
          onChange={(e) => setMergeName(e.target.value)}
          placeholder="Merged Playlist name..."
          className="text-xs bg-transparent border-0 border-b-2 border-brand-yellow-dark focus:border-brand-yellow focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
        />
        <button
          onClick={handleMerge}
          className="text-md w-full py-2 mt-6 bg-brand-yellow-dark text-white rounded-md hover:bg-brand-yellow focus:outline-none focus:ring-2 focus:ring-white"
        >
          Merge Playlists
        </button>
      </div>
    </div>
  );
}