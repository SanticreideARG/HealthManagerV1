import { Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "./features/landing/LandingPage.js";
import { PanelApp } from "./PanelApp.js";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/panel/*" element={<PanelApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
