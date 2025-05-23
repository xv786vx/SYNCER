import { Process } from '../types';

interface ProcessesOverlayProps {
  processes: Process[];
  onDismiss: () => void;
}

export function ProcessesOverlay({ processes, onDismiss }: ProcessesOverlayProps) {
  return (
    <div
      className="absolute inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
      onClick={onDismiss}
      style={{ cursor: 'pointer' }}
    >
      <div
        className="w-full max-w-[360px] p-4 font-cascadia"
        onClick={e => e.stopPropagation()}
        style={{ cursor: 'default' }}
      >
        <h3 className="text-lg font-semibold mb-4 text-center">Processes</h3>
        <div className="space-y-3">
          {processes.map(process => (
            <div
              key={process.id}
              className={`text-sm p-3 rounded-lg ${
                process.status === 'completed' ? 'bg-green-900' :
                process.status === 'error' ? 'bg-red-900' :
                process.status === 'in-progress' ? 'bg-blue-900' :
                'bg-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{process.message}</span>
                {process.status === 'in-progress' && !process.interactive && (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 