import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import type { Customer } from '@/types/quotation';
import * as qs from '@/services/quotation.service';

export function useQCustomers() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['q_customers'],
    queryFn: () => qs.fetchCustomers(),
    enabled: !!user,
  });

  const addCustomer = useMutation({
    mutationFn: (customer: Omit<Customer, 'id'>) => qs.addCustomer(customer, user?.id, tenant?.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['q_customers'] }); toast({ title: '客户已添加' }); },
    onError: (e: any) => toast({ title: '添加失败', description: e.message, variant: 'destructive' }),
  });

  const updateCustomer = useMutation({
    mutationFn: ({ id, ...customer }: Partial<Customer> & { id: string }) => qs.updateCustomer(id, customer),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['q_customers'] }); toast({ title: '客户已更新' }); },
    onError: (e: any) => toast({ title: '更新失败', description: e.message, variant: 'destructive' }),
  });

  const deleteCustomer = useMutation({
    mutationFn: (id: string) => qs.deleteCustomer(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['q_customers'] }); toast({ title: '客户已删除' }); },
    onError: (e: any) => toast({ title: '删除失败', description: e.message, variant: 'destructive' }),
  });

  return { customers, loading: isLoading, addCustomer, updateCustomer, deleteCustomer };
}
