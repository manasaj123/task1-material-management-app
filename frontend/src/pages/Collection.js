import { useState, useEffect } from "react";
import axios from "axios";

export default function Collection() {
  const [farmers, setFarmers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [collections, setCollections] = useState([]);

  const [partyType, setPartyType] = useState("");
  const [partyId, setPartyId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [qty, setQty] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFarmers();
    fetchCustomers();
    fetchMaterials();
    fetchCollections();
  }, []);

  const fetchFarmers = async () => {
    const res = await axios.get("http://localhost:5001/api/farmers");
    setFarmers(res.data);
  };

  const fetchCustomers = async () => {
    const res = await axios.get("http://localhost:5001/api/customers");
    setCustomers(res.data);
  };

  const fetchMaterials = async () => {
    const res = await axios.get("http://localhost:5001/api/materials");
    setMaterials(res.data);
  };

  const fetchCollections = async () => {
    const res = await axios.get("http://localhost:5001/api/collections");
    setCollections(res.data);
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const calculateExpiry = (date, materialIdValue) => {
    const material = materials.find(m => m.id === Number(materialIdValue));
    if (!material || !material.shelf_life) return "";

    const exp = new Date(date);
    exp.setDate(exp.getDate() + Number(material.shelf_life));

    return formatDate(exp);
  };

  const handleMfgChange = (date) => {
    setMfgDate(date);
    setErrors(prev => ({ ...prev, mfgDate: "" }));

    if (materialId) {
      const expDate = calculateExpiry(date, materialId);
      setExpiryDate(expDate);
    }
  };

  const handleExpiryChange = (date) => {
    setExpiryDate(date);
    setErrors(prev => ({ ...prev, expiryDate: "" }));
  };

  const handlePartyTypeChange = (type) => {
    setPartyType(type);
    setPartyId("");
    setMfgDate("");
    setExpiryDate("");
    setErrors({});
  };

  const handleMaterialChange = (value) => {
    setMaterialId(value);
    setErrors(prev => ({ ...prev, materialId: "" }));

    if (mfgDate && value) {
      const expDate = calculateExpiry(mfgDate, value);
      setExpiryDate(expDate);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!partyType) {
      newErrors.partyType = "Please select party type";
    }

    if (!partyId) {
      newErrors.partyId = `Please select a ${partyType || 'party'}`;
    }

    if (!materialId) {
      newErrors.materialId = "Please select a material";
    }

    if (!qty || Number(qty) <= 0) {
      newErrors.qty = "Quantity must be greater than 0";
    }

    // MFG date is now optional but recommended for both
    if (!mfgDate) {
      // Only show warning, not error
      console.log("MFG date not provided");
    }

    if (!expiryDate) {
      newErrors.expiryDate = "Expiry date is required";
    }

    // Validate expiry date > mfg date (if both provided)
    if (mfgDate && expiryDate) {
      const mfgDateTime = new Date(mfgDate);
      const expiryDateTime = new Date(expiryDate);
      
      if (expiryDateTime <= mfgDateTime) {
        newErrors.expiryDate = "Expiry date must be after manufacturing date";
      }

      // Validate shelf life if material selected
      if (materialId) {
        const material = materials.find(m => m.id === Number(materialId));
        if (material && material.shelf_life) {
          const expectedExpiry = new Date(mfgDateTime);
          expectedExpiry.setDate(expectedExpiry.getDate() + Number(material.shelf_life));
          
          // Allow 1 day tolerance
          const diffDays = Math.abs(expiryDateTime - expectedExpiry) / (1000 * 60 * 60 * 24);
          if (diffDays > 1) {
            newErrors.expiryDate = `Expiry should be approximately ${material.shelf_life} days after MFG date (expected: ${formatDate(expectedExpiry)})`;
          }
        }
      }
    }

    // Validate quantity against available stock
    if (materialId && qty) {
      const material = materials.find(m => m.id === Number(materialId));
      if (material) {
        const availableQty = material.available_qty || material.qty;
        if (Number(qty) > Number(availableQty)) {
          newErrors.qty = `Only ${availableQty} ${material.unit} available`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveCollection = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post("http://localhost:5001/api/collections", {
        partyType,
        partyId,
        materialId,
        qty: Number(qty),
        mfgDate: mfgDate || null, // Allow null for both farmer and customer
        expiryDate
      });

      await fetchCollections();

      // Reset form
      setPartyType("");
      setPartyId("");
      setMaterialId("");
      setQty("");
      setMfgDate("");
      setExpiryDate("");
      setErrors({});
      
      alert("Collection saved successfully!");
    } catch (err) {
      console.error("Error saving collection:", err);
      alert("Failed to save collection: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get material unit for display
  const getSelectedMaterial = () => {
    return materials.find(m => m.id === Number(materialId));
  };

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#2c3e50' }}>
        📦 Collection App
      </h2>

      <div style={{ 
        background: '#f8f9fa', 
        padding: '25px', 
        borderRadius: '15px', 
        marginBottom: '30px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        {/* Party Type Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ marginRight: '20px', fontWeight: 'bold', fontSize: '16px' }}>Party Type:</label>
          <label style={{ marginRight: '20px', cursor: 'pointer' }}>
            <input
              type="radio"
              value="farmer"
              checked={partyType === "farmer"}
              onChange={() => handlePartyTypeChange("farmer")}
              style={{ marginRight: '5px' }}
            /> 🌾 Farmer
          </label>

          <label style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              value="customer"
              checked={partyType === "customer"}
              onChange={() => handlePartyTypeChange("customer")}
              style={{ marginRight: '5px' }}
            /> 👥 Customer
          </label>
          {errors.partyType && <div style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>{errors.partyType}</div>}
        </div>

        {/* Party Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            {partyType === "farmer" ? "🌾 Select Farmer" : partyType === "customer" ? "👥 Select Customer" : "Select Party"}
          </label>
          {partyType === "farmer" && (
            <select 
              value={partyId} 
              onChange={e => {
                setPartyId(e.target.value);
                setErrors(prev => ({ ...prev, partyId: "" }));
              }}
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: '8px', 
                border: errors.partyId ? '2px solid #dc3545' : '1px solid #ddd',
                fontSize: '14px'
              }}
            >
              <option value="">Select Farmer</option>
              {farmers.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.village ? `- ${f.village}` : ''} ({f.farmer_code || f.id})
                </option>
              ))}
            </select>
          )}

          {partyType === "customer" && (
            <select 
              value={partyId} 
              onChange={e => {
                setPartyId(e.target.value);
                setErrors(prev => ({ ...prev, partyId: "" }));
              }}
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: '8px', 
                border: errors.partyId ? '2px solid #dc3545' : '1px solid #ddd',
                fontSize: '14px'
              }}
            >
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.customer_code || c.id})
                </option>
              ))}
            </select>
          )}
          {errors.partyId && <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>{errors.partyId}</div>}
        </div>

        {/* Material Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            📦 Select Material
          </label>
          <select
            value={materialId}
            onChange={e => handleMaterialChange(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: '8px', 
              border: errors.materialId ? '2px solid #dc3545' : '1px solid #ddd',
              fontSize: '14px'
            }}
          >
            <option value="">Select Material</option>
            {materials.map(m => {
              const availableQty = m.available_qty || m.qty;
              return (
                <option 
                  key={m.id} 
                  value={m.id}
                  disabled={availableQty <= 0}
                >
                  {m.name} | Shelf Life: {m.shelf_life} days | Available: {availableQty} {m.unit} | Type: {m.issue_type || 'FIFO'}
                </option>
              );
            })}
          </select>
          {errors.materialId && <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>{errors.materialId}</div>}
          
          {/* Show material info when selected */}
          {materialId && getSelectedMaterial() && (
            <div style={{ 
              marginTop: '10px', 
              padding: '10px', 
              background: '#e3f2fd', 
              borderRadius: '5px',
              fontSize: '13px'
            }}>
              <strong>{getSelectedMaterial().name}</strong> - 
              Shelf Life: {getSelectedMaterial().shelf_life} days | 
              Available: {getSelectedMaterial().available_qty || getSelectedMaterial().qty} {getSelectedMaterial().unit}
            </div>
          )}
        </div>

        {/* Quantity */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            📊 Quantity *
          </label>
          <input
            type="number"
            placeholder={`Enter quantity in ${getSelectedMaterial()?.unit || 'units'}`}
            value={qty}
            onChange={e => {
              setQty(e.target.value);
              setErrors(prev => ({ ...prev, qty: "" }));
            }}
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: '8px', 
              border: errors.qty ? '2px solid #dc3545' : '1px solid #ddd',
              fontSize: '14px'
            }}
            min="1"
          />
          {errors.qty && <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>{errors.qty}</div>}
        </div>

        {/* MFG Date - Available for BOTH Farmer and Customer */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            📅 Manufacturing Date {partyType === "farmer" && <span style={{ color: 'red' }}>*</span>}
            {partyType === "customer" && <span style={{ color: '#6c757d', fontWeight: 'normal' }}>*</span>}
          </label>
          <input
            type="date"
            value={mfgDate}
            onChange={e => handleMfgChange(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: '8px', 
              border: errors.mfgDate ? '2px solid #dc3545' : '1px solid #ddd',
              fontSize: '14px'
            }}
            max={formatDate(new Date())}
          />
          {errors.mfgDate && <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>{errors.mfgDate}</div>}
          {!mfgDate && materialId && (
            <div style={{ color: '#f57c00', fontSize: '12px', marginTop: '5px' }}>
              ⚠️ Adding MFG date will auto-calculate expiry based on shelf life ({getSelectedMaterial()?.shelf_life} days)
            </div>
          )}
        </div>

        {/* Expiry Date */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            ⏰ Expiry Date *
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={e => handleExpiryChange(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: '8px', 
              border: errors.expiryDate ? '2px solid #dc3545' : '1px solid #ddd',
              fontSize: '14px'
            }}
            min={mfgDate || formatDate(new Date())}
          />
          {errors.expiryDate && <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>{errors.expiryDate}</div>}
          {mfgDate && expiryDate && !errors.expiryDate && (
            <div style={{ color: '#28a745', fontSize: '12px', marginTop: '5px' }}>
              ✅ Valid date range
            </div>
          )}
        </div>

        <button 
          onClick={saveCollection}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '14px',
            background: isSubmitting ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          {isSubmitting ? '⏳ Saving...' : '💾 Save Collection'}
        </button>
      </div>

      {/* Collections Table */}
      {collections.length > 0 && (
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '15px', 
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)' 
        }}>
          <h3>📋 Collections List ({collections.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={thStyle}>Party</th>
                  <th style={thStyle}>Material</th>
                  <th style={thStyle}>Quantity</th>
                  <th style={thStyle}>MFG Date</th>
                  <th style={thStyle}>Expiry Date</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {collections.map(c => {
                  const isExpired = c.expiry_date && new Date(c.expiry_date) < new Date();
                  const status = c.status || 'Pending';
                  
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={tdStyle}>{c.partyName || '-'}</td>
                      <td style={tdStyle}>{c.materialName || '-'}</td>
                      <td style={tdStyle}>{c.qty}</td>
                      <td style={tdStyle}>{c.mfg_date ? formatDate(c.mfg_date) : "-"}</td>
                      <td style={tdStyle}>{c.expiry_date ? formatDate(c.expiry_date) : "-"}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: 
                            status === 'Completed' ? '#d4edda' :
                            status === 'Pending' ? '#fff3cd' :
                            status === 'Cancelled' ? '#f8d7da' :
                            '#e2e3e5',
                          color:
                            status === 'Completed' ? '#155724' :
                            status === 'Pending' ? '#856404' :
                            status === 'Cancelled' ? '#721c24' :
                            '#383d41'
                        }}>
                          {status}
                          {isExpired && status === 'Completed' && ' ⚠️'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '15px',
  textAlign: 'left',
  fontWeight: '600',
  color: '#495057',
  borderBottom: '2px solid #dee2e6',
  fontSize: '14px',
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '12px 15px',
  fontSize: '14px'
};