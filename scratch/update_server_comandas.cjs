const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Replace imports
code = code.replace(
  'import { agendaRouter } from "./src/backend/routes/agendaRoutes";',
  'import { agendaRouter } from "./src/backend/routes/agendaRoutes";\nimport { comandaRouter } from "./src/backend/routes/comandaRoutes";\nimport { financeRouter } from "./src/backend/routes/financeRoutes";'
);

code = code.replace(
  'app.use("/api", agendaRouter);',
  'app.use("/api", agendaRouter);\napp.use("/api/comandas", comandaRouter);\napp.use("/api", financeRouter);'
);

function removeChunk(startStr, endStr) {
  let startStrUnix = startStr.replace(/\r\n/g, '\n');
  let s = code.indexOf(startStr);
  if (s === -1) s = code.indexOf(startStrUnix);
  if (s === -1) {
    console.log("Chunk start not found:", startStr.substring(0, 50));
    return;
  }
  let endStrUnix = endStr.replace(/\r\n/g, '\n');
  let e = code.indexOf(endStr);
  if (e === -1) e = code.indexOf(endStrUnix);
  if (e === -1) {
    console.log("Chunk end not found:", endStr.substring(0, 50));
    return;
  }
  code = code.slice(0, s) + code.slice(e);
}

removeChunk(
  'app.get("/api/comandas"', 
  '// ═════════════════════════════════════════════════════════════\r\n//  SETTINGS — Working Hours por tenant'
);

fs.writeFileSync('server.ts', code);
console.log("Comandas and Finance removed successfully");
