import { useState, useEffect } from 'react';

export function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  const [toastFading, setToastFading] = useState(false)

  useEffect(() => {
    if (toast) {
        setToastFading(false)
        const fadeTimer = setTimeout(() => setToastFading(true), 4500);
        const removeTimer = setTimeout(() => {
            setToast(null)
            setToastFading(false)
        }, 5000)

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        }
    }
  }, [toast])

  return { toast, setToast, toastFading }
}