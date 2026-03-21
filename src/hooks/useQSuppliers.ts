import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import * as qs from '@/services/quotation.service';

export interface QSupplier {
  id: string;
  name: string;
  supplierCode: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  paymentTerms: string | null;
  notes: string | null;
  isActive: boolean;
}

export function useQSuppliers() {
  const { user } = useAuth();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['q_suppliers_list'],
    queryFn: () => qs.fetchQSuppliers() as Promise<QSupplier[]>,
    enabled: !!user,
  });

  return { suppliers, loading: isLoading };
}
