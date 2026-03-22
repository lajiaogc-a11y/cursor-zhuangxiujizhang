import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Trash2, RefreshCw, Image, FileIcon, X, AlertTriangle } from 'lucide-react';
import { AppSectionLoading, ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { ImagePreviewDialog } from '@/components/ui/image-preview-dialog';
import { receiptsService } from '@/services';
import type { StorageFile } from '@/services/receipts.service';

export function ReceiptManagement() {
  const { t } = useI18n();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const processedFiles = await receiptsService.fetchReceiptFiles({
        transaction: t('receipt.linkedTransaction'),
        payment: t('receipt.linkedPayment'),
        expense: t('receipt.linkedExpense'),
        other: t('receipt.linkedOther'),
      });
      setFiles(processedFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error(t('receipt.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.path)));
    }
  };

  const toggleSelectOrphans = () => {
    const orphanPaths = files.filter(f => f.isOrphan).map(f => f.path);
    const allOrphansSelected = orphanPaths.every(p => selectedFiles.has(p));
    if (allOrphansSelected) {
      const newSelection = new Set(selectedFiles);
      orphanPaths.forEach(p => newSelection.delete(p));
      setSelectedFiles(newSelection);
    } else {
      setSelectedFiles(new Set([...selectedFiles, ...orphanPaths]));
    }
  };

  const toggleFile = (path: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(path)) newSelection.delete(path);
    else newSelection.add(path);
    setSelectedFiles(newSelection);
  };

  const handleBatchDelete = async () => {
    if (selectedFiles.size === 0) return;
    setDeleting(true);
    setDeleteProgress(0);
    cancelRef.current = false;

    try {
      const { deleted, errors } = await receiptsService.batchDeleteReceiptFiles(
        Array.from(selectedFiles),
        (percent) => setDeleteProgress(percent),
        () => cancelRef.current
      );
      if (deleted > 0) toast.success(t('receipt.deleteSuccessCount').replace('{count}', String(deleted)));
      if (errors > 0) toast.error(t('receipt.deleteFailedCount').replace('{count}', String(errors)));
      setSelectedFiles(new Set());
      await fetchFiles();
    } catch (error) {
      console.error('Batch delete error:', error);
      toast.error(t('receipt.deleteError'));
    } finally {
      setDeleting(false);
      setDeleteProgress(0);
      setConfirmDeleteOpen(false);
    }
  };

  const isImageFile = (name: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
  const orphanCount = files.filter(f => f.isOrphan).length;
  const selectedOrphanCount = files.filter(f => f.isOrphan && selectedFiles.has(f.path)).length;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const selectedSize = files.filter(f => selectedFiles.has(f.path)).reduce((sum, f) => sum + f.size, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Image className="w-5 h-5" />{t('receipt.management')}</CardTitle>
        <CardDescription>{t('receipt.managementDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-muted rounded-lg"><div className="text-sm text-muted-foreground">{t('receipt.totalFiles')}</div><div className="text-xl font-bold">{files.length}</div></div>
          <div className="p-3 bg-muted rounded-lg"><div className="text-sm text-muted-foreground">{t('receipt.totalSize')}</div><div className="text-xl font-bold">{formatFileSize(totalSize)}</div></div>
          <div className="p-3 bg-warning/10 rounded-lg"><div className="text-sm text-muted-foreground">{t('receipt.orphanFiles')}</div><div className="text-xl font-bold text-warning">{orphanCount}</div></div>
          <div className="p-3 bg-primary/10 rounded-lg"><div className="text-sm text-muted-foreground">{t('receipt.selected')}</div><div className="text-xl font-bold text-primary">{selectedFiles.size}</div>{selectedFiles.size > 0 && <div className="text-xs text-muted-foreground">{formatFileSize(selectedSize)}</div>}</div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={fetchFiles} disabled={loading}>{loading ? <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" /> : <RefreshCw className="w-4 h-4 mr-2" />}{t('common.refresh')}</Button>
          <Button variant="outline" size="sm" onClick={toggleSelectAll}>{selectedFiles.size === files.length ? t('receipt.deselectAll') : t('receipt.selectAll')}</Button>
          {orphanCount > 0 && <Button variant="outline" size="sm" onClick={toggleSelectOrphans}><AlertTriangle className="w-4 h-4 mr-2 text-warning" />{t('receipt.selectOrphans')} ({orphanCount})</Button>}
          {selectedFiles.size > 0 && <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteOpen(true)} disabled={deleting}><Trash2 className="w-4 h-4 mr-2" />{t('receipt.deleteSelected')} ({selectedFiles.size})</Button>}
        </div>

        {deleting && (
          <div className="mb-4 p-4 border rounded-lg bg-destructive/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('receipt.deleting')}</span>
              <Button variant="outline" size="sm" onClick={() => { cancelRef.current = true; }}><X className="w-4 h-4 mr-1" />{t('common.cancel')}</Button>
            </div>
            <Progress value={deleteProgress} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">{deleteProgress}%</div>
          </div>
        )}

        {loading ? (
          <AppSectionLoading label={t('common.loading')} compact />
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t('receipt.noFiles')}</div>
        ) : (
          <div className="rounded-lg border max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-10"><Checkbox checked={selectedFiles.size === files.length && files.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                <TableHead>{t('receipt.fileName')}</TableHead>
                <TableHead>{t('receipt.fileSize')}</TableHead>
                <TableHead>{t('receipt.status')}</TableHead>
                <TableHead>{t('receipt.createdAt')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {files.map(file => (
                  <TableRow key={file.id} className={file.isOrphan ? 'bg-warning/5' : ''}>
                    <TableCell><Checkbox checked={selectedFiles.has(file.path)} onCheckedChange={() => toggleFile(file.path)} /></TableCell>
                    <TableCell><div className="flex items-center gap-2">{isImageFile(file.name) ? <Image className="w-4 h-4 text-primary" /> : <FileIcon className="w-4 h-4 text-muted-foreground" />}<span className="truncate max-w-[200px]" title={file.path}>{file.name}</span></div></TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>{file.isOrphan ? <Badge variant="outline" className="text-warning border-warning"><AlertTriangle className="w-3 h-3 mr-1" />{t('receipt.orphan')}</Badge> : <Badge variant="secondary">{file.linkedTo}</Badge>}</TableCell>
                    <TableCell>{file.created_at ? new Date(file.created_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="text-right">{isImageFile(file.name) && <Button variant="ghost" size="icon" onClick={() => setPreviewImage(file.path)}><Image className="w-4 h-4" /></Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader>
          <AlertDialogTitle>{t('receipt.confirmDeleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('receipt.confirmDeleteDesc').replace('{count}', String(selectedFiles.size))}
            {selectedOrphanCount < selectedFiles.size && <span className="block mt-2 text-destructive font-medium">{t('receipt.deleteWarningLinked').replace('{count}', String(selectedFiles.size - selectedOrphanCount))}</span>}
          </AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleBatchDelete} className="bg-destructive hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <ImagePreviewDialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)} imageUrl={previewImage} title={t('common.receipt')} />
    </Card>
  );
}
