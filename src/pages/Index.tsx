import { MadeWithDyad } from "@/components/made-with-dyad";
import SupabaseDataFetcher from "@/components/SupabaseDataFetcher";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Bienvenido a tu Aplicación Dyad</h1>
        <p className="text-xl text-gray-600">
          ¡Aquí puedes empezar a construir tu increíble proyecto!
        </p>
      </div>
      <SupabaseDataFetcher />
      <MadeWithDyad />
    </div>
  );
};

export default Index;