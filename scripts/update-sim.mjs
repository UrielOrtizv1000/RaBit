/**
 * Abre RaBit en desarrollo con la SIMULACIÓN de actualizaciones activada (VITE_RABIT_UPDATE_SIM=1): aparece el ícono,
 * el panel, el progreso y el «reinicio» sin publicar nada.
 * Uso: npm run update-sim        (app de escritorio, `tauri dev`)
 *      npm run update-sim:web    (solo el navegador, http://localhost:1420)
 */
import { spawn } from "node:child_process";

const args = process.argv.includes("--web") ? ["run", "dev"] : ["run", "tauri", "dev"];
const child = spawn("npm", args, { stdio: "inherit", shell: true, env: { ...process.env, VITE_RABIT_UPDATE_SIM: "1" } });
child.on("exit", (code) => process.exit(code ?? 0));
