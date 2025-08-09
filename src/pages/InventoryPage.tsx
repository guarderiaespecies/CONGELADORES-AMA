import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Edit } from "lucide-react";
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

interface InventoryPageProps {
  hideHeader?: boolean; // New prop to hide the CardHeader
  initialUserProfile?: UserProfile; // New prop to pass user profile from parent
}

const InventoryPage: React.FC<InventoryPageProps> = ({ hideHeader = false, initialUserProfile }) => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set()); // State for selected rows
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialUserProfile || null); // Initialize with prop
  const [currentFreezerName, setCurrentFreezerName] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const cardHeaderRef = useRef<HTMLDivElement>(null); 

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

    // Logic for filtering inventory based on user role
    if (profile.role === 'User' && profile.current_freezer_id) {
      // Users only see items from their currently selected freezer
      query = query.eq('freezer_id', profile.current_freezer_id);
      console.log("DEBUG: InventoryPage - Filtering by user's current freezer:", profile.current_freezer_id);
    } else if (profile.role === 'Administrator' && profile.current_freezer_id) {
      // If Admin has a specific freezer selected, show only that one
      query = query.eq('freezer_id', profile.current_freezer_id);
      console.log("DEBUG: InventoryPage - Filtering by admin's current freezer:", profile.current_freezer_id);
    } else if (profile.role === 'Veterinary' || (profile.role === 'Administrator' && !profile.current_freezer_id)) {
      // Veterinarians always see all, and Administrators see all if no freezer is selected
      console.log("DEBUG: InventoryPage - No freezer filter applied (Admin/Veterinary viewing all).");
    } else {
      // Fallback for other roles or unhandled cases, might result in no data if no filter
      console.log("DEBUG: InventoryPage - No specific freezer filter applied based on role/current_freezer_id.");
    }

    // Order by freezer name ascending, then by entry date descending (most recent first), then by creation timestamp descending
    query = query
      .order('name', { ascending: true, foreignTable: 'freezers' }) 
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false }); // Added for stable ordering

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
      let currentProfile: UserProfile | null = initialUserProfile || null; 

      if (!currentProfile) { 
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
        currentProfile = {
          role: profileData?.role || null,
          current_freezer_id: profileData?.current_freezer_id || null,
        };
      }
      
      setUserProfile(currentProfile); 

      console.log("DEBUG: InventoryPage - User Profile Role:", currentProfile?.role);
      console.log("DEBUG: InventoryPage - User Profile Current Freezer ID:", currentProfile?.current_freezer_id);

      const name = await fetchFreezerName(currentProfile?.current_freezer_id || null);
      setCurrentFreezerName(name);

      if (currentProfile?.role === 'User' && !currentProfile?.current_freezer_id) {
        toast({
          title: "Atención",
          description: "No tienes un congelador seleccionado. Por favor, selecciona uno para ver el inventario.",
          variant: "default",
        });
        navigate('/change-freezer');
        setLoading(false);
        return;
      }

      if (currentProfile) {
        fetchInventory(currentProfile);
      } else {
        setLoading(false);
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
  }, [navigate, toast, fetchInventory, fetchFreezerName, initialUserProfile]);

  const handleEditItem = (itemId: string) => {
    navigate(`/edit-item/${itemId}`);
  };

  const handleRowClick = (itemId: string) => {
    setSelectedItemIds(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  };

  const handleBulkStatusChange = async (statusKey: 'solicitado' | 'desfasado' | 'clear', newValue: boolean) => {
    if (selectedItemIds.size === 0) {
      toast({ title: "Advertencia", description: "Por favor, selecciona al menos un elemento.", variant: "default" });
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const itemId of Array.from(selectedItemIds)) {
      try {
        let updatePayload: Partial<InventoryItem> = {};
        if (statusKey === 'clear') {
          updatePayload = { status_solicitado: false, status_desfasado: false };
        } else {
          updatePayload = { [`status_${statusKey}`]: newValue };
        }

        const { error } = await supabase
          .from('inventory')
          .update(updatePayload)
          .eq('id', itemId);

        if (error) {
          console.error(`Error updating item ${itemId}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`Unexpected error updating item ${itemId}:`, err);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: "Éxito",
        description: `${successCount} elemento(s) actualizado(s) correctamente.`,
      });
    }
    if (errorCount > 0) {
      toast({
        title: "Error",
        description: `${errorCount} elemento(s) no se pudieron actualizar.`,
        variant: "destructive",
      });
    }

    setSelectedItemIds(new Set()); // Clear selection
    if (userProfile) {
      await fetchInventory(userProfile); // Refresh the list
    }
    setLoading(false);
  };

  const getRowClasses = (item: InventoryItem) => {
    // Base classes for all rows, including a default hover effect
    let classes = "hover:bg-gray-100";

    // Apply status-based background colors and their specific hover effects
    if (item.status_desfasado) {
      classes = cn(classes, "bg-red-100 hover:bg-red-200");
    } else if (item.status_solicitado) {
      classes = cn(classes, "bg-green-100 hover:bg-green-200");
    }

    // Apply selected state, which should override other background colors
    if (selectedItemIds.has(item.id)) {
      classes = cn(classes, "bg-blue-100 hover:bg-blue-200 border-blue-300");
    }
    
    return classes;
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

  // Determine if the "Congelador" column should be shown
  const showFreezerColumn = (userProfile?.role === 'Administrator' || userProfile?.role === 'Veterinary') && !userProfile?.current_freezer_id;
  const showAdminOnlyColumns = userProfile?.role === 'Administrator'; // For 'Creado Por' and 'Fecha Creación'
  const canEditItem = userProfile?.role === 'Administrator' || userProfile?.role === 'User'; // For the edit button
  const canEditStatus = userProfile?.role === 'Administrator' || userProfile?.role === 'Veterinary'; // For bulk status change buttons

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <Card className={cn("w-full max-w-full mx-auto shadow-lg", !hideHeader && "mt-8")}>
        {!hideHeader && (
          <CardHeader ref={cardHeaderRef} className="sticky top-0 bg-card z-20 pb-4">
            <CardTitle className="text-center">
              {userProfile?.role === 'Administrator' || userProfile?.role === 'Veterinary' ?
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
        )}

        <CardContent className="p-0 overflow-x-auto pt-4">
          {canEditStatus && (
            <div className="flex justify-center mb-4 px-4 relative"> {/* Parent div for centering and positioning */}
              <div className="flex space-x-4"> {/* This div will contain the centered buttons */}
                <Button
                  onClick={() => handleBulkStatusChange('solicitado', true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={selectedItemIds.size === 0 || loading}
                >
                  Solicitar ({selectedItemIds.size})
                </Button>
                <Button
                  onClick={() => handleBulkStatusChange('desfasado', true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={selectedItemIds.size === 0 || loading}
                >
                  Desfasado ({selectedItemIds.size})
                </Button>
              </div>
              <Button
                onClick={() => handleBulkStatusChange('clear', false)}
                className="absolute right-4 bg-gray-300 hover:bg-gray-400 text-gray-800 h-8 px-3 text-sm"
                disabled={selectedItemIds.size === 0 || loading}
              >
                Desmarcar ({selectedItemIds.size})
              </Button>
            </div>
          )}

          {inventoryItems.length === 0 ? (
            <p className="text-center text-gray-500 p-4">No hay elementos en el inventario de este congelador.</p>
          ) : (
            <Table>
              <TableHeader className="bg-card z-10">
                <TableRow>
                  {showFreezerColumn && <TableHead className="w-[120px]">Congelador</TableHead>}
                  <TableHead className="w-[100px]">Fecha</TableHead>
                  <TableHead className="w-[100px]">Precinto</TableHead>
                  <TableHead className="w-[120px]">Especie</TableHead>
                  <TableHead className="min-w-[150px]">Observaciones</TableHead>
                  {showAdminOnlyColumns && (
                    <>
                      <TableHead className="w-[120px]">Creado Por</TableHead>
                      <TableHead className="w-[150px]">Fecha Creación</TableHead>
                    </>
                  )}
                  {canEditItem && <TableHead className="w-[80px] text-center">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={getRowClasses(item)}
                    onClick={() => handleRowClick(item.id)}
                  >
                    {showFreezerColumn && <TableCell className="w-[120px]">{item.freezer_name}</TableCell>}
                    <TableCell className="w-[100px]">{format(new Date(item.entry_date), "dd/MM/yyyy", { locale: es })}</TableCell>
                    <TableCell className="w-[100px]">{item.seal_no || '-'}</TableCell>
                    <TableCell className="w-[120px]">{item.species}</TableCell>
                    <TableCell className="min-w-[150px]">{item.observations || '-'}</TableCell>
                    {showAdminOnlyColumns && (
                      <>
                        <TableCell className="w-[120px]">{item.created_by_user_email}</TableCell>
                        <TableCell className="w-[150px]">{format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</TableCell>
                      </>
                    )}
                    {canEditItem && (
                      <TableCell className="w-[80px] text-center">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditItem(item.id); }}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      </TableCell>
                    )}
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