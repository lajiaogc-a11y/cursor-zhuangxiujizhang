/**
 * Service Layer Base
 * 
 * 所有数据访问的基础设施层。
 * 组件不再直接调用 supabase，而是通过 service 接口操作数据。
 * 
 * 设计原则：
 * 1. 每个业务模块一个 service 文件
 * 2. Service 返回纯数据，不涉及 UI 状态
 * 3. 错误统一抛出，由 hooks 层处理
 * 4. 租户隔离在 service 层强制执行
 */

import { supabase } from '@/integrations/supabase/client';

// Re-export for services to use
export { supabase };

// ══════════════════════════════════════
// Realtime Helper
// ══════════════════════════════════════

/**
 * 创建 Realtime channel 订阅，避免组件直接导入 supabase client。
 * 返回取消订阅函数。
 */
export function subscribeToTable(
  channelName: string,
  table: string,
  callback: (payload: any) => void,
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE' = '*'
): () => void {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes' as any,
      { event, schema: 'public', table } as any,
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ══════════════════════════════════════
// Auth Helpers (used by Auth pages)
// ══════════════════════════════════════

/** 调用 login-guard edge function 检查锁定状态 */
export async function checkLoginLockout(email: string): Promise<{ locked: boolean; message?: string }> {
  const { data, error } = await supabase.functions.invoke('login-guard', {
    body: { email, action: 'check' },
  });
  if (error) {
    try {
      const ctx = (error as any)?.context;
      if (ctx?.status === 429) {
        const body = typeof ctx.body === 'string' ? JSON.parse(ctx.body) : ctx.body;
        return { locked: true, message: body?.message };
      }
    } catch { /* parse failed */ }
  }
  if (data?.locked) {
    return { locked: true, message: data.message };
  }
  return { locked: false };
}

/** 记录登录尝试 */
export async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
  try {
    await supabase.functions.invoke('login-guard', {
      body: { email, action: 'record', success },
    });
  } catch { /* Silent fail */ }
}

/** 验证邀请码是否有效（不消耗） */
export async function validateInvitationCode(code: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('validate_invitation_code' as any, { p_code: code.trim() });
  if (error || !data) return null;
  return data as string;
}

/** 消耗邀请码并返回租户ID */
export async function useInvitationCode(code: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('use_invitation_code', { p_code: code.trim() });
  if (error || !data) return null;
  return data as string;
}

/** 发送密码重置邮件 */
export async function sendPasswordResetEmail(email: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { error: error as Error | null };
}

/** 更新用户密码 */
export async function updateUserPassword(password: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error as Error | null };
}

/** 监听 auth 状态变化 (用于 ResetPassword 页面) */
export function onAuthStateChange(callback: (event: string) => void): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    callback(event);
  });
  return () => subscription.unsubscribe();
}

/** 标准分页参数 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** 标准分页响应 */
export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
}

/** 标准日期范围 */
export interface DateRangeFilter {
  from?: string; // yyyy-MM-dd
  to?: string;   // yyyy-MM-dd
}

/** 标准排序 */
export interface SortParams {
  column: string;
  ascending: boolean;
}

/** 服务层错误 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/** 将 Supabase 错误转换为 ServiceError */
export function handleSupabaseError(error: { message: string; code?: string; details?: string }): never {
  throw new ServiceError(
    error.message,
    error.code,
    error.details
  );
}

/** 确保 tenantId 存在，否则抛出错误 */
export function requireTenantId(tenantId: string | undefined | null): asserts tenantId is string {
  if (!tenantId) {
    throw new ServiceError('Tenant context required', 'TENANT_REQUIRED');
  }
}
