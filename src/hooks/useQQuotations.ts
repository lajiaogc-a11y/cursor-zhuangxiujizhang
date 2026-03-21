import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import type { QuotationItem, CompanySettings, CostAnalysis, QuotationSummary } from '@/types/quotation';
import * as qs from '@/services/quotation.service';

// Legacy types (kept for backward compatibility)
export interface Quotation {
  id: string;
  quotationNo: string;
  customerId: string | null;
  customerName: string;
  projectName: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  currency: string;
  subtotal: number;
  sstAmount: number;
  discountAmount: number;
  grandTotal: number;
  validDays: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItemRow {
  id: string;
  quotationId: string;
  productId: string | null;
  nameZh: string;
  nameEn: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  category: string;
  priceTier: string;
  note: string;
  sortOrder: number;
}

// New SPA types
export interface SavedQuotation {
  id: string;
  projectNo: string;
  quotationNo?: string;
  customerId?: string;
  customerName?: string;
  quotationDate: string;
  quotationType: string;
  status: string;
  items: QuotationItem[];
  subtotal: number;
  discountAmount: number;
  sstAmount: number;
  grandTotal: number;
  notes?: string;
  quotationNotes?: string;
  settings?: CompanySettings;
  costAnalysis?: CostAnalysis;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationVersion {
  id: string;
  quotationId: string;
  versionNumber: number;
  items: QuotationItem[];
  subtotal: number;
  sstAmount: number;
  discountAmount: number;
  grandTotal: number;
  settings?: CompanySettings;
  costAnalysis?: CostAnalysis;
  quotationNotes?: string;
  changeDescription?: string;
  createdAt: string;
}

export function useQQuotations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useI18n();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['q_quotations'],
    queryFn: () => qs.fetchQuotations() as Promise<SavedQuotation[]>,
    enabled: !!user,
  });

  const saveQuotation = useMutation({
    mutationFn: (data: qs.SaveQuotationData) => qs.saveQuotation(data, user?.id, tenant?.id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['q_quotations'] });
      queryClient.invalidateQueries({ queryKey: ['q_quotation_versions', result.id] });
      queryClient.invalidateQueries({ queryKey: ['q-cost-control-stats'] });
      queryClient.invalidateQueries({ queryKey: ['q_project_breakdowns'] });
      const statusLabel = result.status === 'sent' ? t('qspa.formalSaved') : t('qspa.draftSaved');
      toast({ title: statusLabel, description: `v${result.versionNumber}` });
    },
    onError: (e: any) => toast({ title: t('qspa.saveFailed'), description: e.message, variant: 'destructive' }),
  });

  const deleteQuotationMut = useMutation({
    mutationFn: (id: string) => qs.deleteQuotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_quotations'] });
      toast({ title: t('qspa.quotationDeleted') });
    },
    onError: (e: any) => toast({ title: t('qspa.deleteFailed'), description: e.message, variant: 'destructive' }),
  });

  return { quotations, loading: isLoading, saveQuotation, deleteQuotation: deleteQuotationMut };
}

export function useQuotationVersions(quotationId?: string) {
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['q_quotation_versions', quotationId],
    queryFn: () => qs.fetchQuotationVersions(quotationId!) as Promise<QuotationVersion[]>,
    enabled: !!quotationId,
  });

  return { versions, loading: isLoading };
}

// Legacy hook kept for backward compatibility
export function useQQuotationItems(quotationId: string | undefined) {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['q_quotation_items', quotationId],
    queryFn: () => qs.fetchQuotationItems(quotationId!) as Promise<QuotationItemRow[]>,
    enabled: !!user && !!quotationId,
  });

  const addItem = useMutation({
    mutationFn: (item: Partial<QuotationItemRow>) => qs.addQuotationItem(quotationId!, item),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['q_quotation_items', quotationId] }),
    onError: (e: any) => toast({ title: t('common.addFailed'), description: e.message, variant: 'destructive' }),
  });

  const updateItem = useMutation({
    mutationFn: ({ id, ...item }: Partial<QuotationItemRow> & { id: string }) => qs.updateQuotationItem(id, item),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['q_quotation_items', quotationId] }),
    onError: (e: any) => toast({ title: t('common.updateFailed'), description: e.message, variant: 'destructive' }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => qs.deleteQuotationItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['q_quotation_items', quotationId] }),
    onError: (e: any) => toast({ title: t('common.deleteFailed'), description: e.message, variant: 'destructive' }),
  });

  return { items, loading: isLoading, addItem, updateItem, deleteItem };
}
