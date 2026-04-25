import express from "express";
import Stripe from "stripe";
import { randomBytes } from "crypto";
import { prisma } from "../prisma";
import {
  sendSetupAccountEmail,
  sendAdminNewSubscriptionEmail,
  sendAbandonedCheckoutEmail,
} from "../utils/emailService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2026-04-22.dahlia" });

export const stripeWebhookRouter = express.Router();

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
        case "checkout.session.expired": {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutExpired(session);
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
  const planName = session.metadata?.planName || "Agendelle";

  if (!tenantId) {
    console.warn("[Stripe Webhook] checkout.session.completed sem tenantId no metadata");
    return;
  }

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id;

  // Email e nome do comprador (vêm do Stripe checkout)
  const buyerEmail = session.customer_details?.email || session.customer_email || null;
  const buyerName = session.customer_details?.name || null;

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

  // Gera token único de setup (válido por 48h)
  const setupToken = randomBytes(32).toString("hex");
  const setupTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const updateData: any = {
    isActive: true,
    expiresAt,
    blockedAt: null,
    setupToken,
    setupTokenExpiresAt,
  };
  if (session.metadata?.planId) updateData.planId = session.metadata.planId;
  if (customerId) updateData.stripeCustomerId = customerId;
  if (buyerEmail) updateData.ownerEmail = buyerEmail;
  if (buyerName) updateData.ownerName = buyerName;

  const tenant = await (prisma as any).tenant.update({
    where: { id: tenantId },
    data: updateData,
    select: { id: true, name: true, ownerName: true, ownerEmail: true },
  });

  console.log(`[Stripe Webhook] Tenant ${tenantId} ativado via checkout`);

  // Envia emails em paralelo
  const emailTargetEmail = buyerEmail || tenant.ownerEmail;
  const emailTargetName = buyerName || tenant.ownerName || "Cliente";

  const emailJobs: Promise<void>[] = [
    sendAdminNewSubscriptionEmail({
      tenantName: tenant.name,
      ownerName: emailTargetName,
      ownerEmail: emailTargetEmail,
      planName,
      tenantId,
    }).catch((e) => console.error("[Email] Falha aviso admin:", e.message)),
  ];

  if (emailTargetEmail) {
    emailJobs.push(
      sendSetupAccountEmail({
        toEmail: emailTargetEmail,
        toName: emailTargetName,
        tenantName: tenant.name,
        planName,
        setupToken,
      }).catch((e) => console.error("[Email] Falha setup account:", e.message))
    );
  }

  await Promise.all(emailJobs);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const buyerEmail = session.customer_details?.email || session.customer_email;
  const buyerName = session.customer_details?.name;
  const planName = session.metadata?.planName || "Agendelle";

  if (!buyerEmail) return;

  // Gera novo link de checkout para o mesmo plano
  const planId = session.metadata?.planId;
  let checkoutUrl = process.env.APP_URL || "https://agendelle.com.br";

  if (planId) {
    try {
      const plan = await (prisma as any).plan.findUnique({
        where: { id: planId },
        select: { stripePriceId: true, stripePaymentLink: true },
      });
      if (plan?.stripePriceId) {
        const newSession = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: plan.stripePriceId, quantity: 1 }],
          success_url: `${checkoutUrl}/login?checkout=success&plan=${encodeURIComponent(planName)}`,
          cancel_url: `${checkoutUrl}/#precos`,
          customer_email: buyerEmail,
          allow_promotion_codes: true,
          metadata: session.metadata || {},
        });
        if (newSession.url) checkoutUrl = newSession.url;
      } else if (plan?.stripePaymentLink) {
        checkoutUrl = plan.stripePaymentLink;
      }
    } catch (e) {
      console.warn("[Stripe Webhook] Erro ao criar novo checkout para expirado:", e);
    }
  }

  await sendAbandonedCheckoutEmail({
    toEmail: buyerEmail,
    toName: buyerName || undefined,
    planName,
    checkoutUrl,
  }).catch((e) => console.error("[Email] Falha checkout expirado:", e.message));

  console.log(`[Stripe Webhook] Email de checkout abandonado enviado para ${buyerEmail}`);
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
}
