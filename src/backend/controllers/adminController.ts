import { Request, Response } from "express";
import { prisma } from "../prisma";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { getTenantId, asBool, formatDateOnly } from "../utils/helpers";

const __filename = ""; // not used here as we use process.cwd()
export const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

/**
 * Deleta arquivo de upload local caso a URL aponte para /uploads/.
 * Seguro: ignora URLs externas, base64 ou valores nulos.
 */
export function deleteLocalFile(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/")) return;
  const filename = path.basename(url);
  const filepath = path.join(uploadsDir, filename);
  try {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  } catch {
    // falha silenciosa — arquivo já removido ou sem permissão
  }
}

const DEFAULT_AGENDA_SETTINGS = {
  onlineBookingEnabled: true,
  enablePatTerminal: false,
  enableSelfService: true,
  enableClientAgendaView: true,
  enableAppointmentSearch: true,
  enableWhatsAppReminders: true,
  autoConfirmAppointments: false,
  allowClientCancellation: true,
  allowClientReschedule: true,
  blockNationalHolidays: false,
  selfServiceShowProfessional: true,
  selfServiceShowPrices: true,
  selfServiceWelcomeMessage: "",
  slotIntervalMinutes: 30,
  minAdvanceMinutes: 30,
  maxAdvanceDays: 60,
  allowClientRecurrence: false,
  notes: "",
};

function normalizeAgendaSettings(row: any, tenantId: string) {
  return {
    id: row?.id || "",
    tenantId,
    onlineBookingEnabled: asBool(row?.onlineBookingEnabled, DEFAULT_AGENDA_SETTINGS.onlineBookingEnabled),
    enablePatTerminal: asBool(row?.enablePatTerminal, DEFAULT_AGENDA_SETTINGS.enablePatTerminal),
    enableSelfService: asBool(row?.enableSelfService, DEFAULT_AGENDA_SETTINGS.enableSelfService),
    enableClientAgendaView: asBool(row?.enableClientAgendaView, DEFAULT_AGENDA_SETTINGS.enableClientAgendaView),
    enableAppointmentSearch: asBool(row?.enableAppointmentSearch, DEFAULT_AGENDA_SETTINGS.enableAppointmentSearch),
    enableWhatsAppReminders: asBool(row?.enableWhatsAppReminders, DEFAULT_AGENDA_SETTINGS.enableWhatsAppReminders),
    autoConfirmAppointments: asBool(row?.autoConfirmAppointments, DEFAULT_AGENDA_SETTINGS.autoConfirmAppointments),
    allowClientCancellation: asBool(row?.allowClientCancellation, DEFAULT_AGENDA_SETTINGS.allowClientCancellation),
    allowClientReschedule: asBool(row?.allowClientReschedule, DEFAULT_AGENDA_SETTINGS.allowClientReschedule),
    allowClientRecurrence: asBool(row?.allowClientRecurrence, DEFAULT_AGENDA_SETTINGS.allowClientRecurrence),
    blockNationalHolidays: asBool(row?.blockNationalHolidays, DEFAULT_AGENDA_SETTINGS.blockNationalHolidays),
    selfServiceShowProfessional: asBool(row?.selfServiceShowProfessional, DEFAULT_AGENDA_SETTINGS.selfServiceShowProfessional),
    selfServiceShowPrices: asBool(row?.selfServiceShowPrices, DEFAULT_AGENDA_SETTINGS.selfServiceShowPrices),
    selfServiceWelcomeMessage: row?.selfServiceWelcomeMessage || DEFAULT_AGENDA_SETTINGS.selfServiceWelcomeMessage,
    minAdvanceMinutes: Number(row?.minAdvanceMinutes) || DEFAULT_AGENDA_SETTINGS.minAdvanceMinutes,
    maxAdvanceDays: Number(row?.maxAdvanceDays) || DEFAULT_AGENDA_SETTINGS.maxAdvanceDays,
    slotIntervalMinutes: Number(row?.slotIntervalMinutes) || DEFAULT_AGENDA_SETTINGS.slotIntervalMinutes,
    notes: row?.notes || "",
  };
}

