import { Trash2, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onDelete?: () => void;
  onExport?: () => void;
  onClear: () => void;
  deleting?: boolean;
}

export function BulkActionsToolbar({
  selectedCount,
  onDelete,
  onExport,
  onClear,
  deleting,
}: BulkActionsToolbarProps) {
  const { t } = useI18n();

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-lg animate-in slide-in-from-top-2 duration-200">
      <span className="text-sm font-medium text-primary">
        {t('bulk.selected').replace('{count}', String(selectedCount))}
      </span>
      <div className="flex-1" />
      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="w-3.5 h-3.5 mr-1" />
          {t('bulk.export')}
        </Button>
      )}
      {onDelete && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={deleting}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          {deleting ? t('common.deleting') : t('bulk.delete')}
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClear}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
