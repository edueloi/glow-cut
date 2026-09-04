import https from "https";
import zlib from "zlib";
import axios from "axios";
import { loadPfx } from "./signer";

export type NfseEnvironment = "homologacao" | "producao";
type NfseService = "sefin" | "parametrizacao";

// Sistema Nacional NFS-e — comunicação REST+JSON, autenticação mTLS (o certificado do
// contribuinte identifica quem está conectando na própria camada TLS). São dois serviços
// em hosts distintos, confirmados via os swaggers reais (não documentados de forma óbvia
// no manual em PDF): emissão de NFS-e fica no Sefin Nacional; parâmetros municipais
// (alíquota de ISS etc.) foram migrados para o serviço de "parametrizacao" no host ADN.
const BASE_URLS: Record<NfseService, Record<NfseEnvironment, string>> = {
  // Emissão de NFS-e (POST /nfse), consulta por chave de acesso, DPS, eventos
  sefin: {
    homologacao: "https://sefin.producaorestrita.nfse.gov.br/SefinNacional",
    producao: "https://sefin.nfse.gov.br/SefinNacional",
  },
  // Parâmetros municipais (alíquota ISS, convênio, regimes especiais, retenções)
  parametrizacao: {
    homologacao: "https://adn.producaorestrita.nfse.gov.br/parametrizacao",
    producao: "https://adn.nfse.gov.br/parametrizacao",
  },
};

// Compacta o XML da DPS em GZip e codifica em base64, formato exigido pelo corpo da mensagem
export function gzipBase64(xml: string): string {
  return zlib.gzipSync(Buffer.from(xml, "utf-8")).toString("base64");
}

export function ungzipBase64(gzipB64: string): string {
  return zlib.gunzipSync(Buffer.from(gzipB64, "base64")).toString("utf-8");
}

export interface NfseRestResult {
  ok: boolean;
  statusCode: number;
  data: any;
  raw: string;
  error?: string;
}

interface CallNfseRestParams {
  environment: NfseEnvironment;
  method: string;
  path: string;
  body?: any;
  pfxPath: string;
  pfxPassword: string;
  timeoutMs: number;
  service?: NfseService;
}

export async function callNfseRest({
  environment,
  method,
  path,
  body,
  pfxPath,
  pfxPassword,
  timeoutMs,
  service = "sefin",
}: CallNfseRestParams): Promise<NfseRestResult> {
  const url = `${BASE_URLS[service][environment]}${path}`;

  // mTLS: o certificado do contribuinte autentica a própria conexão TLS, exigido
  // pelo Sistema Nacional NFS-e além da assinatura do XML. Extraímos chave/cert em
  // PEM via node-forge (em vez de passar pfx/passphrase brutos ao https.Agent) porque
  // o parser PKCS12 nativo do OpenSSL do Node rejeita alguns certificados A1 emitidos
  // com PBES2/AES-256 ("Unsupported PKCS12 PFX data"), que o node-forge lê sem problema.
  let cert;
  try {
    cert = loadPfx(pfxPath, pfxPassword);
  } catch (e: any) {
    return { ok: false, statusCode: 0, data: null, raw: "", error: `Certificado inválido: ${e.message}` };
  }

  // Envia o certificado do titular + cadeia intermediária concatenados — o servidor
  // mTLS precisa da cadeia completa para validar a confiança até a raiz ICP-Brasil.
  const httpsAgent = new https.Agent({
    key: cert.privateKeyPem,
    cert: cert.certificatePem + (cert.chainPem || ""),
    rejectUnauthorized: true,
  });

  try {
    const response = await axios.request({
      url,
      method: method as any,
      data: body,
      httpsAgent,
      timeout: timeoutMs,
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    });

    const raw = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    return {
      ok: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      data: typeof response.data === "object" ? response.data : null,
      raw,
    };
  } catch (err: any) {
    return { ok: false, statusCode: 0, data: null, raw: "", error: err.message };
  }
}

interface CallNfseEventoRestParams {
  environment: NfseEnvironment;
  chaveAcesso: string;
  signedXml: string;
  pfxPath: string;
  pfxPassword: string;
  timeoutMs: number;
}

// Envia o pedido de registro de evento (ex: cancelamento) para uma NFS-e já autorizada.
// Path real confirmado via swagger do Sefin Nacional: POST /nfse/{chaveAcesso}/eventos.
export async function callNfseEventoRest({
  environment,
  chaveAcesso,
  signedXml,
  pfxPath,
  pfxPassword,
  timeoutMs,
}: CallNfseEventoRestParams): Promise<NfseRestResult> {
  return callNfseRest({
    environment,
    method: "POST",
    path: `/nfse/${chaveAcesso}/eventos`,
    body: { pedRegEventoXmlGZipB64: gzipBase64(signedXml) },
    pfxPath,
    pfxPassword,
    timeoutMs,
  });
}
