import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent as AlertContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Printer, Download, FileSpreadsheet, Share2, MessageCircle, X, ImageIcon, Mail, FileText } from 'lucide-react';
import { QuotationItem, CompanySettings, QuotationSummary, ExportLanguage } from '@/types/quotation';
import { exportQuotationToPDF, exportQuotationToExcel, exportQuotationToPDFBlob, exportQuotationToExcelBlob } from '@/lib/quotationExport';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import companyLogo from '@/assets/company-logo.png';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectNo: string;
  quotationNo?: string;
  quotationDate: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: QuotationItem[];
  summary: QuotationSummary;
  settings: CompanySettings;
  quotationNotes?: string;
  quotationNotesEn?: string;
}

type SectionKey = 'header' | 'customer' | 'payment' | 'notes' | 'price';

const LABELS: Record<ExportLanguage, Record<string, string>> = {
  zh: {
    title: '报 价 单',
    projectNo: '报价编号',
    date: '报价日期',
    validity: '有效期',
    days: '天',
    customer: '客户信息',
    customerLabel: '客户',
    phone: '联系电话',
    email: '联系邮箱',
    address: '地址',
    no: '序号',
    description: '项目描述',
    unit: '单位',
    qty: '数量',
    unitPrice: '单价',
    amount: '金额',
    materials: '材料及施工说明',
    subtotal: '小计',
    discount: '折扣',
    total: '总计',
    payment: '付款条款',
    deposit: '定金',
    progress: '进度款',
    final: '尾款',
    bank: '银行账户',
    notes: '备注',
    dateLabel: '日期',
    catSubtotal: '小计',
  },
  en: {
    title: 'QUOTATION',
    projectNo: 'Project No.',
    date: 'Date',
    validity: 'Validity',
    days: 'days',
    customer: 'CUSTOMER INFORMATION',
    customerLabel: 'Customer',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    no: 'No.',
    description: 'Description',
    unit: 'Unit',
    qty: 'Qty',
    unitPrice: 'Unit Price',
    amount: 'Amount',
    materials: 'Materials & Spec',
    subtotal: 'Subtotal',
    discount: 'Discount',
    total: 'GRAND TOTAL',
    payment: 'Payment Terms',
    deposit: 'Deposit',
    progress: 'Progress',
    final: 'Final',
    bank: 'Bank Account',
    notes: 'Remarks',
    dateLabel: 'Date',
    catSubtotal: 'Sub Total',
  },
  'zh-en': {
    title: '报价单 QUOTATION',
    projectNo: '报价编号 Project No.',
    date: '报价日期 Date',
    validity: '有效期 Validity',
    days: '天 days',
    customer: '客户信息 CUSTOMER INFORMATION',
    customerLabel: '客户 Customer',
    phone: '联系电话 Phone',
    email: '联系邮箱 Email',
    address: '地址 Address',
    no: 'No.',
    description: '项目描述 Description',
    unit: '单位 Unit',
    qty: '数量 Qty',
    unitPrice: '单价 Unit Price',
    amount: '金额 Amount',
    materials: '材料说明 Materials & Spec',
    subtotal: '小计 Subtotal',
    discount: '折扣 Discount',
    total: '总计 TOTAL',
    payment: '付款条款 Payment Terms',
    deposit: '定金 Deposit',
    progress: '进度款 Progress',
    final: '尾款 Final',
    bank: '银行账户 Bank Account',
    notes: '备注 Notes',
    dateLabel: '日期 Date',
    catSubtotal: '小计 Sub Total',
  },
};

// Clean professional color scheme matching reference
const C = {
  navy: '#1e3a5f',
  navyDark: '#0f2744',
  blue: '#2563eb',
  blueBg: '#e8eef8',
  blueLight: '#3b82f6',
  white: '#ffffff',
  bg: '#f8fafc',
  cream: '#fefcf3',
  text: '#1a1a1a',
  textLight: '#6b7280',
  textMuted: '#9ca3af',
  border: '#d1d5db',
  borderLight: '#e5e7eb',
  red: '#dc2626',
  green: '#16a34a',
  yellowBg: '#fffbeb',
  yellowBorder: '#fde68a',
};

