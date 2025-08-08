import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
}

const EditItemPage: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    entryDate: new Date(),
    sealNo: '',
    species: '',
    observations: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentFreezerId, setCurrentFreezerId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchInventory = useCallback(async (freezerId: string) => {
    // Simplificando la gestión del estado de carga para evitar conflictos
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
  }, [toast]);

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      setLoading(true); // Inicia la carga para toda la página
      const { data: { user: sessionUser } } = await supabase.auth.getUser();

      if (!sessionUser) {
        toast({
          title: "Error",
          description: "No se pudo obtener la información del usuario. Por favor, inicia sesión de nuevo.",
          variant: "destructive",
        });
        navigate('/');
        setLoading(false); // Asegura que el estado de carga se desactive
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
        setLoading(false); // Asegura que el estado de carga se desactive
        return;
      } else if (profileData) {
        setCurrentFreezerId(profileData.current_freezer_id);
        if (!profileData.current_freezer_id) {
          toast({
            title: "Atención",
            description: "No tienes un congelador seleccionado. Por favor, selecciona uno antes de modificar elementos.",
            variant: "default",
          });
          navigate('/change-freezer');
          setLoading(false); // Asegura que el estado de carga se desactive
          return;
        }
        await fetchInventory(profileData.current_freezer_id); // Espera a que se cargue el inventario
      } else {
        toast({
          title: "Error",
          description: "No se encontró el perfil del usuario.",
          variant: "destructive",
        });
        navigate('/app');
      }
      setLoading(false); // Finaliza la carga para toda la página
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

  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    const itemToEdit = inventoryItems.find(item => item.id === itemId);
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setFormData({
        entryDate: parseISO(itemToEdit.entry_date),
        sealNo: itemToEdit.seal_no || '',
        species: itemToEdit.species,
        observations: itemToEdit.observations || '',
      });
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, entryDate: date || new Date() }));
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!formData.entryDate) {
      toast({ title: "Error", description: "La fecha de entrada no puede estar vacía.", variant: "destructive" });
      return;
    }
    if (!formData.species.trim()) {
      toast({ title: "Error", description: "La especie no puede estar vacía.", variant: "destructive" });
      return;
    }

    if (!window.confirm("¿Estás seguro de que quieres guardar los cambios en este elemento?")) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('inventory')
        .update({
          entry_date: formData.entryDate.toISOString().split('T')[0],
          seal_no: formData.sealNo || null,
          species: formData.species.trim(),
          observations: formData.observations || null,
        })
        .eq('id', editingItem.id);

      if (error) {
        toast({
          title: "Error al actualizar elemento",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Elemento actualizado correctamente.",
        });
        // Eliminado: sessionStorage.setItem('hasMadeChanges', 'true'); // Activar el botón Modificar en Index
        setEditingItem(null); // Volver a la vista de selección
        setSelectedItemId(null);
        if (currentFreezerId) {
          fetchInventory(currentFreezerId); // Refrescar la lista
        }
      }
    } catch (err: any) {
      toast({
        title: "Error inesperado",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
          <CardTitle className="text-center">Modificar Elemento del Inventario</CardTitle>
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
          {!editingItem ? (
            <>
              {inventoryItems.length === 0 ? (
                <p className="text-center text-gray-500 p-4">No hay elementos en el inventario de este congelador para modificar.</p>
              ) : (
                <>
                  <div className="overflow-x-auto mb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
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
                              <RadioGroup
                                value={selectedItemId || ""}
                                onValueChange={handleSelectItem}
                              >
                                <RadioGroupItem value={item.id} id={`item-${item.id}`} />
                              </RadioGroup>
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
                    onClick={() => {
                      if (selectedItemId) {
                        handleSelectItem(selectedItemId); // Re-select to ensure editingItem is set
                      } else {
                        toast({ title: "Advertencia", description: "Por favor, selecciona un elemento para modificar.", variant: "default" });
                      }
                    }}
                    className="w-full"
                    disabled={!selectedItemId}
                  >
                    Modificar Elemento Seleccionado
                  </Button>
                </>
              )}
            </>
          ) : (
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <Label htmlFor="entryDate">FECHA</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.entryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.entryDate ? format(formData.entryDate, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.entryDate}
                      onSelect={handleDateChange}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="sealNo">Nº PRECINTO (Opcional)</Label>
                <Input
                  id="sealNo"
                  type="text"
                  value={formData.sealNo}
                  onChange={handleFormChange}
                  placeholder="Introduce el número de precinto"
                />
              </div>
              <div>
                <Label htmlFor="species">ESPECIE</Label>
                <Input
                  id="species"
                  type="text"
                  value={formData.species}
                  onChange={handleFormChange}
                  placeholder="Introduce la especie"
                  required
                />
              </div>
              <div>
                <Label htmlFor="observations">OBSERVACIONES (Opcional)</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={handleFormChange}
                  placeholder="Añade observaciones"
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Guardando Cambios...' : 'Guardar Cambios'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)} className="w-full mt-2">
                Cancelar Edición
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EditItemPage;