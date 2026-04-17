import { Router } from "express";
import { wppController } from "../controllers/wppController";

export const wppRouter = Router();

wppRouter.get("/instance", wppController.getInstance);
wppRouter.post("/instance", wppController.saveInstance);
wppRouter.post("/connect", wppController.connect);
wppRouter.get("/status", wppController.status);
wppRouter.post("/disconnect", wppController.disconnect);
wppRouter.get("/templates", wppController.getTemplates);
wppRouter.put("/templates/:type", wppController.updateTemplate);
wppRouter.get("/bot-config", wppController.getBotConfig);
wppRouter.put("/bot-config", wppController.updateBotConfig);
wppRouter.post("/send-test", wppController.sendTest);
wppRouter.get("/qr", wppController.getQr);
