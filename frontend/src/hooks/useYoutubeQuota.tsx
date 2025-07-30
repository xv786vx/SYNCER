import { useEffect, useState, useCallback } from "react";
import * as API from '../utils/apiClient';

export function useYoutubeQuota() {
  const [quota, setQuota] = useState<{ total: number; limit: number } | null>(null);

  const fetchQuota = useCallback(async () => {
    try {
      const data = await API.getYoutubeQuota() as { total: number; limit: number };
      setQuota({ total: data.total, limit: data.limit });
    } catch {
      setQuota(null);
    }
  }, []);

  useEffect(() => {
    fetchQuota();
    // Optionally, poll quota every minute:
    // const interval = setInterval(fetchQuota, 60000);
    // return () => clearInterval(interval);
  }, [fetchQuota]);

  return { quota, fetchQuota };
}