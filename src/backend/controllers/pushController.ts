import { Request, Response } from "express";
import { getTenantId } from "../utils/helpers";
import { saveSubscription, removeSubscription, isWebPushConfigured } from "../webpush/pushService";

export const pushController = {
  async getVapidPublicKey(req: Request, res: Response) {
    if (!isWebPushConfigured() || !process.env.VAPID_PUBLIC_KEY) {
      return res.status(503).json({ error: "Push notifications não configuradas." });
    }
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  },

  async subscribe(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { phone, subscription } = req.body;
    if (!phone || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: "phone e subscription (endpoint, keys.p256dh, keys.auth) são obrigatórios." });
    }
    try {
      await saveSubscription({
        tenantId,
        phone,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: req.headers["user-agent"],
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao salvar inscrição de push." });
    }
  },

  async unsubscribe(req: Request, res: Response) {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: "endpoint obrigatório." });
    await removeSubscription(endpoint);
    res.json({ success: true });
  },
};
