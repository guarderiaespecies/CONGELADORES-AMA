import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('FATAL ERROR: Supabase URL o Anon Key no están configuradas. Por favor, asegúrate de que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estén definidas en tu archivo .env.');
  // Si las claves faltan, lanzamos un error para detener la aplicación y hacerlo visible.
  throw new Error('Las variables de entorno de Supabase no están configuradas.');
}

console.log('Intentando crear el cliente Supabase...');
try {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  console.log('Cliente Supabase creado con éxito.');
} catch (error) {
  console.error('ERROR CRÍTICO: Fallo al crear la instancia del cliente Supabase:', error);
  // Si createClient lanza un error, lo relanzamos para detener la aplicación y hacerlo visible.
  throw error;
}

export const supabase = supabaseClient;