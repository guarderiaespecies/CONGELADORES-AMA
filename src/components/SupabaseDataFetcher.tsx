import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Import the centralized Supabase client
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Item {
  id: string;
  name: string;
  // Add other properties of your 'items' table here if known
  [key: string]: any; // Allow any other properties
}

const SupabaseDataFetcher = () => {
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("SupabaseDataFetcher component rendered.");
    const fetchItems = async () => {
      console.log("Attempting to fetch items from Supabase...");
      try {
        const { data, error } = await supabase.from('items').select('*');
        if (error) {
          console.error("Supabase fetch error:", error);
          setError(error.message);
        } else {
          console.log("Supabase data fetched:", data);
          setItems(data as Item[]);
        }
      } catch (err: any) {
        console.error("Unexpected error during fetch:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-center">Datos de Supabase (Tabla 'items')</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[280px]" />
          </div>
        )}

        {error && (
          <div className="text-red-500 text-center p-4 bg-red-50 border border-red-200 rounded-md">
            Error al cargar datos: {error}
            <p className="mt-2 text-sm">Asegúrate de que la política RLS esté configurada correctamente para lectura.</p>
          </div>
        )}

        {!loading && !error && (!items || items.length === 0) && (
          <div className="text-gray-500 text-center p-4 bg-gray-50 border border-gray-200 rounded-md">
            No hay datos en la tabla 'items' o no se pudieron cargar.
            <p className="mt-2 text-sm">Asegúrate de que tu tabla 'items' tenga datos y la política RLS permita la lectura.</p>
          </div>
        )}

        {!loading && !error && items && items.length > 0 && (
          <ul className="list-disc list-inside text-left space-y-2">
            {items.map((item) => (
              <li key={item.id || JSON.stringify(item)} className="p-2 bg-gray-50 rounded-md text-gray-700 break-words">
                {JSON.stringify(item, null, 2)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default SupabaseDataFetcher;