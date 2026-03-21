
-- Suspicious operation detection function
-- Checks audit_logs for anomalous patterns and creates alerts
CREATE OR REPLACE FUNCTION public.detect_suspicious_operations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  bulk_delete RECORD;
  unusual_hour RECORD;
  rapid_changes RECORD;
  alert_msg TEXT;
BEGIN
  -- 1. Bulk delete detection: >10 deletes by same user in 5 minutes
  FOR bulk_delete IN
    SELECT user_id, table_name, table_display_name, COUNT(*) as delete_count,
           MIN(created_at) as first_at, MAX(created_at) as last_at
    FROM public.audit_logs
    WHERE action = 'DELETE'
      AND created_at > now() - interval '5 minutes'
    GROUP BY user_id, table_name, table_display_name
    HAVING COUNT(*) > 10
  LOOP
    alert_msg := '可疑操作：用户在5分钟内批量删除了 ' || bulk_delete.delete_count || ' 条 ' 
      || COALESCE(bulk_delete.table_display_name, bulk_delete.table_name) || ' 记录';
    
    IF NOT EXISTS (
      SELECT 1 FROM public.project_alerts 
      WHERE alert_type = 'profit_warning'
        AND alert_message = alert_msg
        AND is_resolved = false
    ) THEN
      INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message)
      VALUES (NULL, 'profit_warning', 'danger', alert_msg);
    END IF;
  END LOOP;

  -- 2. Unusual hours: operations between 00:00-05:00 local time (UTC+8)
  FOR unusual_hour IN
    SELECT user_id, COUNT(*) as op_count
    FROM public.audit_logs
    WHERE created_at > now() - interval '1 hour'
      AND EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kuala_Lumpur') BETWEEN 0 AND 4
    GROUP BY user_id
    HAVING COUNT(*) > 5
  LOOP
    alert_msg := '可疑操作：用户在凌晨时段进行了 ' || unusual_hour.op_count || ' 次操作';
    
    IF NOT EXISTS (
      SELECT 1 FROM public.project_alerts 
      WHERE alert_type = 'profit_warning'
        AND alert_message LIKE '可疑操作：用户在凌晨时段%'
        AND is_resolved = false
        AND created_at > now() - interval '6 hours'
    ) THEN
      INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message)
      VALUES (NULL, 'profit_warning', 'warning', alert_msg);
    END IF;
  END LOOP;

  -- 3. Rapid successive changes: >50 modifications in 10 minutes
  FOR rapid_changes IN
    SELECT user_id, COUNT(*) as change_count
    FROM public.audit_logs
    WHERE created_at > now() - interval '10 minutes'
    GROUP BY user_id
    HAVING COUNT(*) > 50
  LOOP
    alert_msg := '可疑操作：用户在10分钟内进行了 ' || rapid_changes.change_count || ' 次数据修改';
    
    IF NOT EXISTS (
      SELECT 1 FROM public.project_alerts 
      WHERE alert_type = 'profit_warning'
        AND alert_message LIKE '可疑操作：用户在10分钟内%'
        AND is_resolved = false
        AND created_at > now() - interval '30 minutes'
    ) THEN
      INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message)
      VALUES (NULL, 'profit_warning', 'danger', alert_msg);
    END IF;
  END LOOP;

  -- 4. Failed login spike detection: >20 failed logins from same IP in 15 min
  FOR bulk_delete IN
    SELECT ip_address, COUNT(*) as fail_count
    FROM public.login_attempts
    WHERE attempted_at > now() - interval '15 minutes'
      AND success = false
    GROUP BY ip_address
    HAVING COUNT(*) > 20
  LOOP
    alert_msg := '可疑活动：IP ' || bulk_delete.ip_address || ' 在15分钟内 ' || bulk_delete.fail_count || ' 次登录失败（疑似暴力破解）';
    
    IF NOT EXISTS (
      SELECT 1 FROM public.project_alerts 
      WHERE alert_message LIKE '%' || bulk_delete.ip_address || '%暴力破解%'
        AND is_resolved = false
        AND created_at > now() - interval '1 hour'
    ) THEN
      INSERT INTO public.project_alerts (project_id, alert_type, alert_level, alert_message)
      VALUES (NULL, 'profit_warning', 'danger', alert_msg);
    END IF;
  END LOOP;
END;
$$;
