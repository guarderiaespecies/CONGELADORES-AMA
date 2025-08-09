-- Políticas de RLS para inventory
-- Administradores tienen acceso total
DROP POLICY IF EXISTS "Administrators can manage all inventory" ON public.inventory;
CREATE POLICY "Administrators can manage all inventory" ON public.inventory FOR ALL USING (public.get_user_role() = 'Administrator');

-- Veterinarios pueden leer todo el inventario
DROP POLICY IF EXISTS "Veterinarians can read all inventory" ON public.inventory;
CREATE POLICY "Veterinarians can read all inventory" ON public.inventory FOR SELECT USING (public.get_user_role() = 'Veterinary'); -- Corregido: 'Veterinario' a 'Veterinary'

-- Veterinarios pueden actualizar status_solicitado y status_desfasado en cualquier registro
DROP POLICY IF EXISTS "Veterinarians can update status fields" ON public.inventory;
CREATE POLICY "Veterinarians can update status fields" ON public.inventory FOR UPDATE USING (public.get_user_role() = 'Veterinary'); -- Corregido: 'Veterinario' a 'Veterinary'

-- Usuarios pueden leer solo los ítems de inventario de su congelador actual
DROP POLICY IF EXISTS "Users can read inventory from their current freezer" ON public.inventory;
CREATE POLICY "Users can read inventory from their current freezer" ON public.inventory FOR SELECT USING (
  public.get_user_role() = 'User' AND
  freezer_id = (SELECT current_freeizer_id FROM public.profiles WHERE id = auth.uid())
);

-- Usuarios pueden insertar sus propios ítems en su congelador actual
DROP POLICY IF EXISTS "Users can insert their own inventory items in current freezer" ON public.inventory;
CREATE POLICY "Users can insert their own inventory items in current freezer" ON public.inventory FOR INSERT WITH CHECK (
  auth.uid() = created_by_user_id AND
  freezer_id = (SELECT current_freezer_id FROM public.profiles WHERE id = auth.uid())
);

-- Usuarios pueden actualizar sus propios ítems en su congelador actual
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