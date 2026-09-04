import crypto from "crypto";

// Criptografia da senha do certificado A1 (.pfx). Sem fallback hardcoded para a chave —
// a senha do certificado desbloqueia o certificado digital do salão (equivalente a uma
// assinatura), então preferimos falhar alto a rodar com uma chave fraca conhecida.
function getKey(): Buffer {
  const raw = process.env.NFSE_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("NFSE_ENCRYPTION_KEY não configurada no ambiente do backend.");
  }
  return Buffer.from(raw, "utf8").slice(0, 32);
}

export function encryptCertPassword(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + enc.toString("hex");
}

export function decryptCertPassword(enc: string): string {
  const key = getKey();
  const [ivHex, encHex] = enc.split(":");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(ivHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]).toString("utf8");
}
