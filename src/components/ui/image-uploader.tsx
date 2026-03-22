import { useState, useRef, useCallback, useId } from 'react';
import { Upload, X, ImageIcon, FileText, CheckCircle } from 'lucide-react';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  previewUrl: string | null;
  accept?: string;
  maxSizeMB?: number;
  compressImages?: boolean;
  compressionQuality?: number;
  maxWidth?: number;
  maxHeight?: number;
  uploading?: boolean;
  uploadProgress?: number;
  className?: string;
  variant?: 'default' | 'compact';
}

// 图片压缩并转换为WebP格式
async function compressImageToWebP(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (webpBlob) => {
            if (webpBlob) {
              if (webpBlob.size >= file.size) {
                canvas.toBlob(
                  (jpegBlob) => {
                    if (jpegBlob && jpegBlob.size < file.size) {
                      const jpegFile = new File([jpegBlob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                      });
                      resolve(jpegFile);
                    } else {
                      resolve(file);
                    }
                  },
                  'image/jpeg',
                  quality
                );
              } else {
                const webpFile = new File([webpBlob], file.name.replace(/\.[^.]+$/, '.webp'), {
                  type: 'image/webp',
                  lastModified: Date.now(),
                });
                resolve(webpFile);
              }
            } else {
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      } else {
        resolve(file);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImageUploader({
  onFileSelect,
  onRemove,
  previewUrl,
  accept = 'image/*,.pdf',
  maxSizeMB = 10,
  compressImages = true,
  compressionQuality = 0.8,
  maxWidth = 1920,
  maxHeight = 1920,
  uploading = false,
  uploadProgress = 0,
  className,
  variant = 'default',
}: ImageUploaderProps) {
  const { t } = useI18n();
  const [compressing, setCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    original: number;
    compressed: number;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFile = useCallback(async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      if (compressImages && file.type.startsWith('image/')) {
        setCompressing(true);
        try {
          const compressed = await compressImageToWebP(file, maxWidth, maxHeight, compressionQuality);
          if (compressed.size > maxSizeMB * 1024 * 1024) {
            throw new Error('too_large');
          }
          setCompressionInfo({ original: file.size, compressed: compressed.size });
          onFileSelect(compressed);
        } catch {
          alert(t('upload.fileTooLarge').replace('{maxSize}', `${maxSizeMB}MB`));
        } finally {
          setCompressing(false);
        }
      } else {
        alert(t('upload.fileTooLarge').replace('{maxSize}', `${maxSizeMB}MB`));
      }
      return;
    }

    if (compressImages && file.type.startsWith('image/') && file.type !== 'image/gif') {
      setCompressing(true);
      try {
        const compressed = await compressImageToWebP(file, maxWidth, maxHeight, compressionQuality);
        if (compressed.size < file.size) {
          setCompressionInfo({ original: file.size, compressed: compressed.size });
        } else {
          setCompressionInfo(null);
        }
        onFileSelect(compressed);
      } catch {
        onFileSelect(file);
      } finally {
        setCompressing(false);
      }
    } else {
      setCompressionInfo(null);
      onFileSelect(file);
    }
  }, [compressImages, compressionQuality, maxHeight, maxSizeMB, maxWidth, onFileSelect, t]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setCompressionInfo(null);
    onRemove();
    if (inputRef.current) inputRef.current.value = '';
  };

  const isPdf = previewUrl?.endsWith('.pdf') || previewUrl?.includes('application/pdf');

  // 共用的隐藏 input
  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      onChange={handleChange}
      className="hidden"
      id={inputId}
    />
  );

  // 共用的拖放区域（未选择文件时）
  const dropZone = (compact: boolean) => (
    <label
      htmlFor={inputId}
      className={cn(
        'flex items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition-colors',
        compact ? 'gap-2 px-4 py-3' : 'flex-col h-24',
        dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:bg-muted/50',
        compressing && 'pointer-events-none opacity-50'
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {compressing ? (
        <div className={cn('flex items-center', compact ? 'gap-2' : 'flex-col gap-1 py-2')}>
          <ChromeLoadingSpinner variant="primary" className={compact ? 'h-5 w-5' : 'h-8 w-8'} />
          <p className="text-sm text-muted-foreground">{t('upload.compressing')}</p>
        </div>
      ) : (
        <div className={cn('flex items-center', compact ? 'gap-2' : 'flex-col gap-1 py-2')}>
          {compact ? (
            <Upload className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          ) : (
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {dragActive ? t('upload.dropHere') : t('form.clickToUpload')}
          </p>
          {!compact && (
            <p className="text-xs text-muted-foreground">
              {t('upload.maxSize').replace('{maxSize}', `${maxSizeMB}MB`)}
            </p>
          )}
        </div>
      )}
    </label>
  );

  // 紧凑模式
  if (variant === 'compact') {
    return (
      <div className={cn('space-y-2', className)}>
        {hiddenInput}
        {previewUrl ? (
          <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
            {isPdf ? (
              <FileText className="w-8 h-8 text-muted-foreground" />
            ) : (
              <img src={previewUrl} alt="Preview" loading="lazy" className="w-12 h-12 object-cover rounded" />
            )}
            <div className="flex-1 min-w-0">
              {uploading ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <ChromeLoadingSpinner variant="muted" className="h-3 w-3" />
                    <span>{t('upload.uploading')}</span>
                  </div>
                  <Progress value={uploadProgress} className="h-1" />
                </div>
              ) : compressionInfo ? (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>{t('upload.compressed')}: {formatFileSize(compressionInfo.original)} → {formatFileSize(compressionInfo.compressed)}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">{t('upload.ready')}</span>
              )}
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleRemove} disabled={uploading}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          dropZone(true)
        )}
      </div>
    );
  }

  // 默认模式
  return (
    <div className={cn('space-y-2', className)}>
      {hiddenInput}
      {previewUrl ? (
        <div className="relative">
          <div className="relative rounded-lg overflow-hidden bg-muted">
            {isPdf ? (
              <div className="flex items-center justify-center h-24 bg-muted">
                <FileText className="w-12 h-12 text-muted-foreground" />
              </div>
            ) : (
              <img src={previewUrl} alt="Preview" loading="lazy" className="w-full h-24 object-contain" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                <ChromeLoadingSpinner variant="primary" className="h-6 w-6" />
                <div className="w-3/4">
                  <Progress value={uploadProgress} className="h-2" />
                </div>
                <span className="text-sm">{uploadProgress}%</span>
              </div>
            )}
          </div>
          {compressionInfo && !uploading && (
            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>
                {t('upload.compressionSaved')}: {formatFileSize(compressionInfo.original - compressionInfo.compressed)} 
                ({Math.round((1 - compressionInfo.compressed / compressionInfo.original) * 100)}%)
              </span>
            </div>
          )}
          <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={handleRemove} disabled={uploading}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        dropZone(false)
      )}
    </div>
  );
}
