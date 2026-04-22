import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronDown,
  LogOut,
  Menu,
  Plus,
  Settings,
  UserCog,
  Users,
  X,
  ExternalLink,
  Calendar,
  Clock,
  CheckCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import logoFavicon from "@/src/images/system/logo-favicon.png";
import { cn } from "@/src/lib/utils";
import { NavItem } from "@/src/pages/admin/components/NavItem";
import {
  ADMIN_NAV_SECTIONS,
  ADMIN_TAB_TITLES,
  type AdminTabId,
  type AdminSubNavItem,
} from "@/src/pages/admin/config/navigation";
import { usePermissions } from "@/src/hooks/usePermissions";
import type { Module, Action } from "@/src/lib/permissions";

interface Notification {
  id: string;
  type: "success" | "warning" | "error";
  title: string;
  message: string;
}

interface AdminDashboardShellProps {
  activeTab: AdminTabId;
  activeSubModule: string;
  adminUser: any;
  children: React.ReactNode;
  handleTabChange: (tab: AdminTabId) => void;
  isNotificationsOpen: boolean;
  isProfileMenuOpen: boolean;
  isSidebarOpen: boolean;
  notifications: Notification[];
  notificationsRef: React.RefObject<HTMLDivElement | null>;
  onLogout: () => void;
  onSubModuleChange: (key: string) => void;
  pendingConfirmationsCount?: number;
  pendingAppointments?: any[];
  professionals?: any[];
  onConfirmAppointment?: (id: string) => void;
  profileMenuRef: React.RefObject<HTMLDivElement | null>;
  setIsNotificationsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsProfileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarCollapsed: boolean;
  slotHover: { x: number; y: number; label: string } | null;
}

