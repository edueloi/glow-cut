const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// replace 1: adds imports
code = code.replace(
  'import { superAdminRouter } from "./src/backend/routes/superAdmin";',
  'import { superAdminRouter } from "./src/backend/routes/superAdmin";\nimport { adminRouter } from "./src/backend/routes/adminRoutes";'
);

// replace 2: add app.use after app.use(express.json())
code = code.replace(
  'app.use(express.json({ limit: "20mb" }));',
  'app.use(express.json({ limit: "20mb" }));\n\napp.use("/api/super-admin", superAdminRouter);\napp.use("/api/admin", adminRouter);'
);

// We should replace everything from `// Mantido para compatibilidade` down to the end of `app.post("/api/admin/login"...` 
const start1 = code.indexOf('// Mantido para compatibilidade\r\napp.post("/api/super-admin/login"');
let start1Unix = code.indexOf('// Mantido para compatibilidade\napp.post("/api/super-admin/login"');
let s1 = start1 !== -1 ? start1 : start1Unix;

const end1 = code.indexOf('// ═════════════════════════════════════════════════════════════\r\n//  RESOLVE SLUG → TENANT');
let end1Unix = code.indexOf('// ═════════════════════════════════════════════════════════════\n//  RESOLVE SLUG → TENANT');
let e1 = end1 !== -1 ? end1 : end1Unix;

if (s1 !== -1 && e1 !== -1) {
  code = code.slice(0, s1) + code.slice(e1);
} else {
  console.log("Chunk 1 not found", s1, e1);
}

// Then remove the tenant and branding admin routes
const start2 = code.indexOf('app.get("/api/admin/tenant"');
const end2Str = '// ═════════════════════════════════════════════════════════════\r\n//  CLIENTS — isolado por tenant';
const end2StrUnix = '// ═════════════════════════════════════════════════════════════\n//  CLIENTS — isolado por tenant';
let e2 = code.indexOf(end2Str) !== -1 ? code.indexOf(end2Str) : code.indexOf(end2StrUnix);

if (start2 !== -1 && e2 !== -1) {
  code = code.slice(0, start2) + code.slice(e2);
} else {
  console.log("Chunk 2 not found", start2, e2);
}

fs.writeFileSync('server.ts', code);
