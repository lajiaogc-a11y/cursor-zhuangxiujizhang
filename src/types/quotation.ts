// Types for the Quotation System (merged into finance system)

export type ProductCategory = string;

export type PriceTier = 'normal' | 'medium' | 'advanced';

export interface Product {
  id: string;
  nameZh: string;
  nameEn: string;
  unit: string;
  unitPrice: number;
  priceNormal?: number;
  priceMedium?: number;
  priceAdvanced?: number;
  category?: ProductCategory;
  createdBy?: string;
  isCompanyProduct?: boolean;
  description?: string;
  descriptionEn?: string;
}

export interface QuotationItem {
  id: string;
  productId: string;
  nameZh: string;
  nameEn: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  originalUnitPrice?: number;
  lineTotal: number;
  lineTotalUSD: number;
  lineTotalCNY: number;
  category?: ProductCategory;
  priceTier?: PriceTier;
  note?: string;
  description?: string;
  descriptionEn?: string;
}

export interface TaxSettings {
  enableDiscount: boolean;
  discountAmount: number;
  shippingRatePerCbm?: number;
  sstPct?: number;
}

export interface PaymentTerms {
  deposit: number;
  progress: number;
  final: number;
}

export interface CostAnalysis {
  estimatedCost: number;
  targetProfitRate: number;
  estimatedProfit: number;
  actualProfitRate: number;
}

export interface CompanySettings {
  companyName: string;
  ssmNo?: string;
  companyAddress?: string;
  bankInfo?: string;
  currency: string;
  taxSettings: TaxSettings;
  paymentTerms: PaymentTerms;
  validityPeriod: number;
}

export interface Customer {
  id: string;
  nameZh: string;
  nameEn?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
}

export interface QuotationSummary {
  subtotal: number;
  subtotalUSD: number;
  subtotalCNY: number;
  discount: number;
  grandTotal: number;
  grandTotalUSD: number;
  grandTotalCNY: number;
  depositAmount: number;
  progressAmount: number;
  finalAmount: number;
}

export type ExportLanguage = 'zh' | 'en' | 'zh-en';

export const UNIT_LABELS: Record<string, { zh: string; en: string }> = {
  unit: { zh: '套', en: 'unit' },
  ft: { zh: '尺', en: 'ft' },
  sqft: { zh: '平方尺', en: 'sqft' },
  m2: { zh: '平方米', en: 'm²' },
  item: { zh: '项', en: 'item' },
  room: { zh: '间', en: 'room' },
  m: { zh: '米', en: 'm' },
  set: { zh: '套', en: 'set' },
  group: { zh: '组', en: 'group' },
  pcs: { zh: '个', en: 'pcs' },
  lot: { zh: '批', en: 'lot' },
};

export const PRICE_TIER_LABELS: Record<PriceTier, { zh: string; en: string }> = {
  normal: { zh: '普通', en: 'Standard' },
  medium: { zh: '中等', en: 'Medium' },
  advanced: { zh: '高级', en: 'Premium' },
};
