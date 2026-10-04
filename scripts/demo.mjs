import { spawn } from "node:child_process";
const url = "http://localhost:1420/?seed";
const dev = spawn("npm", ["run", "dev"], { stdio: "inherit", shell: true });
setTimeout(() => spawn("cmd", ["/c", "start", "", url], { stdio: "ignore" }), 2500);
console.log(`\nAbriendo ${url} — Ctrl+C para salir`);
process.on("SIGINT", () => {
  dev.kill();
  process.exit(0);
});
