import { Router } from "express";
import { agendaController } from "../controllers/agendaController";

export const agendaRouter = Router();

agendaRouter.get("/availability", agendaController.getAvailability);
agendaRouter.get("/calendar-status", agendaController.getCalendarStatus);
agendaRouter.get("/appointments", agendaController.list);
agendaRouter.get("/appointments/client", agendaController.clientAppointments);
agendaRouter.post("/appointments", agendaController.create);
agendaRouter.put("/appointments/:id", agendaController.update);
agendaRouter.patch("/appointments/:id", agendaController.patch);
agendaRouter.delete("/appointments/:id", agendaController.delete);
agendaRouter.get("/appointments/group/:groupId", agendaController.getGroup);
agendaRouter.delete("/appointments/batch", agendaController.batchDelete);

// PAT público (sem autenticação)
agendaRouter.get("/pat/:professionalId", agendaController.getPatQueue);

// Settings
agendaRouter.get("/settings/agenda", agendaController.getSettings);
agendaRouter.put("/settings/agenda", agendaController.updateSettings);
agendaRouter.post("/settings/agenda/releases", agendaController.createRelease);
agendaRouter.delete("/settings/agenda/releases/:id", agendaController.deleteRelease);
agendaRouter.post("/settings/agenda/special-days", agendaController.saveSpecialDay);
agendaRouter.delete("/settings/agenda/special-days/:id", agendaController.deleteSpecialDay);

// Working Hours
agendaRouter.get("/settings/working-hours", agendaController.getWorkingHours);
agendaRouter.put("/settings/working-hours", agendaController.updateWorkingHours);

// Closed Days
agendaRouter.get("/closed-days", agendaController.getClosedDays);
agendaRouter.post("/closed-days", agendaController.createClosedDay);
agendaRouter.delete("/closed-days/:id", agendaController.deleteClosedDay);
