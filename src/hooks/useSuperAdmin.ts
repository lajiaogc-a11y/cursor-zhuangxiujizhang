import { useQuery } from '@tanstack/react-query';
import { checkIsSuperAdmin } from '@/services/admin.service';
import { useAuth } from '@/lib/auth';

export function useSuperAdmin() {
  const { user } = useAuth();

  const { data: isSuperAdmin = false } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    enabled: !!user,
    queryFn: () => checkIsSuperAdmin(user!.id),
    staleTime: 10 * 60 * 1000,
  });

  return isSuperAdmin;
}
