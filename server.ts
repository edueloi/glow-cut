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
import { wppRouter } from "./src/backend/routes/wppRoutes";
import { sectorRouter } from "./src/backend/routes/sectorRoutes";
import { publicBookingRouter } from "./src/backend/routes/publicBookingRoutes";
import { preferencesRouter } from "./src/backend/routes/preferencesRoutes";
import { blogPublicRouter, blogAdminRouter } from "./src/backend/routes/blogRoutes";

// Import middleware
import { requireAuth, requireSuperAdmin } from "./src/backend/middleware/auth";

// Import controllers
import { adminController } from "./src/backend/controllers/adminController";
import { agendaController } from "./src/backend/controllers/agendaController";

// Import Baileys session manager
import { restoreAllSessions } from "./src/backend/wpp/baileys-manager";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));

// ── TERMINAL PAT (Bypass absoluto de autenticação) ────────────────────────────
app.get("/terminal/pat/:professionalId", agendaController.getPatQueue);
app.get("/terminal/pat-general/:slug", agendaController.getPatGeneral);
app.patch("/terminal/pat-status/:appointmentId", agendaController.patchPatStatus);
app.get("/terminal/availability", agendaController.getAvailability);

// ── Autenticação (público — sem requireAuth) ──────────────────────────────────
app.use("/api/auth", authRouter);
// Manter compatibilidade com clientes antigos (remove após deploy estável)
app.post("/api/login", adminController.unifiedLogin);
app.get("/api/tenant-by-slug/:slug", adminController.getTenantBySlug);
app.use("/api/public", publicBookingRouter);
app.use("/api/blog", blogPublicRouter);

// ── Rotas que requerem autenticação ──────────────────────────────────────────
// IMPORTANTE: rotas mais específicas ANTES das genéricas
app.use("/api/super-admin/blog", requireSuperAdmin, blogAdminRouter);
app.use("/api/super-admin", requireSuperAdmin, superAdminRouter);
app.use("/api/admin", requireAuth, adminRouter);
app.use("/api/clients", requireAuth, clientRouter);
app.use("/api/professionals", requireAuth, professionalRouter);
app.use("/api/services", requireAuth, serviceRouter);
app.use("/api/comandas", requireAuth, comandaRouter);
app.use("/api/finance", requireAuth, financeRouter);
app.use("/api/products", requireAuth, productRouter);
app.use("/api/sectors", requireAuth, sectorRouter);
app.use("/api/reports", requireAuth, reportRouter);
app.use("/api/inventory", requireAuth, inventoryRouter);
app.use("/api/preferences", requireAuth, preferencesRouter);
app.use("/api/wpp", requireAuth, wppRouter);

// ── Agenda: PAT e availability são públicos, o resto precisa de auth ─────────
app.use("/api", agendaPublicRouter);
app.use("/api", requireAuth, agendaRouter);

