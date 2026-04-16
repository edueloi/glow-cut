import { Router } from "express";
import { serviceController } from "../controllers/serviceController";
import { professionalController } from "../controllers/professionalController";
import { clientController } from "../controllers/clientController";
import { agendaController } from "../controllers/agendaController";

export const publicBookingRouter = Router();

publicBookingRouter.get("/services", serviceController.publicList);
publicBookingRouter.get("/professionals", professionalController.publicList);
publicBookingRouter.get("/clients/search", clientController.publicSearch);
publicBookingRouter.post("/clients", clientController.create);
publicBookingRouter.get("/appointments/client", agendaController.clientAppointments);
publicBookingRouter.post("/appointments", agendaController.create);
publicBookingRouter.get("/calendar-status", agendaController.getCalendarStatus);
