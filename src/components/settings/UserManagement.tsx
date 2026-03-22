import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Users, Shield, Mail, Calendar, Edit2, Trash2, Search, RefreshCw,
  KeyRound, Ban, CheckCircle, UserPlus, Eye, EyeOff
} from 'lucide-react';
import {
  fetchTenantUsersList,
  fetchUserPermissions as fetchUserPermsService,
  saveUserRoleAndPermissions,
  deleteUserData,
  invokeAdminUserManagement,
  invokeDeleteUser,
  invokeSyncProfileEmails,
} from '@/services/admin.service';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { useI18n } from '@/lib/i18n';
import { AppSectionLoading, ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { useDataRefresh } from '@/hooks/useDataRefresh';
import { useTenant } from '@/lib/tenant';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  email?: string;
  roles: AppRole[];
  disabled?: boolean;
}

interface PermissionItem {
  key: string;
  labelKey: string;
  group: 'system' | 'nav' | 'feature';
}

const ALL_PERMISSIONS: PermissionItem[] = [
  { key: 'system.quotation', labelKey: 'permissions.systemQuotation', group: 'system' },
  { key: 'system.cost', labelKey: 'permissions.systemCost', group: 'system' },
  { key: 'system.purchasing', labelKey: 'permissions.systemPurchasing', group: 'system' },
  { key: 'system.finance', labelKey: 'permissions.systemFinance', group: 'system' },
  { key: 'nav.dashboard', labelKey: 'nav.dashboard', group: 'nav' },
  { key: 'nav.memos', labelKey: 'nav.memos', group: 'nav' },
  { key: 'nav.transactions', labelKey: 'nav.transactions', group: 'nav' },
  { key: 'nav.projects', labelKey: 'nav.projects', group: 'nav' },
  { key: 'nav.exchange', labelKey: 'nav.exchange', group: 'nav' },
  { key: 'nav.payroll', labelKey: 'nav.payroll', group: 'nav' },
  { key: 'nav.payables', labelKey: 'nav.payables', group: 'nav' },
  { key: 'nav.bank_reconciliation', labelKey: 'nav.bankReconciliation', group: 'nav' },
  { key: 'nav.contacts', labelKey: 'nav.contacts', group: 'nav' },
  { key: 'nav.invoices', labelKey: 'nav.invoices', group: 'nav' },
  { key: 'nav.tax_management', labelKey: 'nav.taxManagement', group: 'nav' },
  { key: 'nav.approvals', labelKey: 'nav.approvals', group: 'nav' },
  { key: 'nav.fixed_assets', labelKey: 'nav.fixedAssets', group: 'nav' },
  { key: 'nav.balance_ledger', labelKey: 'nav.balanceLedger', group: 'nav' },
  { key: 'nav.reports', labelKey: 'nav.reports', group: 'nav' },
  { key: 'nav.monthly_reports', labelKey: 'nav.monthlyReports', group: 'nav' },
  { key: 'nav.alerts', labelKey: 'nav.alerts', group: 'nav' },
  { key: 'nav.settings', labelKey: 'nav.settings', group: 'nav' },
  { key: 'feature.export', labelKey: 'permissions.export', group: 'feature' },
  { key: 'feature.import', labelKey: 'permissions.import', group: 'feature' },
  { key: 'feature.edit', labelKey: 'permissions.edit', group: 'feature' },
];

