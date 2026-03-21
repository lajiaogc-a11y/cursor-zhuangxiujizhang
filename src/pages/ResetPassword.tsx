import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChange, updateUserPassword } from '@/services/base';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import companyLogo from '@/assets/company-logo.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') {
      setIsRecovery(true);
    }

    const unsubscribe = onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: language === 'zh' ? '密码至少6位' : 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: language === 'zh' ? '两次密码不一致' : 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const { error } = await updateUserPassword(password);
    setIsSubmitting(false);
    if (error) {
      toast({ title: language === 'zh' ? '重置失败' : 'Reset failed', description: error.message, variant: 'destructive' });
    } else {
      setDone(true);
      setTimeout(() => navigate('/'), 3000);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-fade-in">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
          <h1 className="text-xl font-bold text-foreground">{language === 'zh' ? '密码已重置' : 'Password Reset'}</h1>
          <p className="text-muted-foreground text-sm">{language === 'zh' ? '正在跳转...' : 'Redirecting...'}</p>
        </div>
      </div>
    );
  }

  const inputClassName = "bg-white border-[#E6E9EE] rounded-lg h-11 focus-visible:ring-0 focus-visible:border-[#0F172A] pl-10 pr-10 text-[#0F172A] placeholder:text-[#94A3B8]";

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#071027] via-[#0F172A] to-[#1a2035]" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#2563EB]/[0.07] rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4" />

      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.4)] p-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <img src={companyLogo} alt="Flash Cast" className="h-10 w-auto object-contain" />
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">{language === 'zh' ? '重置密码' : 'Reset Password'}</h2>
            <p className="text-[#94A3B8] text-xs">{language === 'zh' ? '请输入新密码' : 'Enter your new password'}</p>
          </div>
        </div>

        {!isRecovery ? (
          <div className="text-center py-8">
            <p className="text-[#64748B] text-sm">{language === 'zh' ? '无效的重置链接，请重新发送重置邮件' : 'Invalid reset link. Please request a new one.'}</p>
            <Button className="mt-4" variant="outline" onClick={() => navigate('/auth')}>
              {language === 'zh' ? '返回登录' : 'Back to Login'}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#1E293B] text-sm font-medium">{language === 'zh' ? '新密码' : 'New Password'}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={language === 'zh' ? '至少6位字符' : 'At least 6 characters'} required className={inputClassName} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#334155]">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#1E293B] text-sm font-medium">{language === 'zh' ? '确认密码' : 'Confirm Password'}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <Input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={language === 'zh' ? '再次输入密码' : 'Re-enter password'} required className={inputClassName} />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{language === 'zh' ? '重置中...' : 'Resetting...'}</> : (language === 'zh' ? '重置密码' : 'Reset Password')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
