import express from "express";
import Stripe from "stripe";
import { prisma } from "../prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2026-04-22.dahlia" });

export const stripeWebhookRouter = express.Router();

// Webhook precisa do body raw (não JSON parseado)
stripeWebhookRouter.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    let event: Stripe.Event;

    try {
      if (webhookSecret && webhookSecret !== "whsec_COLE_AQUI_QUANDO_CONFIGURAR_WEBHOOK") {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret) as Stripe.Event;
      } else {
        // Sem webhook secret configurado — aceita em dev sem verificação de assinatura
        event = JSON.parse(req.body.toString()) as Stripe.Event;
      }
    } catch (err: any) {
      console.error("[Stripe Webhook] Assinatura inválida:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(session);
          break;
        }
        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(sub);
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(sub);
          break;
        }
        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          await handleInvoicePaid(invoice);
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          await handleInvoiceFailed(invoice);
          break;
        }
        default:
          console.log(`[Stripe Webhook] Evento ignorado: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error("[Stripe Webhook] Erro ao processar evento:", event.type, err.message);
      res.status(500).json({ error: "Erro interno ao processar webhook" });
    }
  }
);

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenantId;
  const planId = session.metadata?.planId;

  if (!tenantId) {
    console.warn("[Stripe Webhook] checkout.session.completed sem tenantId no metadata");
    return;
  }

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id;

  let expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const periodEnd = (sub as any).current_period_end ?? (sub as any).items?.data?.[0]?.current_period_end;
      if (periodEnd) expiresAt = new Date(periodEnd * 1000);
    } catch (e) {
      console.warn("[Stripe Webhook] Não foi possível buscar subscription:", e);
    }
  }

  const updateData: any = { isActive: true, expiresAt, blockedAt: null };
  if (planId) updateData.planId = planId;
  if (customerId) updateData.stripeCustomerId = customerId;

  await (prisma as any).tenant.update({ where: { id: tenantId }, data: updateData });
  console.log(`[Stripe Webhook] Tenant ${tenantId} ativado via checkout`);
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id;
  if (!customerId) return;

  const tenant = await (prisma as any).tenant.findFirst({ where: { stripeCustomerId: customerId } });
  if (!tenant) {
    console.warn(`[Stripe Webhook] Nenhum tenant para customer ${customerId}`);
    return;
  }

  const periodEnd = (sub as any).current_period_end ?? (sub as any).items?.data?.[0]?.current_period_end;
  const expiresAt = periodEnd ? new Date(periodEnd * 1000) : new Date();
  const isActive = sub.status === "active" || sub.status === "trialing";

  await (prisma as any).tenant.update({
    where: { id: tenant.id },
    data: { expiresAt, isActive, blockedAt: isActive ? null : new Date() },
  });
  console.log(`[Stripe Webhook] Tenant ${tenant.id} subscription atualizada → status: ${sub.status}`);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id;
  if (!customerId) return;

  const tenant = await (prisma as any).tenant.findFirst({ where: { stripeCustomerId: customerId } });
  if (!tenant) return;

  await (prisma as any).tenant.update({
    where: { id: tenant.id },
    data: { isActive: false, blockedAt: new Date() },
  });
  console.log(`[Stripe Webhook] Tenant ${tenant.id} desativado — subscription cancelada`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer as any)?.id;
  if (!customerId) return;

  const tenant = await (prisma as any).tenant.findFirst({ where: { stripeCustomerId: customerId } });
  if (!tenant) return;

  const subId = (invoice as any).subscription;
  if (subId) {
    try {
      const sub = await stripe.subscriptions.retrieve(typeof subId === "string" ? subId : subId.id);
      const periodEnd = (sub as any).current_period_end ?? (sub as any).items?.data?.[0]?.current_period_end;
      const expiresAt = periodEnd ? new Date(periodEnd * 1000) : new Date();
      await (prisma as any).tenant.update({
        where: { id: tenant.id },
        data: { isActive: true, expiresAt, blockedAt: null },
      });
      console.log(`[Stripe Webhook] Tenant ${tenant.id} renovado via invoice`);
    } catch (e) {
      console.warn("[Stripe Webhook] Erro ao renovar via invoice:", e);
    }
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer as any)?.id;
  if (!customerId) return;

  const tenant = await (prisma as any).tenant.findFirst({ where: { stripeCustomerId: customerId } });
  if (!tenant) return;

  console.warn(`[Stripe Webhook] Pagamento falhou para tenant ${tenant.id}`);
  // Não bloqueia imediatamente — subscription.updated vai cuidar quando status mudar
}
