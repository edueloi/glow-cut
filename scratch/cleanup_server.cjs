const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Replace imports
code = code.replace(
  'import { financeRouter } from "./src/backend/routes/financeRoutes";',
  'import { financeRouter } from "./src/backend/routes/financeRoutes";\nimport { productRouter } from "./src/backend/routes/productRoutes";\nimport { reportRouter } from "./src/backend/routes/reportRoutes";'
);

code = code.replace(
  'app.use("/api", financeRouter);',
  'app.use("/api", financeRouter);\napp.use("/api/products", productRouter);\napp.use("/api/reports", reportRouter);'
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

// Remove from SETTINGS to start of startServer
removeChunk(
  '// ═════════════════════════════════════════════════════════════\r\n//  SETTINGS — Working Hours por tenant',
  '// ═════════════════════════════════════════════════════════════\r\n//  START SERVER'
);

fs.writeFileSync('server.ts', code);
console.log("Server cleanup complete");
