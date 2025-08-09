import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';

const AdminSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      setLoading(true);
      const { data: { user: sessionUser } } = await supabase.auth.getUser();

      if (!sessionUser) {
        toast({ title: "Error", description: "No se pudo obtener la información del usuario. Por favor, inicia sesión de nuevo.", variant: "destructive" });
        navigate('/');
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', sessionUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        toast({ title: "Error", description: "No se pudo obtener el perfil del usuario.", variant: "destructive" });
        navigate('/app');
        setLoading(false);
        return;
      }

      if (profileData?.role !== 'Administrator') {
        toast({ title: "Acceso Denegado", description: "No tienes permisos para acceder a esta página.", variant: "destructive" });
        navigate('/app');
      } else {
        setUserRole(profileData.role);
      }
      setLoading(false);
    };

    checkUserRole();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/');
      } else {
        checkUserRole();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Cargando configuración...</p>
      </div>
    );
  }

  if (userRole !== 'Administrator') {
    return null; // Should redirect by now, but as a fallback
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <Card className="w-full max-w-md mx-auto mt-8 shadow-lg relative">
        <CardHeader>
          <CardTitle className="text-center">Configuración de Administrador</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
            className="absolute top-2 right-2 h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Volver</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full text-lg py-6 h-auto"
            onClick={() => navigate('/admin/freezers')}
          >
            CONGELADORES
          </Button>
          <Button
            className="w-full text-lg py-6 h-auto"
            onClick={() => navigate('/admin/profiles')}
          >
            PERFILES
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettingsPage;