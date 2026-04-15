# Dashboard Admin

Estrutura criada para reduzir o acoplamento do `AdminDashboard.tsx`.

## Componentes

- `components/AdminDashboardShell.tsx`
  Responsável pela casca visual do dashboard:
  sidebar, header, menu de perfil, notificações e área de conteúdo.

- `components/AdminTabContent.tsx`
  Responsável por decidir qual módulo renderizar em cada aba ativa.

- `components/AdminScheduleAuxModals.tsx`
  Modais auxiliares da agenda:
  detalhes do agendamento e seleção de repetição.

- `components/AdminScheduleActionModals.tsx`
  Modais de ação da agenda:
  exclusão em série, pagamento, troca de profissional e vínculo de comanda.

## Objetivo

O `AdminDashboard.tsx` deve ficar como orquestrador:

- estados
- handlers
- composição dos blocos principais

Toda UI grande deve sair dele aos poucos para componentes desta pasta.
