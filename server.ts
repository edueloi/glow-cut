import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { prisma } from "./src/backend/prisma";

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

// const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));

// ── ONBOARDING FIX ────────────────────────────────────────────────────────────
app.post("/api/admin/onboarding/update", requireAuth, adminController.updateOnboarding);

// ── TERMINAL PAT (Bypass absoluto de autenticação) ────────────────────────────
app.get("/terminal/pat/:professionalId", agendaController.getPatQueue);
app.get("/terminal/pat-general/:slug", agendaController.getPatGeneral);
app.patch("/terminal/pat-status/:appointmentId", agendaController.patchPatStatus);
app.get("/terminal/availability", agendaController.getAvailability);

// ── Autenticação (público — sem requireAuth) ──────────────────────────────────
app.use("/api/auth", authRouter);
app.get("/api/public/platform-contacts", async (req, res) => {
  try {
    const contacts = await (prisma as any).platformContact.findMany({
      where: { isActive: true },
      select: { type: true, phone: true, isPrimary: true }
    });
    res.json(contacts);
  } catch (e) {
    res.json([]);
  }
});
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

  // ── Plan Columns (Auto-migration) ─────────────────────────────────────────
  const planCols = [
    { name: "wppEnabled",             def: "TINYINT(1) NOT NULL DEFAULT 0" },
    { name: "systemBotEnabled",      def: "TINYINT(1) NOT NULL DEFAULT 1" },
    { name: "qrCodeBotEnabled",      def: "TINYINT(1) NOT NULL DEFAULT 0" },
    { name: "siteEnabled",           def: "TINYINT(1) NOT NULL DEFAULT 1" },
    { name: "agendaExternaEnabled",  def: "TINYINT(1) NOT NULL DEFAULT 1" },
    { name: "priceExtraProfessional", def: "DOUBLE NOT NULL DEFAULT 0" },
    { name: "permissions",           def: "VARCHAR(2000) DEFAULT '[]'" },
  ];

  for (const col of planCols) {
    try {
      const rows: any[] = await (prisma as any).$queryRawUnsafe(`SHOW COLUMNS FROM \`Plan\` LIKE '${col.name}'`);
      if (!rows.length) {
        await (prisma as any).$executeRawUnsafe(`ALTER TABLE \`Plan\` ADD COLUMN \`${col.name}\` ${col.def}`);
        console.log(`[initDb] Plan.${col.name} added`);
      }
    } catch (e: any) {
      console.warn(`[initDb] Plan.${col.name}:`, e?.message);
    }
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

const SITE_URL = "https://agendelle.com.br";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

function escapeHtml(value: string = ""): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function escapeAttribute(value: string = ""): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(value: string = ""): string {
  return decodeBasicEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToParagraphs(value: string = ""): string[] {
  const normalized = decodeBasicEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|h[1-6]|blockquote|tr)>/gi, "\n")
      .replace(/<img[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );

  return normalized
    .split(/\n+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function absoluteUrl(value: string | null | undefined): string {
  if (!value) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function formatDateBr(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

function injectRootMarkup(html: string, markup: string): string {
  if (!markup) return html;

  const rootPattern = /<div id="root">\s*<\/div>/i;
  if (rootPattern.test(html)) {
    return html.replace(rootPattern, `<div id="root">${markup}</div>`);
  }

  return html.replace("</body>", `${markup}</body>`);
}

function renderPostTeasers(posts: any[]): string {
  return posts
    .map((post) => {
      const href = `/blog/${post.slug}`;
      const category = post.category?.name ? `<p>${escapeHtml(post.category.name)}</p>` : "";
      const excerptSource = post.excerpt || stripHtml(post.content || "");
      const excerpt = excerptSource ? truncate(stripHtml(excerptSource), 220) : "";
      const publishedAt = formatDateBr(post.publishedAt);

      return `
        <article>
          ${category}
          <h2><a href="${escapeAttribute(href)}">${escapeHtml(post.title)}</a></h2>
          ${publishedAt ? `<p>${escapeHtml(publishedAt)}</p>` : ""}
          ${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ""}
          <p><a href="${escapeAttribute(href)}">Ler artigo completo</a></p>
        </article>
      `;
    })
    .join("");
}

// ─────────────────────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    console.log(" [Server] Iniciando em MODO PRODUÇÃO com SEO Ativo");
    const distPath = path.join(process.cwd(), "dist");

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
      res.send("User-agent: *\nAllow: /\nUser-agent: facebookexternalhit\nAllow: /\nUser-agent: Facebot\nAllow: /\n\nSitemap: https://agendelle.com.br/sitemap.xml");
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

    // ── INTERCEPTADOR DE PÁGINAS (SEO) ────────────────────────────────────
    // Esta rota deve vir ANTES do express.static para não entregar o index.html puro
    app.get(["/", "/blog", "/blog/", "/blog/*", "/p/*", "/agendar", "/agendar/", "/agendar/*"], async (req, res, next) => {
      try {
        const url = req.path;
        const indexPath = path.join(distPath, "index.html");

        if (!fs.existsSync(indexPath)) return next();

        console.log(`[SEO] Processando meta-tags para: ${url}`);
        let html = fs.readFileSync(indexPath, "utf-8");

        const canonicalPath = url === "/" ? "/" : url.replace(/\/+$/, "");
        const canonical = `${SITE_URL}${canonicalPath}`;
        const blogMatch = canonicalPath.match(/^\/blog\/([^/]+)$/);
        const agendarMatch = canonicalPath.match(/^\/agendar\/([^/]+)$/);
        const profMatch = canonicalPath.match(/^\/p\/([^/]+)$/);
        const isBlogIndex = canonicalPath === "/blog";
        const isHome = canonicalPath === "/";

        let title = "Agendelle | Agendamentos Inteligentes para Sal\u00f5es e Barbearias";
        let description = "Agendelle une organiza\u00e7\u00e3o inteligente com eleg\u00e2ncia e praticidade para sal\u00f5es, barbearias e neg\u00f3cios de beleza.";
        let keywords = "agendamento online, sistema para sal\u00e3o de beleza, barbearia, gest\u00e3o de est\u00e9tica, agendelle, blog agendelle";
        let ogImage = DEFAULT_OG_IMAGE;
        let ogType = "website";
        let robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
        let bodyMarkup = "";
        let statusCode = 200;
        let schemaItems: any[] = [
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: "Agendelle",
            url: SITE_URL,
            logo: {
              "@type": "ImageObject",
              url: `${SITE_URL}/favicon.png`,
            },
            description,
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: "Agendelle",
            inLanguage: "pt-BR",
          },
        ];

        let articlePublishedTime = "";
        let articleModifiedTime = "";
        let articleSection = "";
        let articleTags: string[] = [];

        if (blogMatch) {
          const slug = blogMatch[1];
          const post = await (prisma as any).blogPost.findUnique({
            where: { slug, status: "published" },
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              content: true,
              coverImage: true,
              seoTitle: true,
              seoDescription: true,
              seoKeywords: true,
              publishedAt: true,
              updatedAt: true,
              readTimeMinutes: true,
              tags: true,
              categoryId: true,
              category: { select: { name: true, slug: true } },
              author: { select: { name: true, role: true } },
            },
          });

          if (!post) {
            statusCode = 404;
            robots = "noindex,follow";
            title = "Artigo n\u00e3o encontrado | Agendelle";
            description = "O artigo solicitado n\u00e3o foi encontrado no blog da Agendelle.";
            bodyMarkup = `
              <main data-seo-preview="not-found">
                <article>
                  <h1>${escapeHtml(title)}</h1>
                  <p>${escapeHtml(description)}</p>
                  <p><a href="/blog">Voltar para o blog da Agendelle</a></p>
                </article>
              </main>
            `;
            schemaItems.push({
              "@context": "https://schema.org",
              "@type": "WebPage",
              url: canonical,
              name: title,
              description,
              isPartOf: { "@id": `${SITE_URL}/#website` },
            });
          } else {
            title = post.seoTitle || `${post.title} | Blog Agendelle`;
            description = post.seoDescription || post.excerpt || "Leia mais no blog da Agendelle.";
            keywords = post.seoKeywords || keywords;
            ogImage = absoluteUrl(post.coverImage || null);
            ogType = "article";
            articlePublishedTime = post.publishedAt ? new Date(post.publishedAt).toISOString() : "";
            articleModifiedTime = post.updatedAt ? new Date(post.updatedAt).toISOString() : "";
            articleSection = post.category?.name || "";

            try {
              articleTags = JSON.parse(post.tags || "[]");
            } catch {
              articleTags = [];
            }

            const relatedWhere: any = {
              status: "published",
              id: { not: post.id },
            };
            if (post.categoryId) relatedWhere.categoryId = post.categoryId;

            const relatedPosts = await (prisma as any).blogPost.findMany({
              where: relatedWhere,
              take: 3,
              orderBy: { publishedAt: "desc" },
              select: {
                title: true,
                slug: true,
                excerpt: true,
                publishedAt: true,
              },
            });

            const paragraphs = htmlToParagraphs(post.content).slice(0, 24);
            const lead = truncate(stripHtml(post.excerpt || paragraphs.join(" ")), 240);
            const authorName = post.author?.name || "Equipe Agendelle";
            const authorRole = post.author?.role ? ` | ${post.author.role}` : "";
            const publishedAtLabel = formatDateBr(post.publishedAt);
            const updatedAtLabel = formatDateBr(post.updatedAt);
            const articleKeywords = keywords.split(",").map((item) => item.trim()).filter(Boolean);

            bodyMarkup = `
              <main data-seo-preview="blog-post">
                <article>
                  <header>
                    ${post.category?.name ? `<p>${escapeHtml(post.category.name)}</p>` : ""}
                    <h1>${escapeHtml(post.title)}</h1>
                    ${lead ? `<p>${escapeHtml(lead)}</p>` : ""}
                    ${post.coverImage ? `<img src="${escapeAttribute(ogImage)}" alt="${escapeAttribute(post.title)}" />` : ""}
                    <p>${escapeHtml([publishedAtLabel && `Publicado em ${publishedAtLabel}`, updatedAtLabel && `Atualizado em ${updatedAtLabel}`, `Leitura de ${post.readTimeMinutes || 1} min`].filter(Boolean).join(" | "))}</p>
                    <p>${escapeHtml(`${authorName}${authorRole}`)}</p>
                  </header>
                  ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
                  ${relatedPosts.length ? `
                    <section>
                      <h2>Mais conte\u00fados do blog</h2>
                      ${renderPostTeasers(relatedPosts)}
                    </section>
                  ` : ""}
                </article>
              </main>
            `;

            schemaItems.push(
              {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Agendelle", item: SITE_URL },
                  { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
                  { "@type": "ListItem", position: 3, name: post.title, item: canonical },
                ],
              },
              {
                "@context": "https://schema.org",
                "@type": "Article",
                headline: post.title,
                name: title,
                description,
                image: [ogImage],
                datePublished: articlePublishedTime || undefined,
                dateModified: articleModifiedTime || undefined,
                author: {
                  "@type": "Person",
                  name: authorName,
                },
                articleSection: articleSection || undefined,
                keywords: articleTags.length ? articleTags : articleKeywords,
                mainEntityOfPage: canonical,
                publisher: { "@id": `${SITE_URL}/#organization` },
              },
            );
          }
        } else if (isBlogIndex) {
          title = "Blog Agendelle | Dicas, SEO e Gest\u00e3o para Beleza";
          description = "Acompanhe no blog da Agendelle dicas de gest\u00e3o, atendimento, automa\u00e7\u00e3o, SEO e crescimento para sal\u00f5es, barbearias e neg\u00f3cios de beleza.";
          keywords = "blog agendelle, dicas para sal\u00e3o, SEO para beleza, barbearia, agendamento online, gest\u00e3o para sal\u00e3o";

          const posts = await (prisma as any).blogPost.findMany({
            where: { status: "published" },
            take: 12,
            orderBy: { publishedAt: "desc" },
            select: {
              title: true,
              slug: true,
              excerpt: true,
              publishedAt: true,
              category: { select: { name: true } },
            },
          });

          bodyMarkup = `
            <main data-seo-preview="blog-index">
              <section>
                <h1>Blog Agendelle</h1>
                <p>${escapeHtml(description)}</p>
              </section>
              <section>
                <h2>\u00daltimos artigos</h2>
                ${posts.length ? renderPostTeasers(posts) : "<p>Nenhum artigo publicado no momento.</p>"}
              </section>
            </main>
          `;

          schemaItems.push(
            {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              url: canonical,
              name: title,
              description,
              isPartOf: { "@id": `${SITE_URL}/#website` },
            },
            {
              "@context": "https://schema.org",
              "@type": "ItemList",
              itemListElement: posts.map((post: any, index: number) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `${SITE_URL}/blog/${post.slug}`,
                name: post.title,
              })),
            },
          );
        } else if (agendarMatch || profMatch) {
          const slug = (agendarMatch || profMatch)![1];
          const tenant = await (prisma as any).tenant.findFirst({ where: { slug, isActive: true } });

          if (!tenant) {
            statusCode = 404;
            robots = "noindex,follow";
            title = "P\u00e1gina n\u00e3o encontrada | Agendelle";
            description = "O espa\u00e7o solicitado n\u00e3o foi encontrado.";
            bodyMarkup = `
              <main data-seo-preview="partner-not-found">
                <article>
                  <h1>${escapeHtml(title)}</h1>
                  <p>${escapeHtml(description)}</p>
                </article>
              </main>
            `;
          } else {
            title = `${tenant.name} | Agendamento Online`;
            description = `Agende seu hor\u00e1rio em ${tenant.name}. Profissionalismo, praticidade e confirma\u00e7\u00e3o online em um s\u00f3 lugar.`;
            keywords = `agendamento, ${tenant.name}, sal\u00e3o, barbearia, agendelle`;
            ogImage = absoluteUrl(tenant.logoUrl);

            bodyMarkup = `
              <main data-seo-preview="partner-page">
                <article>
                  <h1>${escapeHtml(title)}</h1>
                  <p>${escapeHtml(description)}</p>
                  <p><a href="${escapeAttribute(canonicalPath)}">Abrir agendamento online</a></p>
                </article>
              </main>
            `;
          }

          schemaItems.push({
            "@context": "https://schema.org",
            "@type": "WebPage",
            url: canonical,
            name: title,
            description,
            isPartOf: { "@id": `${SITE_URL}/#website` },
          });
        } else if (isHome) {
          const latestPosts = await (prisma as any).blogPost.findMany({
            where: { status: "published" },
            take: 3,
            orderBy: { publishedAt: "desc" },
            select: {
              title: true,
              slug: true,
              excerpt: true,
              publishedAt: true,
              category: { select: { name: true } },
            },
          });

          bodyMarkup = `
            <main data-seo-preview="home">
              <section>
                <h1>Agendelle | Agendamentos Inteligentes para Sal\u00f5es e Barbearias</h1>
                <p>${escapeHtml(description)}</p>
                <p><a href="/blog">Acesse o blog da Agendelle</a></p>
              </section>
              ${latestPosts.length ? `
                <section>
                  <h2>\u00daltimos artigos do blog</h2>
                  ${renderPostTeasers(latestPosts)}
                </section>
              ` : ""}
            </main>
          `;

          schemaItems.push(
            {
              "@context": "https://schema.org",
              "@type": "WebPage",
              url: canonical,
              name: title,
              description,
              isPartOf: { "@id": `${SITE_URL}/#website` },
            },
            ...(latestPosts.length
              ? [{
                  "@context": "https://schema.org",
                  "@type": "ItemList",
                  itemListElement: latestPosts.map((post: any, index: number) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    url: `${SITE_URL}/blog/${post.slug}`,
                    name: post.title,
                  })),
                }]
              : []),
          );
        }

        const cleanTitle = escapeAttribute(title);
        const cleanDescription = escapeAttribute(description);
        const cleanKeywords = escapeAttribute(keywords);
        const cleanCanonical = escapeAttribute(canonical);
        const cleanOgImage = escapeAttribute(ogImage);
        const articleTagsMeta = articleTags
          .map((tag) => `<meta property="article:tag" content="${escapeAttribute(String(tag))}">`)
          .join("\n");

        const seoTags = `
    <title>${cleanTitle}</title>
    <meta name="description" content="${cleanDescription}">
    <meta name="keywords" content="${cleanKeywords}">
    <meta name="robots" content="${escapeAttribute(robots)}">
    <meta name="google-site-verification" content="4WE47kn3xYj8tvKqcZi4f4rnxN7nnlPF9CPrhd-tCdE" />
    <link rel="canonical" href="${cleanCanonical}" />
    <link rel="icon" type="image/png" href="${SITE_URL}/favicon.png" />
    <link rel="apple-touch-icon" href="${SITE_URL}/favicon.png" />
    <meta property="og:locale" content="pt_BR">
    <meta property="og:site_name" content="Agendelle">
    <meta property="og:type" content="${escapeAttribute(ogType)}">
    <meta property="og:url" content="${cleanCanonical}">
    <meta property="og:title" content="${cleanTitle}">
    <meta property="og:description" content="${cleanDescription}">
    <meta property="og:image" content="${cleanOgImage}">
    <meta property="og:image:secure_url" content="${cleanOgImage}">
    <meta property="og:image:alt" content="${cleanTitle}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${cleanTitle}">
    <meta name="twitter:description" content="${cleanDescription}">
    <meta name="twitter:image" content="${cleanOgImage}">
    <meta name="twitter:image:alt" content="${cleanTitle}">
    ${articlePublishedTime ? `<meta property="article:published_time" content="${escapeAttribute(articlePublishedTime)}">` : ""}
    ${articleModifiedTime ? `<meta property="article:modified_time" content="${escapeAttribute(articleModifiedTime)}">` : ""}
    ${articleSection ? `<meta property="article:section" content="${escapeAttribute(articleSection)}">` : ""}
    ${articleTagsMeta}
    <script type="application/ld+json">${safeJsonLd(schemaItems)}</script>
      `;

        // Remove tags dinâmicas existentes para evitar duplicação
        html = html
          .replace(/<title>[\s\S]*?<\/title>/i, "")
          .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
          .replace(/<meta\s+name=["']robots["'][^>]*>/gi, "")
          .replace(/<meta\s+name=["']keywords["'][^>]*>/gi, "")
          .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "")
          .replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, "")
          .replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, "")
          .replace(/<meta\s+property=["']twitter:[^"']*["'][^>]*>/gi, "")
          .replace(/<meta\s+name=["']google-site-verification["'][^>]*>/gi, "")
          .replace(/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/gi, "")
          .replace("</head>", `${seoTags}</head>`);
        function isBot(userAgent: string = ""): boolean {
          const bots = [
            "googlebot", "bingbot", "yandexbot", "duckduckbot", "slurp",
            "twitterbot", "facebookexternalhit", "linkedinbot", "embedly", 
            "baiduspider", "pinterest", "slackbot", "vkShare", "facebot", 
            "outbrain", "whatsapp", "telegrambot", "discordbot"
          ];
          const ua = userAgent.toLowerCase();
          return bots.some(bot => ua.includes(bot));
        }

        if (isBot(req.headers["user-agent"])) {
          console.log(`[SEO] Entregando markup para BOT: ${req.headers["user-agent"]}`);
          html = injectRootMarkup(html, bodyMarkup);
        } else {
          // Para usuários normais, removemos o markup mas mantemos as meta-tags para cache/history
          console.log(`[SEO] Usuário real, mantendo root limpo.`);
        }

        res.setHeader("Content-Language", "pt-BR");
        res.status(statusCode).send(html);
      } catch (err) {
        console.error("[SEO] Erro ao montar SEO:", err);
        next(err);
      }
    });

    // SEO route inserted above keeps this legacy handler as fallback.
    app.get(["/", "/blog*", "/p/*", "/agendar*"], async (req, res, next) => {
      const url = req.path;
      const indexPath = path.join(distPath, "index.html");
      
      if (!fs.existsSync(indexPath)) return next();

      console.log(`[SEO] Processando meta-tags para: ${url}`);
      let html = fs.readFileSync(indexPath, "utf-8");

      let title = "Agendelle | Agendamentos Inteligentes para Salões e Barbearias";
      let description = "Agendelle une organização inteligente com elegância — o sistema perfeito para salões e barbearias que querem crescer com profissionalismo.";
      let keywords = "agendamento online, sistema para salão de beleza, barbearia, gestão de estética, agendelle";
      let ogImage = `${SITE_URL}/og-default.jpg`;
      const canonical = `https://agendelle.com.br${url}`;

      // ── SEO Dinâmico para Posts do Blog ───────────────────────────────────
      const blogMatch = url.match(/^\/blog\/([^/]+)\/?$/);
      const agendarMatch = url.match(/^\/agendar\/([^/]+)\/?$/);
      const profMatch = url.match(/^\/p\/([^/]+)\/?$/);

      if (blogMatch) {
        const slug = blogMatch[1];
        try {
          const post = await (prisma as any).blogPost.findUnique({ 
            where: { slug, status: "published" },
            select: { title: true, excerpt: true, coverImage: true, seoTitle: true, seoDescription: true, seoKeywords: true }
          });
          if (post) {
            title = post.seoTitle || post.title + " | Blog Agendelle";
            description = (post.seoDescription || post.excerpt || "Leia mais no blog da Agendelle.").replace(/"/g, '&quot;');
            if (post.coverImage) ogImage = post.coverImage.startsWith("http") ? post.coverImage : `https://agendelle.com.br${post.coverImage}`;
            if (post.seoKeywords) keywords = post.seoKeywords;
          }
        } catch (err) { console.error("[SEO] Erro ao buscar post:", err); }
      } 
      else if (agendarMatch || profMatch) {
        const slug = (agendarMatch || profMatch)![1];
        try {
          const tenant = await (prisma as any).tenant.findFirst({ where: { slug, isActive: true } });
          if (tenant) {
            title = `${tenant.name} | Agendamento Online`;
            description = `Agende seu horário em ${tenant.name}. Profissionalismo e facilidade para você.`;
            if (tenant.logoUrl) ogImage = tenant.logoUrl.startsWith("http") ? tenant.logoUrl : `https://agendelle.com.br${tenant.logoUrl}`;
            keywords = `agendamento, ${tenant.name}, salão, barbearia, agendelle`;
          }
        } catch (err) { console.error("[SEO] Erro ao buscar parceiro:", err); }
      }
      else if (url === "/blog" || url === "/blog/") {
        title = "Blog Agendelle | Dicas e Tendências para Beleza";
        description = "Acompanhe as melhores dicas de gestão, tendências e tecnologia para o seu salão ou barbearia no blog oficial da Agendelle.";
        keywords = "blog beleza, gestão salão, dicas barbearia, agendelle blog";
      }

      const seoTags = `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${keywords}">
    <meta name="google-site-verification" content="4WE47kn3xYj8tvKqcZi4f4rnxN7nnlPF9CPrhd-tCdE" />
    <link rel="canonical" href="${canonical}" />
    <link rel="icon" type="image/png" href="https://agendelle.com.br/favicon.png" />
    <link rel="apple-touch-icon" href="https://agendelle.com.br/favicon.png" />
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${ogImage}">
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
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

      html = html
        .replace(/<title>[\s\S]*?<\/title>/i, "")
        .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
        .replace(/<meta\s+name=["']robots["'][^>]*>/gi, "")
        .replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, "")
        .replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, "")
        .replace(/<meta\s+property=["']twitter:[^"']*["'][^>]*>/gi, "")
        .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "")
        .replace(/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/gi, "")
        .replace("</head>", `${seoTags}</head>`);
      res.send(html);
    });

    // Servir arquivos estáticos (JS, CSS, Imagens) DEPOIS do interceptador de SEO
    app.use(express.static(distPath));

    // SPA fallback — qualquer rota não capturada entrega o index.html pro React Router
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("App not built");
      }
    });
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => console.log(`🚀 Servidor modular rodando em http://localhost:${PORT}`));
}
startServer();
