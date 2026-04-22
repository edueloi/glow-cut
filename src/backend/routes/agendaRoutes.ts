import { Router } from "express";
import { agendaController } from "../controllers/agendaController";

// Rotas que NÃO precisam de autenticação (públicas)
export const agendaPublicRouter = Router();
agendaPublicRouter.get("/pat/:professionalId", agendaController.getPatQueue);
agendaPublicRouter.get("/availability", agendaController.getAvailability);
agendaPublicRouter.post("/appointments/check-recurrence", agendaController.checkRecurrence);

// Rotas protegidas
export const agendaRouter = Router();

agendaRouter.get("/calendar-status", agendaController.getCalendarStatus);
agendaRouter.get("/appointments", agendaController.list);
agendaRouter.get("/appointments/client", agendaController.clientAppointments);
agendaRouter.post("/appointments", agendaController.create);
agendaRouter.put("/appointments/:id", agendaController.update);
agendaRouter.patch("/appointments/:id", agendaController.patch);
agendaRouter.delete("/appointments/batch", agendaController.batchDelete);
agendaRouter.delete("/appointments/:id", agendaController.delete);
agendaRouter.get("/appointments/group/:groupId", agendaController.getGroup);

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
agendaRouter.get("/settings/closed-days", agendaController.getClosedDays);
agendaRouter.post("/settings/closed-days", agendaController.createClosedDay);
agendaRouter.delete("/settings/closed-days/:id", agendaController.deleteClosedDay);
