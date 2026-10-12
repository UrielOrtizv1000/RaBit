/**
 * Abre la app de escritorio en desarrollo con la SIMULACIÓN de actualizaciones activada
 * (VITE_RABIT_UPDATE_SIM=1): aparece el ícono, el panel, el progreso y el «reinicio» sin publicar nada.
 * Uso: npm run tauri:update-sim
 */
import { spawn } from "node:child_process";

const child = spawn("npm", ["run", "tauri", "dev"], { stdio: "inherit", shell: true, env: { ...process.env, VITE_RABIT_UPDATE_SIM: "1" } });
child.on("exit", (code) => process.exit(code ?? 0));
