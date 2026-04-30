import { Router } from "express";
import { adminController } from "../controllers/adminController";

export const adminRouter = Router();

adminRouter.put("/profile/:id", adminController.updateProfile);
adminRouter.post("/login", adminController.unifiedLogin); // Movido para o controller
adminRouter.get("/tenant", adminController.getTenant);
adminRouter.get("/check-slug/:slug", adminController.checkSlug);
adminRouter.post("/tenant/branding", adminController.updateBranding);
adminRouter.post("/upload", adminController.upload);
adminRouter.get("/tenant-by-slug/:slug", adminController.getTenantBySlug);
adminRouter.get("/team", adminController.listTeam);
adminRouter.post("/team", adminController.createTeamUser);
adminRouter.put("/team/:id", adminController.updateTeamUser);
adminRouter.delete("/team/:id", adminController.deleteTeamUser);
adminRouter.get("/all-plans", adminController.getPlans);
adminRouter.post("/onboarding/update", adminController.updateOnboarding);
adminRouter.post("/create-portal", adminController.createPortal);
