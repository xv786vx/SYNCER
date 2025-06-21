import { Process } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

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
            <div
              key={process.id}
              className={`text-sm p-3 rounded-lg text-center ${
                process.status === 'completed' ? 'bg-green-900' :
                process.status === 'error' ? 'bg-red-900' :
                process.status === 'in-progress' || process.status === 'pending' ? 'bg-none' :
                'bg-neutral-700'
              }`}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="font-medium text-center">{process.message}</span>
                {process.subMessage && (
                  <span className="font-light text-xs text-neutral-300 text-center mt-1">
                    {process.subMessage}
                  </span>
                )}
                {process.status === 'in-progress' && (
                  <div className="mt-3 mb-1 flex flex-col items-center">
                    <LoadingSpinner size={48} color="#fff" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}