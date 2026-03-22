import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
  logPurchaseOrderAudit, fetchPurchaseOrderItems, updatePurchaseOrderStatus,
  submitPOToFinance, generatePurchaseOrderNo,
} from '@/services/admin.service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { queryKeys } from '@/lib/queryKeys';

export interface QPurchaseOrder {
  id: string;
  orderNo: string;
  supplierId: string | null;
  supplierName?: string;
  projectBreakdownId: string | null;
  status: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  receivedStatus: string;
  deliveryDate: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  submittedToFinanceAt: string | null;
  submittedToFinanceBy: string | null;
}

export interface QPurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  materialId: string | null;
  materialName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
}

interface PurchaseOrderInsert {
  orderNo: string;
  supplierId?: string | null;
  projectBreakdownId?: string | null;
  status?: string;
  totalAmount?: number;
  deliveryDate?: string | null;
  notes?: string | null;
}

export function useQPurchaseOrders() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['q_purchase_orders', tenantId],
    queryFn: async () => {
      const data = await fetchPurchaseOrders();
      return data.map((o: any) => ({
        id: o.id,
        orderNo: o.order_no,
        supplierId: o.supplier_id,
        supplierName: o.q_suppliers?.name,
        projectBreakdownId: o.project_breakdown_id,
        status: o.status || 'draft',
        totalAmount: Number(o.total_amount) || 0,
        paidAmount: Number(o.paid_amount) || 0,
        paymentStatus: o.payment_status || 'unpaid',
        receivedStatus: o.received_status || 'pending',
        deliveryDate: o.delivery_date,
        notes: o.notes,
        createdBy: o.created_by,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        submittedToFinanceAt: o.submitted_to_finance_at,
        submittedToFinanceBy: o.submitted_to_finance_by,
      })) as QPurchaseOrder[];
    },
    enabled: !!user,
  });

  const logAudit = async (purchaseOrderId: string, action: string, details?: string) => {
    if (user?.id) await logPurchaseOrderAudit(purchaseOrderId, action, details, user.id);
  };

  const addMutation = useMutation({
    mutationFn: async (order: PurchaseOrderInsert) => {
      const data = await createPurchaseOrder({
        order_no: order.orderNo,
        supplier_id: order.supplierId,
        project_breakdown_id: order.projectBreakdownId,
        status: order.status ?? 'draft',
        total_amount: order.totalAmount ?? 0,
        delivery_date: order.deliveryDate,
        notes: order.notes,
        created_by: user?.id,
        tenant_id: tenant?.id,
      });
      await logAudit(data.id, 'created', `创建采购单 ${order.orderNo}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_purchase_orders', tenantId] });
      toast({ title: '采购单已创建', description: '新采购单已保存' });
    },
    onError: (error: any) => {
      toast({ title: '创建失败', description: error.message || '无法创建采购单', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QPurchaseOrder> & { id: string }) => {
      const updatePayload: any = {};
      if (updates.orderNo !== undefined) updatePayload.order_no = updates.orderNo;
      if (updates.supplierId !== undefined) updatePayload.supplier_id = updates.supplierId;
      if (updates.projectBreakdownId !== undefined) updatePayload.project_breakdown_id = updates.projectBreakdownId;
      if (updates.status !== undefined) updatePayload.status = updates.status;
      if (updates.totalAmount !== undefined) updatePayload.total_amount = updates.totalAmount;
      if (updates.deliveryDate !== undefined) updatePayload.delivery_date = updates.deliveryDate;
      if (updates.notes !== undefined) updatePayload.notes = updates.notes;

      await updatePurchaseOrder(id, updatePayload);
      await logAudit(id, 'updated', '更新采购单');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_purchase_orders', tenantId] });
      toast({ title: '采购单已更新' });
    },
    onError: (error: any) => {
      toast({ title: '更新失败', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deletePurchaseOrder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_purchase_orders', tenantId] });
      toast({ title: '采购单已删除' });
    },
    onError: (error: any) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' });
    },
  });

  const confirmOrder = async (id: string) => {
    const items = await fetchPurchaseOrderItems(id);
    if (!items || items.length === 0) {
      throw new Error('采购单中没有材料明细，无法确认下单');
    }
    const invalidItems = items.filter((i: any) => Number(i.quantity) <= 0 || Number(i.unit_price) <= 0);
    if (invalidItems.length > 0) {
      throw new Error(`有 ${invalidItems.length} 项材料的数量或价格无效`);
    }
    await updatePurchaseOrderStatus(id, 'ordered');
    await logAudit(id, 'status_changed', '确认下单：草稿 → 已下单');
    queryClient.invalidateQueries({ queryKey: ['q_purchase_orders', tenantId] });
    toast({ title: '已确认下单' });
  };

  const submitToFinance = async (id: string) => {
    await submitPOToFinance(id, user!.id, tenant?.id);
    await logAudit(id, 'submitted_to_finance', '提交至财务部，已创建应付账款记录');
    queryClient.invalidateQueries({ queryKey: ['q_purchase_orders', tenantId] });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.payables, tenantId] });
    toast({ title: '已提交至财务', description: '已自动创建应付账款记录' });
  };

  const archiveOrder = async (id: string) => {
    await updatePurchaseOrderStatus(id, 'archived');
    await logAudit(id, 'archived', '采购单已归档');
    queryClient.invalidateQueries({ queryKey: ['q_purchase_orders', tenantId] });
    toast({ title: '采购单已归档' });
  };

  return {
    orders,
    loading: isLoading,
    error,
    addOrder: addMutation.mutateAsync,
    updateOrder: updateMutation.mutateAsync,
    deleteOrder: deleteMutation.mutateAsync,
    confirmOrder,
    submitToFinance,
    archiveOrder,
    logAudit,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch,
    generateOrderNo: generatePurchaseOrderNo,
  };
}
