import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
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
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['q_suppliers_list', tenantId],
    queryFn: () => qs.fetchQSuppliers() as Promise<QSupplier[]>,
    enabled: !!user && !!tenantId,
  });

  return { suppliers, loading: isLoading };
}
