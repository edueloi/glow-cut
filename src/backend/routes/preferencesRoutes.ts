import { Router } from "express";
import { preferencesController } from "../controllers/preferencesController";

export const preferencesRouter = Router();

preferencesRouter.get("/",     preferencesController.get);
preferencesRouter.patch("/",   preferencesController.patch);
