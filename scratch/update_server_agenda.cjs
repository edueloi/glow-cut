const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Replace imports
code = code.replace(
  'import { serviceRouter } from "./src/backend/routes/serviceRoutes";',
  'import { serviceRouter } from "./src/backend/routes/serviceRoutes";\nimport { agendaRouter } from "./src/backend/routes/agendaRoutes";'
);

code = code.replace(
  'app.use("/api/services", serviceRouter);',
  'app.use("/api/services", serviceRouter);\napp.use("/api", agendaRouter);'
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

removeChunk('// ─── Helpers de template WPP ──────────────────────────────────', '// ═════════════════════════════════════════════════════════════\r\n//  COMANDAS — isolado por tenant');

fs.writeFileSync('server.ts', code);
console.log("Agenda removed successfully");
