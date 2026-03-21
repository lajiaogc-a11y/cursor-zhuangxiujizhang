
-- ============================================
-- Workforce Management System - Core Tables
-- ============================================

-- Sites (工地)
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geofence_radius_m INTEGER DEFAULT 200,
  manager_id UUID REFERENCES auth.users(id),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id) DEFAULT public.get_user_tenant_id(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Site-Worker assignment (工人分配到工地)
CREATE TABLE public.site_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'worker',
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID REFERENCES public.tenants(id) DEFAULT public.get_user_tenant_id(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id, worker_id)
);

-- Shifts (班次)
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  shift_type TEXT DEFAULT 'day',
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID REFERENCES public.tenants(id) DEFAULT public.get_user_tenant_id(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shift assignments (排班)
CREATE TABLE public.shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  status TEXT DEFAULT 'scheduled',
  tenant_id UUID REFERENCES public.tenants(id) DEFAULT public.get_user_tenant_id(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shift_id, worker_id, assignment_date)
);

-- Attendance records (打卡/考勤)
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id),
  check_in_time TIMESTAMPTZ,
  check_in_method TEXT DEFAULT 'gps_photo',
  check_in_lat DOUBLE PRECISION,
  check_in_lng DOUBLE PRECISION,
  check_in_photo_url TEXT,
  check_out_time TIMESTAMPTZ,
  check_out_method TEXT,
  check_out_lat DOUBLE PRECISION,
  check_out_lng DOUBLE PRECISION,
  check_out_photo_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  is_within_geofence BOOLEAN DEFAULT true,
  device_id TEXT,
  comment TEXT,
  verified_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  sync_status TEXT DEFAULT 'synced',
  local_timestamp TIMESTAMPTZ,
  tenant_id UUID REFERENCES public.tenants(id) DEFAULT public.get_user_tenant_id(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leave requests (请假)
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'personal',
  reason TEXT,
  evidence_url TEXT,
  status TEXT DEFAULT 'pending',
  approver_id UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  review_note TEXT,
  tenant_id UUID REFERENCES public.tenants(id) DEFAULT public.get_user_tenant_id(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Work orders / tasks (工单/任务)
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.employees(id),
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  photos JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  tenant_id UUID REFERENCES public.tenants(id) DEFAULT public.get_user_tenant_id(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Material issues (物料领用)
CREATE TABLE public.material_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  qty_issued NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  issued_to UUID REFERENCES public.employees(id),
  issued_by UUID REFERENCES auth.users(id),
  purpose TEXT,
  return_qty NUMERIC DEFAULT 0,
  returned_at TIMESTAMPTZ,
  tenant_id UUID REFERENCES public.tenants(id) DEFAULT public.get_user_tenant_id(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safety reports (安全上报)
CREATE TABLE public.safety_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id),
  report_type TEXT NOT NULL DEFAULT 'hazard',
  severity TEXT DEFAULT 'low',
  description TEXT,
  photos JSONB DEFAULT '[]',
  video_url TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  action_taken TEXT,
  status TEXT DEFAULT 'reported',
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  tenant_id UUID REFERENCES public.tenants(id) DEFAULT public.get_user_tenant_id(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workforce payroll (工资计算记录)
CREATE TABLE public.workforce_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_days INTEGER DEFAULT 0,
  total_hours NUMERIC DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  base_pay NUMERIC DEFAULT 0,
  overtime_pay NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  bonuses NUMERIC DEFAULT 0,
  net_pay NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'MYR',
  export_status TEXT DEFAULT 'draft',
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id) DEFAULT public.get_user_tenant_id(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_payroll ENABLE ROW LEVEL SECURITY;

-- SELECT policies (tenant isolation)
CREATE POLICY "tenant_select" ON public.sites FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));
CREATE POLICY "tenant_select" ON public.site_workers FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));
CREATE POLICY "tenant_select" ON public.shifts FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));
CREATE POLICY "tenant_select" ON public.shift_assignments FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));
CREATE POLICY "tenant_select" ON public.attendance_records FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));
CREATE POLICY "tenant_select" ON public.leave_requests FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));
CREATE POLICY "tenant_select" ON public.work_orders FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));
CREATE POLICY "tenant_select" ON public.material_issues FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));
CREATE POLICY "tenant_select" ON public.safety_reports FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));
CREATE POLICY "tenant_select" ON public.workforce_payroll FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

