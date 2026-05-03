import nodemailer from "nodemailer";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "contato@agendelle.com.br",
    pass: process.env.SMTP_PASS || "",
  },
  family: 4,
} as any);

const _originalSend = transporter.sendMail.bind(transporter);
transporter.sendMail = async (opts: any) => {
  const info = await _originalSend(opts);
  console.log("[email] accepted:", info.accepted, "rejected:", info.rejected, "response:", info.response);
  return info;
};

const FROM = '"Agendelle" <contato@agendelle.com.br>';
const ADMIN_EMAIL = "contato@agendelle.com.br";
const APP_URL = process.env.APP_URL || "https://agendelle.com.br";

// ─── Template base HTML ──────────────────────────────────────────────────────
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);padding:32px 40px;text-align:center;">
            <img src="${APP_URL}/logo.png" alt="Agendelle" style="height:36px;margin-bottom:8px;" />
            <p style="margin:0;color:#c9a96e;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">Sistema de Agendamento Profissional</p>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding:40px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#fafaf8;padding:24px 40px;border-top:1px solid #f0ede8;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align:center;">
                  <p style="margin:0 0 8px;color:#999;font-size:11px;">© ${new Date().getFullYear()} Agendelle — Todos os direitos reservados</p>
                  <p style="margin:0;color:#bbb;font-size:10px;">
                    <a href="${APP_URL}" style="color:#c9a96e;text-decoration:none;">agendelle.com.br</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function primaryButton(text: string, href: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background:#c9a96e;border-radius:10px;text-align:center;">
          <a href="${href}" style="display:inline-block;padding:16px 40px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.5px;">${text}</a>
        </td>
      </tr>
    </table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #f0ede8;margin:28px 0;" />`;
}

function smallNote(text: string): string {
  return `<p style="color:#999;font-size:12px;line-height:1.6;margin:0;">${text}</p>`;
}

// ─── Email para o novo cliente: link de criação de senha (JÁ PAGOU) ─────────
export async function sendSetupAccountEmail(opts: {
  toEmail: string;
  toName: string;
  tenantName: string;
  planName: string;
  setupToken: string;
}) {
  const link = `${APP_URL}/setup-account?token=${opts.setupToken}`;

  const content = `
    <h1 style="color:#1a1a1a;font-size:24px;font-weight:800;margin:0 0 8px;">Parabéns, ${opts.toName}! 🎉</h1>
    <p style="color:#c9a96e;font-size:14px;font-weight:600;margin:0 0 24px;text-transform:uppercase;letter-spacing:1px;">Sua jornada profissional começa agora</p>
    
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Sua assinatura do plano <strong style="color:#1a1a1a;">${opts.planName}</strong> foi confirmada com sucesso para 
      <strong style="color:#1a1a1a;">${opts.tenantName}</strong>.
    </p>

    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 8px;">
      O Agendelle é a plataforma que vai transformar a gestão do seu negócio:
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:16px 0 24px;width:100%;">
      <tr>
        <td style="padding:12px 16px;background:#fafaf8;border-radius:10px;border-left:3px solid #c9a96e;">
          <p style="margin:0 0 6px;font-size:13px;color:#444;">✅ <strong>Agenda online</strong> — Seus clientes agendam direto pelo link</p>
          <p style="margin:0 0 6px;font-size:13px;color:#444;">✅ <strong>Site profissional</strong> — Vitrine do seu trabalho</p>
          <p style="margin:0 0 6px;font-size:13px;color:#444;">✅ <strong>Gestão completa</strong> — Clientes, serviços, financeiro</p>
          <p style="margin:0;font-size:13px;color:#444;">✅ <strong>WhatsApp integrado</strong> — Lembretes automáticos</p>
        </td>
      </tr>
    </table>

    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 4px;">
      Clique no botão abaixo para criar sua senha e começar a configurar:
    </p>

    ${primaryButton("Criar minha senha e acessar", link)}

    ${divider()}
    ${smallNote("Este link é válido por <strong>48 horas</strong>. Se você não solicitou esta conta, ignore este e-mail.")}
  `;

  await transporter.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: "🎉 Bem-vindo ao Agendelle! Configure sua conta agora",
    html: emailWrapper(content),
  });
}

