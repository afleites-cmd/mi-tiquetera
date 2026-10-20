-- Sedes
INSERT INTO "Location" ("id","name") VALUES
  (gen_random_uuid()::text, 'Sede Central'),
  (gen_random_uuid()::text, 'Sucursal Norte'),
  (gen_random_uuid()::text, 'Sucursal Sur');

-- Usuarios de prueba (contraseña: 1234)
INSERT INTO "User" ("id","email","name","passwordHash","role","permissions") VALUES
  (gen_random_uuid()::text, 'solicitante@demo.com',   'Solicitante',    '$2b$10$h9V2ugDWz/V3.6hl.WbDjeqdZb8IvxmeEBnVK2oByXPplxj4kzrSe', 'SOLICITANTE', ARRAY['CREAR_TICKETS']::"Permission"[]),
  (gen_random_uuid()::text, 'mantenimiento@demo.com', 'Mantenimiento', '$2b$10$h9V2ugDWz/V3.6hl.WbDjeqdZb8IvxmeEBnVK2oByXPplxj4kzrSe', 'MANTENIMIENTO', ARRAY['CREAR_TICKETS','CARGAR_PRESUPUESTOS','CARGAR_FACTURAS','CAMBIAR_URGENCIA','VER_TODOS_LOS_TICKETS']::"Permission"[]),
  (gen_random_uuid()::text, 'gerente@demo.com',       'Gerente',     '$2b$10$h9V2ugDWz/V3.6hl.WbDjeqdZb8IvxmeEBnVK2oByXPplxj4kzrSe', 'GERENTE', ARRAY['CREAR_TICKETS','CARGAR_PRESUPUESTOS','APROBAR_PRESUPUESTOS','CARGAR_FACTURAS','REGISTRAR_PAGOS','VER_TESORERIA','CAMBIAR_URGENCIA','VER_TODOS_LOS_TICKETS','ADMINISTRAR_USUARIOS']::"Permission"[]),
  (gen_random_uuid()::text, 'tesoreria@demo.com',     'Tesorería',      '$2b$10$h9V2ugDWz/V3.6hl.WbDjeqdZb8IvxmeEBnVK2oByXPplxj4kzrSe', 'TESORERIA', ARRAY['CREAR_TICKETS','REGISTRAR_PAGOS','VER_TESORERIA','VER_TODOS_LOS_TICKETS']::"Permission"[]);
