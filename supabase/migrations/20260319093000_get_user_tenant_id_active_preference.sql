-- 多租户切换：RLS 使用 get_user_tenant_id() 时必须与前端「当前组织」一致。
-- 前端将 preferences.active_tenant_id 写入 profiles 后，本函数优先返回该值（且校验仍在成员列表内）。

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pref_tenant uuid;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT (p.preferences->>'active_tenant_id')::uuid INTO pref_tenant
  FROM public.profiles p
  WHERE p.user_id = uid;

  IF pref_tenant IS NOT NULL
     AND pref_tenant IN (SELECT public.get_user_tenant_ids(uid)) THEN
    RETURN pref_tenant;
  END IF;

  RETURN (
    SELECT tm.tenant_id
    FROM public.tenant_members tm
    JOIN public.tenants t ON t.id = tm.tenant_id
    WHERE tm.user_id = uid
      AND tm.is_active = true
      AND t.status = 'active'
      AND (t.expires_at IS NULL OR t.expires_at >= now())
    ORDER BY tm.joined_at ASC
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION public.get_user_tenant_id() IS
  'RLS 当前租户：优先 profiles.preferences.active_tenant_id（须为有效成员），否则取最早加入的活跃租户。';
