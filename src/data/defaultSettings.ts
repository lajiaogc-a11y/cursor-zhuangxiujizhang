import type { CompanySettings } from '@/types/quotation';

export const defaultSettings: CompanySettings = {
  companyName: 'FLASH CAST SDN. BHD.',
  ssmNo: '',
  companyAddress: '',
  bankInfo: '',
  currency: 'MYR',
  taxSettings: {
    enableDiscount: false,
    discountAmount: 0,
    shippingRatePerCbm: 0,
    sstPct: 8,
  },
  paymentTerms: {
    deposit: 50,
    progress: 30,
    final: 20,
  },
  validityPeriod: 30,
};
