import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // max requests per window
const RATE_WINDOW_MS = 300_000; // 5 minutes

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// 只使用真实来源的免费汇率数据；如果取不到就明确报错（不使用固定参考汇率）
const EXCHANGE_APIS: Array<() => Promise<{ USD: number; CNY: number; MYR: number }>> = [
  // Source 1: open.er-api.com
  async () => {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error(`open.er-api.com HTTP ${res.status}`);
    const data = await res.json();
    if (data?.result !== "success" || !data?.rates?.CNY || !data?.rates?.MYR) {
      throw new Error("open.er-api.com payload invalid");
    }
    return { USD: 1, CNY: Number(data.rates.CNY), MYR: Number(data.rates.MYR) };
  },
  // Source 2: frankfurter.app (ECB)
  async () => {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=CNY,MYR");
    if (!res.ok) throw new Error(`frankfurter.app HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.rates?.CNY || !data?.rates?.MYR) throw new Error("frankfurter.app payload invalid");
    return { USD: 1, CNY: Number(data.rates.CNY), MYR: Number(data.rates.MYR) };
  },
  // Source 3: fawazahmed0 currency-api (CDN)
  async () => {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json"
    );
    if (!res.ok) throw new Error(`currency-api CDN HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.usd?.cny || !data?.usd?.myr) throw new Error("currency-api payload invalid");
    return { USD: 1, CNY: Number(data.usd.cny), MYR: Number(data.usd.myr) };
  },
];

type Currency = "MYR" | "CNY" | "USD";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit per user (5 requests per 5 minutes)
    if (!checkRateLimit(`exchange:${user.id}`)) {
      return new Response(
        JSON.stringify({ success: false, error: "请求频率过高，每5分钟最多5次" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "300" } }
      );
    }

    // Verify admin role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "accountant"])
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin or accountant privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body to get tenant_id
    const body = await req.json().catch(() => ({}));
    const tenantId = body?.tenant_id || null;

    // If no tenant_id provided, look up the user's active tenant
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      const { data: memberData } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      resolvedTenantId = memberData?.tenant_id || null;
    }

    console.log("Using tenant_id:", resolvedTenantId, "for user:", user.id);

    const currencyPairs: Array<{ from: Currency; to: Currency }> = [
      { from: "CNY", to: "MYR" },
      { from: "USD", to: "MYR" },
      { from: "CNY", to: "USD" },
      { from: "USD", to: "CNY" },
      { from: "MYR", to: "CNY" },
      { from: "MYR", to: "USD" },
    ];

    const today = new Date().toISOString().split("T")[0];

    // Fetch from first working API
    let rates: { USD: number; CNY: number; MYR: number } | null = null;
    let apiName = "";

    for (const fetchApi of EXCHANGE_APIS) {
      try {
        rates = await fetchApi();
        apiName = fetchApi === EXCHANGE_APIS[0]
          ? "open.er-api.com"
          : fetchApi === EXCHANGE_APIS[1]
            ? "frankfurter.app"
            : "currency-api";
        break;
      } catch (e) {
        console.log("API attempt failed:", String(e));
      }
    }

    if (!rates) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "无法从任何可靠来源获取汇率，请稍后重试。",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Fetched USD base rates:", rates, "source:", apiName);

    const results: Array<{ pair: string; rate: number; action: string }> = [];
    const errors: Array<{ pair: string; error: string }> = [];

    for (const pair of currencyPairs) {
      const fromRate = pair.from === "USD" ? 1 : rates[pair.from];
      const toRate = pair.to === "USD" ? 1 : rates[pair.to];

      // USD base -> cross rate
      const calculatedRate = Number((toRate / fromRate).toFixed(6));

      // Build query to find existing record for today
      let existingQuery = supabase
        .from("exchange_rates")
        .select("id, source")
        .eq("from_currency", pair.from)
        .eq("to_currency", pair.to)
        .eq("rate_date", today);
      
      if (resolvedTenantId) {
        existingQuery = existingQuery.eq("tenant_id", resolvedTenantId);
      }

      const { data: existing } = await existingQuery
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const updatePayload: Record<string, any> = {
          rate: calculatedRate,
          source: "auto",
          created_at: new Date().toISOString(),
        };
        if (resolvedTenantId) {
          updatePayload.tenant_id = resolvedTenantId;
        }

        const { error } = await supabase
          .from("exchange_rates")
          .update(updatePayload)
          .eq("id", existing.id);

        if (error) {
          errors.push({ pair: `${pair.from}/${pair.to}`, error: error.message });
        } else {
          results.push({ pair: `${pair.from}/${pair.to}`, rate: calculatedRate, action: "updated" });
        }
      } else {
        const insertPayload: Record<string, any> = {
          from_currency: pair.from,
          to_currency: pair.to,
          rate: calculatedRate,
          rate_date: today,
          source: "auto",
        };
        if (resolvedTenantId) {
          insertPayload.tenant_id = resolvedTenantId;
        }

        const { error } = await supabase.from("exchange_rates").insert(insertPayload);

        if (error) {
          errors.push({ pair: `${pair.from}/${pair.to}`, error: error.message });
        } else {
          results.push({ pair: `${pair.from}/${pair.to}`, rate: calculatedRate, action: "created" });
        }
      }
    }

    const status = errors.length > 0 ? 207 : 200;

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        message: `成功更新 ${results.length} 个汇率${errors.length ? `，失败 ${errors.length} 个` : ""}`,
        date: today,
        source: apiName,
        rawRates: {
          "1 USD": `${rates.CNY.toFixed(4)} CNY / ${rates.MYR.toFixed(4)} MYR`,
        },
        results,
        errors,
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
