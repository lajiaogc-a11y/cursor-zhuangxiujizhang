/**
 * Admin Service
 * 管理后台数据服务：登录活动、系统公告、错误日志、在线会话
 */

import { supabase, handleSupabaseError, ServiceError } from './base';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// ══════════════════════════════════════
// Login Activity
// ══════════════════════════════════════

export async function fetchRecentLogins(limit = 100) {
  const { data, error } = await supabase
    .from('login_attempts')
    .select('*')
    .order('attempted_at', { ascending: false })
    .limit(limit);
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchLoginHeatmapData(sinceISO: string) {
  const { data, error } = await supabase
    .from('login_attempts')
    .select('attempted_at, success')
    .gte('attempted_at', sinceISO);
  if (error) handleSupabaseError(error);
  return data || [];
}

// ══════════════════════════════════════
// System Announcements
// ══════════════════════════════════════

export async function fetchAllAnnouncements() {
  const { data, error } = await supabase
    .from('system_announcements' as any)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchActiveAnnouncements(nowISO: string) {
  const { data, error } = await supabase
    .from('system_announcements' as any)
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', nowISO)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3);
  if (error) return [];
  return (data || []).filter((a: any) => !a.ends_at || new Date(a.ends_at) > new Date());
}

export async function createAnnouncement(payload: {
  title: string;
  content: string;
  announcement_type: string;
  ends_at: string | null;
  created_by: string | undefined;
}) {
  const { error } = await supabase.from('system_announcements' as any).insert(payload as any);
  if (error) handleSupabaseError(error);
}

export async function toggleAnnouncement(id: string, is_active: boolean) {
  const { error } = await supabase
    .from('system_announcements' as any)
    .update({ is_active } as any)
    .eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from('system_announcements' as any).delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Error Logs
// ══════════════════════════════════════

export interface ErrorLog {
  id: string;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  url: string | null;
  user_agent: string | null;
  user_id: string | null;
  created_at: string;
}

export async function fetchErrorLogs(page: number, pageSize: number, search?: string) {
  let query = supabase
    .from('error_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (search) {
    query = query.ilike('error_message', `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) handleSupabaseError(error);
  return { logs: (data || []) as ErrorLog[], total: count || 0 };
}

export async function fetchErrorFrequency(limit = 500) {
  const { data, error } = await supabase
    .from('error_logs')
    .select('error_message')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) handleSupabaseError(error);

  const countMap = new Map<string, number>();
  (data || []).forEach(e => {
    const key = e.error_message.slice(0, 80);
    countMap.set(key, (countMap.get(key) || 0) + 1);
  });

  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([message, count]) => ({ message, count }));
}

export async function deleteErrorLog(id: string) {
  const { error } = await supabase.from('error_logs').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function bulkDeleteErrorLogs(messagePattern: string) {
  const { error } = await supabase.from('error_logs').delete().ilike('error_message', `${messagePattern}%`);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Online Sessions
// ══════════════════════════════════════

export async function fetchOnlineSessionsData() {
  const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const since15m = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data: events } = await supabase
    .from('analytics_events')
    .select('user_id, page_url, created_at')
    .gte('created_at', since1h)
    .order('created_at', { ascending: false });

  if (!events || events.length === 0) return [];

  const userMap = new Map<string, { lastActive: string; lastPage: string; count: number; isOnline: boolean }>();
  events.forEach(e => {
    if (!e.user_id) return;
    const existing = userMap.get(e.user_id);
    if (!existing) {
      userMap.set(e.user_id, {
        lastActive: e.created_at,
        lastPage: e.page_url || '/',
        count: 1,
        isOnline: new Date(e.created_at) >= new Date(since15m),
      });
    } else {
      existing.count++;
    }
  });

  const userIds = Array.from(userMap.keys());
  const [profilesRes, membershipsRes] = await Promise.all([
    supabase.from('profiles').select('user_id, email, username').in('user_id', userIds),
    supabase.from('tenant_members').select('user_id, tenants(name)').in('user_id', userIds).eq('is_active', true),
  ]);

  const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
  const tenantMap = new Map<string, string>();
  (membershipsRes.data || []).forEach((m: any) => {
    if (!tenantMap.has(m.user_id)) {
      tenantMap.set(m.user_id, m.tenants?.name || '-');
    }
  });

  return Array.from(userMap.entries())
    .map(([userId, data]) => {
      const profile = profileMap.get(userId);
      return {
        user_id: userId,
        email: profile?.email || '',
        username: profile?.username || userId.slice(0, 8),
        lastActive: data.lastActive,
        lastPage: data.lastPage,
        eventCount: data.count,
        tenantName: tenantMap.get(userId) || '-',
        isOnline: data.isOnline,
      };
    })
    .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
}

// ══════════════════════════════════════
// Invitation Codes
// ══════════════════════════════════════

export interface InvitationCode {
  id: string;
  code: string;
  created_by: string;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  note: string | null;
  tenant_id: string;
}

export async function fetchInvitationCodesAndTenants() {
  const [codesRes, tenantsRes] = await Promise.all([
    supabase.from('invitation_codes').select('*').order('created_at', { ascending: false }),
    supabase.from('tenants').select('id, name').eq('status', 'active').order('created_at'),
  ]);
  return {
    codes: (codesRes.data || []) as InvitationCode[],
    tenants: tenantsRes.data || [],
  };
}

export async function createInvitationCode(payload: {
  code: string;
  created_by: string;
  max_uses: number;
  expires_at: string | null;
  note: string | null;
  tenant_id: string;
}) {
  const { error } = await supabase.from('invitation_codes').insert(payload as any);
  if (error) handleSupabaseError(error);
}

export async function toggleInvitationCode(id: string, currentActive: boolean) {
  const { error } = await supabase
    .from('invitation_codes')
    .update({ is_active: !currentActive } as any)
    .eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function deleteInvitationCode(id: string) {
  const { error } = await supabase.from('invitation_codes').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Data Consistency Check
// ══════════════════════════════════════

export async function fetchConsistencyCheckData() {
  const [projectsRes, transactionsRes, additionsRes] = await Promise.all([
    supabase.from('projects').select('id, project_code, project_name, total_income_myr, total_expense_myr, total_addition_myr, tenant_id'),
    supabase.from('transactions').select('project_id, type, amount_myr, category_name, tenant_id').eq('ledger_type', 'project'),
    supabase.from('project_additions').select('project_id, amount_myr, tenant_id'),
  ]);
  return {
    projects: projectsRes.data || [],
    transactions: transactionsRes.data || [],
    additions: additionsRes.data || [],
  };
}

export async function fetchConsistencyFixData() {
  const [projectsRes, transactionsRes, additionsRes] = await Promise.all([
    supabase.from('projects').select('id, tenant_id'),
    supabase.from('transactions').select('project_id, type, amount_myr, category_name, tenant_id').eq('ledger_type', 'project'),
    supabase.from('project_additions').select('project_id, amount_myr, tenant_id'),
  ]);
  return {
    projects: projectsRes.data || [],
    transactions: transactionsRes.data || [],
    additions: additionsRes.data || [],
  };
}

export async function updateProjectSummary(projectId: string, stats: {
  income: number;
  expense: number;
  material: number;
  labor: number;
  other: number;
  addition: number;
}) {
  const { error } = await supabase
    .from('projects')
    .update({
      total_income_myr: stats.income,
      total_expense_myr: stats.expense,
      total_material_myr: stats.material,
      total_labor_myr: stats.labor,
      total_other_expense_myr: stats.other,
      total_addition_myr: stats.addition,
      net_profit_myr: stats.income - stats.expense,
    })
    .eq('id', projectId);
  return !error;
}

// ══════════════════════════════════════
// Tenant Usage Stats (租户数据用量)
// ══════════════════════════════════════

export interface TenantUsage {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  memberCount: number;
  activeUsers24h: number;
  transactionCount: number;
  projectCount: number;
}

export async function fetchTenantUsageStats(): Promise<TenantUsage[]> {
  const { data: tenants, error: tErr } = await supabase
    .from('tenants')
    .select('id, name, slug, plan, status')
    .order('created_at', { ascending: true });
  if (tErr) handleSupabaseError(tErr);

  const { data: members, error: mErr } = await supabase
    .from('tenant_members')
    .select('tenant_id, user_id, is_active');
  if (mErr) handleSupabaseError(mErr);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: events, error: eErr } = await supabase
    .from('analytics_events')
    .select('user_id')
    .gte('created_at', since);
  if (eErr) handleSupabaseError(eErr);

  const activeUserIds = new Set((events || []).map(e => e.user_id).filter(Boolean));

  // Per-tenant count queries using head:true + count:'exact' to avoid row limits
  const tenantIds = (tenants || []).map(t => t.id);
  const txCountPromises = tenantIds.map(async (tid) => {
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tid);
    return { tenant_id: tid, count: count || 0 };
  });
  const projCountPromises = tenantIds.map(async (tid) => {
    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tid);
    return { tenant_id: tid, count: count || 0 };
  });
  const [txResults, projResults] = await Promise.all([
    Promise.all(txCountPromises),
    Promise.all(projCountPromises),
  ]);

  const memberMap = new Map<string, number>();
  (members || []).forEach(m => {
    if (m.is_active) {
      memberMap.set(m.tenant_id, (memberMap.get(m.tenant_id) || 0) + 1);
    }
  });

  const userTenantMap = new Map<string, Set<string>>();
  (members || []).forEach(m => {
    if (m.is_active && activeUserIds.has(m.user_id)) {
      if (!userTenantMap.has(m.tenant_id)) userTenantMap.set(m.tenant_id, new Set());
      userTenantMap.get(m.tenant_id)!.add(m.user_id);
    }
  });

  const txMap = new Map<string, number>();
  txResults.forEach(r => txMap.set(r.tenant_id, r.count));

  const projMap = new Map<string, number>();
  projResults.forEach(r => projMap.set(r.tenant_id, r.count));

  return (tenants || []).map(t => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    status: t.status,
    memberCount: memberMap.get(t.id) || 0,
    activeUsers24h: userTenantMap.get(t.id)?.size || 0,
    transactionCount: txMap.get(t.id) || 0,
    projectCount: projMap.get(t.id) || 0,
  }));
}


// ══════════════════════════════════════
// Super Admin — Tenant Management
// ══════════════════════════════════════

export async function fetchAllTenants() {
  const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchTenantAdmins(tenantIds: string[]) {
  if (tenantIds.length === 0) return {};

  const { data: adminMembers, error } = await supabase
    .from('tenant_members')
    .select('tenant_id, user_id, role')
    .in('role', ['owner', 'admin'] as any)
    .eq('is_active', true);
  if (error) handleSupabaseError(error);
  if (!adminMembers || adminMembers.length === 0) return {};

  const allUserIds = [...new Set(adminMembers.map(m => m.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, email, username, display_name')
    .in('user_id', allUserIds);

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
  const result: Record<string, Array<{ role: string; email: string | null; name: string }>> = {};
  for (const m of adminMembers) {
    const p = profileMap.get(m.user_id);
    if (!result[m.tenant_id]) result[m.tenant_id] = [];
    result[m.tenant_id].push({
      role: m.role,
      email: p?.email || null,
      name: p?.display_name || p?.username || m.user_id.slice(0, 8),
    });
  }
  return result;
}

export async function fetchTenantMembers(tenantId: string) {
  const { data: tmData, error } = await supabase
    .from('tenant_members')
    .select('id, user_id, role, is_active')
    .eq('tenant_id', tenantId);
  if (error) handleSupabaseError(error);
  if (!tmData || tmData.length === 0) return [];

  const userIds = tmData.map(m => m.user_id);
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('user_id, email, username, display_name')
    .in('user_id', userIds);

  const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
  return tmData.map(m => {
    const profile = profileMap.get(m.user_id);
    return {
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      is_active: m.is_active,
      email: profile?.email || null,
      username: profile?.username || m.user_id.slice(0, 8),
      display_name: profile?.display_name || null,
    };
  });
}

export async function createTenantWithOwner(params: {
  name: string;
  slug: string;
  plan: string;
  max_members: number;
  ownerEmail: string;
  ownerPassword: string;
  ownerUsername: string;
}) {
  const slug = params.slug || params.name.toLowerCase().replace(/\s+/g, '-');
  const { data, error } = await supabase.from('tenants').insert({
    name: params.name,
    slug,
    plan: params.plan as any,
    max_members: params.max_members,
  }).select('id').single();
  if (error) handleSupabaseError(error);
  const tenantId = data!.id;

  const ownerUsername = params.ownerUsername || params.ownerEmail.split('@')[0];
  const res = await supabase.functions.invoke('admin-user-management', {
    body: {
      action: 'create-user',
      email: params.ownerEmail,
      password: params.ownerPassword,
      username: ownerUsername,
      role: 'admin',
      tenantId,
      tenantRole: 'owner',
      seedTenantData: true,
    },
  });
  if (res.error) throw new Error(res.error.message || 'Failed to create owner');
  if (res.data?.error) throw new Error(res.data.error);
}

export async function updateTenant(tenantId: string, data: { name: string; slug: string; plan: string; max_members: number; logo_url?: string | null }) {
  const updateData: Record<string, any> = {
    name: data.name, slug: data.slug, plan: data.plan as any, max_members: data.max_members,
  };
  if (data.logo_url !== undefined) {
    updateData.logo_url = data.logo_url;
  }
  const { error } = await supabase.from('tenants').update(updateData).eq('id', tenantId);
  if (error) handleSupabaseError(error);
}

export async function uploadTenantLogo(tenantId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `tenant-logos/${tenantId}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('public-assets').upload(path, file, { upsert: true });
  if (uploadError) throw new Error(uploadError.message);
  const { data: urlData } = supabase.storage.from('public-assets').getPublicUrl(path);
  return urlData.publicUrl;
}

export async function toggleTenantStatus(tenantId: string, currentStatus: string) {
  if (tenantId === DEFAULT_TENANT_ID) {
    throw new ServiceError('Cannot modify the default management tenant', 'PROTECTED_TENANT');
  }
  const { error } = await supabase.from('tenants').update({
    status: currentStatus === 'active' ? 'suspended' : 'active',
  }).eq('id', tenantId);
  if (error) handleSupabaseError(error);
}


export async function archiveTenant(tenantId: string) {
  if (tenantId === DEFAULT_TENANT_ID) {
    throw new ServiceError('Cannot archive the default management tenant', 'PROTECTED_TENANT');
  }
  const { error } = await supabase.from('tenants').update({ status: 'suspended' as any }).eq('id', tenantId);
  if (error) handleSupabaseError(error);
  await supabase.from('tenant_members').update({ is_active: false }).eq('tenant_id', tenantId);
}

export async function updateMemberRole(memberId: string, newRole: string, userId: string) {
  // Get the current member record to find tenant context
  const { data: memberRecord } = await supabase
    .from('tenant_members').select('id, tenant_id, role').eq('id', memberId).single();
  if (!memberRecord) throw new ServiceError('Member not found', 'NOT_FOUND');

  // Prevent demoting the last Owner of a tenant
  if (memberRecord.role === 'owner' && newRole !== 'owner') {
    const { data: otherOwners } = await supabase
      .from('tenant_members').select('id')
      .eq('tenant_id', memberRecord.tenant_id)
      .eq('role', 'owner' as any)
      .eq('is_active', true)
      .neq('id', memberId);
    if (!otherOwners || otherOwners.length === 0) {
      throw new ServiceError('Cannot demote the only owner. Assign another owner first.', 'LAST_OWNER');
    }
  }

  const { error } = await supabase.from('tenant_members').update({ role: newRole as any }).eq('id', memberId);
  if (error) handleSupabaseError(error);
  if (newRole === 'owner' || newRole === 'admin') {
    await supabase.from('user_roles').update({ role: 'admin' as any }).eq('user_id', userId);
  } else if (newRole === 'member') {
    const { data: otherAdminRoles } = await supabase
      .from('tenant_members').select('id')
      .eq('user_id', userId).in('role', ['owner', 'admin'] as any).eq('is_active', true);
    if (!otherAdminRoles || otherAdminRoles.length === 0) {
      await supabase.from('user_roles').update({ role: 'viewer' as any }).eq('user_id', userId);
    }
  }
}

export async function toggleMemberStatus(memberId: string, isActive: boolean) {
  const { error } = await supabase.from('tenant_members').update({ is_active: !isActive }).eq('id', memberId);
  if (error) handleSupabaseError(error);
}

export async function removeMember(memberId: string, userId: string) {
  // Get the member record to check if they're the last owner
  const { data: memberRecord } = await supabase
    .from('tenant_members').select('id, tenant_id, role').eq('id', memberId).single();
  if (!memberRecord) throw new ServiceError('Member not found', 'NOT_FOUND');

  // Prevent removing the last Owner of a tenant
  if (memberRecord.role === 'owner') {
    const { data: otherOwners } = await supabase
      .from('tenant_members').select('id')
      .eq('tenant_id', memberRecord.tenant_id)
      .eq('role', 'owner' as any)
      .eq('is_active', true)
      .neq('id', memberId);
    if (!otherOwners || otherOwners.length === 0) {
      throw new ServiceError('Cannot remove the only owner. Assign another owner first.', 'LAST_OWNER');
    }
  }

  const { error } = await supabase.from('tenant_members').delete().eq('id', memberId);
  if (error) handleSupabaseError(error);
  const { data: otherAdminRoles } = await supabase
    .from('tenant_members').select('id')
    .eq('user_id', userId).in('role', ['owner', 'admin'] as any).eq('is_active', true);
  if (!otherAdminRoles || otherAdminRoles.length === 0) {
    await supabase.from('user_roles').update({ role: 'viewer' as any }).eq('user_id', userId);
  }
}

export async function changeUserPassword(userId: string, newPassword: string) {
  const res = await supabase.functions.invoke('admin-user-management', {
    body: { action: 'set-password', userId, password: newPassword },
  });
  if (res.error) throw new Error(res.error.message);
  if (res.data?.error) throw new Error(res.data.error);
}

export async function addMemberToTenant(params: {
  tenantId: string;
  maxMembers: number;
  email: string;
  password: string;
  username: string;
  role: string;
}) {
  const { count } = await supabase
    .from('tenant_members')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', params.tenantId)
    .eq('is_active', true);
  if (count !== null && count >= params.maxMembers) {
    throw new Error(`Member limit reached (${params.maxMembers})`);
  }

  // Check if user already exists in the system (by looking up profiles by email)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', params.email)
    .maybeSingle();

  if (existingProfile) {
    // User exists — check if already a member of this tenant
    const { data: existingMembership } = await supabase
      .from('tenant_members')
      .select('id, is_active')
      .eq('tenant_id', params.tenantId)
      .eq('user_id', existingProfile.user_id)
      .maybeSingle();

    if (existingMembership) {
      if (existingMembership.is_active) {
        throw new Error('User is already a member of this tenant');
      }
      // Reactivate inactive membership
      await supabase.from('tenant_members')
        .update({ is_active: true, role: params.role as any })
        .eq('id', existingMembership.id);
    } else {
      // Add existing user to new tenant
      await supabase.from('tenant_members').insert({
        tenant_id: params.tenantId,
        user_id: existingProfile.user_id,
        role: params.role as any,
        is_active: true,
      });
    }

    // Sync system role if needed
    if (params.role === 'admin' || params.role === 'owner') {
      await supabase.from('user_roles').upsert(
        { user_id: existingProfile.user_id, role: 'admin' as any },
        { onConflict: 'user_id,role' }
      );
    }
    return;
  }

  // User does not exist — create new account via edge function
  const systemRole = (params.role === 'admin' || params.role === 'owner') ? 'admin' : 'viewer';
  const uname = params.username || params.email.split('@')[0];
  const res = await supabase.functions.invoke('admin-user-management', {
    body: {
      action: 'create-user',
      email: params.email,
      password: params.password,
      username: uname,
      role: systemRole,
      tenantId: params.tenantId,
      tenantRole: params.role,
    },
  });
  if (res.error) throw new Error(res.error.message || 'Failed');
  if (res.data?.error) throw new Error(res.data.error);
}

export interface Discrepancy {
  projectCode: string;
  projectName: string;
  field: string;
  recorded: number;
  calculated: number;
}

export async function checkDataConsistency(tenantId: string, fieldLabels: { income: string; expense: string; addition: string }): Promise<Discrepancy[]> {
  const [projectsRes, transactionsRes, additionsRes] = await Promise.all([
    supabase.from('projects').select('id, project_code, project_name, total_income_myr, total_expense_myr, total_addition_myr').eq('tenant_id', tenantId),
    supabase.from('transactions').select('project_id, type, amount_myr').eq('ledger_type', 'project').eq('tenant_id', tenantId),
    supabase.from('project_additions').select('project_id, amount_myr').eq('tenant_id', tenantId),
  ]);

  if (!projectsRes.data) return [];

  const projectIncomeMap: Record<string, number> = {};
  const projectExpenseMap: Record<string, number> = {};
  const projectAdditionMap: Record<string, number> = {};

  (transactionsRes.data || []).forEach(tx => {
    if (!tx.project_id) return;
    if (tx.type === 'income') projectIncomeMap[tx.project_id] = (projectIncomeMap[tx.project_id] || 0) + (tx.amount_myr || 0);
    else projectExpenseMap[tx.project_id] = (projectExpenseMap[tx.project_id] || 0) + (tx.amount_myr || 0);
  });

  (additionsRes.data || []).forEach(a => {
    if (!a.project_id) return;
    projectAdditionMap[a.project_id] = (projectAdditionMap[a.project_id] || 0) + (a.amount_myr || 0);
  });

  const found: Discrepancy[] = [];
  for (const project of projectsRes.data) {
    const calcIncome = projectIncomeMap[project.id] || 0;
    const calcExpense = projectExpenseMap[project.id] || 0;
    const calcAddition = projectAdditionMap[project.id] || 0;
    const recordedIncome = project.total_income_myr || 0;
    const recordedExpense = project.total_expense_myr || 0;
    const recordedAddition = project.total_addition_myr || 0;

    if (Math.abs(recordedIncome - calcIncome) > 0.01)
      found.push({ projectCode: project.project_code, projectName: project.project_name, field: fieldLabels.income, recorded: recordedIncome, calculated: calcIncome });
    if (Math.abs(recordedExpense - calcExpense) > 0.01)
      found.push({ projectCode: project.project_code, projectName: project.project_name, field: fieldLabels.expense, recorded: recordedExpense, calculated: calcExpense });
    if (Math.abs(recordedAddition - calcAddition) > 0.01)
      found.push({ projectCode: project.project_code, projectName: project.project_name, field: fieldLabels.addition, recorded: recordedAddition, calculated: calcAddition });
  }
  return found;
}

// ══════════════════════════════════════
// Analytics
// ══════════════════════════════════════

export interface AnalyticsEvent {
  event_name: string;
  event_category: string;
  count: number;
  last_seen: string;
}

export async function fetchAnalyticsSummary(days: number): Promise<AnalyticsEvent[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await (supabase.from('analytics_events' as any) as any)
    .select('event_name, event_category, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;

  const map = new Map<string, AnalyticsEvent>();
  for (const row of data || []) {
    const key = `${row.event_category}:${row.event_name}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      if (row.created_at > existing.last_seen) existing.last_seen = row.created_at;
    } else {
      map.set(key, { event_name: row.event_name, event_category: row.event_category, count: 1, last_seen: row.created_at });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export async function clearOldAnalytics(days = 90): Promise<void> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  await (supabase.from('analytics_events' as any) as any).delete().lt('created_at', since);
}

// ══════════════════════════════════════
// System Health
// ══════════════════════════════════════

export async function checkEdgeFunctionHealth(): Promise<{ status: 'ok' | 'error'; latency: number; detail: string }> {
  const start = Date.now();
  try {
    const { data, error } = await supabase.functions.invoke('health');
    const latency = Date.now() - start;
    if (error) return { status: 'error', latency, detail: error.message };
    return { status: 'ok', latency, detail: data?.version || 'v1' };
  } catch (e: any) {
    return { status: 'error', latency: Date.now() - start, detail: e.message };
  }
}

export async function checkDatabaseHealth(zh: boolean): Promise<{ status: 'ok' | 'error'; latency: number; detail: string }> {
  const start = Date.now();
  try {
    const { error } = await supabase.from('tenants').select('id').limit(1);
    const latency = Date.now() - start;
    if (error) return { status: 'error', latency, detail: error.message };
    return { status: 'ok', latency, detail: zh ? '连接正常' : 'Connected' };
  } catch (e: any) {
    return { status: 'error', latency: Date.now() - start, detail: e.message };
  }
}

export async function checkAuthHealth(zh: boolean): Promise<{ status: 'ok' | 'error'; latency: number; detail: string }> {
  const start = Date.now();
  try {
    const { data } = await supabase.auth.getSession();
    const latency = Date.now() - start;
    return { status: data.session ? 'ok' : 'error', latency, detail: data.session ? (zh ? '会话有效' : 'Session valid') : (zh ? '无会话' : 'No session') };
  } catch (e: any) {
    return { status: 'error', latency: Date.now() - start, detail: e.message };
  }
}

export async function checkStorageHealth(zh: boolean): Promise<{ status: 'ok' | 'error'; latency: number; detail: string }> {
  const start = Date.now();
  try {
    const { error } = await supabase.storage.from('receipts').list('', { limit: 1 });
    const latency = Date.now() - start;
    if (error) return { status: 'error', latency, detail: error.message };
    return { status: 'ok', latency, detail: zh ? '存储正常' : 'Available' };
  } catch (e: any) {
    return { status: 'error', latency: Date.now() - start, detail: e.message };
  }
}

export async function fetchTableStats(): Promise<{ name: string; count: number }[]> {
  const tables = ['transactions', 'projects', 'employees', 'contacts', 'payables', 'tenants', 'profiles', 'audit_logs', 'analytics_events', 'login_attempts'] as const;
  return Promise.all(
    tables.map(async (table) => {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      return { name: table, count: count || 0 };
    })
  );
}

export async function fetchStorageStats(): Promise<{ fileCount: number; totalSize: number }> {
  try {
    const { data, error } = await supabase.storage.from('receipts').list('', { limit: 1000 });
    if (error) return { fileCount: 0, totalSize: 0 };
    const totalSize = (data || []).reduce((acc, f) => acc + (f.metadata?.size || 0), 0);
    return { fileCount: (data || []).length, totalSize };
  } catch {
    return { fileCount: 0, totalSize: 0 };
  }
}

export async function fetchRecentActiveUsers(): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('analytics_events')
    .select('user_id')
    .gte('created_at', since);
  return new Set((data || []).map((d: any) => d.user_id).filter(Boolean)).size;
}

// ══════════════════════════════════════
// Security Center
// ══════════════════════════════════════

export async function fetchSuspiciousIPs(): Promise<{ ip: string; count: number; last: string }[]> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('login_attempts')
    .select('ip_address, success, attempted_at')
    .gte('attempted_at', since)
    .eq('success', false);
  if (error) throw error;

  const ipMap = new Map<string, { count: number; last: string }>();
  (data || []).forEach(a => {
    const existing = ipMap.get(a.ip_address);
    if (existing) {
      existing.count++;
      if (a.attempted_at > existing.last) existing.last = a.attempted_at;
    } else {
      ipMap.set(a.ip_address, { count: 1, last: a.attempted_at });
    }
  });

  return Array.from(ipMap.entries())
    .filter(([, v]) => v.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([ip, v]) => ({ ip, ...v }));
}

export async function fetchSecurityAlerts() {
  const { data, error } = await supabase
    .from('project_alerts')
    .select('*')
    .like('alert_message', '%可疑%')
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function fetchSecuritySummary7d() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [attemptsRes, errorsRes] = await Promise.all([
    supabase.from('login_attempts').select('success').gte('attempted_at', since),
    supabase.from('error_logs').select('id').gte('created_at', since),
  ]);
  const attempts = attemptsRes.data || [];
  const total = attempts.length;
  const failed = attempts.filter((a: any) => !a.success).length;
  const successRate = total > 0 ? ((total - failed) / total * 100).toFixed(1) : '100';
  return { totalLogins: total, failedLogins: failed, successRate, totalErrors: (errorsRes.data || []).length };
}

export async function resolveSecurityAlert(alertId: string): Promise<void> {
  const { error } = await supabase
    .from('project_alerts')
    .update({ is_resolved: true })
    .eq('id', alertId);
  if (error) throw error;
}

export async function runSuspiciousDetection(): Promise<void> {
  const { error } = await supabase.rpc('detect_suspicious_operations');
  if (error) throw error;
}

// ══════════════════════════════════════
// Data Archiving
// ══════════════════════════════════════

export async function fetchArchiveStats() {
  const [auditArchive, analyticsArchive, auditLive, analyticsLive] = await Promise.all([
    supabase.from('audit_logs_archive').select('*', { count: 'exact', head: true }),
    supabase.from('analytics_events_archive').select('*', { count: 'exact', head: true }),
    supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }),
  ]);
  return {
    auditArchived: auditArchive.count || 0,
    analyticsArchived: analyticsArchive.count || 0,
    auditLive: auditLive.count || 0,
    analyticsLive: analyticsLive.count || 0,
  };
}

export async function fetchOldestRecords() {
  const [oldAudit, oldAnalytics] = await Promise.all([
    supabase.from('audit_logs').select('created_at').order('created_at', { ascending: true }).limit(1),
    supabase.from('analytics_events').select('created_at').order('created_at', { ascending: true }).limit(1),
  ]);
  return {
    oldestAudit: oldAudit.data?.[0]?.created_at || null,
    oldestAnalytics: oldAnalytics.data?.[0]?.created_at || null,
  };
}

export async function runArchive(days: number) {
  const { data, error } = await supabase.rpc('archive_old_data', { days_threshold: days });
  if (error) throw error;
  return data as any;
}

export async function cleanupLoginAttempts(): Promise<void> {
  const { error } = await supabase.rpc('cleanup_login_attempts');
  if (error) throw error;
}

export async function clearOldErrorLogs(days: number): Promise<void> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from('error_logs').delete().lt('created_at', cutoff);
  if (error) throw error;
}

// ══════════════════════════════════════
// Global User Directory
// ══════════════════════════════════════

export interface TenantMember {
  user_id: string;
  email: string | null;
  username: string;
  display_name: string | null;
  created_at: string;
  system_role: string;
  tenant_role: string;
}

export interface TenantGroup {
  tenant_id: string;
  tenant_name: string;
  owner: TenantMember | null;
  members: TenantMember[];
}


export async function fetchGlobalUserDirectory(): Promise<TenantGroup[]> {
  const [membershipsRes, profilesRes, rolesRes] = await Promise.all([
    supabase.from('tenant_members').select('tenant_id, user_id, role, tenants(id, name)').eq('is_active', true),
    supabase.from('profiles').select('user_id, email, username, display_name, created_at'),
    supabase.from('user_roles').select('user_id, role'),
  ]);
  if (membershipsRes.error) throw membershipsRes.error;

  const profileMap = new Map<string, any>();
  (profilesRes.data || []).forEach((p: any) => profileMap.set(p.user_id, p));

  const roleMap = new Map<string, string>();
  (rolesRes.data || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

  const groupMap = new Map<string, TenantGroup>();
  (membershipsRes.data || []).forEach((m: any) => {
    if (m.tenant_id === DEFAULT_TENANT_ID) return;
    const profile = profileMap.get(m.user_id);
    if (!profile) return;

    if (!groupMap.has(m.tenant_id)) {
      groupMap.set(m.tenant_id, {
        tenant_id: m.tenant_id,
        tenant_name: m.tenants?.name || '?',
        owner: null,
        members: [],
      });
    }
    const group = groupMap.get(m.tenant_id)!;
    const member: TenantMember = {
      user_id: m.user_id,
      email: profile.email,
      username: profile.username,
      display_name: profile.display_name,
      created_at: profile.created_at,
      system_role: roleMap.get(m.user_id) || 'viewer',
      tenant_role: m.role,
    };
    if (m.role === 'owner') group.owner = member;
    else group.members.push(member);
  });

  return Array.from(groupMap.values());
}

// ══════════════════════════════════════
// SystemSelect quick stats
// ══════════════════════════════════════

export async function fetchSystemSelectStats(tenantId: string, today: string, monthStart: string) {
  const [projectsRes, contractsRes, ordersRes, profitRes, recentRes] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', today + 'T00:00:00'),
    supabase.from('projects').select('contract_amount_myr').eq('tenant_id', tenantId).gte('sign_date', monthStart),
    supabase.from('q_purchase_orders' as any).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['draft', 'pending', 'approved']),
    supabase.from('transactions').select('type, amount_myr').eq('tenant_id', tenantId).gte('transaction_date', monthStart),
    supabase.from('projects').select('id, project_code, project_name, customer_name, status, contract_amount_myr').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5),
  ]);

  const monthlyContracts = contractsRes.data?.reduce((s, p) => s + (p.contract_amount_myr || 0), 0) || 0;
  const monthlyProfit = (profitRes.data || []).reduce((s, t) => s + (t.type === 'income' ? t.amount_myr : -t.amount_myr), 0);

  return {
    todayProjects: projectsRes.count || 0,
    monthlyContracts,
    pendingOrders: ordersRes.count || 0,
    monthlyProfit,
    recentProjects: recentRes.data || [],
  };
}

// ══════════════════════════════════════
// Platform Monitor
// ══════════════════════════════════════

export async function fetchPlatformLoginStats(limit = 50) {
  const { data, error } = await supabase
    .from('login_attempts')
    .select('*')
    .order('attempted_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const attempts = data || [];
  const success = attempts.filter(a => a.success).length;
  const failed = attempts.filter(a => !a.success).length;
  const ipMap = new Map<string, number>();
  attempts.filter(a => !a.success).forEach(a => {
    ipMap.set(a.ip_address, (ipMap.get(a.ip_address) || 0) + 1);
  });
  const topIPs = Array.from(ipMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return { attempts: attempts.slice(0, 20), success, failed, topIPs };
}

export async function fetchPlatformLoginTrend(sinceISO: string) {
  const { data, error } = await supabase
    .from('login_attempts')
    .select('attempted_at, success')
    .gte('attempted_at', sinceISO);
  if (error) throw error;
  return data || [];
}

export async function fetchPlatformErrorTrend(sinceISO: string) {
  const { data, error } = await supabase
    .from('error_logs')
    .select('created_at')
    .gte('created_at', sinceISO);
  if (error) throw error;
  return data || [];
}

export async function fetchPlatformRecentErrors(limit = 20) {
  const { data, error } = await supabase
    .from('error_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchPlatformActiveUserCount(sinceISO: string): Promise<number> {
  const { data, error } = await supabase
    .from('analytics_events')
    .select('user_id')
    .gte('created_at', sinceISO);
  if (error) throw error;
  const uniqueUsers = new Set((data || []).map(d => d.user_id).filter(Boolean));
  return uniqueUsers.size;
}

// ══════════════════════════════════════
// Tenant Config
// ══════════════════════════════════════

export async function fetchTenantConfigs() {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug, plan, status, max_members, expires_at, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchTenantMemberCounts(): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('is_active', true);
  const map = new Map<string, number>();
  (data || []).forEach(m => map.set(m.tenant_id, (map.get(m.tenant_id) || 0) + 1));
  return map;
}

export async function updateTenantConfig(
  tenantId: string,
  update: { plan: 'free' | 'basic' | 'professional' | 'enterprise'; max_members: number; expires_at: string | null }
) {
  const { error } = await supabase.from('tenants').update(update as any).eq('id', tenantId);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// User Management
// ══════════════════════════════════════

export async function fetchTenantUsersList(tenantId: string) {
  const { data: tenantMembers, error: tmError } = await supabase
    .from('tenant_members')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);
  if (tmError) throw tmError;

  const memberUserIds = (tenantMembers || []).map(m => m.user_id);
  if (memberUserIds.length === 0) return [];

  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from('profiles').select('*').in('user_id', memberUserIds).order('created_at', { ascending: false }),
    supabase.from('user_roles').select('*').in('user_id', memberUserIds),
  ]);

  if (profilesRes.error) throw profilesRes.error;

  return (profilesRes.data || []).map(profile => {
    const userRoles = (rolesRes.data || [])
      .filter(r => r.user_id === profile.user_id)
      .map(r => r.role);
    return {
      id: profile.id,
      user_id: profile.user_id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      email: (profile as any).email || undefined,
      roles: userRoles.length > 0 ? userRoles : ['viewer'],
    };
  });
}

export async function fetchUserPermissions(userId: string) {
  const { data } = await supabase
    .from('user_permissions')
    .select('permission_key, granted')
    .eq('user_id', userId);
  return data || [];
}

export async function saveUserRoleAndPermissions(
  userId: string,
  role: string,
  permissions?: { key: string; granted: boolean }[]
) {
  await supabase.from('user_roles').delete().eq('user_id', userId);
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role } as any);
  if (roleError) throw roleError;

  if (role !== 'admin' && permissions) {
    await supabase.from('user_permissions').delete().eq('user_id', userId);
    const permRows = permissions.map(p => ({
      user_id: userId,
      permission_key: p.key,
      granted: p.granted,
    }));
    const { error: permError } = await supabase
      .from('user_permissions')
      .insert(permRows);
    if (permError) throw permError;
  }
}

export async function deleteUserData(userId: string) {
  await supabase.from('user_permissions').delete().eq('user_id', userId);
  const { error: roleError } = await supabase.from('user_roles').delete().eq('user_id', userId);
  if (roleError) throw roleError;
  const { error: profileError } = await supabase.from('profiles').delete().eq('user_id', userId);
  if (profileError) throw profileError;
}

export async function invokeAdminUserManagement(action: string, body: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const response = await supabase.functions.invoke('admin-user-management', {
    body: { action, ...body },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (response.error) throw new Error(response.error.message);
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
}

export async function invokeDeleteUser(userId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const response = await supabase.functions.invoke('delete-user', {
    body: { userId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (response.error) console.warn('Auth user deletion failed:', response.error);
}

export async function invokeSyncProfileEmails() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const response = await supabase.functions.invoke('sync-profile-emails', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

// ══════════════════════════════════════
// Error Logging (for ErrorBoundary)
// ══════════════════════════════════════

export async function logClientError(errorData: {
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  url: string;
  user_agent: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  await (supabase.from('error_logs' as any) as any).insert({
    ...errorData,
    user_id: user?.id || null,
  });
}

// ══════════════════════════════════════
// Storage Signed URL
// ══════════════════════════════════════

export async function createStorageSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl || null;
}

// ══════════════════════════════════════
// AI Categorize
// ══════════════════════════════════════

export async function invokeAICategorize(description: string, transactionType: string, categories: string[]): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-categorize`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ description, transactionType, categories }),
    }
  );
  const data = await response.json();
  if (!response.ok) return null;
  return data.category || null;
}

// ══════════════════════════════════════
// System Currency
// ══════════════════════════════════════

export async function fetchSystemCurrency() {
  const { data, error } = await (supabase as any)
    .from('q_company_settings')
    .select('system_currency, currency_scopes')
    .limit(1)
    .single();
  if (error || !data) return { currency: 'MYR', scopes: ['all'] };
  return {
    currency: data.system_currency || 'MYR',
    scopes: data.currency_scopes || ['all'],
  };
}

export async function updateSystemCurrencySettings(currency: string, scopes: string[]) {
  const { data: existing } = await (supabase as any)
    .from('q_company_settings')
    .select('id')
    .limit(1)
    .maybeSingle();
  const targetId = existing?.id || '00000000-0000-0000-0000-000000000001';
  const { error } = await (supabase as any)
    .from('q_company_settings')
    .upsert({ id: targetId, system_currency: currency, currency_scopes: scopes }, { onConflict: 'id' });
  if (error) throw error;
}

// ══════════════════════════════════════
// Quotation Notes Templates
// ══════════════════════════════════════

export async function fetchQuotationNotesTemplates() {
  const { data, error } = await (supabase as any)
    .from('q_quotation_notes_templates')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((t: any) => ({ id: t.id, title: t.title || '', content: t.content || '', contentEn: t.content_en || '' }));
}

// ══════════════════════════════════════
// Performance Analytics
// ══════════════════════════════════════

export async function fetchPageViewStats(sinceISO: string) {
  const { data } = await supabase
    .from('analytics_events')
    .select('page_url, event_data, event_name')
    .gte('created_at', sinceISO)
    .eq('event_name', 'page_view');
  return data || [];
}

export async function fetchHourlyTraffic(sinceISO: string) {
  const { data } = await supabase
    .from('analytics_events')
    .select('created_at')
    .gte('created_at', sinceISO);
  return data || [];
}

export async function fetchErrorRate(sinceISO: string) {
  const [{ data: errors }, { data: events }] = await Promise.all([
    supabase.from('error_logs').select('id').gte('created_at', sinceISO),
    supabase.from('analytics_events').select('id').gte('created_at', sinceISO),
  ]);
  const errorCount = (errors || []).length;
  const eventCount = (events || []).length;
  return { errorCount, eventCount, errorRate: eventCount > 0 ? ((errorCount / eventCount) * 100).toFixed(2) : '0' };
}

// ══════════════════════════════════════
// Data Cleanup
// ══════════════════════════════════════

export async function fetchDataCounts() {
  const [
    projectsRes, transactionsRes, exchangeRes, paymentsRes,
    expensesRes, additionsRes, alertsRes, auditRes,
  ] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase.from('transactions').select('id', { count: 'exact', head: true }),
    supabase.from('exchange_transactions').select('id', { count: 'exact', head: true }),
    supabase.from('project_payments').select('id', { count: 'exact', head: true }),
    supabase.from('project_expenses').select('id', { count: 'exact', head: true }),
    supabase.from('project_additions').select('id', { count: 'exact', head: true }),
    supabase.from('project_alerts').select('id', { count: 'exact', head: true }),
    supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
  ]);
  return {
    projects: projectsRes.count || 0,
    transactions: transactionsRes.count || 0,
    exchange: exchangeRes.count || 0,
    payments: paymentsRes.count || 0,
    expenses: expensesRes.count || 0,
    additions: additionsRes.count || 0,
    alerts: alertsRes.count || 0,
    audit: auditRes.count || 0,
  };
}

export async function batchDeleteTable(table: string, cancelCheck: () => boolean): Promise<{ deleted: number; error?: string; cancelled?: boolean }> {
  const DELETE_BATCH_SIZE = 500;
  let totalDeleted = 0;
  try {
    const { count: beforeCount } = await supabase.from(table as any).select('id', { count: 'exact', head: true });
    if (!beforeCount || beforeCount === 0) return { deleted: 0 };

    let hasMore = true;
    while (hasMore) {
      if (cancelCheck()) return { deleted: totalDeleted, cancelled: true };
      const { data: records, error: selectError } = await supabase.from(table as any).select('id').limit(DELETE_BATCH_SIZE) as { data: { id: string }[] | null; error: any };
      if (selectError) return { deleted: totalDeleted, error: selectError.message };
      if (!records || records.length === 0) { hasMore = false; break; }
      const ids = records.map((r: { id: string }) => r.id);
      const { error: deleteError } = await supabase.from(table as any).delete().in('id', ids);
      if (deleteError) return { deleted: totalDeleted, error: deleteError.message };
      totalDeleted += records.length;
      if (records.length < DELETE_BATCH_SIZE) hasMore = false;
    }
    return { deleted: totalDeleted };
  } catch (error: any) {
    return { deleted: totalDeleted, error: error.message };
  }
}

export async function resetAccountBalances() {
  await supabase.from('company_accounts').update({ balance: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
}

export async function verifyPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

// ══════════════════════════════════════
// Accounting Periods
// ══════════════════════════════════════

export async function fetchAccountingPeriods(tenantId: string, year: number) {
  const { data, error } = await supabase
    .from('accounting_periods' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('period_year', year)
    .order('period_month', { ascending: true });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function closeAccountingPeriod(params: { tenantId: string; year: number; month: number; userId: string; notes: string; existingId?: string }) {
  if (params.existingId) {
    const { error } = await supabase.from('accounting_periods' as any)
      .update({ status: 'closed', closed_by: params.userId, closed_at: new Date().toISOString(), notes: params.notes || null } as any)
      .eq('id', params.existingId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('accounting_periods' as any)
      .insert({ tenant_id: params.tenantId, period_year: params.year, period_month: params.month, status: 'closed', closed_by: params.userId, closed_at: new Date().toISOString(), notes: params.notes || null } as any);
    if (error) handleSupabaseError(error);
  }
}

export async function reopenAccountingPeriod(params: { existingId: string; userId: string; notes: string; existingNotes?: string | null }) {
  const { error } = await supabase.from('accounting_periods' as any)
    .update({ status: 'open', reopened_by: params.userId, reopened_at: new Date().toISOString(), notes: params.notes || params.existingNotes } as any)
    .eq('id', params.existingId);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Column Settings (profile preferences)
// ══════════════════════════════════════

export async function loadColumnSettingsFromDB(userId: string, storageKey: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('user_id', userId)
    .single();
  return (profile?.preferences as any)?.column_settings?.[storageKey];
}

export async function saveColumnSettingsToDB(userId: string, storageKey: string, columns: { id: string; visible: boolean; width?: number }[]) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('user_id', userId)
    .single();
  const currentPrefs = (profile?.preferences as Record<string, any>) || {};
  const columnSettings = currentPrefs.column_settings || {};
  await supabase.from('profiles').update({
    preferences: { ...currentPrefs, column_settings: { ...columnSettings, [storageKey]: columns } },
  }).eq('user_id', userId);
}

// ══════════════════════════════════════
// Exchange Rate Lookup (for forms)
// ══════════════════════════════════════

export async function fetchLatestExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', fromCurrency as any)
    .eq('to_currency', toCurrency as any)
    .order('rate_date', { ascending: false })
    .limit(1)
    .single();
  return data?.rate ?? null;
}

// ══════════════════════════════════════
// Global Exchange Rates
// ══════════════════════════════════════

export async function fetchGlobalExchangeRates() {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('from_currency, to_currency, rate')
    .order('rate_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return null;
  return data;
}

// ══════════════════════════════════════
// Project Payments
// ══════════════════════════════════════

export async function createProjectPayment(payload: Record<string, any>) {
  const { error } = await supabase.from('project_payments').insert(payload as any);
  if (error) handleSupabaseError(error);
}

export async function updateProjectPayment(id: string, payload: Record<string, any>) {
  const { error } = await supabase.from('project_payments').update(payload).eq('id', id);
  if (error) handleSupabaseError(error);
}

// ══════════════════════════════════════
// Project Additions
// ══════════════════════════════════════

export async function createProjectAddition(payload: Record<string, any>) {
  const { error } = await supabase.from('project_additions').insert(payload as any);
  if (error) handleSupabaseError(error);
}

export async function fetchActiveProjects() {
  const { data } = await supabase
    .from('projects')
    .select('id, project_code, project_name')
    .in('status', ['in_progress', 'completed'])
    .order('project_code', { ascending: false });
  return data || [];
}

// ══════════════════════════════════════
// Purchase Orders
// ══════════════════════════════════════

export async function fetchPurchaseOrders() {
  const { data, error } = await (supabase as any)
    .from('q_purchase_orders')
    .select('*, q_suppliers(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createPurchaseOrder(payload: Record<string, any>) {
  const { data, error } = await (supabase as any)
    .from('q_purchase_orders')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePurchaseOrder(id: string, payload: Record<string, any>) {
  const { error } = await (supabase as any)
    .from('q_purchase_orders')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

export async function deletePurchaseOrder(id: string) {
  const { error } = await (supabase as any).from('q_purchase_orders').delete().eq('id', id);
  if (error) throw error;
}

export async function logPurchaseOrderAudit(purchaseOrderId: string, action: string, details: string | undefined, userId: string) {
  await (supabase as any).from('q_po_audit_logs').insert({
    purchase_order_id: purchaseOrderId,
    action,
    details,
    performed_by: userId,
  });
}

export async function fetchPurchaseOrderItems(orderId: string) {
  const { data } = await (supabase as any)
    .from('q_purchase_order_items')
    .select('id, quantity, unit_price')
    .eq('purchase_order_id', orderId);
  return data || [];
}

export async function updatePurchaseOrderStatus(id: string, status: string) {
  const { error } = await (supabase as any)
    .from('q_purchase_orders')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function submitPOToFinance(id: string, userId: string, tenantId?: string) {
  const { error } = await (supabase as any)
    .from('q_purchase_orders')
    .update({ status: 'submitted_to_finance', submitted_to_finance_at: new Date().toISOString(), submitted_to_finance_by: userId })
    .eq('id', id);
  if (error) throw error;

  const { data: po } = await (supabase as any)
    .from('q_purchase_orders')
    .select('*, q_suppliers(name)')
    .eq('id', id)
    .single();

  if (po) {
    const unpaid = (Number(po.total_amount) || 0) - (Number(po.paid_amount) || 0);
    await supabase.from('payables').insert({
      supplier_name: po.q_suppliers?.name || '未知供应商',
      description: `采购单 ${po.order_no} 提交至财务`,
      total_amount: Number(po.total_amount) || 0,
      total_amount_myr: Number(po.total_amount) || 0,
      paid_amount: Number(po.paid_amount) || 0,
      paid_amount_myr: Number(po.paid_amount) || 0,
      unpaid_amount: unpaid,
      unpaid_amount_myr: unpaid,
      currency: 'MYR',
      exchange_rate: 1,
      payable_date: new Date().toISOString().split('T')[0],
      status: unpaid <= 0 ? 'paid' : 'pending',
      record_type: 'purchase_order',
      source_record_id: id,
      created_by: userId,
      tenant_id: tenantId,
    } as any);
  }
}

export async function generatePurchaseOrderNo(): Promise<string> {
  const prefix = `PO-${new Date().getFullYear()}-`;
  const { data } = await (supabase as any)
    .from('q_purchase_orders')
    .select('order_no')
    .like('order_no', `${prefix}%`)
    .order('order_no', { ascending: false })
    .limit(1);
  if (data && data.length > 0) {
    const num = parseInt(data[0].order_no.replace(prefix, ''), 10) || 0;
    return `${prefix}${String(num + 1).padStart(3, '0')}`;
  }
  return `${prefix}001`;
}

// ══════════════════════════════════════
// Super Admin Check
// ══════════════════════════════════════

export async function checkIsSuperAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_super_admin', { _user_id: userId });
  if (error) return false;
  return data === true;
}

// ══════════════════════════════════════
// Storage / Image Optimization
// ══════════════════════════════════════

export async function listStorageFiles(bucket: string, path: string, limit = 1000, sortBy?: { column: string; order: string }) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path, { limit, ...(sortBy ? { sortBy: sortBy as any } : {}) });
  if (error) throw error;
  return data || [];
}

export async function downloadStorageFile(bucket: string, path: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);
  if (error) throw error;
  return data;
}

export async function uploadStorageFile(bucket: string, path: string, file: Blob, contentType: string) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true });
  if (error) throw error;
}

export async function removeStorageFiles(bucket: string, paths: string[]) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove(paths);
  if (error) throw error;
}

export async function updateImageReferences(oldPath: string, newPath: string) {
  await supabase.from('transactions').update({ receipt_url_1: newPath } as any).eq('receipt_url_1', oldPath);
  await supabase.from('transactions').update({ receipt_url_2: newPath } as any).eq('receipt_url_2', oldPath);
  await supabase.from('project_payments').update({ receipt_url: newPath }).eq('receipt_url', oldPath);
  await supabase.from('project_expenses').update({ receipt_url: newPath }).eq('receipt_url', oldPath);
}
