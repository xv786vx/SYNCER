import { useEffect, useState } from "react";
import * as API from '../utils/apiClient';

enum BackendStatus {
    CONNECTING,
    ONLINE,
    OFFLINE
}

export function useBackendStatus() {
    const [backendStatus, setBackendStatus] = useState<BackendStatus>(BackendStatus.CONNECTING);

    useEffect(() => {
        const checkBackendStatus = async () => {
            const result = await API.healthCheck();
            if (result && result.status === "ok") {
                setBackendStatus(BackendStatus.ONLINE);
            } else {
                setBackendStatus(BackendStatus.OFFLINE);
            }
        }

        checkBackendStatus()

        // Check every 5 seconds
        const interval = setInterval(checkBackendStatus, 5000); 

        return () => clearInterval(interval);
    }, []);

    return backendStatus;
}