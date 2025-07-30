import { Job } from '../types';

export function useFinalizeSync({
  currentJobId,
  setCurrentJobId,
  setIsFinalizing,
  isFinalizingRef,
  setOverlayState,
  setToast,
  API,
}: {
  currentJobId: string | null;
  setCurrentJobId: (id: string | null) => void;
  setIsFinalizing: (val: boolean) => void;
  isFinalizingRef: React.MutableRefObject<boolean>;
  setOverlayState: (state: 'none' | 'processes' | 'finalizing' | 'songSyncStatus') => void;
  setToast: (msg: string | null) => void;
  API: typeof import('../utils/apiClient');
}) {
    const handleFinalizeSpToYt = async () => {
        setIsFinalizing(true);
        isFinalizingRef.current = true;
        try {
        if (currentJobId) {
            await API.finalizeJob(currentJobId);
            setToast("Sync finalizing...");
            setOverlayState('processes');
            // Start polling for job completion
            const poll = async () => {
            let done = false;
            while (!done) {
                const job = await API.getJobStatus(currentJobId) as Job;
                if (job.status === 'completed' || job.status === 'error') {
                done = true;
                setIsFinalizing(false);
                setOverlayState('none');
                setCurrentJobId(null);
                setToast(job.status === 'completed' ? "Sync finished!" : "Sync failed.");
                } else {
                await new Promise(res => setTimeout(res, 2000));
                }
            }
            };
            await poll();
        }
        } catch {
            setIsFinalizing(false);
            isFinalizingRef.current = false;
        }
    };

    const handleFinalizeYtToSp = async () => {
        setIsFinalizing(true);
        isFinalizingRef.current = true;
        try {
          if (currentJobId) {
            await API.finalizeJob(currentJobId);
            setToast("Sync finalizing...");
            setOverlayState('processes');
            // Start polling for job completion
            const poll = async () => {
              let done = false;
              while (!done) {
                const job = await API.getJobStatus(currentJobId) as Job;
                if (job.status === 'completed' || job.status === 'error') {
                  done = true;
                  setIsFinalizing(false);
                  setOverlayState('none');
                  setCurrentJobId(null);
                  setToast(job.status === 'completed' ? "Sync finished!" : "Sync failed.");
                } else {
                  await new Promise(res => setTimeout(res, 2000));
                }
              }
            };
            poll();
          }
        } catch {
          setIsFinalizing(false);
          isFinalizingRef.current = false;
        }
    };

    return { handleFinalizeSpToYt, handleFinalizeYtToSp };
    
}