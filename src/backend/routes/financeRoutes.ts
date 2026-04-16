import { Router } from "express";
import { financeController } from "../controllers/financeController";

export const financeRouter = Router();

// Dashboard financeiro
financeRouter.get("/dashboard", financeController.getDashboard);

// Caixa do dia
financeRouter.get("/caixa", financeController.getCaixa);

// Pagamentos de profissionais (comissões)
financeRouter.get("/pagamentos-profissionais", financeController.getPagamentosProfissionais);

// Formas de pagamento
financeRouter.get("/formas-pagamento", financeController.getFormasPagamento);

// Despesas / Contas a pagar
financeRouter.get("/despesas", financeController.listDespesas);

// Relatório por profissional
financeRouter.get("/relatorio-profissionais", financeController.getRelatorioProfissional);

// Lançamentos manuais (Livro Caixa)
financeRouter.get("/cash-entries", financeController.listCashEntries);
financeRouter.post("/cash-entries", financeController.createCashEntry);
financeRouter.put("/cash-entries/:id", financeController.updateCashEntry);
financeRouter.delete("/cash-entries/:id", financeController.deleteCashEntry);

// Consumo de produtos por serviço
financeRouter.get("/service-consumptions", financeController.listServiceConsumptions);
financeRouter.post("/service-consumptions", financeController.createServiceConsumption);
financeRouter.put("/service-consumptions/:id", financeController.updateServiceConsumption);
financeRouter.delete("/service-consumptions/:id", financeController.deleteServiceConsumption);
