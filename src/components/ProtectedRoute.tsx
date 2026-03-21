import { forwardRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissionKey?: string;
}

export const ProtectedRoute = forwardRef<HTMLDivElement, ProtectedRouteProps>(function ProtectedRoute({ children, permissionKey }, ref) {
  const { user, loading, userRole, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
