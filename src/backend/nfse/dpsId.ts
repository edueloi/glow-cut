// Identificador da DPS (Declaração de Prestação de Serviço), 45 dígitos após o literal "DPS":
// cLocEmi(7) + tpInsc(1) + inscricaoFederal(14) + serie(5) + nDPS(15)
// Usado como valor do atributo Id em <infDPS Id="DPS...">.

export function onlyDigits(v: string | number | null | undefined): string {
  return String(v || "").replace(/\D/g, "");
}

interface GerarIdDpsParams {
  codigoMunicipio: string;
  cnpj?: string;
  cpf?: string;
  serie: number;
  numero: number;
}

// tpInsc: 1 = CPF, 2 = CNPJ (confirmado contra o servidor real — o nome do campo é
// contraintuitivo, mas o próprio Sistema Nacional NFS-e rejeita com erro E0004
// "identificador difere da concatenação" quando invertido)
export function gerarIdDPS({ codigoMunicipio, cnpj, cpf, serie, numero }: GerarIdDpsParams) {
  const cLocEmi = onlyDigits(codigoMunicipio).padStart(7, "0");

  const tipoInscricao = cnpj ? 2 : 1;
  const inscricaoFederal = tipoInscricao === 2
    ? onlyDigits(cnpj).padStart(14, "0")
    : onlyDigits(cpf).padStart(14, "0"); // CPF completa com zeros à esquerda até 14 posições

  const serieStr = String(serie).padStart(5, "0");
  const nDPS = String(numero).padStart(15, "0");

  return {
    id: `DPS${cLocEmi}${tipoInscricao}${inscricaoFederal}${serieStr}${nDPS}`,
    tipoInscricao,
    inscricaoFederal,
  };
}