-- INSERT policies (management roles)
CREATE POLICY "mgmt_insert" ON public.sites FOR INSERT TO authenticated
  WITH CHECK (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_insert" ON public.site_workers FOR INSERT TO authenticated
  WITH CHECK (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_insert" ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_insert" ON public.shift_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_insert" ON public.work_orders FOR INSERT TO authenticated
  WITH CHECK (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_insert" ON public.material_issues FOR INSERT TO authenticated
  WITH CHECK (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_insert" ON public.workforce_payroll FOR INSERT TO authenticated
  WITH CHECK (public.has_management_role(auth.uid()));

-- Attendance: any authenticated user can insert (workers check in)
CREATE POLICY "auth_insert" ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));
CREATE POLICY "auth_insert" ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));
CREATE POLICY "auth_insert" ON public.safety_reports FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

-- UPDATE policies (management roles)
CREATE POLICY "mgmt_update" ON public.sites FOR UPDATE TO authenticated
  USING (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_update" ON public.site_workers FOR UPDATE TO authenticated
  USING (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_update" ON public.shifts FOR UPDATE TO authenticated
  USING (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_update" ON public.shift_assignments FOR UPDATE TO authenticated
  USING (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_update" ON public.attendance_records FOR UPDATE TO authenticated
  USING (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_update" ON public.leave_requests FOR UPDATE TO authenticated
  USING (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_update" ON public.work_orders FOR UPDATE TO authenticated
  USING (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_update" ON public.material_issues FOR UPDATE TO authenticated
  USING (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_update" ON public.safety_reports FOR UPDATE TO authenticated
  USING (public.has_management_role(auth.uid()));
CREATE POLICY "mgmt_update" ON public.workforce_payroll FOR UPDATE TO authenticated
  USING (public.has_management_role(auth.uid()));

-- DELETE policies (admin only)
CREATE POLICY "admin_delete" ON public.sites FOR DELETE TO authenticated
  USING (public.is_admin_or_accountant(auth.uid()));
CREATE POLICY "admin_delete" ON public.site_workers FOR DELETE TO authenticated
  USING (public.is_admin_or_accountant(auth.uid()));
CREATE POLICY "admin_delete" ON public.shifts FOR DELETE TO authenticated
  USING (public.is_admin_or_accountant(auth.uid()));
CREATE POLICY "admin_delete" ON public.shift_assignments FOR DELETE TO authenticated
  USING (public.is_admin_or_accountant(auth.uid()));
CREATE POLICY "admin_delete" ON public.attendance_records FOR DELETE TO authenticated
  USING (public.is_admin_or_accountant(auth.uid()));
CREATE POLICY "admin_delete" ON public.leave_requests FOR DELETE TO authenticated
  USING (public.is_admin_or_accountant(auth.uid()));
CREATE POLICY "admin_delete" ON public.work_orders FOR DELETE TO authenticated
  USING (public.is_admin_or_accountant(auth.uid()));
CREATE POLICY "admin_delete" ON public.material_issues FOR DELETE TO authenticated
  USING (public.is_admin_or_accountant(auth.uid()));
CREATE POLICY "admin_delete" ON public.safety_reports FOR DELETE TO authenticated
  USING (public.is_admin_or_accountant(auth.uid()));
CREATE POLICY "admin_delete" ON public.workforce_payroll FOR DELETE TO authenticated
  USING (public.is_admin_or_accountant(auth.uid()));

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_attendance_worker_date ON public.attendance_records(worker_id, check_in_time);
CREATE INDEX idx_attendance_site_date ON public.attendance_records(site_id, check_in_time);
CREATE INDEX idx_shift_assignments_date ON public.shift_assignments(assignment_date);
CREATE INDEX idx_sites_tenant ON public.sites(tenant_id);
CREATE INDEX idx_leave_requests_worker ON public.leave_requests(worker_id, start_date);

-- ============================================
-- Audit triggers
-- ============================================
CREATE TRIGGER audit_sites AFTER INSERT OR UPDATE OR DELETE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
CREATE TRIGGER audit_attendance_records AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
CREATE TRIGGER audit_leave_requests AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
CREATE TRIGGER audit_safety_reports AFTER INSERT OR UPDATE OR DELETE ON public.safety_reports FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
