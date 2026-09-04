import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "../prisma";
import { getTenantId } from "../utils/helpers";
import { parsePfx } from "../nfse/signer";
import { encryptCertPassword } from "../nfse/certCrypto";
import { emitirNfse } from "../nfse/emitir";
import { cancelarNfse } from "../nfse/cancelar";

// Diretório privado — NUNCA dentro de uploads/ ou public/ (servidos estáticos pelo Express).
const CERTS_DIR = process.env.NFSE_CERTS_DIR || path.join(process.cwd(), "private_storage", "nfse_certs");

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function getOrCreateConfig(tenantId: string) {
  const existing = await prisma.nfseConfig.findUnique({ where: { tenantId } });
  if (existing) return existing;
  return prisma.nfseConfig.create({ data: { id: randomUUID(), tenantId } });
}

export const nfseController = {
  // GET /api/nfse/config
  async getConfig(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const config = await getOrCreateConfig(tenantId);
      res.json({
        ...config,
        certPasswordEnc: undefined, // nunca expor a senha criptografada ao client
        hasCertificate: !!config.certPath,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao buscar configuração fiscal." });
    }
  },

  // POST /api/nfse/config
  async saveConfig(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const {
      razaoSocial, cnpj, inscricaoMunicipal, codigoMunicipio,
      codigoTributacaoNacional, regimeTributario, environment,
    } = req.body;
    try {
      await getOrCreateConfig(tenantId);
      const config = await prisma.nfseConfig.update({
        where: { tenantId },
        data: {
          razaoSocial: razaoSocial ?? undefined,
          cnpj: cnpj ?? undefined,
          inscricaoMunicipal: inscricaoMunicipal ?? undefined,
          codigoMunicipio: codigoMunicipio ?? undefined,
          codigoTributacaoNacional: codigoTributacaoNacional ?? undefined,
          regimeTributario: regimeTributario ?? undefined,
          environment: environment ?? undefined,
        },
      });
      res.json({ ...config, certPasswordEnc: undefined, hasCertificate: !!config.certPath });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao salvar configuração fiscal." });
    }
  },

  // POST /api/nfse/config/toggle
  async toggleEnabled(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { enabled } = req.body;
    try {
      await getOrCreateConfig(tenantId);
      const config = await prisma.nfseConfig.update({ where: { tenantId }, data: { enabled: !!enabled } });
      res.json({ enabled: config.enabled });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao atualizar configuração." });
    }
  },

  // POST /api/nfse/config/certificate — { data: base64, mimeType, password }
  async uploadCertificate(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { data, password } = req.body as { data?: string; password?: string };
    if (!data || !password) return res.status(400).json({ error: "Arquivo e senha do certificado são obrigatórios." });

    try {
      const base64 = data.includes(",") ? data.split(",")[1] : data;
      const buffer = Buffer.from(base64, "base64");

      // Valida o .pfx ANTES de persistir qualquer coisa — se a senha/arquivo estiverem
      // errados, não deixa lixo em disco nem no banco.
      let parsed;
      try {
        parsed = parsePfx(buffer.toString("binary"), password);
      } catch (e: any) {
        return res.status(422).json({ error: `Certificado inválido: ${e.message}` });
      }

      const config = await getOrCreateConfig(tenantId);

      // Se o CNPJ já estiver configurado, bloqueia certificado incompatível já no upload
      // (evita descobrir isso só na hora de emitir, com o governo devolvendo erro E0718).
      const configuredCnpj = (config.cnpj || "").replace(/\D/g, "");
      if (configuredCnpj && parsed.titularCnpj && parsed.titularCnpj !== configuredCnpj) {
        return res.status(422).json({ error: "O certificado enviado não corresponde ao CNPJ cadastrado como emitente." });
      }

      const dir = path.join(CERTS_DIR, tenantId);
      ensureDir(dir);
      const certPath = path.join(dir, `certificado_${Date.now()}.pfx`);
      fs.writeFileSync(certPath, buffer);

      // Remove o certificado anterior, se houver, pra não acumular arquivos órfãos.
      if (config.certPath && config.certPath !== certPath) {
        try { fs.unlinkSync(config.certPath); } catch { /* já removido */ }
      }

      const updated = await prisma.nfseConfig.update({
        where: { tenantId },
        data: {
          certPath,
          certPasswordEnc: encryptCertPassword(password),
          certUploadedAt: new Date(),
        },
      });

      res.json({ hasCertificate: true, certUploadedAt: updated.certUploadedAt });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao processar certificado." });
    }
  },

  // GET /api/nfse — listagem paginada
  async list(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { status } = req.query as { status?: string };
    try {
      const invoices = await prisma.nfseInvoice.findMany({
        where: { tenantId, ...(status ? { status } : {}) },
        include: { comanda: { include: { client: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json(invoices);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao listar notas fiscais." });
    }
  },

  // GET /api/comandas/:comandaId/nfse
  async getByComanda(req: Request, res: Response) {
    try {
      const invoice = await prisma.nfseInvoice.findUnique({ where: { comandaId: req.params.comandaId } });
      if (!invoice) return res.status(404).json({ error: "Nenhuma nota fiscal emitida para esta comanda." });
      res.json(invoice);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao buscar nota fiscal." });
    }
  },

  // POST /api/comandas/:comandaId/nfse/emit
  async emit(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { comandaId } = req.params;
    const { descricaoServico, valorServico } = req.body as { descricaoServico?: string; valorServico?: number };

    try {
      const config = await prisma.nfseConfig.findUnique({ where: { tenantId } });
      if (!config?.enabled) {
        return res.status(403).json({ error: "A emissão de NFS-e não está ativada para este salão (Configurações > Nota Fiscal)." });
      }

      const comanda = await prisma.comanda.findFirst({ where: { id: comandaId, tenantId } });
      if (!comanda) return res.status(404).json({ error: "Comanda não encontrada." });

      const existing = await prisma.nfseInvoice.findUnique({ where: { comandaId } });
      if (existing && !["rejected", "error"].includes(existing.status)) {
        return res.status(409).json({ error: "Já existe uma nota fiscal para esta comanda.", invoice: existing });
      }

      const numero = config.nextNumber;
      const invoice = existing
        ? await prisma.nfseInvoice.update({
            where: { id: existing.id },
            data: {
              status: "pending",
              serie: config.serie,
              numero,
              valorServico: valorServico ?? comanda.total,
              descricaoServico: descricaoServico ?? comanda.description,
              codigoTributacaoNacional: config.codigoTributacaoNacional,
              rejectionCode: null,
              rejectionReason: null,
            },
          })
        : await prisma.nfseInvoice.create({
            data: {
              id: randomUUID(),
              tenantId,
              comandaId,
              status: "pending",
              environment: config.environment,
              serie: config.serie,
              numero,
              valorServico: valorServico ?? comanda.total,
              descricaoServico: descricaoServico ?? comanda.description,
              codigoTributacaoNacional: config.codigoTributacaoNacional,
            },
          });

      // Emissão é fire-and-forget: a chamada ao governo leva alguns segundos, então a
      // rota responde de imediato com o status pending/processing e o front faz polling
      // em GET /api/comandas/:id/nfse até virar authorized/rejected/error.
      emitirNfse(invoice.id).catch((e) => console.error("[NFS-e] emitirNfse falhou:", e));

      res.json(invoice);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao emitir nota fiscal." });
    }
  },

  // POST /api/comandas/:comandaId/nfse/retry
  async retry(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const invoice = await prisma.nfseInvoice.findUnique({ where: { comandaId: req.params.comandaId } });
      if (!invoice || invoice.tenantId !== tenantId) return res.status(404).json({ error: "Nota fiscal não encontrada." });
      if (invoice.status === "authorized") return res.status(409).json({ error: "Esta nota já está autorizada." });

      await prisma.nfseInvoice.update({ where: { id: invoice.id }, data: { status: "pending", rejectionCode: null, rejectionReason: null } });
      emitirNfse(invoice.id).catch((e) => console.error("[NFS-e] emitirNfse (retry) falhou:", e));
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao reemitir nota fiscal." });
    }
  },

  // POST /api/comandas/:comandaId/nfse/cancel — { motivo }
  async cancel(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { motivo } = req.body as { motivo?: string };
    if (!motivo) return res.status(400).json({ error: "Informe o motivo do cancelamento." });

    try {
      const invoice = await prisma.nfseInvoice.findUnique({ where: { comandaId: req.params.comandaId } });
      if (!invoice || invoice.tenantId !== tenantId) return res.status(404).json({ error: "Nota fiscal não encontrada." });

      await cancelarNfse(invoice.id, motivo);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao cancelar nota fiscal." });
    }
  },

  // GET /api/comandas/:comandaId/nfse/xml
  async downloadXml(req: Request, res: Response) {
    try {
      const invoice = await prisma.nfseInvoice.findUnique({ where: { comandaId: req.params.comandaId } });
      if (!invoice?.nfseXmlPath || !fs.existsSync(invoice.nfseXmlPath)) {
        return res.status(404).json({ error: "XML da nota fiscal não encontrado." });
      }
      res.download(invoice.nfseXmlPath, `nfse-${invoice.numero}.xml`);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao baixar XML." });
    }
  },

  // GET /api/comandas/:comandaId/nfse/pdf
  async downloadPdf(req: Request, res: Response) {
    try {
      const invoice = await prisma.nfseInvoice.findUnique({ where: { comandaId: req.params.comandaId } });
      if (!invoice?.nfsePdfPath || !fs.existsSync(invoice.nfsePdfPath)) {
        return res.status(404).json({ error: "PDF da nota fiscal não encontrado." });
      }
      res.download(invoice.nfsePdfPath, `nfse-${invoice.numero}.pdf`);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao baixar PDF." });
    }
  },
};
