import { useState, useEffect } from "react";
import axios from "axios";

export default function MaterialManagement() {
  const [materials, setMaterials] = useState([]);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("Kg");
  const [shelfLife, setShelfLife] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/materials");
      setMaterials(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Failed to load materials. Check if backend is running.");
    }
  };

  const getSuggestedUnit = (materialName) => {
    const nameLower = materialName.toLowerCase();
    const liquids = ["milk", "water", "oil", "juice"];
    if (liquids.some((item) => nameLower.includes(item))) {
      return "Liters";
    }
    return "Kg";
  };

  const validate = () => {
    if (!/^[A-Za-z\s]+$/.test(name)) {
      alert("Material Name should contain only letters");
      return false;
    }

    if (Number(qty) <= 0) {
      alert("Quantity must be greater than 0");
      return false;
    }

    if (Number(shelfLife) <= 0) {
      alert("Shelf Life must be greater than 0");
      return false;
    }

    const correctUnit = getSuggestedUnit(name);
    if (unit !== correctUnit) {
      alert(`Invalid unit! ${name} should be in ${correctUnit}`);
      return false;
    }

    return true;
  };

  const addMaterial = async () => {
    if (!name || !qty || !shelfLife) {
      alert("Name, Quantity, and Shelf Life are required");
      return;
    }

    if (!validate()) return;

    setLoading(true);

    try {
      await axios.post("http://localhost:5001/api/materials", {
        name,
        qty: Number(qty),
        unit,
        shelfLife: Number(shelfLife),
        issueType: "FIFO", // Always FIFO for food materials
      });

      fetchMaterials();
      setName("");
      setQty("");
      setUnit("Kg");
      setShelfLife("");
    } catch (err) {
      console.error("Add error:", err.response?.data || err.message);
      alert(`Error: ${err.response?.data?.error || "Failed to add material"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Material Master</h2>

      <div>
        <input
          type="text"
          placeholder="Material Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setUnit(getSuggestedUnit(e.target.value));
          }}
        />

        <input
          type="number"
          placeholder="Quantity"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />

        <select value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="Kg">Kg</option>
          <option value="Liters">Liters</option>
        </select>

        <input
          type="number"
          placeholder="Shelf Life (Days)"
          value={shelfLife}
          onChange={(e) => setShelfLife(e.target.value)}
        />

        <button onClick={addMaterial} disabled={loading}>
          {loading ? "Adding..." : "Add Material"}
        </button>
      </div>

      <br />

      {materials.length === 0 ? (
        <p>No materials added</p>
      ) : (
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>ID</th>
              <th>Material</th>
              <th>Total Qty</th>
              <th>Available Qty</th>
              <th>Reserved Qty</th>
              <th>Unit</th>
              <th>Shelf Life</th>
              <th>Issue Type</th>
            </tr>
          </thead>

          <tbody>
            {materials.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td>{m.name}</td>
                <td>{m.qty}</td>
                <td style={{ color: (m.available_qty || m.qty) > 0 ? 'green' : 'red' }}>
                  {m.available_qty || m.qty}
                </td>
                <td>{m.reserved_qty || 0}</td>
                <td>{m.unit}</td>
                <td>{m.shelf_life} days</td>
                <td>{m.issue_type || 'FIFO'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}