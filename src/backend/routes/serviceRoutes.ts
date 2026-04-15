import { Router } from "express";
import { serviceController } from "../controllers/serviceController";

export const serviceRouter = Router();

serviceRouter.get("/", serviceController.list);
serviceRouter.post("/", serviceController.create);
serviceRouter.put("/:id", serviceController.update);
serviceRouter.delete("/:id", serviceController.delete);
