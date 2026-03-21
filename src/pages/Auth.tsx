import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { Loader2, ShieldAlert, Globe, Mail, Lock, User, KeyRound, Eye, EyeOff, Building2, BarChart3, Receipt, Wallet } from 'lucide-react';
import { z } from 'zod';
import { checkLoginLockout, recordLoginAttempt, useInvitationCode, sendPasswordResetEmail } from '@/services/base';
import companyLogo from '@/assets/company-logo.png';

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const { t, language, setLanguage } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '', username: '', inviteCode: '' });

  const loginSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(6, t('auth.passwordTooShort')),
  });

  const registerSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(6, t('auth.passwordTooShort')),
    username: z.string().min(2, t('auth.usernameTooShort')),
    inviteCode: z.string().min(1, t('auth.inviteCode')),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const toggleLanguage = () => setLanguage(language === 'zh' ? 'en' : 'zh');

  const handleCheckLockout = async (email: string): Promise<boolean> => {
    const result = await checkLoginLockout(email);
    if (result.locked) {
      setLockoutMessage(result.message || t('auth.loginLocked'));
      return true;
    }
    setLockoutMessage(null);
    return false;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      toast({ title: t('auth.validationError'), description: result.error.errors[0].message, variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const isLocked = await handleCheckLockout(loginData.email);
    if (isLocked) { setIsSubmitting(false); return; }
    const { error } = await signIn(loginData.email, loginData.password);
    setIsSubmitting(false);
    if (error) {
      await recordLoginAttempt(loginData.email, false);
      await handleCheckLockout(loginData.email);
      toast({ title: t('auth.loginFailed'), description: error.message === 'Invalid login credentials' ? t('auth.invalidCredentials') : error.message, variant: 'destructive' });
    } else {
      await recordLoginAttempt(loginData.email, true);
      setLockoutMessage(null);
      toast({ title: t('auth.loginSuccess'), description: t('auth.welcomeBack') });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = registerSchema.safeParse(registerData);
    if (!result.success) {
      toast({ title: t('auth.validationError'), description: result.error.errors[0].message, variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    // Step 1: Atomically validate AND consume the invitation code in one call
    // This prevents race conditions where two users validate the same last-use code
    const validTenantId = await useInvitationCode(registerData.inviteCode);
    if (!validTenantId) {
      setIsSubmitting(false);
      toast({ title: t('auth.registerFailed'), description: t('auth.invalidInviteCode'), variant: 'destructive' });
      return;
    }
    // Step 2: Register user with the tenant context
    const { error } = await signUp(registerData.email, registerData.password, registerData.username, validTenantId);
    if (error) {
      setIsSubmitting(false);
      // Note: the invitation code use count was already incremented.
      // This is acceptable because failed registrations are rare and the code still has the correct tenant binding.
      toast({ title: t('auth.registerFailed'), description: error.message.includes('already registered') ? t('auth.emailExists') : error.message, variant: 'destructive' });
      return;
    }
    setIsSubmitting(false);
    toast({ title: t('auth.registerSuccess'), description: t('auth.accountCreated') });
  };

  const features = [
    { icon: Building2, label: language === 'zh' ? '项目管理' : 'Projects' },
    { icon: BarChart3, label: language === 'zh' ? '成本控制' : 'Cost Control' },
    { icon: Receipt, label: language === 'zh' ? '采购管理' : 'Purchasing' },
    { icon: Wallet, label: language === 'zh' ? '财务中心' : 'Finance' },
  ];

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast({ title: language === 'zh' ? '请输入邮箱' : 'Please enter email', variant: 'destructive' });
      return;
    }
    setForgotSubmitting(true);
    const { error } = await sendPasswordResetEmail(forgotEmail);
    setForgotSubmitting(false);
    if (error) {
      toast({ title: language === 'zh' ? '发送失败' : 'Failed', description: error.message, variant: 'destructive' });
    } else {
      setForgotSent(true);
    }
  };

  return (
    <>
      <div className="min-h-screen flex bg-background">
        {/* Left panel — brand showcase */}
        <div className="hidden lg:flex flex-col justify-between w-[480px] xl:w-[520px] bg-primary p-10 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/[0.05] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white/[0.04] rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
          
          {/* Top logo */}
          <div className="relative z-10">
            <img src={companyLogo} alt="Flash Cast" className="h-10 w-auto object-contain brightness-0 invert" />
          </div>

          {/* Center content */}
          <div className="relative z-10 space-y-6">
            <div>
              <h1 className="text-[32px] font-extrabold text-white leading-tight tracking-tight">
                {language === 'zh' ? '企业管理平台' : 'Enterprise Management'}
              </h1>
              <p className="mt-3 text-white/70 text-[15px] leading-relaxed max-w-[380px]">
                {language === 'zh' 
                  ? '一站式管理报价、成本、采购与财务，全方位提升企业运营效率。' 
                  : 'All-in-one platform for quotation, cost, purchasing & finance management.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-lg bg-white/[0.08] border border-white/[0.1] px-3.5 py-3">
                  <f.icon className="w-4.5 h-4.5 text-white/80 shrink-0" />
                  <span className="text-[13px] text-white/90 font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-white/30 text-xs relative z-10">
            © {new Date().getFullYear()} 闪铸装饰 Flash Cast Design
          </p>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <img src={companyLogo} alt="Flash Cast" className="h-8 w-auto object-contain dark:brightness-0 dark:invert" />
              <span className="text-sm font-bold text-foreground">Flash Cast</span>
            </div>
            <div className="lg:hidden" />
            <Button variant="outline" size="sm" onClick={toggleLanguage} className="gap-1.5 h-8">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-xs">{language === 'zh' ? 'EN' : '中文'}</span>
            </Button>
          </div>

          {/* Form container */}
          <div className="flex-1 flex items-center justify-center px-6 pb-8">
            <div className="w-full max-w-[380px] animate-fade-in">
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                  {language === 'zh' ? '欢迎回来' : 'Welcome Back'}
                </h2>
                <p className="text-muted-foreground text-sm mt-1.5">
                  {language === 'zh' ? '登录以访问您的管理平台' : 'Sign in to access your dashboard'}
                </p>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-10 bg-muted rounded-lg">
                  <TabsTrigger value="login" className="text-sm rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">{t('auth.login')}</TabsTrigger>
                  <TabsTrigger value="register" className="text-sm rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">{t('auth.register')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  {lockoutMessage && (
                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>{lockoutMessage}</span>
                    </div>
                  )}
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">{t('auth.email')}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="login-email" type="email" placeholder={t('auth.emailPlaceholder')} value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} required disabled={!!lockoutMessage} className="pl-10 h-11" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">{t('auth.password')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="login-password" type={showLoginPassword ? 'text' : 'password'} placeholder={t('auth.passwordPlaceholder')} value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} required disabled={!!lockoutMessage} className="pl-10 pr-10 h-11" />
                        <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 font-semibold" disabled={isSubmitting || !!lockoutMessage}>
                      {isSubmitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('auth.loggingIn')}</>) : t('auth.login')}
                    </Button>
                    <div className="text-center">
                      <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[13px] text-muted-foreground hover:text-primary transition-colors">
                        {language === 'zh' ? '忘记密码？' : 'Forgot password?'}
                      </button>
                    </div>
                  </form>
                </TabsContent>
                
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-username" className="text-sm font-medium">{t('auth.username')}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="register-username" type="text" placeholder={t('auth.usernamePlaceholder')} value={registerData.username} onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })} required className="pl-10 h-11" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-sm font-medium">{t('auth.email')}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="register-email" type="email" placeholder={t('auth.emailPlaceholder')} value={registerData.email} onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })} required className="pl-10 h-11" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-sm font-medium">{t('auth.password')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="register-password" type={showRegisterPassword ? 'text' : 'password'} placeholder={t('auth.passwordHint')} value={registerData.password} onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} required className="pl-10 pr-10 h-11" />
                        <button type="button" onClick={() => setShowRegisterPassword(!showRegisterPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-invite" className="text-sm font-medium">{t('auth.inviteCode')}</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="register-invite" type="text" placeholder={t('auth.inviteCodePlaceholder')} value={registerData.inviteCode} onChange={(e) => setRegisterData({ ...registerData, inviteCode: e.target.value })} required className="pl-10 h-11" />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 font-semibold" disabled={isSubmitting}>
                      {isSubmitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('auth.registering')}</>) : t('auth.register')}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowForgotPassword(false); setForgotSent(false); setForgotEmail(''); }}>
          <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-sm mx-4 p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            {forgotSent ? (
              <div className="text-center space-y-3 py-4">
                <Mail className="w-12 h-12 text-primary mx-auto" />
                <h3 className="text-lg font-bold text-foreground">{language === 'zh' ? '邮件已发送' : 'Email Sent'}</h3>
                <p className="text-muted-foreground text-sm">{language === 'zh' ? '请查看邮箱中的重置链接' : 'Check your inbox for the reset link'}</p>
                <Button variant="outline" onClick={() => { setShowForgotPassword(false); setForgotSent(false); setForgotEmail(''); }}>
                  {language === 'zh' ? '关闭' : 'Close'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{language === 'zh' ? '忘记密码' : 'Forgot Password'}</h3>
                  <p className="text-muted-foreground text-sm mt-1">{language === 'zh' ? '输入注册邮箱，我们将发送重置链接' : 'Enter your email to receive a reset link'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{language === 'zh' ? '邮箱地址' : 'Email'}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" placeholder={language === 'zh' ? '请输入邮箱' : 'Enter your email'} value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="pl-10 h-11" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowForgotPassword(false); setForgotEmail(''); }}>
                    {language === 'zh' ? '取消' : 'Cancel'}
                  </Button>
                  <Button className="flex-1" onClick={handleForgotPassword} disabled={forgotSubmitting}>
                    {forgotSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'zh' ? '发送链接' : 'Send Link')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
