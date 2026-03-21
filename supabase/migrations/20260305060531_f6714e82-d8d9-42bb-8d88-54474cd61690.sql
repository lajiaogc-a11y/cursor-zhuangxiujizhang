ALTER TABLE q_purchase_order_items
  ADD CONSTRAINT q_purchase_order_items_material_id_fkey
    FOREIGN KEY (material_id) REFERENCES q_materials(id);