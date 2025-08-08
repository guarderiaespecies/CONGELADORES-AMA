import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import ChangeFreezerPage from "./pages/ChangeFreezerPage";
import AddItemPage from "./pages/AddItemPage";
import RemoveItemPage from "./pages/RemoveItemPage";
import EditItemPage from "./pages/EditItemPage"; // Import the new page

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/app" element={<Index />} />
          <Route path="/change-freezer" element={<ChangeFreezerPage />} />
          <Route path="/add-item" element={<AddItemPage />} />
          <Route path="/remove-item" element={<RemoveItemPage />} />
          <Route path="/edit-item" element={<EditItemPage />} /> {/* New route for editing items */}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;