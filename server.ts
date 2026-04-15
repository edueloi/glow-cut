import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { randomUUID } from "crypto";

// Import routers
import { authRouter } from "./src/backend/routes/authRoutes";
import { superAdminRouter } from "./src/backend/routes/superAdmin";
import { adminRouter } from "./src/backend/routes/adminRoutes";
import { clientRouter } from "./src/backend/routes/clientRoutes";
import { professionalRouter } from "./src/backend/routes/professionalRoutes";
import { serviceRouter } from "./src/backend/routes/serviceRoutes";
import { agendaRouter, agendaPublicRouter } from "./src/backend/routes/agendaRoutes";
import { comandaRouter } from "./src/backend/routes/comandaRoutes";
import { financeRouter } from "./src/backend/routes/financeRoutes";
import { productRouter } from "./src/backend/routes/productRoutes";
import { reportRouter } from "./src/backend/routes/reportRoutes";
import { inventoryRouter } from "./src/backend/routes/inventoryRoutes";

// Import middleware
import { requireAuth, requireSuperAdmin } from "./src/backend/middleware/auth";

// Import controllers
import { adminController } from "./src/backend/controllers/adminController";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));

// ── Autenticação (público — sem requireAuth) ──────────────────────────────────
app.use("/api/auth", authRouter);
// Manter compatibilidade com clientes antigos (remove após deploy estável)
app.post("/api/login", adminController.unifiedLogin);
app.get("/api/tenant-by-slug/:slug", adminController.getTenantBySlug);

// ── Rotas que requerem autenticação ──────────────────────────────────────────
app.use("/api/super-admin", requireSuperAdmin, superAdminRouter);
app.use("/api/admin", requireAuth, adminRouter);
app.use("/api/clients", requireAuth, clientRouter);
app.use("/api/professionals", requireAuth, professionalRouter);
app.use("/api/services", requireAuth, serviceRouter);
app.use("/api/comandas", requireAuth, comandaRouter);
app.use("/api", requireAuth, financeRouter);
app.use("/api/products", requireAuth, productRouter);
app.use("/api/reports", requireAuth, reportRouter);
app.use("/api/inventory", requireAuth, inventoryRouter);

// ── Agenda: PAT e availability são públicos, o resto precisa de auth ─────────
app.use("/api", agendaPublicRouter);
app.use("/api", requireAuth, agendaRouter);

// Servir uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ─────────────────────────────────────────────────────────────
//  AUTO-MIGRATION / SEED
// ─────────────────────────────────────────────────────────────
async function initDb() {
  try {
    const sa = await (prisma as any).superAdmin.findFirst({ where: { username: "Admin" } });
    if (!sa) await (prisma as any).superAdmin.create({ data: { id: randomUUID(), username: "Admin", password: "super123" } });
    
    const planCount = await (prisma as any).plan.count();
    if (planCount === 0) {
      await (prisma as any).plan.createMany({
        data: [
          { id: randomUUID(), name: "Básico",     price: 49.90,  maxProfessionals: 2,   maxAdminUsers: 1,   canCreateAdminUsers: false, canDeleteAccount: false, features: JSON.stringify(["Agenda","Clientes","Serviços"]) },
          { id: randomUUID(), name: "Pro",        price: 99.90,  maxProfessionals: 5,   maxAdminUsers: 3,   canCreateAdminUsers: true,  canDeleteAccount: false, features: JSON.stringify(["Agenda","Clientes","Serviços","Comandas","Fluxo de Caixa","Relatórios"]) },
          { id: randomUUID(), name: "Enterprise", price: 199.90, maxProfessionals: 999, maxAdminUsers: 999, canCreateAdminUsers: true,  canDeleteAccount: true,  features: JSON.stringify(["Tudo do Pro","Multi-usuários ilimitados","Profissionais ilimitados","Suporte prioritário"]) },
        ]
      });
    }
  } catch (e) {
    console.error("Erro no initDb:", e);
  }
}
initDb();

// ─────────────────────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));

    app.get("/agendar/:slug/manifest.json", async (req, res) => {
      const { slug } = req.params;
      try {
        const tenant = await (prisma as any).tenant.findFirst({ where: { slug, isActive: true } });
        if (!tenant) return res.status(404).json({});
        const icon = tenant.logoUrl || "/favicon-celular.png";
        res.json({
          name: tenant.name, short_name: tenant.name.split(" ")[0], display: "standalone",
          start_url: `/agendar/${slug}`, background_color: "#ffffff", theme_color: tenant.themeColor || "#c9a96e",
          icons: [ { src: icon, sizes: "192x192", type: "image/png" }, { src: icon, sizes: "512x512", type: "image/png" } ]
        });
      } catch { res.status(500).json({}); }
    });

    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => console.log(`🚀 Servidor modular rodando em http://localhost:${PORT}`));
}
startServer();
