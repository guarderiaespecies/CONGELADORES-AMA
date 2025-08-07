import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('FATAL ERROR: Supabase URL o Anon Key no están configuradas. Por favor, asegúrate de que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estén definidas en tu archivo .env.');
  throw new Error('Las variables de entorno de Supabase no están configuradas.');
}

try {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  console.error('ERROR CRÍTICO: Fallo al crear la instancia del cliente Supabase:', error);
  throw error;
}

export const supabase = supabaseClient;