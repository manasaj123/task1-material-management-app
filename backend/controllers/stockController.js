// controllers/stockController.js
import db from "../config/db.js";

/* ================= FIFO ================= */
export const getStockFIFO = (req, res) => {
  const { materialId } = req.params;

  const sql = `
    SELECT 
      c.id,
      c.material_id AS materialId,
      c.qty,
      c.mfg_date AS mfgDate,
      c.expiry_date AS expiryDate,
      c.status,
      c.collection_id AS collectionId,
      COALESCE(f.name, cust.name) AS partyName,
      CASE 
        WHEN c.farmer_id IS NOT NULL THEN 'farmer'
        ELSE 'customer'
      END AS partyType
    FROM collections c
    LEFT JOIN farmers f ON c.farmer_id = f.id
    LEFT JOIN customers cust ON c.customer_id = cust.id
    WHERE c.material_id = ? 
      AND c.status = 'Completed'
      AND c.expiry_date >= CURDATE()
    ORDER BY c.mfg_date ASC, c.id ASC
  `;

  db.query(sql, [materialId], (err, data) => {
    if (err) {
      console.error("FIFO error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(data);
  });
};

/* ================= LIFO ================= */
export const getStockLIFO = (req, res) => {
  const { materialId } = req.params;

  const sql = `
    SELECT 
      c.id,
      c.material_id AS materialId,
      c.qty,
      c.mfg_date AS mfgDate,
      c.expiry_date AS expiryDate,
      c.status,
      c.collection_id AS collectionId,
      COALESCE(f.name, cust.name) AS partyName,
      CASE 
        WHEN c.farmer_id IS NOT NULL THEN 'farmer'
        ELSE 'customer'
      END AS partyType
    FROM collections c
    LEFT JOIN farmers f ON c.farmer_id = f.id
    LEFT JOIN customers cust ON c.customer_id = cust.id
    WHERE c.material_id = ? 
      AND c.status = 'Completed'
      AND c.expiry_date >= CURDATE()
    ORDER BY c.mfg_date DESC, c.id DESC
  `;

  db.query(sql, [materialId], (err, data) => {
    if (err) {
      console.error("LIFO error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(data);
  });
};

/* ================= EXPIRY STATUS ================= */
export const getExpiryStatus = (req, res) => {
  const sql = `
    SELECT 
      c.id,
      c.material_id AS materialId,
      c.qty,
      c.mfg_date AS mfgDate,
      c.expiry_date AS expiryDate,
      COALESCE(f.name, cust.name) AS partyName,
      m.name AS materialName,
      m.unit AS materialUnit,
      CASE
        WHEN c.expiry_date < CURDATE() THEN 'Expired'
        WHEN DATEDIFF(c.expiry_date, CURDATE()) <= 3 THEN 'Near Expiry'
        ELSE 'Fresh'
      END AS expiry_status,
      DATEDIFF(c.expiry_date, CURDATE()) AS days_until_expiry
    FROM collections c
    LEFT JOIN farmers f ON c.farmer_id = f.id
    LEFT JOIN customers cust ON c.customer_id = cust.id
    LEFT JOIN materials m ON c.material_id = m.id
    WHERE c.status = 'Completed'
    ORDER BY 
      CASE
        WHEN c.expiry_date < CURDATE() THEN 0
        WHEN DATEDIFF(c.expiry_date, CURDATE()) <= 3 THEN 1
        ELSE 2
      END,
      c.expiry_date ASC
  `;

  db.query(sql, (err, data) => {
    if (err) {
      console.error("Expiry status error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(data);
  });
};

/* ================= WEEKLY MARKET (FIXED) ================= */
export const weeklyMarket = (req, res) => {
  // Farmers: group by farmerName + materialName (Completed only)
  const farmerSql = `
    SELECT
      f.name      AS farmerName,
      NULL        AS customerName,
      m.name      AS materialName,
      m.unit      AS materialUnit,
      SUM(c.qty)  AS totalQty,
      COUNT(DISTINCT c.id) AS transactionCount
    FROM collections c
    JOIN farmers   f ON c.farmer_id = f.id
    JOIN materials m ON c.material_id = m.id
    WHERE c.status = 'Completed'
    GROUP BY f.name, m.name, m.unit
  `;

  // Customers: group by customerName + materialName (Completed only)
  const customerSql = `
    SELECT
      NULL        AS farmerName,
      cust.name   AS customerName,
      m.name      AS materialName,
      m.unit      AS materialUnit,
      SUM(c.qty)  AS totalQty,
      COUNT(DISTINCT c.id) AS transactionCount
    FROM collections c
    JOIN customers cust ON c.customer_id = cust.id
    JOIN materials  m   ON c.material_id = m.id
    WHERE c.status = 'Completed'
    GROUP BY cust.name, m.name, m.unit
  `;

  db.query(farmerSql, (errF, farmerRows) => {
    if (errF) {
      console.error("Farmer weekly SQL error:", errF);
      return res.status(500).json({ error: errF.message });
    }

    db.query(customerSql, (errC, customerRows) => {
      if (errC) {
        console.error("Customer weekly SQL error:", errC);
        return res.status(500).json({ error: errC.message });
      }

      // Format and combine results
      const farmersData = (farmerRows || []).map((row) => ({
        customerName: null,
        farmerName: row.farmerName,
        materialName: row.materialName,
        materialUnit: row.materialUnit,
        totalQty: Number(row.totalQty) || 0,
        transactionCount: row.transactionCount || 0,
        type: 'farmer'
      }));

      const customersData = (customerRows || []).map((row) => ({
        customerName: row.customerName,
        farmerName: null,
        materialName: row.materialName,
        materialUnit: row.materialUnit,
        totalQty: Number(row.totalQty) || 0,
        transactionCount: row.transactionCount || 0,
        type: 'customer'
      }));

      // Combine and sort
      const combined = [...farmersData, ...customersData].sort((a, b) => {
        // Sort by material name
        if (a.materialName !== b.materialName) {
          return (a.materialName || '').localeCompare(b.materialName || '');
        }
        // Then by farmer/customer name
        const nameA = a.farmerName || a.customerName || '';
        const nameB = b.farmerName || b.customerName || '';
        return nameA.localeCompare(nameB);
      });

      res.json(combined);
    });
  });
};

/* ================= STOCK SUMMARY ================= */
export const getStockSummary = (req, res) => {
  const sql = `
    SELECT 
      m.id,
      m.name,
      m.unit,
      m.shelf_life,
      m.issue_type,
      m.qty AS totalQty,
      COALESCE(active_stock.qty, 0) AS availableQty,
      COALESCE(pending_stock.qty, 0) AS reservedQty,
      COALESCE(expired_stock.qty, 0) AS expiredQty
    FROM materials m
    LEFT JOIN (
      SELECT material_id, SUM(qty) AS qty
      FROM collections
      WHERE status = 'Completed' AND expiry_date >= CURDATE()
      GROUP BY material_id
    ) active_stock ON m.id = active_stock.material_id
    LEFT JOIN (
      SELECT material_id, SUM(qty) AS qty
      FROM collections
      WHERE status = 'Pending'
      GROUP BY material_id
    ) pending_stock ON m.id = pending_stock.material_id
    LEFT JOIN (
      SELECT material_id, SUM(qty) AS qty
      FROM collections
      WHERE status = 'Completed' AND expiry_date < CURDATE()
      GROUP BY material_id
    ) expired_stock ON m.id = expired_stock.material_id
    ORDER BY m.name
  `;

  db.query(sql, (err, data) => {
    if (err) {
      console.error("Stock summary error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(data);
  });
};

/* ================= MATERIAL DETAIL ================= */
export const getMaterialDetail = (req, res) => {
  const { materialId } = req.params;

  const sql = `
    SELECT 
      c.id,
      c.collection_id AS collectionId,
      c.qty,
      c.mfg_date AS mfgDate,
      c.expiry_date AS expiryDate,
      c.status,
      COALESCE(f.name, cust.name) AS partyName,
      CASE 
        WHEN c.farmer_id IS NOT NULL THEN 'farmer'
        ELSE 'customer'
      END AS partyType,
      DATEDIFF(c.expiry_date, CURDATE()) AS daysUntilExpiry
    FROM collections c
    LEFT JOIN farmers f ON c.farmer_id = f.id
    LEFT JOIN customers cust ON c.customer_id = cust.id
    WHERE c.material_id = ?
    ORDER BY 
      CASE 
        WHEN c.status = 'Completed' AND c.expiry_date >= CURDATE() THEN 1
        WHEN c.status = 'Pending' THEN 2
        ELSE 3
      END,
      c.mfg_date ASC
  `;

  db.query(sql, [materialId], (err, data) => {
    if (err) {
      console.error("Material detail error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(data);
  });
};

/* ================= DASHBOARD STATS ================= */
export const getDashboardStats = (req, res) => {
  const stats = {};

  // Total farmers
  db.query("SELECT COUNT(*) AS count FROM farmers", (err, farmerResult) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.totalFarmers = farmerResult[0].count;

    // Total customers
    db.query("SELECT COUNT(*) AS count FROM customers", (err, customerResult) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.totalCustomers = customerResult[0].count;

      // Total materials
      db.query("SELECT COUNT(*) AS count FROM materials", (err, materialResult) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalMaterials = materialResult[0].count;

        // Pending collections
        db.query("SELECT COUNT(*) AS count FROM collections WHERE status = 'Pending'", (err, pendingResult) => {
          if (err) return res.status(500).json({ error: err.message });
          stats.pendingCollections = pendingResult[0].count;

          // Completed collections
          db.query("SELECT COUNT(*) AS count FROM collections WHERE status = 'Completed'", (err, completedResult) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.completedCollections = completedResult[0].count;

            res.json(stats);
          });
        });
      });
    });
  });
};