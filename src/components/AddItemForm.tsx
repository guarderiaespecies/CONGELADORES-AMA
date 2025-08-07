import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast"; // Using shadcn/ui toast

const AddItemForm = ({ onNewItemAdded }: { onNewItemAdded: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del ítem no puede estar vacío.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('items')
        .insert([{ name, description: description || null }]) // Set description to null if empty
        .select();

      if (error) {
        console.error("Error al añadir ítem:", error);
        toast({
          title: "Error al añadir ítem",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log("Ítem añadido con éxito:", data);
        toast({
          title: "Éxito",
          description: "Ítem añadido correctamente.",
        });
        setName('');
        setDescription('');
        onNewItemAdded(); // Notify parent component to refresh data
      }
    } catch (err: any) {
      console.error("Error inesperado:", err);
      toast({
        title: "Error inesperado",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-center">Añadir Nuevo Ítem</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del Ítem</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Introduce el nombre"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Descripción (Opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Introduce una descripción"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Añadiendo...' : 'Añadir Ítem'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddItemForm;