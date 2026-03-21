/**
 * Fixed Assets Service
 * 固定资产 CRUD 及折旧计算
 */

import { supabase, handleSupabaseError, requireTenantId } from './base';
import { differenceInMonths } from 'date-fns';

export interface FixedAsset {
  id: string;
  asset_code: string;
  asset_name: string;
  category: string | null;
  purchase_date: string;
  purchase_amount: number;
  currency: string;
  exchange_rate: number;
  purchase_amount_myr: number;
  useful_life_months: number | null;
  salvage_value: number | null;
  depreciation_method: string | null;
  current_value: number | null;
  accumulated_depreciation: number | null;
  status: string | null;
  location: string | null;
  notes: string | null;
  project_id: string | null;
  created_at: string;
}

export interface FixedAssetFormData {
  asset_code: string;
  asset_name: string;
  category: string;
  purchase_date: string;
  purchase_amount: number;
  currency: string;
  exchange_rate: number;
  useful_life_months: number;
  salvage_value: number;
  depreciation_method: string;
  status: string;
  location: string;
  notes: string;
}

/** 计算折旧 */
export function calcDepreciation(asset: {
  purchase_date: string;
  purchase_amount_myr: number;
  useful_life_months: number | null;
  salvage_value: number | null;
  depreciation_method: string | null;
}) {
  const months = differenceInMonths(new Date(), new Date(asset.purchase_date));
  const life = asset.useful_life_months || 60;
  const salvage = asset.salvage_value || 0;
  const depreciable = asset.purchase_amount_myr - salvage;

  if (asset.depreciation_method === 'straight_line') {
    const monthlyDep = depreciable / life;
    const accumulated = Math.min(monthlyDep * months, depreciable);
    return { accumulated, current: asset.purchase_amount_myr - accumulated };
  }

  // Declining balance
  const rate = 2 / life;
  let value = asset.purchase_amount_myr;
  for (let i = 0; i < Math.min(months, life); i++) {
    value = Math.max(value * (1 - rate), salvage);
  }
  return { accumulated: asset.purchase_amount_myr - value, current: value };
}

export async function fetchFixedAssets(tenantId: string): Promise<FixedAsset[]> {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('fixed_assets')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data as FixedAsset[];
}

export async function saveFixedAsset(
  form: FixedAssetFormData & { id?: string },
  userId: string | undefined,
  tenantId: string | undefined
) {
  requireTenantId(tenantId);
  const amountMyr = form.purchase_amount * form.exchange_rate;
  const dep = calcDepreciation({
    purchase_date: form.purchase_date,
    purchase_amount_myr: amountMyr,
    useful_life_months: form.useful_life_months,
    salvage_value: form.salvage_value,
    depreciation_method: form.depreciation_method,
  });
  const payload = {
    asset_code: form.asset_code,
    asset_name: form.asset_name,
    category: form.category,
    purchase_date: form.purchase_date,
    purchase_amount: form.purchase_amount,
    currency: form.currency,
    exchange_rate: form.exchange_rate,
    purchase_amount_myr: amountMyr,
    useful_life_months: form.useful_life_months,
    salvage_value: form.salvage_value,
    depreciation_method: form.depreciation_method,
    current_value: dep.current,
    accumulated_depreciation: dep.accumulated,
    status: form.status,
    location: form.location || null,
    notes: form.notes || null,
    created_by: userId,
  };

  if (form.id) {
    const { error } = await supabase.from('fixed_assets').update(payload).eq('id', form.id);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('fixed_assets').insert({ ...payload, tenant_id: tenantId });
    if (error) handleSupabaseError(error);
  }
}

export async function deleteFixedAsset(id: string) {
  const { error } = await supabase.from('fixed_assets').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function recalculateAllDepreciation(assets: FixedAsset[]): Promise<number> {
  let count = 0;
  for (const a of assets) {
    if (a.status !== 'active') continue;
    const dep = calcDepreciation(a);
    await supabase
      .from('fixed_assets')
      .update({
        current_value: dep.current,
        accumulated_depreciation: dep.accumulated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', a.id);
    count++;
  }
  return count;
}

/** 统计汇总 */
export function calcAssetStats(assets: FixedAsset[]) {
  const totalValue = assets.reduce((s, a) => s + (a.purchase_amount_myr || 0), 0);
  const totalDep = assets.reduce((s, a) => s + calcDepreciation(a).accumulated, 0);
  return { totalValue, totalDep, netValue: totalValue - totalDep };
}
