/**
 * Purchasing Service
 * 采购系统数据服务层
 */

import { supabase, handleSupabaseError } from './base';

// ===== Types =====

export interface PurchasingMaterial {
  id: string; name: string; code: string; specification: string;
  unit: string; defaultPrice: number; notes: string; materialType: string;
  wastePct: number; priceCny: number; volumeCbm: number; defaultSupplierId: string | null;
}

export interface InventoryItem {
  id: string; materialId: string; materialName: string; materialCode: string;
  unit: string; unitPrice: number; currentQuantity: number; minQuantity: number;
  maxQuantity: number; location: string;
}

// ===== Materials =====

export async function fetchPurchasingMaterials() {
  const { data, error } = await (supabase as any)
    .from('q_materials').select('*').eq('is_active', true).order('name');
  if (error) handleSupabaseError(error);
  return (data || []).map((m: any) => ({
    id: m.id, name: m.name || '', code: m.code || '', specification: m.specification || '',
    unit: m.unit || '个', defaultPrice: Number(m.default_price) || 0, notes: m.notes || '',
    materialType: m.material_type || 'cost',
    wastePct: Number(m.waste_pct) || 0,
    priceCny: Number(m.price_cny) || 0,
    volumeCbm: Number(m.volume_cbm) || 0,
    defaultSupplierId: m.default_supplier_id,
  })) as PurchasingMaterial[];
}

export async function saveMaterial(m: any, userId?: string) {
  const payload = {
    name: m.name, code: m.code, specification: m.specification, unit: m.unit,
    default_price: m.defaultPrice, notes: m.notes, material_type: m.materialType || 'cost',
    waste_pct: m.wastePct || 0, price_cny: m.priceCny || 0, volume_cbm: m.volumeCbm || 0,
    default_supplier_id: m.defaultSupplierId || null,
  };
  if (m.id) {
    const { error } = await (supabase as any).from('q_materials').update(payload).eq('id', m.id);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await (supabase as any).from('q_materials').insert({ ...payload, created_by: userId });
    if (error) handleSupabaseError(error);
  }
}

