import { useEffect, useState, useRef, forwardRef } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { registerSW } from 'virtual:pwa-register';

export const OfflineIndicator = forwardRef<HTMLDivElement>(function OfflineIndicator(_props, _ref) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const updateSWRef = useRef<(() => void) | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    const updateSW = registerSW({
      onNeedRefresh() {
        setShowUpdatePrompt(true);
      },
      onOfflineReady() {},
    });
    updateSWRef.current = updateSW;

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const handleUpdate = () => {
    updateSWRef.current?.();
    setShowUpdatePrompt(false);
  };

  if (!isOffline && !showUpdatePrompt) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex gap-2">
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4">
          <WifiOff className="w-4 h-4" />
          <span>{t('offline.message')}</span>
        </div>
      )}
      {showUpdatePrompt && (
        <button
          type="button"
          onClick={handleUpdate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4 hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('offline.updateAvailable')}</span>
        </button>
      )}
    </div>
  );
});
