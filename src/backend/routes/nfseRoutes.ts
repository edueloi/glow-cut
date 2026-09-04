import { Router } from "express";
import { nfseController } from "../controllers/nfseController";

export const nfseRouter = Router();

nfseRouter.get("/config", nfseController.getConfig);
nfseRouter.post("/config", nfseController.saveConfig);
nfseRouter.post("/config/toggle", nfseController.toggleEnabled);
nfseRouter.post("/config/certificate", nfseController.uploadCertificate);
nfseRouter.get("/", nfseController.list);
