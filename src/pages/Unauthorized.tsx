import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Mail, RefreshCw } from 'lucide-react';
import { AppChromeLoading } from '@/components/layout/AppChromeLoading';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Unauthorized() {
  const { user, userRole, loading, signOut, refreshUserAccess } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUserAccess();
      navigate('/', { replace: true });
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return <AppChromeLoading label={t('common.loading')} />;
  }

  // 重定向前避免空白闪烁（与首屏壳一致）
  if (!user) {
    return <AppChromeLoading label={t('common.loading')} />;
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
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
            disabled={refreshing}
            onClick={() => void handleRefresh()}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
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