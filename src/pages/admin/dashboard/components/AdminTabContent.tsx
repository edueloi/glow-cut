import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldOff } from "lucide-react";

import { SettingsTab } from "@/src/pages/admin/modules/sistema/configuracoes/SettingsTab";
import {
  AdminProfileTab,
  AgendaTab,
  ClientsTab,
  ComandasTab,
  DashboardTab,
  FluxoTab,
  FinanceiroTab,
  MinhaAgendaTab,
  PackagesTab,
  ProductsTab,
  ProfessionalsTab,
  ServicesTab,
  WppTab,
} from "@/src/pages/admin/modules";
import { PermissoesTab } from "@/src/pages/admin/modules/sistema/permissoes/PermissoesTab";
import { usePermissions } from "@/src/hooks/usePermissions";
import type { Module, Action } from "@/src/lib/permissions";

// ── Tela de acesso negado inline ─────────────────────────────────────────────
function AccessDenied({ tabLabel }: { tabLabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 border border-zinc-200 mb-4">
        <ShieldOff size={28} className="text-zinc-400" />
      </div>
      <h2 className="text-xl font-black text-zinc-800 font-display mb-2">Acesso Restrito</h2>
      <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
        {tabLabel
          ? `Você não tem permissão para acessar "${tabLabel}".`
          : "Você não tem permissão para acessar esta área."
        }{" "}
        Solicite ao administrador do sistema.
      </p>
    </div>
  );
}

