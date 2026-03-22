import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import * as qs from '@/services/quotation.service';

export interface ProductCategoryDB {
  id: string;
  code: string;
  name_zh: string;
  name_en: string;
  parent_id: string | null;
  sort_order: number;
  is_system: boolean;
}

export function useProductCategories() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['q_product_categories', tenantId],
    queryFn: () => qs.fetchProductCategories() as Promise<ProductCategoryDB[]>,
    enabled: !!user && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  return { categories, loading: isLoading };
}
