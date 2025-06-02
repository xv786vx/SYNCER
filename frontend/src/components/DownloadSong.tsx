import { useState } from 'react';
import { SiYoutube } from 'react-icons/si';
import { APIErrorHandler } from '../utils/errorHandling';

interface DownloadSongProps {
  onDownload: (songTitle: string, artistNames: string, userId: string) => Promise<void>;
}

export function DownloadSong({ onDownload, userId }: DownloadSongProps & { userId: string }) {
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');

  const handleDownload = async () => {
    if (!songTitle.trim()) {
      APIErrorHandler.handleError(new Error('Please enter a song title'));
      return;
    }
    await onDownload(songTitle, artistName, userId);
    setSongTitle('');
    setArtistName('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6 w-40 mx-auto">
        <p className="text-md text-center">Enter the name of the YouTube song you want to download!</p>
        <input
          type="text"
          value={songTitle}
          onChange={(e) => setSongTitle(e.target.value)}
          placeholder="Song title..."
          className="bg-transparent border-0 border-b-2 border-red-700 focus:border-red-600 focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
        />
        <input
          type="text"
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          placeholder="Artist name(s)..."
          className="bg-transparent border-0 border-b-2 border-red-700 focus:border-red-600 focus:outline-none text-white placeholder-gray-400 px-0 py-2 w-full"
        />
        <button
          onClick={handleDownload}
          className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Download <SiYoutube className="inline-block align-middle ml-1" />
        </button>
      </div>
    </div>
  );
}