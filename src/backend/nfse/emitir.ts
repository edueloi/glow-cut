import fs from "fs";
import path from "path";
import { prisma } from "../prisma";
import { buildDpsXml, type DpsTomador } from "./dpsXmlBuilder";
import { loadPfx, assinarDPS } from "./signer";
import { callNfseRest, gzipBase64, ungzipBase64 } from "./restClient";
import { consultarAliquotaServico } from "./parametrosMunicipais";
import { decryptCertPassword } from "./certCrypto";
import { generateNfsePdf } from "./pdf";

const NFSE_TIMEOUT_MS = Number(process.env.NFSE_TIMEOUT_MS) || 30000;
const NFSE_XML_DIR = process.env.NFSE_XML_DIR || path.join(process.cwd(), "private_storage", "nfse_xml");

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

// Extrai um valor simples de tag XML sem depender de parser completo (o XML de
// retorno do governo é bem estruturado e sem CDATA nesses campos).
function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1] : null;
}

// O XML de retorno do governo traz nome/endereço em CAIXA ALTA — deixamos em Title
// Case para o PDF ficar mais legível, preservando siglas curtas (LTDA, ME/EPP, UF...).
function titleCase(v: string | null): string | null {
  if (!v) return v;
  return v.toLowerCase().replace(/\b([a-zà-ú])/gi, (c) => c.toUpperCase())
    .replace(/\b(Ltda|Me|Epp|Sp|Rj|Mg|Pr|Rs|Sc|Ba|Pe|Ce|Go|Df|Es)\b/gi, (m) => m.toUpperCase());
}

// Monta o endereço legível do prestador a partir do grupo <enderNac> do XML de
// retorno da NFS-e — mais confiável que um campo livre, pois é exatamente o
// endereço que consta no certificado/CNC usado para emitir.
function extractEnderecoFromNfseXml(nfseXml: string): string | null {
  const xLgr = extractTag(nfseXml, "xLgr");
  if (!xLgr) return null;
  const nro = extractTag(nfseXml, "nro");
  const xBairro = extractTag(nfseXml, "xBairro");
  const uf = extractTag(nfseXml, "UF");
  const cep = extractTag(nfseXml, "CEP");
  const xLocEmi = extractTag(nfseXml, "xLocEmi");
  const cepFmt = cep ? cep.replace(/(\d{5})(\d{3})/, "$1-$2") : null;
  return [
    [xLgr, nro].filter(Boolean).join(", "),
    xBairro,
    [xLocEmi, uf].filter(Boolean).join("/"),
    cepFmt ? `CEP ${cepFmt}` : null,
  ].filter(Boolean).join(" — ");
}

// Formata o endereço estruturado do cliente (mesmos campos enviados na DPS) para
// exibição no PDF.
function formatTomadorEndereco(endereco: DpsTomador["endereco"]): string | null {
  if (!endereco) return null;
  const cepFmt = endereco.cep ? String(endereco.cep).replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2") : null;
  return [
    [endereco.logradouro, endereco.numero].filter(Boolean).join(", "),
    endereco.complemento,
    endereco.bairro,
    cepFmt ? `CEP ${cepFmt}` : null,
  ].filter(Boolean).join(" — ");
}

// Resolve nome/CPF/endereço de quem contratou o serviço a partir do cliente vinculado
// à comanda — no Agendelle não há conceito de "pagador avulso" diferente do cliente
// (diferente do psiflux, onde um responsável podia pagar por um paciente menor).
function resolveTomador(client: { name: string; cpf: string | null; cep: string | null; street: string | null; number: string | null; complement: string | null; neighborhood: string | null } | null): DpsTomador | null {
  if (!client) return null;
  // Sem código IBGE do município do cliente hoje — o grupo <toma><end> é omitido
  // inteiro pelo próprio dpsXmlBuilder quando faltar qualquer campo obrigatório,
  // então não incluímos endereço aqui (ficaria sempre incompleto).
  return { nome: client.name, cpf: client.cpf, endereco: null };
}

