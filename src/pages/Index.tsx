import React, { useState, useEffect, useCallback } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
// import { useToast } from "@/components/ui/use-toast"; // Eliminado
import AppHeader from "@/components/AppHeader";
import InventoryPage from "./InventoryPage";

interface UserProfile {
  role: string | null;
  current_freezer_id: string | null;
}

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentFreezerId, setCurrentFreezerId] = useState<string | null>(null);
  const [currentFreezerName, setCurrentFreezerName] = useState<string | null>(null);
  const [userProfileState, setUserProfileState] = useState<UserProfile | null>(null);
  const navigate = useNavigate();
  // const { toast } = useToast(); // Eliminado

  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, current_freezer_id, default_freezer_id')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Error de perfil:", profileError);
      return { role: null, freezerId: null, defaultFreezerId: null };
    } else if (profileData) {
      return { role: profileData.role, freezerId: profileData.current_freezer_id, defaultFreezerId: profileData.default_freezer_id };
    }
    return { role: null, freezerId: null, defaultFreezerId: null };
  }, []); // Dependencias actualizadas

  const fetchFreezerName = useCallback(async (freezerId: string | null) => {
    if (!freezerId) return null;
    const { data, error } = await supabase
      .from('freezers')
      .select('name')
      .eq('id', freezerId)
      .single();

    if (error) {
      console.error("Error al obtener nombre del congelador:", error);
      return null;
    }
    return data?.name || null;
  }, []);

  const checkUserAndRole = useCallback(async () => {
    setLoading(true);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error de sesión:", sessionError);
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

    // Set the userProfileState here to pass to InventoryPage
    setUserProfileState({ role, current_freezer_id: freezerId });

    setLoading(false);
  }, [navigate, fetchUserProfile, fetchFreezerName]); // Dependencias actualizadas

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

  // If user is Veterinary, show the InventoryPage directly
  if (userRole === 'Veterinary') {
    return (
      <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
        <AppHeader
          userEmail={user?.email}
          userRole={userRole}
          currentFreezerName={currentFreezerName}
        />
        {userProfileState && ( // Ensure userProfileState is available before rendering InventoryPage
          <InventoryPage hideHeader={false} initialUserProfile={userProfileState} /> {/* Changed hideHeader to false */}
        )}
        <MadeWithDyad />
      </div>
    );
  }

  // For 'User' and 'Administrator', render existing buttons
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <AppHeader
        userEmail={user?.email}
        userRole={userRole}
        currentFreezerName={currentFreezerName}
      />

      <div className="w-full max-w-md mb-8 space-y-4">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white text-lg py-6 h-auto w-full"
          onClick={() => navigate('/add-item')}
        >
          AÑADIR
        </Button>
        <Button
          className="bg-red-600 hover:bg-red-700 text-white text-lg py-6 h-auto w-full"
          onClick={() => navigate('/remove-item')}
        >
          RETIRAR
        </Button>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-12"
            onClick={() => navigate('/inventory')}
          >
            Inventario
          </Button>
          {(userRole === 'User' || userRole === 'Administrator') && (
            <Button variant="outline" className="h-12" onClick={() => navigate('/change-freezer')}>
              Cambiar Congelador
            </Button>
          )}
        </div>
      </div>

      <MadeWithDyad />
    </div>
  );
};

export default Index;