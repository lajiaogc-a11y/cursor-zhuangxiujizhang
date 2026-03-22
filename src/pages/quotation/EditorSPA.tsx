import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useI18n } from '@/lib/i18n';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuotationState } from '@/hooks/useQuotationState';
import { useQProducts } from '@/hooks/useQProducts';
import { useQCustomers } from '@/hooks/useQCustomers';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useQQuotations, useQuotationVersions } from '@/hooks/useQQuotations';
import { QuotationProductSelector } from '@/components/quotation/QuotationProductSelector';
import { QuotationDraggableTable } from '@/components/quotation/QuotationDraggableTable';
import { QuotationSummaryPanel } from '@/components/quotation/QuotationSummaryPanel';
import { QuotationMobileInfo } from '@/components/quotation/QuotationMobileInfo';
// QuotationVersionHistory merged into QuotationHistoryDialog
import { QuotationSettingsDialog } from '@/components/quotation/QuotationSettingsDialog';
import { QuotationHistoryDialog } from '@/components/quotation/QuotationHistoryDialog';
// QuotationExportMenu removed from desktop toolbar - export via preview only
import { QuotationPrintPreview } from '@/components/quotation/QuotationPrintPreview';
import { ProductManagementDialog } from '@/components/quotation/ProductManagementDialog';
import { CustomerManagementDialog } from '@/components/quotation/CustomerManagementDialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  Building2, Save, Package, TrendingUp, FileText,
  ChevronLeft, ChevronRight, Calculator, Settings, Wrench,
  History, Home, Eye,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// companyLogo removed from desktop toolbar
