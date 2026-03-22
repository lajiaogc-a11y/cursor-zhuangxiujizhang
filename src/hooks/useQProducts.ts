import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import type { Product } from '@/types/quotation';
import * as qs from '@/services/quotation.service';

export function useQProducts() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['q_products', tenantId],
    queryFn: () => qs.fetchProducts(),
    enabled: !!user && !!tenantId,
  });

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['q_product_favorites', tenantId, user?.id],
    queryFn: () => qs.fetchProductFavorites(user!.id),
    enabled: !!user && !!tenantId,
  });

  const toggleFavorite = useMutation({
    mutationFn: (productId: string) => qs.toggleProductFavorite(user!.id, productId, favoriteIds.includes(productId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['q_product_favorites', tenantId, user?.id] }),
  });

  const addProduct = useMutation({
    mutationFn: (product: Omit<Product, 'id'>) => qs.addProduct(product, user?.id, tenant?.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['q_products', tenantId] }); toast({ title: '产品已添加' }); },
    onError: (e: any) => toast({ title: '添加失败', description: e.message, variant: 'destructive' }),
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, ...product }: Partial<Product> & { id: string }) => qs.updateProduct(id, product),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['q_products', tenantId] }); toast({ title: '产品已更新' }); },
    onError: (e: any) => toast({ title: '更新失败', description: e.message, variant: 'destructive' }),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => qs.deleteProduct(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['q_products', tenantId] }); toast({ title: '产品已删除' }); },
    onError: (e: any) => toast({ title: '删除失败', description: e.message, variant: 'destructive' }),
  });

  return { products, loading: isLoading, favoriteIds, addProduct, updateProduct, deleteProduct, toggleFavorite };
}
