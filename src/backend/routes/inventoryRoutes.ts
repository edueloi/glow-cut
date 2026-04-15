import { Router } from "express";
import { inventoryController } from "../controllers/inventoryController";

export const inventoryRouter = Router();

// Suppliers
inventoryRouter.get("/suppliers", inventoryController.listSuppliers);
inventoryRouter.post("/suppliers", inventoryController.createSupplier);
inventoryRouter.put("/suppliers/:id", inventoryController.updateSupplier);
inventoryRouter.delete("/suppliers/:id", inventoryController.deleteSupplier);

// Manufacturers
inventoryRouter.get("/manufacturers", inventoryController.listManufacturers);
inventoryRouter.post("/manufacturers", inventoryController.createManufacturer);
inventoryRouter.put("/manufacturers/:id", inventoryController.updateManufacturer);
inventoryRouter.delete("/manufacturers/:id", inventoryController.deleteManufacturer);

// Stock Movements
inventoryRouter.get("/movements", inventoryController.listMovements);
inventoryRouter.post("/movements", inventoryController.createMovement);

// Product Sale
inventoryRouter.post("/sell", inventoryController.sellProduct);

// Stock Position Report
inventoryRouter.get("/stock-position", inventoryController.stockPosition);

// Inventory Adjustment
inventoryRouter.post("/inventory-adjust", inventoryController.inventoryAdjust);

// Ranking
inventoryRouter.get("/ranking", inventoryController.ranking);
