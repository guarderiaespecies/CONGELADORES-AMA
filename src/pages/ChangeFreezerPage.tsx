import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } => "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import AppHeader from "@/components/AppHeader"; // Import the reusable header
import { Skeleton } from "@/components/ui/skeleton";

interface Freezer {
  id: string;
  name: string;
}

const ChangeFreezerPage: React.FC = () => {
  const [freezers, setFreezers] = useState<Freezer[]>([]);
  const [selectedFreezerId, setSelectedFreezerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentFreezerId, setCurrentFreezerId] = useState<string | null>(null);
  const [currentFreezerName, setCurrentFreezerName] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, current_freezer_id')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Error al obtener el perfil del usuario:", profileError);
      toast({ title: "Error de perfil", description: profileError.message, variant: "destructive" });
      return { role: null, freezerId: null };
    } else if (profileData) {
      return { role: profileData.role, freezerId: profileData.current_freezer_id };
    }
    return { role: null, freezerId: null };
  }, [toast]);

  const fetchFreezerName = useCallback(async (freezerId: string | null) => {
    if (!freezerId) return null;
    const { data, error } = await supabase
      .from('freezers')
      .select('name')
      .eq('id', freezerId)
      .single();

    if (error) {
      console.error("Error fetching freezer name:", error);
      return null;
    }
    return data?.name || null;
  }, []);

  const checkUserAndLoadData = useCallback(async () => {
    setLoading(true);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error getting session:", sessionError);
      toast({ title: "Error de sesión", description: sessionError.message, variant: "destructive" });
      navigate('/');
      setLoading(false);
      return;
    }

    if (!session) {
      navigate('/');
      setLoading(false);
      return;
    }

    setUser(session.user);
    const { role, freezerId } = await fetchUserProfile(session.user.id);
    console.log("ChangeFreezerPage - Fetched Profile Data:", { role, freezerId }); // Nuevo log
    setUserRole(role);
    setCurrentFreezerId(freezerId);
    setSelectedFreezerId(freezerId); // Set initial selection

    const name = await fetchFreezerName(freezerId);
    console.log("ChangeFreezerPage - Fetched Freezer Name:", name); // Nuevo log
    setCurrentFreezerName(name);

    // Fetch all freezers
    const { data: freezersData, error: freezersError } = await supabase
      .from('freezers')
      .select('id, name');

    if (freezersError) {
      console.error("Error fetching freezers:", freezersError);
      toast({
        title: "Error",
        description: "No se pudieron cargar los congeladores.",
        variant: "destructive",
      });
    } else {
      setFreezers(freezersData || []);
      console.log("ChangeFreezerPage - Fetched All Freezers:", freezersData); // Nuevo log
    }
    setLoading(false);
  }, [navigate, toast, fetchUserProfile, fetchFreezerName]);

  useEffect(() => {
    checkUserAndLoadData();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/');
      } else {
        setUser(session.user);
        checkUserAndLoadData();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, checkUserAndLoadData]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const newFreezerId = selectedFreezerId === "none" ? null : selectedFreezerId;

    const { error } = await supabase
      .from('profiles')
      .update({ current_freezer_id: newFreezerId })
      .eq('id', user.id);

    if (error) {
      console.error("Error al actualizar el congelador asociado:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el congelador asociado.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Congelador asociado actualizado correctamente.",
      });
      navigate('/app'); // Go back to the main app page
      console.log("ChangeFreezerPage - Navigated back to /app after saving."); // Nuevo log
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Cargando...</p>
      </div>
    );
  }

  console.log("ChangeFreezerPage - Render State: userRole:", userRole, "currentFreezerName:", currentFreezerName, "freezers:", freezers); // Log de depuración final

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <AppHeader
        userEmail={user?.email}
        userRole={userRole}
        currentFreezerName={currentFreezerName}
      />

      <Card className="w-full max-w-md mx-auto mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">Seleccionar Congelador</CardTitle>
        </CardHeader>
        <CardContent>
          {freezers.length === 0 && (
            <p className="text-center text-gray-500">No hay congeladores registrados.</p>
          )}
          <RadioGroup
            value={selectedFreezerId || "none"}
            onValueChange={setSelectedFreezerId}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="freezer-none" />
              <Label htmlFor="freezer-none">Ninguno</Label>
            </div>
            {freezers.map((freezer) => (
              <div key={freezer.id} className="flex items-center space-x-2">
                <RadioGroupItem value={freezer.id} id={`freezer-${freezer.id}`} />
                <Label htmlFor={`freezer-${freezer.id}`}>{freezer.name}</Label>
              </div>
            ))}
          </RadioGroup>
          <Button onClick={handleSave} className="w-full mt-6" disabled={loading}>
            Guardar Selección
          </Button>
          <Button variant="outline" onClick={() => navigate('/app')} className="w-full mt-2">
            Cancelar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangeFreezerPage;