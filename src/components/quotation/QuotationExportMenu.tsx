import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { QuotationItem, CompanySettings, QuotationSummary, ExportLanguage } from '@/types/quotation';
import { exportQuotationToPDF, exportQuotationToExcel } from '@/lib/quotationExport';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

interface Props {
  projectNo: string;
  quotationDate: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  items: QuotationItem[];
  summary: QuotationSummary;
  settings: CompanySettings;
  quotationNotes?: string;
  quotationNotesEn?: string;
  disabled?: boolean;
}

export function QuotationExportMenu({ projectNo, quotationDate, customerName, customerAddress, customerPhone, items, summary, settings, quotationNotes, quotationNotesEn, disabled }: Props) {
  const { toast } = useToast();
  const { t } = useI18n();
  const { categories } = useProductCategories();

  const categoryLabels = React.useMemo(() => {
    const map: Record<string, { zh: string; en: string; code: string }> = {};
    categories.forEach(c => { map[c.code] = { zh: c.name_zh, en: c.name_en, code: c.code }; });
    return map;
  }, [categories]);

  const buildData = (lang: ExportLanguage) => ({
    projectNo, quotationDate, customerName, customerAddress, customerPhone, items, summary, settings, quotationNotes, quotationNotesEn, language: lang, categoryLabels,
  });

  const handlePDF = (lang: ExportLanguage) => {
    try { exportQuotationToPDF(buildData(lang)); toast({ title: t('quotation.pdfExported') }); }
    catch (e: any) { toast({ title: t('quotation.exportFailed'), description: e.message, variant: 'destructive' }); }
  };

  const handleExcel = (lang: ExportLanguage) => {
    try { exportQuotationToExcel(buildData(lang)); toast({ title: t('quotation.excelExported') }); }
    catch (e: any) { toast({ title: t('quotation.exportFailed'), description: e.message, variant: 'destructive' }); }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5 gap-1" disabled={disabled}>
          <Download className="w-3.5 h-3.5" /><span className="hidden xl:inline">{t('common.export')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><FileText className="w-4 h-4 mr-2" />{t('quotation.exportPdf')}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handlePDF('zh')}>{t('quotation.chinese')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePDF('en')}>English</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePDF('zh-en')}>{t('quotation.bilingual')}</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><FileSpreadsheet className="w-4 h-4 mr-2" />{t('quotation.exportExcel')}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handleExcel('zh')}>{t('quotation.chinese')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExcel('en')}>English</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
