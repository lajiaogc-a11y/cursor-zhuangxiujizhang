import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body ONCE
    const body = await req.json();
    const { action, userId, email, disable, password, username, role, userIds } = body;

    if (action === 'set-password') {
      if (!userId || !password || password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'userId and password (min 6 chars) are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'toggle-user-status') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (userId === requestingUser.id) {
        return new Response(
          JSON.stringify({ error: 'Cannot disable yourself' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const banDuration = disable ? '876000h' : 'none';
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: banDuration,
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, disabled: disable }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-user-status') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const banned = data?.user?.banned_until ? new Date(data.user.banned_until) > new Date() : false;

      return new Response(
        JSON.stringify({ success: true, disabled: banned }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-all-user-statuses') {
      const statuses: Record<string, boolean> = {};

      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      });

      if (listError) {
        return new Response(
          JSON.stringify({ error: listError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      for (const user of listData?.users || []) {
        const banned = user.banned_until ? new Date(user.banned_until) > new Date() : false;
        statuses[user.id] = banned;
      }

      return new Response(
        JSON.stringify({ success: true, statuses }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create-user') {
      const newEmail = body.email;
      const tenantId = body.tenantId;
      const tenantRole = body.tenantRole || 'member';
      const seedTenantData = body.seedTenantData || false;
      if (!newEmail || !password || !username) {
        return new Response(
          JSON.stringify({ error: 'Email, password, and username are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Pass tenant_id in metadata so the trigger assigns user to correct tenant
      const metadata: Record<string, string> = { username, display_name: username };
      if (tenantId) {
        metadata.tenant_id = tenantId;
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: newEmail,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newUserId = newUser.user.id;

      await supabaseAdmin.from('profiles').upsert({
        user_id: newUserId,
        username,
        display_name: username,
        email: newEmail,
      }, { onConflict: 'user_id' });

      const assignRole = role || 'viewer';
      
      // If assigning admin role, remove any viewer role that the trigger may have created
      if (assignRole === 'admin') {
        await supabaseAdmin.from('user_roles').delete()
          .eq('user_id', newUserId).eq('role', 'viewer');
      }
      
      await supabaseAdmin.from('user_roles').upsert({
        user_id: newUserId,
        role: assignRole,
      }, { onConflict: 'user_id,role' });

      // Ensure tenant membership exists with correct role (admin client bypasses RLS)
      if (tenantId) {
        // Remove any lower-privilege membership the trigger may have created
        await supabaseAdmin.from('tenant_members').delete()
          .eq('tenant_id', tenantId).eq('user_id', newUserId);
        
        await supabaseAdmin.from('tenant_members').insert({
          tenant_id: tenantId,
          user_id: newUserId,
          role: tenantRole,
          is_active: true,
        });
      }

      // Seed tenant data if requested (uses service_role to bypass RLS)
      if (seedTenantData && tenantId) {
        const { error: accErr } = await supabaseAdmin.from('company_accounts').insert([
          { tenant_id: tenantId, currency: 'MYR', account_type: 'cash', balance: 0 },
          { tenant_id: tenantId, currency: 'MYR', account_type: 'bank', balance: 0 },
          { tenant_id: tenantId, currency: 'CNY', account_type: 'cash', balance: 0 },
          { tenant_id: tenantId, currency: 'CNY', account_type: 'bank', balance: 0 },
          { tenant_id: tenantId, currency: 'USD', account_type: 'cash', balance: 0 },
          { tenant_id: tenantId, currency: 'USD', account_type: 'bank', balance: 0 },
        ]);
        if (accErr) console.error('Seed company_accounts error:', accErr);

        const defaultCategories = [
          { name: '日常开支', type: 'expense' }, { name: '材料购买', type: 'expense' },
          { name: '人工开支', type: 'expense' }, { name: '运费', type: 'expense' },
          { name: '水电网话费', type: 'expense' }, { name: '其它支出', type: 'expense' },
          { name: '其它收入', type: 'income' }, { name: '项目收款', type: 'income' },
        ];
        const { error: catErr } = await supabaseAdmin.from('transaction_categories').insert(
          defaultCategories.map(c => ({ ...c, tenant_id: tenantId, is_active: true }))
        );
        if (catErr) console.error('Seed transaction_categories error:', catErr);

        const { error: projCatErr } = await supabaseAdmin.from('project_categories').insert([
          { name: '材料费', type: 'expense', tenant_id: tenantId, is_active: true },
          { name: '人工费', type: 'expense', tenant_id: tenantId, is_active: true },
          { name: '其他费用', type: 'expense', tenant_id: tenantId, is_active: true },
        ]);
        if (projCatErr) console.error('Seed project_categories error:', projCatErr);
      }

      return new Response(
        JSON.stringify({ success: true, userId: newUserId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in admin-user-management:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
