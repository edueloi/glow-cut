import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "glow_cut_jwt_secret_2024_change_in_prod";
export const JWT_EXPIRES = "7d";

export interface JwtPayload {
  sub: string;       // user id
  type: "admin" | "superadmin" | "professional";
  tenantId?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/** Extrai token do header Authorization: Bearer <token> ou cookie auth_token */
function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = req.headers.cookie;
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

/** Middleware: exige token válido */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Não autenticado." });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Token inválido ou expirado." });

  (req as any).auth = payload;
  next();
}

/** Middleware: exige token válido E tipo superadmin */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if ((req as any).auth?.type !== "superadmin") {
      return res.status(403).json({ error: "Acesso restrito ao super-admin." });
    }
    next();
  });
}

/** Middleware: exige uma permissão específica de super-admin */
export function requireSuperPermission(module: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    requireSuperAdmin(req, res, async () => {
      const auth = (req as any).auth;
      const { prisma } = await import("../prisma");
      
      const sa = await (prisma as any).superAdmin.findUnique({ where: { id: auth.sub } });
      if (!sa) return res.status(401).json({ error: "Super-admin não encontrado." });

      // Admin mestre sempre tem acesso
      if (sa.username.toLowerCase() === "admin") return next();

      try {
        const perms = JSON.parse(sa.permissions || "{}");
        if (perms === "all" || perms[module]?.ver) {
          return next();
        }
      } catch (e) {}

      return res.status(403).json({ error: `Sem permissão para o módulo: ${module}` });
    });
  };
}

