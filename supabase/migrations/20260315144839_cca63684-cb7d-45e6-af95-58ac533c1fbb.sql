UPDATE exchange_transactions
SET profit_loss = CASE
  WHEN out_currency = 'MYR' AND in_currency != 'MYR' AND exchange_rate > 0 THEN
    ROUND((in_amount / exchange_rate - out_amount)::numeric, 2)
  WHEN out_currency != 'MYR' AND in_currency = 'MYR' AND exchange_rate > 0 THEN
    ROUND((in_amount - out_amount * exchange_rate)::numeric, 2)
  ELSE profit_loss
END;