import { Router } from "express";
import { adminController } from "../controllers/adminController";

export const adminRouter = Router();

adminRouter.put("/profile/:id", adminController.updateProfile);
adminRouter.post("/login", adminController.unifiedLogin); // Movido para o controller
adminRouter.get("/tenant", adminController.getTenant);
adminRouter.post("/tenant/branding", adminController.updateBranding);
adminRouter.post("/upload", adminController.upload);
adminRouter.get("/tenant-by-slug/:slug", adminController.getTenantBySlug);
