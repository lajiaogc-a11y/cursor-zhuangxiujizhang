import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, action, success: loginSuccess } = body;
    
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === 'check') {
      // Check if IP is locked out (IP-only, no email-based lockout to prevent abuse)
      const { data: isLocked } = await supabase.rpc('is_login_locked', {
        check_ip: clientIP,
        check_email: null,
      });

      if (isLocked) {
        const { data: attempts } = await supabase
          .from('login_attempts' as any)
          .select('attempted_at')
          .or(`ip_address.eq.${clientIP}${email ? `,email.eq.${email}` : ''}`)
          .eq('success', false)
          .gte('attempted_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
          .order('attempted_at', { ascending: false })
          .limit(1);

        const lastAttempt = (attempts as any)?.[0]?.attempted_at;
        const unlockAt = lastAttempt 
          ? new Date(new Date(lastAttempt).getTime() + 15 * 60 * 1000)
          : new Date(Date.now() + 15 * 60 * 1000);
        const remainingMinutes = Math.ceil((unlockAt.getTime() - Date.now()) / 60000);

        return new Response(JSON.stringify({ 
          locked: true, 
          remaining_minutes: Math.max(1, remainingMinutes),
          message: `登录已被锁定，请在 ${Math.max(1, remainingMinutes)} 分钟后重试`
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ locked: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === 'record') {
      // Rate-limit: max 10 record calls per IP per minute
      const { data: recentRecords } = await supabase
        .from('login_attempts' as any)
        .select('id')
        .eq('ip_address', clientIP)
        .gte('attempted_at', new Date(Date.now() - 60 * 1000).toISOString());

      if ((recentRecords as any)?.length >= 10) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only record IP — never store client-supplied email to prevent
      // targeted account lockout abuse by external attackers.
      await (supabase.from('login_attempts' as any) as any).insert({
        ip_address: clientIP,
        email: null,
        success: !!loginSuccess,
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("login-guard error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
