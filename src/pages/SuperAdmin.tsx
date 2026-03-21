import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { adminService } from '@/services';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Building2, Users, Plus, Search, ArrowLeft, Crown, Shield, User, UserPlus,
  Activity, History, Download, Upload, ImageIcon, Code, Database, Heart,
  ShieldAlert, Megaphone, Wifi, Archive, AlertTriangle, Gauge, LogIn, Settings2,
  Edit2, Trash2, Ban, CheckCircle, KeyRound, Eye, EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// Lazy-loaded panels
import { AuditLogs } from '@/components/settings/AuditLogs';
import { DataExport } from '@/components/settings/DataExport';
import { DataImport } from '@/components/settings/DataImport';
import { ImageOptimization } from '@/components/settings/ImageOptimization';
import { DevToolsPanel } from '@/components/settings/DevToolsPanel';
import { PlatformMonitor } from '@/components/admin/PlatformMonitor';
import { TenantUsageStats } from '@/components/admin/TenantUsageStats';
import { DataConsistencyCheck } from '@/components/settings/DataConsistencyCheck';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { GlobalUserDirectory } from '@/components/admin/GlobalUserDirectory';
import { SecurityCenter } from '@/components/admin/SecurityCenter';
import { SystemAnnouncements } from '@/components/admin/SystemAnnouncements';
import { DataArchiving } from '@/components/admin/DataArchiving';
import { OnlineSessions } from '@/components/admin/OnlineSessions';
import { ErrorLogManager } from '@/components/admin/ErrorLogManager';
import { PerformanceAnalytics } from '@/components/admin/PerformanceAnalytics';
import { LoginActivityTimeline } from '@/components/admin/LoginActivityTimeline';
import { TenantConfigManager } from '@/components/admin/TenantConfigManager';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  max_members: number;
  created_at: string;
  expires_at: string | null;
  logo_url: string | null;
}

interface TenantMemberEnriched {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  email: string | null;
  username: string;
  display_name: string | null;
}

type AdminSection = 'tenants' | 'users' | 'tenant-config' | 'health' | 'security' | 'announcements' | 'usage' | 'monitor' | 'sessions' | 'errors' | 'performance' | 'logins' | 'audit' | 'data-check' | 'archive' | 'export' | 'import' | 'image-optimize' | 'devtools';

interface NavGroup { title: string; items: NavItem[]; }
interface NavItem { key: AdminSection; icon: React.ReactNode; label: string; devOnly?: boolean; }

