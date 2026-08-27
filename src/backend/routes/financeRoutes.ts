import { Router } from "express";
import { financeController } from "../controllers/financeController";
import { billController } from "../controllers/billController";

export const financeRouter = Router();

// Dashboard financeiro
financeRouter.get("/dashboard", financeController.getDashboard);

// Caixa do dia
financeRouter.get("/caixa", financeController.getCaixa);

// Pagamentos de profissionais (comissões)
financeRouter.get("/pagamentos-profissionais", financeController.getPagamentosProfissionais);
financeRouter.post("/pagamentos-profissionais/payout", financeController.markCommissionPayout);
financeRouter.delete("/pagamentos-profissionais/payout/:id", financeController.undoCommissionPayout);

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

// Contas a Pagar/Receber (recorrentes, com vencimento/atraso/juros)
financeRouter.get("/bill-categories", billController.listCategories);
financeRouter.post("/bill-categories", billController.createCategory);
financeRouter.delete("/bill-categories/:id", billController.deleteCategory);

financeRouter.get("/bills", billController.listBills);
financeRouter.post("/bills", billController.createBill);
financeRouter.patch("/bills/:id", billController.updateBill);
financeRouter.delete("/bills/:id", billController.deleteBill);

financeRouter.patch("/bill-occurrences/:id", billController.updateOccurrence);
financeRouter.delete("/bill-occurrences/:id", billController.deleteOccurrence);
