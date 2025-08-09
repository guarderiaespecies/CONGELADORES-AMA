import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Check, X, Edit } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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
  freezer_name?: string;
  created_by_user_email?: string;
}

interface UserProfile {
  role: string | null;
  current_freezer_id: string | null;
}

const InventoryPage: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentFreezerName, setCurrentFreezerName] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const cardHeaderRef = useRef<HTMLDivElement>(null);
  const [tableHeaderTopOffset, setTableHeaderTopOffset] = useState(0);

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
      query = query.eq('freezer_id', profile.current_freezer_id);
    }

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
      const uniqueUserIds = Array.from(new Set(data.map(item => item.created_by_user_id)));
      let userEmailsMap = new Map<string, string>();

      if (uniqueUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', uniqueUserIds);

        if (profilesError) {
          console.error("Error fetching user profiles for emails:", profilesError);
        } else {
          profilesData.forEach(profile => {
            userEmailsMap.set(profile.id, profile.email);
          });
        }
      }

      const itemsWithFreezerAndUserName = data.map(item => ({
        ...item,
        freezer_name: item.freezers?.name || 'Desconocido',
        created_by_user_email: userEmailsMap.get(item.created_by_user_id) || 'Desconocido'
      }));
      setInventoryItems(itemsWithFreezerAndUserName as InventoryItem[]);
    }
    setLoading(false);
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

      const name = await fetchFreezerName(profile.current_freezer_id);
      setCurrentFreezerName(name);

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
  }, [navigate, toast, fetchInventory, fetchFreezerName]);

  // Effect to calculate the offset for the table header
  useEffect(() => {
    const calculateOffset = () => {
      if (cardHeaderRef.current) {
        // Get the bottom position of the CardHeader relative to the viewport
        const headerBottom = cardHeaderRef.current.getBoundingClientRect().bottom;
        setTableHeaderTopOffset(headerBottom);
      }
    };

    // Recalculate on mount, resize, and when inventory items or loading state changes
    calculateOffset();
    window.addEventListener('resize', calculateOffset);
    return () => window.removeEventListener('resize', calculateOffset);
  }, [loading, inventoryItems]); // Depend on loading and inventoryItems to recalculate if content changes

  const handleEditItem = (itemId: string) => {
    navigate(`/edit-item/${itemId}`);
  };

  const handleStatusChange = async (itemId: string, statusKey: 'status_solicitado' | 'status_desfasado', newValue: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ [statusKey]: newValue })
        .eq('id', itemId);

      if (error) {
        toast({
          title: "Error al actualizar estado",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Estado actualizado correctamente.",
        });
        if (userProfile) {
          await fetchInventory(userProfile);
        }
      }
    } catch (err: any) {
      toast({
        title: "Error inesperado",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRowClasses = (item: InventoryItem) => {
    if (item.status_desfasado) {
      return "bg-red-100";
    }
    if (item.status_solicitado) {
      return "bg-green-100";
    }
    return "";
  };

  const getIconColorClass = (item: InventoryItem) => {
    if (item.status_solicitado || item.status_desfasado) {
      return "text-white";
    }
    return "";
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
  const canEditStatus = userProfile?.role === 'Administrator' || userProfile?.role === 'Veterinario';

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <Card className="w-full max-w-4xl mx-auto mt-8 shadow-lg"> {/* No overflow-y-auto here, body will scroll */}
        <CardHeader ref={cardHeaderRef} className="sticky top-[48px] bg-background z-20"> {/* Sticks to viewport at 48px */}
          <CardTitle className="text-center">
            {userProfile?.role === 'Administrator' || userProfile?.role === 'Veterinario' ?
              (currentFreezerName ? `Inventario del Congelador: ${currentFreezerName}` : 'Inventario de los Congeladores')
              :
              (currentFreezerName ? `Inventario del Congelador: ${currentFreezerName}` : 'Inventario del Congelador')
            }
          </CardTitle>
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
        <CardContent className="overflow-x-auto"> {/* Only horizontal scroll here */}
          {inventoryItems.length === 0 ? (
            <p className="text-center text-gray-500 p-4">No hay elementos en el inventario de este congelador.</p>
          ) : (
            <Table>
              {/* Use the dynamically calculated offset for TableHeader */}
              <TableHeader className="sticky bg-background z-10" style={{ top: `${tableHeaderTopOffset}px` }}>
                <TableRow>
                  {showFreezerColumn && <TableHead className="w-[120px]">Congelador</TableHead>}
                  <TableHead className="w-[100px]">Precinto</TableHead>
                  <TableHead className="w-[120px]">Especie</TableHead>
                  <TableHead className="w-[100px]">Fecha</TableHead>
                  <TableHead>Observaciones</TableHead>
                  {showAdminColumns && (
                    <>
                      <TableHead className="w-[120px]">Creado Por</TableHead>
                      <TableHead className="w-[150px]">Fecha Creación</TableHead>
                      <TableHead className="w-[80px] text-center">Acciones</TableHead>
                    </>
                  )}
                  <TableHead className="w-[60px] text-center">Solicitado</TableHead>
                  <TableHead className="w-[60px] text-center">Desfasado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.map((item) => (
                  <TableRow key={item.id} className={getRowClasses(item)}>
                    {showFreezerColumn && <TableCell>{item.freezer_name}</TableCell>}
                    <TableCell>{item.seal_no || '-'}</TableCell>
                    <TableCell>{item.species}</TableCell>
                    <TableCell>{format(new Date(item.entry_date), "dd/MM/yyyy", { locale: es })}</TableCell>
                    <TableCell>{item.observations || '-'}</TableCell>
                    {showAdminColumns && (
                      <>
                        <TableCell>{item.created_by_user_email}</TableCell>
                        <TableCell>{format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => handleEditItem(item.id)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-center">
                      {canEditStatus ? (
                        <Switch
                          checked={item.status_solicitado}
                          onCheckedChange={(checked) => handleStatusChange(item.id, 'status_solicitado', checked)}
                        />
                      ) : (
                        item.status_solicitado ? <Check className={cn("h-5 w-5 mx-auto", getIconColorClass(item))} /> : ''
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {canEditStatus ? (
                        <Switch
                          checked={item.status_desfasado}
                          onCheckedChange={(checked) => handleStatusChange(item.id, 'status_desfasado', checked)}
                        />
                      ) : (
                        item.status_desfasado ? <X className={cn("h-5 w-5 mx-auto", getIconColorClass(item))} /> : ''
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryPage;