import { Router } from "express";
import { comandaController } from "../controllers/comandaController";

export const comandaRouter = Router();

comandaRouter.get("/ranking-servicos", comandaController.rankingServicos);
comandaRouter.get("/", comandaController.list);
comandaRouter.post("/", comandaController.create);
comandaRouter.put("/:id", comandaController.update);
comandaRouter.delete("/:id", comandaController.delete);
comandaRouter.put("/:id/items", comandaController.updateItems);
