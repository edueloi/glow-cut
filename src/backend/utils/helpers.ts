import { Request } from "express";
import { format, startOfDay, addDays } from "date-fns";

export function getTenantId(req: Request): string | null {
  // Requisição autenticada: o tenant vem SEMPRE do JWT, nunca do header/query enviado pelo
  // cliente — senão qualquer usuário autenticado de um tenant conseguiria ler/escrever dados de
  // outro tenant só trocando o header "x-tenant-id" (curl/devtools), já que o token continua
  // válido. O header só é usado como fallback quando não há JWT (rotas públicas de agendamento,
  // onde o tenant é resolvido a partir do slug da página e não existe login).
  const authTenantId = (req as any)?.auth?.tenantId;
  if (authTenantId) return authTenantId;
  return (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string) || null;
}

export function normalizePhone(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizePhone(a);
  const right = normalizePhone(b);
  return !!left && !!right && left === right;
}

export function asBool(value: any, fallback = false): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value === "true" || value === "1";
  return fallback;
}

export function asNumber(value: any, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toDateOnly(date: string | Date): Date {
  if (date instanceof Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  }
  const [year, month, day] = String(date).slice(0, 10).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

export function getDayRange(date: string | Date) {
  const base = toDateOnly(date);
  const start = startOfDay(base);
  const end = addDays(start, 1);
  return { start, end };
}

export function formatDateOnly(date: string | Date): string {
  return format(toDateOnly(date), "yyyy-MM-dd");
}

export function getSaudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function applyTemplateVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}
