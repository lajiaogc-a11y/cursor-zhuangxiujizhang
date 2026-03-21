import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  permissions: Record<string, boolean>;
  hasPermission: (key: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string, tenantId?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const queryClient = useQueryClient();

  // Prefetch is handled by individual pages with proper tenant_id filtering
  const prefetchCommonData = useCallback(() => {
    // No-op: pages handle their own data fetching with tenant context
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // Fetch all roles and pick the highest-privilege one
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      } else if (!data || data.length === 0) {
        setUserRole(null);
      } else {
        // Priority: admin > accountant > project_manager > shareholder > viewer
        const priorityOrder: string[] = ['admin', 'accountant', 'project_manager', 'shareholder', 'viewer'];
        const roles: string[] = data.map(d => d.role as string);
        const best = priorityOrder.find(r => roles.includes(r)) || roles[0];
        setUserRole(best ?? null);
      }
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      setUserRole(null);
    }
    setRoleLoaded(true);
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_key, granted')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching permissions:', error);
        setPermissions({});
      } else {
        const perms: Record<string, boolean> = {};
        data?.forEach(p => { perms[p.permission_key] = p.granted; });
        setPermissions(perms);
      }
    } catch (err) {
      console.error('Error in fetchUserPermissions:', err);
      setPermissions({});
    }
    setPermissionsLoaded(true);
  };

  const hasPermission = useCallback((key: string): boolean => {
    if (userRole === 'admin') return true;
    return permissions[key] === true;
  }, [userRole, permissions]);

  const refreshPermissions = useCallback(async () => {
    if (user) {
      await fetchUserPermissions(user.id);
    }
  }, [user]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
            fetchUserPermissions(session.user.id);
            prefetchCommonData();
          }, 0);
        } else {
          setUserRole(null);
          setPermissions({});
          setRoleLoaded(true);
          setPermissionsLoaded(true);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchUserPermissions(session.user.id);
        prefetchCommonData();
      } else {
        setRoleLoaded(true);
        setPermissionsLoaded(true);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Only set loading=false when both role and permissions are loaded
  useEffect(() => {
    if (roleLoaded && permissionsLoaded) {
      setLoading(false);
    }
  }, [roleLoaded, permissionsLoaded]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!error) {
        // onAuthStateChange will handle role/permission loading
        // Don't set global loading here so Auth page can show "logging in" button state
        setRoleLoaded(false);
        setPermissionsLoaded(false);
      }
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, username: string, tenantId?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const metadata: Record<string, string> = {
        username,
        display_name: username,
      };
      if (tenantId) {
        metadata.tenant_id = tenantId;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    queryClient.clear();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setPermissions({});
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, permissions, hasPermission, signIn, signUp, signOut, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
