import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import * as adminService from '@/services/admin.service';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { Image, RefreshCw, CheckCircle, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';

interface ImageFile {
  name: string;
  path: string;
  size: number;
  format: string;
  tables: string[];
}

interface OptimizationResult {
  path: string;
  originalSize: number;
  newSize: number;
  saved: number;
}

export function ImageOptimization() {
  const { t } = useI18n();
  const [scanning, setScanning] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const scanImages = async () => {
    setScanning(true);
    setImages([]);
    setResults([]);
    
    try {
      const files = await adminService.listStorageFiles('receipts', '', 1000, { column: 'created_at', order: 'desc' });
      
      
      
      const allImages: ImageFile[] = [];
      const folders = (files || []).filter((f: any) => f.id === null);
      
      
      for (const folder of folders) {
        const folderFiles = await adminService.listStorageFiles('receipts', folder.name, 1000);
        
        
        if (folderFiles) {
          for (const subFolder of folderFiles.filter((f: any) => f.id === null)) {
            const deepFiles = await adminService.listStorageFiles('receipts', `${folder.name}/${subFolder.name}`, 1000);
            
            
            if (deepFiles) {
              for (const file of deepFiles.filter((f: any) => f.id !== null)) {
                const ext = file.name.split('.').pop()?.toLowerCase();
                if (ext && ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext)) {
                  const path = `${folder.name}/${subFolder.name}/${file.name}`;
                  allImages.push({
                    name: file.name,
                    path,
                    size: file.metadata?.size || 0,
                    format: ext.toUpperCase(),
                    tables: [folder.name],
                  });
                }
              }
            }
          }
        }
      }
      
      setImages(allImages);
      
      if (allImages.length === 0) {
        toast.info(t('imageOptimization.noImages'));
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error(t('common.error'));
    } finally {
      setScanning(false);
    }
  };

  const convertToWebP = async (file: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (webpBlob) => {
            if (webpBlob) {
              resolve(webpBlob);
            } else {
              reject(new Error('WebP conversion failed'));
            }
          },
          'image/webp',
          0.85
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const updateDatabaseReferences = async (oldPath: string, newPath: string) => {
    await adminService.updateImageReferences(oldPath, newPath);
  };

  const optimizeImages = async () => {
    if (images.length === 0) return;
    
    setOptimizing(true);
    setProgress(0);
    setResults([]);
    
    const newResults: OptimizationResult[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      setCurrentFile(image.name);
      setProgress(Math.round(((i + 1) / images.length) * 100));
      
      try {
        // Download the original file
        const fileData = await adminService.downloadStorageFile('receipts', image.path);
        if (!fileData) {
          continue;
        }
        
        // Convert to WebP
        const webpBlob = await convertToWebP(fileData);
        
        // Only proceed if WebP is smaller
        if (webpBlob.size >= image.size) {
          continue;
        }
        
        // Create new path with .webp extension
        const newPath = image.path.replace(/\.[^.]+$/, '.webp');
        
        try {
          await adminService.uploadStorageFile('receipts', newPath, webpBlob, 'image/webp');
        } catch (uploadErr) {
          console.error('Upload failed:', newPath, uploadErr);
          continue;
        }
        
        // Update database references
        await updateDatabaseReferences(image.path, newPath);
        
        // Delete the original file
        await adminService.removeStorageFiles('receipts', [image.path]);
        
        newResults.push({
          path: image.path,
          originalSize: image.size,
          newSize: webpBlob.size,
          saved: image.size - webpBlob.size,
        });
      } catch (error) {
        console.error('Optimization error for', image.path, error);
      }
    }
    
    setResults(newResults);
    setOptimizing(false);
    setCurrentFile('');
    
    const totalSaved = newResults.reduce((sum, r) => sum + r.saved, 0);
    if (newResults.length > 0) {
      toast.success(t('imageOptimization.savedSpace').replace('{size}', formatBytes(totalSaved)));
    } else {
      toast.info(t('imageOptimization.noImages'));
    }
    
    // Refresh the list
    scanImages();
  };

  const totalSize = images.reduce((sum, img) => sum + img.size, 0);
  const estimatedSaving = totalSize * 0.4; // Estimate 40% savings
  const totalSaved = results.reduce((sum, r) => sum + r.saved, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            {t('imageOptimization.title')}
          </CardTitle>
          <CardDescription>{t('imageOptimization.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scan Button */}
          <div className="flex gap-4">
            <Button 
              onClick={scanImages} 
              disabled={scanning || optimizing}
              variant="outline"
            >
              {scanning ? (
                <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {scanning ? t('imageOptimization.scanning') : t('common.refresh')}
            </Button>
          </div>

          {/* Statistics */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">{t('imageOptimization.totalImages')}</div>
                <div className="text-2xl font-bold">{images.length}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">{t('imageOptimization.currentSize')}</div>
                <div className="text-2xl font-bold">{formatBytes(totalSize)}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">{t('imageOptimization.estimatedSaving')}</div>
                <div className="text-2xl font-bold text-success">{formatBytes(estimatedSaving)}</div>
              </Card>
              {totalSaved > 0 && (
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">{t('imageOptimization.completed')}</div>
                  <div className="text-2xl font-bold text-success">{formatBytes(totalSaved)}</div>
                </Card>
              )}
            </div>
          )}

          {/* Optimize Button */}
          {images.length > 0 && !optimizing && (
            <Button onClick={optimizeImages} className="w-full md:w-auto">
              <CheckCircle className="w-4 h-4 mr-2" />
              {t('imageOptimization.startOptimize')}
            </Button>
          )}

          {/* Progress */}
          {optimizing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('imageOptimization.optimizing')}: {currentFile}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* File List */}
          {images.length > 0 && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span>{t('imageOptimization.totalImages')}: {images.length}</span>
                  {showDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="h-[300px] mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('receipt.fileName')}</TableHead>
                        <TableHead>{t('imageOptimization.originalFormat')}</TableHead>
                        <TableHead className="text-right">{t('imageOptimization.currentSize')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {images.map((img, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs truncate max-w-[200px]">
                            {img.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{img.format}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatBytes(img.size)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* No images message */}
          {!scanning && images.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('imageOptimization.noImages')}</p>
              <p className="text-sm mt-2">{t('imageOptimization.description')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
