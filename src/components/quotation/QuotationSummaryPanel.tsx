import React from 'react';
import { Calculator, TrendingUp, Percent, ChevronUp, ChevronDown, RotateCcw, BookOpen, Tag } from 'lucide-react';
import { QuotationSummary, CompanySettings, CostAnalysis, QuotationItem } from '@/types/quotation';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useQuery } from '@tanstack/react-query';
import { fetchQuotationNotesTemplates } from '@/services/admin.service';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface SummaryPanelProps {
  summary: QuotationSummary;
  settings: CompanySettings;
  costAnalysis: CostAnalysis;
  quotationNotes?: string;
  quotationNotesEn?: string;
  onNotesChange?: (notes: string, notesEn?: string) => void;
  items?: QuotationItem[];
  onBatchUpdate?: (updates: { id: string; unitPrice: number }[]) => void;
  onDiscountChange?: (enabled: boolean, amount: number) => void;
  onPaymentTermsChange?: (paymentTerms: CompanySettings['paymentTerms']) => void;
}

export function QuotationSummaryPanel({
  summary, settings, costAnalysis, quotationNotes = '', quotationNotesEn = '',
  onNotesChange, items = [], onBatchUpdate, onDiscountChange, onPaymentTermsChange,
}: SummaryPanelProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [adjustmentType, setAdjustmentType] = React.useState<'increase' | 'decrease'>('increase');
  const [percentage, setPercentage] = React.useState<string>('10');
  const [scope, setScope] = React.useState<string>('all');
  const { categories: dbCategories } = useProductCategories();

  // Load note templates
  const { data: noteTemplates = [] } = useQuery({
    queryKey: ['q_quotation_notes_templates'],
    queryFn: fetchQuotationNotesTemplates,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const formatCurrency = (amount: number) => `RM ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const categoriesWithItems = React.useMemo(() => {
    const codes = new Set<string>();
    items.forEach(item => codes.add((item.category as string) || 'others'));
    return dbCategories.map(c => c.code).filter(code => codes.has(code));
  }, [items, dbCategories]);

  const categoryMap = React.useMemo(() => {
    const map: Record<string, { code: string; zh: string; en: string }> = {};
    dbCategories.forEach(cat => { map[cat.code] = { code: cat.code, zh: cat.name_zh, en: cat.name_en }; });
    return map;
  }, [dbCategories]);

  const getAffectedItems = () => scope === 'all' ? items : items.filter(item => (item.category || 'others') === scope);
  const getPercentageValue = () => { const v = parseFloat(percentage); return isNaN(v) ? 0 : v; };

  const calculatePreview = () => {
    const affected = getAffectedItems();
    const percentVal = getPercentageValue();
    const multiplier = adjustmentType === 'increase' ? 1 + (percentVal / 100) : 1 - (percentVal / 100);
    const currentTotal = affected.reduce((sum, item) => sum + item.lineTotal, 0);
    const newTotal = affected.reduce((sum, item) => {
      const basePrice = item.originalUnitPrice ?? item.unitPrice;
      return sum + (Math.round(basePrice * multiplier * 100) / 100 * item.quantity);
    }, 0);
    return { itemCount: affected.length, currentTotal, newTotal, difference: newTotal - currentTotal };
  };

  const handleApplyBatchPrice = () => {
    if (!onBatchUpdate) return;
    const affected = getAffectedItems();
    if (affected.length === 0) { toast({ title: '没有可调整的项目', variant: 'destructive' }); return; }
    const percentVal = getPercentageValue();
    const multiplier = adjustmentType === 'increase' ? 1 + (percentVal / 100) : 1 - (percentVal / 100);
    const updates = affected.map(item => ({
      id: item.id,
      unitPrice: Math.round((item.originalUnitPrice ?? item.unitPrice) * multiplier * 100) / 100,
    }));
    onBatchUpdate(updates);
    toast({ title: '批量调价完成', description: `已${adjustmentType === 'increase' ? '上调' : '下调'} ${affected.length} 个项目 ${percentVal}%` });
  };

  const handleRestoreOriginal = () => {
    if (!onBatchUpdate) return;
    const affected = getAffectedItems();
    const updates = affected.map(item => ({ id: item.id, unitPrice: item.originalUnitPrice ?? item.unitPrice }));
    onBatchUpdate(updates);
    toast({ title: '已恢复原价' });
  };

  const preview = calculatePreview();

  const paymentTotalPct = (settings.paymentTerms?.deposit ?? 0) + (settings.paymentTerms?.progress ?? 0) + (settings.paymentTerms?.final ?? 0);
  const paymentPctOk = Math.abs(paymentTotalPct - 100) < 0.001;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-semibold text-sm">报价汇总</h3>
      </div>

      {/* Totals */}
      <Card className="border-0 shadow-sm bg-secondary/30">
        <CardContent className="pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">小计</span>
            <span className="font-semibold">{formatCurrency(summary.subtotal)}</span>
          </div>

          {/* Discount Controls */}
          {onDiscountChange && (
            <div className="space-y-2 p-2 rounded-lg bg-background/50 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs font-medium">折扣</span>
                </div>
                <Switch
                  checked={settings.taxSettings.enableDiscount}
                  onCheckedChange={(checked) => onDiscountChange(checked, settings.taxSettings.discountAmount || 0)}
                  className="scale-75"
                />
              </div>
              {settings.taxSettings.enableDiscount && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground shrink-0">金额</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.taxSettings.discountAmount || 0}
                    onChange={(e) => onDiscountChange(true, parseFloat(e.target.value) || 0)}
                    className="h-7 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {settings.taxSettings.enableDiscount && summary.discount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">折扣 Discount</span>
              <span className="font-semibold text-red-500">{formatCurrency(summary.discount)}</span>
            </div>
          )}
          <Separator />
          <div className="py-3">
            <span className="font-bold text-base mb-2 block">总计 TOTAL</span>
            <div className="text-2xl md:text-3xl font-bold text-primary mb-3">{formatCurrency(summary.grandTotal)}</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
                <span className="text-muted-foreground font-medium text-xs">$</span>
                <span className="text-sm font-medium truncate">
                  {summary.grandTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
                <span className="text-muted-foreground font-medium text-xs">¥</span>
                <span className="text-sm font-medium truncate">
                  {summary.grandTotalCNY.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Price Adjustment */}
      {onBatchUpdate && items.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="batch-price" className="border-0">
            <Card className="border-0 shadow-sm bg-secondary/30">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium">批量调价</span>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">调整方式</Label>
                    <RadioGroup value={adjustmentType} onValueChange={v => setAdjustmentType(v as any)} className="flex gap-3">
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="increase" id="sp-inc" />
                        <Label htmlFor="sp-inc" className="flex items-center gap-1 cursor-pointer text-xs"><ChevronUp className="w-3 h-3 text-green-600" />上调</Label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="decrease" id="sp-dec" />
                        <Label htmlFor="sp-dec" className="flex items-center gap-1 cursor-pointer text-xs"><ChevronDown className="w-3 h-3 text-destructive" />下调</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">百分比</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min="0" max="100" step="0.1" value={percentage} onChange={e => setPercentage(e.target.value)} className="w-20 h-7 text-sm" />
                      <span className="text-muted-foreground text-sm">%</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {[0, 5, 10, 15, 20].map(p => (
                        <Button key={p} variant={getPercentageValue() === p ? 'default' : 'outline'} size="sm" onClick={() => setPercentage(p.toString())} className="h-6 px-2 text-xs">{p}%</Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">范围</Label>
                    <Select value={scope} onValueChange={setScope}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all"><span className="flex items-center gap-1.5">全部项目 <Badge variant="secondary" className="text-[10px]">{items.length}</Badge></span></SelectItem>
                        {categoriesWithItems.map(cat => {
                          const count = items.filter(item => (item.category || 'others') === cat).length;
                          const label = categoryMap[cat];
                          return (
                            <SelectItem key={cat} value={cat}>
                              <span className="flex items-center gap-1.5">
                                <Badge variant="outline" className="font-mono text-[10px]">{label?.code || cat}</Badge>
                                {label?.zh || cat}
                                <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-2 rounded-lg bg-background/50 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">调整项目</span><span className="font-medium">{preview.itemCount}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">差额</span><span className={`font-semibold ${preview.difference >= 0 ? 'text-green-600' : 'text-destructive'}`}>{preview.difference >= 0 ? '+' : ''}{formatCurrency(preview.difference)}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleRestoreOriginal}><RotateCcw className="w-3 h-3 mr-1" />恢复原价</Button>
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleApplyBatchPrice}>应用调价</Button>
                  </div>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>
      )}

      {/* Payment Terms */}
      <Card className="border-0 shadow-sm bg-secondary/30">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">付款条款</span>
            {!paymentPctOk && <Badge variant="destructive" className="text-[10px]">≠100%</Badge>}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">订金 ({settings.paymentTerms.deposit}%)</span><span className="font-medium">{formatCurrency(summary.depositAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">进度款 ({settings.paymentTerms.progress}%)</span><span className="font-medium">{formatCurrency(summary.progressAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">尾款 ({settings.paymentTerms.final}%)</span><span className="font-medium">{formatCurrency(summary.finalAmount)}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {onNotesChange && (
        <Card className="border-0 shadow-sm bg-secondary/30">
          <CardContent className="pt-4 space-y-3">
            {/* Template Selector */}
            {noteTemplates.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />选择备注模板
                  </Label>
                  <a href="/quotation/templates" className="text-[10px] text-primary hover:underline">管理模板</a>
                </div>
                <Select onValueChange={(templateId) => {
                  const tpl = noteTemplates.find((t: any) => t.id === templateId);
                  if (tpl) {
                    onNotesChange(
                      quotationNotes ? quotationNotes + '\n' + tpl.content : tpl.content,
                      tpl.contentEn ? (quotationNotesEn ? quotationNotesEn + '\n' + tpl.contentEn : tpl.contentEn) : quotationNotesEn,
                    );
                  }
                }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="点击选择模板插入备注..." />
                  </SelectTrigger>
                  <SelectContent>
                    {noteTemplates.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{t.title}</span>
                          <span className="text-muted-foreground text-[10px] line-clamp-1">{t.content}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Separator className="my-1" />
            <Label className="text-xs font-medium">报价备注（中文）</Label>
            <Textarea value={quotationNotes} onChange={e => onNotesChange(e.target.value, quotationNotesEn)} placeholder="输入中文备注..." rows={3} className="text-sm" />
            <Label className="text-xs font-medium">报价备注（英文）</Label>
            <Textarea value={quotationNotesEn} onChange={e => onNotesChange(quotationNotes, e.target.value)} placeholder="Enter English notes..." rows={3} className="text-sm" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
