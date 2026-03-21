import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Unauthorized() {
  const { user, userRole, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  // 如果没有用户登录，重定向到登录页
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  // 如果用户已经有有效角色（非 viewer），重定向到仪表板
  useEffect(() => {
    if (!loading && user && userRole && userRole !== 'viewer') {
      navigate('/', { replace: true });
    }
  }, [user, userRole, loading, navigate]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 如果没有用户，不渲染内容（会被 useEffect 重定向）
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-warning" />
          </div>
          <CardTitle className="text-xl">{t('unauthorized.title')}</CardTitle>
          <CardDescription>
            {t('unauthorized.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Mail className="w-4 h-4" />
              {t('unauthorized.currentAccount')}
            </div>
            <p className="font-medium">{user.email}</p>
          </div>
          <div className="text-sm text-muted-foreground text-center">
            <p>{t('unauthorized.contactAdmin')}</p>
            <p className="mt-2">{t('unauthorized.refreshHint')}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('unauthorized.refresh')}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('unauthorized.logout')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}