/**
 * Workforce Service
 * 
 * 工人管理模块（工地、工人、班次、考勤、请假、工资）的数据访问层。
 */

import { supabase, requireTenantId, handleSupabaseError } from './base';

// ── Dashboard ──

export async function fetchDashboardStats(tenantId: string) {
  requireTenantId(tenantId);
  const today = new Date().toISOString().substring(0, 10);
  const [sitesRes, activeRes, workersRes, checkinRes] = await Promise.all([
    supabase.from('sites').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('sites').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
    supabase.from('site_workers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('check_in_time', today + 'T00:00:00'),
  ]);
  return {
    totalSites: sitesRes.count || 0,
    activeSites: activeRes.count || 0,
    totalWorkers: workersRes.count || 0,
    todayCheckins: checkinRes.count || 0,
  };
}

// ── Sites ──

export async function fetchSites(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('sites')
    .select('*, site_workers(count)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchActiveSitesList(tenantId: string) {
  requireTenantId(tenantId);
  const { data } = await supabase.from('sites').select('id, name').eq('tenant_id', tenantId).eq('status', 'active');
  return data || [];
}

export async function saveSite(tenantId: string, payload: {
  name: string; address?: string | null; lat?: number | null; lng?: number | null;
  geofence_radius_m?: number; start_date?: string | null; end_date?: string | null;
  status?: string; notes?: string | null;
}, editId?: string) {
  requireTenantId(tenantId);
  const row = {
    name: payload.name,
    address: payload.address ?? null,
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,
    geofence_radius_m: payload.geofence_radius_m ?? 200,
    start_date: payload.start_date ?? null,
    end_date: payload.end_date ?? null,
    status: payload.status ?? 'active',
    notes: payload.notes ?? null,
    tenant_id: tenantId,
  };
  if (editId) {
    const { error } = await supabase.from('sites').update(row).eq('id', editId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('sites').insert(row);
    if (error) handleSupabaseError(error);
  }
}

export async function deleteSite(id: string) {
  const { error } = await supabase.from('sites').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ── Workers ──

export async function fetchWorkers(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('employees')
    .select('*, site_workers(id, sites(name), role, is_active)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchActiveWorkersList(tenantId: string) {
  requireTenantId(tenantId);
  const { data } = await supabase.from('employees').select('id, name, position, monthly_salary').eq('tenant_id', tenantId).eq('status', 'active');
  return data || [];
}

export async function saveWorker(tenantId: string, payload: {
  name: string; phone?: string | null; position?: string | null;
  monthly_salary?: number; status?: 'active' | 'inactive';
}, editId?: string) {
  requireTenantId(tenantId);
  const row = {
    name: payload.name,
    phone: payload.phone ?? null,
    position: payload.position ?? null,
    monthly_salary: payload.monthly_salary ?? 0,
    status: (payload.status ?? 'active') as 'active' | 'inactive',
    tenant_id: tenantId,
  };
  if (editId) {
    const { error } = await supabase.from('employees').update(row).eq('id', editId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('employees').insert(row);
    if (error) handleSupabaseError(error);
  }
}

export async function deleteWorker(id: string) {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ── Site-Worker Assignments ──

export async function fetchSiteAssignments(workerId: string) {
  const { data } = await supabase.from('site_workers').select('*, sites(name)').eq('worker_id', workerId);
  return data || [];
}

export async function assignWorkerToSite(tenantId: string, workerId: string, siteId: string, role: string) {
  requireTenantId(tenantId);
  const { error } = await supabase.from('site_workers').insert({
    worker_id: workerId, site_id: siteId, role, tenant_id: tenantId, is_active: true,
    start_date: new Date().toISOString().substring(0, 10),
  });
  if (error) handleSupabaseError(error);
}

export async function removeSiteAssignment(id: string) {
  const { error } = await supabase.from('site_workers').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ── Shifts ──

export async function fetchShifts(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('shifts')
    .select('*, sites(name), shift_assignments(id)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function saveShift(tenantId: string, payload: {
  site_id: string; name: string; start_time: string; end_time: string;
  break_minutes?: number; shift_type?: string;
}, editId?: string) {
  requireTenantId(tenantId);
  const row = {
    site_id: payload.site_id,
    name: payload.name,
    start_time: payload.start_time,
    end_time: payload.end_time,
    break_minutes: payload.break_minutes ?? 0,
    shift_type: payload.shift_type ?? 'day',
    tenant_id: tenantId,
  };
  if (editId) {
    const { error } = await supabase.from('shifts').update(row).eq('id', editId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('shifts').insert(row);
    if (error) handleSupabaseError(error);
  }
}

export async function deleteShift(id: string) {
  const { error } = await supabase.from('shifts').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ── Shift Assignments ──

export async function fetchShiftAssignments(shiftId: string) {
  const { data } = await supabase.from('shift_assignments')
    .select('*, employees(name)')
    .eq('shift_id', shiftId)
    .order('assignment_date', { ascending: false });
  return data || [];
}

export async function assignWorkerToShift(tenantId: string, shiftId: string, workerId: string, date: string) {
  requireTenantId(tenantId);
  const { error } = await supabase.from('shift_assignments').insert({
    shift_id: shiftId, worker_id: workerId, assignment_date: date,
    status: 'scheduled', tenant_id: tenantId,
  });
  if (error) handleSupabaseError(error);
}

export async function removeShiftAssignment(id: string) {
  const { error } = await supabase.from('shift_assignments').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

// ── Attendance ──

export async function fetchActiveSites(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase.from('sites').select('*').eq('tenant_id', tenantId).eq('status', 'active').order('name');
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function fetchSiteWorkers(siteId: string) {
  const { data, error } = await supabase
    .from('site_workers')
    .select('*, worker:employees(id, name, position)')
    .eq('site_id', siteId)
    .eq('is_active', true);
  if (error) handleSupabaseError(error);
  return (data ?? []) as any[];
}

export async function fetchAttendanceRecords(tenantId: string, filterDate: string, filterSite: string) {
  requireTenantId(tenantId);
  let q = supabase
    .from('attendance_records')
    .select('*, site:sites(name), worker:employees(name, position)')
    .eq('tenant_id', tenantId)
    .gte('created_at', `${filterDate}T00:00:00`)
    .lte('created_at', `${filterDate}T23:59:59`)
    .order('created_at', { ascending: false })
    .limit(500);
  if (filterSite && filterSite !== 'all') q = q.eq('site_id', filterSite);
  const { data, error } = await q;
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function uploadPhoto(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `attendance/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('receipts').upload(path, file);
  if (error) { console.error('Photo upload error:', error); return null; }
  const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path);
  return urlData.publicUrl;
}

export async function checkIn(tenantId: string, payload: {
  worker_id: string; site_id: string; check_in_time: string;
  check_in_lat?: number | null; check_in_lng?: number | null;
  check_in_photo_url?: string | null; check_in_method?: string;
  is_within_geofence?: boolean | null; comment?: string;
}) {
  requireTenantId(tenantId);
  const { error } = await supabase.from('attendance_records').insert({
    worker_id: payload.worker_id,
    site_id: payload.site_id,
    check_in_time: payload.check_in_time,
    check_in_lat: payload.check_in_lat ?? null,
    check_in_lng: payload.check_in_lng ?? null,
    check_in_photo_url: payload.check_in_photo_url ?? null,
    check_in_method: payload.check_in_method ?? 'gps_photo',
    is_within_geofence: payload.is_within_geofence ?? null,
    status: 'checked_in',
    comment: payload.comment ?? null,
    tenant_id: tenantId,
  });
  if (error) handleSupabaseError(error);
}

export async function checkOut(workerId: string, siteId: string, updates: Record<string, any>) {
  const today = new Date().toISOString().substring(0, 10);
  const { data: existing, error: findErr } = await supabase
    .from('attendance_records')
    .select('id, check_in_time')
    .eq('worker_id', workerId)
    .eq('site_id', siteId)
    .eq('status', 'checked_in')
    .gte('check_in_time', `${today}T00:00:00`)
    .lte('check_in_time', `${today}T23:59:59`)
    .limit(1)
    .single();
  if (findErr || !existing) throw new Error('No open check-in found');

  const checkOutTime = new Date();
  const checkInTime = new Date(existing.check_in_time);
  const durationMinutes = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000);

  const { error } = await supabase
    .from('attendance_records')
    .update({
      ...updates,
      check_out_time: checkOutTime.toISOString(),
      duration_minutes: durationMinutes,
      status: 'checked_out',
    })
    .eq('id', existing.id);
  if (error) handleSupabaseError(error);
}

// ── Leaves ──

export async function fetchLeaveRequests(tenantId: string, filterStatus: string) {
  requireTenantId(tenantId);
  let q = supabase
    .from('leave_requests')
    .select('*, worker:employees(name, position), site:sites(name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (filterStatus && filterStatus !== 'all') q = q.eq('status', filterStatus);
  const { data, error } = await q;
  if (error) handleSupabaseError(error);
  return (data ?? []) as any[];
}

export async function createLeaveRequest(tenantId: string, payload: {
  worker_id: string; site_id?: string | null; leave_type: string;
  start_date: string; end_date: string; reason?: string;
}) {
  requireTenantId(tenantId);
  const { error } = await supabase.from('leave_requests').insert({
    worker_id: payload.worker_id,
    site_id: payload.site_id ?? null,
    leave_type: payload.leave_type,
    start_date: payload.start_date,
    end_date: payload.end_date,
    reason: payload.reason ?? null,
    status: 'pending',
    tenant_id: tenantId,
  });
  if (error) handleSupabaseError(error);
}

export async function reviewLeaveRequest(id: string, status: 'approved' | 'rejected', reviewNote: string | null) {
  const { error } = await supabase.from('leave_requests').update({
    status, review_note: reviewNote, approved_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) handleSupabaseError(error);
}

// ── Payroll ──

export async function fetchPayrollRecords(tenantId: string) {
  requireTenantId(tenantId);
  const { data, error } = await supabase
    .from('workforce_payroll')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return data || [];
}

export async function savePayrollRecord(tenantId: string, payload: {
  worker_id: string; site_id?: string | null; period_start: string; period_end: string;
  total_days: number; total_hours: number; overtime_hours: number;
  base_pay: number; overtime_pay: number; deductions: number; bonuses: number;
  net_pay: number; currency: string; notes?: string | null; created_by?: string;
}, editId?: string) {
  requireTenantId(tenantId);
  const row = {
    worker_id: payload.worker_id,
    site_id: payload.site_id ?? null,
    period_start: payload.period_start,
    period_end: payload.period_end,
    total_days: payload.total_days,
    total_hours: payload.total_hours,
    overtime_hours: payload.overtime_hours,
    base_pay: payload.base_pay,
    overtime_pay: payload.overtime_pay,
    deductions: payload.deductions,
    bonuses: payload.bonuses,
    net_pay: payload.net_pay,
    currency: payload.currency,
    notes: payload.notes ?? null,
    created_by: payload.created_by,
    tenant_id: tenantId,
  };
  if (editId) {
    const { error } = await supabase.from('workforce_payroll').update(row).eq('id', editId);
    if (error) handleSupabaseError(error);
  } else {
    const { error } = await supabase.from('workforce_payroll').insert(row);
    if (error) handleSupabaseError(error);
  }
}

export async function deletePayrollRecord(id: string) {
  const { error } = await supabase.from('workforce_payroll').delete().eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function confirmPayrollRecord(id: string) {
  const { error } = await supabase.from('workforce_payroll').update({ export_status: 'confirmed' }).eq('id', id);
  if (error) handleSupabaseError(error);
}

export async function fetchAttendanceForCalc(tenantId: string, workerId: string, start: string, end: string) {
  requireTenantId(tenantId);
  const { data } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('worker_id', workerId)
    .eq('tenant_id', tenantId)
    .gte('check_in_time', start + 'T00:00:00')
    .lte('check_in_time', end + 'T23:59:59')
    .not('check_out_time', 'is', null);
  return data || [];
}

export async function fetchApprovedLeaves(tenantId: string, workerId: string, start: string, end: string) {
  requireTenantId(tenantId);
  const { data } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('worker_id', workerId)
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .gte('start_date', start)
    .lte('end_date', end);
  return data || [];
}
