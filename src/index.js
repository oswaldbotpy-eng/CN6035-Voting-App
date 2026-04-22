import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

/**
 * Application entry point.
 *
 * Upgraded from ReactDOM.render() (React 17) to createRoot() (React 18).
 * createRoot enables concurrent features and eliminates the legacy
 * rendering warning seen in the original codebase.
 *
 * React.StrictMode is retained — it double-invokes renders in development
 * to surface side effects, which helped identify the render-phase
 * state mutations in ResultModal and Main during development.
 */
const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
