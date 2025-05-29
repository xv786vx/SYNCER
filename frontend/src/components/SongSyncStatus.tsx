import { useState } from 'react';
import { SongStatus } from '../types.ts';
import Picker from 'react-mobile-picker';
import '../index.css';

interface SongSyncStatusProps {
  songs: SongStatus[];
  onManualSearch: (song: SongStatus, idx: number) => Promise<void>;
  onSkip: (song: SongStatus, idx: number) => void;
  onFinalize: () => Promise<void>;
}

// export function SongSyncStatus({ songs, onManualSearch, onSkip, onFinalize }: SongSyncStatusProps) {
export function SongSyncStatus({ songs, onFinalize }: SongSyncStatusProps) {
  // Picker expects value as an object: { columnName: value }
  const [pickerValue, setPickerValue] = useState<{ song: string }>({ song: '0' });
    return (
    <div 
      className="absolute z-50 bg-black bg-opacity-85" 
      style={{ 
        top: 0,
        left: 0,
        width: '360px', // Explicit width
        height: '360px', // Explicit height matching index.css
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="mx-auto max-w-[300px] p-4 rounded-lg shadow-lg font-cascadia flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-2 text-center">Song Sync Status</h3>
        <div className="w-full flex justify-center mb-2 text-sm">
          <Picker
            value={pickerValue}
            onChange={setPickerValue}
            height={148}
            itemHeight={36}
            wheelMode="normal"
            style={{ border: 'none', boxShadow: 'none', background: 'transparent'}} // Remove outer bars
            className="my-custom-picker"
          >
            <Picker.Column name="song">
              {songs.map((song, idx) => (
                <Picker.Item key={idx} value={String(idx)}>
                  {({ selected }: { selected: boolean }) => (
                    <span style={{ color: selected ? '#fff' : '#888', transition: 'color 0.2s' }}>
                      {song.name} by {song.artist}
                    </span>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
          </Picker>
        </div>
        <div className="flex gap-2 mb-2">
          {/* <button
            className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-xs rounded"
            onClick={() => onManualSearch(songs[Number(pickerValue.song)], Number(pickerValue.song))}
          >
            Manual Search
          </button>
          <button
            className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-xs rounded"
            onClick={() => onSkip(songs[Number(pickerValue.song)], Number(pickerValue.song))}
          >
            Skip
          </button> */}
        </div>
        <button
          className="px-2 py-2 bg-brand-green-dark hover:bg-brand-green rounded mx-auto block text-sm"
          disabled={songs.some(s => s.status === 'not_found' && !s.requires_manual_search)}
          onClick={onFinalize}
        >
          Finalize Sync
        </button>
      </div>
    </div>
  );
}