import { SongStatus } from '../types.ts';

interface SongSyncStatusProps {
  songs: SongStatus[];
  onManualSearch: (song: SongStatus, idx: number) => Promise<void>;
  onSkip: (song: SongStatus, idx: number) => void;
  onFinalize: () => Promise<void>;
}

export function SongSyncStatus({ songs, onManualSearch, onSkip, onFinalize }: SongSyncStatusProps) {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
      <div className="w-full max-w-[400px] p-6 bg-neutral-900 rounded-lg shadow-lg font-cascadia">
        <h3 className="text-lg font-semibold mb-4 text-center">Song Sync Status</h3>

        <div className="flex-1 overflow-y-auto max-h-[200px] mb-2 pr-1">


        <ul>
          {songs.map((song, idx) => (
            <li key={idx} className="flex items-center gap-2 mb-1">
              <span>{song.name} by {song.artist}</span>
              {song.status === 'found' && <span className="text-green-400">✔️</span>}
              {song.status === 'not_found' && <span className="text-red-400">❌</span>}
              {song.status === 'skipped' && <span className="text-gray-400">⏭️</span>}
              {song.requires_manual_search && (
                <>
                  <button
                    className="ml-2 px-2 py-1 bg-blue-600 text-xs rounded"
                    onClick={() => onManualSearch(song, idx)}
                    >
                    Manual Search
                  </button>
                  <button
                    className="ml-1 px-2 py-1 bg-gray-600 text-xs rounded"
                    onClick={() => onSkip(song, idx)}
                    >
                    Skip
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        </div>
        <button
          className="mt-4 px-4 py-2 bg-green-700 rounded"
          disabled={songs.some(s => s.status === 'not_found' && !s.requires_manual_search)}
          onClick={onFinalize}
        >
          Finalize Sync
        </button>
      </div>
    </div>
  );
} 