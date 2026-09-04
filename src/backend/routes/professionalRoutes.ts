import { Router } from "express";
import { professionalController } from "../controllers/professionalController";
import { agendaController } from "../controllers/agendaController";
import { pushController } from "../controllers/pushController";

export const professionalRouter = Router();

professionalRouter.get("/", professionalController.list);
professionalRouter.post("/", professionalController.create);
professionalRouter.post("/login", professionalController.login);
professionalRouter.put("/:id", professionalController.update);
professionalRouter.delete("/:id", professionalController.delete);
professionalRouter.post("/push/subscribe", pushController.subscribeProfessional);

professionalRouter.get("/:id/timeoff", agendaController.listProfessionalTimeOff);
professionalRouter.post("/:id/timeoff", agendaController.createProfessionalTimeOff);
professionalRouter.delete("/:id/timeoff/:specialDayId", agendaController.deleteProfessionalTimeOff);
