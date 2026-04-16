import { Router } from "express";
import { clientController } from "../controllers/clientController";

export const clientRouter = Router();

clientRouter.get("/", clientController.list);
clientRouter.get("/search", clientController.search);
clientRouter.post("/", clientController.create);
clientRouter.put("/:id", clientController.update);
clientRouter.delete("/:id", clientController.delete);
