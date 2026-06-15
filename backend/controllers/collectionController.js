import db from "../db.js";

export const createCollection = (req, res) => {
  const {
    farmerId,
    customerId,
    materialId,
    qty,
    mfgDate,
    expiryDate
  } = req.body;

  const sql = `
    INSERT INTO collections
    (farmer_id, customer_id, material_id, qty, mfg_date, expiry_date, status)
    VALUES (?,?,?,?,?,?,?)
  `;

  db.query(
    sql,
    [
      farmerId || null,
      customerId || null,
      materialId,
      qty,
      mfgDate || null,
      expiryDate,
      "Pending"
    ],
    (err, result) => {
      if (err) {
        console.error("Insert Error:", err);
        return res.status(500).json(err);
      }

      res.json({
        message: "Collection saved",
        id: result.insertId
      });
    }
  );
};

/* =========================
   GET ALL COLLECTIONS
========================= */
export const getCollections = (req, res) => {
  const sql = `
    SELECT 
      c.id,
      c.farmer_id,
      c.customer_id,
      c.material_id,
      c.qty,
      c.mfg_date,
      c.expiry_date,
      c.status,

      COALESCE(f.name, cust.name) AS partyName,
      m.name AS materialName,

      CASE 
        WHEN c.farmer_id IS NOT NULL THEN 'farmer'
        ELSE 'customer'
      END AS partyType

    FROM collections c
    LEFT JOIN farmers f ON c.farmer_id = f.id
    LEFT JOIN customers cust ON c.customer_id = cust.id
    LEFT JOIN materials m ON c.material_id = m.id
    ORDER BY c.id DESC
  `;

  db.query(sql, (err, data) => {
    if (err) {
      console.error("Collections GET Error:", err);
      return res.status(500).json(err);
    }
    res.json(data);
  });
};