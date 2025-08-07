import React, { useState, useEffect } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUserAndRole = async () => {
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

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error al obtener el perfil del usuario:", profileError);
          toast({ title: "Error de perfil", description: profileError.message, variant: "destructive" });
        } else if (profileData) {
          setUserRole(profileData.role);
        }
      } catch (err: any) {
        console.error("Error inesperado al obtener el perfil:", err);
        toast({ title: "Error inesperado", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

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
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      {/* Tarjeta de Encabezado */}
      <Card className="w-full max-w-md mx-auto mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">CONGELADORES A.M.A</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg font-semibold text-gray-800">{user?.email}</p>
          {userRole && (userRole === 'Administrador' || userRole === 'Veterinario') && (
            <p className="text-md text-gray-600">Rol: <span className="font-medium">{userRole}</span></p>
          )}
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
        <Button variant="outline" className="h-12">Deshacer</Button>
        <Button variant="outline" className="h-12">Cambiar Asociación</Button>
        <Button variant="outline" className="col-span-2 h-12">Ver Inventario</Button>
        <Button className="bg-green-600 hover:bg-green-700 text-white text-lg py-6 h-auto">Añadir Elementos</Button>
        <Button className="bg-red-600 hover:bg-red-700 text-white text-lg py-6 h-auto">Retirar Elementos</Button>
      </div>

      <MadeWithDyad />
    </div>
  );
};

export default Index;