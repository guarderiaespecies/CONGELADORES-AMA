import React, { useState } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import SupabaseDataFetcher from "@/components/SupabaseDataFetcher";
import AddItemForm from "@/components/AddItemForm";
import { Button } from "@/components/ui/button"; // Import Button
import { Link } from "react-router-dom"; // Import Link

const Index = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNewItemAdded = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Blank App</h1>
        <p className="text-xl text-gray-600">
          Start building your amazing project here!
        </p>
        <div className="mt-4">
          <Link to="/auth">
            <Button>Ir a Autenticación</Button>
          </Link>
        </div>
      </div>
      
      <AddItemForm onNewItemAdded={handleNewItemAdded} />

      <SupabaseDataFetcher key={refreshKey} />

      <MadeWithDyad />
    </div>
  );
};

export default Index;