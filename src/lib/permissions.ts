// ─────────────────────────────────────────────────────────────────────────────
// Sistema de Permissões — Glow & Cut Studio
//
// Estrutura:
//  - PERMISSION_MODULES: todos os módulos/telas do sistema
//  - PERMISSION_ACTIONS: ações possíveis por módulo
//  - DEFAULT_ROLES: perfis padrão prontos (admin, profissional, secretaria)
//  - PermissionSet: type-safe do mapa de permissões
//  - Helpers: hasPermission, canView, canDo
//
// Uso nos componentes:
//   const { can, canView } = usePermissions();
//   if (!canView("agenda")) return <AccessDenied />;
//   <button disabled={!can("comandas", "criar")}>Nova Comanda</button>
// ─────────────────────────────────────────────────────────────────────────────

// ── Módulos do sistema ──────────────────────────────────────────────────────
export const MODULES = [
  // Principal
  "dashboard",
  "agenda",
  "minha_agenda",
  "agenda_calendario",
  "agenda_cliente",
  "agenda_consultar",
  "agenda_bloqueios",
  "agenda_horarios",
  "agenda_pat",
  "agenda_autoatendimento",
  // Operacional
  "clientes",
  "profissionais",
  "servicos",
  "produtos",
  "pacotes",
  "comandas",
  "fluxo",
  "financeiro",
  "fin_controle",
  "fin_caixa",
  "fin_pagamentos",
  "fin_formas",
  "fin_despesas",
  "fin_debito",
  "fin_credito",
  "fin_contas",
  "fin_exportacao",
  "fin_antecipacao",
  "fin_motivos",
  "fin_relatorio",
  // Sistema
  "horarios",
  "whatsapp",
  "perfil",
  "configuracoes",
  // Super
  "permissoes",
  "relatorios",
] as const;

export type Module = (typeof MODULES)[number];

// ── Ações disponíveis ────────────────────────────────────────────────────────
export const ACTIONS = [
  "ver",           // ver a tela/lista
  "criar",         // criar novo registro
  "editar_proprio",// editar só o que criou
  "editar_todos",  // editar qualquer registro
  "excluir_proprio",
  "excluir_todos",
  "exportar",      // exportar dados / relatórios
  "financeiro",    // ver valores financeiros
] as const;

export type Action = (typeof ACTIONS)[number];

// ── Tipo de permissão ────────────────────────────────────────────────────────
export type PermissionSet = Partial<Record<Module, Partial<Record<Action, boolean>>>>;

// ── Metadados de módulos (label, ícone, grupo) ────────────────────────────────
export interface ModuleMeta {
  key: Module;
  label: string;
  group: "principal" | "operacional" | "sistema" | "admin";
  actions: Action[];
  /** Ações que precisam de sub-opções próprio/todos */
  splitActions?: Array<{ action: "editar" | "excluir"; own: Action; all: Action }>;
  parent?: Module;
}

export const MODULE_META: ModuleMeta[] = [
  // ── Principal
  { key: "dashboard",    label: "Dashboard",      group: "principal", actions: ["ver"] },
  { key: "agenda",       label: "Agenda",         group: "principal", actions: ["ver", "criar", "editar_proprio", "editar_todos", "excluir_proprio", "excluir_todos"],
    splitActions: [
      { action: "editar",  own: "editar_proprio",  all: "editar_todos" },
      { action: "excluir", own: "excluir_proprio", all: "excluir_todos" },
    ],
  },
  { key: "minha_agenda", label: "Minha Agenda",   group: "principal", actions: ["ver"] },
  { key: "agenda_calendario",      label: "Calendário Principal", group: "principal", actions: ["ver", "criar", "editar_todos", "excluir_todos"], parent: "agenda" },
  { key: "agenda_cliente",         label: "Por cliente",          group: "principal", actions: ["ver"], parent: "agenda" },
  { key: "agenda_consultar",       label: "Consultar agendamentos", group: "principal", actions: ["ver", "editar_todos", "excluir_todos"], parent: "agenda" },
  { key: "agenda_bloqueios",       label: "Bloqueios e Fechamentos", group: "principal", actions: ["ver", "criar", "editar_todos", "excluir_todos"], parent: "agenda" },
  { key: "agenda_horarios",        label: "Grade Semanal",        group: "principal", actions: ["ver", "editar_todos"], parent: "agenda" },
  { key: "agenda_pat",             label: "PAT Terminal",         group: "principal", actions: ["ver", "editar_todos"], parent: "agenda" },
  { key: "agenda_autoatendimento", label: "Autoatendimento",      group: "principal", actions: ["ver", "editar_todos"], parent: "agenda" },

  // ── Operacional
  { key: "clientes",     label: "Clientes",       group: "operacional", actions: ["ver", "criar", "editar_proprio", "editar_todos", "excluir_proprio", "excluir_todos"],
    splitActions: [
      { action: "editar",  own: "editar_proprio",  all: "editar_todos" },
      { action: "excluir", own: "excluir_proprio", all: "excluir_todos" },
    ],
  },
  { key: "profissionais",label: "Profissionais",  group: "operacional", actions: ["ver", "criar", "editar_todos", "excluir_todos"] },
  { key: "servicos",     label: "Serviços",       group: "operacional", actions: ["ver", "criar", "editar_todos", "excluir_todos"] },
  { key: "produtos",     label: "Produtos",       group: "operacional", actions: ["ver", "criar", "editar_todos", "excluir_todos"] },
  { key: "pacotes",      label: "Pacotes",        group: "operacional", actions: ["ver", "criar", "editar_todos", "excluir_todos"] },
  { key: "comandas",     label: "Comandas",       group: "operacional", actions: ["ver", "criar", "editar_proprio", "editar_todos", "excluir_proprio", "excluir_todos", "financeiro"],
    splitActions: [
      { action: "editar",  own: "editar_proprio",  all: "editar_todos" },
      { action: "excluir", own: "excluir_proprio", all: "excluir_todos" },
    ],
  },
  { key: "fluxo",        label: "Fluxo de Caixa", group: "operacional", actions: ["ver", "financeiro"] },
  { key: "financeiro",   label: "Financeiro",     group: "operacional", actions: ["ver", "exportar", "financeiro"] },
  { key: "fin_controle",   label: "Controle de Entradas", group: "operacional", actions: ["ver", "financeiro"], parent: "financeiro" },
  { key: "fin_caixa",      label: "Caixa",                group: "operacional", actions: ["ver", "financeiro"], parent: "financeiro" },
  { key: "fin_pagamentos", label: "Pagamento de Profissionais", group: "operacional", actions: ["ver", "financeiro"], parent: "financeiro" },
  { key: "fin_formas",     label: "Fluxo p/ Forma Pag.",  group: "operacional", actions: ["ver", "financeiro"], parent: "financeiro" },
  { key: "fin_despesas",   label: "Despesas/Contas a Pagar", group: "operacional", actions: ["ver", "criar", "editar_todos", "excluir_todos", "financeiro"], parent: "financeiro" },
  { key: "fin_debito",     label: "Clientes em Débito",   group: "operacional", actions: ["ver", "financeiro"], parent: "financeiro" },
  { key: "fin_credito",    label: "Crédito de Cliente",   group: "operacional", actions: ["ver", "financeiro"], parent: "financeiro" },
  { key: "fin_contas",     label: "Contas Financeiras",   group: "operacional", actions: ["ver", "criar", "editar_todos", "financeiro"], parent: "financeiro" },
  { key: "fin_exportacao", label: "Exportação Fin.",      group: "operacional", actions: ["ver", "exportar"], parent: "financeiro" },
  { key: "fin_antecipacao",label: "Lanç. de Antecipação", group: "operacional", actions: ["ver", "criar", "financeiro"], parent: "financeiro" },
  { key: "fin_motivos",    label: "Motivos de Desconto",  group: "operacional", actions: ["ver", "criar", "editar_todos"], parent: "financeiro" },
  { key: "fin_relatorio",  label: "Relatório por Prof.",  group: "operacional", actions: ["ver", "financeiro"], parent: "financeiro" },

  // ── Sistema
  { key: "horarios",     label: "Horários",       group: "sistema", actions: ["ver", "editar_todos"] },
  { key: "whatsapp",     label: "WhatsApp",       group: "sistema", actions: ["ver", "editar_todos"] },
  { key: "perfil",       label: "Meu Perfil",     group: "sistema", actions: ["ver", "editar_proprio"] },
  { key: "configuracoes",label: "Configurações do Site",  group: "sistema", actions: ["ver", "editar_todos"] },

  // ── Admin
  { key: "permissoes",   label: "Permissões",     group: "admin",   actions: ["ver", "criar", "editar_todos", "excluir_todos"] },
  { key: "relatorios",   label: "Relatórios",     group: "admin",   actions: ["ver", "exportar", "financeiro"] },
];

// ── Permissão total (admin) ───────────────────────────────────────────────────
export function fullPermissions(): PermissionSet {
  const result: PermissionSet = {};
  for (const mod of MODULE_META) {
    result[mod.key] = {} as Record<Action, boolean>;
    for (const action of mod.actions) {
      (result[mod.key] as any)[action] = true;
    }
  }
  return result;
}

