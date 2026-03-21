
-- Super admin ALL policies for seed data tables
-- company_accounts
CREATE POLICY "Super admins can manage all company_accounts"
ON public.company_accounts
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- transaction_categories
CREATE POLICY "Super admins can manage all transaction_categories"
ON public.transaction_categories
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- project_categories
CREATE POLICY "Super admins can manage all project_categories"
ON public.project_categories
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
