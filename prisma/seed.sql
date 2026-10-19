-- Sedes
INSERT INTO "Location" ("id","name") VALUES
  (gen_random_uuid()::text, 'Sede Central'),
  (gen_random_uuid()::text, 'Sucursal Norte'),
  (gen_random_uuid()::text, 'Sucursal Sur');

-- Usuarios de prueba (contraseña: 1234)
INSERT INTO "User" ("id","email","name","passwordHash","role") VALUES
  (gen_random_uuid()::text, 'solicitante@demo.com',   'Sofía Solicitante',    '$2b$10$h9V2ugDWz/V3.6hl.WbDjeqdZb8IvxmeEBnVK2oByXPplxj4kzrSe', 'SOLICITANTE'),
  (gen_random_uuid()::text, 'mantenimiento@demo.com', 'Martín Mantenimiento', '$2b$10$h9V2ugDWz/V3.6hl.WbDjeqdZb8IvxmeEBnVK2oByXPplxj4kzrSe', 'MANTENIMIENTO'),
  (gen_random_uuid()::text, 'gerente@demo.com',       'Gabriela Gerente',     '$2b$10$h9V2ugDWz/V3.6hl.WbDjeqdZb8IvxmeEBnVK2oByXPplxj4kzrSe', 'GERENTE'),
  (gen_random_uuid()::text, 'tesoreria@demo.com',     'Tomás Tesorería',      '$2b$10$h9V2ugDWz/V3.6hl.WbDjeqdZb8IvxmeEBnVK2oByXPplxj4kzrSe', 'TESORERIA');
