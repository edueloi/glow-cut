import { Router } from "express";
import { financeController } from "../controllers/financeController";

export const financeRouter = Router();

// Livro Caixa
financeRouter.get("/cash-entries", financeController.listCashEntries);
financeRouter.post("/cash-entries", financeController.createCashEntry);
financeRouter.put("/cash-entries/:id", financeController.updateCashEntry);
financeRouter.delete("/cash-entries/:id", financeController.deleteCashEntry);

// Service Consumptions
financeRouter.get("/service-consumptions", financeController.listServiceConsumptions);
financeRouter.post("/service-consumptions", financeController.createServiceConsumption);
financeRouter.put("/service-consumptions/:id", financeController.updateServiceConsumption);
financeRouter.delete("/service-consumptions/:id", financeController.deleteServiceConsumption);
