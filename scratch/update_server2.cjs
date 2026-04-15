const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Replace imports
code = code.replace(
  'import { adminRouter } from "./src/backend/routes/adminRoutes";',
  'import { adminRouter } from "./src/backend/routes/adminRoutes";\nimport { clientRouter } from "./src/backend/routes/clientRoutes";\nimport { professionalRouter } from "./src/backend/routes/professionalRoutes";\nimport { serviceRouter } from "./src/backend/routes/serviceRoutes";'
);

code = code.replace(
  'app.use("/api/admin", adminRouter);',
  'app.use("/api/admin", adminRouter);\napp.use("/api/clients", clientRouter);\napp.use("/api/professionals", professionalRouter);\napp.use("/api/services", serviceRouter);'
);

function removeChunk(startStr, endStr) {
  let s = code.indexOf(startStr);
  if (s === -1) {
    console.log("Chunk start not found:", startStr.substring(0, 50));
    return;
  }
  let endStrUnix = endStr.replace(/\r\n/g, '\n');
  let e = code.indexOf(endStr);
  if (e === -1) {
    e = code.indexOf(endStrUnix);
  }
  if (e === -1) {
    console.log("Chunk end not found:", endStr.substring(0, 50));
    return;
  }
  code = code.slice(0, s) + code.slice(e);
}

removeChunk('app.get("/api/clients"', '// ═════════════════════════════════════════════════════════════\r\n//  PROFESSIONALS — isolado por tenant');
removeChunk('app.get("/api/professionals"', '// ═════════════════════════════════════════════════════════════\r\n//  SERVICES — isolado por tenant');
removeChunk('app.get("/api/services"', '// ─── Helpers de template WPP ──────────────────────────────────');

fs.writeFileSync('server.ts', code);
console.log("File updated succefully");
