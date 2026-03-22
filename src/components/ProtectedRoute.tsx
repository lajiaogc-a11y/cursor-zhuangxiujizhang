import { forwardRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { AppChromeLoading } from '@/components/layout/AppChromeLoading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissionKey?: string;
}

export const ProtectedRoute = forwardRef<HTMLDivElement, ProtectedRouteProps>(function ProtectedRoute({ children, permissionKey }, ref) {
  const { user, loading, userRole, hasPermission } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return <AppChromeLoading label={t('common.loading')} />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 待审核用户：允许访问主页和设置，其他页面重定向到未授权页面
  if (userRole === 'viewer' && permissionKey) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 管理员拥有全部权限
  if (userRole === 'admin') {
    return <>{children}</>;
  }

  // 检查页面权限
  if (permissionKey && !hasPermission(permissionKey)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
});
