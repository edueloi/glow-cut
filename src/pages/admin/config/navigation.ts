import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Calendar,
  CheckCircle,
  Clock,
  Globe,
  LayoutDashboard,
  MessageCircle,
  Package,
  Scissors,
  Settings,
  Shield,
  UserCog,
  Users,
} from "lucide-react";
import type { Module } from "@/src/lib/permissions";

export type AdminTabId =
  | "dash"
  | "agenda"
  | "minha-agenda"
  | "services"
  | "packages"
  | "clients"
  | "comandas"
  | "fluxo"
  | "settings"
  | "professionals"
  | "horarios"
  | "profile"
  | "wpp"
  | "products"
  | "financeiro"
  | "permissoes";   // ← nova aba de permissões

export interface AdminSubNavItem {
  key: string;
  label: string;
}

export interface AdminNavItem {
  tab: AdminTabId;
  label: string;
  icon: LucideIcon;
  subItems?: AdminSubNavItem[];
  /** Módulo de permissão que controla a visibilidade deste item */
  permModule?: Module;
  /** Ação mínima necessária para ver o item (padrão: "ver") */
  permAction?: string;
}

export interface AdminNavSection {
  id: string;
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_DEFAULT_TAB: AdminTabId = "dash";

export const ADMIN_TAB_SLUGS: Record<AdminTabId, string> = {
  dash: "painel",
  agenda: "agenda",
  "minha-agenda": "meu-link",
  services: "servicos",
  packages: "pacotes",
  clients: "clientes",
  comandas: "comandas",
  fluxo: "fluxo",
  professionals: "profissionais",
  horarios: "horarios",
  settings: "config",
  profile: "perfil",
  wpp: "whatsapp",
  products: "produtos",
  financeiro: "financeiro",
  permissoes: "permissoes",
};

export const ADMIN_SLUG_TO_TAB = Object.fromEntries(
  Object.entries(ADMIN_TAB_SLUGS).map(([tab, slug]) => [slug, tab as AdminTabId])
) as Record<string, AdminTabId>;

export const ADMIN_TAB_TITLES: Record<AdminTabId, string> = {
  dash: "Painel de Controle",
  agenda: "Agenda",
  "minha-agenda": "Minha Agenda Online",
  services: "Serviços",
  packages: "Pacotes",
  clients: "Gestão de Clientes",
  comandas: "Comandas",
  fluxo: "Fluxo de Caixa",
  professionals: "Profissionais",
  horarios: "Horários",
  settings: "Configurações",
  profile: "Meu Perfil",
  wpp: "WhatsApp",
  products: "Produtos & Estoque",
  financeiro: "Financeiro",
  permissoes: "Perfis de Permissão",
};

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: "principal",
    label: "Principal",
    items: [
      { tab: "dash",         label: "Dashboard",           icon: LayoutDashboard, permModule: "dashboard" },
      {
        tab: "agenda",
        label: "Agenda & Reservas",
        icon: Calendar,
        permModule: "agenda",
        subItems: [
          { key: "minha_agenda",    label: "Calendário Principal" },
          { key: "por_cliente",     label: "Agenda por cliente" },
          { key: "consultar",       label: "Consultar agendamentos" },
          { key: "liberacoes",      label: "Bloqueios e Fechamentos" },
          { key: "horario-semanal",  label: "Grade Semanal de Horários" },
          { key: "pat",             label: "PAT - Ativar terminal de atendimento profissional" },
          { key: "autoatendimento", label: "Autoatendimento" },
        ],
      },
      { tab: "minha-agenda", label: "Minha Agenda Online", icon: Globe, permModule: "minha_agenda" },
    ],
  },
  {
    id: "operacional",
    label: "Operacional",
    items: [
      { tab: "comandas", label: "Comandas", icon: CheckCircle, permModule: "comandas" },
      {
        tab: "financeiro",
        label: "Financeiro",
        icon: Banknote,
        permModule: "financeiro",
        subItems: [
          { key: "controle",              label: "Controle de entrada e saída" },
          { key: "caixa",                 label: "Financeiro – Caixa" },
          { key: "pagamentos",            label: "Pagamento de Profissionais" },
          { key: "formas_pagamento",      label: "Fluxo financeiro por forma de pagamento" },
          { key: "despesas",              label: "Despesas/Contas a Pagar" },
          { key: "clientes_debito",       label: "Clientes em débito" },
          { key: "credito_cliente",       label: "Crédito de cliente" },
          { key: "contas",                label: "Contas financeiras" },
          { key: "exportacao",            label: "Exportação Lançamentos Financeiros" },
          { key: "antecipacao",           label: "Lançamento de antecipação" },
          { key: "motivos_desconto",      label: "Motivos de desconto" },
          { key: "relatorio_profissionais", label: "Relatório financeiro por profissional" },
        ],
      },
      {
        tab: "services",
        label: "Serviços",
        icon: Scissors,
        permModule: "servicos",
        subItems: [
          { key: "todos_servicos",   label: "Todos os serviços" },
          { key: "ranking_servicos", label: "Ranking de serviços" },
        ],
      },
      {
        tab: "packages",
        label: "Pacotes",
        icon: Package,
        permModule: "pacotes",
        subItems: [
          { key: "todos_pacotes",   label: "Todos os pacotes" },
          { key: "ranking_pacotes", label: "Ranking de pacotes" },
        ],
      },
      {
        tab: "products",
        label: "Produtos & Estoque",
        icon: Package,
        permModule: "produtos",
        subItems: [
          { key: "produtos",     label: "Todos os Produtos" },
          { key: "fornecedores", label: "Fornecedores" },
          { key: "fabricantes",  label: "Fabricantes" },
          { key: "venda",        label: "Venda de Produto" },
          { key: "movimentacao", label: "Movimentação" },
          { key: "posicao",      label: "Posição de Estoque" },
          { key: "inventario",   label: "Inventário" },
          { key: "saida_auto",   label: "Saída Automática" },
          { key: "ranking",      label: "Ranking de Produtos" },
        ],
      },
      { tab: "clients",       label: "Gestão de Clientes", icon: Users,   permModule: "clientes" },
      { tab: "professionals", label: "Profissionais",      icon: UserCog, permModule: "profissionais" },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      { tab: "wpp",        label: "WhatsApp",    icon: MessageCircle, permModule: "whatsapp" },
      { tab: "settings",   label: "Configurações", icon: Settings,    permModule: "configuracoes" },
      { tab: "permissoes", label: "Permissões",  icon: Shield,        permModule: "permissoes" },
    ],
  },
];
