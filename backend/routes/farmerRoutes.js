import express from "express";
import db from "../config/db.js";

const router = express.Router();

// POST - Add new farmer
router.post("/", (req, res) => {
  const { farmerCode, name, village, district, bankAccount, address, contact } = req.body;

  // Server-side validation
  if (!farmerCode || !name || !address || !contact) {
    return res.status(400).json({ error: "Required fields: farmerCode, name, address, contact" });
  }

  // Validate name - letters only, starting with letter
  if (!/^[A-Za-z][A-Za-z\s'-]{2,}$/.test(name)) {
    return res.status(400).json({ error: "Invalid name format. Name must start with a letter and contain only letters, spaces, hyphens, and apostrophes" });
  }

  // Validate farmer code format
  if (!/^FARM-\d{5}$/.test(farmerCode)) {
    return res.status(400).json({ error: "Invalid farmer code format. Must be FARM-00000" });
  }

  // Validate contact
  if (!/^[6-9]\d{9}$/.test(contact)) {
    return res.status(400).json({ error: "Invalid contact number. Must start with 6-9 and be 10 digits" });
  }

  // Validate address - no special characters
  if (/[@#$%^&*]/.test(address)) {
    return res.status(400).json({ error: "Address contains invalid characters (@#$%^&*)" });
  }

  // Validate optional fields
  if (village && !/^[A-Za-z][A-Za-z\s]*$/.test(village)) {
    return res.status(400).json({ error: "Village name can only contain letters" });
  }

  if (district && !/^[A-Za-z][A-Za-z\s]*$/.test(district)) {
    return res.status(400).json({ error: "District name can only contain letters" });
  }

  if (bankAccount && !/^\d{9,18}$/.test(bankAccount)) {
    return res.status(400).json({ error: "Bank account must be 9-18 digits" });
  }

  // Check for duplicate farmer code
  db.query(
    "SELECT id FROM farmers WHERE farmer_code = ?",
    [farmerCode],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length > 0) {
        return res.status(400).json({ error: "Farmer code already exists" });
      }

      // Check for duplicate contact
      db.query(
        "SELECT id FROM farmers WHERE contact = ?",
        [contact],
        (err, contactResults) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database error" });
          }

          if (contactResults.length > 0) {
            return res.status(400).json({ error: "Contact number already registered" });
          }

          // Insert farmer
          const sql = `
            INSERT INTO farmers 
            (farmer_code, name, village, district, bank_account, address, contact) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;

          db.query(
            sql,
            [farmerCode, name.trim(), village || null, district || null, bankAccount || null, address.trim(), contact],
            (err, result) => {
              if (err) {
                console.error("Insert error:", err);
                return res.status(500).json({ error: "Failed to add farmer" });
              }

              res.status(201).json({
                id: result.insertId,
                farmerCode,
                name,
                message: "Farmer added successfully"
              });
            }
          );
        }
      );
    }
  );
});

// GET - Get all farmers (simplified query without complex regex)
router.get("/", (req, res) => {
  // Simple query without complex regex that causes issues
  const sql = "SELECT * FROM farmers ORDER BY id DESC";
  
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json({ error: "Failed to fetch farmers" });
    }
    
    // Filter out invalid entries in JavaScript instead of SQL
    const validFarmers = data.filter(farmer => {
      // Name validation: starts with letter, contains only letters, spaces, hyphens, apostrophes
      const nameValid = /^[A-Za-z][A-Za-z\s'-]+$/.test(farmer.name || '');
      
      // Address validation: no special characters
      const addressValid = !/[@#$%^&*]/.test(farmer.address || '');
      
      // Name should be at least 3 characters
      const nameLengthValid = (farmer.name || '').length >= 3;
      
      return nameValid && addressValid && nameLengthValid;
    });
    
    res.json(validFarmers);
  });
});

// GET - Get farmer by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  
  db.query("SELECT * FROM farmers WHERE id = ?", [id], (err, data) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json({ error: "Failed to fetch farmer" });
    }
    
    if (data.length === 0) {
      return res.status(404).json({ error: "Farmer not found" });
    }
    
    res.json(data[0]);
  });
});

// PUT - Update farmer
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, village, district, bankAccount, address, contact } = req.body;
  
  // Validate required fields
  if (!name || !address || !contact) {
    return res.status(400).json({ error: "Name, address, and contact are required" });
  }
  
  const sql = `
    UPDATE farmers 
    SET name = ?, village = ?, district = ?, bank_account = ?, address = ?, contact = ?
    WHERE id = ?
  `;
  
  db.query(
    sql,
    [name.trim(), village || null, district || null, bankAccount || null, address.trim(), contact, id],
    (err, result) => {
      if (err) {
        console.error("Update error:", err);
        return res.status(500).json({ error: "Failed to update farmer" });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Farmer not found" });
      }
      
      res.json({ message: "Farmer updated successfully" });
    }
  );
});

// DELETE - Remove farmer
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  
  db.query("DELETE FROM farmers WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("Delete error:", err);
      return res.status(500).json({ error: "Failed to delete farmer" });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Farmer not found" });
    }
    
    res.json({ message: "Farmer deleted successfully" });
  });
});

export default router;