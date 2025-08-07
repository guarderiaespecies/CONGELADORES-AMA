import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Importar Button
import { useNavigate } from "react-router-dom"; // Importar useNavigate
import { supabase } from '@/lib/supabase'; // Importar supabase
import { useToast } from "@/components/ui/use-toast"; // Importar useToast

interface AppHeaderProps {
  userEmail: string | undefined;
  userRole: string | null;
  currentFreezerName: string | null;
}

const AppHeader: React.FC<AppHeaderProps> = ({ userEmail, userRole, currentFreezerName }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error al cerrar sesión:", error);
      toast({ title: "Error al cerrar sesión", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sesión cerrada", description: "Has cerrado sesión correctamente." });
      navigate('/'); // Redirigir a la página de inicio de sesión
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mb-8 shadow-lg">
      <CardHeader>
        <img src="/logotipo-azul.png" alt="Logo Principado de Asturias" className="mx-auto mb-4 h-20" />
        <CardTitle className="text-center text-xl font-normal">
          Registro <span className="font-bold">CONGELADORES</span>
          <br />
          <span className="text-xl font-normal text-gray-600 border-b-2 border-[var(--underline-green)]">Agentes Medioambientales Asturias</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-lg font-semibold text-gray-800">{userEmail}</p>
        {userRole && (userRole === 'Administrador' || userRole === 'Veterinario' || userRole === 'Administrator') && (
          <p className="text-md text-gray-600">Rol: <span className="font-medium">{userRole}</span></p>
        )}
        {currentFreezerName && (
          <p className="text-md text-gray-600">Congelador Actual: <span className="font-medium uppercase">{currentFreezerName}</span></p>
        )}
        {!currentFreezerName && userRole === 'User' && (
          <p className="text-md text-gray-600 text-red-500">No hay congelador asociado.</p>
        )}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="mt-4 w-full"
        >
          Cerrar Sesión
        </Button>
      </CardContent>
    </Card>
  );
};

export default AppHeader;