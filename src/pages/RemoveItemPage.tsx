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
import { Checkbox } from "@/components/ui/checkbox";
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
}

const RemoveItemPage: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentFreezerId, setCurrentFreezerId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchInventory = useCallback(async (freezerId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('freezer_id', freezerId)
      .order('entry_date', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: `No se pudo cargar el inventario: ${error.message}`,
        variant: "destructive",
      });
      setInventoryItems([]);
    } else {
      setInventoryItems(data as InventoryItem[]);
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
        return;
      }

      setUser(sessionUser);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('current_freezer_id')
        .eq('id', sessionUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        toast({ title: "Error", description: "No se pudo obtener el congelador actual del usuario.", variant: "destructive" });
        navigate('/app');
        return;
      } else if (profileData) {
        setCurrentFreezerId(profileData.current_freezer_id);
        if (!profileData.current_freezer_id) {
          toast({
            title: "Atención",
            description: "No tienes un congelador seleccionado. Por favor, selecciona uno antes de retirar elementos.",
            variant: "default",
          });
          navigate('/change-freezer');
          return;
        }
        fetchInventory(profileData.current_freezer_id);
      } else {
        toast({
          title: "Error",
          description: "No se encontró el perfil del usuario.",
          variant: "destructive",
        });
        navigate('/app');
      }
    };

    checkUserAndLoadData();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/');
      } else {
        setUser(session);
        checkUserAndLoadData();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, toast, fetchInventory]);

  const handleCheckboxChange = (itemId: string, isChecked: boolean) => {
    setSelectedItems((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (isChecked) {
        newSelected.add(itemId);
      } else {
        newSelected.delete(itemId);
      }
      return newSelected;
    });
  };

  const handleRemoveItems = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "Advertencia",
        description: "Por favor, selecciona al menos un elemento para retirar.",
        variant: "default",
      });
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres retirar ${selectedItems.size} elemento(s)?`)) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .in('id', Array.from(selectedItems));

      if (error) {
        toast({
          title: "Error al retirar elementos",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Éxito",
          description: `${selectedItems.size} elemento(s) retirado(s) correctamente.`,
        });
        setSelectedItems(new Set()); // Clear selection
        if (currentFreezerId) {
          fetchInventory(currentFreezerId); // Refresh the list
        }
      }
    } catch (err: any) {
      toast({
        title: "Error inesperado",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
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

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <Card className="w-full max-w-2xl mx-auto mt-8 shadow-lg relative">
        <CardHeader>
          <CardTitle className="text-center">Retirar Elementos del Inventario</CardTitle>
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
            <>
              <div className="overflow-x-auto mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedItems.size === inventoryItems.length && inventoryItems.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems(new Set(inventoryItems.map(item => item.id)));
                            } else {
                              setSelectedItems(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Precinto</TableHead>
                      <TableHead>Especie</TableHead>
                      <TableHead>Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) => handleCheckboxChange(item.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>{format(new Date(item.entry_date), "dd/MM/yyyy", { locale: es })}</TableCell>
                        <TableCell>{item.seal_no || '-'}</TableCell>
                        <TableCell>{item.species}</TableCell>
                        <TableCell>{item.observations || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button
                onClick={handleRemoveItems}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={selectedItems.size === 0 || deleting}
              >
                {deleting ? 'Retirando...' : `Retirar ${selectedItems.size > 0 ? `(${selectedItems.size})` : ''} Elemento(s)`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RemoveItemPage;