async function ensureAgendaSettingsRecord(tenantId: string) {
  const rows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM AgendaSettings WHERE tenantId = ? LIMIT 1`, tenantId);
  if (rows.length > 0) return normalizeAgendaSettings(rows[0], tenantId);
  return normalizeAgendaSettings({ tenantId }, tenantId);
}

export const adminController = {
  // Atualizar perfil do próprio admin (dashboard)
  async updateProfile(req: Request, res: Response) {
    const { name, jobTitle, bio, phone, password, photo } = req.body;

    console.log(`[Profile] Atualizando perfil usuário ${req.params.id}`, { name, photo: photo ? (photo.substring(0, 30) + "...") : null });

    try {
      // Remove foto antiga do disco ao trocar
      if (photo !== undefined) {
        const current = await (prisma as any).adminUser.findUnique({ where: { id: req.params.id }, select: { photo: true } });
        if (current?.photo && current.photo !== photo) deleteLocalFile(current.photo);
      }

      const user = await (prisma as any).adminUser.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(jobTitle !== undefined && { jobTitle }),
          ...(bio !== undefined && { bio }),
          ...(phone !== undefined && { phone }),
          ...(password !== undefined && { password }),
          ...(photo !== undefined && { photo }),
        },
      });

      // Sincronizar com a tabela de Profissionais (Nossa Equipe)
      try {
        await (prisma as any).professional.updateMany({
          where: { 
            OR: [
              { email: user.email, tenantId: user.tenantId },
              { name: user.name, tenantId: user.tenantId }
            ]
          },
          data: {
            ...(name !== undefined && { name }),
            ...(jobTitle !== undefined && { role: jobTitle }),
            ...(bio !== undefined && { bio }),
            ...(phone !== undefined && { phone }),
            ...(photo !== undefined && { photo }),
          }
        });
      } catch (syncErr) {
        console.error("[ProfileSync] Erro ao sincronizar com profissional:", syncErr);
      }

      res.json(user);
    } catch (e: any) {
      console.error("[Profile] Erro ao atualizar:", e.message);
      res.status(400).json({ error: "Erro ao atualizar perfil." });
    }
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const user = await (prisma as any).adminUser.findFirst({
      where: { email, password, isActive: true },
      include: { tenant: { include: { plan: true } } }
    });
    if (!user) return res.status(401).json({ error: "E-mail ou senha inválidos." });
    await (prisma as any).adminUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    res.json({
      id: user.id, name: user.name, email: user.email, role: user.role,
      jobTitle: user.jobTitle, tenantId: user.tenantId,
      tenantName: user.tenant.name, planName: user.tenant.plan.name,
      canCreateUsers: user.canCreateUsers, canDeleteAccount: user.canDeleteAccount,
      permissions: user.permissions,
    });
  },

  async getTenant(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return res.status(404).json({ error: "Estúdio não encontrado." });
    res.json(tenant);
  },

  async updateBranding(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    
    const { themeColor, logoUrl, coverUrl, address, instagram, welcomeMessage, title, description, slug, mission, vision, values } = req.body;
    
    console.log(`[Branding] Atualizando tenant ${tenantId}`, { logoUrl, coverUrl, slug });

    try {
      // Remove imagens antigas do disco ao trocar
      if (logoUrl !== undefined || coverUrl !== undefined || req.body.siteCoverUrl !== undefined) {
        const cur = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { logoUrl: true, coverUrl: true, siteCoverUrl: true } });
        if (cur) {
          if (logoUrl !== undefined && cur.logoUrl && cur.logoUrl !== logoUrl) deleteLocalFile(cur.logoUrl);
          if (coverUrl !== undefined && cur.coverUrl && cur.coverUrl !== coverUrl) deleteLocalFile(cur.coverUrl);
          if (req.body.siteCoverUrl !== undefined && cur.siteCoverUrl && cur.siteCoverUrl !== req.body.siteCoverUrl) deleteLocalFile(cur.siteCoverUrl);
        }
      }

      const data: any = {};
      if (themeColor !== undefined) data.themeColor = themeColor;
      if (logoUrl !== undefined) data.logoUrl = logoUrl;
      if (coverUrl !== undefined) data.coverUrl = coverUrl;
      if (req.body.siteCoverUrl !== undefined) data.siteCoverUrl = req.body.siteCoverUrl;
      if (address !== undefined) data.address = address;
      if (instagram !== undefined) data.instagram = instagram;
      if (welcomeMessage !== undefined) data.welcomeMessage = welcomeMessage;
      if (description !== undefined) data.description = description;
      if (title !== undefined) data.name = title;
      if (slug !== undefined) data.slug = slug;
      if (mission !== undefined) data.mission = mission;
      if (vision !== undefined) data.vision = vision;
      if (values !== undefined) data.values = values;
      if (req.body.phone !== undefined) data.phone = req.body.phone;
      if (req.body.showProducts !== undefined) data.showProducts = !!req.body.showProducts;
      if (req.body.showServices !== undefined) data.showServices = !!req.body.showServices;
      if (req.body.showTeam !== undefined) data.showTeam = !!req.body.showTeam;

      const b = req.body;
      if (b.aboutTitle !== undefined) data.aboutTitle = b.aboutTitle;
      if (b.feature1Title !== undefined) data.feature1Title = b.feature1Title;
      if (b.feature1Description !== undefined) data.feature1Description = b.feature1Description;
      if (b.feature2Title !== undefined) data.feature2Title = b.feature2Title;
      if (b.feature2Description !== undefined) data.feature2Description = b.feature2Description;
      if (b.feature3Title !== undefined) data.feature3Title = b.feature3Title;
      if (b.feature3Description !== undefined) data.feature3Description = b.feature3Description;
      if (b.experienceYears !== undefined) data.experienceYears = b.experienceYears;

      const tenant = await (prisma as any).tenant.update({
        where: { id: tenantId },
        data
      });
      res.json(tenant);
    } catch (e: any) {
      console.error("[Branding] Erro ao salvar:", e.message);
      if (e.code === 'P2002') {
        return res.status(400).json({ error: "Este link (slug) já está sendo usado por outro estúdio." });
      }
      res.status(400).json({ error: "Erro ao salvar configurações do estúdio." });
    }
  },

  async upload(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const authType = (req as any).auth?.type;

    if (!tenantId && authType !== "superadmin") {
      return res.status(400).json({ error: "tenantId obrigatório." });
    }

    const { data, mimeType } = req.body as { data?: string; mimeType?: string };
    if (!data || !mimeType) return res.status(400).json({ error: "data e mimeType são obrigatórios." });
    const base64 = data.includes(",") ? data.split(",")[1] : data;
    const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const prefix = tenantId || "system";
    const filename = `${prefix}-${randomUUID()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    try {
      fs.writeFileSync(filepath, Buffer.from(base64, "base64"));
      res.json({ url: `/uploads/${filename}` });
    } catch (e: any) {
      res.status(500).json({ error: "Erro ao salvar imagem." });
    }
  },

  async unifiedLogin(req: Request, res: Response) {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: "Preencha todos os campos." });

    const sa = await (prisma as any).superAdmin.findFirst({ where: { username: identifier, password } });
    if (sa) return res.json({ type: "superadmin", id: sa.id, username: sa.username, role: "superadmin" });

    const adminUser = await (prisma as any).adminUser.findFirst({
      where: { email: identifier, password, isActive: true },
      include: { tenant: { include: { plan: true } } }
    });
    if (adminUser) {
      await (prisma as any).adminUser.update({ where: { id: adminUser.id }, data: { lastLogin: new Date() } });
      return res.json({
        type: "admin", id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role,
        jobTitle: adminUser.jobTitle, tenantId: adminUser.tenantId, tenantName: adminUser.tenant.name,
        tenantSlug: adminUser.tenant.slug, planName: adminUser.tenant.plan.name,
        canCreateUsers: adminUser.canCreateUsers, canDeleteAccount: adminUser.canDeleteAccount,
        permissions: adminUser.permissions,
      });
    }

    const prof = await (prisma as any).professional.findFirst({
      where: { OR: [ { name: identifier }, { email: identifier } ], password, isActive: true },
    });
    if (prof) {
      return res.json({ type: "professional", id: prof.id, name: prof.name, role: prof.role, tenantId: prof.tenantId, permissions: (prof as any).permissions });
    }
    return res.status(401).json({ error: "Usuário ou senha inválidos." });
  },

  async checkSlug(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const { slug } = req.params;
    if (!slug || slug.length < 2) return res.json({ available: false, message: "Slug muito curto." });
    const existing = await (prisma as any).tenant.findFirst({
      where: { slug, NOT: { id: tenantId ?? "" } },
      select: { id: true },
    });
    if (existing) return res.json({ available: false, message: "Este link já está em uso por outro estúdio." });
    return res.json({ available: true });
  },

  async getTenantBySlug(req: Request, res: Response) {
    const tenant = await (prisma as any).tenant.findFirst({
      where: { slug: req.params.slug, isActive: true },
      select: { 
        id: true, name: true, slug: true, themeColor: true, logoUrl: true, coverUrl: true, siteCoverUrl: true,
        address: true, instagram: true, welcomeMessage: true, description: true,
        mission: true, vision: true, values: true, phone: true,
        showProducts: true, showServices: true, showTeam: true,
        aboutTitle: true, experienceYears: true,
        feature1Title: true, feature1Description: true,
        feature2Title: true, feature2Description: true,
        feature3Title: true, feature3Description: true
      }
    });
    if (!tenant) return res.status(404).json({ error: "Estúdio não encontrado." });
    let agendaSettings: any = { onlineBookingEnabled: true, enableSelfService: true, enableAppointmentSearch: true, enableClientAgendaView: true, selfServiceShowProfessional: true, selfServiceShowPrices: true, selfServiceWelcomeMessage: "", allowClientCancellation: true, allowClientReschedule: false, allowClientRecurrence: false, minAdvanceMinutes: 30, maxAdvanceDays: 60, slotIntervalMinutes: 30 };
    try {
      const settings = await ensureAgendaSettingsRecord(tenant.id);
      agendaSettings = {
        onlineBookingEnabled: settings.onlineBookingEnabled,
        enableSelfService: settings.enableSelfService,
        enableAppointmentSearch: settings.enableAppointmentSearch,
        enableClientAgendaView: settings.enableClientAgendaView,
        selfServiceShowProfessional: settings.selfServiceShowProfessional,
        selfServiceShowPrices: settings.selfServiceShowPrices,
        selfServiceWelcomeMessage: settings.selfServiceWelcomeMessage || "",
        allowClientCancellation: settings.allowClientCancellation,
        allowClientReschedule: settings.allowClientReschedule,
        allowClientRecurrence: settings.allowClientRecurrence,
        minAdvanceMinutes: settings.minAdvanceMinutes,
        maxAdvanceDays: settings.maxAdvanceDays,
        slotIntervalMinutes: settings.slotIntervalMinutes,
      };
    } catch (e) {
      console.warn("[tenant-by-slug] AgendaSettings fallback used.");
    }
    res.json({ ...tenant, agendaSettings });
  },

  async listTeam(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const users = await (prisma as any).adminUser.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
      res.json(users);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao buscar equipe." });
    }
  },

  async createTeamUser(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    const { name, email, password, role, jobTitle, phone, photo, canCreateUsers, canDeleteAccount, permissions } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email e password são obrigatórios." });
    }

    try {
      const existing = await (prisma as any).adminUser.findFirst({ where: { email } });
      if (existing) return res.status(400).json({ error: "E-mail já cadastrado." });

      const user = await (prisma as any).adminUser.create({
        data: {
          id: randomUUID(),
          tenantId,
          name,
          email,
          password,
          role: role || "admin",
          jobTitle: jobTitle || null,
          phone: phone || null,
          photo: photo || null,
          canCreateUsers: !!canCreateUsers,
          canDeleteAccount: !!canDeleteAccount,
          isActive: true,
          permissions: permissions ? (typeof permissions === "string" ? permissions : JSON.stringify(permissions)) : null,
        },
      });
      res.json(user);
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao criar usuário." });
    }
  },

  async updateTeamUser(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    const { name, email, password, role, jobTitle, phone, photo, isActive, canCreateUsers, canDeleteAccount, permissions } = req.body;

    try {
      const current = await (prisma as any).adminUser.findFirst({
        where: { id: req.params.id, tenantId },
      });
      if (!current) return res.status(404).json({ error: "Usuário não encontrado." });

      // Remove foto antiga do disco ao trocar
      if (photo !== undefined && current.photo && current.photo !== photo) deleteLocalFile(current.photo);

      const user = await (prisma as any).adminUser.update({
        where: { id: current.id },
        data: {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(password !== undefined && { password }),
          ...(role !== undefined && { role }),
          ...(jobTitle !== undefined && { jobTitle }),
          ...(phone !== undefined && { phone }),
          ...(photo !== undefined && { photo }),
          ...(isActive !== undefined && { isActive }),
          ...(canCreateUsers !== undefined && { canCreateUsers: !!canCreateUsers }),
          ...(canDeleteAccount !== undefined && { canDeleteAccount: !!canDeleteAccount }),
          ...(permissions !== undefined && { permissions: typeof permissions === "string" ? permissions : JSON.stringify(permissions) }),
        },
      });
      res.json(user);
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao atualizar usuário." });
    }
  },

  async deleteTeamUser(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    const authUserId = (req as any)?.auth?.sub;
    if (authUserId && authUserId === req.params.id) {
      return res.status(400).json({ error: "Você não pode excluir o próprio usuário." });
    }

    try {
      await (prisma as any).adminUser.deleteMany({
        where: { id: req.params.id, tenantId },
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao excluir usuário." });
    }
  }
};
