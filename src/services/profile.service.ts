/**
 * Profile Service
 * 用户资料和密码管理
 */

import { supabase, handleSupabaseError } from './base';

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  return data;
}

export async function updateProfile(userId: string, updates: { display_name: string; username: string }) {
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: updates.display_name.trim(),
      username: updates.username.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) handleSupabaseError(error);
}

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
