
-- Add foreign keys for q_inventory and q_inventory_transactions
ALTER TABLE q_inventory ADD CONSTRAINT q_inventory_material_id_fkey FOREIGN KEY (material_id) REFERENCES q_materials(id);
ALTER TABLE q_inventory_transactions ADD CONSTRAINT q_inventory_transactions_material_id_fkey FOREIGN KEY (material_id) REFERENCES q_materials(id);