// ── Permissão vazia ───────────────────────────────────────────────────────────
export function emptyPermissions(): PermissionSet {
  const result: PermissionSet = {};
  for (const mod of MODULE_META) {
    result[mod.key] = {};
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFIS PADRÃO
// ─────────────────────────────────────────────────────────────────────────────

export type RoleSlug = "admin" | "profissional" | "secretaria" | "financeiro";

export interface RoleProfile {
  id: RoleSlug;
  label: string;
  description: string;
  /** true = não pode ser editado/excluído */
  isSystem: boolean;
  permissions: PermissionSet;
}

export const DEFAULT_ROLE_PROFILES: RoleProfile[] = [
  // ── Admin — acesso total
  {
    id: "admin",
    label: "Administrador",
    description: "Acesso completo a todas as telas e ações do sistema.",
    isSystem: true,
    permissions: fullPermissions(),
  },

  // ── Profissional — acesso ao próprio trabalho
  {
    id: "profissional",
    label: "Profissional",
    description: "Acessa a própria agenda, cria e edita as próprias comandas e vê clientes.",
    isSystem: true,
    permissions: {
      dashboard:    { ver: true },
      minha_agenda: { ver: true },
      agenda:       { ver: true, criar: true, editar_proprio: true, excluir_proprio: true },
      clientes:     { ver: true, criar: true, editar_proprio: true },
      comandas:     { ver: true, criar: true, editar_proprio: true },
      servicos:     { ver: true },
      produtos:     { ver: true },
      perfil:       { ver: true, editar_proprio: true },
    },
  },

  // ── Secretaria — gerencia agenda e clientes, não vê financeiro
  {
    id: "secretaria",
    label: "Secretária(o)",
    description: "Gerencia agenda, clientes, comandas e serviços. Sem acesso a financeiro.",
    isSystem: true,
    permissions: {
      dashboard:     { ver: true },
      agenda:        { ver: true, criar: true, editar_todos: true, excluir_todos: true },
      minha_agenda:  { ver: true },
      clientes:      { ver: true, criar: true, editar_todos: true },
      profissionais: { ver: true },
      servicos:      { ver: true },
      produtos:      { ver: true },
      pacotes:       { ver: true },
      comandas:      { ver: true, criar: true, editar_todos: true },
      horarios:      { ver: true },
      perfil:        { ver: true, editar_proprio: true },
    },
  },

  // ── Financeiro — só relatórios e fluxo de caixa
  {
    id: "financeiro",
    label: "Financeiro",
    description: "Acessa fluxo de caixa, financeiro e relatórios. Sem acesso operacional.",
    isSystem: true,
    permissions: {
      dashboard:  { ver: true },
      fluxo:      { ver: true, financeiro: true },
      financeiro: { ver: true, exportar: true, financeiro: true },
      relatorios: { ver: true, exportar: true, financeiro: true },
      comandas:   { ver: true, financeiro: true },
      perfil:     { ver: true, editar_proprio: true },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de verificação
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica se um conjunto de permissões permite uma ação em um módulo.
 */
export function hasPermission(
  permissions: PermissionSet | null | undefined,
  module: Module,
  action: Action
): boolean {
  if (!permissions) return false;
  return !!permissions[module]?.[action];
}

/**
 * Verifica se o usuário pode ver um módulo (ação "ver").
 */
export function canViewModule(
  permissions: PermissionSet | null | undefined,
  module: Module
): boolean {
  return hasPermission(permissions, module, "ver");
}

/**
 * Verifica se pode fazer uma ação — considera que editar_todos implica editar_proprio.
 * Ex: se tem editar_todos, também pode editar_proprio.
 */
export function canDo(
  permissions: PermissionSet | null | undefined,
  module: Module,
  action: Action
): boolean {
  if (!permissions) return false;
  const modPerms = permissions[module];
  if (!modPerms) return false;

  // Próprio → basta ter a permissão específica
  if (modPerms[action]) return true;

  // Se for "proprio", checar se tem "todos" (todos implica próprio)
  if (action === "editar_proprio" && modPerms["editar_todos"]) return true;
  if (action === "excluir_proprio" && modPerms["excluir_todos"]) return true;

  return false;
}

/**
 * Retorna a lista de módulos visíveis para um conjunto de permissões.
 */
export function getVisibleModules(permissions: PermissionSet | null | undefined): Module[] {
  if (!permissions) return [];
  return MODULES.filter((m) => canViewModule(permissions, m));
}