export default function SuperAdmin() {
  const { language } = useI18n();
  const { user } = useAuth();
  const isSuperAdmin = useSuperAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<AdminSection>('tenants');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [newTenant, setNewTenant] = useState({ name: '', slug: '', plan: 'free', max_members: 5, ownerEmail: '', ownerPassword: '', ownerUsername: '' });
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ email: '', password: '', username: '', role: 'admin' });
  const [memberSearch, setMemberSearch] = useState('');

  // Edit tenant state
  const [editTenantDialog, setEditTenantDialog] = useState(false);
  const [editTenantData, setEditTenantData] = useState({ name: '', slug: '', plan: '', max_members: 5, logo_url: '' as string | null });
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Delete tenant state
  const [deleteTenantDialog, setDeleteTenantDialog] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Change member password state
  const [changePasswordDialog, setChangePasswordDialog] = useState(false);
  const [changePasswordUser, setChangePasswordUser] = useState<TenantMemberEnriched | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const zh = language === 'zh';

  const navGroups: NavGroup[] = [
    {
      title: zh ? '组织管理' : 'Organization',
      items: [
        { key: 'tenants', icon: <Building2 className="w-4 h-4" />, label: zh ? '租户管理' : 'Tenants' },
        { key: 'users', icon: <Users className="w-4 h-4" />, label: zh ? '用户总览' : 'Users' },
        { key: 'announcements', icon: <Megaphone className="w-4 h-4" />, label: zh ? '系统公告' : 'Announce' },
        { key: 'tenant-config', icon: <Settings2 className="w-4 h-4" />, label: zh ? '租户配置' : 'Config' },
      ],
    },
    {
      title: zh ? '监控与安全' : 'Monitor & Security',
      items: [
        { key: 'health', icon: <Heart className="w-4 h-4" />, label: zh ? '系统健康' : 'Health' },
        { key: 'security', icon: <ShieldAlert className="w-4 h-4" />, label: zh ? '安全中心' : 'Security' },
        { key: 'monitor', icon: <Activity className="w-4 h-4" />, label: zh ? '平台监控' : 'Monitor' },
        { key: 'sessions', icon: <Wifi className="w-4 h-4" />, label: zh ? '在线会话' : 'Sessions' },
        { key: 'errors', icon: <AlertTriangle className="w-4 h-4" />, label: zh ? '错误日志' : 'Errors' },
        { key: 'performance', icon: <Gauge className="w-4 h-4" />, label: zh ? '性能分析' : 'Performance' },
        { key: 'logins', icon: <LogIn className="w-4 h-4" />, label: zh ? '登录活动' : 'Logins' },
        { key: 'usage', icon: <Database className="w-4 h-4" />, label: zh ? '数据用量' : 'Usage' },
      ],
    },
    {
      title: zh ? '数据维护' : 'Data Maintenance',
      items: [
        { key: 'audit', icon: <History className="w-4 h-4" />, label: zh ? '审计日志' : 'Audit Logs' },
        { key: 'data-check', icon: <Database className="w-4 h-4" />, label: zh ? '数据一致性' : 'Data Check' },
        { key: 'archive', icon: <Archive className="w-4 h-4" />, label: zh ? '数据归档' : 'Archive' },
        { key: 'export', icon: <Download className="w-4 h-4" />, label: zh ? '数据导出' : 'Export' },
        { key: 'import', icon: <Upload className="w-4 h-4" />, label: zh ? '数据导入' : 'Import' },
        { key: 'image-optimize', icon: <ImageIcon className="w-4 h-4" />, label: zh ? '图片优化' : 'Image' },
        { key: 'devtools', icon: <Code className="w-4 h-4" />, label: zh ? '开发者工具' : 'DevTools', devOnly: true },
      ],
    },
  ];

  const visibleGroups = navGroups.map(g => ({
    ...g,
    items: g.items.filter(n => !n.devOnly || import.meta.env.DEV),
  })).filter(g => g.items.length > 0);

  const allVisibleItems = visibleGroups.flatMap(g => g.items);

  // ─── Tenant queries & mutations ───
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['super-admin-tenants'],
    queryFn: () => adminService.fetchAllTenants() as Promise<Tenant[]>,
  });

  const { data: tenantAdminsMap = {} } = useQuery({
    queryKey: ['super-admin-tenant-admins', tenants.map(t => t.id).join(',')],
    enabled: tenants.length > 0,
    queryFn: () => adminService.fetchTenantAdmins(tenants.map(t => t.id)),
    staleTime: 30_000,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['tenant-members', selectedTenant?.id],
    enabled: !!selectedTenant,
    queryFn: () => adminService.fetchTenantMembers(selectedTenant!.id) as Promise<TenantMemberEnriched[]>,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newTenant.ownerEmail || !newTenant.ownerPassword) {
        throw new Error(zh ? '请填写租户拥有者的邮箱和密码' : 'Owner email and password are required');
      }
      await adminService.createTenantWithOwner({
        name: newTenant.name,
        slug: newTenant.slug,
        plan: newTenant.plan,
        max_members: newTenant.max_members,
        ownerEmail: newTenant.ownerEmail,
        ownerPassword: newTenant.ownerPassword,
        ownerUsername: newTenant.ownerUsername,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant-admins'] });
      setShowCreate(false);
      setNewTenant({ name: '', slug: '', plan: 'free', max_members: 5, ownerEmail: '', ownerPassword: '', ownerUsername: '' });
      toast.success(zh ? '租户及拥有者账户已创建' : 'Tenant and owner account created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminService.toggleTenantStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant-admins'] });
      toast.success(zh ? '状态已更新' : 'Status updated');
    },
  });

  const editTenantMutation = useMutation({
    mutationFn: async () => {
      if (!editingTenant) return;
      let logoUrl = editTenantData.logo_url;
      if (logoFile) {
        logoUrl = await adminService.uploadTenantLogo(editingTenant.id, logoFile);
      }
      await adminService.updateTenant(editingTenant.id, { ...editTenantData, logo_url: logoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant-admins'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-config-list'] });
      setEditTenantDialog(false);
      setEditingTenant(null);
      setLogoFile(null);
      if (selectedTenant && editingTenant && selectedTenant.id === editingTenant.id) {
        setSelectedTenant({ ...selectedTenant, name: editTenantData.name, slug: editTenantData.slug, plan: editTenantData.plan, max_members: editTenantData.max_members });
      }
      toast.success(zh ? '租户信息已更新' : 'Tenant updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async () => {
      if (!deletingTenant) return;
      await adminService.archiveTenant(deletingTenant.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant-admins'] });
      setDeleteTenantDialog(false);
      setDeletingTenant(null);
      setDeleteConfirmText('');
      if (selectedTenant && deletingTenant && selectedTenant.id === deletingTenant.id) {
        setSelectedTenant(null);
      }
      toast.success(zh ? '租户已归档停用' : 'Tenant archived');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ memberId, newRole, userId }: { memberId: string; newRole: string; userId: string }) =>
      adminService.updateMemberRole(memberId, newRole, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-members', selectedTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant-admins'] });
      toast.success(zh ? '角色已更新' : 'Role updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMemberStatusMutation = useMutation({
    mutationFn: ({ memberId, isActive }: { memberId: string; isActive: boolean }) =>
      adminService.toggleMemberStatus(memberId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-members', selectedTenant?.id] });
      toast.success(zh ? '成员状态已更新' : 'Member status updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ memberId, userId }: { memberId: string; userId: string }) =>
      adminService.removeMember(memberId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-members', selectedTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant-admins'] });
      toast.success(zh ? '成员已移除' : 'Member removed');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!changePasswordUser) return;
      await adminService.changeUserPassword(changePasswordUser.user_id, newPasswordValue);
    },
    onSuccess: () => {
      setChangePasswordDialog(false);
      setChangePasswordUser(null);
      setNewPasswordValue('');
      toast.success(zh ? '密码已修改' : 'Password changed');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTenant) throw new Error('No tenant selected');
      await adminService.addMemberToTenant({
        tenantId: selectedTenant.id,
        maxMembers: selectedTenant.max_members,
        email: newMember.email,
        password: newMember.password,
        username: newMember.username,
        role: newMember.role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-members', selectedTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant-admins'] });
      setShowAddMember(false);
      setNewMember({ email: '', password: '', username: '', role: 'admin' });
      toast.success(zh ? '账户已创建并分配到该租户' : 'Account created and assigned to tenant');
    },
    onError: (e: any) => toast.error(e.message),
  });
  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const stats = { total: tenants.length, active: tenants.filter(t => t.status === 'active').length };

  const planColors: Record<string, string> = {
    free: 'bg-muted text-muted-foreground', basic: 'bg-info/10 text-info',
    professional: 'bg-primary/10 text-primary', enterprise: 'bg-warning/10 text-warning',
  };
  const planLabels: Record<string, string> = zh
    ? { free: '免费版', basic: '基础版', professional: '专业版', enterprise: '企业版' }
    : { free: 'Free', basic: 'Basic', professional: 'Professional', enterprise: 'Enterprise' };

  const roleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="w-3.5 h-3.5 text-warning" />;
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-primary" />;
    return <User className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const openEditTenant = (t: Tenant, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTenant(t);
    setEditTenantData({ name: t.name, slug: t.slug, plan: t.plan, max_members: t.max_members, logo_url: null });
    setLogoFile(null);
    setEditTenantDialog(true);
  };

  const openDeleteTenant = (t: Tenant, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingTenant(t);
    setDeleteConfirmText('');
    setDeleteTenantDialog(true);
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">{zh ? '无权访问此页面' : 'Access denied'}</p>
          <Button variant="outline" onClick={() => navigate('/')}>{zh ? '返回首页' : 'Go Home'}</Button>
        </div>
      </div>
    );
  }

  // Find admin accounts for a tenant
  const getAdminMembers = () => members.filter(m => m.role === 'owner' || m.role === 'admin');

  // ─── Tenant Management Panel ───
  const renderTenants = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">{zh ? '总租户' : 'Total'}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-2xl font-bold text-success">{stats.active}</p>
          <p className="text-xs text-muted-foreground">{zh ? '活跃' : 'Active'}</p>
        </CardContent></Card>
        <Card className="hidden sm:block"><CardContent className="pt-4 pb-3">
          <p className="text-2xl font-bold">{stats.total - stats.active}</p>
          <p className="text-xs text-muted-foreground">{zh ? '已停用' : 'Suspended'}</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={zh ? '搜索租户...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />{zh ? '新建' : 'New'}
        </Button>
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12">{zh ? '加载中...' : 'Loading...'}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">{zh ? '暂无租户' : 'No tenants'}</p>
        ) : filtered.map(t => (
          <Card key={t.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedTenant(t)}>
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {t.logo_url ? (
                  <img src={t.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.slug} · {format(new Date(t.created_at), 'yyyy-MM-dd')}</p>
                  {/* Admin accounts inline */}
                  {(tenantAdminsMap[t.id] || []).length > 0 && (
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {(tenantAdminsMap[t.id] || []).map((admin, idx) => (
                        <span key={idx} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          {admin.role === 'owner' ? <Crown className="w-3 h-3 text-warning" /> : <Shield className="w-3 h-3 text-primary" />}
                          <span className="truncate max-w-[120px]">{admin.email || admin.name}</span>
                          {idx < (tenantAdminsMap[t.id] || []).length - 1 && <span className="mx-0.5">·</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className={`text-[10px] ${planColors[t.plan] || ''}`}>
                  {planLabels[t.plan] || t.plan}
                </Badge>
                <Badge variant={t.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                  {t.status === 'active' ? (zh ? '活跃' : 'Active') : (zh ? '停用' : 'Suspended')}
                </Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" title={zh ? '编辑' : 'Edit'}
                  onClick={(e) => openEditTenant(t, e)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                {t.id !== '00000000-0000-0000-0000-000000000001' && (
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    title={t.status === 'active' ? (zh ? '停用' : 'Suspend') : (zh ? '激活' : 'Activate')}
                    onClick={(e) => { e.stopPropagation(); toggleStatusMutation.mutate({ id: t.id, status: t.status }); }}>
                    {t.status === 'active' ? <Ban className="w-3.5 h-3.5 text-destructive" /> : <CheckCircle className="w-3.5 h-3.5 text-success" />}
                  </Button>
                )}
                {t.id !== '00000000-0000-0000-0000-000000000001' && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={zh ? '删除' : 'Delete'}
                    onClick={(e) => openDeleteTenant(t, e)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'tenants': return renderTenants();
      case 'users': return <GlobalUserDirectory />;
      case 'health': return <SystemHealth />;
      case 'security': return <SecurityCenter />;
      case 'announcements': return <SystemAnnouncements />;
      case 'tenant-config': return <TenantConfigManager />;
      case 'sessions': return <OnlineSessions />;
      case 'errors': return <ErrorLogManager />;
      case 'performance': return <PerformanceAnalytics />;
      case 'logins': return <LoginActivityTimeline />;
      case 'usage': return <TenantUsageStats />;
      case 'monitor': return <PlatformMonitor />;
      case 'audit': return <AuditLogs />;
      case 'data-check': return <DataConsistencyCheck />;
      case 'archive': return <DataArchiving />;
      case 'export': return <DataExport />;
      case 'import': return <DataImport />;
      case 'image-optimize': return <ImageOptimization />;
      case 'devtools': return <DevToolsPanel />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center h-14 gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-sm font-semibold">{zh ? '超级管理后台' : 'Super Admin'}</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="flex gap-8 items-start">
          {/* Sidebar nav - desktop */}
          {!isMobile && (
            <nav className="w-48 shrink-0 sticky top-20 self-start">
              <div className="space-y-4">
                {visibleGroups.map(group => (
                  <div key={group.title}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">{group.title}</p>
                    <div className="space-y-0.5">
                      {group.items.map(item => (
                        <button
                          key={item.key}
                          onClick={() => setActiveSection(item.key)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                            activeSection === item.key
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </nav>
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {isMobile && (
              <div className="overflow-x-auto mb-4 -mx-4 px-4">
                <div className="flex gap-1 pb-2">
                  {allVisibleItems.map(item => (
                    <button
                      key={item.key}
                      onClick={() => setActiveSection(item.key)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0",
                        activeSection === item.key
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Create Tenant Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{zh ? '新建租户' : 'New Tenant'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{zh ? '租户信息' : 'Tenant Info'}</p>
              <div><Label>{zh ? '名称' : 'Name'}</Label>
                <Input value={newTenant.name} onChange={e => setNewTenant(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>{zh ? '标识符' : 'Slug'}</Label>
                <Input value={newTenant.slug} onChange={e => setNewTenant(p => ({ ...p, slug: e.target.value }))}
                  placeholder={newTenant.name.toLowerCase().replace(/\s+/g, '-') || (zh ? '自动生成' : 'auto')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{zh ? '套餐' : 'Plan'}</Label>
                  <Select value={newTenant.plan} onValueChange={v => setNewTenant(p => ({ ...p, plan: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">{planLabels.free}</SelectItem>
                      <SelectItem value="basic">{planLabels.basic}</SelectItem>
                      <SelectItem value="professional">{planLabels.professional}</SelectItem>
                      <SelectItem value="enterprise">{planLabels.enterprise}</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label>{zh ? '最大成员数' : 'Max Members'}</Label>
                  <Input type="number" value={newTenant.max_members} onChange={e => setNewTenant(p => ({ ...p, max_members: parseInt(e.target.value) || 5 }))} /></div>
              </div>
            </div>
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-warning" />
                {zh ? '租户拥有者账户（必填）' : 'Tenant Owner Account (required)'}
              </p>
              <div><Label>{zh ? '拥有者邮箱' : 'Owner Email'}</Label>
                <Input type="email" value={newTenant.ownerEmail} onChange={e => setNewTenant(p => ({ ...p, ownerEmail: e.target.value }))}
                  placeholder={zh ? '输入拥有者邮箱' : 'Enter owner email'} /></div>
              <div><Label>{zh ? '拥有者密码' : 'Owner Password'}</Label>
                <Input type="password" value={newTenant.ownerPassword} onChange={e => setNewTenant(p => ({ ...p, ownerPassword: e.target.value }))}
                  placeholder="≥ 6 characters" /></div>
              <div><Label>{zh ? '拥有者用户名' : 'Owner Username'}</Label>
                <Input value={newTenant.ownerUsername} onChange={e => setNewTenant(p => ({ ...p, ownerUsername: e.target.value }))}
                  placeholder={newTenant.ownerEmail.split('@')[0] || (zh ? '自动生成' : 'auto')} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{zh ? '取消' : 'Cancel'}</Button>
            <Button onClick={() => createMutation.mutate()}
              disabled={!newTenant.name || !newTenant.ownerEmail || !newTenant.ownerPassword || newTenant.ownerPassword.length < 6 || createMutation.isPending}>
              {zh ? '创建' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={editTenantDialog} onOpenChange={setEditTenantDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{zh ? '编辑租户' : 'Edit Tenant'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Logo upload */}
            <div className="space-y-2">
              <Label>{zh ? '租户 Logo' : 'Tenant Logo'}</Label>
              <div className="flex items-center gap-3">
                {(logoFile || editingTenant) && (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
                    {logoFile ? (
                      <img src={URL.createObjectURL(logoFile)} alt="" className="w-full h-full object-cover" />
                    ) : editingTenant && (editingTenant as any).logo_url ? (
                      <img src={(editingTenant as any).logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-primary file:text-primary-foreground cursor-pointer"
                    onChange={e => setLogoFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">{zh ? '建议 200x200 像素' : 'Recommended 200x200px'}</p>
                </div>
              </div>
            </div>
            <div><Label>{zh ? '名称' : 'Name'}</Label>
              <Input value={editTenantData.name} onChange={e => setEditTenantData(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>{zh ? '标识符' : 'Slug'}</Label>
              <Input value={editTenantData.slug} onChange={e => setEditTenantData(p => ({ ...p, slug: e.target.value }))} /></div>
            <div><Label>{zh ? '套餐' : 'Plan'}</Label>
              <Select value={editTenantData.plan} onValueChange={v => setEditTenantData(p => ({ ...p, plan: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">{planLabels.free}</SelectItem>
                  <SelectItem value="basic">{planLabels.basic}</SelectItem>
                  <SelectItem value="professional">{planLabels.professional}</SelectItem>
                  <SelectItem value="enterprise">{planLabels.enterprise}</SelectItem>
                </SelectContent>
              </Select></div>
            <div><Label>{zh ? '最大成员数' : 'Max Members'}</Label>
              <Input type="number" value={editTenantData.max_members} onChange={e => setEditTenantData(p => ({ ...p, max_members: parseInt(e.target.value) || 5 }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenantDialog(false)}>{zh ? '取消' : 'Cancel'}</Button>
            <Button onClick={() => editTenantMutation.mutate()} disabled={!editTenantData.name || editTenantMutation.isPending}>
              {zh ? '保存' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tenant Dialog */}
      <Dialog open={deleteTenantDialog} onOpenChange={setDeleteTenantDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-destructive">{zh ? '停用并归档租户' : 'Archive Tenant'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {zh
                ? `确定要停用并归档租户 "${deletingTenant?.name}" 吗？所有成员将被停用，业务数据将保留但不可访问。`
                : `Are you sure you want to archive tenant "${deletingTenant?.name}"? All members will be deactivated and data will be preserved but inaccessible.`}
            </p>
            <div>
              <Label>{zh ? '请输入租户名称以确认' : 'Type tenant name to confirm'}</Label>
              <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder={deletingTenant?.name} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTenantDialog(false)}>{zh ? '取消' : 'Cancel'}</Button>
            <Button variant="destructive"
              onClick={() => deleteTenantMutation.mutate()}
              disabled={deleteConfirmText !== deletingTenant?.name || deleteTenantMutation.isPending}>
              {zh ? '确认归档' : 'Confirm Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tenant Detail / Members Dialog */}
      <Dialog open={!!selectedTenant} onOpenChange={(open) => { if (!open) { setSelectedTenant(null); setMemberSearch(''); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {selectedTenant?.name}
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => selectedTenant && openEditTenant(selectedTenant)}>
                <Edit2 className="w-3 h-3" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Tenant Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-muted-foreground">{zh ? '标识符' : 'Slug'}:</span> <span className="font-mono text-xs">{selectedTenant?.slug}</span></div>
              <div><span className="text-muted-foreground">{zh ? '套餐' : 'Plan'}:</span> <Badge variant="outline" className="ml-1">{planLabels[selectedTenant?.plan || ''] || selectedTenant?.plan}</Badge></div>
              <div><span className="text-muted-foreground">{zh ? '最大成员' : 'Max'}:</span> {selectedTenant?.max_members}</div>
              <div><span className="text-muted-foreground">{zh ? '到期' : 'Expires'}:</span> {selectedTenant?.expires_at ? format(new Date(selectedTenant.expires_at), 'yyyy-MM-dd') : '∞'}</div>
            </div>

            {/* Admin Accounts Section */}
            {getAdminMembers().length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  {zh ? '管理员账号' : 'Admin Accounts'} ({getAdminMembers().length})
                </h4>
                <div className="grid gap-2">
                  {getAdminMembers().map(m => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-sm gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {roleIcon(m.role)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.display_name || m.username}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{m.email || m.user_id.slice(0, 12)}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {m.role === 'owner' ? (zh ? '拥有者' : 'Owner') : (zh ? '管理员' : 'Admin')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Members Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {zh ? '全部成员' : 'All Members'} ({members.length})
                </h4>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddMember(true)}>
                  <UserPlus className="w-3.5 h-3.5" />{zh ? '新增账户' : 'Add Account'}
                </Button>
              </div>
              {members.length > 5 && (
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder={zh ? '搜索成员...' : 'Search members...'} value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                </div>
              )}
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {members.filter(m => {
                  if (!memberSearch) return true;
                  const q = memberSearch.toLowerCase();
                  return (m.display_name || '').toLowerCase().includes(q) || (m.username || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q);
                }).map(m => (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 text-sm gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {roleIcon(m.role)}
                      <div className="min-w-0">
                        <p className="text-sm truncate">{m.display_name || m.username}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{m.email || m.user_id.slice(0, 12)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Select value={m.role} onValueChange={(v) => updateMemberRoleMutation.mutate({ memberId: m.id, newRole: v, userId: m.user_id })}>
                        <SelectTrigger className="h-7 w-20 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">{zh ? '拥有者' : 'Owner'}</SelectItem>
                          <SelectItem value="admin">{zh ? '管理员' : 'Admin'}</SelectItem>
                          <SelectItem value="member">{zh ? '成员' : 'Member'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title={zh ? '修改密码' : 'Change password'}
                        onClick={() => { setChangePasswordUser(m); setNewPasswordValue(''); setShowNewPassword(false); setChangePasswordDialog(true); }}>
                        <KeyRound className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        title={m.is_active ? (zh ? '停用' : 'Deactivate') : (zh ? '启用' : 'Activate')}
                        onClick={() => toggleMemberStatusMutation.mutate({ memberId: m.id, isActive: m.is_active })}>
                        {m.is_active ? <Ban className="w-3.5 h-3.5 text-destructive" /> : <CheckCircle className="w-3.5 h-3.5 text-success" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={zh ? '移除' : 'Remove'}
                        onClick={() => removeMemberMutation.mutate({ memberId: m.id, userId: m.user_id })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      {!m.is_active && <Badge variant="secondary" className="text-[10px]">{zh ? '已停用' : 'Inactive'}</Badge>}
                    </div>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">{zh ? '暂无成员' : 'No members'}</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordDialog} onOpenChange={setChangePasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{zh ? '修改密码' : 'Change Password'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {zh ? '为用户' : 'For user'} <span className="font-medium text-foreground">{changePasswordUser?.email || changePasswordUser?.username}</span> {zh ? '设置新密码' : 'set a new password'}
            </p>
            <div className="space-y-2">
              <Label>{zh ? '新密码' : 'New Password'}</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPasswordValue}
                  onChange={e => setNewPasswordValue(e.target.value)}
                  placeholder="≥ 6 characters"
                />
                <Button type="button" variant="ghost" size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordDialog(false)}>{zh ? '取消' : 'Cancel'}</Button>
            <Button onClick={() => changePasswordMutation.mutate()}
              disabled={!newPasswordValue || newPasswordValue.length < 6 || changePasswordMutation.isPending}>
              {zh ? '确认修改' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{zh ? '新增账户' : 'Add Account'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{zh ? '邮箱' : 'Email'}</Label>
              <Input type="email" value={newMember.email} onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>{zh ? '密码' : 'Password'}</Label>
              <Input type="password" value={newMember.password} onChange={e => setNewMember(p => ({ ...p, password: e.target.value }))} /></div>
            <div><Label>{zh ? '用户名' : 'Username'}</Label>
              <Input value={newMember.username} onChange={e => setNewMember(p => ({ ...p, username: e.target.value }))}
                placeholder={newMember.email.split('@')[0] || (zh ? '自动生成' : 'auto')} /></div>
            <div><Label>{zh ? '角色' : 'Role'}</Label>
              <Select value={newMember.role} onValueChange={v => setNewMember(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{zh ? '管理员' : 'Admin'}</SelectItem>
                  <SelectItem value="owner">{zh ? '拥有者' : 'Owner'}</SelectItem>
                  <SelectItem value="member">{zh ? '成员' : 'Member'}</SelectItem>
                </SelectContent>
              </Select></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>{zh ? '取消' : 'Cancel'}</Button>
            <Button onClick={() => addMemberMutation.mutate()} disabled={!newMember.email || !newMember.password || addMemberMutation.isPending}>
              {zh ? '创建' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}