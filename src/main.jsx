// ============================================================
// main.jsx — Application Entry Point
// Provider hierarchy: BrowserRouter → AuthProvider → AppointmentsProvider → App
// ============================================================

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppointmentsProvider } from "./context/AppointmentsContext";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      {/* AuthProvider must wrap AppointmentsProvider since appointments depends on currentUser */}
      <AuthProvider>
        <AppointmentsProvider>
          <App />
        </AppointmentsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