export function AdminTabContent(props: any) {
  const { can } = usePermissions();

  // Helper: checa permissão para um módulo antes de renderizar a aba
  const guard = (module: Module, action: Action = "ver"): boolean => can(module, action);

  const {
    activeTab,
    activeSubModule,
    setActiveSubModule,
    appointments,
    calculateAge,
    clients,
    clientView,
    comandas,
    currentMonth,
    currentTheme,
    daysInMonth,
    emptyPermProfile,
    emptyProfessional,
    fetchComandas,
    fetchProducts,
    fetchProfessionals,
    fetchSectors,
    handleDeleteClient,
    handleDeleteComanda,
    handleDeleteProfessional,
    handleDeleteService,
    handleEditClient,
    handlePayComanda,
    handleTabChange,
    handleThemeChange,
    holidays,
    hoveredAppointment,
    isComandaDetailOpen,
    localWorkingHours,
    newHoliday,
    permissionProfiles,
    products,
    profSubTab,
    professionals,
    savePermProfiles,
    sectors,
    selectedComanda,
    selectedProfessional,
    serviceSubTab,
    serviceView,
    services,
    setClientView,
    setCurrentMonth,
    setEditingPermProfile,
    setEditingProduct,
    setEditingProfessional,
    setEditingService,
    setHolidays,
    setHoveredAppointment,
    setIsAppointmentModalOpen,
    setIsClientModalOpen,
    setIsComandaDetailOpen,
    setIsComandaModalOpen,
    setIsPermProfileModalOpen,
    setIsProductModalOpen,
    setIsProfessionalModalOpen,
    setIsServiceModalOpen,
    setLocalWorkingHours,
    setNewAppointment,
    setNewHoliday,
    setNewPermProfile,
    setNewProduct,
    setNewProfessional,
    setSelectedAppointment,
    setSelectedComanda,
    setSelectedProfessional,
    setServiceSubTab,
    setServiceView,
    setSettingsOpenCard,
    setSlotHover,
    settingsOpenCard,
    tenantName,
    tenantSlug,
    themeColor,
    themeColors,
    view,
    workingHours,
    setWorkingHours,
    setView,
    setIsViewAppointmentModalOpen,
    handleProfSubTab,
    handleUpdateAppointmentStatus,
    handleDeleteAppointment,
    handleCreateBlockAppointment,
    fetchAppointments,
    blockNationalHolidays,
  } = props;

  const renderDashboardTab = () => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const revenueByDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    comandas.forEach((comanda: any) => {
      if (comanda.status === "closed" && comanda.total > 0) {
        const createdAt = new Date(comanda.createdAt);
        if (createdAt >= weekStart) {
          revenueByDay[createdAt.getDay()] = (revenueByDay[createdAt.getDay()] || 0) + comanda.total;
        }
      }
    });

    const revenueData = days.map((name, index) => ({ name, value: revenueByDay[index] || 0 }));
    const colors = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444"];
    const serviceCount: Record<string, number> = {};

    appointments.forEach((appointment: any) => {
      if (appointment.service?.name) {
        serviceCount[appointment.service.name] = (serviceCount[appointment.service.name] || 0) + 1;
      }
    });

    const total = Object.values(serviceCount).reduce((sum, value) => sum + value, 0) || 1;
    const servicesData = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count], index) => ({
        name,
        value: Math.round((count / total) * 100),
        color: colors[index],
      }));

    return (
      <DashboardTab
        revenueData={revenueData}
        servicesData={servicesData}
        appointments={appointments}
        comandas={comandas}
        clients={clients}
        handleTabChange={handleTabChange}
        setIsAppointmentModalOpen={setIsAppointmentModalOpen}
        setIsComandaModalOpen={setIsComandaModalOpen}
        setIsClientModalOpen={setIsClientModalOpen}
      />
    );
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "dash" && (guard("dashboard") ? renderDashboardTab() : <AccessDenied tabLabel="Dashboard" />)}

        {activeTab === "agenda" && (!guard("agenda") ? <AccessDenied tabLabel="Agenda" /> : (
          <AgendaTab
            view={view}
            setView={setView}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            setIsAppointmentModalOpen={setIsAppointmentModalOpen}
            selectedProfessional={selectedProfessional}
            setSelectedProfessional={setSelectedProfessional}
            professionals={professionals}
            appointments={appointments}
            daysInMonth={daysInMonth}
            setSlotHover={setSlotHover}
            setNewAppointment={setNewAppointment}
            hoveredAppointment={hoveredAppointment}
            setHoveredAppointment={setHoveredAppointment}
            activeSubModule={activeSubModule}
            setActiveSubModule={setActiveSubModule}
            onAppointmentClick={(appointment: any) => {
              setSelectedAppointment(appointment);
              setIsViewAppointmentModalOpen(true);
            }}
            workingHours={workingHours}
            setWorkingHours={setWorkingHours}
            localWorkingHours={localWorkingHours}
            setLocalWorkingHours={setLocalWorkingHours}
            holidays={holidays}
            setHolidays={setHolidays}
            newHoliday={newHoliday}
            setNewHoliday={setNewHoliday}
            clients={clients}
            services={services}
            onUpdateStatus={handleUpdateAppointmentStatus}
            onDeleteAppointment={(id: string) => {
              const appt = appointments.find((a: any) => a.id === id);
              if (appt) handleDeleteAppointment(appt);
            }}
            onNewBlockAppointment={handleCreateBlockAppointment}
            onRefresh={fetchAppointments}
            onGoToMinhaAgenda={() => handleTabChange("minha-agenda")}
            blockNationalHolidays={blockNationalHolidays}
          />
        ))}

        {activeTab === "minha-agenda" && (!guard("minha_agenda") ? <AccessDenied tabLabel="Minha Agenda Online" /> : (
          <MinhaAgendaTab
            studioName={tenantName}
            tenantSlug={tenantSlug}
            onUpdateName={props.setTenantName}
            onUpdateSlug={props.setTenantSlug}
            onRefreshProfessionals={fetchProfessionals}
          />
        ))}

        {activeTab === "services" && (!guard("servicos") ? <AccessDenied tabLabel="Serviços" /> : (
          <ServicesTab
            activeSubModule={activeSubModule}
            setActiveSubModule={setActiveSubModule}
            services={services}
            setEditingService={setEditingService}
            setNewService={props.setNewService}
            setIsServiceModalOpen={setIsServiceModalOpen}
            handleDeleteService={handleDeleteService}
            viewMode={serviceView}
            setViewMode={setServiceView}
          />
        ))}

        {activeTab === "packages" && (!guard("pacotes") ? <AccessDenied tabLabel="Pacotes" /> : (
          <PackagesTab
            activeSubModule={activeSubModule}
            setActiveSubModule={setActiveSubModule}
            services={services}
            setEditingService={setEditingService}
            setNewService={props.setNewService}
            setIsServiceModalOpen={setIsServiceModalOpen}
            handleDeleteService={handleDeleteService}
            viewMode={serviceView}
            setViewMode={setServiceView}
          />
        ))}

        {activeTab === "clients" && (!guard("clientes") ? <AccessDenied tabLabel="Clientes" /> : (
          <ClientsTab
            clientView={clientView}
            setClientView={setClientView}
            clients={clients}
            setIsClientModalOpen={setIsClientModalOpen}
            calculateAge={calculateAge}
            handleEditClient={handleEditClient}
            handleDeleteClient={handleDeleteClient}
          />
        ))}

        {activeTab === "comandas" && (!guard("comandas") ? <AccessDenied tabLabel="Comandas" /> : (
          <ComandasTab
            comandas={comandas}
            products={products}
            services={services}
            professionals={professionals}
            setIsComandaModalOpen={setIsComandaModalOpen}
            selectedComanda={selectedComanda}
            setSelectedComanda={setSelectedComanda}
            isComandaDetailOpen={isComandaDetailOpen}
            setIsComandaDetailOpen={setIsComandaDetailOpen}
            handlePayComanda={handlePayComanda}
            handleDeleteComanda={handleDeleteComanda}
            fetchComandas={fetchComandas}
          />
        ))}

        {activeTab === "fluxo" && (guard("fluxo") ? <FluxoTab comandas={comandas} sectors={sectors} /> : <AccessDenied tabLabel="Fluxo de Caixa" />)}

        {activeTab === "financeiro" && (!guard("financeiro") ? <AccessDenied tabLabel="Financeiro" /> : (
          <FinanceiroTab
            activeSubModule={activeSubModule}
            setActiveSubModule={setActiveSubModule}
          />
        ))}

        {activeTab === "professionals" && (!guard("profissionais") ? <AccessDenied tabLabel="Profissionais" /> : (
          <ProfessionalsTab
            professionals={professionals}
            setEditingProfessional={setEditingProfessional}
            setNewProfessional={setNewProfessional}
            setIsProfessionalModalOpen={setIsProfessionalModalOpen}
            handleDeleteProfessional={handleDeleteProfessional}
            emptyProfessional={emptyProfessional}
            permissionProfiles={permissionProfiles}
            profSubTab={profSubTab}
            onSubTabChange={handleProfSubTab}
            onOpenPermProfileModal={() => {
              setEditingPermProfile(null);
              setNewPermProfile({ ...emptyPermProfile });
              setIsPermProfileModalOpen(true);
            }}
            onEditPermProfile={(profile: any) => {
              setEditingPermProfile(profile);
              setNewPermProfile({ name: profile.name, permissions: { ...profile.permissions } });
              setIsPermProfileModalOpen(true);
            }}
            onDeletePermProfile={(id: string) => savePermProfiles(permissionProfiles.filter((profile: any) => profile.id !== id))}
          />
        ))}

        {activeTab === "profile" && <AdminProfileTab />}
        {activeTab === "wpp" && (guard("whatsapp") ? <WppTab /> : <AccessDenied tabLabel="WhatsApp" />)}

        {activeTab === "products" && (!guard("produtos") ? <AccessDenied tabLabel="Produtos & Estoque" /> : (
          <ProductsTab
            products={products}
            sectors={sectors}
            setIsProductModalOpen={setIsProductModalOpen}
            setEditingProduct={setEditingProduct}
            setNewProduct={setNewProduct}
            fetchProducts={fetchProducts}
            fetchSectors={fetchSectors}
            activeSubModule={activeSubModule}
            setActiveSubModule={setActiveSubModule}
          />
        ))}

        {activeTab === "settings" && (!guard("configuracoes") ? <AccessDenied tabLabel="Configurações" /> : (
          <SettingsTab
            currentTheme={currentTheme}
            themeColors={themeColors}
            themeColor={themeColor}
            handleThemeChange={handleThemeChange}
            settingsOpenCard={settingsOpenCard}
            setSettingsOpenCard={setSettingsOpenCard}
            professionals={professionals}
            onOpenTab={handleTabChange}
            onOpenServicesSection={setServiceSubTab}
          />
        ))}

        {activeTab === "permissoes" && (!guard("permissoes") ? <AccessDenied tabLabel="Permissões" /> : (
          <PermissoesTab currentTheme={props.currentTheme} />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
