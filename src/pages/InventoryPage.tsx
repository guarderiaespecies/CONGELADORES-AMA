import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Download } from "lucide-react"; // Importar el icono Download
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
import * as XLSX from 'xlsx'; // Importar la librería XLSX

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
  created_by_username?: string; // New field for username
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
      freezers ( name ),
      profiles ( username )
    `);

    // Logic for filtering inventory based on user role
    if (profile.role === 'User' && profile.current_freezer_id) {
      query = query.eq('freezer_id', profile.current_freezer_id);
      console.log("DEBUG: InventoryPage - Filtering by user's current freezer:", profile.current_freezer_id);
    } else if (profile.role === 'Administrator' && profile.current_freezer_id) {
      query = query.eq('freezer_id', profile.current_freezer_id);
      console.log("DEBUG: InventoryPage - Filtering by admin's current freezer:", profile.current_freezer_id);
    } else if (profile.role === 'Veterinary' || (profile.role === 'Administrator' && !profile.current_freezer_id)) {
      console.log("DEBUG: InventoryPage - No freezer filter applied (Admin/Veterinary viewing all).");
    } else {
      console.log("DEBUG: InventoryPage - No specific freezer filter applied based on role/current_freezer_id.");
    }

    query = query
      .order('name', { ascending: true, foreignTable: 'freezers' }) 
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error(`No se pudo cargar el inventario: ${error.message}`, error);
      setInventoryItems([]);
    } else {
      const itemsWithFreezerAndUserName = data.map(item => ({
        ...item,
        freezer_name: item.freezers?.name || 'Desconocido',
        created_by_username: item.profiles?.username || 'Desconocido'
      }));
      setInventoryItems(itemsWithFreezerAndUserName as InventoryItem[]);
    }
    setLoading(false);
  }, []);

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

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      setLoading(true);
      let currentProfile: UserProfile | null = initialUserProfile || null; 

      if (!currentProfile) { 
        const { data: { user: sessionUser } } = await supabase.auth.getUser();

        if (!sessionUser) {
          console.error("Error: No se pudo obtener la información del usuario. Por favor, inicia sesión de nuevo.");
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
          console.error("Error: No se pudo obtener el perfil del usuario.", profileError);
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
      setCurrentFreeizerName(name);

      if (currentProfile?.role === 'User' && !currentProfile?.current_freezer_id) {
        console.warn("Atención: No tienes un congelador seleccionado. Por favor, selecciona uno para ver el inventario.");
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
  }, [navigate, fetchInventory, fetchFreezerName, initialUserProfile]);

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
      console.warn("Advertencia: Por favor, selecciona al menos un elemento.");
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
      console.log(`${successCount} elemento(s) actualizado(s) correctamente.`);
    }
    if (errorCount > 0) {
      console.error(`${errorCount} elemento(s) no se pudieron actualizar.`);
    }

    setSelectedItemIds(new Set()); // Clear selection
    if (userProfile) {
      await fetchInventory(userProfile); // Refresh the list
    }
    setLoading(false);
  };

  const handleExportToExcel = () => {
    if (inventoryItems.length === 0) {
        console.warn("No hay datos para exportar.");
        return;
    }

    // Prepare data for export
    const dataToExport = inventoryItems.map(item => ({
        'ID': item.id,
        'Congelador': item.freezer_name,
        'Fecha Entrada': format(new Date(item.entry_date), "dd/MM/yyyy", { locale: es }),
        'Nº Precinto': item.seal_no || '-',
        'Especie': item.species,
        'Observaciones': item.observations || '-',
        'Solicitado': item.status_solicitado ? 'Sí' : 'No',
        'Desfasado': item.status_desfasado ? 'Sí' : 'No',
        'Creado Por': item.created_by_username,
        'Fecha Creación': format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: es }),
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "inventario_congeladores.xlsx");
    console.log("Inventario exportado a Excel.");
  };

  const getRowClasses = (item: InventoryItem) => {
    let classes = "hover:bg-gray-100";

    if (item.status_desfasado) {
      classes = cn(classes, "bg-red-100 hover:bg-red-200");
    } else if (item.status_solicitado) {
      classes = cn(classes, "bg-green-100 hover:bg-green-200");
    }

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

  const showFreezerColumn = (userProfile?.role === 'Administrator' || userProfile?.role === 'Veterinary') && !userProfile?.current_freezer_id;
  const showAdminOnlyColumns = userProfile?.role === 'Administrator';
  const canEditItem = userProfile?.role === 'Administrator' || userProfile?.role === 'User';
  const canEditStatus = userProfile?.role === 'Administrator' || userProfile?.role === 'Veterinary';

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Card className={cn("w-full shadow-lg", !hideHeader && "mt-8")}> {/* Removed px-4 from here */}
        {!hideHeader && (
          <CardHeader ref={cardHeaderRef} className="sticky top-0 bg-card z-20 pb-4 px-4"> {/* Added px-4 here */}
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
            {/* Nuevo Botón de Exportar a Excel */}
            {(userProfile?.role === 'Administrator' || userProfile?.role === 'Veterinary') && ( // Ensure visibility for Veterinary
              <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExportToExcel}
                  className="absolute top-2 left-2 h-8 w-8"
              >
                  <Download className="h-5 w-5" />
                  <span className="sr-only">Descargar Excel</span>
              </Button>
            )}
          </CardHeader>
        )}

        <CardContent className="p-0 pt-4"> {/* No px-4 here */}
          {canEditStatus && (
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-4 px-4"> {/* Added px-4 here */}
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
              <Button
                onClick={() => handleBulkStatusChange('clear', false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 h-8 px-3 text-sm"
                disabled={selectedItemIds.size === 0 || loading}
              >
                Desmarcar ({selectedItemIds.size})
              </Button>
            </div>
          )}

          {inventoryItems.length === 0 ? (
            <p className="text-center text-gray-500 p-4 px-4">No hay elementos en el inventario de este congelador.</p> {/* Added px-4 here */}
          ) : (
            <div className="overflow-x-auto"> {/* No px-4 here */}
              <Table className="min-w-full">
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
                          <TableCell className="w-[120px]">{item.created_by_username}</TableCell>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryPage;