import { Router } from "express";
import { comandaController } from "../controllers/comandaController";
import { nfseController } from "../controllers/nfseController";

export const comandaRouter = Router();

comandaRouter.get("/ranking-servicos", comandaController.rankingServicos);
comandaRouter.get("/", comandaController.list);
comandaRouter.post("/", comandaController.create);
comandaRouter.put("/:id", comandaController.update);
comandaRouter.delete("/:id", comandaController.delete);
comandaRouter.put("/:id/items", comandaController.updateItems);
comandaRouter.patch("/:id/sessions", comandaController.patchSessions);
comandaRouter.post("/:id/partial-payment", comandaController.partialPayment);

// Nota Fiscal de Serviço (NFS-e) — 1 nota por comanda, ver src/backend/nfse/
comandaRouter.get("/:comandaId/nfse", nfseController.getByComanda);
comandaRouter.post("/:comandaId/nfse/emit", nfseController.emit);
comandaRouter.post("/:comandaId/nfse/retry", nfseController.retry);
comandaRouter.post("/:comandaId/nfse/cancel", nfseController.cancel);
comandaRouter.get("/:comandaId/nfse/xml", nfseController.downloadXml);
comandaRouter.get("/:comandaId/nfse/pdf", nfseController.downloadPdf);
