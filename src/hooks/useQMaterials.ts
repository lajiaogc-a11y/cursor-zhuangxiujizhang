import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import * as qs from '@/services/quotation.service';

export interface QMaterial {
  id: string;
  materialCode: string;
  categoryId: string | null;
  nameZh: string;
  nameEn: string | null;
  spec: string | null;
  unit: string;
  defaultWastePct: number;
  defaultPrice: number;
  volumeCbm: number;
  defaultSupplierId: string | null;
  defaultSupplierName: string | null;
  notes: string | null;
  isActive: boolean;
  priceCny: number;
  materialType: 'cost' | 'purchasing';
  createdAt: string;
  updatedAt: string;
}

export function useQMaterials(typeFilter?: 'cost' | 'all') {
  const { user } = useAuth();

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['q_materials_cost', typeFilter],
    queryFn: () => qs.fetchQMaterials(typeFilter) as Promise<QMaterial[]>,
    enabled: !!user,
  });

  return { materials, loading: isLoading };
}
