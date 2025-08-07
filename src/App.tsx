import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import ChangeFreezerPage from "./pages/ChangeFreezerPage";
import AddItemPage from "./pages/AddItemPage"; // Import the new page

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPage />} /> {/* AuthPage is now the default route */}
          <Route path="/app" element={<Index />} /> {/* Main app content moved to /app */}
          <Route path="/change-freezer" element={<ChangeFreezerPage />} /> {/* New route for changing freezer */}
          <Route path="/add-item" element={<AddItemPage />} /> {/* New route for adding items */}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;