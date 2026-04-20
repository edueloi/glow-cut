import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";

// helper: gera slug a partir de string
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 200);
}

// helper: calcula tempo de leitura em minutos
function calcReadTime(content: string): number {
  const words = content.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export const blogController = {

  // ══════════════════════════════════════════
  // PÚBLICOS
  // ══════════════════════════════════════════

  listPublicPosts: async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(20, Number(req.query.limit) || 9);
      const skip = (page - 1) * limit;
      const categorySlug = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const tag = req.query.tag as string | undefined;

      const where: any = { status: "published" };

      if (categorySlug) {
        const cat = await (prisma as any).blogCategory.findFirst({ where: { slug: categorySlug } });
        if (cat) where.categoryId = cat.id;
      }

      if (search) {
        where.OR = [
          { title: { contains: search } },
          { excerpt: { contains: search } },
          { tags: { contains: search } },
        ];
      }

      if (tag) {
        where.tags = { contains: tag };
      }

      const [posts, total] = await Promise.all([
        (prisma as any).blogPost.findMany({
          where,
          skip,
          take: limit,
          orderBy: { publishedAt: "desc" },
          include: {
            category: { select: { id: true, name: true, slug: true, color: true } },
            author: { select: { id: true, name: true, slug: true, photo: true, role: true } },
          },
          select: {
            id: true, title: true, slug: true, excerpt: true, coverImage: true,
            featured: true, tags: true, views: true, readTimeMinutes: true, publishedAt: true,
            category: true, author: true,
          },
        }),
        (prisma as any).blogPost.count({ where }),
      ]);

      res.json({
        posts,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  getFeaturedPosts: async (req: Request, res: Response) => {
    try {
      const posts = await (prisma as any).blogPost.findMany({
        where: { status: "published", featured: true },
        take: 5,
        orderBy: { publishedAt: "desc" },
        include: {
          category: { select: { id: true, name: true, slug: true, color: true } },
          author: { select: { id: true, name: true, slug: true, photo: true, role: true } },
        },
      });
      res.json(posts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  getPublicPost: async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const post = await (prisma as any).blogPost.findFirst({
        where: { slug, status: "published" },
        include: {
          category: true,
          author: true,
        },
      });
      if (!post) return res.status(404).json({ error: "Post não encontrado" });

      // Posts relacionados (mesma categoria, excluindo o atual)
      const related = await (prisma as any).blogPost.findMany({
        where: {
          status: "published",
          categoryId: post.categoryId,
          id: { not: post.id },
        },
        take: 3,
        orderBy: { publishedAt: "desc" },
        include: {
          category: { select: { id: true, name: true, slug: true, color: true } },
          author: { select: { id: true, name: true, slug: true, photo: true } },
        },
      });

      res.json({ post, related });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  registerView: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Incrementa views no post
      await (prisma as any).blogPost.update({
        where: { id },
        data: { views: { increment: 1 } },
      });

      // Registra analytics diários
      const existing = await (prisma as any).blogAnalytics.findFirst({
        where: { postId: id, date: today },
      });
      if (existing) {
        await (prisma as any).blogAnalytics.update({
          where: { id: existing.id },
          data: { views: { increment: 1 } },
        });
      } else {
        await (prisma as any).blogAnalytics.create({
          data: { id: randomUUID(), postId: id, date: today, views: 1 },
        });
      }

      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  listPublicCategories: async (_req: Request, res: Response) => {
    try {
      const categories = await (prisma as any).blogCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { posts: { where: { status: "published" } } } },
        },
      });
      res.json(categories);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  subscribe: async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;
      if (!email || !email.includes("@")) return res.status(400).json({ error: "E-mail inválido" });

      const existing = await (prisma as any).blogSubscriber.findFirst({ where: { email } });
      if (existing) {
        if (!existing.isActive) {
          await (prisma as any).blogSubscriber.update({ where: { id: existing.id }, data: { isActive: true, name: name || existing.name } });
          return res.json({ ok: true, message: "Inscrição reativada!" });
        }
        return res.json({ ok: true, message: "Você já está inscrito!" });
      }

      await (prisma as any).blogSubscriber.create({
        data: { id: randomUUID(), email, name: name || null, isActive: true },
      });
      res.json({ ok: true, message: "Inscrito com sucesso!" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  // ══════════════════════════════════════════
  // SUPER-ADMIN
  // ══════════════════════════════════════════

  listAdminPosts: async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Number(req.query.limit) || 20);
      const skip = (page - 1) * limit;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;

      const where: any = {};
      if (status && status !== "all") where.status = status;
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { excerpt: { contains: search } },
        ];
      }

      const [posts, total] = await Promise.all([
        (prisma as any).blogPost.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: "desc" },
          include: {
            category: { select: { id: true, name: true, color: true } },
            author: { select: { id: true, name: true } },
          },
        }),
        (prisma as any).blogPost.count({ where }),
      ]);

      res.json({ posts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  getAdminPost: async (req: Request, res: Response) => {
    try {
      const post = await (prisma as any).blogPost.findUnique({
        where: { id: req.params.id },
        include: { category: true, author: true },
      });
      if (!post) return res.status(404).json({ error: "Post não encontrado" });
      res.json(post);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  createPost: async (req: Request, res: Response) => {
    try {
      const {
        title, excerpt, content, coverImage, status = "draft",
        featured = false, categoryId, authorId, tags = "[]",
        seoTitle, seoDescription, seoKeywords,
      } = req.body;

      if (!title || !content) return res.status(400).json({ error: "Título e conteúdo são obrigatórios" });

      let slug = toSlug(title);
      // Garantir slug único
      const existing = await (prisma as any).blogPost.findFirst({ where: { slug } });
      if (existing) slug = `${slug}-${Date.now()}`;

      const readTimeMinutes = calcReadTime(content);
      const publishedAt = status === "published" ? new Date() : null;

      const post = await (prisma as any).blogPost.create({
        data: {
          id: randomUUID(), title, slug, excerpt, content, coverImage,
          status, featured, categoryId: categoryId || null, authorId: authorId || null,
          tags: typeof tags === "string" ? tags : JSON.stringify(tags),
          seoTitle: seoTitle || null, seoDescription: seoDescription || null,
          seoKeywords: seoKeywords || null, readTimeMinutes, publishedAt,
        },
      });

      res.json(post);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  updatePost: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        title, excerpt, content, coverImage, status,
        featured, categoryId, authorId, tags,
        seoTitle, seoDescription, seoKeywords, publishedAt,
      } = req.body;

      const current = await (prisma as any).blogPost.findUnique({ where: { id } });
      if (!current) return res.status(404).json({ error: "Post não encontrado" });

      const data: any = {};
      if (title !== undefined) {
        data.title = title;
        // Só regenera slug se o título mudou e o post ainda é rascunho
        if (title !== current.title && current.status === "draft") {
          let newSlug = toSlug(title);
          const ex = await (prisma as any).blogPost.findFirst({ where: { slug: newSlug, id: { not: id } } });
          if (ex) newSlug = `${newSlug}-${Date.now()}`;
          data.slug = newSlug;
        }
      }
      if (excerpt !== undefined) data.excerpt = excerpt;
      if (content !== undefined) {
        data.content = content;
        data.readTimeMinutes = calcReadTime(content);
      }
      if (coverImage !== undefined) data.coverImage = coverImage;
      if (featured !== undefined) data.featured = featured;
      if (categoryId !== undefined) data.categoryId = categoryId || null;
      if (authorId !== undefined) data.authorId = authorId || null;
      if (tags !== undefined) data.tags = typeof tags === "string" ? tags : JSON.stringify(tags);
      if (seoTitle !== undefined) data.seoTitle = seoTitle;
      if (seoDescription !== undefined) data.seoDescription = seoDescription;
      if (seoKeywords !== undefined) data.seoKeywords = seoKeywords;

      if (status !== undefined) {
        data.status = status;
        if (status === "published" && !current.publishedAt) {
          data.publishedAt = new Date();
        }
      }
      if (publishedAt !== undefined) data.publishedAt = publishedAt ? new Date(publishedAt) : null;

      const updated = await (prisma as any).blogPost.update({ where: { id }, data });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  deletePost: async (req: Request, res: Response) => {
    try {
      await (prisma as any).blogAnalytics.deleteMany({ where: { postId: req.params.id } });
      await (prisma as any).blogPost.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  publishPost: async (req: Request, res: Response) => {
    try {
      const post = await (prisma as any).blogPost.findUnique({ where: { id: req.params.id } });
      if (!post) return res.status(404).json({ error: "Post não encontrado" });
      const updated = await (prisma as any).blogPost.update({
        where: { id: req.params.id },
        data: { status: "published", publishedAt: post.publishedAt || new Date() },
      });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  archivePost: async (req: Request, res: Response) => {
    try {
      const updated = await (prisma as any).blogPost.update({
        where: { id: req.params.id },
        data: { status: "archived" },
      });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  // ── Categorias Admin ──────────────────────────────────────────────────────

  listAdminCategories: async (_req: Request, res: Response) => {
    try {
      const categories = await (prisma as any).blogCategory.findMany({
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { posts: true } } },
      });
      res.json(categories);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  createCategory: async (req: Request, res: Response) => {
    try {
      const { name, description, color = "#f59e0b", isActive = true, sortOrder = 0 } = req.body;
      if (!name) return res.status(400).json({ error: "Nome é obrigatório" });
      let slug = toSlug(name);
      const ex = await (prisma as any).blogCategory.findFirst({ where: { slug } });
      if (ex) slug = `${slug}-${Date.now()}`;
      const cat = await (prisma as any).blogCategory.create({
        data: { id: randomUUID(), name, slug, description, color, isActive, sortOrder },
      });
      res.json(cat);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  updateCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, color, isActive, sortOrder } = req.body;
      const data: any = {};
      if (name !== undefined) { data.name = name; data.slug = toSlug(name); }
      if (description !== undefined) data.description = description;
      if (color !== undefined) data.color = color;
      if (isActive !== undefined) data.isActive = isActive;
      if (sortOrder !== undefined) data.sortOrder = sortOrder;
      const updated = await (prisma as any).blogCategory.update({ where: { id }, data });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  deleteCategory: async (req: Request, res: Response) => {
    try {
      // Desassociar posts antes de deletar
      await (prisma as any).blogPost.updateMany({ where: { categoryId: req.params.id }, data: { categoryId: null } });
      await (prisma as any).blogCategory.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  // ── Autores Admin ─────────────────────────────────────────────────────────

  listAuthors: async (_req: Request, res: Response) => {
    try {
      const authors = await (prisma as any).blogAuthor.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { posts: true } } },
      });
      res.json(authors);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  createAuthor: async (req: Request, res: Response) => {
    try {
      const { name, bio, photo, role, instagram, isActive = true } = req.body;
      if (!name) return res.status(400).json({ error: "Nome é obrigatório" });
      let slug = toSlug(name);
      const ex = await (prisma as any).blogAuthor.findFirst({ where: { slug } });
      if (ex) slug = `${slug}-${Date.now()}`;
      const author = await (prisma as any).blogAuthor.create({
        data: { id: randomUUID(), name, slug, bio, photo, role, instagram, isActive },
      });
      res.json(author);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  updateAuthor: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, bio, photo, role, instagram, isActive } = req.body;
      const data: any = {};
      if (name !== undefined) { data.name = name; data.slug = toSlug(name); }
      if (bio !== undefined) data.bio = bio;
      if (photo !== undefined) data.photo = photo;
      if (role !== undefined) data.role = role;
      if (instagram !== undefined) data.instagram = instagram;
      if (isActive !== undefined) data.isActive = isActive;
      const updated = await (prisma as any).blogAuthor.update({ where: { id }, data });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  deleteAuthor: async (req: Request, res: Response) => {
    try {
      await (prisma as any).blogPost.updateMany({ where: { authorId: req.params.id }, data: { authorId: null } });
      await (prisma as any).blogAuthor.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  // ── Assinantes Admin ──────────────────────────────────────────────────────

  listSubscribers: async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Number(req.query.limit) || 30);
      const skip = (page - 1) * limit;
      const search = req.query.search as string | undefined;
      const where: any = {};
      if (search) where.OR = [{ email: { contains: search } }, { name: { contains: search } }];

      const [subs, total] = await Promise.all([
        (prisma as any).blogSubscriber.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
        (prisma as any).blogSubscriber.count({ where }),
      ]);
      res.json({ subscribers: subs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  deleteSubscriber: async (req: Request, res: Response) => {
    try {
      await (prisma as any).blogSubscriber.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  // ── Analytics + Stats Admin ───────────────────────────────────────────────

  getStats: async (_req: Request, res: Response) => {
    try {
      const [totalPosts, publishedPosts, draftPosts, totalViews, totalSubscribers, activeSubscribers, totalCategories, totalAuthors, topPosts] = await Promise.all([
        (prisma as any).blogPost.count(),
        (prisma as any).blogPost.count({ where: { status: "published" } }),
        (prisma as any).blogPost.count({ where: { status: "draft" } }),
        (prisma as any).blogPost.aggregate({ _sum: { views: true } }),
        (prisma as any).blogSubscriber.count(),
        (prisma as any).blogSubscriber.count({ where: { isActive: true } }),
        (prisma as any).blogCategory.count({ where: { isActive: true } }),
        (prisma as any).blogAuthor.count({ where: { isActive: true } }),
        (prisma as any).blogPost.findMany({
          where: { status: "published" },
          orderBy: { views: "desc" },
          take: 5,
          select: { id: true, title: true, slug: true, views: true, publishedAt: true },
        }),
      ]);

      res.json({
        totalPosts,
        publishedPosts,
        draftPosts,
        totalViews: totalViews._sum.views || 0,
        totalSubscribers,
        activeSubscribers,
        totalCategories,
        totalAuthors,
        topPosts,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  getAnalytics: async (req: Request, res: Response) => {
    try {
      const days = Math.min(90, Number(req.query.days) || 30);
      const from = new Date();
      from.setDate(from.getDate() - days);

      const analytics = await (prisma as any).blogAnalytics.findMany({
        where: { date: { gte: from } },
        orderBy: { date: "asc" },
        include: { post: { select: { title: true, slug: true } } },
      });

      // Agrupa por data
      const byDate: Record<string, number> = {};
      analytics.forEach((a: any) => {
        const key = new Date(a.date).toISOString().split("T")[0];
        byDate[key] = (byDate[key] || 0) + a.views;
      });

      const chartData = Object.entries(byDate).map(([date, views]) => ({ date, views }));

      res.json({ chartData, raw: analytics });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
};
