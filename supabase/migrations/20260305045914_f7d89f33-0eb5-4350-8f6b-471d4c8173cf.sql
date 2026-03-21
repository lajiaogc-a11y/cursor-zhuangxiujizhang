-- Allow authenticated users to insert their own non-company products
CREATE POLICY "Users can insert own products"
ON public.q_products
FOR INSERT
TO authenticated
WITH CHECK (
  is_company_product = false AND created_by = auth.uid()
);

-- Allow users to update their own non-company products
CREATE POLICY "Users can update own products"
ON public.q_products
FOR UPDATE
TO authenticated
USING (
  is_company_product = false AND created_by = auth.uid()
)
WITH CHECK (
  is_company_product = false AND created_by = auth.uid()
);

-- Allow users to delete (soft-delete) their own non-company products
CREATE POLICY "Users can delete own products"
ON public.q_products
FOR DELETE
TO authenticated
USING (
  is_company_product = false AND created_by = auth.uid()
);