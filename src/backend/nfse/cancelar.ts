import { prisma } from "../prisma";
import { buildCancelamentoXml } from "./eventoXmlBuilder";
import { loadPfx, assinarEvento } from "./signer";
import { callNfseEventoRest } from "./restClient";
import { decryptCertPassword } from "./certCrypto";

const NFSE_TIMEOUT_MS = Number(process.env.NFSE_TIMEOUT_MS) || 30000;

// O prazo de cancelamento do Sistema Nacional NFS-e é PARAMETRIZADO POR MUNICÍPIO (o
// próprio manual oficial do governo confirma isso — não é uma regra fixa nacional tipo
// "dia 15 do mês seguinte"), e não temos hoje um jeito confiável de consultar o valor
// exato configurado por cada prefeitura. Por isso NÃO bloqueamos o cancelamento aqui
// com base em uma data calculada — deixamos o próprio governo (autoridade real sobre a
// regra) decidir, e só traduzimos a resposta dele de forma legível abaixo.

// Cancela uma NFS-e já autorizada junto ao Sistema Nacional NFS-e (evento e101101),
// espelhando o fluxo de emitirNfse: monta o XML do evento, assina com o certificado
// A1 do emissor e envia via mTLS. Só pode ser chamada para invoices com status
// 'authorized' e chaveAcesso preenchida — validado pela rota antes de invocar.
export async function cancelarNfse(invoiceId: string, motivo: string): Promise<true> {
  const invoice = await prisma.nfseInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("NFS-e não encontrada.");
  if (invoice.status !== "authorized") throw new Error("Só é possível cancelar uma NFS-e autorizada.");
  if (!invoice.chaveAcesso) throw new Error("NFS-e sem chave de acesso — não é possível cancelar.");

  const config = await prisma.nfseConfig.findUnique({ where: { tenantId: invoice.tenantId } });
  if (!config) throw new Error("Configuração fiscal do salão não encontrada.");
  if (!config.certPath || !config.certPasswordEnc) {
    throw new Error("Certificado digital A1 não configurado (Configurações > Nota Fiscal).");
  }

  const certPassword = decryptCertPassword(config.certPasswordEnc);
  const environment = config.environment === "producao" ? "producao" : "homologacao";

  const { xml, idPedido } = buildCancelamentoXml({
    emitter: { cnpj: config.cnpj, environment },
    chaveAcesso: invoice.chaveAcesso,
    motivo,
  });

  const cert = loadPfx(config.certPath, certPassword);
  const signedXml = assinarEvento(xml, idPedido, cert);

  const result = await callNfseEventoRest({
    environment,
    chaveAcesso: invoice.chaveAcesso,
    signedXml,
    pfxPath: config.certPath,
    pfxPassword: certPassword,
    timeoutMs: NFSE_TIMEOUT_MS,
  });

  if (!result.ok) {
    const data = result.data || {};
    const erros = Array.isArray(data.erros) ? data.erros : [];
    const primeiro = erros[0];
    const descricao = primeiro?.Descricao ?? primeiro?.descricao;
    const complemento = primeiro?.Complemento ?? primeiro?.complemento;
    console.error(`[NFS-e] Falha ao registrar evento de cancelamento (chave ${invoice.chaveAcesso}): status=${result.statusCode} raw=${result.raw}`);

    let mensagem: string;
    if (descricao) {
      mensagem = [descricao, complemento].filter(Boolean).join(" — ");
    } else if (!result.error && data.message === "An error has occurred.") {
      // O Sistema Nacional NFS-e devolve esse fallback genérico (sem detalhar o motivo real)
      // quando o pedido de evento é rejeitado internamente -- o caso mais comum é o prazo de
      // cancelamento (parametrizado por cada prefeitura) já ter passado. Fica registrado
      // status/raw acima nos logs para investigação.
      mensagem = "O Sistema Nacional NFS-e recusou o cancelamento sem detalhar o motivo — o mais comum é o prazo de cancelamento (que varia por prefeitura) já ter passado.";
    } else {
      mensagem = result.error || result.raw || "Falha na comunicação com o Sistema Nacional NFS-e";
    }
    throw new Error(mensagem);
  }

  await prisma.nfseInvoice.update({
    where: { id: invoiceId },
    data: { status: "cancelled", cancelReason: motivo || null, cancelledAt: new Date() },
  });

  return true;
}
