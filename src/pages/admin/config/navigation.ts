import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Calendar,
  CheckCircle,
  Clock,
  Crown,
  Globe,
  LayoutDashboard,
  MessageCircle,
  Package,
  Scissors,
  Settings,
  Shield,
  UserCog,
  Users,
  CreditCard,
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
  | "permissoes"
  | "assinatura"
  | "planos"
  | "site";


export interface AdminSubNavItem {
  key: string;
  label: string;
  permModule?: Module;
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
  assinatura: "assinatura",
  planos: "planos-assinatura",
  site: "meu-site",
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
  assinatura: "Assinatura & Planos",
  planos: "Planos de Assinatura",
  site: "Configurar Site Profissional",
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
          { key: "minha_agenda",    label: "Calendário Principal", permModule: "agenda_calendario" },
          { key: "por_cliente",     label: "Agenda por cliente", permModule: "agenda_cliente" },
          { key: "consultar",       label: "Consultar agendamentos", permModule: "agenda_consultar" },
          { key: "liberacoes",      label: "Bloqueios e Fechamentos", permModule: "agenda_bloqueios" },
          { key: "horario-semanal",  label: "Grade Semanal de Horários", permModule: "agenda_horarios" },
          { key: "pat",             label: "PAT - Ativar terminal de atendimento profissional", permModule: "agenda_pat" },
          { key: "autoatendimento", label: "Autoatendimento", permModule: "agenda_autoatendimento" },
        ],
      },
      { tab: "minha-agenda", label: "Minha Agenda Online", icon: Globe, permModule: "minha_agenda" },
      { tab: "site",         label: "Configurar Meu Site",  icon: Globe, permModule: "configuracoes" },
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
          { key: "controle",              label: "Controle de entrada e saída", permModule: "fin_controle" },
          { key: "caixa",                 label: "Financeiro – Caixa", permModule: "fin_caixa" },
          { key: "pagamentos",            label: "Pagamento de Profissionais", permModule: "fin_pagamentos" },
          { key: "formas_pagamento",      label: "Fluxo financeiro por forma de pagamento", permModule: "fin_formas" },
          { key: "despesas",              label: "Despesas/Contas a Pagar", permModule: "fin_despesas" },
          { key: "clientes_debito",       label: "Clientes em débito", permModule: "fin_debito" },
          { key: "credito_cliente",       label: "Crédito de cliente", permModule: "fin_credito" },
          { key: "contas",                label: "Contas financeiras", permModule: "fin_contas" },
          { key: "exportacao",            label: "Exportação Lançamentos Financeiros", permModule: "fin_exportacao" },
          { key: "antecipacao",           label: "Lançamento de antecipação", permModule: "fin_antecipacao" },
          { key: "motivos_desconto",      label: "Motivos de desconto", permModule: "fin_motivos" },
          { key: "relatorio_profissionais", label: "Relatório financeiro por profissional", permModule: "fin_relatorio" },
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
      { tab: "planos",        label: "Planos de Assinatura", icon: Crown, permModule: "planos_assinatura" },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      { tab: "wpp",        label: "WhatsApp",    icon: MessageCircle, permModule: "whatsapp" },
      { tab: "settings",   label: "Configurações", icon: Settings,    permModule: "configuracoes" },
      { tab: "permissoes", label: "Permissões",  icon: Shield,        permModule: "permissoes" },
      { tab: "assinatura", label: "Assinatura", icon: CreditCard,     permModule: "assinatura" },
    ],
  },

];
