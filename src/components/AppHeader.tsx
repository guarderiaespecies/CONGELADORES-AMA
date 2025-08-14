import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { X, Settings } from 'lucide-react';

interface AppHeaderProps {
  userEmail: string | undefined;
  userRole: string | null;
  currentFreezerName: string | null;
}

const AppHeader: React.FC<AppHeaderProps> = ({ userEmail, userRole, currentFreezerName }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error al cerrar sesión:", error);
    } else {
      console.log("Sesión cerrada correctamente.");
      navigate('/');
    }
  };

  const handleAdminSettings = () => {
    navigate('/admin-settings');
  };

  return (
    <Card className="w-full mb-8 shadow-lg relative"> {/* Removed max-w-md mx-auto */}
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
        {userRole && (userRole === 'Administrator' || userRole === 'Veterinary') && (
          <p className="text-md text-gray-600">Rol: <span className="font-medium">{userRole}</span></p>
        )}
        {currentFreezerName && (
          <p className="text-md text-gray-600">Congelador Actual: <span className="font-medium uppercase">{currentFreezerName}</span></p>
        )}
        {!currentFreezerName && userRole === 'User' && (
          <p className="text-md text-gray-600 text-red-500">No hay congelador asociado.</p>
        )}
      </CardContent>
      {/* Botón de cerrar sesión en la esquina superior derecha */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="absolute top-2 right-2 h-8 w-8"
      >
        <X className="h-5 w-5 font-bold" />
        <span className="sr-only">Cerrar Sesión</span>
      </Button>
      {/* Botón de configuración para administradores */}
      {userRole === 'Administrator' && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAdminSettings}
          className="absolute top-2 right-12 h-8 w-8" // Posicionado a la izquierda del botón de cerrar sesión
        >
          <Settings className="h-5 w-5" />
          <span className="sr-only">Configuración de Administrador</span>
        </Button>
      )}
    </Card>
  );
};

export default AppHeader;