// ─── Email para contato@agendelle.com.br: aviso de nova assinatura ──────────
export async function sendAdminNewSubscriptionEmail(opts: {
  tenantName: string;
  ownerName: string;
  ownerEmail: string;
  planName: string;
  tenantId: string;
}) {
  const content = `
    <h1 style="color:#1a1a1a;font-size:22px;font-weight:800;margin:0 0 24px;">Nova assinatura confirmada ✅</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <tr><td style="padding:12px 16px;color:#888;background:#fafaf8;border-radius:8px 0 0 0;">Empresa</td><td style="padding:12px 16px;background:#fafaf8;border-radius:0 8px 0 0;"><strong style="color:#1a1a1a;">${opts.tenantName}</strong></td></tr>
      <tr><td style="padding:12px 16px;color:#888;">Responsável</td><td style="padding:12px 16px;">${opts.ownerName}</td></tr>
      <tr><td style="padding:12px 16px;color:#888;background:#fafaf8;">E-mail</td><td style="padding:12px 16px;background:#fafaf8;">${opts.ownerEmail}</td></tr>
      <tr><td style="padding:12px 16px;color:#888;">Plano</td><td style="padding:12px 16px;"><strong style="color:#c9a96e;">${opts.planName}</strong></td></tr>
      <tr><td style="padding:12px 16px;color:#888;background:#fafaf8;border-radius:0 0 0 8px;">Tenant ID</td><td style="padding:12px 16px;background:#fafaf8;border-radius:0 0 8px 0;font-size:11px;color:#aaa;">${opts.tenantId}</td></tr>
    </table>
  `;

  await transporter.sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `[Agendelle] Nova assinatura: ${opts.tenantName}`,
    html: emailWrapper(content),
  });
}

// ─── Email para checkout abandonado (Registrou mas NÃO pagou) ───────────────
export async function sendAbandonedCheckoutEmail(opts: {
  toEmail: string;
  toName?: string;
  planName: string;
  checkoutUrl: string;
}) {
  const name = opts.toName || "profissional";

  const content = `
    <h1 style="color:#1a1a1a;font-size:24px;font-weight:800;margin:0 0 8px;">Falta apenas um passo, ${name}! 🚀</h1>
    <p style="color:#c9a96e;font-size:13px;font-weight:600;margin:0 0 24px;text-transform:uppercase;letter-spacing:1px;">Seu cadastro está quase pronto</p>
    
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Você começou a criar sua conta no Agendelle com o plano <strong style="color:#1a1a1a;">${opts.planName}</strong>, 
      mas ainda não finalizou o pagamento.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:16px 0 24px;width:100%;">
      <tr>
        <td style="padding:16px 20px;background:#fdf8f0;border-radius:10px;border:1px solid #f0e6d0;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1a1a1a;">💡 Por que completar agora?</p>
          <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
            Seu estabelecimento merece uma gestão profissional. Com o Agendelle, você organiza 
            sua agenda, recebe agendamentos online e impressiona seus clientes com um atendimento de verdade premium.
          </p>
        </td>
      </tr>
    </table>

    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 4px;">
      Clique abaixo para finalizar e começar seus <strong>30 dias grátis</strong>:
    </p>

    ${primaryButton("Finalizar minha assinatura", opts.checkoutUrl)}

    ${divider()}
    ${smallNote("Se tiver alguma dúvida, responda este e-mail que nossa equipe te ajuda com prazer. 💛")}
  `;

  await transporter.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: `⚡ ${name}, falta só um passo para ativar o Agendelle!`,
    html: emailWrapper(content),
  });
}

// ─── Email de boas-vindas após configurar a conta (JÁ PAGOU E CRIOU SENHA) ─
export async function sendWelcomeEmail(opts: {
  toEmail: string;
  toName: string;
  tenantSlug: string;
}) {
  const loginUrl = `${APP_URL}/login`;
  const agendaUrl = `${APP_URL}/${opts.tenantSlug}`;

  const content = `
    <h1 style="color:#1a1a1a;font-size:24px;font-weight:800;margin:0 0 8px;">Tudo pronto, ${opts.toName}! 🎊</h1>
    <p style="color:#c9a96e;font-size:13px;font-weight:600;margin:0 0 24px;text-transform:uppercase;letter-spacing:1px;">Sua conta foi ativada com sucesso</p>

    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Sua senha foi definida e você já pode acessar o painel completo do Agendelle. 
      A partir de agora, seu negócio tem uma plataforma profissional para crescer.
    </p>

    ${primaryButton("Acessar meu painel", loginUrl)}

    <table cellpadding="0" cellspacing="0" style="margin:8px 0 24px;width:100%;">
      <tr>
        <td style="padding:16px 20px;background:#fafaf8;border-radius:10px;border-left:3px solid #c9a96e;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1a1a1a;">📋 Primeiros passos recomendados:</p>
          <p style="margin:0 0 4px;font-size:13px;color:#555;">1️⃣ Cadastre seus <strong>serviços</strong> e defina os preços</p>
          <p style="margin:0 0 4px;font-size:13px;color:#555;">2️⃣ Configure seus <strong>horários de atendimento</strong></p>
          <p style="margin:0 0 4px;font-size:13px;color:#555;">3️⃣ Adicione sua equipe de <strong>profissionais</strong></p>
          <p style="margin:0;font-size:13px;color:#555;">4️⃣ Compartilhe seu <strong>link de agendamento</strong> com os clientes</p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;width:100%;">
      <tr>
        <td style="padding:16px 20px;background:#1a1a1a;border-radius:10px;text-align:center;">
          <p style="margin:0 0 4px;color:#c9a96e;font-size:11px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Seu link de agendamento</p>
          <a href="${agendaUrl}" style="color:#fff;font-size:14px;font-weight:700;text-decoration:none;">${agendaUrl}</a>
        </td>
      </tr>
    </table>

    ${divider()}
    ${smallNote("Precisa de ajuda para configurar? Responda este e-mail e nossa equipe te orienta. 💛")}
  `;

  await transporter.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: "✅ Conta ativada! Bem-vindo ao Agendelle",
    html: emailWrapper(content),
  });
}

