/**
 * Punto de entrada del frontend. Fija el idioma inicial (el del sistema) ANTES del primer render para que
 * la primera pantalla ya salga traducida, y monta <App />.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/global.css";
import { App } from "./app/App";
import { setLang, systemLang } from "./i18n";

setLang(systemLang());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
