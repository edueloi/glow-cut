import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.develoi.com.br",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "agendelle@develoi.com.br",
    pass: process.env.SMTP_PASS || "",
  },
});

const FROM = '"Agendelle" <agendelle@develoi.com.br>';
const ADMIN_EMAIL = "contato@develoi.com.br";
const APP_URL = process.env.APP_URL || "https://agendelle.com.br";

// ─── Email para o novo cliente: link de criação de senha ────────────────────
export async function sendSetupAccountEmail(opts: {
  toEmail: string;
  toName: string;
  tenantName: string;
  planName: string;
  setupToken: string;
}) {
  const link = `${APP_URL}/setup-account?token=${opts.setupToken}`;

  await transporter.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: "Bem-vindo ao Agendelle! Configure sua conta agora",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fff;">
        <img src="${APP_URL}/logo.png" alt="Agendelle" style="height:40px;margin-bottom:24px;" />
        <h2 style="color:#1a1a1a;">Olá, ${opts.toName}! 👋</h2>
        <p style="color:#444;font-size:15px;">
          Sua assinatura do plano <strong>${opts.planName}</strong> foi confirmada com sucesso para
          <strong>${opts.tenantName}</strong>.
        </p>
        <p style="color:#444;font-size:15px;">
          Clique no botão abaixo para criar sua senha e acessar o sistema:
        </p>
        <a href="${link}" style="
          display:inline-block;
          background:#c9a96e;
          color:#fff;
          text-decoration:none;
          padding:14px 32px;
          border-radius:8px;
          font-size:15px;
          font-weight:600;
          margin:16px 0;
        ">Criar minha senha e acessar</a>
        <p style="color:#888;font-size:13px;margin-top:24px;">
          Este link é válido por 48 horas. Se você não solicitou esta conta, ignore este e-mail.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#aaa;font-size:12px;">Agendelle — Sistema de Agendamento Profissional</p>
      </div>
    `,
  });
}

// ─── Email para contato@develoi.com.br: aviso de nova assinatura ────────────
export async function sendAdminNewSubscriptionEmail(opts: {
  tenantName: string;
  ownerName: string;
  ownerEmail: string;
  planName: string;
  tenantId: string;
}) {
  await transporter.sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `[Agendelle] Nova assinatura: ${opts.tenantName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
        <h2 style="color:#1a1a1a;">Nova assinatura confirmada ✅</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px;color:#888;">Empresa</td><td style="padding:8px;"><strong>${opts.tenantName}</strong></td></tr>
          <tr><td style="padding:8px;color:#888;">Responsável</td><td style="padding:8px;">${opts.ownerName}</td></tr>
          <tr><td style="padding:8px;color:#888;">E-mail</td><td style="padding:8px;">${opts.ownerEmail}</td></tr>
          <tr><td style="padding:8px;color:#888;">Plano</td><td style="padding:8px;">${opts.planName}</td></tr>
          <tr><td style="padding:8px;color:#888;">Tenant ID</td><td style="padding:8px;font-size:12px;color:#aaa;">${opts.tenantId}</td></tr>
        </table>
      </div>
    `,
  });
}

// ─── Email para checkout abandonado ─────────────────────────────────────────
export async function sendAbandonedCheckoutEmail(opts: {
  toEmail: string;
  toName?: string;
  planName: string;
  checkoutUrl: string;
}) {
  await transporter.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: "Você ainda não concluiu sua assinatura do Agendelle",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fff;">
        <h2 style="color:#1a1a1a;">Olá${opts.toName ? ", " + opts.toName : ""}!</h2>
        <p style="color:#444;font-size:15px;">
          Você iniciou uma assinatura do plano <strong>${opts.planName}</strong> mas não chegou a concluir o pagamento.
        </p>
        <p style="color:#444;font-size:15px;">
          Clique abaixo para finalizar e começar a usar o Agendelle agora:
        </p>
        <a href="${opts.checkoutUrl}" style="
          display:inline-block;
          background:#c9a96e;
          color:#fff;
          text-decoration:none;
          padding:14px 32px;
          border-radius:8px;
          font-size:15px;
          font-weight:600;
          margin:16px 0;
        ">Concluir minha assinatura</a>
        <p style="color:#888;font-size:13px;margin-top:24px;">
          Se tiver alguma dúvida, responda este e-mail que nossa equipe te ajuda.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#aaa;font-size:12px;">Agendelle — Sistema de Agendamento Profissional</p>
      </div>
    `,
  });
}

// ─── Email de boas-vindas após configurar a conta ───────────────────────────
export async function sendWelcomeEmail(opts: {
  toEmail: string;
  toName: string;
  tenantSlug: string;
}) {
  const loginUrl = `${APP_URL}/login`;

  await transporter.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: "Conta criada! Bem-vindo ao Agendelle 🎉",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fff;">
        <h2 style="color:#1a1a1a;">Conta criada com sucesso, ${opts.toName}!</h2>
        <p style="color:#444;font-size:15px;">
          Sua senha foi definida e você já pode acessar o sistema.
        </p>
        <a href="${loginUrl}" style="
          display:inline-block;
          background:#c9a96e;
          color:#fff;
          text-decoration:none;
          padding:14px 32px;
          border-radius:8px;
          font-size:15px;
          font-weight:600;
          margin:16px 0;
        ">Acessar minha conta</a>
        <p style="color:#888;font-size:13px;margin-top:24px;">
          Endereço do seu sistema: <strong>${APP_URL}/${opts.tenantSlug}</strong>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#aaa;font-size:12px;">Agendelle — Sistema de Agendamento Profissional</p>
      </div>
    `,
  });
}

// ─── Email de reset de senha ─────────────────────────────────────────────────
export async function sendResetPasswordEmail(opts: {
  toEmail: string;
  toName: string;
  resetToken: string;
}) {
  const link = `${APP_URL}/reset-password?token=${opts.resetToken}`;

  await transporter.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: "Redefinição de senha — Agendelle",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fff;">
        <h2 style="color:#1a1a1a;">Olá, ${opts.toName}!</h2>
        <p style="color:#444;font-size:15px;">
          Recebemos uma solicitação para redefinir a senha da sua conta no Agendelle.
        </p>
        <p style="color:#444;font-size:15px;">Clique no botão abaixo para criar uma nova senha:</p>
        <a href="${link}" style="
          display:inline-block;
          background:#c9a96e;
          color:#fff;
          text-decoration:none;
          padding:14px 32px;
          border-radius:8px;
          font-size:15px;
          font-weight:600;
          margin:16px 0;
        ">Redefinir minha senha</a>
        <p style="color:#888;font-size:13px;margin-top:24px;">
          Este link é válido por <strong>1 hora</strong>. Se você não solicitou a redefinição, ignore este e-mail — sua senha permanece a mesma.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#aaa;font-size:12px;">Agendelle — Sistema de Agendamento Profissional</p>
      </div>
    `,
  });
}
