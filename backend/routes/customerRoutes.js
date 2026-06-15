import express from "express";
import db from "../config/db.js";

const router = express.Router();

// POST - Add new customer
router.post("/", (req, res) => {
  const { customerCode, name, email, gstNumber, address, contact, status } = req.body;

  console.log("Adding customer:", req.body);

  // Server-side validation
  if (!customerCode || !name || !address || !contact) {
    return res.status(400).json({ error: "Required fields: customerCode, name, address, contact" });
  }

  // Validate name
  if (!name.trim() || name.trim().length < 2) {
    return res.status(400).json({ error: "Name must be at least 2 characters" });
  }
  if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(name.trim())) {
    return res.status(400).json({ error: "Invalid name format" });
  }

  // Validate customer code format
  if (!/^CUST-\d{5}$/.test(customerCode)) {
    return res.status(400).json({ error: "Invalid customer code format. Must be CUST-00000" });
  }

  // Validate contact
  if (!/^[6-9]\d{9}$/.test(contact)) {
    return res.status(400).json({ error: "Invalid contact number. Must start with 6-9 and be 10 digits" });
  }

  // Validate email if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Validate GST if provided
  if (gstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z]\dZ[A-Z\d]$/.test(gstNumber)) {
    return res.status(400).json({ error: "Invalid GST number format" });
  }

  // Validate address
  if (address.trim().length < 3) {
    return res.status(400).json({ error: "Address must be at least 3 characters" });
  }
  if (/[@#$%^&*]/.test(address)) {
    return res.status(400).json({ error: "Address contains invalid characters" });
  }

  // Check for duplicate customer code
  db.query(
    "SELECT id FROM customers WHERE customer_code = ?",
    [customerCode],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length > 0) {
        return res.status(400).json({ error: "Customer code already exists" });
      }

      // Insert customer
      const sql = `
        INSERT INTO customers 
        (customer_code, name, email, gst_number, address, contact, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        sql,
        [customerCode, name.trim(), email || null, gstNumber || null, address.trim(), contact, status || 'Active'],
        (err, result) => {
          if (err) {
            console.error("Insert error:", err);
            return res.status(500).json({ error: "Failed to add customer" });
          }

          res.status(201).json({
            id: result.insertId,
            customerCode,
            name,
            message: "Customer added successfully"
          });
        }
      );
    }
  );
});

// GET - Get all customers
router.get("/", (req, res) => {
  const sql = "SELECT * FROM customers ORDER BY id DESC";
  
  db.query(sql, (err, data) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json({ error: "Failed to fetch customers" });
    }
    res.json(data);
  });
});

// GET - Get customer by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  
  db.query("SELECT * FROM customers WHERE id = ?", [id], (err, data) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json({ error: "Failed to fetch customer" });
    }
    
    if (data.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    res.json(data[0]);
  });
});

// PUT - Update customer
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, gstNumber, address, contact, status } = req.body;
  
  if (!name || !address || !contact) {
    return res.status(400).json({ error: "Name, address, and contact are required" });
  }
  
  const sql = `
    UPDATE customers 
    SET name = ?, email = ?, gst_number = ?, address = ?, contact = ?, status = ?
    WHERE id = ?
  `;
  
  db.query(
    sql,
    [name.trim(), email || null, gstNumber || null, address.trim(), contact, status || 'Active', id],
    (err, result) => {
      if (err) {
        console.error("Update error:", err);
        return res.status(500).json({ error: "Failed to update customer" });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      res.json({ message: "Customer updated successfully" });
    }
  );
});

// DELETE - Remove customer
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  
  db.query("DELETE FROM customers WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("Delete error:", err);
      return res.status(500).json({ error: "Failed to delete customer" });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    res.json({ message: "Customer deleted successfully" });
  });
});

// GET - Customer count
router.get("/count/total", (req, res) => {
  db.query("SELECT COUNT(*) as count FROM customers", (err, result) => {
    if (err) {
      console.error("Customer count error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ count: result[0].count });
  });
});

export default router;