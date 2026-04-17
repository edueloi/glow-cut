import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { getTenantId } from "../utils/helpers";

export const inventoryController = {

  // ═══════════════════════════════════════════════════════
  //  SUPPLIERS
  // ═══════════════════════════════════════════════════════

  async listSuppliers(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT * FROM Supplier WHERE tenantId = ? ORDER BY name ASC`, tenantId
      );
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  async createSupplier(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { name, cnpj, phone, email, contact, address, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Nome obrigatório." });
    try {
      const id = randomUUID();
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO Supplier (id, tenantId, name, cnpj, phone, email, contact, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, tenantId, name.trim(), cnpj || null, phone || null, email || null, contact || null, address || null, notes || null
      );
      res.json({ id, tenantId, name: name.trim(), cnpj, phone, email, contact, address, notes, isActive: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  async updateSupplier(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { name, cnpj, phone, email, contact, address, notes, isActive } = req.body;
    try {
      const sets: string[] = [];
      const vals: any[] = [];
      if (name !== undefined) { sets.push("name = ?"); vals.push(name.trim()); }
      if (cnpj !== undefined) { sets.push("cnpj = ?"); vals.push(cnpj || null); }
      if (phone !== undefined) { sets.push("phone = ?"); vals.push(phone || null); }
      if (email !== undefined) { sets.push("email = ?"); vals.push(email || null); }
      if (contact !== undefined) { sets.push("contact = ?"); vals.push(contact || null); }
      if (address !== undefined) { sets.push("address = ?"); vals.push(address || null); }
      if (notes !== undefined) { sets.push("notes = ?"); vals.push(notes || null); }
      if (isActive !== undefined) { sets.push("isActive = ?"); vals.push(isActive ? 1 : 0); }
      if (sets.length > 0) {
        vals.push(req.params.id, tenantId);
        await (prisma as any).$executeRawUnsafe(`UPDATE Supplier SET ${sets.join(", ")} WHERE id = ? AND tenantId = ?`, ...vals);
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  async deleteSupplier(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      await (prisma as any).$executeRawUnsafe(`UPDATE Product SET supplierId = NULL WHERE supplierId = ? AND tenantId = ?`, req.params.id, tenantId);
      await (prisma as any).$executeRawUnsafe(`DELETE FROM Supplier WHERE id = ? AND tenantId = ?`, req.params.id, tenantId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // ═══════════════════════════════════════════════════════
  //  MANUFACTURERS
  // ═══════════════════════════════════════════════════════

  async listManufacturers(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT * FROM Manufacturer WHERE tenantId = ? ORDER BY name ASC`, tenantId
      );
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  async createManufacturer(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { name, cnpj, phone, email, website, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Nome obrigatório." });
    try {
      const id = randomUUID();
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO Manufacturer (id, tenantId, name, cnpj, phone, email, website, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id, tenantId, name.trim(), cnpj || null, phone || null, email || null, website || null, notes || null
      );
      res.json({ id, tenantId, name: name.trim(), cnpj, phone, email, website, notes, isActive: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  async updateManufacturer(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { name, cnpj, phone, email, website, notes, isActive } = req.body;
    try {
      const sets: string[] = [];
      const vals: any[] = [];
      if (name !== undefined) { sets.push("name = ?"); vals.push(name.trim()); }
      if (cnpj !== undefined) { sets.push("cnpj = ?"); vals.push(cnpj || null); }
      if (phone !== undefined) { sets.push("phone = ?"); vals.push(phone || null); }
      if (email !== undefined) { sets.push("email = ?"); vals.push(email || null); }
      if (website !== undefined) { sets.push("website = ?"); vals.push(website || null); }
      if (notes !== undefined) { sets.push("notes = ?"); vals.push(notes || null); }
      if (isActive !== undefined) { sets.push("isActive = ?"); vals.push(isActive ? 1 : 0); }
      if (sets.length > 0) {
        vals.push(req.params.id, tenantId);
        await (prisma as any).$executeRawUnsafe(`UPDATE Manufacturer SET ${sets.join(", ")} WHERE id = ? AND tenantId = ?`, ...vals);
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  async deleteManufacturer(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      await (prisma as any).$executeRawUnsafe(`UPDATE Product SET manufacturerId = NULL WHERE manufacturerId = ? AND tenantId = ?`, req.params.id, tenantId);
      await (prisma as any).$executeRawUnsafe(`DELETE FROM Manufacturer WHERE id = ? AND tenantId = ?`, req.params.id, tenantId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // ═══════════════════════════════════════════════════════
  //  STOCK MOVEMENTS
  // ═══════════════════════════════════════════════════════

  async listMovements(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT sm.*, p.name as productName, p.unit as productUnit FROM StockMovement sm LEFT JOIN Product p ON sm.productId = p.id WHERE sm.tenantId = ? ORDER BY sm.createdAt DESC LIMIT ?`,
        tenantId, limit
      );
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  async createMovement(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { productId, type, quantity, reason, reference, createdBy } = req.body;
    if (!productId || !type || quantity === undefined) return res.status(400).json({ error: "productId, type e quantity obrigatórios." });
    try {
      // Get current stock
      const products: any[] = await (prisma as any).$queryRawUnsafe(`SELECT stock FROM Product WHERE id = ? AND tenantId = ?`, productId, tenantId);
      if (!products.length) return res.status(404).json({ error: "Produto não encontrado." });
      const previousQty = products[0].stock;
      const qty = parseInt(quantity);
      const newQty = type === "entrada" ? previousQty + qty : type === "ajuste" ? qty : previousQty - Math.abs(qty);

      const id = randomUUID();
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO StockMovement (id, tenantId, productId, type, quantity, previousQty, newQty, reason, reference, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, tenantId, productId, type, qty, previousQty, newQty, reason || null, reference || null, createdBy || null
      );
      // Update product stock
      await (prisma as any).$executeRawUnsafe(`UPDATE Product SET stock = ? WHERE id = ? AND tenantId = ?`, newQty, productId, tenantId);

      res.json({ id, tenantId, productId, type, quantity: qty, previousQty, newQty, reason, reference, createdBy });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // ═══════════════════════════════════════════════════════
  //  PRODUCT SALE (venda avulsa de produto)
  // ═══════════════════════════════════════════════════════

  async sellProduct(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { productId, quantity, clientName, paymentMethod } = req.body;
    if (!productId || !quantity) return res.status(400).json({ error: "productId e quantity obrigatórios." });
    try {
      const products: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM Product WHERE id = ? AND tenantId = ?`, productId, tenantId);
      if (!products.length) return res.status(404).json({ error: "Produto não encontrado." });
      const product = products[0];
      const qty = parseInt(quantity);
      const previousQty = product.stock;
      const newQty = previousQty - qty;

      // Record movement
      const movId = randomUUID();
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO StockMovement (id, tenantId, productId, type, quantity, previousQty, newQty, reason, reference, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        movId, tenantId, productId, "venda", qty, previousQty, newQty,
        `Venda avulsa${clientName ? ` para ${clientName}` : ""}`,
        paymentMethod || null, null
      );
      // Update stock
      await (prisma as any).$executeRawUnsafe(`UPDATE Product SET stock = ? WHERE id = ? AND tenantId = ?`, newQty, productId, tenantId);

      // Create CashEntry so it appears in financial dashboard
      const saleTotal = qty * product.salePrice;
      try {
        await (prisma as any).$executeRawUnsafe(
          `INSERT INTO CashEntry (id, tenantId, type, category, description, amount, date) VALUES (?, ?, 'income', 'Venda de Produto', ?, ?, NOW())`,
          randomUUID(), tenantId,
          `Venda avulsa: ${product.name}${clientName ? ` para ${clientName}` : ""}`,
          saleTotal
        );
      } catch (e2: any) {
        console.warn("⚠️ CashEntry creation for sell failed:", e2.message);
      }

      res.json({ success: true, movementId: movId, newStock: newQty, total: saleTotal });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // ═══════════════════════════════════════════════════════
  //  STOCK POSITION (relatório posição de estoque)
  // ═══════════════════════════════════════════════════════

  async stockPosition(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const products: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT p.id, p.name, p.stock, p.minStock, p.costPrice, p.salePrice, p.unit, p.code, p.isForSale, p.sectorId, s.name as sectorName, s.color as sectorColor FROM Product p LEFT JOIN Sector s ON p.sectorId = s.id WHERE p.tenantId = ? ORDER BY p.stock ASC`,
        tenantId
      );
      const totalCost = products.reduce((acc, p) => acc + p.costPrice * p.stock, 0);
      const totalSale = products.reduce((acc, p) => acc + p.salePrice * p.stock, 0);
      const critical = products.filter(p => p.stock <= p.minStock);
      const outOfStock = products.filter(p => p.stock <= 0);

      res.json({ products, totalCost, totalSale, criticalCount: critical.length, outOfStockCount: outOfStock.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // ═══════════════════════════════════════════════════════
  //  INVENTORY ADJUSTMENT (ajuste de inventário em massa)
  // ═══════════════════════════════════════════════════════

  async inventoryAdjust(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { adjustments, reason, createdBy } = req.body;
    // adjustments: [{ productId, newQty }]
    if (!Array.isArray(adjustments) || adjustments.length === 0)
      return res.status(400).json({ error: "adjustments obrigatório." });
    try {
      for (const adj of adjustments) {
        const products: any[] = await (prisma as any).$queryRawUnsafe(`SELECT stock FROM Product WHERE id = ? AND tenantId = ?`, adj.productId, tenantId);
        if (!products.length) continue;
        const previousQty = products[0].stock;
        const newQty = parseInt(adj.newQty);
        const diff = newQty - previousQty;

        const movId = randomUUID();
        await (prisma as any).$executeRawUnsafe(
          `INSERT INTO StockMovement (id, tenantId, productId, type, quantity, previousQty, newQty, reason, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          movId, tenantId, adj.productId, "ajuste", diff, previousQty, newQty, reason || "Ajuste de inventário", createdBy || null
        );
        await (prisma as any).$executeRawUnsafe(`UPDATE Product SET stock = ? WHERE id = ? AND tenantId = ?`, newQty, adj.productId, tenantId);
      }
      res.json({ success: true, count: adjustments.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // ═══════════════════════════════════════════════════════
  //  RANKING (produtos mais vendidos)
  // ═══════════════════════════════════════════════════════

  async ranking(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      // Top sold products from stock movements (venda type)
      const sales: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT sm.productId, p.name, p.salePrice, p.costPrice, p.photo, p.unit, SUM(ABS(sm.quantity)) as totalSold, COUNT(*) as salesCount FROM StockMovement sm JOIN Product p ON sm.productId = p.id WHERE sm.tenantId = ? AND sm.type IN ('venda','saida','consumo') GROUP BY sm.productId, p.name, p.salePrice, p.costPrice, p.photo, p.unit ORDER BY totalSold DESC LIMIT 20`,
        tenantId
      );

      // Top consumed products from comanda items
      const consumed: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT ci.productId, p.name, SUM(ci.quantity) as totalConsumed FROM ComandaItem ci JOIN Product p ON ci.productId = p.id JOIN Comanda c ON ci.comandaId = c.id WHERE c.tenantId = ? AND ci.productId IS NOT NULL GROUP BY ci.productId, p.name ORDER BY totalConsumed DESC LIMIT 20`,
        tenantId
      );

      // Products with auto-exit (from service consumption - ServiceProduct table)
      const autoExit: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT sp.productId, p.name, p.stock, p.minStock, p.unit, s.name as serviceName, sp.quantity as qtyPerService FROM ServiceProduct sp JOIN Product p ON sp.productId = p.id JOIN Service s ON sp.serviceId = s.id WHERE s.tenantId = ? ORDER BY p.name ASC`,
        tenantId
      );

      res.json({
        sales: sales.map((r: any) => ({
          ...r,
          salePrice: Number(r.salePrice),
          costPrice: Number(r.costPrice),
          totalSold: Number(r.totalSold),
          salesCount: Number(r.salesCount),
        })),
        consumed: consumed.map((r: any) => ({
          ...r,
          totalConsumed: Number(r.totalConsumed),
        })),
        autoExit: autoExit.map((r: any) => ({
          ...r,
          stock: Number(r.stock),
          minStock: Number(r.minStock),
          qtyPerService: Number(r.qtyPerService),
        })),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },
};
