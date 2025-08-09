import React, { useState, useEffect, useCallback } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import AppHeader from "@/components/AppHeader";

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
      return null;
    }
    return data?.name || null;
  }, []);

  const checkUserAndRole = useCallback(async () => {
    setLoading(true);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
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
    const { role, freezerId } = await fetchUserProfile(session.user.id);
    setUserRole(role);
    setCurrentFreezerId(freezerId);

    const name = await fetchFreezerName(freezerId);
    setCurrentFreezerName(name);

    setLoading(false);
  }, [navigate, toast, fetchUserProfile, fetchFreezerName]);

  useEffect(() => {
    checkUserAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/');
      } else {
        setUser(session.user);
        checkUserAndRole();
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

  const showActionButtons = userRole === 'User' || userRole === 'Administrator';

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <AppHeader
        userEmail={user?.email}
        userRole={userRole}
        currentFreezerName={currentFreezerName}
      />

      {/* Botones de Acción - Condicionalmente mostrados */}
      {showActionButtons && (
        <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
          <Button
            variant="outline"
            className="h-12"
            onClick={() => navigate('/edit-item')}
          >
            Modificar
          </Button>
          {(userRole === 'User' || userRole === 'Administrator') && (
            <Button variant="outline" className="h-12" onClick={() => navigate('/change-freezer')}>
              Cambiar Congelador
            </Button>
          )}
          <Button variant="outline" className="col-span-2 h-12" onClick={() => navigate('/inventory')}>
            Inventario
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white text-lg py-6 h-auto"
            onClick={() => navigate('/add-item')}
          >
            AÑADIR
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white text-lg py-6 h-auto"
            onClick={() => navigate('/remove-item')}
          >
            RETIRAR
          </Button>
        </div>
      )}

      <MadeWithDyad />
    </div>
  );
};

export default Index;