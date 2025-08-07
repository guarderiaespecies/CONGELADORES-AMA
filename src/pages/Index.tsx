import React, { useState, useEffect } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import SupabaseDataFetcher from "@/components/SupabaseDataFetcher";
import AddItemForm from "@/components/AddItemForm";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { supabase } from '@/lib/supabase'; // Import supabase client
import { useToast } from "@/components/ui/use-toast"; // Import useToast

const Index = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null); // State to hold user info
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        toast({ title: "Error de sesión", description: error.message, variant: "destructive" });
        navigate('/'); // Redirect to auth if error
        return;
      }
      if (!session) {
        navigate('/'); // Redirect to auth if no session
      } else {
        setUser(session.user);
      }
      setLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/'); // Redirect to auth if user logs out
      } else {
        setUser(session.user);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleNewItemAdded = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Error al cerrar sesión", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sesión cerrada", description: "Has cerrado sesión correctamente." });
      navigate('/'); // Redirect to auth page after logout
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Cargando...</p>
      </div>
    );
  }

  // Only render content if user is authenticated
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Bienvenido a tu App, {user?.email}!</h1>
        <p className="text-xl text-gray-600">
          Aquí puedes gestionar tus ítems.
        </p>
        <div className="mt-4">
          <Button onClick={handleLogout} disabled={loading}>
            Cerrar Sesión
          </Button>
        </div>
      </div>
      
      <AddItemForm onNewItemAdded={handleNewItemAdded} />

      <SupabaseDataFetcher key={refreshKey} />

      <MadeWithDyad />
    </div>
  );
};

export default Index;