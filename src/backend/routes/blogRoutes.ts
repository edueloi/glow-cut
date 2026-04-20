import { Router } from "express";
import { blogController } from "../controllers/blogController";

// ── Rota pública do blog ────────────────────────────────────────────────────
export const blogPublicRouter = Router();

// Posts públicos
blogPublicRouter.get("/posts", blogController.listPublicPosts);
blogPublicRouter.get("/posts/featured", blogController.getFeaturedPosts);
blogPublicRouter.get("/posts/:slug", blogController.getPublicPost);
blogPublicRouter.post("/posts/:id/view", blogController.registerView);

// Categorias
blogPublicRouter.get("/categories", blogController.listPublicCategories);

// Newsletter
blogPublicRouter.post("/subscribe", blogController.subscribe);

// ── Rota super-admin do blog ────────────────────────────────────────────────
export const blogAdminRouter = Router();

// Posts (CRUD)
blogAdminRouter.get("/posts", blogController.listAdminPosts);
blogAdminRouter.post("/posts", blogController.createPost);
blogAdminRouter.get("/posts/:id", blogController.getAdminPost);
blogAdminRouter.put("/posts/:id", blogController.updatePost);
blogAdminRouter.delete("/posts/:id", blogController.deletePost);
blogAdminRouter.patch("/posts/:id/publish", blogController.publishPost);
blogAdminRouter.patch("/posts/:id/archive", blogController.archivePost);

// Categorias (CRUD)
blogAdminRouter.get("/categories", blogController.listAdminCategories);
blogAdminRouter.post("/categories", blogController.createCategory);
blogAdminRouter.put("/categories/:id", blogController.updateCategory);
blogAdminRouter.delete("/categories/:id", blogController.deleteCategory);

// Autores (CRUD)
blogAdminRouter.get("/authors", blogController.listAuthors);
blogAdminRouter.post("/authors", blogController.createAuthor);
blogAdminRouter.put("/authors/:id", blogController.updateAuthor);
blogAdminRouter.delete("/authors/:id", blogController.deleteAuthor);

// Assinantes (leitura + exportar)
blogAdminRouter.get("/subscribers", blogController.listSubscribers);
blogAdminRouter.delete("/subscribers/:id", blogController.deleteSubscriber);

// Analytics + Stats
blogAdminRouter.get("/stats", blogController.getStats);
blogAdminRouter.get("/analytics", blogController.getAnalytics);
