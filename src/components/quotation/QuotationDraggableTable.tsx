import React, { useState, useMemo } from 'react';
import { Trash2, ChevronDown, ChevronRight, GripVertical, RotateCcw, Edit2, X, Check, FileText } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { QuotationItem, UNIT_LABELS } from '@/types/quotation';
import type { GlobalExchangeRates } from '@/hooks/useGlobalExchangeRates';
import { useProductCategories } from '@/hooks/useProductCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';

type DisplayCurrency = 'MYR' | 'USD' | 'CNY';

const formatCurrencyAmount = (amount: number, currency: DisplayCurrency, rates: GlobalExchangeRates) => {
  const symbols = { MYR: 'RM', USD: '$', CNY: '¥' };
  const converted = currency === 'USD' ? amount * rates.usd : currency === 'CNY' ? amount * rates.cny : amount;
  return `${symbols[currency]} ${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface Props {
  items: QuotationItem[];
  exchangeRates: GlobalExchangeRates;
  displayCurrency?: DisplayCurrency;
  onUpdateItem: (id: string, updates: Partial<QuotationItem>) => void;
  onRemoveItem: (id: string) => void;
  onReorderItems: (items: QuotationItem[]) => void;
  onClear?: () => void;
}

// Mobile item component
function MobileItem({ item, itemNumber, exchangeRates, displayCurrency = 'MYR' as DisplayCurrency, onUpdateItem, onRemoveItem, dragHandleProps }: {
  item: QuotationItem; itemNumber: number; exchangeRates: GlobalExchangeRates; displayCurrency: DisplayCurrency;
  onUpdateItem: (id: string, updates: Partial<QuotationItem>) => void;
  onRemoveItem: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState(item.quantity);
  const [editPrice, setEditPrice] = useState(item.unitPrice);
  const [editDesc, setEditDesc] = useState(item.description || '');
  const formatPrice = (a: number) => formatCurrencyAmount(a, displayCurrency, exchangeRates);

  const handleStartEdit = () => { setEditQty(item.quantity); setEditPrice(item.unitPrice); setEditDesc(item.description || ''); setIsEditing(true); };
  const handleSave = () => { onUpdateItem(item.id, { quantity: editQty, unitPrice: editPrice, description: editDesc }); setIsEditing(false); };

  if (isEditing) {
    return (
      <div className="bg-card border-2 border-primary/30 rounded-2xl p-3.5 space-y-3 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{item.nameZh}</p>
            {item.nameEn && <p className="text-[11px] text-muted-foreground truncate">{item.nameEn}</p>}
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setIsEditing(false)}><X className="w-4 h-4" /></Button>
            <Button size="icon" className="h-8 w-8 rounded-lg" onClick={handleSave}><Check className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">数量</label>
            <Input type="number" min="0" value={editQty} onChange={e => setEditQty(parseFloat(e.target.value) || 0)} className="mt-1 h-10 text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">单价</label>
            <Input type="number" min="0" value={editPrice} onChange={e => setEditPrice(parseFloat(e.target.value) || 0)} className="mt-1 h-10 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase">材料说明</label>
          <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="材料及施工说明..." className="mt-1 min-h-[60px] text-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 touch-none shrink-0 mt-0.5 opacity-40"><GripVertical className="w-4 h-4" /></div>
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary">{itemNumber}</span>
          </div>
          <div className="flex-1 min-w-0 mr-2">
            <p className="font-medium text-[13px] leading-tight truncate">{item.nameZh}</p>
            {item.nameEn && item.nameEn !== item.nameZh && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.nameEn}</p>}
          </div>
          <span className="font-bold text-sm text-primary shrink-0 tabular-nums">{formatPrice(item.lineTotal)}</span>
        </div>
        <div className="flex items-center justify-between mt-2 pl-[52px]">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="font-medium tabular-nums">×{item.quantity}</span>
            <span className="text-border">·</span>
            <span className="px-1.5 py-px rounded-md bg-secondary text-[10px] font-medium">{UNIT_LABELS[item.unit]?.zh || item.unit}</span>
            <span className="text-border">·</span>
            <span className="tabular-nums">@{formatPrice(item.unitPrice)}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1 rounded-lg hover:bg-primary/10" onClick={handleStartEdit}>
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
        {item.description && (
          <div className="mt-2 pl-[52px]">
            <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5 line-clamp-2 border border-border/30">{item.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableMobileItem(props: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <MobileItem {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function SortableDesktopRow({ item, itemNumber, exchangeRates, displayCurrency = 'MYR' as DisplayCurrency, onUpdateItem, onRemoveItem }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const formatPrice = (a: number) => formatCurrencyAmount(a, displayCurrency, exchangeRates);

  return (
    <tr ref={setNodeRef} style={style} className="group">
      <td className="text-center !p-2"><div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-secondary rounded inline-flex"><GripVertical className="w-4 h-4 text-muted-foreground" /></div></td>
      <td className="text-center font-medium text-muted-foreground !p-2">{itemNumber}</td>
      <td className="!p-2"><p className="font-medium text-sm truncate">{item.nameZh}</p><p className="text-xs text-muted-foreground truncate">{item.nameEn}</p></td>
      <td className="text-center hidden md:table-cell !p-2"><span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary">{UNIT_LABELS[item.unit]?.zh || item.unit}</span></td>
      <td className="text-center !p-2"><Input type="number" min="0" value={item.quantity} onChange={e => onUpdateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })} className="w-full text-center text-sm h-8" /></td>
      <td className="text-center !p-2"><Input type="number" min="0" value={item.unitPrice} onChange={e => onUpdateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })} className="w-full text-center text-sm h-8" /></td>
      <td className="text-right font-semibold text-primary whitespace-nowrap !p-2">{formatPrice(item.lineTotal)}</td>
      <td className="!p-2 max-w-[200px]">
        {item.description ? (
          <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line" title={item.description}>{item.description}</p>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="text-center !p-2">
        <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
      </td>
    </tr>
  );
}

export function QuotationDraggableTable({ items, exchangeRates, displayCurrency = 'MYR', onUpdateItem, onRemoveItem, onReorderItems, onClear }: Props) {
  const isMobile = useIsMobile();
  const { categories: dbCategories } = useProductCategories();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const categoryOrder = useMemo(() => dbCategories.length > 0 ? dbCategories.map(c => c.code) : [], [dbCategories]);
  const categoryLabels = useMemo(() => {
    const labels: Record<string, { zh: string; en: string; code: string }> = {};
    dbCategories.forEach(c => { labels[c.code] = { zh: c.name_zh, en: c.name_en, code: c.code }; });
    return labels;
  }, [dbCategories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const formatPrice = (a: number) => formatCurrencyAmount(a, displayCurrency as DisplayCurrency, exchangeRates);

  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, QuotationItem[]> = {};
    categoryOrder.forEach(cat => { grouped[cat] = []; });
    grouped['others'] = [];
    items.forEach(item => {
      const cat = item.category || 'others';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return grouped;
  }, [items, categoryOrder]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const getCategoryTotal = (cat: string) => (itemsByCategory[cat] || []).reduce((sum, item) => sum + item.lineTotal, 0);

  const handleDragEnd = (event: DragEndEvent, category: string) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const catItems = itemsByCategory[category];
      const oldIndex = catItems.findIndex(item => item.id === active.id);
      const newIndex = catItems.findIndex(item => item.id === over.id);
      const reordered = arrayMove(catItems, oldIndex, newIndex);
      const newItems: QuotationItem[] = [];
      categoryOrder.forEach(cat => { newItems.push(...(cat === category ? reordered : (itemsByCategory[cat] || []))); });
      if (itemsByCategory['others']?.length) newItems.push(...itemsByCategory['others']);
      onReorderItems(newItems);
    }
  };

  const categoryStartNumbers = useMemo(() => {
    const map: Record<string, number> = {};
    let counter = 0;
    [...categoryOrder, 'others'].forEach(cat => {
      const count = (itemsByCategory[cat] || []).length;
      if (count > 0) { map[cat] = counter + 1; counter += count; }
    });
    return map;
  }, [categoryOrder, itemsByCategory]);

  if (items.length === 0) {
    return (
      <Card><CardContent className="py-16 text-center">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">报价单为空，请从左侧产品目录添加产品</p>
      </CardContent></Card>
    );
  }

  const categoriesToRender = [...categoryOrder, 'others'].filter(cat => (itemsByCategory[cat]?.length || 0) > 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>报价明细</span>
            <span className="text-sm font-normal text-muted-foreground">{items.length} 项</span>
            <div className="ml-auto">
              {onClear && <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)} className="h-7 text-xs text-destructive"><RotateCcw className="w-3.5 h-3.5 mr-1" />清空</Button>}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {categoriesToRender.map(cat => {
              const catItems = itemsByCategory[cat] || [];
              const isCollapsed = collapsedCategories.has(cat);
              const label = categoryLabels[cat] || { zh: cat === 'others' ? '其他工程' : cat, en: cat, code: cat };
              const startNum = categoryStartNumbers[cat] || 1;

              return (
                <div key={cat} className="rounded-xl border border-border/60 overflow-hidden bg-card/50">
                  <Collapsible open={!isCollapsed} onOpenChange={() => toggleCategory(cat)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between px-3 py-2.5 bg-secondary/70 hover:bg-secondary cursor-pointer transition-colors border-b border-border/40">
                        <div className="flex items-center gap-2.5">
                          {isCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary bg-primary/10">{label.code}</Badge>
                          <span className="font-semibold text-sm">{label.zh}</span>
                          <Badge variant="secondary" className="text-xs">{catItems.length}</Badge>
                        </div>
                        <span className="font-bold text-sm text-primary">{formatPrice(getCategoryTotal(cat))}</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, cat)}>
                        <SortableContext items={catItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                          {isMobile ? (
                            <div className="space-y-2 mt-2">
                              {catItems.map((item, idx) => (
                                <SortableMobileItem key={item.id} item={item} itemNumber={startNum + idx} exchangeRates={exchangeRates} displayCurrency={displayCurrency} onUpdateItem={onUpdateItem} onRemoveItem={onRemoveItem} />
                              ))}
                            </div>
                          ) : (
                            <div className="mt-0">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-muted-foreground text-xs border-b border-border/50 bg-muted/30">
                                    <th className="w-8 !p-2"></th>
                                    <th className="w-8 !p-2">#</th>
                                    <th className="text-left !p-2">项目名称</th>
                                    <th className="w-16 hidden md:table-cell !p-2">单位</th>
                                    <th className="w-20 !p-2">数量</th>
                                    <th className="w-24 !p-2">单价</th>
                                    <th className="w-28 text-right !p-2">小计</th>
                                    <th className="text-left !p-2">说明</th>
                                    <th className="w-10 !p-2">操作</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                  {catItems.map((item, idx) => (
                                    <SortableDesktopRow key={item.id} item={item} itemNumber={startNum + idx} exchangeRates={exchangeRates} displayCurrency={displayCurrency} onUpdateItem={onUpdateItem} onRemoveItem={onRemoveItem} />
                                  ))}
                                </tbody>
                              </table>
                              <div className="flex justify-end px-3 py-1.5 bg-muted/20 border-t border-border/30">
                                <span className="text-xs text-muted-foreground mr-2">{label.zh} 小计：</span>
                                <span className="text-sm font-semibold text-primary">{formatPrice(getCategoryTotal(cat))}</span>
                              </div>
                            </div>
                          )}
                        </SortableContext>
                      </DndContext>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空</AlertDialogTitle>
            <AlertDialogDescription>确定要清空当前报价单的所有项目吗？此操作无法撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowClearConfirm(false); onClear?.(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <RotateCcw className="w-4 h-4 mr-1" />确认清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
