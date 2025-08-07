import React, { useState } from "react"; // Import useState
import { MadeWithDyad } from "@/components/made-with-dyad";
import SupabaseDataFetcher from "@/components/SupabaseDataFetcher";
import AddItemForm from "@/components/AddItemForm"; // Import the new component

const Index = () => {
  const [refreshKey, setRefreshKey] = useState(0); // State to force SupabaseDataFetcher refresh

  const handleNewItemAdded = () => {
    setRefreshKey(prevKey => prevKey + 1); // Increment key to force re-render of SupabaseDataFetcher
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Blank App</h1>
        <p className="text-xl text-gray-600">
          Start building your amazing project here!
        </p>
      </div>
      
      {/* Add the AddItemForm component here */}
      <AddItemForm onNewItemAdded={handleNewItemAdded} />

      {/* Add the SupabaseDataFetcher component here, with a key to force refresh */}
      <SupabaseDataFetcher key={refreshKey} />

      <MadeWithDyad />
    </div>
  );
};

export default Index;