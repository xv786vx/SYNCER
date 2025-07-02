import { Process } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { useState, useEffect } from 'react';

interface ProcessItemProps {
  process: Process;
}


function formatSecondsToMMSS(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ProcessItem({ process }: ProcessItemProps) {
  // Use local state for countdown, but always recalculate from countdownEnd for accuracy
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (process.countdownEnd && process.status === 'in-progress') {
      const interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [process.countdownEnd, process.status]);

  let mainText = process.message || '';
  let subText: string | null = null;

  // Live countdown logic (always up-to-date)
  if (process.countdownEnd && process.status === 'in-progress') {
    const remaining = Math.max(0, Math.round((process.countdownEnd - now) / 1000));
    mainText = `Syncing "${process.playlistName}"...`;
    if (remaining > 0) {
      subText = `(Est. ${formatSecondsToMMSS(remaining)})`;
    } else {
      mainText = `Still working on "${process.playlistName}"...`;
    }
  } else {
    // No live countdown, check if the original message has a static estimate.
    const match = mainText.match(/(.*) (\(Est\. \d+s\))/);
    if (match) {
      mainText = match[1].trim();
      subText = match[2];
    }
  }

  const getStatusClass = () => {
    switch (process.status) {
      case 'completed':
        return 'bg-green-900';
      case 'error':
        return 'bg-red-900';
      case 'in-progress':
      case 'pending':
        return 'bg-none';
      default:
        return 'bg-neutral-700';
    }
  };

  return (
    <div className={`text-sm p-3 rounded-lg text-center ${getStatusClass()}`}>
      <div className="flex flex-col items-center justify-center">
        <span className="font-medium text-center">{mainText}</span>
        {subText && (
          <span className="font-light text-xs text-neutral-400 text-center mt-1">
            {subText}
          </span>
        )}
        {process.status === 'in-progress' && (
          <div className="mt-3 mb-1 flex flex-col items-center">
            <LoadingSpinner size={48} color="#fff" />
          </div>
        )}
      </div>
    </div>
  );
}

interface ProcessesOverlayProps {
  processes: Process[];
  onDismiss: () => void;
}

export function ProcessesOverlay({ processes, onDismiss }: ProcessesOverlayProps) {
  return (
    <div
      className="absolute z-50 bg-black bg-opacity-75"
      onClick={onDismiss}
      style={{ 
        cursor: 'pointer',
        top: 0,
        left: 0,
        width: '360px', // Explicit width
        height: '360px', // Explicit height matching index.css
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        className="mx-auto max-w-[300px] p-4 font-cascadia"
        onClick={e => e.stopPropagation()}
        style={{ cursor: 'default' }}
      >
        <h3 className="text-lg font-semibold mb-4 text-center">Processes</h3>
        <div className="space-y-3">
          {processes.map(process => (
            <ProcessItem key={process.id} process={process} />
          ))}
        </div>
      </div>
    </div>
  );
}