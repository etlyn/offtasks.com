import { startAnalytics } from "./analytics";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

const stopAnalytics = startAnalytics();
if (import.meta.hot) import.meta.hot.dispose(stopAnalytics);

createRoot(document.getElementById("root")!).render(<App />);
