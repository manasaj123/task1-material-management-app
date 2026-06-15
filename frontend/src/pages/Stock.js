import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./Stock.css";

export default function Stock() {
  const [materials, setMaterials] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExpired, setShowExpired] = useState(false);

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [materialsRes, collectionsRes] = await Promise.all([
        axios.get("http://localhost:5001/api/materials"),
        axios.get("http://localhost:5001/api/collections"),
      ]);

      // Remove duplicate materials (keep first occurrence by name+unit)
      const uniqueMaterials = materialsRes.data.reduce((acc, current) => {
        const exists = acc.find(item => 
          item.name.toLowerCase() === current.name.toLowerCase() && 
          item.unit === current.unit
        );
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      setMaterials(uniqueMaterials);

      const normalized = collectionsRes.data.map((c) => ({
        id: c.id,
        materialId: c.materialId || c.material_id,
        qty: c.qty,
        mfgDate: c.mfgDate || c.mfg_date ? formatDate(c.mfgDate || c.mfg_date) : "",
        expiryDate: c.expiryDate || c.expiry_date
          ? formatDate(c.expiryDate || c.expiry_date)
          : "",
        status: c.status,
        partyName: c.partyName || c.farmerName || c.customerName || c.party_name,
        partyType: c.partyType,
      }));

      setCollections(normalized);
    } catch (err) {
      console.error("Stock data error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get stock based on material's issue type (FIFO or LIFO)
  const getStock = (materialId, issueType) => {
    const idNum = Number(materialId);

    let materialCollections = collections
      .filter((c) => Number(c.materialId) === idNum)
      .filter((c) => c.status === "Completed")
      .filter((c) => {
        if (showExpired) return true;
        return !c.expiryDate || new Date(c.expiryDate) >= new Date();
      });

    // Sort based on issue type
    if (issueType === "FIFO") {
      // First In First Out - oldest MFG date first
      materialCollections.sort((a, b) => {
        const dateA = a.mfgDate ? new Date(a.mfgDate) : new Date(0);
        const dateB = b.mfgDate ? new Date(b.mfgDate) : new Date(0);
        return dateA - dateB;
      });
    } else {
      // Last In First Out - newest MFG date first
      materialCollections.sort((a, b) => {
        const dateA = a.mfgDate ? new Date(a.mfgDate) : new Date(0);
        const dateB = b.mfgDate ? new Date(b.mfgDate) : new Date(0);
        return dateB - dateA;
      });
    }

    return materialCollections;
  };

  // Get expired stock
  const getExpiredStock = (materialId) => {
    const idNum = Number(materialId);

    return collections
      .filter((c) => Number(c.materialId) === idNum)
      .filter((c) => c.status === "Completed")
      .filter((c) => c.expiryDate && new Date(c.expiryDate) < new Date());
  };

  // Calculate stock quantities
  const getStockQuantities = (materialId) => {
    const allCollections = collections.filter(
      (c) => Number(c.materialId) === Number(materialId)
    );

    const completed = allCollections.filter((c) => c.status === "Completed");
    const pending = allCollections.filter((c) => c.status === "Pending");
    
    const activeStock = completed.filter(
      (c) => !c.expiryDate || new Date(c.expiryDate) >= new Date()
    );
    
    const expiredStock = completed.filter(
      (c) => c.expiryDate && new Date(c.expiryDate) < new Date()
    );
    
    const availableQty = activeStock.reduce((sum, c) => sum + Number(c.qty), 0);
    const reservedQty = pending.reduce((sum, c) => sum + Number(c.qty), 0);
    const expiredQty = expiredStock.reduce((sum, c) => sum + Number(c.qty), 0);

    return { availableQty, reservedQty, expiredQty };
  };

  if (loading) {
    return (
      <div className="container">
        <h2 className="page-title">Stock Management</h2>
        <p className="loading">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h2 className="page-title">📦 Stock Management (FIFO / LIFO)</h2>
        <div className="header-controls">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
            />
            Show Expired Items
          </label>
          <button className="refresh-btn" onClick={fetchData}>
            🔄 Refresh Stock
          </button>
        </div>
      </div>

      {materials.length === 0 ? (
        <p className="no-data">No materials added</p>
      ) : (
        <div className="materials-grid">
          {materials.map((m) => {
            const issueType = m.issue_type || m.issueType || "FIFO";
            const stock = getStock(m.id, issueType);
            const expiredStock = getExpiredStock(m.id);
            const { availableQty, reservedQty, expiredQty } = getStockQuantities(m.id);

            // Skip materials with no stock at all
            if (stock.length === 0 && expiredStock.length === 0 && reservedQty === 0) {
              return null;
            }

            // Determine card color based on issue type
            const cardClass = issueType === "FIFO" ? "fifo" : "lifo";
            const headerGradient = issueType === "FIFO" 
              ? "linear-gradient(135deg, #c7cff3 0%, #d0aff1 100%)"
              : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";

            return (
              <div key={m.id} className={`material-card ${cardClass}`}>
                <h3 
                  className="material-header"
                  style={{ background: headerGradient }}
                >
                  <span>📦 {m.name.toUpperCase()} ({m.unit})</span>
                  <span className={`issue-type ${cardClass}`}>
                    {issueType}
                  </span>
                </h3>

                {/* Stock Summary */}
                <div className="stock-summary">
                  <div className="summary-item available">
                    <span className="summary-icon">✅</span>
                    <span className="summary-label">Available</span>
                    <span className="summary-value">{availableQty} {m.unit}</span>
                  </div>
                  <div className="summary-item reserved">
                    <span className="summary-icon">⏳</span>
                    <span className="summary-label">Reserved</span>
                    <span className="summary-value">{reservedQty} {m.unit}</span>
                  </div>
                  <div className="summary-item expired">
                    <span className="summary-icon">⚠️</span>
                    <span className="summary-label">Expired</span>
                    <span className="summary-value">{expiredQty} {m.unit}</span>
                  </div>
                  <div className="summary-item total">
                    <span className="summary-icon">📊</span>
                    <span className="summary-label">Total</span>
                    <span className="summary-value">{availableQty + expiredQty} {m.unit}</span>
                  </div>
                </div>

                {/* Stock Flow Indicator */}
                <div className="flow-indicator">
                  <span className="flow-label">
                    {issueType === "FIFO" ? "🟢 First In, First Out" : "🔴 Last In, First Out"}
                  </span>
                  <span className="flow-desc">
                    {issueType === "FIFO" 
                      ? "Oldest stock moves first" 
                      : "Newest stock moves first"}
                  </span>
                </div>

                {stock.length === 0 && !showExpired ? (
                  <p className="no-stock">No active stock available</p>
                ) : (
                  <table className="stock-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Party</th>
                        <th>Qty</th>
                        <th>MFG Date</th>
                        <th>Expiry</th>
                        <th>Status</th>
                        <th>Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stock.map((c, index) => {
                        const daysUntilExpiry = c.expiryDate 
                          ? Math.ceil((new Date(c.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                          : null;
                        const isNearExpiry = daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
                        const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

                        return (
                          <tr
                            key={c.id || index}
                            className={`
                              ${index === 0 ? "highlight-row" : ""} 
                              ${isExpired ? "expired-row" : ""}
                              ${isNearExpiry && !isExpired ? "near-expiry-row" : ""}
                            `}
                          >
                            <td className="order-cell">
                              {issueType === "FIFO" ? "⬆️" : "⬇️"} {index + 1}
                            </td>
                            <td>{c.partyName}</td>
                            <td className="qty-cell">{c.qty} {m.unit}</td>
                            <td>{c.mfgDate || "-"}</td>
                            <td>{c.expiryDate || "-"}</td>
                            <td>
                              <span className={`status-badge ${isExpired ? 'expired-status' : 'completed'}`}>
                                {isExpired ? 'Expired' : 'Completed'}
                              </span>
                            </td>
                            <td>
                              {isExpired ? (
                                <span className="condition-badge expired">⚠️ Expired</span>
                              ) : isNearExpiry ? (
                                <span className="condition-badge near-expiry">
                                  ⏰ {daysUntilExpiry === 0 ? 'Today' : `${daysUntilExpiry}d`}
                                </span>
                              ) : (
                                <span className="condition-badge fresh">
                                  ✅ {daysUntilExpiry}d left
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      
                      {/* Show expired items if toggle is on */}
                      {showExpired && expiredStock
                        .filter(ec => !stock.find(sc => sc.id === ec.id))
                        .map((c, index) => (
                          <tr key={`exp-${c.id || index}`} className="expired-row">
                            <td className="order-cell">❌</td>
                            <td>{c.partyName}</td>
                            <td className="qty-cell">{c.qty} {m.unit}</td>
                            <td>{c.mfgDate || "-"}</td>
                            <td>{c.expiryDate || "-"}</td>
                            <td>
                              <span className="status-badge expired-status">Expired</span>
                            </td>
                            <td>
                              <span className="condition-badge expired">⚠️ Expired</span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}