export function UserManagement() {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const { refreshAll } = useDataRefresh();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('viewer');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [setPasswordDialog, setSetPasswordDialog] = useState(false);
  const [setPasswordUser, setSetPasswordUser] = useState<UserWithRole | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Record<string, boolean>>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createRole, setCreateRole] = useState<AppRole>('viewer');
  const [creating, setCreating] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const fetchUserStatuses = async () => {
    try {
      const data = await invokeAdminUserManagement('get-all-user-statuses', {});
      if (data?.statuses) {
        setUserStatuses(data.statuses);
      }
    } catch (e) {
      console.warn('Failed to fetch user statuses:', e);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    if (!tenant) {
      setUsers([]);
      setLoading(false);
      return;
    }
    try {
      const usersWithRoles = await fetchTenantUsersList(tenant.id);
      setUsers(usersWithRoles as UserWithRole[]);
    } catch (error: any) {
      toast({ title: t('users.fetchFailed'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUserStatuses();
  }, [tenant?.id]);

  const fetchUserPermissionsLocal = async (userId: string) => {
    const data = await fetchUserPermsService(userId);
    const perms: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach(p => { perms[p.key] = p.key === 'nav.dashboard'; });
    data.forEach(p => { perms[p.permission_key] = p.granted; });
    return perms;
  };

  const handleOpenEdit = async (user: UserWithRole) => {
    setEditingUser(user);
    setSelectedRole(user.roles[0] || 'viewer');
    const perms = await fetchUserPermissionsLocal(user.user_id);
    setEditPermissions(perms);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSavingPermissions(true);
    try {
      const permissions = ALL_PERMISSIONS.map(p => ({
        key: p.key,
        granted: editPermissions[p.key] || false,
      }));
      await saveUserRoleAndPermissions(editingUser.user_id, selectedRole, permissions);
      toast({ title: t('users.roleUpdated') });
      setDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
      refreshAll();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleDeleteUser = async (user: UserWithRole) => {
    if (!confirm(t('users.deleteConfirm'))) return;
    try {
      await deleteUserData(user.user_id);
      try { await invokeDeleteUser(user.user_id); } catch { /* silent */ }
      toast({ title: t('users.deleteSuccess') || t('common.deleteSuccess') });
      fetchUsers();
      refreshAll();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  const handleOpenSetPassword = (user: UserWithRole) => {
    setSetPasswordUser(user);
    setNewPasswordValue('');
    setShowNewPassword(false);
    setSetPasswordDialog(true);
  };

  const handleSetPassword = async () => {
    if (!setPasswordUser || !newPasswordValue) return;
    if (newPasswordValue.length < 6) {
      toast({ title: t('password.tooShort'), variant: 'destructive' });
      return;
    }
    setSettingPassword(true);
    try {
      await invokeAdminUserManagement('set-password', { userId: setPasswordUser.user_id, password: newPasswordValue });
      toast({ title: t('users.resetPasswordSuccess') });
      setSetPasswordDialog(false);
      setSetPasswordUser(null);
      setNewPasswordValue('');
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setSettingPassword(false);
    }
  };

  const handleToggleUserStatus = async (user: UserWithRole) => {
    const isCurrentlyDisabled = userStatuses[user.user_id] || false;
    const confirmMsg = isCurrentlyDisabled ? t('users.enableConfirm') : t('users.disableConfirm');
    if (!confirm(confirmMsg)) return;
    try {
      await invokeAdminUserManagement('toggle-user-status', { userId: user.user_id, disable: !isCurrentlyDisabled });
      setUserStatuses(prev => ({ ...prev, [user.user_id]: !isCurrentlyDisabled }));
      toast({ title: isCurrentlyDisabled ? t('users.userEnabled') : t('users.userDisabled') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };


  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'accountant': return 'default';
      case 'project_manager': return 'secondary';
      case 'shareholder': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case 'admin': return t('users.roleAdmin');
      case 'accountant': return t('users.roleAccountant');
      case 'project_manager': return t('users.roleProjectManager');
      case 'shareholder': return t('users.roleShareholder');
      case 'viewer': return t('users.roleViewer');
      default: return role;
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(search.toLowerCase()) ||
    (user.display_name && user.display_name.toLowerCase().includes(search.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSyncEmails = async () => {
    setSyncing(true);
    try {
      const data = await invokeSyncProfileEmails();
      toast({ 
        title: t('users.syncSuccess'), 
        description: t('users.syncedCount').replace('{count}', data.updatedCount.toString())
      });
      fetchUsers();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const toggleAllPermissions = (granted: boolean) => {
    const newPerms = { ...editPermissions };
    ALL_PERMISSIONS.forEach(p => { newPerms[p.key] = granted; });
    setEditPermissions(newPerms);
  };

  const systemPermissions = ALL_PERMISSIONS.filter(p => p.group === 'system');
  const navPermissions = ALL_PERMISSIONS.filter(p => p.group === 'nav');
  const featurePermissions = ALL_PERMISSIONS.filter(p => p.group === 'feature');

  const handleCreateUser = async () => {
    if (!createEmail || !createPassword || !createUsername) return;
    if (createPassword.length < 6) {
      toast({ title: t('password.tooShort'), variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await invokeAdminUserManagement('create-user', {
        email: createEmail, password: createPassword, username: createUsername, role: createRole,
      });
      toast({ title: t('users.createSuccess') });
      setCreateDialogOpen(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateUsername('');
      setCreateRole('viewer');
      fetchUsers();
      fetchUserStatuses();
    } catch (error: any) {
      toast({ title: t('users.createFailed'), description: error.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          {t('users.title')}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            {t('users.createUser')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSyncEmails} disabled={syncing}>
            {syncing ? <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {syncing ? t('users.syncing') : t('users.syncEmails')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('users.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <AppSectionLoading label={t('common.loading')} compact />
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('users.noUsers')}</p>
            </div>
          ) : (
            filteredUsers.map(user => {
              const isDisabled = userStatuses[user.user_id] || false;
              return (
                <div key={user.id} className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${isDisabled ? 'opacity-60 bg-muted/30' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {(user.display_name || user.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{user.display_name || user.username}</span>
                        {user.roles.map(role => (
                          <Badge key={role} variant={getRoleBadgeVariant(role) as any}>
                            {getRoleLabel(role)}
                          </Badge>
                        ))}
                        {isDisabled && (
                          <Badge variant="destructive" className="text-xs">
                            <Ban className="w-3 h-3 mr-1" />
                            {t('users.disabled')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email || `@${user.username}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(user.created_at), 'yyyy-MM-dd')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenSetPassword(user)} title={t('users.resetPassword')}>
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleUserStatus(user)}
                      title={isDisabled ? t('users.enableUser') : t('users.disableUser')}
                      className={isDisabled ? 'text-green-600' : 'text-amber-600'}
                    >
                      {isDisabled ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(user)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteUser(user)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setEditingUser(null); }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('permissions.editTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('users.user')}</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {editingUser?.display_name || editingUser?.username}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>{t('users.role')}</Label>
                <Select value={selectedRole} onValueChange={v => setSelectedRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-destructive" />
                        {t('users.roleAdmin')} - {t('users.roleAdminDesc')}
                      </div>
                    </SelectItem>
                    <SelectItem value="accountant">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        {t('users.roleAccountant')} - {t('users.roleAccountantDesc')}
                      </div>
                    </SelectItem>
                    <SelectItem value="project_manager">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-secondary-foreground" />
                        {t('users.roleProjectManager')} - {t('users.roleProjectManagerDesc')}
                      </div>
                    </SelectItem>
                    <SelectItem value="shareholder">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-warning" />
                        {t('users.roleShareholder')} - {t('users.roleShareholderDesc')}
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        {t('users.roleViewer')} - {t('users.roleViewerDesc')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRole === 'admin' ? (
                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  {t('permissions.adminNote')}
                </div>
              ) : (
                <>
                  {/* System Permissions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">{t('permissions.systemAccess')}</Label>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => toggleAllPermissions(true)}>
                          {t('permissions.selectAll')}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => toggleAllPermissions(false)}>
                          {t('permissions.deselectAll')}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {systemPermissions.map(perm => (
                        <label key={perm.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                          <Checkbox
                            checked={editPermissions[perm.key] || false}
                            onCheckedChange={(checked) => {
                              setEditPermissions(prev => ({ ...prev, [perm.key]: !!checked }));
                            }}
                          />
                          <span className="text-sm">{t(perm.labelKey)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Page Permissions (Finance) */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">{t('permissions.pageAccess')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {navPermissions.map(perm => (
                        <label key={perm.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                          <Checkbox
                            checked={editPermissions[perm.key] || false}
                            onCheckedChange={(checked) => {
                              setEditPermissions(prev => ({ ...prev, [perm.key]: !!checked }));
                            }}
                          />
                          <span className="text-sm">{t(perm.labelKey)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Feature Permissions */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">{t('permissions.featureAccess')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {featurePermissions.map(perm => (
                        <label key={perm.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                          <Checkbox
                            checked={editPermissions[perm.key] || false}
                            onCheckedChange={(checked) => {
                              setEditPermissions(prev => ({ ...prev, [perm.key]: !!checked }));
                            }}
                          />
                          <span className="text-sm">{t(perm.labelKey)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleSave} disabled={savingPermissions}>
                  {savingPermissions && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Set Password Dialog */}
        <Dialog open={setPasswordDialog} onOpenChange={open => { setSetPasswordDialog(open); if (!open) { setSetPasswordUser(null); setNewPasswordValue(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('users.resetPassword')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('users.setPasswordFor')}: <span className="font-medium">{setPasswordUser?.display_name || setPasswordUser?.username}</span>
              </p>
              <div className="space-y-2">
                <Label>{t('password.new')}</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPasswordValue}
                    onChange={e => setNewPasswordValue(e.target.value)}
                    placeholder="≥ 6 characters"
                  />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSetPasswordDialog(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleSetPassword} disabled={settingPassword || !newPasswordValue}>
                  {settingPassword && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
                  {t('common.confirm')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={open => { setCreateDialogOpen(open); if (!open) { setCreateEmail(''); setCreatePassword(''); setCreateUsername(''); setCreateRole('viewer'); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('users.createUser')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('users.createUserDesc')}</p>
              <div className="space-y-2">
                <Label>{t('users.newEmail')}</Label>
                <Input type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)} placeholder="user@example.com" />
              </div>
              <div className="space-y-2">
                <Label>{t('users.newUsername')}</Label>
                <Input value={createUsername} onChange={e => setCreateUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('users.newPassword')}</Label>
                <div className="relative">
                  <Input
                    type={showCreatePassword ? 'text' : 'password'}
                    value={createPassword}
                    onChange={e => setCreatePassword(e.target.value)}
                    placeholder="≥ 6 characters"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('users.newRole')}</Label>
                <Select value={createRole} onValueChange={v => setCreateRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('users.roleAdmin')}</SelectItem>
                    <SelectItem value="accountant">{t('users.roleAccountant')}</SelectItem>
                    <SelectItem value="project_manager">{t('users.roleProjectManager')}</SelectItem>
                    <SelectItem value="shareholder">{t('users.roleShareholder')}</SelectItem>
                    <SelectItem value="viewer">{t('users.roleViewer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleCreateUser} disabled={creating || !createEmail || !createPassword || !createUsername}>
                  {creating ? t('users.creating') : t('users.createUser')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}