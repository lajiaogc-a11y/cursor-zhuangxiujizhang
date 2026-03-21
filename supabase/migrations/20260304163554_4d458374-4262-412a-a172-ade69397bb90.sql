DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'q_measurement_units_code_key'
  ) THEN
    ALTER TABLE q_measurement_units ADD CONSTRAINT q_measurement_units_code_key UNIQUE (code);
  END IF;
END $$;

INSERT INTO q_measurement_units (code, name_zh, name_en, sort_order, is_system) VALUES
('unit', '套', 'Unit', 1, true),
('pcs', '个', 'Pcs', 2, true),
('set', '组', 'Set', 3, true),
('ft', '尺', 'Ft', 4, true),
('m', '米', 'M', 5, true),
('sqft', '平方尺', 'Sq.ft', 6, true),
('m2', '平方米', 'Sq.m', 7, true),
('cbm', '立方米', 'Cu.m', 8, true),
('item', '项', 'Item', 9, true),
('room', '间', 'Room', 10, true),
('lot', '批', 'Lot', 11, true),
('roll', '卷', 'Roll', 12, true),
('sheet', '张/片', 'Sheet', 13, true),
('bag', '袋/包', 'Bag', 14, true),
('box', '箱', 'Box', 15, true),
('kg', '公斤', 'Kg', 16, true),
('ton', '吨', 'Ton', 17, true),
('l', '升', 'L', 18, true),
('gal', '加仑', 'Gallon', 19, true),
('pair', '对/副', 'Pair', 20, true),
('door', '扇', 'Door', 21, true),
('panel', '块/面', 'Panel', 22, true),
('point', '个点位', 'Point', 23, true),
('day', '天/工日', 'Day', 24, true),
('hour', '小时', 'Hour', 25, true)
ON CONFLICT (code) DO NOTHING;