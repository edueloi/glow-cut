import { Router } from "express";
import { reportController } from "../controllers/reportController";

export const reportRouter = Router();

reportRouter.get("/professionals", reportController.professionalReport);
reportRouter.get("/profitability", reportController.profitabilityReport);
