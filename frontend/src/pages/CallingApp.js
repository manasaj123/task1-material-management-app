import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export default function CallingApp() {
  const [collections, setCollections] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Date formatter (YYYY-MM-DD)
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ✅ Fetch + normalize collections
  const fetchCollections = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/collections");

      const normalized = res.data.map((c) => ({
        id: c.id,
        // handle both snake_case and camelCase
        partyName:
          c.partyName || c.party_name || c.farmerName || c.customerName,
        materialName: c.materialName || c.material_name,
        qty: c.qty,
        mfgDate: c.mfgDate || c.mfg_date || null,
        expiryDate: c.expiryDate || c.expiry_date || null,
        status: c.status,
      }));

      setCollections(normalized);
    } catch (err) {
      console.error("Fetch collections error:", err);
      alert("Failed to load collections");
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // ✅ Filter by selected date (using formatted MFG date)
  const filteredCollections = collections.filter((c) => {
    const mfg = c.mfgDate ? formatDate(c.mfgDate) : "";

    return selectedDate ? mfg === selectedDate : true;
  });

  const markCompleted = async (id) => {
    setLoading(true);
    try {
      await axios.patch(`http://localhost:5001/api/collections/${id}`, {
        status: "Completed",
      });

      await fetchCollections();
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Calling App</h2>

      <label>
        Select Date:{" "}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </label>

      <br />
      <br />

      {selectedDate && filteredCollections.length === 0 && (
        <p>No collections for this date</p>
      )}

      {filteredCollections.length > 0 && (
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>Party</th>
              <th>Material</th>
              <th>Quantity</th>
              <th>MFG Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredCollections.map((c) => (
              <tr key={c.id}>
                <td>{c.partyName}</td>
                <td>{c.materialName}</td>
                <td>{c.qty}</td>

                {/* Display dates consistently */}
                <td>{c.mfgDate ? formatDate(c.mfgDate) : "-"}</td>
                <td>{c.expiryDate ? formatDate(c.expiryDate) : "-"}</td>

                <td>{c.status || "Pending"}</td>

                <td>
                  {c.status === "Completed" ? (
                    "✔"
                  ) : (
                    <button
                      onClick={() => markCompleted(c.id)}
                      disabled={loading}
                    >
                      {loading ? "Updating..." : "Complete"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}