import { Router } from "express";
import { productController } from "../controllers/productController";

export const sectorRouter = Router();

sectorRouter.get("/", productController.listSectors);
sectorRouter.post("/", productController.createSector);
sectorRouter.put("/:id", productController.updateSector);
sectorRouter.delete("/:id", productController.deleteSector);
