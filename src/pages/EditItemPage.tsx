import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate, useParams } from 'react-router-dom'; // Import useParams
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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

interface Freezer {
  id: string;
  name: string;
}

const EditItemPage: React.FC = () => {
  const { id: itemIdParam } = useParams<{ id: string }>(); // Get item ID from URL
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    entryDate: new Date(),
    sealNo: '',
    species: '',
    observations: '',
    freezerId: '', // New field
    statusSolicitado: false, // New field
    statusDesfasado: false, // New field
  });
  const [freezers, setFreezers] = useState<Freezer[]>([]); // For freezer selection
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // To check if admin/veterinario can edit
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchItem = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: `No se pudo cargar el elemento: ${error.message}`,
        variant: "destructive",
      });
      setEditingItem(null);
      navigate('/inventory'); // Go back to inventory list if item not found or error
    } else if (data) {
      setEditingItem(data as InventoryItem);
      setFormData({
        entryDate: parseISO(data.entry_date),
        sealNo: data.seal_no || '',
        species: data.species,
        observations: data.observations || '',
        freezerId: data.freezer_id, // Initialize new field
        statusSolicitado: data.status_solicitado, // Initialize new field
        statusDesfasado: data.status_desfasado, // Initialize new field
      });
    }
    setLoading(false);
  }, [toast, navigate]);

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

      setUser(sessionUser);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role') // Fetch role to check admin/veterinario permissions
        .eq('id', sessionUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        toast({ title: "Error", description: "No se pudo obtener el perfil del usuario.", variant: "destructive" });
        navigate('/app');
        setLoading(false);
        return;
      }
      setUserRole(profileData?.role || null);

      // Fetch all freezers for the select dropdown (only if admin)
      if (profileData?.role === 'Administrator') {
        const { data: freezersData, error: freezersError } = await supabase
          .from('freezers')
          .select('id, name');
        if (freezersError) {
          toast({ title: "Error", description: "No se pudieron cargar los congeladores.", variant: "destructive" });
        } else {
          setFreezers(freezersData || []);
        }
      }

      if (itemIdParam) {
        await fetchItem(itemIdParam);
      } else {
        // If no item ID is provided, this page is likely accessed incorrectly
        toast({
          title: "Error",
          description: "No se ha especificado un elemento para modificar.",
          variant: "destructive",
        });
        navigate('/inventory'); // Redirect to inventory list
      }
      setLoading(false);
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
  }, [navigate, toast, fetchItem, itemIdParam]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, entryDate: date || new Date() }));
  };

  const handleFreezerChange = (value: string) => {
    setFormData(prev => ({ ...prev, freezerId: value }));
  };

  const handleStatusSolicitadoChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, statusSolicitado: checked }));
  };

  const handleStatusDesfasadoChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, statusDesfasado: checked }));
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
      const updatePayload: Partial<InventoryItem> = {
        entry_date: formData.entryDate.toISOString().split('T')[0],
        seal_no: formData.sealNo || null,
        species: formData.species.trim(),
        observations: formData.observations || null,
      };

      // Only Administrator can change freezer_id and status fields here
      if (userRole === 'Administrator') {
        updatePayload.freezer_id = formData.freezerId;
        updatePayload.status_solicitado = formData.statusSolicitado;
        updatePayload.status_desfasado = formData.statusDesfasado;
      }

      const { error } = await supabase
        .from('inventory')
        .update(updatePayload)
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
        navigate('/inventory'); // Go back to inventory list after successful update
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

  if (!editingItem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <p>Elemento no encontrado o no se pudo cargar.</p>
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
            onClick={() => navigate('/inventory')} // Go back to the new InventoryPage
            className="absolute top-2 right-2 h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Volver</span>
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateItem} className="space-y-4">
            <div>
              <Label htmlFor="freezerId">Congelador</Label>
              <Select 
                value={formData.freezerId} 
                onValueChange={handleFreezerChange}
                disabled={userRole !== 'Administrator'} // Only Administrator can change
              >
                <SelectTrigger id="freezerId">
                  <SelectValue placeholder="Selecciona un congelador" />
                </SelectTrigger>
                <SelectContent>
                  {freezers.map((freezer) => (
                    <SelectItem key={freezer.id} value={freezer.id}>
                      {freezer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="statusSolicitado">Solicitado</Label>
              <Switch
                id="statusSolicitado"
                checked={formData.statusSolicitado}
                onCheckedChange={handleStatusSolicitadoChange}
                disabled={userRole !== 'Administrator'} // Only Administrator can modify
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="statusDesfasado">Desfasado</Label>
              <Switch
                id="statusDesfasado"
                checked={formData.statusDesfasado}
                onCheckedChange={handleStatusDesfasadoChange}
                disabled={userRole !== 'Administrator'} // Only Administrator can modify
              />
            </div>

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
            <Button type="button" variant="outline" onClick={() => navigate('/inventory')} className="w-full mt-2">
              Cancelar Edición
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditItemPage;