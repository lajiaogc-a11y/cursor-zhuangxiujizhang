-- 初始化公司账户数据
INSERT INTO company_accounts (currency, account_type, balance) VALUES
  ('MYR', 'cash', 0),
  ('MYR', 'bank', 0),
  ('CNY', 'cash', 0),
  ('CNY', 'bank', 0),
  ('USD', 'cash', 0),
  ('USD', 'bank', 0)
ON CONFLICT DO NOTHING;