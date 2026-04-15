import { Router } from "express";
import { professionalController } from "../controllers/professionalController";

export const professionalRouter = Router();

professionalRouter.get("/", professionalController.list);
professionalRouter.post("/", professionalController.create);
professionalRouter.post("/login", professionalController.login);
professionalRouter.put("/:id", professionalController.update);
professionalRouter.delete("/:id", professionalController.delete);
