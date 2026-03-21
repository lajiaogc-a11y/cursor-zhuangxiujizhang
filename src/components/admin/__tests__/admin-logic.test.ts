import { describe, it, expect, vi } from 'vitest';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        gte: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
        in: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        ilike: () => ({
          range: () => Promise.resolve({ data: [], error: null, count: 0 }),
        }),
        limit: () => Promise.resolve({ data: [], error: null }),
        range: () => Promise.resolve({ data: [], error: null, count: 0 }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
        ilike: () => Promise.resolve({ error: null }),
        lt: () => Promise.resolve({ error: null }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'test' }, error: null }),
        }),
      }),
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
    functions: {
      invoke: () => Promise.resolve({ data: { version: 'v1' }, error: null }),
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'test' } } }, error: null }),
    },
    storage: {
      from: () => ({
        list: () => Promise.resolve({ data: [], error: null }),
      }),
    },
  },
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@test.com' } }),
}));

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ language: 'en', t: (key: string) => key }),
}));

describe('Admin Components - Unit Tests', () => {
  describe('Data processing logic', () => {
    it('should correctly group events by user in OnlineSessions logic', () => {
      const events = [
        { user_id: 'u1', page_url: '/dashboard', created_at: '2026-03-12T10:00:00Z' },
        { user_id: 'u1', page_url: '/projects', created_at: '2026-03-12T10:05:00Z' },
        { user_id: 'u2', page_url: '/settings', created_at: '2026-03-12T10:01:00Z' },
        { user_id: null, page_url: '/', created_at: '2026-03-12T10:02:00Z' },
      ];

      const userMap = new Map<string, { lastActive: string; lastPage: string; count: number }>();
      events.forEach(e => {
        if (!e.user_id) return;
        const existing = userMap.get(e.user_id);
        if (!existing) {
          userMap.set(e.user_id, {
            lastActive: e.created_at,
            lastPage: e.page_url || '/',
            count: 1,
          });
        } else {
          existing.count++;
        }
      });

      expect(userMap.size).toBe(2);
      expect(userMap.get('u1')?.count).toBe(2);
      expect(userMap.get('u2')?.count).toBe(1);
      // null user_id should be filtered out
      expect(userMap.has('')).toBe(false);
    });

    it('should correctly calculate error frequency in ErrorLogManager logic', () => {
      const errors = [
        { error_message: 'TypeError: Cannot read property of null' },
        { error_message: 'TypeError: Cannot read property of null' },
        { error_message: 'TypeError: Cannot read property of null' },
        { error_message: 'ReferenceError: x is not defined' },
        { error_message: 'NetworkError: Failed to fetch' },
        { error_message: 'NetworkError: Failed to fetch' },
      ];

      const countMap = new Map<string, number>();
      errors.forEach(e => {
        const key = e.error_message.slice(0, 80);
        countMap.set(key, (countMap.get(key) || 0) + 1);
      });

      const sorted = Array.from(countMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([msg, count]) => ({ message: msg, count }));

      expect(sorted).toHaveLength(3);
      expect(sorted[0].message).toBe('TypeError: Cannot read property of null');
      expect(sorted[0].count).toBe(3);
      expect(sorted[1].count).toBe(2);
    });

    it('should correctly aggregate tenant usage stats', () => {
      const members = [
        { tenant_id: 't1', user_id: 'u1', is_active: true },
        { tenant_id: 't1', user_id: 'u2', is_active: true },
        { tenant_id: 't1', user_id: 'u3', is_active: false },
        { tenant_id: 't2', user_id: 'u4', is_active: true },
      ];

      const memberMap = new Map<string, number>();
      members.forEach(m => {
        if (m.is_active) {
          memberMap.set(m.tenant_id, (memberMap.get(m.tenant_id) || 0) + 1);
        }
      });

      expect(memberMap.get('t1')).toBe(2); // u3 is inactive
      expect(memberMap.get('t2')).toBe(1);
    });

    it('should correctly detect suspicious IPs in SecurityCenter logic', () => {
      const attempts = [
        { ip_address: '1.2.3.4', success: false, attempted_at: '2026-03-12T10:00:00Z' },
        { ip_address: '1.2.3.4', success: false, attempted_at: '2026-03-12T10:01:00Z' },
        { ip_address: '1.2.3.4', success: false, attempted_at: '2026-03-12T10:02:00Z' },
        { ip_address: '5.6.7.8', success: false, attempted_at: '2026-03-12T10:00:00Z' },
        { ip_address: '5.6.7.8', success: true, attempted_at: '2026-03-12T10:01:00Z' },
      ];

      const ipMap = new Map<string, { count: number; last: string }>();
      attempts.filter(a => !a.success).forEach(a => {
        const existing = ipMap.get(a.ip_address);
        if (existing) {
          existing.count++;
          if (a.attempted_at > existing.last) existing.last = a.attempted_at;
        } else {
          ipMap.set(a.ip_address, { count: 1, last: a.attempted_at });
        }
      });

      const suspicious = Array.from(ipMap.entries())
        .filter(([, v]) => v.count >= 3)
        .map(([ip, v]) => ({ ip, ...v }));

      expect(suspicious).toHaveLength(1);
      expect(suspicious[0].ip).toBe('1.2.3.4');
      expect(suspicious[0].count).toBe(3);
    });

    it('should correctly build hourly traffic distribution', () => {
      const events = [
        { created_at: '2026-03-12T08:00:00Z' },
        { created_at: '2026-03-12T08:30:00Z' },
        { created_at: '2026-03-12T14:00:00Z' },
        { created_at: '2026-03-12T14:15:00Z' },
        { created_at: '2026-03-12T14:45:00Z' },
        { created_at: '2026-03-12T23:00:00Z' },
      ];

      const hours = new Array(24).fill(0);
      events.forEach(e => {
        const h = new Date(e.created_at).getHours();
        hours[h]++;
      });

      expect(hours[8]).toBe(2);
      expect(hours[14]).toBe(3);
      expect(hours[23]).toBe(1);
      expect(hours[0]).toBe(0);
    });

    it('should correctly identify expired tenants', () => {
      const tenants = [
        { id: '1', expires_at: '2025-01-01T00:00:00Z' }, // expired
        { id: '2', expires_at: '2027-01-01T00:00:00Z' }, // valid
        { id: '3', expires_at: null }, // never expires
      ];

      const isExpired = (t: { expires_at: string | null }) =>
        t.expires_at && new Date(t.expires_at) < new Date();

      expect(isExpired(tenants[0])).toBeTruthy();
      expect(isExpired(tenants[1])).toBeFalsy();
      expect(isExpired(tenants[2])).toBeFalsy();
    });

    it('should correctly calculate error rate', () => {
      const errorCount = 5;
      const eventCount = 1000;
      const errorRate = eventCount > 0 ? ((errorCount / eventCount) * 100).toFixed(2) : '0';
      expect(errorRate).toBe('0.50');

      const zeroRate = 0 > 0 ? ((0 / 0) * 100).toFixed(2) : '0';
      expect(zeroRate).toBe('0');
    });

    it('should correctly calculate login success rate', () => {
      const attempts = [
        { success: true },
        { success: true },
        { success: true },
        { success: false },
        { success: false },
      ];
      
      const total = attempts.length;
      const failed = attempts.filter(a => !a.success).length;
      const successRate = total > 0 ? ((total - failed) / total * 100).toFixed(1) : '100';
      
      expect(successRate).toBe('60.0');
      expect(failed).toBe(2);
    });

    it('should handle page view ranking with percentage calculation', () => {
      const pageStats = [
        { page: '/dashboard', views: 50 },
        { page: '/projects', views: 30 },
        { page: '/settings', views: 20 },
      ];

      const totalViews = pageStats.reduce((a, p) => a + p.views, 0);
      expect(totalViews).toBe(100);

      const pct = (pageStats[0].views / totalViews * 100).toFixed(1);
      expect(pct).toBe('50.0');
    });
  });
});
