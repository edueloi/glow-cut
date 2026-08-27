import bcrypt from "bcryptjs";

const BCRYPT_PREFIX = /^\$2[aby]\$\d{2}\$/;

export function isBcryptHash(value: string | null | undefined): boolean {
  return typeof value === "string" && BCRYPT_PREFIX.test(value) && value.length === 60;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// Aceita os dois formatos durante a migração: se `stored` já é um hash bcrypt, compara com
// bcrypt.compare; se ainda é o texto puro legado, compara direto e sinaliza `needsRehash` pro
// chamador regravar o hash na hora (migração transparente, sem forçar reset de senha).
export async function verifyPassword(
  plain: string,
  stored: string | null | undefined
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!stored) return { valid: false, needsRehash: false };
  if (isBcryptHash(stored)) {
    return { valid: await bcrypt.compare(plain, stored), needsRehash: false };
  }
  const valid = plain === stored;
  return { valid, needsRehash: valid };
}
