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
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, current_freezer_id, default_freezer_id')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      toast({ title: "Error de perfil", description: "No se pudo verificar el perfil para el congelador por defecto.", variant: "destructive" });
      return;
    }

    if (profileData && profileData.role === 'User' && profileData.default_freezer_id) {
      if (profileData.current_freezer_id !== profileData.default_freezer_id) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ current_freezer_id: profileData.default_freezer_id })
          .eq('id', userId);

        if (updateError) {
          toast({ title: "Error", description: "No se pudo restablecer el congelador por defecto.", variant: "destructive" });
        } else {
          toast({ title: "Congelador asignado", description: "Se ha restablecido tu congelador por defecto.", duration: 3000 });
        }
      }
    }
  }, [toast]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          await handlePostLoginReset(session.user.id);
          navigate('/app');
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, handlePostLoginReset]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Error de inicio de sesión", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Inicio de sesión exitoso", description: "Bienvenido de nuevo." });
    }
    setLoading(false);
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