import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';

const AddItemPage: React.FC = () => {
  const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());
  const [sealNo, setSealNo] = useState('');
  const [species, setSpecies] = useState('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currentFreezerId, setCurrentFreezerId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setPageLoading(true);
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (sessionUser) {
        setUser(sessionUser);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('current_freezer_id')
          .eq('id', sessionUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          toast({ title: "Error", description: "No se pudo obtener el congelador actual del usuario.", variant: "destructive" });
          navigate('/app');
        } else if (profileData) {
          setCurrentFreezerId(profileData.current_freezer_id);
          if (!profileData.current_freezer_id) {
            toast({
              title: "Atención",
              description: "No tienes un congelador seleccionado. Por favor, selecciona uno antes de añadir elementos.",
              variant: "default",
            });
            navigate('/change-freezer');
          }
        }
      } else {
        toast({
          title: "Error",
          description: "No se pudo obtener la información del usuario. Por favor, inicia sesión de nuevo.",
          variant: "destructive",
        });
        navigate('/');
      }
      setPageLoading(false);
    };
    fetchData();
  }, [toast, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      toast({
        title: "Error",
        description: "Usuario no autenticado. Por favor, inicia sesión.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!currentFreezerId) {
      toast({
        title: "Error",
        description: "No hay un congelador seleccionado. Por favor, selecciona uno.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!entryDate) {
      toast({
        title: "Error",
        description: "La fecha de entrada no puede estar vacía.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!species.trim()) {
      toast({
        title: "Error",
        description: "La especie no puede estar vacía.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inventory')
        .insert([
          {
            freezer_id: currentFreezerId,
            entry_date: entryDate.toISOString().split('T')[0],
            seal_no: sealNo || null,
            species: species.trim(),
            observations: observations || null,
            created_by_user_id: user.id,
            created_at: new Date().toISOString(),
            status_solicitado: false,
            status_desfasado: false,
          }
        ])
        .select();

      if (error) {
        toast({
          title: "Error al añadir ítem",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Ítem añadido correctamente.",
        });
        sessionStorage.setItem('hasMadeChanges', 'true'); // Activar el botón Modificar
        setEntryDate(new Date());
        setSealNo('');
        setSpecies('');
        setObservations('');
        navigate('/app');
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

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Cargando formulario...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8 shadow-lg relative">
      <CardHeader>
        <CardTitle className="text-center">Añadir Nuevo Elemento</CardTitle>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="entryDate">FECHA</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !entryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {entryDate ? format(entryDate, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={entryDate}
                  onSelect={setEntryDate}
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
              value={sealNo}
              onChange={(e) => setSealNo(e.target.value)}
              placeholder="Introduce el número de precinto"
            />
          </div>
          <div>
            <Label htmlFor="species">ESPECIE</Label>
            <Input
              id="species"
              type="text"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="Introduce la especie"
              required
            />
          </div>
          <div>
            <Label htmlFor="observations">OBSERVACIONES (Opcional)</Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Añade observaciones"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddItemPage;