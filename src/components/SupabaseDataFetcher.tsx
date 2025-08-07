import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';

interface Todo {
  id: number;
  task: string;
  is_complete: boolean;
}

const SupabaseDataFetcher: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTodos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .limit(5); // Limit to 5 for a simple example

      if (error) {
        throw error;
      }
      setTodos(data || []);
      showSuccess('Datos de Supabase cargados exitosamente.');
    } catch (error: any) {
      showError(`Error al cargar datos: ${error.message}`);
      console.error('Error fetching todos:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-center">Datos de Supabase</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-gray-500">Cargando datos...</p>
        ) : (
          <>
            {todos.length > 0 ? (
              <ul className="space-y-2">
                {todos.map((todo) => (
                  <li key={todo.id} className="flex items-center justify-between p-2 border rounded-md">
                    <span className={todo.is_complete ? 'line-through text-gray-500' : ''}>
                      {todo.task}
                    </span>
                    <span className={`text-sm ${todo.is_complete ? 'text-green-600' : 'text-yellow-600'}`}>
                      {todo.is_complete ? 'Completado' : 'Pendiente'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500">No hay tareas en la tabla 'todos'.</p>
            )}
            <div className="mt-4 text-center">
              <Button onClick={fetchTodos}>Recargar Datos</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SupabaseDataFetcher;