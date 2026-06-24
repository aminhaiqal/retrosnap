import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";

import { AppRoutes } from "@/app/routes";
import { syncManager } from "@/sync/syncManager";

export function App() {
  useEffect(() => {
    void syncManager.init();
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="top-center" richColors closeButton />
    </BrowserRouter>
  );
}
