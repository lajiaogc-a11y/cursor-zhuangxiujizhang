import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, Loader2 } from 'lucide-react';
import { createStorageSignedUrl } from '@/services/admin.service';
import { useI18n } from '@/lib/i18n';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  title?: string;
}

export function ImagePreviewDialog({ 
  open, 
  onOpenChange, 
  imageUrl,
  title
}: ImagePreviewDialogProps) {
  const { t } = useI18n();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayTitle = title || t('transactions.receiptPreview');

  useEffect(() => {
    async function getSignedUrl() {
      if (!open || !imageUrl) {
        setSignedUrl(null);
        return;
      }

      // If it's already a full URL (http/https), use it directly
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        setSignedUrl(imageUrl);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Extract bucket and path from the stored URL
        // Format could be: receipts/filename.jpg or just filename.jpg
        let bucket = 'receipts';
        let path = imageUrl;

        // If path contains bucket prefix, extract it
        if (imageUrl.includes('/')) {
          const parts = imageUrl.split('/');
          if (parts[0] === 'receipts' || parts[0] === 'documents') {
            bucket = parts[0];
            path = parts.slice(1).join('/');
          }
        }

        const signedUrl = await createStorageSignedUrl(bucket, path, 3600);

        if (signedUrl) {
          setSignedUrl(signedUrl);
        } else {
          setError(t('image.loadFailed'));
        }
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setError(t('image.loadFailed'));
      } finally {
        setLoading(false);
      }
    }

    getSignedUrl();
  }, [open, imageUrl, t]);

  if (!imageUrl) return null;

  const handleDownload = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <VisuallyHidden.Root>
          <DialogTitle>{displayTitle}</DialogTitle>
        </VisuallyHidden.Root>
        <div className="relative">
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleDownload}
              title={t('image.download')}
              disabled={!signedUrl}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4">
            <h3 className="font-semibold mb-4" aria-hidden="true">{displayTitle}</h3>
            <div className="flex items-center justify-center bg-muted rounded-lg p-4 min-h-[400px]">
              {loading ? (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              ) : error ? (
                <div className="text-center text-muted-foreground">
                  <p>{error}</p>
                  <p className="text-sm mt-2">{t('image.path')}: {imageUrl}</p>
                </div>
              ) : signedUrl ? (
                <img
                  src={signedUrl}
                  alt={displayTitle}
                  loading="lazy"
                  className="max-w-full max-h-[70vh] object-contain rounded"
                  onError={() => setError(t('image.loadFailed'))}
                />
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
