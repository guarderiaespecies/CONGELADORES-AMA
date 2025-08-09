import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Profile {
  id: string;
  username: string;
  role: string;
  default_freezer_id: string | null;
  current_freezer_id: string | null;
  default_freezer_name?: string; // To store the joined name
  current_freezer_name?: string; // To store the joined name
}

const ProfilesPage: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        role,
        default_freezer_id,
        current_freezer_id,
        default_freezer:freezers!profiles_default_freezer_id_fkey ( name ),
        current_freezer:freezers!profiles_current_freezer_id_fkey ( name )
      `)
      .order('username', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: `No se pudieron cargar los perfiles: ${error.message}`,
        variant: "destructive",
      });
      setProfiles([]);
    } else {
      const profilesWithFreezerNames = data.map(profile => ({
        ...profile,
        default_freezer_name: profile.default_freezer?.name || '-',
        current_freezer_name: profile.current_freezer?.name || '-',
      }));
      setProfiles(profilesWithFreezerNames as Profile[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    const checkUserAndLoadData = async () => {
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
        fetchProfiles();
      }
    };

    checkUserAndLoadData();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/');
      } else {
        checkUserAndLoadData();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, toast, fetchProfiles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Skeleton className="h-[200px] w-full max-w-md rounded-xl" />
        <div className="space-y-2 mt-4 w-full max-w-md">
          <Skeleton className="h-4 w-[300px]" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[280px]" />
        </div>
      </div>
    );
  }

  if (userRole !== 'Administrator') {
    return null; // Should redirect by now, but as a fallback
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <Card className="w-full max-w-4xl mx-auto mt-8 shadow-lg relative">
        <CardHeader>
          <CardTitle className="text-center">Gestión de Perfiles</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin-settings')}
            className="absolute top-2 right-2 h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Volver a Configuración</span>
          </Button>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p className="text-center text-gray-500 p-4">No hay perfiles registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Congelador por Defecto</TableHead>
                    <TableHead>Congelador Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>{profile.username}</TableCell>
                      <TableCell>{profile.role}</TableCell>
                      <TableCell>{profile.default_freezer_name}</TableCell>
                      <TableCell>{profile.current_freezer_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilesPage;