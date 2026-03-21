-- Add new fields to salary_payments table for the payroll refactor
ALTER TABLE salary_payments 
  ADD COLUMN IF NOT EXISTS leave_days NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS work_days NUMERIC DEFAULT 22,
  ADD COLUMN IF NOT EXISTS penalty NUMERIC DEFAULT 0;