/**
 * Memos Service
 * 
 * 备忘录模块的数据访问层。
 */

import { supabase, handleSupabaseError, requireTenantId } from './base';
import { isPast, isToday } from 'date-fns';

export interface Memo {
  id: string;
  title: string;
  content: string | null;
  reminder_time: string | null;
  is_completed: boolean;
  created_at: string;
}

// ── Fetch ──

export async function fetchMemos(tenantId: string): Promise<Memo[]> {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('memos')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('is_completed', { ascending: true })
    .order('reminder_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data || []) as Memo[];
}

export async function fetchActiveReminderCount(tenantId: string): Promise<number> {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('memos')
    .select('id, reminder_time, is_completed')
    .eq('tenant_id', tenantId)
    .eq('is_completed', false);
  if (error) return 0;
  return (data || []).filter(m => {
    if (!m.reminder_time) return false;
    const date = new Date(m.reminder_time);
    return isPast(date) || isToday(date);
  }).length;
}

// ── Mutations ──

export async function saveMemo(
  payload: { title: string; content: string | null; reminder_time: string | null },
  userId?: string,
  editId?: string
) {
  const row = { ...payload, created_by: userId };
  if (editId) {
    const { error } = await supabase.from('memos').update(row).eq('id', editId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('memos').insert(row);
    if (error) handleSupabaseError(error);
  }
}

export async function toggleMemoComplete(id: string, currentValue: boolean) {
  const { error } = await supabase.from('memos').update({ is_completed: !currentValue }).eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function deleteMemo(id: string) {
  const { error } = await supabase.from('memos').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}
