-- Opcional: Eliminar tablas existentes para un inicio limpio (¡CUIDADO: esto borrará todos los datos!)
-- Solo descomenta estas líneas si quieres empezar completamente de cero y no te importa perder datos.
-- DROP TABLE IF EXISTS public.audit_log CASCADE;
-- DROP TABLE IF EXISTS public.inventory CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.freezers CASCADE;

-- 1. Crear todas las tablas con el esquema ajustado

-- Tabla: public.freezers (simplificada a solo id y name)
CREATE TABLE IF NOT EXISTS public.freezers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

-- Tabla: public.profiles (con current_freezer_id)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'User', -- Puede ser 'User', 'Administrator', 'Veterinary'
  default_freezer_id UUID REFERENCES public.freezers(id),
  current_freezer_id UUID REFERENCES public.freezers(id), -- Nueva columna para el congelador asociado actual
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla: public.inventory (se mantiene como estaba, ya tiene freezer_id y created_by_user_id)
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freezer_id UUID NOT NULL REFERENCES public.freezers(id),
  entry_date DATE NOT NULL,
  seal_no TEXT,
  species TEXT NOT NULL,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  status_solicitado BOOLEAN DEFAULT FALSE,
  status_desfasado BOOLEAN DEFAULT FALSE
);

-- Tabla: public.audit_log (se mantiene como estaba)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Activar RLS para todas las tablas (si no está activado)

ALTER TABLE public.freezers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Crear la función para nuevos usuarios y su trigger

-- Función para crear un perfil automáticamente cuando un nuevo usuario se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.email); -- O NEW.raw_user_meta_data->>'username' si lo pasas en el registro
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- Eliminar el trigger si ya existe antes de crearlo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- Trigger para ejecutar la función handle_new_user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Crear la función SQL para obtener el rol del usuario (versión segura)

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- ¡Esta es la línea clave para la seguridad!
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$;

-- Concede permisos de ejecución a los usuarios autenticados
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- 5. Definir todas las políticas de RLS (eliminando y recreando para idempotencia)

-- Políticas de RLS para freezers
-- Administradores pueden gestionar los congeladores (INSERT, UPDATE, DELETE, SELECT)
DROP POLICY IF EXISTS "Administrators can manage freezers" ON public.freezers;
CREATE POLICY "Administrators can manage freezers" ON public.freezers FOR ALL USING (public.get_user_role() = 'Administrator');

-- Todos los usuarios autenticados pueden leer los congeladores (para ver la lista)
DROP POLICY IF EXISTS "Authenticated users can read freezers" ON public.freezers;
CREATE POLICY "Authenticated users can read freezers" ON public.freezers FOR SELECT TO authenticated USING (TRUE);

-- Políticas de RLS para profiles
-- Usuarios y veterinarios pueden leer su propio perfil
DROP POLICY IF EXISTS "Users and vets can read their own profile" ON public.profiles;
CREATE POLICY "Users and vets can read their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Administradores pueden gestionar todos los perfiles
DROP POLICY IF EXISTS "Administrators can manage all profiles" ON public.profiles;
CREATE POLICY "Administrators can manage all profiles" ON public.profiles FOR ALL USING (public.get_user_role() = 'Administrator');

-- ¡NUEVA POLÍTICA CRÍTICA! Permite a usuarios actualizar su propio perfil
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id AND public.get_user_role() = 'User');

-- Políticas de RLS para inventory
-- Administradores tienen acceso total
DROP POLICY IF EXISTS "Administrators can manage all inventory" ON public.inventory;
CREATE POLICY "Administrators can manage all inventory" ON public.inventory FOR ALL USING (public.get_user_role() = 'Administrator');

-- Veterinarios pueden leer todo el inventario
DROP POLICY IF EXISTS "Veterinarians can read all inventory" ON public.inventory;
CREATE POLICY "Veterinarians can read all inventory" ON public.inventory FOR SELECT USING (public.get_user_role() = 'Veterinary');

-- Veterinarios pueden actualizar status_solicitado y status_desfasado en cualquier registro
-- Nota: Esta política permite la actualización de CUALQUIER columna por veterinarios.
-- Para restringir solo a 'status_solicitado' y 'status_desfasado', se necesitaría un trigger
-- o una lógica de aplicación más estricta. Para RLS, es difícil restringir columnas específicas.
DROP POLICY IF EXISTS "Veterinarians can update status fields" ON public.inventory;
CREATE POLICY "Veterinarians can update status fields" ON public.inventory FOR UPDATE USING (public.get_user_role() = 'Veterinary');

-- Usuarios pueden leer solo los ítems de inventario de su congelador actual
DROP POLICY IF EXISTS "Users can read inventory from their current freezer" ON public.inventory;
CREATE POLICY "Users can read inventory from their current freezer" ON public.inventory FOR SELECT USING (
  public.get_user_role() = 'User' AND
  freezer_id = (SELECT current_freezer_id FROM public.profiles WHERE id = auth.uid())
);

-- Usuarios pueden insertar sus propios ítems en su congelador actual
DROP POLICY IF EXISTS "Users can insert their own inventory items in current freezer" ON public.inventory;
CREATE POLICY "Users can insert their own inventory items in current freezer" ON public.inventory FOR INSERT WITH CHECK (
  auth.uid() = created_by_user_id AND
  freezer_id = (SELECT current_freezer_id FROM public.profiles WHERE id = auth.uid())
);

-- Usuarios pueden actualizar sus propios ítems en su congelador actual
-- NOTA: La restricción de no modificar 'status_solicitado' y 'status_desfasado'
-- se implementará con un trigger si es necesario, ya que la sintaxis RLS
-- con NEW/OLD en WITH CHECK puede causar problemas en algunas versiones.
DROP POLICY IF EXISTS "Users can update their own inventory items in current freezer" ON public.inventory;
CREATE POLICY "Users can update their own inventory items in current freezer" ON public.inventory FOR UPDATE
  USING (
    auth.uid() = created_by_user_id AND
    freezer_id = (SELECT current_freezer_id FROM public.profiles WHERE id = auth.uid())
  );

-- Usuarios pueden eliminar sus propios ítems en su congelador actual
DROP POLICY IF EXISTS "Users can delete their own inventory items in current freezer" ON public.inventory;
CREATE POLICY "Users can delete their own inventory items in current freezer" ON public.inventory FOR DELETE USING (
  auth.uid() = created_by_user_id AND
  freezer_id = (SELECT current_freezer_id FROM public.profiles WHERE id = auth.uid())
);

-- Políticas de RLS para audit_log
-- Administradores pueden leer el log de auditoría
DROP POLICY IF EXISTS "Administrators can read audit log" ON public.audit_log;
CREATE POLICY "Administrators can read audit log" ON public.audit_log FOR SELECT USING (public.get_user_role() = 'Administrator');

-- Administradores y usuarios pueden insertar entradas en el log de auditoría
DROP POLICY IF EXISTS "Admins and users can insert audit log entries" ON public.audit_log;
CREATE POLICY "Admins and users can insert audit log entries" ON public.audit_log FOR INSERT WITH CHECK (public.get_user_role() IN ('Administrator', 'User'));

-- Nadie puede actualizar o eliminar entradas del log de auditoría (deben ser inmutables)
DROP POLICY IF EXISTS "No one can update audit log" ON public.audit_log;
CREATE POLICY "No one can update audit log" ON public.audit_log FOR UPDATE USING (FALSE);

DROP POLICY IF EXISTS "No one can delete audit log" ON public.audit_log;
CREATE POLICY "No one can delete audit log" ON public.audit_log FOR DELETE USING (FALSE);

-- ¡Añadir la clave foránea aquí, después de que ambas tablas estén creadas!
ALTER TABLE public.inventory
ADD CONSTRAINT fk_created_by_user
FOREIGN KEY (created_by_user_id)
REFERENCES public.profiles(id);