import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { SongStatus } from '../types.ts';
import { LoadingSpinner } from './LoadingSpinner';
import '../index.css';

interface SongWithCover extends SongStatus {
  coverUrl?: string;
}

interface SongSyncStatusProps {
  songs?: SongWithCover[];
  onManualSearch?: (song: SongWithCover, idx: number) => void;
  onSkip?: (song: SongWithCover, idx: number) => void;
  onFinalize: () => Promise<void>;
  finalizing: boolean;
}

export function SongSyncStatus({
  songs = [],
  onManualSearch,
  onSkip,
  onFinalize,
  finalizing,
}: SongSyncStatusProps) {
  const [focusedIdx, setFocusedIdx] = useState(0);
  const itemHeight = 112; // Increased item height for more breathing room
  const containerHeight = itemHeight * 2; // Show 2.5 items to hint at scrollability
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to the focused item on mount or when songs or focusedIdx change
  useEffect(() => {
    if (listRef.current && songs.length > 0) {
      listRef.current.scrollTop = Math.max(0, focusedIdx * 72 - 72 * 2);
    }
  }, [songs, focusedIdx]);

  // Scroll to select: each scroll motion moves to next/previous song, but panel does not scroll
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY > 0) {
      setFocusedIdx(idx => Math.min(songs.length - 1, idx + 1));
    } else if (e.deltaY < 0) {
      setFocusedIdx(idx => Math.max(0, idx - 1));
    }
  };

  if (!Array.isArray(songs) || songs.length === 0) {
    return null;
  }

  const handleFinalizeClick = async () => {
    // Parent component (`App.tsx`) will now handle setting this state.
    // setFinalizing(true);
    await onFinalize();
  };
  
  const focusedSong = songs[focusedIdx];
  const showNotFoundActionButtons = focusedSong?.status === 'not_found';
  const showFoundActionButtons = focusedSong?.status === 'found';

  return (
    <div className="absolute z-50 bg-black bg-opacity-85 top-0 left-0 w-[360px] h-[360px] flex items-center justify-center">
      <div className="mx-auto max-w-[300px] p-4 rounded-lg shadow-lg font-cascadia flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-2 text-center">Song Sync Status</h3>
        <AnimatePresence mode="wait">
          {finalizing ? (
            <motion.div
              key="finalizing-spinner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center h-32 w-full"
            >
              <LoadingSpinner size={36} color="#fff" />
              <div className="mt-6 text-sm text-white">Finalizing sync... (Please wait until the process is complete!)</div>
            </motion.div>
          ) : (
            <motion.div
              key="main-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full"
            >
              <div className="relative w-full mb-2">
                <div
                  className="w-[260px] mx-auto rounded bg-none mb-2 hide-scrollbar flex flex-col items-stretch justify-center"
                  style={{
                    height: `${containerHeight}px`,
                    maxHeight: `${containerHeight}px`,
                    minHeight: `${itemHeight}px`,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                  onWheel={handleWheel}
                >
                  {/* Improved: Always render 5 slots, center focused song, fill with empty slots as needed */}
                  {(() => {
                    const totalSlots = 5;
                    const centerSlot = 2; // 0-based index for center
                    const emptyAbove = Math.max(0, centerSlot - focusedIdx);
                    const emptyBelow = Math.max(0, centerSlot - (songs.length - 1 - focusedIdx));
                    const firstIdx = focusedIdx - centerSlot + emptyAbove;
                    const slots = [];
                    for (let i = 0; i < emptyAbove; i++) {
                      slots.push(<div key={"empty-above-"+i} style={{ minHeight: `${itemHeight}px`, height: `${itemHeight}px` }} />);
                    }
                    for (let i = 0; i < totalSlots - emptyAbove - emptyBelow; i++) {
                      const idx = firstIdx + i;
                      if (idx < 0 || idx >= songs.length) {
                        slots.push(<div key={"empty-"+idx} style={{ minHeight: `${itemHeight}px`, height: `${itemHeight}px` }} />);
                      } else {
                        const song = songs[idx];
                        const isFocused = idx === focusedIdx;
                        slots.push(
                          <div
                            key={idx}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-300 ease-in-out rounded-lg ${
                              isFocused
                                ? 'bg-brand-green-dark text-white' // focused
                                : 'text-gray-400 hover:bg-neutral-800'
                            }`}
                            style={{
                              fontSize: isFocused ? '1.1rem' : '1rem',
                              minHeight: `${itemHeight}px`,
                              height: `${itemHeight}px`,
                              opacity: isFocused ? 1 : 0.8,
                              transform: isFocused ? 'scale(1)' : 'scale(0.9)',
                              zIndex: isFocused ? 10 : 1
                            }}
                            onClick={() => setFocusedIdx(idx)}
                          >
                            {isFocused && song.coverUrl && (
                              <img
                                src={song.coverUrl}
                                alt="cover"
                                className="w-12 h-12 rounded shadow-md object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="text-sm font-semibold truncate max-w-[200px]">{song.name}</div>
                              <div className="text-xs opacity-70 truncate max-w-[200px]">{song.artist}</div>
                              {isFocused && song.reason && (
                                <div className="text-xs text-red-400 mt-1 truncate max-w-[200px]">
                                  {song.reason}
                                </div>
                              )}
                              {isFocused && (song.yt_title || song.sp_title) && (
                                <div className="mt-1 border-t border-white pt-1">
                                  <p className="text-xs text-yellow-400 truncate max-w-[200px]">Matched:</p>
                                  <p className="text-sm font-semibold text-white truncate max-w-[200px]">
                                    {song.yt_title || song.sp_title}
                                  </p>
                                  <p className="text-xs text-gray-300 truncate max-w-[200px]">
                                    {song.yt_artist || song.sp_artist}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                    }
                    for (let i = 0; i < emptyBelow; i++) {
                      slots.push(<div key={"empty-below-"+i} style={{ minHeight: `${itemHeight}px`, height: `${itemHeight}px` }} />);
                    }
                    return slots;
                  })()}
                </div>
              </div>

              <div className="mb-2 flex items-center justify-center gap-4">
                {showNotFoundActionButtons && (
                  <>
                    <button
                      className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded"
                      onClick={() => onManualSearch?.(focusedSong, focusedIdx)}
                    >
                      Search
                    </button>
                    <button
                      className="text-sm bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded"
                      onClick={() => onSkip?.(focusedSong, focusedIdx)}
                    >
                      Skip
                    </button>
                  </>
                )}
                {showFoundActionButtons && (
                  <button
                    className="text-sm bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded"
                    onClick={() => onManualSearch?.(focusedSong, focusedIdx)}
                  >
                    Change
                  </button>
                )}
                <button
                  className="px-4 py-2 bg-brand-green-dark hover:bg-brand-green rounded text-sm font-semibold"
                  onClick={handleFinalizeClick}
                  disabled={finalizing}
                >
                  Finalize Sync
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}