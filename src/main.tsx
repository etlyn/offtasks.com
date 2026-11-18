// The foundations load first so page styles can build on (and override) them.
import "./styles/base.css";
import { startAnalytics } from "./analytics";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyTheme } from "./lib/theme";

// Light or Dark is set before the first paint, so pages never flash the other one.
applyTheme();

const stopAnalytics = startAnalytics();
if (import.meta.hot) import.meta.hot.dispose(stopAnalytics);

createRoot(document.getElementById("root")!).render(<App />);
