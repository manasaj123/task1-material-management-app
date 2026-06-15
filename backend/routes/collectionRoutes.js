import express from "express";
import db from "../config/db.js";

const router = express.Router();

/* =========================
   GET ALL COLLECTIONS
========================= */
router.get("/", (req, res) => {
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
      c.collection_id,
      c.vehicle_number,
      c.collected_by,
      c.collection_time,

      COALESCE(f.name, cust.name) AS partyName,
      m.name AS materialName,
      m.unit AS materialUnit,

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
      return res.status(500).json({ error: err.message });
    }
    res.json(data);
  });
});

/* =========================
   CREATE COLLECTION
========================= */
router.post("/", (req, res) => {
  const { partyType, partyId, materialId, qty, mfgDate, expiryDate } = req.body;

  console.log("Adding collection:", req.body);

  // Validate required fields
  if (!partyType || !partyId || !materialId || !qty) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate party type
  if (!['farmer', 'customer'].includes(partyType)) {
    return res.status(400).json({ error: "Invalid party type" });
  }

  // Enforce MFG date for farmers
  if (partyType === "farmer" && !mfgDate) {
    return res.status(400).json({ 
      error: "Manufacturing date is required for farm produce" 
    });
  }

  // Validate quantity
  if (Number(qty) <= 0) {
    return res.status(400).json({ error: "Quantity must be greater than 0" });
  }

  // Validate expiry date > mfg date
  if (partyType === "farmer" && mfgDate && expiryDate) {
    const mfgDateTime = new Date(mfgDate);
    const expiryDateTime = new Date(expiryDate);
    
    if (expiryDateTime <= mfgDateTime) {
      return res.status(400).json({ 
        error: "Expiry date must be after manufacturing date" 
      });
    }
  }

  // Check material availability
  db.query(
    "SELECT id, qty, available_qty, shelf_life, unit FROM materials WHERE id = ?",
    [materialId],
    (err, materialResult) => {
      if (err) {
        console.error("Material check error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (materialResult.length === 0) {
        return res.status(404).json({ error: "Material not found" });
      }

      const material = materialResult[0];
      
      // ✅ Check available quantity (not total quantity)
      const availableQty = material.available_qty || material.qty;
      
      if (Number(qty) > Number(availableQty)) {
        return res.status(400).json({ 
          error: `Only ${availableQty} ${material.unit} available in stock` 
        });
      }

      // Generate collection ID
      const collectionId = `COL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // Start transaction
      db.beginTransaction((err) => {
        if (err) {
          console.error("Transaction error:", err);
          return res.status(500).json({ error: "Transaction failed" });
        }

        // Insert collection based on party type
        const insertSql = partyType === "farmer" ? `
          INSERT INTO collections
          (collection_id, farmer_id, material_id, qty, mfg_date, expiry_date, status, collection_time)
          VALUES (?, ?, ?, ?, ?, ?, 'Pending', NOW())
        ` : `
          INSERT INTO collections
          (collection_id, customer_id, material_id, qty, mfg_date, expiry_date, status, collection_time)
          VALUES (?, ?, ?, ?, ?, ?, 'Pending', NOW())
        `;

        db.query(
          insertSql,
          [collectionId, partyId, materialId, qty, mfgDate || null, expiryDate],
          (err, result) => {
            if (err) {
              console.error("Insert Error:", err);
              return db.rollback(() => {
                res.status(500).json({ error: err.message });
              });
            }

            // ✅ Update material quantities
            const updateSql = `
              UPDATE materials 
              SET 
                qty = qty - ?,
                available_qty = COALESCE(available_qty, qty) - ?,
                reserved_qty = COALESCE(reserved_qty, 0) + ?
              WHERE id = ?
            `;

            db.query(
              updateSql,
              [qty, qty, qty, materialId],
              (err, updateResult) => {
                if (err) {
                  console.error("Update Error:", err);
                  return db.rollback(() => {
                    res.status(500).json({ error: "Failed to update stock" });
                  });
                }

                // Commit transaction
                db.commit((err) => {
                  if (err) {
                    console.error("Commit error:", err);
                    return db.rollback(() => {
                      res.status(500).json({ error: "Transaction commit failed" });
                    });
                  }

                  res.status(201).json({ 
                    id: result.insertId, 
                    collectionId,
                    message: "Collection saved successfully",
                    remainingStock: Number(availableQty) - Number(qty)
                  });
                });
              }
            );
          }
        );
      });
    }
  );
});

/* =========================
   UPDATE STATUS (Complete/Pending)
========================= */
router.patch("/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status
  if (!['Pending', 'Completed', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  // Get current collection status
  db.query(
    "SELECT id, status, qty, material_id FROM collections WHERE id = ?",
    [id],
    (err, collectionResult) => {
      if (err) {
        console.error("Query Error:", err);
        return res.status(500).json({ error: err.message });
      }

      if (collectionResult.length === 0) {
        return res.status(404).json({ error: "Collection not found" });
      }

      const collection = collectionResult[0];
      const oldStatus = collection.status;

      // If status is the same, just return success
      if (oldStatus === status) {
        return res.json({ success: true, message: "Status unchanged" });
      }

      db.beginTransaction((err) => {
        if (err) {
          console.error("Transaction error:", err);
          return res.status(500).json({ error: "Transaction failed" });
        }

        // Update collection status
        db.query(
          "UPDATE collections SET status = ? WHERE id = ?",
          [status, id],
          (err, result) => {
            if (err) {
              console.error("Update Error:", err);
              return db.rollback(() => {
                res.status(500).json({ error: err.message });
              });
            }

            // ✅ Update material quantities based on status change
            let materialUpdateSql = '';

            if (status === 'Completed' && oldStatus === 'Pending') {
              // Moving from Pending to Completed: reduce reserved, increase completed
              materialUpdateSql = `
                UPDATE materials 
                SET 
                  reserved_qty = COALESCE(reserved_qty, 0) - ?,
                  available_qty = COALESCE(available_qty, 0) + ?
                WHERE id = ?
              `;
            } else if (status === 'Pending' && oldStatus === 'Completed') {
              // Moving from Completed back to Pending
              materialUpdateSql = `
                UPDATE materials 
                SET 
                  reserved_qty = COALESCE(reserved_qty, 0) + ?,
                  available_qty = COALESCE(available_qty, 0) - ?
                WHERE id = ?
              `;
            } else if (status === 'Cancelled') {
              // Cancelling a collection: return to available
              materialUpdateSql = `
                UPDATE materials 
                SET 
                  qty = qty + ?,
                  available_qty = COALESCE(available_qty, 0) + ?,
                  reserved_qty = COALESCE(reserved_qty, 0) - ?
                WHERE id = ?
              `;
            }

            if (materialUpdateSql) {
              db.query(
                materialUpdateSql,
                [collection.qty, collection.qty, collection.material_id],
                (err, updateResult) => {
                  if (err) {
                    console.error("Material Update Error:", err);
                    return db.rollback(() => {
                      res.status(500).json({ error: "Failed to update stock" });
                    });
                  }

                  db.commit((err) => {
                    if (err) {
                      console.error("Commit error:", err);
                      return db.rollback(() => {
                        res.status(500).json({ error: "Transaction commit failed" });
                      });
                    }

                    res.json({ 
                      success: true, 
                      message: `Collection status updated to ${status}` 
                    });
                  });
                }
              );
            } else {
              db.commit((err) => {
                if (err) {
                  console.error("Commit error:", err);
                  return db.rollback(() => {
                    res.status(500).json({ error: "Transaction commit failed" });
                  });
                }

                res.json({ 
                  success: true, 
                  message: `Collection status updated to ${status}` 
                });
              });
            }
          }
        );
      });
    }
  );
});

export default router;