export function QuotationPrintPreview({
  open, onOpenChange, projectNo, quotationNo, quotationDate, customerName, customerAddress, customerPhone, customerEmail,
  items, summary, settings, quotationNotes, quotationNotesEn,
}: Props) {
  const { toast } = useToast();
  const { t } = useI18n();
  const { categories } = useProductCategories();

  const [lang, setLang] = useState<ExportLanguage>('zh-en');
  const [showLogo, setShowLogo] = useState(true);
  const [confirmDownload, setConfirmDownload] = useState<'pdf' | 'excel' | null>(null);
  const [sections, setSections] = useState<Record<SectionKey, boolean>>({
    header: true, customer: true, payment: true, notes: true, price: true,
  });

  const toggleSection = (key: SectionKey) => setSections(prev => ({ ...prev, [key]: !prev[key] }));
  const L = LABELS[lang];

  const categoryLabels = React.useMemo(() => {
    const map: Record<string, { zh: string; en: string; code: string }> = {};
    categories.forEach(c => { map[c.code] = { zh: c.name_zh, en: c.name_en, code: c.code }; });
    return map;
  }, [categories]);

  const fmt = (n: number) => `RM ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getItemName = (item: QuotationItem) => {
    if (lang === 'en') return item.nameEn || item.nameZh;
    return item.nameZh;
  };
  const getItemNameSub = (item: QuotationItem) => {
    if (lang === 'zh-en' && item.nameEn) return item.nameEn;
    return null;
  };
  const getCatLabel = (cat: string) => {
    const cl = categoryLabels[cat];
    if (!cl) return cat;
    if (lang === 'en') return `${cl.en}`;
    if (lang === 'zh') return `${cl.zh}`;
    return `${cl.zh} / ${cl.en}`;
  };
  const getCatCode = (cat: string) => {
    const cl = categoryLabels[cat];
    return cl?.code || cat.charAt(0).toUpperCase();
  };

  const buildExportData = () => ({
    projectNo, quotationDate, customerName, customerAddress, customerPhone, customerEmail,
    items, summary, settings, quotationNotes, quotationNotesEn,
    language: lang, categoryLabels,
    visibility: { showLogo, ...sections },
  });

  const handlePDF = () => { try { exportQuotationToPDF(buildExportData()); toast({ title: t('quotation.pdfExported') }); } catch (e: any) { toast({ title: t('quotation.exportFailed'), description: e.message, variant: 'destructive' }); } };
  const handleExcel = () => { try { exportQuotationToExcel(buildExportData()); toast({ title: t('quotation.excelExported') }); } catch (e: any) { toast({ title: t('quotation.exportFailed'), description: e.message, variant: 'destructive' }); } };

  const handlePrint = () => {
    const el = document.getElementById('q-preview-paper');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Quotation</title><style>
      @page { size: A4; margin: 10mm; }
      body { margin: 0; font-family: -apple-system, "Segoe UI", "Helvetica Neue", Arial, "Microsoft YaHei", "微软雅黑", sans-serif; font-size: 11px; color: #1a1a1a; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d1d5db; padding: 5px 8px; }
      th { background: #1e3a5f; color: #fff; font-weight: 600; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
    </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  };

  const getFileName = (ext: string) => `Quotation_${quotationNo || projectNo}_${quotationDate.replace(/-/g, '')}.${ext}`;

  const generateFileBlob = async (format: 'pdf' | 'excel'): Promise<{ blob: Blob; fileName: string }> => {
    const data = buildExportData();
    if (format === 'pdf') return { blob: exportQuotationToPDFBlob(data), fileName: getFileName('pdf') };
    return { blob: exportQuotationToExcelBlob(data), fileName: getFileName('xlsx') };
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleShareWhatsApp = async (format: 'pdf' | 'excel') => {
    try {
      const { blob, fileName } = await generateFileBlob(format);
      const file = new File([blob], fileName, { type: blob.type });
      if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: `${settings.companyName} - ${L.title}`, text: `${L.title} ${quotationNo || projectNo}` }); }
      else { downloadBlob(blob, fileName); const msg = encodeURIComponent(`${settings.companyName} - ${L.title} ${quotationNo || projectNo}`); window.open(`https://wa.me/?text=${msg}`, '_blank'); toast({ title: '文件已下载', description: '请在 WhatsApp 中发送已下载的文件' }); }
    } catch (e: any) { toast({ title: '分享失败', description: e.message, variant: 'destructive' }); }
  };

  const handleShareWeChat = async (format: 'pdf' | 'excel') => {
    try { const { blob, fileName } = await generateFileBlob(format); downloadBlob(blob, fileName); toast({ title: '文件已下载', description: '请打开微信，将已下载的文件发送给对方' }); }
    catch (e: any) { toast({ title: '分享失败', description: e.message, variant: 'destructive' }); }
  };

  const handleShareEmail = async (format: 'pdf' | 'excel') => {
    try {
      const { blob, fileName } = await generateFileBlob(format);
      const file = new File([blob], fileName, { type: blob.type });
      if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: `${settings.companyName} - ${L.title}` }); }
      else { downloadBlob(blob, fileName); const subject = encodeURIComponent(`${settings.companyName} - ${L.title} ${quotationNo || projectNo}`); const body = encodeURIComponent(`您好，\n\n请查看附件中的报价单。\n\n${settings.companyName}`); window.open(`mailto:${customerEmail || ''}?subject=${subject}&body=${body}`, '_self'); toast({ title: '文件已下载' }); }
    } catch (e: any) { toast({ title: '分享失败', description: e.message, variant: 'destructive' }); }
  };

  // Group items by category
  const catMap = new Map<string, QuotationItem[]>();
  items.forEach(item => { const cat = (item.category as string) || 'others'; if (!catMap.has(cat)) catMap.set(cat, []); catMap.get(cat)!.push(item); });
  // Sort categories by code for consistent ordering
  const sortedCatEntries = Array.from(catMap.entries()).sort(([a], [b]) => {
    const codeA = categoryLabels[a]?.code || a;
    const codeB = categoryLabels[b]?.code || b;
    return codeA.localeCompare(codeB);
  });
  let globalIdx = 0;
  const notes = lang === 'en' ? (quotationNotesEn || quotationNotes) : quotationNotes;

  const sectionToggles: { key: SectionKey; label: string }[] = [
    { key: 'header', label: '抬头' }, { key: 'customer', label: '客户' }, { key: 'payment', label: '付款' }, { key: 'notes', label: '备注' }, { key: 'price', label: '价格' },
  ];

  // Shared cell style helpers
  const thStyle: React.CSSProperties = {
    background: C.navy, color: C.white, border: `1px solid ${C.navy}`,
    padding: '8px 10px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.03em',
  };
  const tdStyle: React.CSSProperties = {
    border: `1px solid ${C.borderLight}`, padding: '6px 10px', fontSize: '11px',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] sm:max-w-[95vw] w-full sm:w-[900px] max-h-[100vh] sm:max-h-[95vh] h-[100vh] sm:h-auto p-0 gap-0 flex flex-col overflow-hidden bg-muted/40 rounded-none sm:rounded-lg">
        {/* ===== TOOLBAR ===== */}
        <div className="bg-card border-b border-border px-2 sm:px-3 py-2 flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          <ToggleGroup type="single" value={lang} onValueChange={(v) => v && setLang(v as ExportLanguage)} size="sm" className="gap-0 bg-muted rounded-md p-0.5">
            <ToggleGroupItem value="zh" className="h-7 px-2.5 text-xs rounded-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">中文</ToggleGroupItem>
            <ToggleGroupItem value="en" className="h-7 px-2.5 text-xs rounded-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">EN</ToggleGroupItem>
            <ToggleGroupItem value="zh-en" className="h-7 px-2.5 text-xs rounded-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">中英</ToggleGroupItem>
          </ToggleGroup>
          <Separator orientation="vertical" className="h-5" />
          {sectionToggles.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
              <Checkbox checked={sections[key]} onCheckedChange={() => toggleSection(key)} className="h-3.5 w-3.5" />
              <span className="text-xs text-foreground/80">{label}</span>
            </label>
          ))}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox checked={showLogo} onCheckedChange={() => setShowLogo(!showLogo)} className="h-3.5 w-3.5" />
            <ImageIcon className="w-3 h-3 text-foreground/70" />
          </label>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 px-2.5" onClick={handlePrint}><Printer className="w-3.5 h-3.5" />{t('quotation.print')}</Button>
          <Button size="sm" className="h-7 text-xs gap-1.5 px-2.5" onClick={() => setConfirmDownload('pdf')}><Download className="w-3.5 h-3.5" />PDF</Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 px-2.5" onClick={() => setConfirmDownload('excel')}><FileSpreadsheet className="w-3.5 h-3.5" />Excel</Button>
          <Separator orientation="vertical" className="h-5" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 px-2.5"><Share2 className="w-3.5 h-3.5" />{t('preview.share')}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger><MessageCircle className="w-4 h-4 mr-2 text-green-600" />WhatsApp</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleShareWhatsApp('pdf')}><FileText className="w-4 h-4 mr-2" />PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShareWhatsApp('excel')}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger><MessageCircle className="w-4 h-4 mr-2 text-green-500" />微信</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleShareWeChat('pdf')}><FileText className="w-4 h-4 mr-2" />PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShareWeChat('excel')}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger><Mail className="w-4 h-4 mr-2 text-blue-500" />邮件</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleShareEmail('pdf')}><FileText className="w-4 h-4 mr-2" />PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShareEmail('excel')}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onOpenChange(false)}><X className="w-4 h-4" /></Button>
        </div>

        {/* ===== PAPER PREVIEW ===== */}
        <div className="overflow-y-auto flex-1 min-h-0 p-2 sm:p-4 md:p-6" style={{ background: '#e5e5e5' }}>
          <div id="q-preview-paper" className="mx-auto" style={{
            maxWidth: '794px', minHeight: 'auto',
            fontFamily: '-apple-system, "Segoe UI", "Helvetica Neue", Arial, "Microsoft YaHei", "微软雅黑", sans-serif',
            background: C.white,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}>
            <div className="p-4 sm:p-8 md:px-11 md:py-10">

              {/* ===== Company Header ===== */}
              {sections.header && (
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '6px' }}>
                    {showLogo && <img src={companyLogo} alt="Logo" style={{ height: '48px', objectFit: 'contain' }} />}
                  </div>
                  <h1 style={{ fontSize: '16px', fontWeight: 700, color: C.navy, letterSpacing: '0.06em', margin: '4px 0 2px', textTransform: 'uppercase', textAlign: 'center' }}>
                    FLASH CAST SDN. BHD.
                  </h1>
                  {settings.ssmNo && (
                    <p style={{ fontSize: '8px', color: C.textMuted, margin: '2px 0', letterSpacing: '0.04em' }}>SSM: {settings.ssmNo}</p>
                  )}
                  {settings.companyAddress && (
                    <p style={{ fontSize: '8px', color: C.textLight, margin: '2px 0', lineHeight: 1.5, maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>{settings.companyAddress}</p>
                  )}
                </div>
              )}

              {/* ===== Title Bar ===== */}
              <div style={{
                background: C.navy, color: C.white, textAlign: 'center',
                padding: '10px 0', margin: '0 0 16px',
                fontSize: '15px', fontWeight: 700, letterSpacing: '0.25em',
              }}>
                {L.title}
              </div>

              {/* ===== Meta Info Row ===== */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '18px', padding: '12px 16px',
                background: '#f8f9fb', border: `1px solid ${C.borderLight}`, borderRadius: '4px',
                gap: '8px',
              }}>
                <div style={{ minWidth: '80px' }}>
                  <span style={{ color: C.textLight, fontSize: '9px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{L.projectNo}</span>
                  <span style={{ display: 'block', fontWeight: 700, color: C.navy, marginTop: '4px', fontSize: '13px', wordBreak: 'break-all' }}>{quotationNo || projectNo}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: C.textLight, fontSize: '9px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{L.date}</span>
                  <span style={{ display: 'block', fontWeight: 700, color: C.navy, marginTop: '4px', fontSize: '13px' }}>{quotationDate}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: C.textLight, fontSize: '9px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{L.validity}</span>
                  <span style={{ display: 'block', fontWeight: 700, color: C.navy, marginTop: '4px', fontSize: '13px' }}>{settings.validityPeriod} {L.days}</span>
                </div>
              </div>

              {/* ===== Customer Info ===== */}
              {sections.customer && customerName && (
                <div style={{ marginBottom: '18px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                  <div style={{ background: C.navy, padding: '6px 12px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: C.white, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{L.customer}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', fontSize: '10px' }}>
                    <div style={{ padding: '8px 12px', borderRight: `1px solid ${C.borderLight}` }}>
                      <span style={{ display: 'block', fontSize: '8px', color: C.textMuted, marginBottom: '2px' }}>{L.customerLabel}</span>
                      <span style={{ fontWeight: 600, color: C.text }}>{customerName}</span>
                    </div>
                    <div style={{ padding: '8px 12px', borderRight: `1px solid ${C.borderLight}` }}>
                      <span style={{ display: 'block', fontSize: '8px', color: C.textMuted, marginBottom: '2px' }}>{L.phone}</span>
                      <span style={{ color: C.text }}>{customerPhone || '-'}</span>
                    </div>
                    <div style={{ padding: '8px 12px', borderRight: `1px solid ${C.borderLight}` }}>
                      <span style={{ display: 'block', fontSize: '8px', color: C.textMuted, marginBottom: '2px' }}>{L.address}</span>
                      <span style={{ color: C.text }}>{customerAddress || '-'}</span>
                    </div>
                    <div style={{ padding: '8px 12px' }}>
                      <span style={{ display: 'block', fontSize: '8px', color: C.textMuted, marginBottom: '2px' }}>{L.email}</span>
                      <span style={{ color: C.text }}>{customerEmail || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== Items Table by Category ===== */}
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -4px', padding: '0 4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px', tableLayout: 'auto', minWidth: '560px' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, whiteSpace: 'nowrap', textAlign: 'center' }}>{L.no}</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>{L.description}</th>
                    <th style={{ ...thStyle, whiteSpace: 'nowrap', textAlign: 'center' }}>{L.unit}</th>
                    <th style={{ ...thStyle, whiteSpace: 'nowrap', textAlign: 'center' }}>{L.qty}</th>
                    {sections.price && (
                      <>
                        <th style={{ ...thStyle, whiteSpace: 'nowrap', textAlign: 'right' }}>{L.unitPrice}</th>
                        <th style={{ ...thStyle, whiteSpace: 'nowrap', textAlign: 'right' }}>{L.amount}</th>
                      </>
                    )}
                    <th style={{ ...thStyle, textAlign: 'left' }}>{L.materials}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCatEntries.map(([cat, catItems]) => {
                    const catTotal = catItems.reduce((s, i) => s + i.lineTotal, 0);
                    const code = getCatCode(cat);
                    return (
                      <React.Fragment key={cat}>
                        {/* Category header row */}
                        <tr>
                          <td colSpan={sections.price ? 7 : 5} style={{
                            ...tdStyle,
                            background: C.blueBg, fontWeight: 700, fontSize: '10px', color: C.navy,
                            padding: '7px 10px', letterSpacing: '0.02em',
                          }}>
                            {code}. {getCatLabel(cat)}
                          </td>
                        </tr>
                        {/* Items */}
                        {catItems.map((item, idx) => {
                          globalIdx++;
                          const sub = getItemNameSub(item);
                          return (
                            <tr key={item.id} style={{ background: idx % 2 ? '#fafafa' : C.white }}>
                              <td style={{ ...tdStyle, textAlign: 'center', color: C.textLight, fontSize: '10px' }}>{globalIdx}</td>
                              <td style={{ ...tdStyle }}>
                                <span style={{ fontWeight: 500, color: C.text, fontSize: '11px' }}>{getItemName(item)}</span>
                                {sub && <><br /><span style={{ color: C.textLight, fontSize: '9px' }}>{sub}</span></>}
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'center', color: C.textLight, fontSize: '10px' }}>{item.unit}</td>
                              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: '12px', color: C.navy }}>{item.quantity}</td>
                              {sections.price && (
                                <>
                              <td style={{ ...tdStyle, textAlign: 'right', fontSize: '10px', color: C.text }}>RM {item.unitPrice.toFixed(2)}</td>
                                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: C.navy, fontSize: '11px' }}>RM {item.lineTotal.toFixed(2)}</td>
                                </>
                              )}
                              <td style={{ ...tdStyle, fontSize: '9px', color: C.textLight }}>
                                {lang === 'en' ? (item.descriptionEn || item.description || '') : (item.description || '')}
                                {lang === 'zh-en' && item.descriptionEn && item.description ? `${item.description}` : ''}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Category subtotal */}
                        {sections.price && (
                          <tr style={{ background: C.blueBg }}>
                            <td colSpan={5} style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: C.textLight, fontSize: '9px' }}>
                              {code}. {getCatLabel(cat)} ({L.catSubtotal})
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: C.navy, fontSize: '11px' }}>{fmt(catTotal)}</td>
                            <td style={{ ...tdStyle }}></td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>

              {/* ===== Summary Box ===== */}
              {sections.price && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '16px 0 24px' }}>
                  <div style={{ width: '300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: C.bg, border: `1px solid ${C.borderLight}`, borderBottom: 'none', fontSize: '11px' }}>
                      <span style={{ color: C.textLight }}>✦ {L.subtotal}</span>
                      <span style={{ fontWeight: 600, color: C.navy }}>{fmt(summary.subtotal)}</span>
                    </div>
                    {summary.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', border: `1px solid ${C.borderLight}`, borderBottom: 'none', fontSize: '11px' }}>
                        <span style={{ color: C.red }}>✦ {L.discount}</span>
                        <span style={{ fontWeight: 600, color: C.red }}>-{fmt(summary.discount)}</span>
                      </div>
                    )}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', padding: '12px 14px',
                      background: C.navy, color: C.white, fontSize: '13px', fontWeight: 700,
                    }}>
                      <span>{L.total}</span>
                      <span>{fmt(summary.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== Payment Terms ===== */}
              {sections.payment && (
                <div style={{ marginBottom: '16px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                  <div style={{ background: C.bg, padding: '8px 14px', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: C.navy, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{L.payment}</span>
                  </div>
                  {[
                    { label: L.deposit, pct: settings.paymentTerms.deposit, amount: summary.depositAmount },
                    { label: L.progress, pct: settings.paymentTerms.progress, amount: summary.progressAmount },
                    { label: L.final, pct: settings.paymentTerms.final, amount: summary.finalAmount },
                  ].map((pt, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: i < 2 ? `1px solid ${C.borderLight}` : 'none', fontSize: '11px' }}>
                      <span style={{ color: C.textLight }}>✦ {pt.label} ({pt.pct}%)</span>
                      <span style={{ fontWeight: 600, color: C.navy }}>{fmt(pt.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ===== Bank Info ===== */}
              {sections.payment && settings.bankInfo && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, fontSize: '10px' }}>
                  <span style={{ fontWeight: 700, color: C.navy, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{L.bank}</span>
                  <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', color: C.text, marginTop: '6px', lineHeight: 1.6, fontSize: '10px' }}>{settings.bankInfo}</pre>
                </div>
              )}

              {/* ===== Notes ===== */}
              {sections.notes && (notes || quotationNotesEn) && (
                <div style={{ marginBottom: '16px', padding: '12px 14px', background: C.yellowBg, border: `1px solid ${C.yellowBorder}`, fontSize: '10px' }}>
                  <p style={{ fontWeight: 700, color: C.navy, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>✦ {L.notes}</p>
                  {lang !== 'en' && quotationNotes && <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', color: C.text, lineHeight: 1.7, fontSize: '10px', margin: 0 }}>{quotationNotes}</pre>}
                  {lang !== 'zh' && quotationNotesEn && <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', color: C.textLight, lineHeight: 1.7, marginTop: lang !== 'en' ? '8px' : '0', fontSize: '10px', margin: lang !== 'en' ? '8px 0 0' : 0 }}>{quotationNotesEn}</pre>}
                  {lang === 'en' && !quotationNotesEn && quotationNotes && <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', color: C.text, lineHeight: 1.7, fontSize: '10px', margin: 0 }}>{quotationNotes}</pre>}
                </div>
              )}

              {/* ===== Footer: Date + Signatures ===== */}
              <div style={{ marginTop: '28px', fontSize: '10px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ color: C.textLight }}>{L.dateLabel}: </span>
                  <span style={{ fontWeight: 600, color: C.navy }}>{quotationDate}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                  <div>
                    <div style={{ borderBottom: `1.5px solid ${C.navy}`, marginBottom: '8px', paddingBottom: '40px' }} />
                    <p style={{ fontSize: '9px', color: C.textLight, margin: 0 }}>
                      {lang === 'en' ? 'Customer Signature' : lang === 'zh' ? '客户签名' : '客户签名 Customer Signature'}
                    </p>
                  </div>
                  <div>
                    <div style={{ borderBottom: `1.5px solid ${C.navy}`, marginBottom: '8px', paddingBottom: '40px' }} />
                    <p style={{ fontSize: '9px', color: C.textLight, margin: 0 }}>
                      {lang === 'en' ? 'Company Representative' : lang === 'zh' ? '公司代表' : '公司代表 Company Representative'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Download Confirmation */}
        <AlertDialog open={!!confirmDownload} onOpenChange={(open) => !open && setConfirmDownload(null)}>
          <AlertContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认下载</AlertDialogTitle>
              <AlertDialogDescription>确定要下载{confirmDownload === 'pdf' ? ' PDF ' : ' Excel '}文件吗？</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (confirmDownload === 'pdf') handlePDF(); else handleExcel(); setConfirmDownload(null); }}>确定下载</AlertDialogAction>
            </AlertDialogFooter>
          </AlertContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