// ─── Email de reset de senha ─────────────────────────────────────────────────
export async function sendResetPasswordEmail(opts: {
  toEmail: string;
  toName: string;
  resetToken: string;
}) {
  const link = `${APP_URL}/reset-password?token=${opts.resetToken}`;

  const content = `
    <h1 style="color:#1a1a1a;font-size:24px;font-weight:800;margin:0 0 8px;">Redefinir sua senha 🔐</h1>
    <p style="color:#888;font-size:14px;margin:0 0 24px;">Olá, ${opts.toName}!</p>

    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Recebemos uma solicitação para redefinir a senha da sua conta no Agendelle. 
      Se foi você, clique no botão abaixo para criar uma nova senha:
    </p>

    ${primaryButton("Redefinir minha senha", link)}

    <table cellpadding="0" cellspacing="0" style="margin:8px 0 24px;width:100%;">
      <tr>
        <td style="padding:16px 20px;background:#fff8f0;border-radius:10px;border:1px solid #f0e0c8;">
          <p style="margin:0;font-size:13px;color:#996b33;line-height:1.6;">
            ⏰ Este link é válido por <strong>1 hora</strong>. Após esse período, você precisará solicitar uma nova redefinição.
          </p>
        </td>
      </tr>
    </table>

    ${divider()}
    ${smallNote("Se você <strong>não</strong> solicitou a redefinição de senha, ignore este e-mail — sua senha permanece a mesma.")}
  `;

  await transporter.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: "🔐 Redefinição de senha — Agendelle",
    html: emailWrapper(content),
  });
}

// ─── Email para tenant registrado mas sem pagamento (Lembrete) ───────────────
export async function sendPendingPaymentEmail(opts: {
  toEmail: string;
  toName: string;
  tenantName: string;
  planName: string;
  checkoutUrl: string;
}) {
  const content = `
    <h1 style="color:#1a1a1a;font-size:24px;font-weight:800;margin:0 0 8px;">Olá, ${opts.toName}! 👋</h1>
    <p style="color:#c9a96e;font-size:13px;font-weight:600;margin:0 0 24px;text-transform:uppercase;letter-spacing:1px;">Sua conta está esperando por você</p>

    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Você criou sua conta <strong style="color:#1a1a1a;">${opts.tenantName}</strong> no Agendelle e escolheu o plano 
      <strong style="color:#1a1a1a;">${opts.planName}</strong>, mas o pagamento ainda não foi concluído.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:16px 0 24px;width:100%;">
      <tr>
        <td style="padding:16px 20px;background:#fdf8f0;border-radius:10px;border:1px solid #f0e6d0;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1a1a1a;">🎁 Lembrete: você tem 30 dias grátis!</p>
          <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
            Ao ativar, você começa com um período de teste de <strong>30 dias sem cobranças</strong>. 
            Conheça a plataforma, configure seus serviços e veja como o Agendelle pode organizar 
            e profissionalizar o seu negócio.
          </p>
        </td>
      </tr>
    </table>

    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 4px;">
      Finalize agora e comece a usar:
    </p>

    ${primaryButton("Ativar minha conta agora", opts.checkoutUrl)}

    ${divider()}
    ${smallNote("Se tiver alguma dúvida sobre os planos ou funcionalidades, responda este e-mail. Estamos aqui para te ajudar! 💛")}
  `;

  await transporter.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: `⏳ ${opts.toName}, sua conta no Agendelle está esperando!`,
    html: emailWrapper(content),
  });
}
