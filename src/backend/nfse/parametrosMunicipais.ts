import { callNfseRest, type NfseEnvironment } from "./restClient";

export interface AliquotaResult {
  aliquota: number | null;
  encontrado: boolean;
}

// Consulta a alíquota do ISS parametrizada pelo município para um código de serviço —
// dispensa o usuário de digitar a alíquota manualmente quando o município já aderiu
// ao Sistema Nacional NFS-e. Serviço de parametrização foi migrado para um host próprio
// (ver comentário em restClient.ts), path real confirmado via swagger:
// GET /{codigoMunicipio}/{codigoServico}/{competencia}/aliquota (competencia = data ISO).
export async function consultarAliquotaServico(
  environment: NfseEnvironment,
  codigoMunicipio: string,
  codigoServico: string,
  pfxPath: string,
  pfxPassword: string,
  timeoutMs: number
): Promise<AliquotaResult> {
  const competencia = new Date().toISOString();
  const result = await callNfseRest({
    environment,
    method: "GET",
    service: "parametrizacao",
    path: `/${codigoMunicipio}/${codigoServico}/${encodeURIComponent(competencia)}/aliquota`,
    pfxPath,
    pfxPassword,
    timeoutMs,
  });

  if (!result.ok || !result.data?.aliquotas) {
    return { aliquota: null, encontrado: false };
  }

  // "aliquotas" é um objeto cuja(s) chave(s) representa(m) o tipo de incidência;
  // pegamos o primeiro item vigente (sem DtFim ou DtFim no futuro) da primeira chave.
  const grupos = Object.values(result.data.aliquotas) as any[];
  const primeiro = grupos[0]?.[0];
  const aliquota = primeiro?.Aliq;

  return {
    aliquota: typeof aliquota === "number" ? aliquota : null,
    encontrado: typeof aliquota === "number",
  };
}
