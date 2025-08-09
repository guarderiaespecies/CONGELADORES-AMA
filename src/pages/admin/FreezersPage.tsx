import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { useToast } from "@/components/ui/use-toast"; // Eliminado
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
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

interface Freezer {
  id: string;
  name: string;
}

const FreezersPage: React.FC = () => {
  const [freezers, setFreezers] = useState<Freezer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [newFreezerName, setNewFreezerName] = useState('');
  const [editingFreezer, setEditingFreezer] = useState<Freezer | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // const { toast } = useToast(); // Eliminado
  const navigate = useNavigate();

  const fetchFreezers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('freezers')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error(`No se pudieron cargar los congeladores: ${error.message}`, error);
      setFreezers([]);
    } else {
      setFreezers(data || []);
    }
    setLoading(false);
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
        fetchFreezers();
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
  }, [navigate, fetchFreezers]); // Dependencias actualizadas

  const handleAddFreezer = async () => {
    if (!newFreezerName.trim()) {
      console.warn("Advertencia: El nombre del congelador no puede estar vacío.");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('freezers')
      .insert([{ name: newFreezerName.trim() }]);

    if (error) {
      console.error(`Error al añadir congelador: ${error.message}`, error);
    } else {
      console.log("Éxito: Congelador añadido correctamente.");
      setNewFreezerName('');
      setIsAddDialogOpen(false);
      fetchFreezers();
    }
    setLoading(false);
  };

  const handleEditFreezer = async () => {
    if (!editingFreezer || !editingFreezer.name.trim()) {
      console.warn("Advertencia: El nombre del congelador no puede estar vacío.");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('freezers')
      .update({ name: editingFreezer.name.trim() })
      .eq('id', editingFreezer.id);

    if (error) {
      console.error(`Error al actualizar congelador: ${error.message}`, error);
    } else {
      console.log("Éxito: Congelador actualizado correctamente.");
      setEditingFreezer(null);
      setIsEditDialogOpen(false);
      fetchFreezers();
    }
    setLoading(false);
  };

  const handleDeleteFreezer = async (id: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('freezers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error al eliminar congelador: ${error.message}`, error);
    } else {
      console.log("Éxito: Congelador eliminado correctamente.");
      fetchFreezers();
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
      <Card className="w-full max-w-2xl mx-auto mt-8 shadow-lg relative">
        <CardHeader>
          <CardTitle className="text-center">Gestión de Congeladores</CardTitle>
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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full mb-4">
                <Plus className="mr-2 h-4 w-4" /> Añadir Nuevo Congelador
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Añadir Nuevo Congelador</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="newFreezerName" className="text-right">
                    Nombre
                  </Label>
                  <Input
                    id="newFreezerName"
                    value={newFreezerName}
                    onChange={(e) => setNewFreezerName(e.target.value)}
                    className="col-span-3"
                    placeholder="Nombre del congelador"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddFreezer} disabled={loading}>
                  {loading ? 'Añadiendo...' : 'Añadir Congelador'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {freezers.length === 0 ? (
            <p className="text-center text-gray-500 p-4">No hay congeladores registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre del Congelador</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {freezers.map((freezer) => (
                    <TableRow key={freezer.id}>
                      <TableCell>{freezer.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingFreezer(freezer);
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
                                Esta acción no se puede deshacer. Esto eliminará permanentemente el congelador
                                <span className="font-bold"> {freezer.name}</span> y cualquier inventario asociado a él.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteFreezer(freezer.id)} disabled={loading}>
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

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Congelador</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editFreezerName" className="text-right">
                    Nombre
                  </Label>
                  <Input
                    id="editFreezerName"
                    value={editingFreezer?.name || ''}
                    onChange={(e) => setEditingFreezer(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="col-span-3"
                    placeholder="Nombre del congelador"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleEditFreezer} disabled={loading}>
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

export default FreezersPage;