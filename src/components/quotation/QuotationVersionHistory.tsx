import { useState } from 'react';
import { History, GitCompare, RotateCcw, ChevronDown, Calendar, FileText } from 'lucide-react';
import { QuotationVersion } from '@/hooks/useQQuotations';
import { QuotationItem } from '@/types/quotation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';

interface Props {
  versions: QuotationVersion[];
  currentItems: QuotationItem[];
  onRestoreVersion: (version: QuotationVersion) => void;
  loading?: boolean;
  projectNo?: string;
  quotationDate?: string;
}

export function QuotationVersionHistory({ versions, currentItems, onRestoreVersion, loading, projectNo, quotationDate }: Props) {
  const { t } = useI18n();
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedV1, setSelectedV1] = useState<string | null>(null);
  const [selectedV2, setSelectedV2] = useState<string | null>(null);

  const formatDate = (ds: string) => new Date(ds).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const formatCurrency = (a: number) => `RM ${a.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

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

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" disabled={versions.length === 0} className="h-7 gap-1.5 px-2.5 text-xs">
          <History className="w-3.5 h-3.5" />版本
          {versions.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1">{versions.length}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><History className="w-5 h-5" />版本历史</SheetTitle>
          {projectNo && (
            <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <div><div className="text-xs text-muted-foreground">当前报价单</div><div className="font-semibold text-primary">{projectNo}</div></div>
                {quotationDate && <div className="text-right"><div className="text-xs text-muted-foreground">日期</div><div className="text-sm">{quotationDate}</div></div>}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">共 {versions.length} 个历史版本 · 当前 {currentItems.length} 个项目</div>
            </div>
          )}
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full"><GitCompare className="w-4 h-4 mr-1" />版本对比</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><GitCompare className="w-5 h-5" />版本对比</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                {(['selectedV1', 'selectedV2'] as const).map((key, idx) => (
                  <div key={key}>
                    <label className="text-sm font-medium">版本 {idx === 0 ? 'A' : 'B'}</label>
                    <Select value={(idx === 0 ? selectedV1 : selectedV2) || ''} onValueChange={idx === 0 ? setSelectedV1 : setSelectedV2}>
                      <SelectTrigger><SelectValue placeholder="选择版本" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">当前版本</SelectItem>
                        {versions.map(v => <SelectItem key={v.id} value={v.id}>版本 {v.versionNumber}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              {comparison && (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <div className="text-sm text-muted-foreground">总价差异</div>
                      <div className={`text-lg font-semibold ${comparison.totalDiff >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {comparison.totalDiff >= 0 ? '+' : ''}{formatCurrency(comparison.totalDiff)}
                      </div>
                    </div>
                    {comparison.added.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-600"><span className="w-2 h-2 rounded-full bg-green-500" />新增项目 ({comparison.added.length})</div>
                        {comparison.added.map(item => (
                          <div key={item.id} className="p-2 rounded border border-green-200 bg-green-50/50 text-sm">
                            <div className="font-medium">{item.nameZh}</div>
                            <div className="text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.lineTotal)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {comparison.removed.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-destructive"><span className="w-2 h-2 rounded-full bg-destructive" />删除项目 ({comparison.removed.length})</div>
                        {comparison.removed.map(item => (
                          <div key={item.id} className="p-2 rounded border border-red-200 bg-red-50/50 text-sm">
                            <div className="font-medium line-through">{item.nameZh}</div>
                            <div className="text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.lineTotal)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {comparison.changed.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-500" />修改项目 ({comparison.changed.length})</div>
                        {comparison.changed.map(({ item, oldItem }) => (
                          <div key={item.id} className="p-2 rounded border border-amber-200 bg-amber-50/50 text-sm">
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
                      <div className="text-center py-8 text-muted-foreground">两个版本没有差异</div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </DialogContent>
          </Dialog>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-2">
              {loading ? (
                <AppSectionLoading label={t('common.loading')} compact />
              ) : versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无历史版本<p className="text-sm mt-1">保存报价单时会自动创建版本</p></div>
              ) : (
                versions.map(version => (
                  <Collapsible key={version.id}>
                    <div className="p-3 rounded-lg border bg-card hover:bg-secondary/30 transition-colors">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">v{version.versionNumber}</Badge>
                            <div>
                              <div className="font-medium">{formatCurrency(version.grandTotal)}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(version.createdAt)}</div>
                            </div>
                          </div>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {version.changeDescription && (
                            <div className="text-sm text-muted-foreground flex items-start gap-2"><FileText className="w-4 h-4 mt-0.5" />{version.changeDescription}</div>
                          )}
                          <div className="text-sm"><span className="text-muted-foreground">项目数: </span>{version.items.length}</div>
                          <Button variant="outline" size="sm" onClick={() => onRestoreVersion(version)} className="w-full mt-2">
                            <RotateCcw className="w-4 h-4 mr-1" />恢复此版本
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
