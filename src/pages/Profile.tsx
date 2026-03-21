import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { fetchProfile, updateProfile, changePassword } from '@/services/profile.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sidebar } from '@/components/layout/Sidebar';
import { ArrowLeft, User, Mail, Lock, Save, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { display_name: displayName, username });
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      toast({ title: language === 'zh' ? '资料已更新' : 'Profile updated' });
    } catch (error: any) {
      toast({ title: language === 'zh' ? '保存失败' : 'Save failed', description: error.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: language === 'zh' ? '新密码至少6位' : 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: language === 'zh' ? '两次密码不一致' : 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(newPassword);
      toast({ title: language === 'zh' ? '密码已修改' : 'Password changed' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error: any) {
      toast({ title: language === 'zh' ? '修改失败' : 'Failed', description: error.message, variant: 'destructive' });
    }
    setChangingPassword(false);
  };

  const inputClass = "h-11 bg-background border-border focus-visible:ring-1 focus-visible:ring-primary";
  const labelClass = "text-sm font-medium text-foreground";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-64 pt-14 lg:pt-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{language === 'zh' ? '个人资料' : 'Profile'}</h1>
              <p className="text-sm text-muted-foreground">{language === 'zh' ? '管理您的账户信息' : 'Manage your account'}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground shrink-0">
                    {(displayName || username || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground truncate">{displayName || username}</p>
                    <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className={labelClass}>{language === 'zh' ? '显示名称' : 'Display Name'}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={`${inputClass} pl-10`} placeholder={language === 'zh' ? '输入显示名称' : 'Enter display name'} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass}>{language === 'zh' ? '用户名' : 'Username'}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={username} onChange={(e) => setUsername(e.target.value)} className={`${inputClass} pl-10`} placeholder={language === 'zh' ? '输入用户名' : 'Enter username'} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass}>{language === 'zh' ? '邮箱' : 'Email'}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={user?.email || ''} disabled className={`${inputClass} pl-10 opacity-60`} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {language === 'zh' ? '保存资料' : 'Save Profile'}
                  </Button>
                </div>
              </div>

              {/* Password Card */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <div className="pb-3 border-b border-border">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    {language === 'zh' ? '修改密码' : 'Change Password'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">{language === 'zh' ? '设置新的登录密码' : 'Set a new login password'}</p>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className={labelClass}>{language === 'zh' ? '新密码' : 'New Password'}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`${inputClass} pl-10 pr-10`} placeholder={language === 'zh' ? '至少6位字符' : 'At least 6 characters'} />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass}>{language === 'zh' ? '确认新密码' : 'Confirm Password'}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type={showNew ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputClass} pl-10`} placeholder={language === 'zh' ? '再次输入新密码' : 'Re-enter new password'} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword} variant="outline" className="gap-2">
                    {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    {language === 'zh' ? '修改密码' : 'Change Password'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
