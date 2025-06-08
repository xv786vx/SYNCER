import { useEffect, useRef, useState } from 'react';
import { SongStatus } from '../types.ts';
import { LoadingSpinner } from './LoadingSpinner';
import '../index.css';

interface SongWithCover extends SongStatus {
  coverUrl?: string;
}

interface SongSyncStatusProps {
  songs?: SongWithCover[];
  onManualSearch?: (song: SongWithCover, idx: number) => Promise<void>;
  onSkip?: (song: SongWithCover, idx: number) => void;
  onFinalize: () => Promise<void>;
}

export function SongSyncStatus({ songs = [], onFinalize }: SongSyncStatusProps) {
  const [finalizing, setFinalizing] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to the focused item on mount or when songs change
  useEffect(() => {
    if (listRef.current && songs.length > 0) {
      listRef.current.scrollTop = Math.max(0, focusedIdx * 72 - 72 * 2);
    }
  }, [songs]);

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
    setFinalizing(true);
    await onFinalize();
    setFinalizing(false);
  };

  return (
    <div className="absolute z-50 bg-black bg-opacity-85 top-0 left-0 w-[360px] h-[360px] flex items-center justify-center">
      <div className="mx-auto max-w-[300px] p-4 rounded-lg shadow-lg font-cascadia flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-2 text-center">Song Sync Status</h3>
        {finalizing ? (
          <div className="flex flex-col items-center justify-center h-32">
            <LoadingSpinner size={36} color="#fff" />
            <div className="mt-6 text-sm text-white">Finalizing sync...</div>
          </div>
        ) : (
          <>
            <div className="relative w-full mb-2">
              <div
                className="w-[182px] rounded bg-none mb-2 hide-scrollbar flex flex-col items-stretch justify-center"
                style={{
                  height: '192px',
                  maxHeight: '192px',
                  minHeight: '40px',
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
                    slots.push(<div key={"empty-above-"+i} style={{ minHeight: '72px', height: '72px' }} />);
                  }
                  for (let i = 0; i < totalSlots - emptyAbove - emptyBelow; i++) {
                    const idx = firstIdx + i;
                    if (idx < 0 || idx >= songs.length) {
                      slots.push(<div key={"empty-"+idx} style={{ minHeight: '72px', height: '72px' }} />);
                    } else {
                      const song = songs[idx];
                      slots.push(
                        <div
                          key={idx}
                          className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-all duration-200 ${
                            idx === focusedIdx
                              ? 'bg-brand-green-dark text-white min-h-[72px]' // focused
                              : 'text-gray-400 hover:bg-neutral-800 min-h-[40px]'
                          }`}
                          style={{ fontSize: idx === focusedIdx ? '1.1rem' : '1rem', minHeight: '72px', height: '72px' }}
                          onClick={() => setFocusedIdx(idx)}
                        >
                          {idx === focusedIdx && song.coverUrl && (
                            <img
                              src={song.coverUrl}
                              alt="cover"
                              className="w-12 h-12 rounded shadow-md object-cover"
                            />
                          )}
                          <div>
                            <div className="font-semibold truncate max-w-[160px]">{song.name}</div>
                            <div className="text-xs opacity-70 truncate max-w-[160px]">{song.artist}</div>
                          </div>
                        </div>
                      );
                    }
                  }
                  for (let i = 0; i < emptyBelow; i++) {
                    slots.push(<div key={"empty-below-"+i} style={{ minHeight: '72px', height: '72px' }} />);
                  }
                  return slots;
                })()}
              </div>
            </div>
            <button
              className="px-4 py-2 bg-brand-green-dark hover:bg-brand-green rounded mx-auto block text-sm font-semibold"
              onClick={handleFinalizeClick}
              disabled={finalizing}
            >
              Finalize Sync
            </button>
          </>
        )}
      </div>
    </div>
  );
}