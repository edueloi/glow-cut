import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { getTenantId, samePhone } from "../utils/helpers";

function toNullableString(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  return text ? text : null;
}

function toNullableBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return ["true", "1", "on", "yes"].includes(String(value).toLowerCase());
}

function toNullableInt(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasOwn(body: any, key: string) {
  return !!body && Object.prototype.hasOwnProperty.call(body, key);
}

function buildClientData(body: any, current?: any, fallbackPhone?: string) {
  return {
    name: hasOwn(body, "name") ? String(body?.name || "").trim() : String(current?.name || "").trim(),
    phone: hasOwn(body, "phone")
      ? String(body?.phone || fallbackPhone || "").trim()
      : String(current?.phone || fallbackPhone || "").trim(),
    age: hasOwn(body, "age") ? toNullableInt(body?.age) : current?.age ?? null,
    email: hasOwn(body, "email") ? toNullableString(body?.email) : current?.email ?? null,
    cpf: hasOwn(body, "cpf") ? toNullableString(body?.cpf) : current?.cpf ?? null,
    birthDate: hasOwn(body, "birthDate") ? toNullableString(body?.birthDate) : current?.birthDate ?? null,
    gender: hasOwn(body, "gender") ? toNullableString(body?.gender) : current?.gender ?? null,
    whatsapp: hasOwn(body, "whatsapp") ? toNullableBoolean(body?.whatsapp, true) : Boolean(current?.whatsapp ?? true),
    cep: hasOwn(body, "cep") ? toNullableString(body?.cep) : current?.cep ?? null,
    street: hasOwn(body, "street") ? toNullableString(body?.street) : current?.street ?? null,
    number: hasOwn(body, "number") ? toNullableString(body?.number) : current?.number ?? null,
    complement: hasOwn(body, "complement") ? toNullableString(body?.complement) : current?.complement ?? null,
    neighborhood: hasOwn(body, "neighborhood") ? toNullableString(body?.neighborhood) : current?.neighborhood ?? null,
    city: hasOwn(body, "city") ? toNullableString(body?.city) : current?.city ?? null,
    state: hasOwn(body, "state") ? toNullableString(body?.state) : current?.state ?? null,
    hasChildren: hasOwn(body, "hasChildren") ? toNullableBoolean(body?.hasChildren) : Boolean(current?.hasChildren ?? false),
    isMarried: hasOwn(body, "isMarried") ? toNullableBoolean(body?.isMarried) : Boolean(current?.isMarried ?? false),
    spouseName: hasOwn(body, "spouseName") ? toNullableString(body?.spouseName) : current?.spouseName ?? null,
    maritalStatus: hasOwn(body, "maritalStatus") ? toNullableString(body?.maritalStatus) : current?.maritalStatus ?? null,
    education: hasOwn(body, "education") ? toNullableString(body?.education) : current?.education ?? null,
    notes: hasOwn(body, "notes") ? toNullableString(body?.notes) : current?.notes ?? null,
  };
}

async function findClientByPhone(tenantId: string, phone: string) {
  const clients = await (prisma as any).client.findMany({ where: { tenantId } });
  return clients.find((client: any) => samePhone(client.phone, phone)) || null;
}

function mapClient(client: any) {
  if (!client) return client;
  return {
    ...client,
    appointments: client.appointment || client.appointments || [],
    comandas: client.comanda || client.comandas || [],
    appointment: undefined,
    comanda: undefined,
  };
}

function mapPublicClient(client: any) {
  if (!client) return client;
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    age: client.age ?? null,
    birthDate: client.birthDate ?? null,
  };
}

export const clientController = {
  async list(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const clientsData = await (prisma as any).client.findMany({
        where: { tenantId },
        include: {
          appointment: true,
          comanda: true,
        },
        orderBy: { name: "asc" },
      });
      res.json(clientsData.map(mapClient));
    } catch {
      res.status(500).json({ error: "Erro ao buscar clientes." });
    }
  },

  async search(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { phone, name } = req.query;
    try {
      if (phone) {
        const matched = await findClientByPhone(tenantId, String(phone));
        if (!matched) return res.json(null);
        const client = await (prisma as any).client.findUnique({
          where: { id: matched.id },
          include: { comanda: { where: { status: "open" } } },
        });
        return res.json(mapClient(client));
      }

      if (name) {
        const clientsData = await (prisma as any).client.findMany({
          where: { tenantId, name: { contains: String(name) } },
          include: { comanda: { where: { status: "open" } } },
          orderBy: { name: "asc" },
        });
        return res.json(clientsData.map(mapClient));
      }

      return res.status(400).json({ error: "Phone ou name obrigatório." });
    } catch {
      return res.status(500).json({ error: "Erro ao buscar cliente." });
    }
  },

  async publicSearch(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: "Phone obrigatório." });
    try {
      const client = await findClientByPhone(tenantId, String(phone));
      if (!client) return res.json(null);
      return res.json(mapPublicClient(client));
    } catch {
      return res.status(500).json({ error: "Erro ao buscar cliente." });
    }
  },

  async create(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    const payload = buildClientData(req.body);
    if (!payload.name || !payload.phone) {
      return res.status(400).json({ error: "Nome e telefone são obrigatórios." });
    }

    try {
      const existing = await findClientByPhone(tenantId, payload.phone);
      const isPublicRequest = !(req as any).auth;
      const client = existing
        ? await (prisma as any).client.update({
            where: { id: existing.id },
            data: buildClientData(req.body, existing, existing.phone),
          })
        : await (prisma as any).client.create({
            data: {
              id: randomUUID(),
              tenantId,
              ...payload,
            },
          });
      res.json(isPublicRequest ? mapPublicClient(client) : client);
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao salvar cliente." });
    }
  },

  async update(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    try {
      const current = await (prisma as any).client.findFirst({
        where: { id: req.params.id, tenantId },
      });
      if (!current) return res.status(404).json({ error: "Cliente não encontrado." });

      const payload = buildClientData(req.body, current, current.phone);
      const client = await (prisma as any).client.update({
        where: { id: current.id },
        data: payload,
      });
      res.json(client);
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao atualizar cliente." });
    }
  },

  async delete(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    try {
      const client = await (prisma as any).client.findFirst({
        where: { id: req.params.id, tenantId },
        include: {
          appointment: { select: { id: true } },
          comanda: { select: { id: true } },
        },
      });

      if (!client) return res.status(404).json({ error: "Cliente não encontrado." });

      const appointmentIds = (client.appointment || []).map((a: any) => a.id);
      const comandaIds = (client.comanda || []).map((c: any) => c.id);

      // Excluir registros filhos antes do cliente
      if (appointmentIds.length > 0) {
        await (prisma as any).wppMessageSent.deleteMany({ where: { appointmentId: { in: appointmentIds } } }).catch(() => {});
        await (prisma as any).appointment.deleteMany({ where: { id: { in: appointmentIds } } });
      }
      if (comandaIds.length > 0) {
        // Excluir itens das comandas antes das comandas
        await (prisma as any).comandaItem.deleteMany({ where: { comandaId: { in: comandaIds } } }).catch(() => {});
        await (prisma as any).comanda.deleteMany({ where: { id: { in: comandaIds } } });
      }

      await (prisma as any).client.delete({ where: { id: client.id } });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao excluir cliente." });
    }
  },
};