export async function deactivateMaterial(id: string) {
  const { error } = await (supabase as any).from('q_materials').update({ is_active: false }).eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function fetchShippingRate() {
  const { data } = await (supabase as any).from('q_cost_settings').select('value').eq('key', 'shipping_rate_per_cbm').single();
  return Number(data?.value) || 0;
}

// ===== Suppliers =====

export async function saveSupplier(s: any, userId?: string, existingSuppliers?: any[]) {
  const payload = { name: s.name, contact_person: s.contactPerson, phone: s.phone, email: s.email, address: s.address, payment_terms: s.paymentTerms, notes: s.notes };
  if (s.id) {
    const { error } = await (supabase as any).from('q_suppliers').update(payload).eq('id', s.id);
    if (error) handleSupabaseError(error);
  } else {
    const maxCode = (existingSuppliers || []).reduce((max: number, sup: any) => {
      const num = parseInt((sup.supplierCode || '').replace('SUP', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const newCode = `SUP${String(maxCode + 1).padStart(3, '0')}`;
    const { error } = await (supabase as any).from('q_suppliers').insert({ ...payload, supplier_code: newCode, created_by: userId });
    if (error) handleSupabaseError(error);
  }
}

export async function deactivateSupplier(id: string) {
  const { error } = await (supabase as any).from('q_suppliers').update({ is_active: false }).eq('id', id);
  if (error) handleSupabaseError(error);
}

// ===== Orders =====

export async function createOrder(data: { supplierId: string; notes: string; deliveryDate: string }, orderNo: string, userId?: string) {
  const { error } = await (supabase as any).from('q_purchase_orders').insert({
    order_no: orderNo, supplier_id: data.supplierId || null,
    notes: data.notes, delivery_date: data.deliveryDate || null, created_by: userId,
  });
  if (error) handleSupabaseError(error);
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { error } = await (supabase as any).from('q_purchase_orders').update({ status }).eq('id', orderId);
  if (error) handleSupabaseError(error);
}

export async function deleteOrder(id: string) {
  await (supabase as any).from('q_purchase_order_items').delete().eq('purchase_order_id', id);
  await (supabase as any).from('q_purchase_payments').delete().eq('purchase_order_id', id);
  const { error } = await (supabase as any).from('q_purchase_orders').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ===== Order Items =====

export async function fetchOrderItems(orderId: string) {
  const { data, error } = await (supabase as any)
    .from('q_purchase_order_items')
    .select('*, q_materials(name, unit)')
    .eq('purchase_order_id', orderId)
    .order('created_at');
  if (error) handleSupabaseError(error);
  return (data || []).map((item: any) => ({
    id: item.id, materialId: item.material_id,
    materialName: item.q_materials?.name || '未知',
    unit: item.q_materials?.unit || '',
    quantity: Number(item.quantity) || 0, unitPrice: Number(item.unit_price) || 0,
    totalPrice: Number(item.total_price) || 0, receivedQuantity: Number(item.received_quantity) || 0,
    notes: item.notes,
  }));
}

export async function addOrderItem(orderId: string, item: { materialId: string; quantity: number; unitPrice: number; notes: string }) {
  const total = item.quantity * item.unitPrice;
  const { error } = await (supabase as any).from('q_purchase_order_items').insert({
    purchase_order_id: orderId, material_id: item.materialId,
    quantity: item.quantity, unit_price: item.unitPrice, total_price: total, notes: item.notes,
  });
  if (error) handleSupabaseError(error);
  await recalcOrderTotal(orderId);
}

export async function deleteOrderItem(itemId: string, orderId: string) {
  const { error } = await (supabase as any).from('q_purchase_order_items').delete().eq('id', itemId);
  if (error) handleSupabaseError(error);
  await recalcOrderTotal(orderId);
}

export async function updateOrderItem(itemId: string, orderId: string, qty: number, price: number) {
  const totalPrice = qty * price;
  await (supabase as any).from('q_purchase_order_items')
    .update({ quantity: qty, unit_price: price, total_price: totalPrice })
    .eq('id', itemId);
  // Sync price to cost breakdown if linked
  const editedItem = await (supabase as any).from('q_purchase_order_items').select('material_id').eq('id', itemId).maybeSingle();
  if (editedItem.data?.material_id) {
    const { data: po } = await (supabase as any).from('q_purchase_orders')
      .select('project_breakdown_id').eq('id', orderId).maybeSingle();
    if (po?.project_breakdown_id) {
      const { data: bdItem } = await (supabase as any).from('q_breakdown_items')
        .select('id, purchase_quantity')
        .eq('project_breakdown_id', po.project_breakdown_id)
        .eq('material_id', editedItem.data.material_id)
        .maybeSingle();
      if (bdItem) {
        const newEstCost = (bdItem.purchase_quantity || qty) * price;
        await (supabase as any).from('q_breakdown_items')
          .update({ unit_price: price, estimated_cost: newEstCost })
          .eq('id', bdItem.id);
        const { data: allItems } = await (supabase as any).from('q_breakdown_items')
          .select('estimated_cost').eq('project_breakdown_id', po.project_breakdown_id);
        const matTotal = (allItems || []).reduce((s: number, i: any) => s + (Number(i.estimated_cost) || 0), 0);
        await (supabase as any).from('q_project_breakdowns')
          .update({ total_material_cost: matTotal, total_cost: matTotal })
          .eq('id', po.project_breakdown_id);
      }
    }
  }
  await recalcOrderTotal(orderId);
}

export async function recalcOrderTotal(orderId: string) {
  const { data } = await (supabase as any).from('q_purchase_order_items').select('total_price').eq('purchase_order_id', orderId);
  const total = (data || []).reduce((s: number, i: any) => s + (Number(i.total_price) || 0), 0);
  await (supabase as any).from('q_purchase_orders').update({ total_amount: total }).eq('id', orderId);
}

export async function fetchActiveMaterials() {
  const { data } = await (supabase as any).from('q_materials').select('id, name, unit, default_price, code').eq('is_active', true).order('name');
  return data || [];
}

export async function fetchActiveMaterialsWithCode() {
  const { data } = await (supabase as any).from('q_materials')
    .select('id, code, name, unit, default_price')
    .eq('is_active', true)
    .order('code');
  return data || [];
}

// ===== Payments =====

export async function fetchOrderPayments(orderId: string) {
  const { data, error } = await (supabase as any)
    .from('q_purchase_payments').select('*').eq('purchase_order_id', orderId)
    .order('payment_date', { ascending: false });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function addOrderPayment(
  orderId: string,
  payment: { amount: number; paymentMethod: string; referenceNo: string; notes: string; paymentDate?: string },
  userId?: string
) {
  const { error } = await (supabase as any).from('q_purchase_payments').insert({
    purchase_order_id: orderId, amount: payment.amount,
    payment_method: payment.paymentMethod, reference_no: payment.referenceNo || null,
    notes: payment.notes || null, created_by: userId,
    ...(payment.paymentDate ? { payment_date: payment.paymentDate } : {}),
  });
  if (error) handleSupabaseError(error);
}

export async function updateOrderPaymentStatus(orderId: string, totalPaid: number, totalAmount: number) {
  const paymentStatus = totalPaid >= totalAmount ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
  await (supabase as any).from('q_purchase_orders').update({ paid_amount: totalPaid, payment_status: paymentStatus }).eq('id', orderId);
}

// ===== Payment Page data =====

export async function fetchPaymentPageData(orderId: string) {
  const { data: po, error: poError } = await (supabase as any)
    .from('q_purchase_orders').select('*, q_suppliers (name)').eq('id', orderId).maybeSingle();
  if (poError) handleSupabaseError(poError);
  const { data: pmts, error: pmtError } = await (supabase as any)
    .from('q_purchase_payments').select('*').eq('purchase_order_id', orderId).order('payment_date', { ascending: false });
  if (pmtError) handleSupabaseError(pmtError);
  const mapped = (pmts || []).map((p: any) => ({
    id: p.id, paymentDate: p.payment_date, amount: Number(p.amount),
    paymentMethod: p.payment_method || 'bank_transfer', referenceNo: p.reference_no, notes: p.notes, createdAt: p.created_at,
  }));
  return {
    orderNo: po.order_no as string,
    supplierName: (po.q_suppliers?.name || '未指定') as string,
    totalAmount: Number(po.total_amount) || 0,
    payments: mapped,
    paidAmount: mapped.reduce((s: number, p: any) => s + p.amount, 0),
  };
}

export async function savePayment(orderId: string, form: any, paidAmount: number, totalAmount: number, userId?: string) {
  const { error } = await (supabase as any).from('q_purchase_payments').insert({
    purchase_order_id: orderId, payment_date: form.paymentDate, amount: form.amount,
    payment_method: form.paymentMethod, reference_no: form.referenceNo || null, notes: form.notes || null, created_by: userId,
  });
  if (error) handleSupabaseError(error);
  const newPaid = paidAmount + form.amount;
  const newStatus = newPaid >= totalAmount ? 'paid' : 'partial';
  await (supabase as any).from('q_purchase_orders').update({ payment_status: newStatus, paid_amount: newPaid }).eq('id', orderId);
}

// ===== Receiving =====

export async function fetchReceivingPageData(orderId: string) {
  const { data: po, error: poError } = await (supabase as any)
    .from('q_purchase_orders').select('*, q_suppliers (name)').eq('id', orderId).maybeSingle();
  if (poError) handleSupabaseError(poError);
  const { data: items, error: itemsError } = await (supabase as any)
    .from('q_purchase_order_items').select('*, q_materials (code, name, unit)')
    .eq('purchase_order_id', orderId).order('created_at');
  if (itemsError) handleSupabaseError(itemsError);
  const poItems = (items || []).map((i: any) => {
    const qty = Number(i.quantity) || 0;
    const received = Number(i.received_quantity) || 0;
    return {
      id: i.id, materialId: i.material_id, materialCode: i.q_materials?.code || '--',
      materialName: i.q_materials?.name || '--', unit: i.q_materials?.unit || '--',
      quantity: qty, receivedQty: received, remainingQty: qty - received, unitPrice: Number(i.unit_price) || 0,
    };
  });
  const { data: recvData } = await (supabase as any)
    .from('q_purchase_receivings').select('*, q_purchase_receiving_items (*)')
    .eq('purchase_order_id', orderId).order('created_at', { ascending: false });
  return {
    orderNo: po.order_no as string,
    supplierName: (po.q_suppliers?.name || '未指定') as string,
    poItems,
    receivings: recvData || [],
  };
}

export async function createReceiving(orderId: string, lines: any[], notes: string, photos: File[], poItems: any[], userId?: string) {
  const validLines = lines.filter((l: any) => l.receivingNow > 0);
  if (validLines.length === 0) throw new Error('请填写收货数量');

  const prefix = `RCV-${new Date().getFullYear()}-`;
  const { data: lastRcv } = await (supabase as any).from('q_purchase_receivings').select('receiving_no')
    .like('receiving_no', `${prefix}%`).order('receiving_no', { ascending: false }).limit(1);
  let nextNum = 1;
  if (lastRcv && lastRcv.length > 0) nextNum = (parseInt(lastRcv[0].receiving_no.replace(prefix, ''), 10) || 0) + 1;
  const receivingNo = `${prefix}${String(nextNum).padStart(3, '0')}`;

  const { data: rcv, error: rcvError } = await (supabase as any).from('q_purchase_receivings').insert({
    purchase_order_id: orderId, receiving_no: receivingNo, notes: notes || null, created_by: userId,
  }).select().single();
  if (rcvError) handleSupabaseError(rcvError);

  const photoUrls: string[] = [];
  for (const photo of photos) {
    const path = `po/${orderId}/receiving/${rcv.id}/${Date.now()}_${photo.name}`;
    const { error: upErr } = await supabase.storage.from('receipts').upload(path, photo);
    if (!upErr) photoUrls.push(path);
  }

  const rcvItems = validLines.map((l: any) => ({
    receiving_id: rcv.id, purchase_order_item_id: l.poItemId, material_id: l.materialId,
    received_quantity: l.receivingNow, exception_notes: l.exceptionNotes || null,
    photos: photoUrls.length > 0 ? photoUrls : null,
  }));
  const { error: riError } = await (supabase as any).from('q_purchase_receiving_items').insert(rcvItems);
  if (riError) handleSupabaseError(riError);

  for (const line of validLines) {
    const newTotal = line.previouslyReceived + line.receivingNow;
    await (supabase as any).from('q_purchase_order_items').update({ received_quantity: newTotal }).eq('id', line.poItemId);
  }

  const allFullyReceived = poItems.every((i: any) => {
    const line = validLines.find((l: any) => l.poItemId === i.id);
    const newReceived = line ? i.receivedQty + line.receivingNow : i.receivedQty;
    return newReceived >= i.quantity;
  });

  await (supabase as any).from('q_purchase_orders').update({
    received_status: allFullyReceived ? 'received' : 'partially_received',
    status: allFullyReceived ? 'received' : 'partially_received',
  }).eq('id', orderId);

  for (const line of validLines) {
    if (!line.materialId) continue;
    const { data: existing } = await (supabase as any).from('q_inventory').select('id, current_quantity').eq('material_id', line.materialId).limit(1);
    if (existing && existing.length > 0) {
      await (supabase as any).from('q_inventory').update({ current_quantity: Number(existing[0].current_quantity) + line.receivingNow, updated_at: new Date().toISOString() }).eq('id', existing[0].id);
    } else {
      await (supabase as any).from('q_inventory').insert({ material_id: line.materialId, current_quantity: line.receivingNow });
    }
    await (supabase as any).from('q_inventory_transactions').insert({
      material_id: line.materialId, transaction_type: 'in', quantity: line.receivingNow,
      reference_type: 'receiving', reference_id: rcv.id, notes: `收货 ${receivingNo}`, created_by: userId,
    });
  }

  return receivingNo;
}

// ===== Inventory =====

export async function fetchInventory() {
  const { data, error } = await (supabase as any)
    .from('q_inventory')
    .select('*, q_materials(name, unit, code, default_price)')
    .order('updated_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data || []).map((i: any) => ({
    id: i.id, materialId: i.material_id,
    materialName: i.q_materials?.name || '未知',
    materialCode: i.q_materials?.code || '',
    unit: i.q_materials?.unit || '',
    unitPrice: Number(i.q_materials?.default_price) || 0,
    currentQuantity: Number(i.current_quantity) || 0,
    minQuantity: Number(i.min_quantity) || 0,
    maxQuantity: Number(i.max_quantity) || 0,
    location: i.location || '',
  })) as InventoryItem[];
}

export async function fetchInventoryTransactions(materialId: string) {
  const { data } = await (supabase as any)
    .from('q_inventory_transactions')
    .select('*')
    .eq('material_id', materialId)
    .order('created_at', { ascending: false })
    .limit(30);
  return data || [];
}

export async function adjustInventory(item: InventoryItem, adjustType: 'in' | 'out', qty: number, notes: string, userId?: string) {
  const { error: txError } = await (supabase as any).from('q_inventory_transactions').insert({
    material_id: item.materialId,
    transaction_type: adjustType === 'in' ? 'manual_in' : 'manual_out',
    quantity: Math.abs(qty),
    notes: notes || (adjustType === 'in' ? '入库' : '出库'),
    created_by: userId,
  });
  if (txError) handleSupabaseError(txError);
  const delta = adjustType === 'out' ? -qty : qty;
  const newQty = item.currentQuantity + delta;
  const { error: invError } = await (supabase as any).from('q_inventory')
    .update({ current_quantity: Math.max(0, newQty), updated_at: new Date().toISOString() })
    .eq('id', item.id);
  if (invError) handleSupabaseError(invError);
}

// ===== Order Detail Page =====

export async function fetchOrderDetail(orderId: string) {
  const [poRes, itemsRes, attachRes, logsRes] = await Promise.all([
    (supabase as any).from('q_purchase_orders').select('*, q_suppliers (name)').eq('id', orderId).maybeSingle(),
    (supabase as any).from('q_purchase_order_items').select('*, q_materials (code, name, unit)').eq('purchase_order_id', orderId).order('created_at', { ascending: true }),
    (supabase as any).from('q_po_attachments').select('*').eq('purchase_order_id', orderId).order('created_at', { ascending: false }),
    (supabase as any).from('q_po_audit_logs').select('*').eq('purchase_order_id', orderId).order('created_at', { ascending: false }),
  ]);
  if (poRes.error) handleSupabaseError(poRes.error);
  const po = poRes.data;
  return {
    order: {
      id: po.id, orderNo: po.order_no, supplierId: po.supplier_id,
      supplierName: po.q_suppliers?.name || '未指定', status: po.status || 'draft',
      totalAmount: Number(po.total_amount) || 0, deliveryDate: po.delivery_date,
      notes: po.notes, createdAt: po.created_at,
      paymentStatus: po.payment_status || 'unpaid', paidAmount: Number(po.paid_amount) || 0,
    },
    items: (itemsRes.data || []).map((i: any) => ({
      id: i.id, materialId: i.material_id, materialCode: i.q_materials?.code || '--',
      materialName: i.q_materials?.name || '--', unit: i.q_materials?.unit || '--',
      quantity: Number(i.quantity) || 0, unitPrice: Number(i.unit_price) || 0,
      totalPrice: Number(i.total_price) || 0, receivedQty: Number(i.received_quantity) || 0, notes: i.notes,
    })),
    attachments: (attachRes.data || []).map((a: any) => ({
      id: a.id, fileName: a.file_name, fileUrl: a.file_url, fileType: a.file_type,
      fileSize: a.file_size, uploadedBy: a.uploaded_by, createdAt: a.created_at,
    })),
    auditLogs: (logsRes.data || []).map((l: any) => ({
      id: l.id, action: l.action, details: l.details, performedBy: l.performed_by, createdAt: l.created_at,
    })),
  };
}

export async function uploadAttachment(orderId: string, file: File, fileType: string, userId?: string) {
  const path = `po/${orderId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from('receipts').upload(path, file);
  if (uploadError) handleSupabaseError(uploadError);
  await (supabase as any).from('q_po_attachments').insert({
    purchase_order_id: orderId, file_name: file.name, file_url: path,
    file_type: fileType, file_size: file.size, uploaded_by: userId,
  });
}

export async function deleteAttachment(att: { id: string; fileUrl: string }) {
  const urlParts = att.fileUrl.split('/receipts/');
  if (urlParts[1]) await supabase.storage.from('receipts').remove([decodeURIComponent(urlParts[1])]);
  await (supabase as any).from('q_po_attachments').delete().eq('id', att.id);
}
