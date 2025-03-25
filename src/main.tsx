import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.tsx";

const kmtRoot = "kmt-root";
if (!document.getElementById(kmtRoot)) {
  const root = document.createElement("div");
  root.id = kmtRoot;
  document.body.appendChild(root);
}

createRoot(document.getElementById(kmtRoot)!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
