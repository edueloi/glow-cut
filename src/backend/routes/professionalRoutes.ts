import { Router } from "express";
import { professionalController } from "../controllers/professionalController";
import { agendaController } from "../controllers/agendaController";

export const professionalRouter = Router();

professionalRouter.get("/", professionalController.list);
professionalRouter.post("/", professionalController.create);
professionalRouter.post("/login", professionalController.login);
professionalRouter.put("/:id", professionalController.update);
professionalRouter.delete("/:id", professionalController.delete);

professionalRouter.get("/:id/timeoff", agendaController.listProfessionalTimeOff);
professionalRouter.post("/:id/timeoff", agendaController.createProfessionalTimeOff);
professionalRouter.delete("/:id/timeoff/:specialDayId", agendaController.deleteProfessionalTimeOff);