export default function QuotationEditorSPA() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const { t } = useI18n();
  const { toast } = useToast();
  const { products } = useQProducts();
  const queryClient = useQueryClient();
  const { customers } = useQCustomers();
  const { settings: companySettings, loading: companySettingsLoading } = useCompanySettings();
  const { quotations, saveQuotation, deleteQuotation } = useQQuotations();

  const {
    items, settings, projectNo, quotationDate, costAnalysis, summary,
    selectedCustomerId, quotationNotes, quotationNotesEn, currentQuotationId,
    exchangeRates,
    setSettings, setProjectNo, setQuotationDate, setCostAnalysis,
    setSelectedCustomerId, setQuotationNotes, setQuotationNotesEn, setCurrentQuotationId,
    addItem, updateItem, removeItem, clearItems,
    batchUpdateItems, reorderItems, saveDraft, hasInitialData, loadQuotation,
    loadServerDraft, clearServerDraft,
  } = useQuotationState();

  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const serverDraftRef = useRef<any>(null);

  const [quotationNo, setQuotationNo] = useState<string>('');
  const lastSavedStateRef = useRef<string>('');

  const { versions, loading: versionsLoading } = useQuotationVersions(currentQuotationId);

  // Panel states
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [productMgmtOpen, setProductMgmtOpen] = useState(false);
  const [customerMgmtOpen, setCustomerMgmtOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Mobile states
  const [mobileTab, setMobileTab] = useState<'main' | 'tools' | 'summary' | 'settings'>('main');
  const [productsOpen, setProductsOpen] = useState(false);

  // Load company settings on first load
  useEffect(() => {
    if (!companySettingsLoading && companySettings && !hasInitialData && items.length === 0) {
      setSettings(companySettings);
    }
  }, [companySettingsLoading]); // eslint-disable-line

  // Server draft recovery on mount
  useEffect(() => {
    if (!user?.id || hasInitialData || items.length > 0) return;
    let cancelled = false;
    loadServerDraft(user.id).then(draft => {
      if (cancelled || !draft) return;
      serverDraftRef.current = draft;
      setShowRecoveryDialog(true);
    });
    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line

  // Load quotation from History page navigation
  useEffect(() => {
    const stateId = (location.state as any)?.quotationId;
    if (stateId && quotations.length > 0 && !currentQuotationId) {
      const q = quotations.find((q: any) => q.id === stateId);
      if (q) {
        loadQuotation({
          id: q.id, projectNo: q.projectNo, quotationDate: q.quotationDate,
          customerId: q.customerId, items: q.items, settings: q.settings,
          costAnalysis: q.costAnalysis, quotationNotes: q.quotationNotes, quotationNotesEn: q.notes,
        });
        setQuotationNo(q.quotationNo || '');
        toast({ title: t('qspa.quotationLoaded'), description: q.projectNo });
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, quotations]); // eslint-disable-line

  // Auto-generate project number
  useEffect(() => {
    if (!projectNo) {
      const now = new Date();
      const code = `FG${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}01`;
      setProjectNo(code);
    }
  }, []); // eslint-disable-line

  // Sync quotationNo into projectNo when saved
  useEffect(() => {
    if (quotationNo) {
      setProjectNo(quotationNo);
    }
  }, [quotationNo]); // eslint-disable-line

  // Auto-save draft
  useEffect(() => {
    if (items.length > 0) {
      const timer = setTimeout(() => saveDraft(user?.id), 500);
      return () => clearTimeout(timer);
    }
  }, [items, projectNo, quotationDate, selectedCustomerId, settings, costAnalysis, quotationNotes, saveDraft, user?.id]);

  const getStateSnapshot = useCallback((status?: string) => {
    return JSON.stringify({ items, settings, quotationNotes, quotationNotesEn, costAnalysis, projectNo, selectedCustomerId, quotationDate, status: status || 'draft' });
  }, [items, settings, quotationNotes, quotationNotesEn, costAnalysis, projectNo, selectedCustomerId, quotationDate]);

  const handleSave = useCallback(async (saveStatus?: string) => {
    if (!projectNo.trim()) {
      toast({ title: t('qspa.enterProjectNo'), variant: 'destructive' });
      return;
    }
    // Check if content changed since last save (includes status in snapshot)
    const currentSnapshot = getStateSnapshot(saveStatus);
    if (lastSavedStateRef.current && lastSavedStateRef.current === currentSnapshot) {
      toast({ title: t('qspa.noChanges'), description: t('qspa.noChangesDesc') });
      return;
    }
    saveDraft(user?.id);
    try {
      const result = await saveQuotation.mutateAsync({
        id: currentQuotationId,
        projectNo,
        customerId: selectedCustomerId,
        quotationDate,
        items,
        summary,
        settings,
        costAnalysis,
        quotationNotes,
        quotationNotesEn,
        status: saveStatus,
      });
      // Update last saved state after successful save
      lastSavedStateRef.current = getStateSnapshot(saveStatus);
      if (result?.id && !currentQuotationId) {
        setCurrentQuotationId(result.id);
      }
      if (result?.id) {
        const saved = quotations.find((q: any) => q.id === result.id);
        if (saved?.quotationNo) setQuotationNo(saved.quotationNo);
        if (!quotationNo) {
          setTimeout(() => {
            const q = queryClient.getQueryData(['q_quotations', tenantId]) as any[];
            const found = q?.find((qq: any) => qq.id === result.id);
            if (found?.quotationNo) setQuotationNo(found.quotationNo);
          }, 500);
        }
      }
      // Clear server draft on formal save
      if (saveStatus === 'sent' && user?.id) {
        clearServerDraft(user.id);
        localStorage.removeItem('quotation_draft');
      }
    } catch { /* error handled in hook */ }
  }, [projectNo, currentQuotationId, selectedCustomerId, quotationDate, items, summary, settings, costAnalysis, quotationNotes, quotationNotesEn, saveDraft, saveQuotation, toast, setCurrentQuotationId, t, quotations, quotationNo, getStateSnapshot, user?.id, clearServerDraft, queryClient, tenantId]);

  const handleLoadQuotation = useCallback((q: any) => {
    loadQuotation({
      id: q.id,
      projectNo: q.projectNo,
      quotationDate: q.quotationDate,
      customerId: q.customerId,
      items: q.items,
      settings: q.settings,
      costAnalysis: q.costAnalysis,
      quotationNotes: q.quotationNotes,
      quotationNotesEn: q.notes,
    });
    setQuotationNo(q.quotationNo || '');
    setHistoryOpen(false);
    toast({ title: t('qspa.quotationLoaded'), description: q.projectNo });
  }, [loadQuotation, toast, t]);

  const handleRestoreVersion = useCallback((version: any) => {
    loadQuotation({
      id: currentQuotationId,
      items: version.items,
      settings: version.settings,
      costAnalysis: version.costAnalysis,
      quotationNotes: version.quotationNotes,
    });
    toast({ title: t('qspa.restoredToVersion').replace('{v}', String(version.versionNumber)) });
  }, [currentQuotationId, loadQuotation, toast, t]);

  const handleDiscountChange = useCallback((enabled: boolean, amount: number) => {
    setSettings(prev => ({
      ...prev,
      taxSettings: { ...prev.taxSettings, enableDiscount: enabled, discountAmount: amount },
    }));
  }, [setSettings]);



  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Preview is now handled by QuotationPrintPreview component

  // ====== MOBILE LAYOUT ======
  if (isMobile) {
    return (
      <div className="min-h-dvh bg-background flex flex-col">
        <header className="bg-card border-b border-border shrink-0 sticky top-0 z-40">
          <div className="px-4 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-sm font-bold truncate max-w-[140px]">{settings.companyName || t('qspa.quotationSystem')}</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-8 px-2">
                <Home className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)} className="h-8 px-2">
                <History className="w-3.5 h-3.5" />
              </Button>
              <Button variant="default" size="sm" onClick={() => handleSave('draft')} disabled={items.length === 0 || saveQuotation.isPending} className="h-8 px-3 text-xs font-semibold">
                <Save className="w-3.5 h-3.5 mr-1" />{t('qspa.saveDraft')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleSave('sent')} disabled={items.length === 0 || saveQuotation.isPending} className="h-8 px-3 text-xs font-semibold">
                {t('qspa.saveFormal')}
              </Button>
            </div>
          </div>
          {mobileTab === 'main' && (
            <div className="px-3 pb-2.5">
              <div className="bg-muted/50 rounded-xl px-3 py-2.5 border border-border/40">
                <QuotationMobileInfo
                  projectNo={projectNo} quotationDate={quotationDate} customers={customers}
                  selectedCustomerId={selectedCustomerId} onProjectNoChange={setProjectNo}
                  onDateChange={setQuotationDate} onSelectCustomer={(id) => setSelectedCustomerId(id || undefined)}
                  quotationNo={quotationNo}
                />
              </div>
            </div>
          )}
          {mobileTab !== 'main' && (
            <div className="px-4 pb-2.5">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                {mobileTab === 'tools' && <><Wrench className="w-4 h-4 text-primary" />{t('qspa.toolCenter')}</>}
                {mobileTab === 'summary' && <><Calculator className="w-4 h-4 text-primary" />{t('qspa.quotationSummary')}</>}
                {mobileTab === 'settings' && <><Settings className="w-4 h-4 text-primary" />{t('qspa.systemSettings')}</>}
              </h2>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto pb-20">
          <div className={cn(mobileTab === 'main' ? 'block' : 'hidden', 'p-3')}>
            <QuotationDraggableTable items={items} exchangeRates={exchangeRates} displayCurrency={settings.currency as 'MYR' | 'USD' | 'CNY'} onUpdateItem={updateItem} onRemoveItem={removeItem} onReorderItems={reorderItems} onClear={() => clearItems(user?.id)} />
          </div>
          <div className={cn(mobileTab === 'tools' ? 'block' : 'hidden', 'p-3 space-y-3')}>
            <Button variant="outline" className="w-full" onClick={() => setPreviewOpen(true)} disabled={items.length === 0}>
              <Eye className="w-4 h-4 mr-2" />{t('qspa.preview')}
            </Button>
            {/* Export is now available inside the preview dialog */}
            <Button variant="outline" className="w-full" onClick={() => setHistoryOpen(true)}>
              <History className="w-4 h-4 mr-2" />{t('qspa.history')}
            </Button>
            <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={() => { if (items.length > 0 && confirm(t('qspa.confirmClear'))) clearItems(user?.id); }}>
              <FileText className="w-4 h-4 mr-2" />{t('qspa.clearAll')}
            </Button>
          </div>
          <div className={cn(mobileTab === 'summary' ? 'block' : 'hidden', 'p-3')}>
            <QuotationSummaryPanel summary={summary} settings={settings} costAnalysis={costAnalysis} quotationNotes={quotationNotes} quotationNotesEn={quotationNotesEn}
              onNotesChange={(n, ne) => { setQuotationNotes(n); if (ne) setQuotationNotesEn(ne); }} items={items} onBatchUpdate={batchUpdateItems} onDiscountChange={handleDiscountChange} />
          </div>
          <div className={cn(mobileTab === 'settings' ? 'block' : 'hidden', 'p-3 space-y-3')}>
            <Button variant="outline" className="w-full" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />{t('qspa.openSettings')}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setProductMgmtOpen(true)}>
              <Package className="w-4 h-4 mr-2" />{t('qspa.productMgmt')}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setCustomerMgmtOpen(true)}>
              <Building2 className="w-4 h-4 mr-2" />{t('qspa.customerMgmt')}
            </Button>
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/60" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex items-center h-16 px-2 max-w-md mx-auto">
            <NavItem icon={<Package className="w-[22px] h-[22px]" />} label={t('qspa.products')} isActive={productsOpen} onClick={() => setProductsOpen(true)} />
            <NavItem icon={<Wrench className="w-[22px] h-[22px]" />} label={t('qspa.tools')} isActive={mobileTab === 'tools'} onClick={() => setMobileTab(mobileTab === 'tools' ? 'main' : 'tools')} />
            <div className="flex-1 flex justify-center px-1">
              <button onClick={() => setMobileTab('main')} className={cn(
                "w-[56px] h-[56px] rounded-2xl shadow-lg relative -mt-4 flex items-center justify-center transition-all duration-200 active:scale-95 ring-[3px] ring-background",
                mobileTab === 'main' ? "bg-primary text-primary-foreground" : "bg-primary/80 hover:bg-primary text-primary-foreground"
              )}>
                <FileText className="w-6 h-6" />
                {items.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold shadow">
                    {items.length > 99 ? '99+' : items.length}
                  </span>
                )}
              </button>
            </div>
            <NavItem icon={<Calculator className="w-[22px] h-[22px]" />} label={t('qspa.summary')} isActive={mobileTab === 'summary'} onClick={() => setMobileTab(mobileTab === 'summary' ? 'main' : 'summary')} />
            <NavItem icon={<Settings className="w-[22px] h-[22px]" />} label={t('qspa.settings')} isActive={mobileTab === 'settings'} onClick={() => setMobileTab(mobileTab === 'settings' ? 'main' : 'settings')} />
          </div>
        </nav>

        <Sheet open={productsOpen} onOpenChange={setProductsOpen}>
          <SheetContent side="left" className="w-[88vw] max-w-[360px] p-0 flex flex-col">
            <SheetHeader className="px-4 py-3 border-b border-border shrink-0 bg-card">
              <SheetTitle className="flex items-center gap-2 text-base"><Package className="w-4 h-4 text-primary" />{t('qspa.productCatalog')}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1">
              <QuotationProductSelector products={products} onSelectProduct={addItem} currentItems={items} />
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <QuotationSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} costAnalysis={costAnalysis} onSettingsChange={setSettings} onCostAnalysisChange={setCostAnalysis} />
        <QuotationHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} quotations={quotations} onLoad={handleLoadQuotation} onDelete={id => deleteQuotation.mutate(id)} versions={versions} versionsLoading={versionsLoading} currentItems={items} onRestoreVersion={handleRestoreVersion} currentQuotationId={currentQuotationId} />
        <ProductManagementDialog open={productMgmtOpen} onOpenChange={setProductMgmtOpen} />
        <CustomerManagementDialog open={customerMgmtOpen} onOpenChange={setCustomerMgmtOpen} onSelectCustomer={(id) => { setSelectedCustomerId(id); setCustomerMgmtOpen(false); }} />

        {/* Preview Dialog (Mobile) */}
        <QuotationPrintPreview open={previewOpen} onOpenChange={setPreviewOpen}
          projectNo={projectNo} quotationNo={quotationNo} quotationDate={quotationDate}
          customerName={selectedCustomer?.nameZh} customerAddress={selectedCustomer?.address}
          customerPhone={selectedCustomer?.phone} customerEmail={selectedCustomer?.email}
          items={items} summary={summary} settings={settings} quotationNotes={quotationNotes} quotationNotesEn={quotationNotesEn} />
      </div>
    );
  }

  // ====== DESKTOP LAYOUT ======
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-2.5 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => navigate('/quotation')} className="h-8 px-2.5 rounded-lg hover:bg-secondary text-xs gap-1.5">
                <ChevronLeft className="w-4 h-4" />{t('qspa.back')}
              </Button>
            </TooltipTrigger><TooltipContent side="right"><p>{t('qspa.backToList')}</p></TooltipContent></Tooltip>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-center min-w-0">
            <QuotationMobileInfo projectNo={projectNo} quotationDate={quotationDate} customers={customers} selectedCustomerId={selectedCustomerId}
              onProjectNoChange={setProjectNo} onDateChange={setQuotationDate} onSelectCustomer={(id) => setSelectedCustomerId(id || undefined)} layout="desktop" quotationNo={quotationNo} />
          </div>

          <nav className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)} className="h-7 text-xs px-2.5 gap-1.5">
              <History className="w-3.5 h-3.5" />{t('qspa.history')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)} disabled={items.length === 0} className="h-7 text-xs px-2.5 gap-1.5">
              <Eye className="w-3.5 h-3.5" />{t('qspa.preview')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setProductMgmtOpen(true)} className="h-7 text-xs px-2.5 gap-1.5">
              <Package className="w-3.5 h-3.5" />{t('qspa.productMgmt')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCustomerMgmtOpen(true)} className="h-7 text-xs px-2.5 gap-1.5">
              <Building2 className="w-3.5 h-3.5" />{t('qspa.customerMgmt')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} className="h-7 text-xs px-2.5 gap-1.5">
              <Settings className="w-3.5 h-3.5" />{t('qspa.settings')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-7 text-xs px-2.5 gap-1.5">
              <Home className="w-3.5 h-3.5" />{t('qspa.home')}
            </Button>
            <Button variant="default" size="sm" onClick={() => handleSave('draft')} disabled={items.length === 0 || saveQuotation.isPending} className="h-7 gap-1.5 text-xs px-3">
              <Save className="w-3.5 h-3.5" />{t('qspa.saveDraft')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleSave('sent')} disabled={items.length === 0 || saveQuotation.isPending} className="h-7 gap-1.5 text-xs px-3">
              {t('qspa.saveFormal')}
            </Button>
          </nav>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="border-r border-border bg-card flex flex-col shrink-0">
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className={cn("h-10 w-10 rounded-none transition-colors", leftPanelOpen ? "bg-secondary hover:bg-secondary/80" : "hover:bg-secondary/50")}>
              <div className="flex items-center gap-0.5"><Package className="w-4 h-4" />{leftPanelOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</div>
            </Button>
          </TooltipTrigger><TooltipContent side="right"><p>{t('qspa.productSelector')}</p></TooltipContent></Tooltip>
        </div>

        <aside className={cn('border-r border-border transition-all duration-300 shrink-0 bg-card', leftPanelOpen ? 'w-60 lg:w-72 xl:w-80' : 'w-0 overflow-hidden')}>
          {leftPanelOpen && <div className="h-full overflow-hidden"><QuotationProductSelector products={products} onSelectProduct={addItem} currentItems={items} /></div>}
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-secondary/20">
          <ScrollArea className="flex-1">
            <div className="p-3 lg:p-6">
              <QuotationDraggableTable items={items} exchangeRates={exchangeRates} displayCurrency={settings.currency as 'MYR' | 'USD' | 'CNY'} onUpdateItem={updateItem} onRemoveItem={removeItem} onReorderItems={reorderItems} onClear={() => clearItems(user?.id)} />
            </div>
          </ScrollArea>
        </main>

        <aside className={cn('border-l border-border transition-all duration-300 shrink-0 overflow-hidden bg-card', rightPanelOpen ? 'w-60 lg:w-72 xl:w-80' : 'w-0')}>
          {rightPanelOpen && (
            <ScrollArea className="h-full p-4">
              <QuotationSummaryPanel summary={summary} settings={settings} costAnalysis={costAnalysis} quotationNotes={quotationNotes} quotationNotesEn={quotationNotesEn}
                onNotesChange={(n, ne) => { setQuotationNotes(n); if (ne) setQuotationNotesEn(ne); }} items={items} onBatchUpdate={batchUpdateItems} onDiscountChange={handleDiscountChange} />
            </ScrollArea>
          )}
        </aside>

        <div className="border-l border-border bg-card flex flex-col shrink-0">
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={cn("h-10 w-10 rounded-none transition-colors", rightPanelOpen ? "bg-secondary hover:bg-secondary/80" : "hover:bg-secondary/50")}>
              <div className="flex items-center gap-0.5">{rightPanelOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}<TrendingUp className="w-4 h-4" /></div>
            </Button>
          </TooltipTrigger><TooltipContent side="left"><p>{t('qspa.quotationSummary')}</p></TooltipContent></Tooltip>
        </div>
      </div>

      <QuotationSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} costAnalysis={costAnalysis} onSettingsChange={setSettings} onCostAnalysisChange={setCostAnalysis} />
      <QuotationHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} quotations={quotations} onLoad={handleLoadQuotation} onDelete={id => deleteQuotation.mutate(id)} versions={versions} versionsLoading={versionsLoading} currentItems={items} onRestoreVersion={handleRestoreVersion} currentQuotationId={currentQuotationId} />
      <ProductManagementDialog open={productMgmtOpen} onOpenChange={setProductMgmtOpen} />
      <CustomerManagementDialog open={customerMgmtOpen} onOpenChange={setCustomerMgmtOpen} onSelectCustomer={(id) => { setSelectedCustomerId(id); setCustomerMgmtOpen(false); }} />

      {/* Preview Dialog */}
      <QuotationPrintPreview open={previewOpen} onOpenChange={setPreviewOpen}
        projectNo={projectNo} quotationNo={quotationNo} quotationDate={quotationDate}
        customerName={selectedCustomer?.nameZh} customerAddress={selectedCustomer?.address}
        customerPhone={selectedCustomer?.phone} customerEmail={selectedCustomer?.email}
        items={items} summary={summary} settings={settings} quotationNotes={quotationNotes} quotationNotesEn={quotationNotesEn} />

      {/* Server Draft Recovery Dialog */}
      <AlertDialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>检测到未保存的草稿</AlertDialogTitle>
            <AlertDialogDescription>
              检测到来自其他设备的未保存报价草稿，是否恢复？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowRecoveryDialog(false);
              serverDraftRef.current = null;
            }}>忽略</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (serverDraftRef.current) {
                loadQuotation(serverDraftRef.current);
                toast({ title: '草稿已恢复' });
              }
              setShowRecoveryDialog(false);
              serverDraftRef.current = null;
            }}>恢复</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button className={cn("flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-150", isActive ? "text-primary" : "text-muted-foreground active:text-foreground")} onClick={onClick}>
      <div className={cn("transition-transform duration-150", isActive && "scale-110")}>{icon}</div>
      <span className={cn("text-[11px] font-medium leading-none", isActive && "font-semibold")}>{label}</span>
      {isActive && <div className="w-1 h-1 rounded-full bg-primary" />}
    </button>
  );
}