export async function emitirNfse(invoiceId: string): Promise<void> {
  const invoice = await prisma.nfseInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return;

  await prisma.nfseInvoice.update({
    where: { id: invoiceId },
    data: { status: "processing", attempts: { increment: 1 }, lastAttemptAt: new Date() },
  });

  try {
    const config = await prisma.nfseConfig.findUnique({ where: { tenantId: invoice.tenantId } });
    if (!config) throw new Error("Configuração fiscal do salão não encontrada.");
    if (!config.certPath || !config.certPasswordEnc) {
      throw new Error("Certificado digital A1 não configurado (Configurações > Nota Fiscal).");
    }
    if (!config.codigoMunicipio) {
      throw new Error("Código do município (IBGE) não configurado (Configurações > Nota Fiscal).");
    }

    const comanda = await prisma.comanda.findUnique({
      where: { id: invoice.comandaId },
      include: { client: true },
    });
    if (!comanda) throw new Error("Comanda não encontrada.");

    const tenant = await prisma.tenant.findUnique({ where: { id: invoice.tenantId }, select: { name: true, logoUrl: true, phone: true } });

    const certPassword = decryptCertPassword(config.certPasswordEnc);
    const environment = config.environment === "producao" ? "producao" : "homologacao";

    const codigoTributacaoNacional = invoice.codigoTributacaoNacional || config.codigoTributacaoNacional;
    if (!codigoTributacaoNacional) {
      throw new Error("Código de tributação nacional (LC 116/03) não configurado (Configurações > Nota Fiscal).");
    }

    const parametros = await consultarAliquotaServico(
      environment, config.codigoMunicipio, codigoTributacaoNacional,
      config.certPath, certPassword, NFSE_TIMEOUT_MS
    );
    const aliquotaIss = parametros.aliquota ?? 5; // fallback conservador (teto legal do ISS) se o município não parametrizar

    const tomador = resolveTomador(comanda.client);

    const { idDPS, xml } = buildDpsXml({
      emitter: {
        cnpj: config.cnpj,
        codigoMunicipio: config.codigoMunicipio,
        regimeTributario: config.regimeTributario,
        environment,
      },
      serie: invoice.serie,
      numero: invoice.numero,
      aliquotaIss,
      codigoTributacaoNacional,
      descricaoServico: invoice.descricaoServico || comanda.description || "Serviço prestado",
      valorServico: Number(invoice.valorServico),
      tomador,
    });

    const cert = loadPfx(config.certPath, certPassword);

    // O Sistema Nacional NFS-e exige que a assinatura seja feita com o certificado do
    // próprio emitente da DPS (erro E0718 quando não bate) — validamos aqui para dar
    // uma mensagem clara em vez do erro genérico do governo.
    const emitterCnpjDigits = (config.cnpj || "").replace(/\D/g, "");
    const isEmitterCnpj = emitterCnpjDigits.length === 14;
    if (isEmitterCnpj && cert.titularCnpj && cert.titularCnpj !== emitterCnpjDigits) {
      throw new Error("O certificado digital enviado não corresponde ao CNPJ cadastrado como emitente. É necessário um certificado e-CNPJ do salão (o e-CPF pessoal não é aceito pelo Sistema Nacional NFS-e para assinar em nome do CNPJ).");
    }
    if (isEmitterCnpj && !cert.titularCnpj && cert.titularCpf) {
      throw new Error("O certificado enviado é um e-CPF (pessoa física), mas o emitente está cadastrado com CNPJ. É necessário um certificado e-CNPJ do salão para emitir NFS-e em nome do CNPJ.");
    }

    const signedXml = assinarDPS(xml, idDPS, cert);

    const result = await callNfseRest({
      environment,
      method: "POST",
      path: "/nfse",
      body: { dpsXmlGZipB64: gzipBase64(signedXml) },
      pfxPath: config.certPath,
      pfxPassword: certPassword,
      timeoutMs: NFSE_TIMEOUT_MS,
    });

    if (!result.ok) {
      // Schema real (NFSePostResponseErro): { erros: [{ Codigo, Descricao, Complemento }] }
      // (a resposta real vem com maiúscula inicial, diferente do swagger documentado em minúsculo)
      const data = result.data || {};
      const erros = Array.isArray(data.erros) ? data.erros : [];
      const primeiro = erros[0];
      const codigo = primeiro?.Codigo ?? primeiro?.codigo;
      const descricao = primeiro?.Descricao ?? primeiro?.descricao;
      const complemento = primeiro?.Complemento ?? primeiro?.complemento;
      await prisma.nfseInvoice.update({
        where: { id: invoiceId },
        data: {
          status: "rejected",
          rejectionCode: codigo ? String(codigo) : String(result.statusCode),
          rejectionReason: codigo ? [descricao, complemento].filter(Boolean).join(" — ") : (result.error || result.raw || "Falha na comunicação com o Sistema Nacional NFS-e"),
        },
      });
      return;
    }

    // Schema real (NFSePostResponseSucesso): { chaveAcesso, idDps, nfseXmlGZipB64, ... }
    const responseData = result.data || {};
    const chaveAcesso: string | null = responseData.chaveAcesso ?? null;
    const nfseXml: string = responseData.nfseXmlGZipB64 ? ungzipBase64(responseData.nfseXmlGZipB64) : result.raw;

    const now = new Date();
    const monthDir = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const dir = path.join(NFSE_XML_DIR, invoice.tenantId, monthDir);
    ensureDir(dir);

    const dpsPath = path.join(dir, `${idDPS}-dps.xml`);
    fs.writeFileSync(dpsPath, signedXml, "utf-8");

    const nfsePath = path.join(dir, `${idDPS}-nfse.xml`);
    fs.writeFileSync(nfsePath, nfseXml, "utf-8");

    let logoBuffer: Buffer | null = null;
    if (tenant?.logoUrl && tenant.logoUrl.startsWith("/uploads/")) {
      try {
        const logoPath = path.join(process.cwd(), "uploads", path.basename(tenant.logoUrl));
        if (fs.existsSync(logoPath)) logoBuffer = fs.readFileSync(logoPath);
      } catch { /* segue sem logo */ }
    }

    const xTribNac = extractTag(nfseXml, "xTribNac"); // descrição oficial do código de tributação, vinda do governo
    const codigoVerificacao = extractTag(nfseXml, "nDFSe");
    const emitterEnderecoNfse = extractEnderecoFromNfseXml(nfseXml);

    const pdfBuffer = await generateNfsePdf({
      logoBuffer,
      emitterName: config.razaoSocial || tenant?.name || "",
      emitterDisplayName: tenant?.name || config.razaoSocial || "",
      emitterDocument: config.cnpj || "",
      emitterIM: config.inscricaoMunicipal || null,
      emitterRegime: config.regimeTributario === "simples_nacional" ? "Simples Nacional (ME/EPP)" : "Não optante do Simples Nacional",
      emitterAddress: emitterEnderecoNfse ? titleCase(emitterEnderecoNfse) : null,
      emitterPhone: tenant?.phone || null,
      tomadorNome: tomador?.nome,
      tomadorDocumento: tomador?.cpf || tomador?.cnpj,
      tomadorEndereco: formatTomadorEndereco(tomador?.endereco),
      numero: invoice.numero,
      serie: invoice.serie,
      environment,
      chaveAcesso,
      authorizedAt: now,
      codigoVerificacao,
      codigoTributacao: codigoTributacaoNacional,
      descricaoTributacao: xTribNac ? xTribNac.replace(/\.$/, "") : null,
      descricaoServico: invoice.descricaoServico,
      valorServico: Number(invoice.valorServico),
      // Alíquota só é exibida como percentual do ISS quando o regime não é Simples
      // Nacional — para opSimpNac=3, o mesmo número é só a estimativa usada em
      // pTotTribSN (não é a alíquota do ISS em si, que é apurada pelo SN).
      aliquotaIss: config.regimeTributario === "simples_nacional" ? null : aliquotaIss,
      valorIss: null,
    });
    const pdfPath = path.join(dir, `${idDPS}-nfse.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);

    await prisma.nfseInvoice.update({
      where: { id: invoiceId },
      data: {
        status: "authorized",
        chaveAcesso,
        authorizedAt: now,
        dpsXmlPath: dpsPath,
        nfseXmlPath: nfsePath,
        nfsePdfPath: pdfPath,
        rejectionCode: null,
        rejectionReason: null,
      },
    });

    await prisma.nfseConfig.update({ where: { tenantId: invoice.tenantId }, data: { nextNumber: { increment: 1 } } });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.nfseInvoice.update({
      where: { id: invoiceId },
      data: { status: "error", rejectionReason: message },
    }).catch(() => {});
  }
}
