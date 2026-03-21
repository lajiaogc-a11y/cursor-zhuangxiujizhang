import { useState, useCallback, useMemo, useRef } from 'react';
import { 
  QuotationItem, 
  Product, 
  CompanySettings, 
  QuotationSummary,
  CostAnalysis,
  PriceTier,
} from '@/types/quotation';
import { defaultSettings } from '@/data/defaultSettings';
import { useGlobalExchangeRates } from '@/hooks/useGlobalExchangeRates';
import * as qs from '@/services/quotation.service';

const DRAFT_KEY = 'quotation_draft';

function getInitialState() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.items?.length > 0) {
        return {
          items: parsed.items as QuotationItem[],
          settings: parsed.settings || defaultSettings,
          projectNo: parsed.projectNo || '',
          quotationDate: parsed.quotationDate || new Date().toISOString().split('T')[0],
          selectedCustomerId: parsed.customerId,
          quotationNotes: parsed.quotationNotes || '',
          quotationNotesEn: parsed.quotationNotesEn || '',
          costAnalysis: parsed.costAnalysis || { estimatedCost: 0, targetProfitRate: 30, estimatedProfit: 0, actualProfitRate: 0 },
          hasInitialData: true,
        };
      }
    }
  } catch { /* ignore */ }
  return {
    items: [] as QuotationItem[],
    settings: defaultSettings,
    projectNo: '',
    quotationDate: new Date().toISOString().split('T')[0],
    selectedCustomerId: undefined as string | undefined,
    quotationNotes: '',
    quotationNotesEn: '',
    costAnalysis: { estimatedCost: 0, targetProfitRate: 30, estimatedProfit: 0, actualProfitRate: 0 },
    hasInitialData: false,
  };
}

export function useQuotationState() {
  const initialStateRef = useRef(getInitialState());
  const initial = initialStateRef.current;
  const { rates: exchangeRates } = useGlobalExchangeRates();
  const serverSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [items, setItems] = useState<QuotationItem[]>(initial.items);
  const [settings, setSettings] = useState<CompanySettings>(initial.settings);
  const [projectNo, setProjectNo] = useState<string>(initial.projectNo);
  const [quotationDate, setQuotationDate] = useState<string>(initial.quotationDate);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(initial.selectedCustomerId);
  const [quotationNotes, setQuotationNotes] = useState<string>(initial.quotationNotes);
  const [quotationNotesEn, setQuotationNotesEn] = useState<string>(initial.quotationNotesEn);
  const [currentQuotationId, setCurrentQuotationId] = useState<string | undefined>();
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis>(initial.costAnalysis);
  const [hasInitialData] = useState(initial.hasInitialData);

  const addItem = useCallback((product: Product, priceTier?: PriceTier) => {
    const tier = priceTier || 'normal';
    const price = tier === 'normal' ? (product.priceNormal ?? product.unitPrice) :
                  tier === 'medium' ? (product.priceMedium ?? product.unitPrice) :
                  (product.priceAdvanced ?? product.unitPrice);
    
    const newItem: QuotationItem = {
      id: `item-${Date.now()}`,
      productId: product.id,
      nameZh: product.nameZh,
      nameEn: product.nameEn,
      unit: product.unit,
      quantity: 1,
      unitPrice: price,
      originalUnitPrice: price,
      lineTotal: price,
      lineTotalUSD: price * exchangeRates.usd,
      lineTotalCNY: price * exchangeRates.cny,
      category: product.category,
      priceTier: tier,
      description: product.description,
      descriptionEn: product.descriptionEn,
    };
    setItems(prev => [...prev, newItem]);
  }, [exchangeRates]);

  const updateItem = useCallback((id: string, updates: Partial<QuotationItem>) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const u = { ...item, ...updates };
          u.lineTotal = u.quantity * u.unitPrice;
          u.lineTotalUSD = u.lineTotal * exchangeRates.usd;
          u.lineTotalCNY = u.lineTotal * exchangeRates.cny;
          return u;
        }
        return item;
      })
    );
  }, [exchangeRates]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearServerDraftFn = useCallback(async (userId?: string) => {
    if (!userId) return;
    await qs.clearServerDraft(userId);
  }, []);

  const clearItems = useCallback((userId?: string) => {
    setItems([]);
    setProjectNo('');
    setSelectedCustomerId(undefined);
    setQuotationNotes('');
    setQuotationNotesEn('');
    setCurrentQuotationId(undefined);
    setCostAnalysis({ estimatedCost: 0, targetProfitRate: 30, estimatedProfit: 0, actualProfitRate: 0 });
    localStorage.removeItem(DRAFT_KEY);
    if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
    clearServerDraftFn(userId);
  }, [clearServerDraftFn]);

  const reorderItems = useCallback((newItems: QuotationItem[]) => {
    setItems(newItems);
  }, []);

  const batchUpdateItems = useCallback((updates: { id: string; unitPrice: number }[]) => {
    setItems(prev =>
      prev.map(item => {
        const update = updates.find(u => u.id === item.id);
        if (update) {
          const u = { ...item, unitPrice: update.unitPrice };
          if (!u.originalUnitPrice) u.originalUnitPrice = item.unitPrice;
          u.lineTotal = u.quantity * u.unitPrice;
          u.lineTotalUSD = u.lineTotal * exchangeRates.usd;
          u.lineTotalCNY = u.lineTotal * exchangeRates.cny;
          return u;
        }
        return item;
      })
    );
  }, [exchangeRates]);

  const updateItemNote = useCallback((id: string, note: string) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, note } : item)));
  }, []);

  const loadQuotation = useCallback((data: any) => {
    if (data.items) setItems(data.items);
    if (data.projectNo !== undefined) setProjectNo(data.projectNo || '');
    if (data.quotationDate !== undefined) setQuotationDate(data.quotationDate || new Date().toISOString().split('T')[0]);
    setSelectedCustomerId(data.customerId || undefined);
    if (data.id !== undefined) setCurrentQuotationId(data.id);
    setQuotationNotes(data.quotationNotes || '');
    setQuotationNotesEn(data.quotationNotesEn || '');
    if (data.settings) setSettings(data.settings);
    if (data.costAnalysis) setCostAnalysis(data.costAnalysis);
  }, []);

  // Auto-save draft (localStorage + debounced server sync)
  const saveDraft = useCallback((userId?: string) => {
    if (items.length === 0) return;
    const payload = {
      projectNo, quotationDate, customerId: selectedCustomerId,
      items, settings, costAnalysis, quotationNotes, quotationNotesEn,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch { /* ignore */ }
    // Debounced server save
    if (userId) {
      if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
      serverSaveTimerRef.current = setTimeout(() => {
        qs.saveServerDraft(userId, payload);
      }, 3000);
    }
  }, [items, projectNo, quotationDate, selectedCustomerId, settings, costAnalysis, quotationNotes, quotationNotesEn]);

  const loadServerDraftFn = useCallback(async (userId: string) => {
    return qs.loadServerDraft(userId);
  }, []);

  const summary: QuotationSummary = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = settings.taxSettings.enableDiscount ? settings.taxSettings.discountAmount : 0;
    const grandTotal = subtotal - discount;
    return {
      subtotal,
      subtotalUSD: subtotal * exchangeRates.usd,
      subtotalCNY: subtotal * exchangeRates.cny,
      discount,
      grandTotal,
      grandTotalUSD: grandTotal * exchangeRates.usd,
      grandTotalCNY: grandTotal * exchangeRates.cny,
      depositAmount: grandTotal * (settings.paymentTerms.deposit / 100),
      progressAmount: grandTotal * (settings.paymentTerms.progress / 100),
      finalAmount: grandTotal * (settings.paymentTerms.final / 100),
    };
  }, [items, settings, exchangeRates]);

  return {
    items, settings, projectNo, quotationDate, costAnalysis, summary,
    selectedCustomerId, quotationNotes, quotationNotesEn, currentQuotationId,
    hasInitialData, exchangeRates,
    setSettings, setProjectNo, setQuotationDate, setCostAnalysis,
    setSelectedCustomerId, setQuotationNotes, setQuotationNotesEn, setCurrentQuotationId,
    addItem, updateItem, updateItemNote, removeItem, clearItems,
    loadQuotation, batchUpdateItems, reorderItems, saveDraft,
    loadServerDraft: loadServerDraftFn, clearServerDraft: clearServerDraftFn,
  };
}
