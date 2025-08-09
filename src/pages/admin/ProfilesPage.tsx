import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { useToast } from "@/components/ui/use-toast"; // Eliminado
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  username: string;
  role: string;
  default_freezer_id: string | null;
  current_freezer_id: string | null;
  default_freezer_name?: string; // To store the joined name
  current_freezer_name?: string; // To store the joined name
}

interface Freezer {
  id: string;
  name: string;
}

const ProfilesPage: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [freezers, setFreezers] = useState<Freezer[]>([]); // To populate freezer dropdowns
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // const { toast } = useToast(); // Eliminado
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
      console.error(`No se pudieron cargar los perfiles: ${error.message}`, error);
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
  }, []); // Dependencias actualizadas

  const fetchFreezers = useCallback(async () => {
    const { data, error } = await supabase
      .from('freezers')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error(`No se pudieron cargar los congeladores para los selectores: ${error.message}`, error);
      setFreezers([]);
    } else {
      setFreezers(data || []);
    }
  }, []); // Dependencias actualizadas

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      setLoading(true);
      const { data: { user: sessionUser } } = await supabase.auth.getUser();

      if (!sessionUser) {
        console.error("Error: No se pudo obtener la información del usuario. Por favor, inicia sesión de nuevo.");
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
        console.error("Error: No se pudo obtener el perfil del usuario.", profileError);
        navigate('/app');
        setLoading(false);
        return;
      }

      if (profileData?.role !== 'Administrator') {
        console.error("Acceso Denegado: No tienes permisos para acceder a esta página.");
        navigate('/app');
      } else {
        setUserRole(profileData.role);
        await fetchFreezers(); // Fetch freezers first
        await fetchProfiles(); // Then fetch profiles
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
  }, [navigate, fetchProfiles, fetchFreezers]); // Dependencias actualizadas

  const handleEditProfile = async () => {
    if (!editingProfile || !editingProfile.username.trim() || !editingProfile.role.trim()) {
      console.warn("Advertencia: Usuario y Rol no pueden estar vacíos.");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        username: editingProfile.username.trim(),
        role: editingProfile.role.trim(),
        default_freezer_id: editingProfile.default_freezer_id,
        current_freezer_id: editingProfile.current_freezer_id,
      })
      .eq('id', editingProfile.id);

    if (error) {
      console.error(`Error al actualizar perfil: ${error.message}`, error);
    } else {
      console.log("Éxito: Perfil actualizado correctamente.");
      setEditingProfile(null);
      setIsEditDialogOpen(false);
      fetchProfiles();
    }
    setLoading(false);
  };

  const handleDeleteProfile = async (id: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error al eliminar perfil: ${error.message}`, error);
    } else {
      console.log("Éxito: Perfil eliminado correctamente.");
      fetchProfiles();
    }
    setLoading(false);
  };

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
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>{profile.username}</TableCell>
                      <TableCell>{profile.role}</TableCell>
                      <TableCell>{profile.default_freezer_name}</TableCell>
                      <TableCell>{profile.current_freezer_name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingProfile(profile);
                            setIsEditDialogOpen(true);
                          }}
                          className="mr-2"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-red-500" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente el perfil de
                                <span className="font-bold"> {profile.username}</span>.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProfile(profile.id)} disabled={loading}>
                                {loading ? 'Eliminando...' : 'Eliminar'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Edit Profile Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Perfil</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    Usuario
                  </Label>
                  <Input
                    id="username"
                    value={editingProfile?.username || ''}
                    onChange={(e) => setEditingProfile(prev => prev ? { ...prev, username: e.target.value } : null)}
                    className="col-span-3"
                    placeholder="Nombre de usuario"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Rol
                  </Label>
                  <Select
                    value={editingProfile?.role || ''}
                    onValueChange={(value) => setEditingProfile(prev => prev ? { ...prev, role: value } : null)}
                  >
                    <SelectTrigger id="role" className="col-span-3">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="User">User</SelectItem>
                      <SelectItem value="Administrator">Administrator</SelectItem>
                      <SelectItem value="Veterinary">Veterinary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="defaultFreezer" className="text-right">
                    Congelador por Defecto
                  </Label>
                  <Select
                    value={editingProfile?.default_freezer_id || ''}
                    onValueChange={(value) => setEditingProfile(prev => prev ? { ...prev, default_freezer_id: value === 'null' ? null : value } : null)}
                  >
                    <SelectTrigger id="defaultFreezer" className="col-span-3">
                      <SelectValue placeholder="Ninguno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Ninguno</SelectItem>
                      {freezers.map((freezer) => (
                        <SelectItem key={freezer.id} value={freezer.id}>
                          {freezer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="currentFreezer" className="text-right">
                    Congelador Actual
                  </Label>
                  <Select
                    value={editingProfile?.current_freezer_id || ''}
                    onValueChange={(value) => setEditingProfile(prev => prev ? { ...prev, current_freezer_id: value === 'null' ? null : value } : null)}
                  >
                    <SelectTrigger id="currentFreezer" className="col-span-3">
                      <SelectValue placeholder="Ninguno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Ninguno</SelectItem>
                      {freezers.map((freezer) => (
                        <SelectItem key={freezer.id} value={freezer.id}>
                          {freezer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleEditProfile} disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilesPage;