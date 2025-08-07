import { MadeWithDyad } from "@/components/made-with-dyad";
import SupabaseDataFetcher from "@/components/SupabaseDataFetcher"; // Import the component

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Blank App</h1>
        <p className="text-xl text-gray-600">
          Start building your amazing project here!
        </p>
      </div>
      
      {/* Add the SupabaseDataFetcher component here */}
      <SupabaseDataFetcher />

      <MadeWithDyad />
    </div>
  );
};

export default Index;