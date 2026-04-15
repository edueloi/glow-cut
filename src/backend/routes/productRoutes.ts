import { Router } from "express";
import { productController } from "../controllers/productController";

export const productRouter = Router();

// Products
productRouter.get("/", productController.list);
productRouter.post("/", productController.create);
productRouter.put("/:id", productController.update);
productRouter.delete("/:id", productController.delete);

// Sectors
productRouter.get("/sectors", productController.listSectors);
productRouter.post("/sectors", productController.createSector);
productRouter.put("/sectors/:id", productController.updateSector);
productRouter.delete("/sectors/:id", productController.deleteSector);
