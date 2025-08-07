import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePostLoginReset = useCallback(async (userId: string) => {
    console.log("handlePostLoginReset: Iniciando para userId:", userId);
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, current_freezer_id, default_freezer_id')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error("handlePostLoginReset: Error al obtener el perfil del usuario para reset:", profileError);
      toast({ title: "Error de perfil", description: "No se pudo verificar el perfil para el congelador por defecto.", variant: "destructive" });
      return;
    }

    if (profileData && profileData.role === 'User' && profileData.default_freezer_id) {
      console.log("handlePostLoginReset: Usuario es 'User' con default_freezer_id. Actual:", profileData.current_freezer_id, "Por defecto:", profileData.default_freezer_id);
      if (profileData.current_freezer_id !== profileData.default_freezer_id) {
        console.log("handlePostLoginReset: Actualizando current_freezer_id al por defecto.");
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ current_freezer_id: profileData.default_freezer_id })
          .eq('id', userId);

        if (updateError) {
          console.error("handlePostLoginReset: Error al restablecer default_freezer_id:", updateError);
          toast({ title: "Error", description: "No se pudo restablecer el congelador por defecto.", variant: "destructive" });
        } else {
          console.log("handlePostLoginReset: Congelador por defecto restablecido con éxito.");
          toast({ title: "Congelador asignado", description: "Se ha restablecido tu congelador por defecto.", duration: 3000 });
        }
      } else {
        console.log("handlePostLoginReset: current_freezer_id ya coincide con default_freezer_id. No se necesita actualización.");
      }
    } else {
      console.log("handlePostLoginReset: Usuario no es 'User' o no tiene default_freezer_id. No se necesita restablecimiento.");
    }
    console.log("handlePostLoginReset: Finalizado.");
  }, [toast]);

  useEffect(() => {
    const checkUser = async () => {
      console.log("AuthPage useEffect: Iniciando checkUser.");
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("AuthPage useEffect: Sesión encontrada. Llamando handlePostLoginReset.");
        await handlePostLoginReset(session.user.id);
        console.log("AuthPage useEffect: Navegando a /app.");
        navigate('/app');
      } else {
        console.log("AuthPage useEffect: No se encontró sesión.");
      }
      console.log("AuthPage useEffect: checkUser finalizado.");
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthPage onAuthStateChange: Evento:", event, "Sesión:", session ? "existe" : "nula");
      if (session) {
        if (event === 'SIGNED_IN') { // Solo restablecer en el evento de inicio de sesión real
          console.log("AuthPage onAuthStateChange: Evento SIGNED_IN. Llamando handlePostLoginReset.");
          await handlePostLoginReset(session.user.id);
        }
        console.log("AuthPage onAuthStateChange: Navegando a /app.");
        navigate('/app');
      } else {
        console.log("AuthPage onAuthStateChange: No hay sesión, navegando a /.");
        navigate('/');
      }
    });

    return () => {
      console.log("AuthPage useEffect cleanup: Desuscribiendo listener de autenticación.");
      authListener.subscription.unsubscribe();
    };
  }, [navigate, handlePostLoginReset]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("handleLogin: Intentando iniciar sesión...");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("handleLogin: Error al iniciar sesión:", error);
      toast({ title: "Error de inicio de sesión", description: error.message, variant: "destructive" });
    } else {
      console.log("handleLogin: Inicio de sesión exitoso. Datos:", data);
      toast({ title: "Inicio de sesión exitoso", description: "Bienvenido de nuevo." });
      // La redirección y el restablecimiento del congelador son manejados por el listener onAuthStateChange
    }
    setLoading(false); // Asegurarse de que el estado de carga se restablezca
    console.log("handleLogin: Finalizado.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <img src="/logotipo-azul.png" alt="Logo Principado de Asturias" className="mx-auto mb-4 h-20" />
          <CardTitle className="text-center text-xl font-normal">
            Registro <span className="font-bold">CONGELADORES</span>
            <br />
            <span className="text-xl font-normal text-gray-600 border-b-2 border-[var(--underline-green)]">Agentes Medioambientales Asturias</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="login-username">Usuario</Label>
              <Input
                id="login-username"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Introduce tu usuario"
                required
              />
            </div>
            <div>
              <Label htmlFor="login-password">Contraseña</Label>
              <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;