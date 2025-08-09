import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Check, X, Edit } from "lucide-react"; // Import icons
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

interface InventoryItem {
  id: string;
  freezer_id: string;
  entry_date: string; // YYYY-MM-DD format
  seal_no: string | null;
  species: string;
  observations: string | null;
  created_by_user_id: string;
  created_at: string;
  status_solicitado: boolean;
  status_desfasado: boolean;
  freezer_name?: string; // Optional for when fetching all freezers
}

interface UserProfile {
  role: string | null;
  current_freezer_id: string | null;
}

const InventoryPage: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchInventory = useCallback(async (profile: UserProfile) => {
    setLoading(true);
    let query = supabase.from('inventory').select(`
      id,
      freezer_id,
      entry_date,
      seal_no,
      species,
      observations,
      created_by_user_id,
      created_at,
      status_solicitado,
      status_desfasado,
      freezers ( name )
    `);

    if (profile.role === 'User' && profile.current_freezer_id) {
      query = query.eq('freezer_id', profile.current_freezer_id);
    } else if ((profile.role === 'Administrator' || profile.role === 'Veterinario') && profile.current_freezer_id) {
      // Admin/Veterinario with a selected freezer sees only that freezer
      query = query.eq('freezer_id', profile.current_freezer_id);
    }
    // If Admin/Veterinario and no current_freezer_id, fetch all (no additional filter)

    query = query.order('entry_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error",
        description: `No se pudo cargar el inventario: ${error.message}`,
        variant: "destructive",
      });
      setInventoryItems([]);
    } else {
      // Map data to include freezer_name directly
      const itemsWithFreezerName = data.map(item => ({
        ...item,
        freezer_name: item.freezers?.name || 'Desconocido'
      }));
      setInventoryItems(itemsWithFreezerName as InventoryItem[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      setLoading(true);
      const { data: { user: sessionUser } } = await supabase.auth.getUser();

      if (!sessionUser) {
        toast({
          title: "Error",
          description: "No se pudo obtener la información del usuario. Por favor, inicia sesión de nuevo.",
          variant: "destructive",
        });
        navigate('/');
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, current_freezer_id')
        .eq('id', sessionUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        toast({ title: "Error", description: "No se pudo obtener el perfil del usuario.", variant: "destructive" });
        navigate('/app');
        setLoading(false);
        return;
      }

      const profile: UserProfile = {
        role: profileData?.role || null,
        current_freezer_id: profileData?.current_freezer_id || null,
      };
      setUserProfile(profile);

      if (profile.role === 'User' && !profile.current_freezer_id) {
        toast({
          title: "Atención",
          description: "No tienes un congelador seleccionado. Por favor, selecciona uno para ver el inventario.",
          variant: "default",
        });
        navigate('/change-freezer');
        setLoading(false);
        return;
      }

      fetchInventory(profile);
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
  }, [navigate, toast, fetchInventory]);

  const handleEditItem = (itemId: string) => {
    navigate(`/edit-item/${itemId}`);
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

  const showFreezerColumn = (userProfile?.role === 'Administrator' || userProfile?.role === 'Veterinario') && !userProfile?.current_freezer_id;
  const showAdminColumns = userProfile?.role === 'Administrator';

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <Card className="w-full max-w-4xl mx-auto mt-8 shadow-lg relative">
        <CardHeader>
          <CardTitle className="text-center">Inventario del Congelador</CardTitle>
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
        <CardContent>
          {inventoryItems.length === 0 ? (
            <p className="text-center text-gray-500 p-4">No hay elementos en el inventario de este congelador.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Precinto</TableHead>
                    <TableHead>Especie</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead className="text-center">Solicitado</TableHead>
                    <TableHead className="text-center">Desfasado</TableHead>
                    {showFreezerColumn && <TableHead>Congelador</TableHead>}
                    {showAdminColumns && (
                      <>
                        <TableHead>Creado Por</TableHead>
                        <TableHead>Fecha Creación</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(new Date(item.entry_date), "dd/MM/yyyy", { locale: es })}</TableCell>
                      <TableCell>{item.seal_no || '-'}</TableCell>
                      <TableCell>{item.species}</TableCell>
                      <TableCell>{item.observations || '-'}</TableCell>
                      <TableCell className="text-center">
                        {item.status_solicitado ? <Check className="h-5 w-5 text-green-500 mx-auto" /> : ''}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.status_desfasado ? <X className="h-5 w-5 text-red-500 mx-auto" /> : ''}
                      </TableCell>
                      {showFreezerColumn && <TableCell>{item.freezer_name}</TableCell>}
                      {showAdminColumns && (
                        <>
                          <TableCell>{item.created_by_user_id}</TableCell> {/* This will show the user ID, not name */}
                          <TableCell>{format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" onClick={() => handleEditItem(item.id)}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                          </TableCell>
                        </>
                      )}
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

export default InventoryPage;