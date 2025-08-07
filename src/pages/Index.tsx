import React, { useState, useEffect, useCallback } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import AppHeader from "@/components/AppHeader"; // Import the new AppHeader component

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentFreezerId, setCurrentFreezerId] = useState<string | null>(null);
  const [currentFreezerName, setCurrentFreezerName] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, current_freezer_id, default_freezer_id')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Error al obtener el perfil del usuario:", profileError);
      toast({ title: "Error de perfil", description: profileError.message, variant: "destructive" });
      return { role: null, freezerId: null, defaultFreezerId: null };
    } else if (profileData) {
      return { role: profileData.role, freezerId: profileData.current_freezer_id, defaultFreezerId: profileData.default_freezer_id };
    }
    return { role: null, freezerId: null, defaultFreezerId: null };
  }, [toast]);

  const fetchFreezerName = useCallback(async (freezerId: string | null) => {
    if (!freezerId) return null;
    const { data, error } = await supabase
      .from('freezers')
      .select('name')
      .eq('id', freezerId)
      .single();

    if (error) {
      console.error("Error fetching freezer name:", error);
      return null;
    }
    return data?.name || null;
  }, []);

  const checkUserAndRole = useCallback(async (event?: string) => { // Añadimos el parámetro 'event'
    setLoading(true);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error getting session:", sessionError);
      toast({ title: "Error de sesión", description: sessionError.message, variant: "destructive" });
      navigate('/');
      setLoading(false);
      return;
    }

    if (!session) {
      navigate('/');
      setLoading(false);
      return;
    }

    setUser(session.user);
    const { role, freezerId, defaultFreezerId } = await fetchUserProfile(session.user.id);
    setUserRole(role);

    let effectiveFreezerId = freezerId; // El congelador actual del perfil es el punto de partida

    // Lógica para restablecer al congelador por defecto solo en el inicio de sesión
    if (role === 'User' && defaultFreezerId) {
      // Si es un inicio de sesión (evento 'SIGNED_IN') O si el usuario no tiene un congelador actual asignado
      if (event === 'SIGNED_IN' || !freezerId) {
        if (freezerId !== defaultFreezerId) { // Solo actualiza si es diferente para evitar escrituras innecesarias
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ current_freezer_id: defaultFreezerId })
            .eq('id', session.user.id);

          if (updateError) {
            console.error("Error al asignar default_freezer_id:", updateError);
            toast({ title: "Error", description: "No se pudo asignar el congelador por defecto.", variant: "destructive" });
          } else {
            effectiveFreezerId = defaultFreezerId; // Usa el congelador por defecto
            toast({ title: "Congelador asignado", description: "Se ha asignado tu congelador por defecto.", duration: 3000 });
          }
        }
      }
    }
    // Si no es un 'User', no tiene default, o si el usuario ya cambió su congelador en esta sesión,
    // effectiveFreezerId mantendrá el valor que se obtuvo de la base de datos (freezerId),
    // a menos que se haya restablecido al default en el bloque anterior.

    setCurrentFreezerId(effectiveFreezerId);

    const name = await fetchFreezerName(effectiveFreezerId);
    setCurrentFreezerName(name);

    setLoading(false);
  }, [navigate, toast, fetchUserProfile, fetchFreezerName]);

  useEffect(() => {
    // Llamada inicial al montar el componente
    checkUserAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/');
      } else {
        setUser(session.user);
        // Pasamos el tipo de evento a checkUserAndRole
        checkUserAndRole(event);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, checkUserAndRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Cargando...</p>
      </div>
    );
  }

  console.log("Index Page - userRole:", userRole, "currentFreezerName:", currentFreezerName, "currentFreezerId:", currentFreezerId); // Log de depuración

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <AppHeader
        userEmail={user?.email}
        userRole={userRole}
        currentFreezerName={currentFreezerName}
      />

      {/* Botones de Acción */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
        <Button variant="outline" className="h-12">Deshacer</Button>
        {(userRole === 'User' || userRole === 'Administrator') && (
          <Button variant="outline" className="h-12" onClick={() => navigate('/change-freezer')}>
            Cambiar Congelador
          </Button>
        )}
        <Button variant="outline" className="col-span-2 h-12">Ver Inventario</Button>
        <Button className="bg-green-600 hover:bg-green-700 text-white text-lg py-6 h-auto">Añadir Elementos</Button>
        <Button className="bg-red-600 hover:bg-red-700 text-white text-lg py-6 h-auto">Retirar Elementos</Button>
      </div>

      <MadeWithDyad />
    </div>
  );
};

export default Index;