// Servir uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ─────────────────────────────────────────────────────────────
//  AUTO-MIGRATION / SEED
// ─────────────────────────────────────────────────────────────
async function initDb() {
  // ── UserPreferences ───────────────────────────────────────────────────────
  try {
    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS UserPreferences (
        id       VARCHAR(36)  NOT NULL PRIMARY KEY,
        userId   VARCHAR(36)  NOT NULL,
        userType VARCHAR(20)  NOT NULL DEFAULT 'admin',
        tenantId VARCHAR(36)  NOT NULL,
        preferences TEXT      NOT NULL,
        updatedAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_userprefs_user (userId, userType),
        KEY idx_userprefs_tenant (tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) {
    console.warn("[initDb] UserPreferences:", e?.message);
  }

  // ── WppMessageSent (deduplicação de lembretes) ────────────────────────────
  try {
    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS WppMessageSent (
        id            VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        appointmentId VARCHAR(36)  NOT NULL,
        type          VARCHAR(50)  NOT NULL,
        tenantId      VARCHAR(36)  NOT NULL,
        sentAt        DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_wpp_sent (appointmentId, type),
        KEY idx_wpp_sent_tenant (tenantId),
        KEY idx_wpp_sent_at (sentAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) {
    console.warn("[initDb] WppMessageSent:", e?.message);
  }

  // ── Plan.wppEnabled ───────────────────────────────────────────────────────
  try {
    const colPlan: any[] = await (prisma as any).$queryRawUnsafe(`SHOW COLUMNS FROM \`Plan\` LIKE 'wppEnabled'`);
    if (!colPlan.length) {
      await (prisma as any).$executeRawUnsafe(`ALTER TABLE \`Plan\` ADD COLUMN \`wppEnabled\` TINYINT(1) NOT NULL DEFAULT 0`);
      console.log("[initDb] Plan.wppEnabled added");
    }
  } catch (e: any) {
    console.warn("[initDb] Plan.wppEnabled:", e?.message);
  }

  // ── Tenant.wppOverride ────────────────────────────────────────────────────
  try {
    const colTenant: any[] = await (prisma as any).$queryRawUnsafe(`SHOW COLUMNS FROM \`Tenant\` LIKE 'wppOverride'`);
    if (!colTenant.length) {
      await (prisma as any).$executeRawUnsafe(`ALTER TABLE \`Tenant\` ADD COLUMN \`wppOverride\` TINYINT(1) NULL DEFAULT NULL`);
      console.log("[initDb] Tenant.wppOverride added");
    }
  } catch (e: any) {
    console.warn("[initDb] Tenant.wppOverride:", e?.message);
  }

  // ── Product.showOnSite + Product.brand ───────────────────────────────────
  for (const col of [
    { name: "showOnSite", def: "TINYINT(1) NOT NULL DEFAULT 0" },
    { name: "brand",      def: "VARCHAR(150) NULL" },
  ]) {
    try {
      const rows: any[] = await (prisma as any).$queryRawUnsafe(`SHOW COLUMNS FROM \`Product\` LIKE '${col.name}'`);
      if (!rows.length) {
        await (prisma as any).$executeRawUnsafe(`ALTER TABLE \`Product\` ADD COLUMN \`${col.name}\` ${col.def}`);
        console.log(`[initDb] Product.${col.name} added`);
      }
    } catch (e: any) {
      console.warn(`[initDb] Product.${col.name}:`, e?.message);
    }
  }

  // ── Tenant.siteCoverUrl ───────────────────────────────────────────────────
  try {
    const col: any[] = await (prisma as any).$queryRawUnsafe(`SHOW COLUMNS FROM \`Tenant\` LIKE 'siteCoverUrl'`);
    if (!col.length) {
      await (prisma as any).$executeRawUnsafe(`ALTER TABLE \`Tenant\` ADD COLUMN \`siteCoverUrl\` TEXT NULL`);
      console.log("[initDb] Tenant.siteCoverUrl added");
    }
  } catch (e: any) {
    console.warn("[initDb] Tenant.siteCoverUrl:", e?.message);
  }

  // ── WppBotConfig novos campos ─────────────────────────────────────────────
  const wppNewCols = [
    { name: "sendReminder60min",     def: "TINYINT(1) NOT NULL DEFAULT 1" },
    { name: "sendProfNewBooking",    def: "TINYINT(1) NOT NULL DEFAULT 1" },
    { name: "sendProfReminder24h",   def: "TINYINT(1) NOT NULL DEFAULT 1" },
    { name: "sendProfReminder60min", def: "TINYINT(1) NOT NULL DEFAULT 0" },
  ];
  for (const col of wppNewCols) {
    try {
      const rows: any[] = await (prisma as any).$queryRawUnsafe(`SHOW COLUMNS FROM \`WppBotConfig\` LIKE '${col.name}'`);
      if (!rows.length) {
        await (prisma as any).$executeRawUnsafe(`ALTER TABLE \`WppBotConfig\` ADD COLUMN \`${col.name}\` ${col.def}`);
        console.log(`[initDb] WppBotConfig.${col.name} added`);
      }
    } catch (e: any) {
      console.warn(`[initDb] WppBotConfig.${col.name}:`, e?.message);
    }
  }

  // ── Blog tables ───────────────────────────────────────────────────────────
  try {
    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS BlogCategory (
        id          VARCHAR(36)  NOT NULL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        slug        VARCHAR(120) NOT NULL,
        description VARCHAR(500) NULL,
        color       VARCHAR(20)  NOT NULL DEFAULT '#f59e0b',
        isActive    TINYINT(1)   NOT NULL DEFAULT 1,
        sortOrder   INT          NOT NULL DEFAULT 0,
        createdAt   DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_blogcategory_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) { console.warn("[initDb] BlogCategory:", e?.message); }

  try {
    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS BlogAuthor (
        id        VARCHAR(36)   NOT NULL PRIMARY KEY,
        name      VARCHAR(255)  NOT NULL,
        slug      VARCHAR(120)  NOT NULL,
        bio       VARCHAR(1000) NULL,
        photo     TEXT          NULL,
        role      VARCHAR(100)  NULL,
        instagram VARCHAR(255)  NULL,
        isActive  TINYINT(1)    NOT NULL DEFAULT 1,
        createdAt DATETIME(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_blogauthor_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) { console.warn("[initDb] BlogAuthor:", e?.message); }

  try {
    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS BlogPost (
        id             VARCHAR(36)  NOT NULL PRIMARY KEY,
        title          VARCHAR(500) NOT NULL,
        slug           VARCHAR(600) NOT NULL,
        excerpt        VARCHAR(1000) NULL,
        content        LONGTEXT     NOT NULL,
        coverImage     TEXT         NULL,
        status         VARCHAR(20)  NOT NULL DEFAULT 'draft',
        featured       TINYINT(1)   NOT NULL DEFAULT 0,
        categoryId     VARCHAR(36)  NULL,
        authorId       VARCHAR(36)  NULL,
        tags           VARCHAR(2000) NULL DEFAULT '[]',
        seoTitle       VARCHAR(500) NULL,
        seoDescription VARCHAR(500) NULL,
        seoKeywords    VARCHAR(500) NULL,
        views          INT          NOT NULL DEFAULT 0,
        readTimeMinutes INT         NOT NULL DEFAULT 5,
        publishedAt    DATETIME(0)  NULL,
        createdAt      DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt      DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_blogpost_slug (slug),
        KEY idx_blogpost_status_pub (status, publishedAt),
        KEY idx_blogpost_category (categoryId),
        KEY idx_blogpost_author (authorId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) { console.warn("[initDb] BlogPost:", e?.message); }

  try {
    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS BlogAnalytics (
        id     VARCHAR(36) NOT NULL PRIMARY KEY,
        postId VARCHAR(36) NOT NULL,
        date   DATE        NOT NULL,
        views  INT         NOT NULL DEFAULT 0,
        UNIQUE KEY uq_bloganalytics (postId, date),
        KEY idx_bloganalytics_post (postId),
        KEY idx_bloganalytics_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) { console.warn("[initDb] BlogAnalytics:", e?.message); }

  try {
    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS BlogSubscriber (
        id          VARCHAR(36)  NOT NULL PRIMARY KEY,
        email       VARCHAR(255) NOT NULL,
        name        VARCHAR(255) NULL,
        isActive    TINYINT(1)   NOT NULL DEFAULT 1,
        confirmedAt DATETIME(0)  NULL,
        createdAt   DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_blogsubscriber_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) { console.warn("[initDb] BlogSubscriber:", e?.message); }

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
initDb().then(() => {
  restoreAllSessions().catch((e) => console.warn("[Server] restoreAllSessions error:", e));
});

// ─────────────────────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));

    // ── SEO: Sitemap.xml ──────────────────────────────────────────────────
    app.get("/sitemap.xml", async (req, res) => {
      try {
        const posts = await (prisma as any).blogPost.findMany({ where: { status: "published" }, select: { slug: true, updatedAt: true } });
        const tenants = await (prisma as any).tenant.findMany({ where: { isActive: true }, select: { slug: true } });
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
        xml += `\n  <url><loc>https://agendelle.com.br/</loc><priority>1.0</priority></url>`;
        xml += `\n  <url><loc>https://agendelle.com.br/blog</loc><priority>0.8</priority></url>`;

        posts.forEach((p: any) => {
          xml += `\n  <url><loc>https://agendelle.com.br/blog/${p.slug}</loc><lastmod>${p.updatedAt.toISOString().split('T')[0]}</lastmod><priority>0.7</priority></url>`;
        });
        tenants.forEach((t: any) => {
          xml += `\n  <url><loc>https://agendelle.com.br/agendar/${t.slug}</loc><priority>0.6</priority></url>`;
        });

        xml += "\n</urlset>";
        res.header("Content-Type", "application/xml");
        res.send(xml);
      } catch { res.status(500).send("Error generating sitemap"); }
    });

    // ── SEO: Robots.txt ───────────────────────────────────────────────────
    app.get("/robots.txt", (req, res) => {
      res.type("text/plain");
      res.send("User-agent: *\nAllow: /\n\nSitemap: https://agendelle.com.br/sitemap.xml");
    });

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

    app.get("*", async (req, res) => {
      const url = req.path;
      const indexPath = path.join(distPath, "index.html");
      if (!fs.existsSync(indexPath)) return res.status(404).send("Index not found");
      let html = fs.readFileSync(indexPath, "utf-8");

      let title = "Agendelle | Agendamentos Inteligentes para Salões e Barbearias";
      let description = "Agendelle une organização inteligente com elegância — o sistema perfeito para salões e barbearias que querem crescer com profissionalismo.";
      let ogImage = "https://agendelle.com.br/assets/imagem-agendele-a9t6taIM.png";
      const canonical = `https://agendelle.com.br${url}`;

      if (url.startsWith("/blog/") && url.split("/").length === 3) {
        const slug = url.split("/")[2];
        try {
          const post = await (prisma as any).blogPost.findUnique({ where: { slug, status: "published" } });
          if (post) {
            title = post.seoTitle || post.title + " | Blog Agendelle";
            description = (post.seoDescription || post.excerpt || "Leia mais no blog da Agendelle.").replace(/"/g, '&quot;');
            if (post.coverImage) ogImage = post.coverImage.startsWith("http") ? post.coverImage : `https://agendelle.com.br${post.coverImage}`;
          }
        } catch (err) { console.error("SEO Blog Error:", err); }
      } else if (url === "/blog" || url === "/blog/") {
        title = "Blog Agendelle | Dicas e Tendências para Beleza";
        description = "Acompanhe as melhores dicas de gestão, tendências e tecnologia para o seu salão ou barbearia no blog oficial da Agendelle.";
      }

      const seoTags = `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${canonical}" />
    <link rel="icon" type="image/png" href="https://agendelle.com.br/favicon.png" />
    <link rel="apple-touch-icon" href="https://agendelle.com.br/favicon.png" />
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${ogImage}">
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:image" content="${ogImage}">
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Agendelle",
      "url": "https://agendelle.com.br",
      "logo": "https://agendelle.com.br/favicon.png",
      "description": "${description}"
    }
    </script>
      `;

      html = html.replace(/<title>.*?<\/title>/, "").replace("</head>", `${seoTags}</head>`);
      res.send(html);
    });
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => console.log(`🚀 Servidor modular rodando em http://localhost:${PORT}`));
}
startServer();
