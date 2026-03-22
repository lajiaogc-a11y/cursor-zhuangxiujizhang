import { useState, useMemo } from 'react';
import { History, Trash2, Copy, Calendar, FileText, ChevronDown, GitCompare, RotateCcw } from 'lucide-react';
import { SavedQuotation, QuotationVersion } from '@/hooks/useQQuotations';
import { QuotationItem } from '@/types/quotation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useI18n } from '@/lib/i18n';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotations: SavedQuotation[];
  onLoad: (quotation: SavedQuotation) => void;
  onDelete: (id: string) => void;
  // Version history props (merged)
  versions?: QuotationVersion[];
  versionsLoading?: boolean;
  currentItems?: QuotationItem[];
  onRestoreVersion?: (version: QuotationVersion) => void;
  currentQuotationId?: string;
}

type TabFilter = 'all' | 'draft' | 'sent';

export function QuotationHistoryDialog({ open, onOpenChange, quotations, onLoad, onDelete, versions = [], versionsLoading, currentItems = [], onRestoreVersion, currentQuotationId }: Props) {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tabFilter, setTabFilter] = useState<TabFilter>('draft');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedV1, setSelectedV1] = useState<string | null>(null);
  const [selectedV2, setSelectedV2] = useState<string | null>(null);

  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: t('qh.draft'), variant: 'secondary' },
    sent: { label: t('qh.sent'), variant: 'default' },
    approved: { label: t('qh.accepted'), variant: 'default' },
    rejected: { label: t('qh.rejected'), variant: 'destructive' },
  };

  const filteredQuotations = useMemo(() => {
    if (tabFilter === 'all') return quotations;
    if (tabFilter === 'draft') return quotations.filter(q => q.status === 'draft');
    return quotations.filter(q => q.status === 'sent' || q.status === 'approved' || q.status === 'rejected');
  }, [quotations, tabFilter]);

  const draftCount = quotations.filter(q => q.status === 'draft').length;
  const formalCount = quotations.filter(q => q.status !== 'draft').length;

  const formatPrice = (p: number) => `RM ${p.toLocaleString('en-MY', { minimumFractionDigits: 0 })}`;
  const formatCurrency = (a: number) => `RM ${a.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;
  const getStatus = (s: string) => statusMap[s] || { label: s, variant: 'outline' as const };
  const formatDate = (ds: string) => new Date(ds).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const handleLoad = (q: SavedQuotation) => { onLoad(q); onOpenChange(false); };
  const handleConfirmDelete = () => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } };

  // Version comparison logic
  const getItems = (id: string): QuotationItem[] => {
    if (id === 'current') return currentItems;
    return versions.find(v => v.id === id)?.items || [];
  };

  const comparison = (() => {
    if (!selectedV1 || !selectedV2) return null;
    const items1 = getItems(selectedV1);
    const items2 = getItems(selectedV2);
    const total1 = items1.reduce((s, i) => s + i.lineTotal, 0);
    const total2 = items2.reduce((s, i) => s + i.lineTotal, 0);
    const added = items2.filter(i2 => !items1.some(i1 => i1.productId === i2.productId));
    const removed = items1.filter(i1 => !items2.some(i2 => i2.productId === i1.productId));
    const changed = items2.filter(i2 => { const i1 = items1.find(i => i.productId === i2.productId); return i1 && (i1.quantity !== i2.quantity || i1.unitPrice !== i2.unitPrice); })
      .map(i2 => ({ item: i2, oldItem: items1.find(i => i.productId === i2.productId)! }));
    return { added, removed, changed, totalDiff: total2 - total1 };
  })();

  // Get versions for a specific quotation (only current quotation has versions loaded)
  const getVersionsForQuotation = (qId: string) => {
    if (qId === currentQuotationId) return versions;
    return [];
  };

  const renderVersionSection = (qId: string) => {
    const qVersions = getVersionsForQuotation(qId);
    if (qId !== currentQuotationId) {
      return <div className="text-xs text-muted-foreground py-3 text-center">{t('qh.loadToSeeVersions')}</div>;
    }
    if (versionsLoading) return <AppSectionLoading label={t('common.loading')} compact className="min-h-[100px] py-3" />;
    if (qVersions.length === 0) return <div className="text-xs text-muted-foreground py-3 text-center">{t('qh.noVersions')}</div>;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{t('qh.versionHistory')} ({qVersions.length})</span>
          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={() => setCompareOpen(true)}>
            <GitCompare className="w-3 h-3" />{t('qh.compare')}
          </Button>
        </div>
        {qVersions.map(v => (
          <div key={v.id} className="flex items-center justify-between px-3 py-2 rounded-md border bg-muted/30 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] h-5">v{v.versionNumber}</Badge>
              <span className="font-mono text-xs">{formatCurrency(v.grandTotal)}</span>
              <span className="text-[10px] text-muted-foreground">{formatDate(v.createdAt)}</span>
            </div>
            {onRestoreVersion && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={() => onRestoreVersion(v)}>
                <RotateCcw className="w-3 h-3" />{t('qh.restore')}
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[700px] max-w-[95vw] h-[600px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="w-5 h-5" />{t('qh.title')}</DialogTitle>
          </DialogHeader>

          {/* Tab filter: Draft / Formal only */}
          <Tabs value={tabFilter === 'all' ? 'draft' : tabFilter} onValueChange={(v) => setTabFilter(v as TabFilter)} className="shrink-0">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="draft">{t('qh.draft')} ({draftCount})</TabsTrigger>
              <TabsTrigger value="sent">{t('qh.formal')} ({formalCount})</TabsTrigger>
            </TabsList>
          </Tabs>

          <ScrollArea className="flex-1 min-h-0">
            {filteredQuotations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />{t('qh.noQuotations')}
              </div>
            ) : (
              <div className="space-y-2 p-1">
                {filteredQuotations.map(q => {
                  const isExpanded = expandedId === q.id;
                  const qVersions = getVersionsForQuotation(q.id);
                  return (
                    <Collapsible key={q.id} open={isExpanded} onOpenChange={(o) => setExpandedId(o ? q.id : null)}>
                      <Card className="overflow-hidden">
                        <CardContent className="p-0">
                          {/* Main row */}
                          <div className="flex items-center gap-3 px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-mono font-medium text-sm">{q.projectNo}</span>
                                <Badge variant={getStatus(q.status).variant} className="text-[10px] h-5">{getStatus(q.status).label}</Badge>
                                {q.id === currentQuotationId && qVersions.length > 0 && (
                                  <Badge variant="outline" className="text-[10px] h-5 font-mono">v{qVersions.length}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {q.customerName && <span className="truncate max-w-[120px]">{q.customerName}</span>}
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(q.quotationDate), 'yyyy-MM-dd')}</span>
                              </div>
                            </div>
                            <span className="font-mono font-semibold text-primary text-sm whitespace-nowrap">{formatPrice(q.grandTotal)}</span>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={t('common.load')} onClick={() => handleLoad(q)}><Copy className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title={t('common.delete')} onClick={() => setDeleteId(q.id)}><Trash2 className="w-4 h-4" /></Button>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>
                          {/* Expanded: version history */}
                          <CollapsibleContent>
                            <div className="px-4 pb-3 pt-1 border-t border-border">
                              {renderVersionSection(q.id)}
                            </div>
                          </CollapsibleContent>
                        </CardContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Version Compare Dialog */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><GitCompare className="w-5 h-5" />{t('qh.versionCompare')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {[0, 1].map(idx => (
              <div key={idx}>
                <label className="text-sm font-medium">{t('qh.versionLabel')} {idx === 0 ? 'A' : 'B'}</label>
                <Select value={(idx === 0 ? selectedV1 : selectedV2) || ''} onValueChange={idx === 0 ? setSelectedV1 : setSelectedV2}>
                  <SelectTrigger><SelectValue placeholder={t('qh.selectVersion')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">{t('qh.currentVersion')}</SelectItem>
                    {versions.map(v => <SelectItem key={v.id} value={v.id}>{t('qh.versionLabel')} {v.versionNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {comparison && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <div className="text-sm text-muted-foreground">{t('qh.priceDiff')}</div>
                  <div className={`text-lg font-semibold ${comparison.totalDiff >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {comparison.totalDiff >= 0 ? '+' : ''}{formatCurrency(comparison.totalDiff)}
                  </div>
                </div>
                {comparison.added.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-600"><span className="w-2 h-2 rounded-full bg-green-500" />{t('qh.addedItems')} ({comparison.added.length})</div>
                    {comparison.added.map(item => (
                      <div key={item.id} className="p-2 rounded border border-green-200 bg-green-50/50 dark:bg-green-950/20 text-sm">
                        <div className="font-medium">{item.nameZh}</div>
                        <div className="text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.lineTotal)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {comparison.removed.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-destructive"><span className="w-2 h-2 rounded-full bg-destructive" />{t('qh.removedItems')} ({comparison.removed.length})</div>
                    {comparison.removed.map(item => (
                      <div key={item.id} className="p-2 rounded border border-red-200 bg-red-50/50 dark:bg-red-950/20 text-sm">
                        <div className="font-medium line-through">{item.nameZh}</div>
                        <div className="text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.lineTotal)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {comparison.changed.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-500" />{t('qh.changedItems')} ({comparison.changed.length})</div>
                    {comparison.changed.map(({ item, oldItem }) => (
                      <div key={item.id} className="p-2 rounded border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 text-sm">
                        <div className="font-medium">{item.nameZh}</div>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="text-muted-foreground"><span className="line-through">{oldItem.quantity} × {formatCurrency(oldItem.unitPrice)}</span></div>
                          <div className="font-medium">{item.quantity} × {formatCurrency(item.unitPrice)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {comparison.added.length === 0 && comparison.removed.length === 0 && comparison.changed.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">{t('qh.noDiff')}</div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('qh.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('qh.deleteDesc')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