export function AdminDashboardShell({
  activeTab,
  activeSubModule,
  adminUser,
  children,
  handleTabChange,
  isNotificationsOpen,
  isProfileMenuOpen,
  isSidebarOpen,
  notifications,
  notificationsRef,
  onLogout,
  onSubModuleChange,
  pendingConfirmationsCount = 0,
  pendingAppointments = [],
  professionals = [],
  onConfirmAppointment,
  profileMenuRef,
  setIsNotificationsOpen,
  setIsProfileMenuOpen,
  setIsSidebarOpen,
  setSidebarCollapsed,
  sidebarCollapsed,
  slotHover,
}: AdminDashboardShellProps) {
  const { can, roleLabel } = usePermissions();

  // Verifica se um item do nav está permitido para o usuário
  const isItemPermitted = (permModule?: string, permAction?: string): boolean => {
    if (!permModule) return true; // Sem módulo configurado = sempre visível
    return can(permModule as Module, (permAction ?? "ver") as Action);
  };

  // ── Pending confirmations dropdown ──
  const [isPendingOpen, setIsPendingOpen] = useState(false);
  const pendingRef = useRef<HTMLDivElement>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isPendingOpen) return;
    const handler = (e: MouseEvent) => {
      if (pendingRef.current && !pendingRef.current.contains(e.target as Node)) {
        setIsPendingOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isPendingOpen]);

  const handleConfirm = async (id: string) => {
    setConfirmingId(id);
    // Espera a animação rodar antes de chamar a função que remove da lista
    setTimeout(async () => {
      await onConfirmAppointment?.(id);
      setConfirmingId(null);
    }, 600);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 font-sans text-zinc-700 selection:bg-amber-500/30">
      {slotHover && (
        <div className="fixed z-[200] pointer-events-none" style={{ left: slotHover.x + 14, top: slotHover.y - 36 }}>
          <div className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-zinc-900/95 px-3 py-2 text-[11px] font-bold text-white shadow-2xl">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500">
              <Plus size={11} className="text-white" />
            </span>
            {slotHover.label}
          </div>
          <div className="-mt-1 ml-3 h-2 w-2 rotate-45 bg-zinc-900/95" />
        </div>
      )}

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-zinc-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[70] flex flex-col border-r border-zinc-200 bg-white shadow-2xl transition-all duration-300 lg:relative lg:translate-x-0 lg:shadow-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "lg:w-[72px]" : "w-72"
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-50 bg-zinc-50/50 p-4 pt-[calc(1rem+env(safe-area-inset-top))] lg:hidden">
          <div className="flex items-center gap-2">
            <img src={logoFavicon} alt="Agendelle" className="h-6 w-6 object-contain" />
            <span className="text-sm font-black uppercase tracking-tighter text-zinc-900">Agendelle</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-400 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className={cn("hidden items-center transition-all duration-300 lg:flex", sidebarCollapsed ? "justify-center p-4" : "p-8")}>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "shrink-0 rounded-xl border border-zinc-100 bg-zinc-50 shadow-sm",
                sidebarCollapsed ? "h-10 w-10 p-1.5" : "h-11 w-11 p-2"
              )}
            >
              <img src={logoFavicon} alt="Agendelle" className="h-full w-full object-contain" />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h1 className="font-display text-lg font-black leading-none tracking-tight text-zinc-900">Agendelle</h1>
                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.1em] text-zinc-400">Smart Schedulings</p>
              </div>
            )}
          </div>
        </div>

        <nav
          className={cn(
            "flex-1 space-y-1 scrollbar-hide pt-4 transition-all duration-300 lg:pt-0",
            sidebarCollapsed ? "overflow-visible px-2" : "overflow-y-auto px-4"
          )}
        >
          {ADMIN_NAV_SECTIONS.map((section, index) => (
            <React.Fragment key={section.id}>
              {!sidebarCollapsed && (
                <div className={cn("mb-4 px-4", index > 0 ? "mt-8" : "")}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{section.label}</p>
                </div>
              )}
              {sidebarCollapsed && <div className={index === 0 ? "mb-2" : "mt-4"} />}
              {section.items.map((item) => {
                const permitted = isItemPermitted(item.permModule, item.permAction);
                return (
                  <NavItem
                    key={item.tab}
                    active={activeTab === item.tab}
                    onClick={() => handleTabChange(item.tab)}
                    icon={item.icon}
                    label={item.label}
                    collapsed={sidebarCollapsed}
                    subItems={item.subItems}
                    activeSubKey={activeTab === item.tab ? activeSubModule : undefined}
                    onSubItemClick={(key) => {
                      if (activeTab !== item.tab) handleTabChange(item.tab);
                      onSubModuleChange(key);
                      setIsSidebarOpen(false);
                    }}
                    permitted={permitted}
                    id={`nav-${item.tab}`}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div className={cn("mt-auto border-t border-zinc-200 transition-all duration-300", sidebarCollapsed ? "p-2" : "p-4")}>
          {!sidebarCollapsed ? (
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-red-500 transition-all hover:bg-red-50"
            >
              <LogOut size={18} />
              <span>Sair do Sistema</span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-200 text-zinc-500">
                <Users size={18} />
              </div>
              <button
                onClick={onLogout}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-red-400 transition-all hover:bg-red-50"
                title="Sair do Sistema"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-zinc-50">
        <header className="sticky top-0 z-[52] isolate flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-xl h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] md:h-[calc(5rem+env(safe-area-inset-top))] md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="rounded-xl p-2 text-zinc-500 transition-all hover:bg-zinc-100 lg:hidden">
              <Menu size={20} />
            </button>
            <div>
              <h2 className="font-display text-sm font-bold capitalize leading-tight tracking-tight text-zinc-900 md:text-xl">
                {ADMIN_TAB_TITLES[activeTab]}
              </h2>
              <p className="mt-0.5 hidden text-[9px] font-bold uppercase tracking-widest text-zinc-400 sm:block md:text-[10px]">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setSidebarCollapsed((current) => !current)}
              className="hidden rounded-xl p-2 text-zinc-400 transition-all hover:bg-zinc-100 hover:text-zinc-700 lg:flex"
              title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              <Menu size={20} />
            </button>



            {pendingConfirmationsCount > 0 && (
              <div className="relative" ref={pendingRef}>
                <button
                  onClick={() => setIsPendingOpen(!isPendingOpen)}
                  title={`${pendingConfirmationsCount} agendamento${pendingConfirmationsCount > 1 ? "s" : ""} pendente${pendingConfirmationsCount > 1 ? "s" : ""} de confirmação`}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-600 transition-all hover:bg-amber-100 hover:border-amber-300 md:px-3",
                    isPendingOpen && "bg-amber-100 border-amber-300 shadow-sm"
                  )}
                >
                  <AlertTriangle size={16} className="shrink-0" />
                  <span className="hidden text-[11px] font-black md:inline">
                    {pendingConfirmationsCount}
                  </span>
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white md:hidden">
                    {pendingConfirmationsCount}
                  </span>
                </button>

                <AnimatePresence>
                  {isPendingOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="fixed left-4 right-4 top-20 z-[70] mt-3 overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:absolute md:left-auto md:right-0 md:top-full md:w-[380px]"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-50 bg-amber-50/50 px-5 py-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} className="text-amber-500" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Pendentes de Confirmação</p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700">
                          {pendingConfirmationsCount}
                        </span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto divide-y divide-zinc-50">
                        {pendingAppointments.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                            <CheckCheck size={28} className="mb-2 opacity-30" />
                            <p className="text-xs font-bold">Nenhum agendamento pendente</p>
                            <p className="text-[10px] mt-0.5">Tudo confirmado!</p>
                          </div>
                        ) : (
                          pendingAppointments.map((appt) => {
                            const prof = professionals.find((p: any) => p.id === appt.professionalId);
                            const isConfirming = confirmingId === appt.id;
                            return (
                              <div key={appt.id} className="group p-4 transition-colors hover:bg-zinc-50">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black text-zinc-800 truncate">
                                      {appt.clientName || appt.client?.name || "Cliente"}
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-zinc-400 truncate">
                                      {appt.serviceName || appt.service?.name || "Serviço"}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-500">
                                        <Calendar size={10} />
                                        {appt.date ? (() => {
                                          try {
                                            const dateStr = String(appt.date);
                                            const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00");
                                            return isNaN(d.getTime()) ? "—" : format(d, "dd/MM", { locale: ptBR });
                                          } catch { return "—"; }
                                        })() : "—"}
                                      </span>
                                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-500">
                                        <Clock size={10} />
                                        {appt.startTime || "—"}
                                      </span>
                                      {prof && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">
                                          <Users size={10} />
                                          {prof.nickname || prof.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleConfirm(appt.id)}
                                    disabled={isConfirming}
                                    className={cn(
                                      "shrink-0 flex items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-all",
                                      isConfirming
                                        ? "bg-emerald-100 text-emerald-600 cursor-not-allowed"
                                        : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm hover:shadow-md"
                                    )}
                                  >
                                    {isConfirming ? (
                                      <><CheckCheck size={14} /> OK</>
                                    ) : (
                                      <><CheckCircle size={14} /> Confirmar</>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <button
                        onClick={() => setIsPendingOpen(false)}
                        className="w-full border-t border-zinc-50 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-all hover:bg-zinc-50 hover:text-zinc-600"
                      >
                        Fechar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "relative rounded-xl p-2 text-zinc-400 transition-all hover:bg-zinc-100 hover:text-zinc-700 md:p-2.5",
                  isNotificationsOpen && "bg-zinc-100 text-zinc-900 shadow-sm"
                )}
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-amber-500" />
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed left-4 right-4 top-20 z-[70] mt-3 overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:absolute md:left-auto md:right-0 md:top-full md:w-[320px]"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-50 bg-zinc-50/50 px-5 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Notificações</p>
                      {notifications.length > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700">{notifications.length} {notifications.length === 1 ? "Nova" : "Novas"}</span>
                      )}
                    </div>
                    <div className="max-h-[350px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                          <Bell size={28} className="mb-2 opacity-30" />
                          <p className="text-xs font-bold">Nenhuma notificação</p>
                          <p className="text-[10px] mt-0.5">Tudo em ordem por aqui!</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="group cursor-pointer border-b border-zinc-50 p-4 transition-colors hover:bg-zinc-50" onClick={() => setIsNotificationsOpen(false)}>
                            <div className="flex gap-3">
                              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                n.type === "success" && "bg-emerald-100 text-emerald-600",
                                n.type === "warning" && "bg-amber-100 text-amber-600",
                                n.type === "error"   && "bg-red-100 text-red-600",
                              )}>
                                {n.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-zinc-800">{n.title}</p>
                                <p className="mt-0.5 text-[10px] text-zinc-400">{n.message}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <button
                      onClick={() => setIsNotificationsOpen(false)}
                      className="w-full border-t border-zinc-50 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-all hover:bg-zinc-50 hover:text-zinc-600"
                    >
                      Fechar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mx-1 hidden h-6 w-px bg-zinc-200 md:block" />

            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="group flex items-center gap-2 rounded-xl border border-transparent p-1 pl-3 pr-2 transition-all hover:border-zinc-200 hover:bg-zinc-100"
              >
                <div className="hidden text-right md:block">
                  <p className="text-[11px] font-black leading-none text-zinc-900">{adminUser.name || "Admin Studio"}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    {adminUser.role === "owner" ? "Proprietário" : adminUser.role === "admin" ? "Admin" : adminUser.role === "manager" ? "Gerente" : "Visualizador"}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-500 transition-all group-hover:shadow-sm">
                  {adminUser.photo ? (
                    <img src={adminUser.photo} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-black">
                      {(adminUser.name || "AS").split(" ").map((word: string) => word[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  )}
                </div>
                <ChevronDown size={14} className={cn("text-zinc-400 transition-transform duration-300", isProfileMenuOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 z-[55] mt-3 w-64 overflow-hidden rounded-2xl border border-zinc-100/80 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
                  >
                    <div className="flex items-center gap-3 border-b border-zinc-100 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                        {adminUser.photo ? (
                          <img src={adminUser.photo} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-black text-zinc-600">
                            {(adminUser.name || "AS").split(" ").map((word: string) => word[0]).join("").toUpperCase().slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black leading-tight text-zinc-900">{adminUser.name || "Admin"}</p>
                        <p className="mt-0.5 truncate text-[10px] text-zinc-400">{adminUser.email || "—"}</p>
                        <span className="mt-1 inline-block rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-zinc-400">
                          {adminUser.role === "owner" ? "Proprietário" : adminUser.role === "manager" ? "Gerente" : adminUser.role === "admin" ? "Admin" : "Visualizador"}
                        </span>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleTabChange("profile");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-600 transition-all hover:bg-zinc-50 hover:text-zinc-900"
                      >
                        <UserCog size={15} className="text-zinc-400" /> Meu Perfil
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleTabChange("settings");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-600 transition-all hover:bg-zinc-50 hover:text-zinc-900"
                      >
                        <Settings size={15} className="text-zinc-400" /> Configurações
                      </button>
                    </div>

                    <div className="p-2 pt-0">
                      <div className="border-t border-zinc-100 pt-2">
                        <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-red-500 transition-all hover:bg-red-50">
                          <LogOut size={15} /> Sair da conta
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
