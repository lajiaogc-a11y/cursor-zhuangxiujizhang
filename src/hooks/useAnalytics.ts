import { useCallback, useEffect, useRef } from 'react';
import { insertAnalyticsEvents } from '@/services/settings.service';
import { useAuth } from '@/lib/auth';

type EventCategory = 'navigation' | 'action' | 'error' | 'performance' | 'general';

interface TrackOptions {
  category?: EventCategory;
  data?: Record<string, any>;
}

// Batch queue for performance
let eventQueue: Array<{
  user_id: string | null;
  event_name: string;
  event_category: string;
  event_data: Record<string, any>;
  page_url: string;
}> = [];

let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushEvents() {
  if (eventQueue.length === 0) return;
  const batch = [...eventQueue];
  eventQueue = [];

  try {
    await insertAnalyticsEvents(batch);
  } catch {
    // Silent fail - analytics should never break the app
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushEvents();
  }, 3000); // Batch every 3 seconds
}

export function useAnalytics() {
  const { user } = useAuth();
  const userId = user?.id || null;

  // Track page view on mount
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!hasTrackedRef.current) {
      hasTrackedRef.current = true;
      queueEvent(userId, 'page_view', 'navigation', {
        path: window.location.pathname,
      });
    }
  }, [userId]);

  const track = useCallback(
    (eventName: string, options?: TrackOptions) => {
      queueEvent(userId, eventName, options?.category || 'action', options?.data || {});
    },
    [userId]
  );

  return { track };
}

function queueEvent(
  userId: string | null,
  eventName: string,
  category: string,
  data: Record<string, any>
) {
  eventQueue.push({
    user_id: userId,
    event_name: eventName,
    event_category: category,
    event_data: data,
    page_url: window.location.pathname,
  });
  scheduleFlush();
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      flushEvents();
    }
  });
}
