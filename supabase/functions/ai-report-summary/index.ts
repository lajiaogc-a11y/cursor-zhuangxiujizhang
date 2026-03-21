import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "未授权访问" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "用户认证失败" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reportData, period } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI 服务未配置 (OPENAI_API_KEY)" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input validation
    if (!reportData || typeof reportData !== 'object') {
      return new Response(JSON.stringify({ error: "无效的报告数据" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!period || typeof period !== 'string' || period.length > 100) {
      return new Response(JSON.stringify({ error: "无效的时间段" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `你是一个专业的财务分析师。请根据提供的财务数据生成一份简洁的中文财务报告摘要。

要求:
1. 分析收入和支出趋势
2. 识别主要的收支类别
3. 评估盈利能力
4. 提供2-3条具体的财务建议
5. 使用马币(RM)作为货币单位
6. 保持简洁，使用要点格式
7. 突出异常或值得关注的数据点`;

    const userPrompt = `请分析以下${period}的财务数据并生成报告摘要:

总收入: RM ${reportData.totalIncome?.toLocaleString() || 0}
总支出: RM ${reportData.totalExpense?.toLocaleString() || 0}
净利润: RM ${(reportData.totalIncome - reportData.totalExpense)?.toLocaleString() || 0}

收入分类明细:
${reportData.incomeByCategory?.map((c: any) => `- ${c.name}: RM ${c.value?.toLocaleString()}`).join('\n') || '暂无数据'}

支出分类明细:
${reportData.expenseByCategory?.map((c: any) => `- ${c.name}: RM ${c.value?.toLocaleString()}`).join('\n') || '暂无数据'}

项目统计:
${reportData.projectStats?.map((p: any) => `- ${p.status}: ${p.count}个项目，总额 RM ${p.amount?.toLocaleString()}`).join('\n') || '暂无数据'}

${reportData.comparison ? `
同比变化:
- 收入变化: ${reportData.comparison.income > 0 ? '+' : ''}${reportData.comparison.income?.toFixed(1)}%
- 支出变化: ${reportData.comparison.expense > 0 ? '+' : ''}${reportData.comparison.expense?.toFixed(1)}%
- 利润变化: ${reportData.comparison.profit > 0 ? '+' : ''}${reportData.comparison.profit?.toFixed(1)}%
` : ''}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "请求频率过高，请稍后再试" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "服务额度已用完" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI服务暂时不可用" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "无法生成摘要";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("report summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "未知错误" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
