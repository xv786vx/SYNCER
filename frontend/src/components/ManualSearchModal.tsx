import { motion } from 'framer-motion';
import { useState } from 'react';
import { ManualSearchResult, ManualSearchModalProps } from '../types';
import { LoadingSpinner } from './LoadingSpinner';


export function ManualSearchModal({
  song,
  onClose,
  onSelectSong,
  manualSearchApi,
  userId,
}: ManualSearchModalProps) {
  const [query, setQuery] = useState(song?.name || '');
  const [artist, setArtist] = useState(song?.artist || '');
  const [results, setResults] = useState<ManualSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!song) return null;

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const searchResults = await manualSearchApi(query, artist, userId);
      setResults(searchResults);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: ManualSearchResult) => {
    onSelectSong(song, result);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center font-cascadia"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-neutral-900 text-white p-4 rounded-lg shadow-xl w-80 mx-4 h-[90%] flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex-shrink-0">
          <h3 className="text-xl font-semibold mb-2 text-center">Manual Search</h3>
          <p className="text-center text-gray-400 mb-1 text-sm truncate whitespace-nowrap overflow-hidden">
            Searching for: <span className="font-bold text-brand-green">{song.name}</span>
          </p>
          <p className="text-center text-gray-400 mb-3 text-xs truncate whitespace-nowrap overflow-hidden">
            by <span className="font-bold text-brand-green">{song.artist}</span>
          </p>
          
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Song title..."
              className="bg-transparent border-0 border-b-2 border-brand-green-dark focus:border-brand-green focus:outline-none text-white placeholder-gray-400 px-0 py-1.5 w-full text-sm"
            />
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist name..."
              className="bg-transparent border-0 border-b-2 border-brand-green-dark focus:border-brand-green focus:outline-none text-white placeholder-gray-400 px-0 py-1.5 w-full text-sm"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-brand-green-dark hover:bg-brand-green text-white font-bold py-1.5 px-4 rounded transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size={18} /> : 'Search'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-center mt-2 text-sm">{error}</p>}

        <div className="mt-4 flex-grow overflow-y-auto hide-scrollbar pr-2">
          {results.map((result) => (
            <div
              key={result.yt_id || result.sp_id}
              className="flex items-center gap-4 p-2 rounded-lg hover:bg-neutral-800 cursor-pointer"
              onClick={() => handleSelect(result)}
            >
              <img src={result.thumbnail} alt={result.title} className="w-12 h-12 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{result.title}</p>
                <p className="text-sm text-gray-400 truncate">{result.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
} 