import { useState, useEffect } from "react";
import axios from "axios";

export default function FarmerOnboarding() {
  const [farmers, setFarmers] = useState([]);
  const [farmerName, setFarmerName] = useState("");
  const [farmerCode, setFarmerCode] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewFarmer, setViewFarmer] = useState(null); // For view modal

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/farmers");
      const validFarmers = res.data.filter(f => {
        return f.name && f.name.length >= 3 && /^[A-Za-z]/.test(f.name);
      });
      setFarmers(validFarmers);
      
      if (!editingId) {
        const nextCode = generateNextCode(validFarmers);
        setFarmerCode(nextCode);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setFarmers([]);
      if (!editingId) setFarmerCode('FARM-00001');
    }
  };

  const generateNextCode = (existingFarmers) => {
    if (!existingFarmers || existingFarmers.length === 0) {
      return 'FARM-00001';
    }
    
    let maxNumber = 0;
    existingFarmers.forEach(farmer => {
      if (farmer.farmer_code) {
        const match = farmer.farmer_code.match(/FARM-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNumber) maxNumber = num;
        }
      }
    });
    
    return `FARM-${String(maxNumber + 1).padStart(5, '0')}`;
  };

  const validateField = (field, value) => {
    let msg = "";

    if (field === "name") {
      if (!value || !value.trim()) {
        msg = "Farmer name is required";
      } else if (value.trim().length < 3) {
        msg = "Name must be at least 3 characters";
      } else if (value.trim().length > 50) {
        msg = "Name must be less than 50 characters";
      } else if (!/^[A-Za-z]/.test(value.trim())) {
        msg = "Name must start with a letter";
      } else if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(value.trim())) {
        msg = "Name can only contain letters, spaces, hyphens, and apostrophes";
      } else if (/\s{2,}/.test(value)) {
        msg = "Name cannot have multiple consecutive spaces";
      }
    }

    if (field === "village") {
      if (value && value.trim().length < 2) {
        msg = "Village name must be at least 2 characters";
      } else if (value && !/^[A-Za-z][A-Za-z\s]*$/.test(value.trim())) {
        msg = "Village name can only contain letters";
      }
    }

    if (field === "district") {
      if (value && value.trim().length < 2) {
        msg = "District name must be at least 2 characters";
      } else if (value && !/^[A-Za-z][A-Za-z\s]*$/.test(value.trim())) {
        msg = "District name can only contain letters";
      }
    }

    if (field === "bankAccount") {
      if (value && !/^\d+$/.test(value)) {
        msg = "Bank account must contain only numbers";
      } else if (value && (value.length < 9 || value.length > 18)) {
        msg = "Bank account must be between 9 and 18 digits";
      }
    }

    if (field === "address") {
      if (!value || !value.trim()) {
        msg = "Address is required";
      } else if (value.trim().length < 3) {
        msg = "Address must be at least 3 characters";
      } else if (value.trim().length > 200) {
        msg = "Address must be less than 200 characters";
      } else if (/[<>{}[\]\\|`~^]/.test(value)) {
        msg = "Address contains invalid characters";
      } else if (/[@#$%^&*]/.test(value)) {
        msg = "Address cannot contain @, #, $, %, ^, &, *";
      }
    }

    if (field === "contact") {
      if (!value || !value.trim()) {
        msg = "Contact is required";
      } else if (!/^\d+$/.test(value)) {
        msg = "Only numbers allowed";
      } else if (value.length !== 10) {
        msg = "Must be exactly 10 digits";
      } else if (!/^[6-9]/.test(value)) {
        msg = "Must start with 6, 7, 8, or 9";
      } else if (/^(\d)\1{9}$/.test(value)) {
        msg = "Invalid contact number";
      }
    }

    setErrors((prev) => ({ ...prev, [field]: msg }));
    return msg;
  };

  const handleChange = (field, value) => {
    if (field === "contact" && !/^\d*$/.test(value)) return;
    if (field === "bankAccount" && !/^\d*$/.test(value)) return;
    
    if (field === "name") {
      if (/[0-9@#$%^&*()_+=:;'"`,.?/\\|<>{}[\]~`]/.test(value)) return;
      if (value.startsWith(' ') || value.startsWith('-') || value.startsWith("'")) return;
    }
    
    if ((field === "village" || field === "district")) {
      if (/[0-9@#$%^&*()_+=:;'"`,.?/\\|<>{}[\]~`-]/.test(value)) return;
    }
    
    if (field === "address") {
      if (/[<>{}[\]\\|`~^@#$%^&*]/.test(value)) return;
    }

    if (field === "name") setFarmerName(value);
    if (field === "village") setVillage(value);
    if (field === "district") setDistrict(value);
    if (field === "bankAccount") setBankAccount(value);
    if (field === "address") setAddress(value);
    if (field === "contact") setContact(value);

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  const canSubmit = () => {
    return (
      farmerName.trim().length >= 3 &&
      /^[A-Za-z]/.test(farmerName.trim()) &&
      address.trim().length >= 3 &&
      !/[@#$%^&*]/.test(address) &&
      contact.length === 10 &&
      /^[6-9]/.test(contact) &&
      !isSubmitting
    );
  };

  // ✅ EDIT FARMER
  const editFarmer = (farmer) => {
    setEditingId(farmer.id);
    setFarmerCode(farmer.farmer_code || "");
    setFarmerName(farmer.name || "");
    setVillage(farmer.village || "");
    setDistrict(farmer.district || "");
    setBankAccount(farmer.bank_account || "");
    setAddress(farmer.address || "");
    setContact(farmer.contact || "");
    setErrors({});
    setTouched({});
    setViewFarmer(null);
  };

  // ✅ UPDATE FARMER
  const updateFarmer = async () => {
    setTouched({ name: true, village: true, district: true, bankAccount: true, address: true, contact: true });
    const nameError = validateField("name", farmerName);
    const addressError = validateField("address", address);
    const contactError = validateField("contact", contact);
    if (nameError || addressError || contactError) return;
    if (!farmerName.trim() || !address.trim() || !contact.trim()) {
      alert("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.put(`http://localhost:5001/api/farmers/${editingId}`, {
        name: farmerName.trim(),
        village: village.trim(),
        district: district.trim(),
        bankAccount: bankAccount.trim(),
        address: address.trim(),
        contact: contact.trim(),
      });
      alert("Farmer updated successfully!");
      resetForm();
      await fetchFarmers();
    } catch (error) {
      console.error("Update error:", error);
      alert(error.response?.data?.error || "Failed to update farmer");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ DELETE FARMER
  const deleteFarmer = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete farmer "${name}"?\nThis action cannot be undone.`)) return;
    try {
      await axios.delete(`http://localhost:5001/api/farmers/${id}`);
      alert(`Farmer "${name}" deleted successfully!`);
      if (editingId === id) resetForm();
      if (viewFarmer && viewFarmer.id === id) setViewFarmer(null);
      await fetchFarmers();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.response?.data?.error || "Failed to delete farmer");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFarmerName("");
    setVillage("");
    setDistrict("");
    setBankAccount("");
    setAddress("");
    setContact("");
    setErrors({});
    setTouched({});
    const nextCode = generateNextCode(farmers);
    setFarmerCode(nextCode);
  };

  const handleSubmit = () => {
    if (editingId) {
      updateFarmer();
    } else {
      addFarmer();
    }
  };

  const addFarmer = async () => {
    setTouched({ name: true, village: true, district: true, bankAccount: true, address: true, contact: true });
    const nameError = validateField("name", farmerName);
    const addressError = validateField("address", address);
    const contactError = validateField("contact", contact);
    validateField("village", village);
    validateField("district", district);
    validateField("bankAccount", bankAccount);
    if (nameError || addressError || contactError) return;
    if (!farmerName.trim() || !address.trim() || !contact.trim()) {
      alert("Please fill in all required fields (Name, Address, Contact)");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post("http://localhost:5001/api/farmers", {
        farmerCode: farmerCode,
        name: farmerName.trim(),
        village: village.trim(),
        district: district.trim(),
        bankAccount: bankAccount.trim(),
        address: address.trim(),
        contact: contact.trim(),
      });
      alert(`Farmer added successfully! Code: ${farmerCode}`);
      resetForm();
      await fetchFarmers();
    } catch (error) {
      console.error("Error adding farmer:", error);
      const errorMsg = error.response?.data?.error || "Failed to add farmer";
      if (errorMsg.includes("already exists")) {
        const newCode = generateNextCode(farmers);
        setFarmerCode(newCode);
        alert(`${errorMsg}\nNew code generated: ${newCode}. Please try again.`);
      } else {
        alert(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFarmers = farmers.filter(f => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      (f.name && f.name.toLowerCase().includes(t)) ||
      (f.farmer_code && f.farmer_code.toLowerCase().includes(t)) ||
      (f.contact && f.contact.includes(t)) ||
      (f.village && f.village.toLowerCase().includes(t))
    );
  });

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {editingId ? '✏️ Edit Farmer' : '🌾 Farmer Onboarding'}
        </h2>

        {/* Farmer Code */}
        <div style={styles.field}>
          <label style={styles.label}>Farmer Code (Auto-generated)</label>
          <input
            style={{
              ...styles.input,
              backgroundColor: '#f0f0f0',
              fontWeight: 'bold',
              color: '#2c3e50',
            }}
            value={farmerCode}
            readOnly
          />
        </div>

        {/* Farmer Name */}
        <div style={styles.field}>
          <label style={styles.label}>Farmer Name *</label>
          <input
            style={{
              ...styles.input,
              borderColor: touched.name && errors.name ? "#ff4444" : 
                          touched.name && !errors.name && farmerName ? "#4CAF50" : "#ccc"
            }}
            placeholder="Enter farmer's full name"
            value={farmerName}
            onChange={(e) => handleChange("name", e.target.value)}
            onBlur={(e) => handleBlur("name", e.target.value)}
          />
          {touched.name && !errors.name && farmerName && <span style={styles.tick}>✔</span>}
          {touched.name && errors.name && (
            <div style={styles.error}>{errors.name}</div>
          )}
        </div>

        {/* Village */}
        <div style={styles.field}>
          <label style={styles.label}>Village (Optional)</label>
          <input
            style={{
              ...styles.input,
              borderColor: touched.village && errors.village ? "#ff4444" : 
                          touched.village && !errors.village && village ? "#4CAF50" : "#ccc"
            }}
            placeholder="Enter village name"
            value={village}
            onChange={(e) => handleChange("village", e.target.value)}
            onBlur={(e) => handleBlur("village", e.target.value)}
          />
          {touched.village && !errors.village && village && <span style={styles.tick}>✔</span>}
          {touched.village && errors.village && (
            <div style={styles.error}>{errors.village}</div>
          )}
        </div>

        {/* District */}
        <div style={styles.field}>
          <label style={styles.label}>District (Optional)</label>
          <input
            style={{
              ...styles.input,
              borderColor: touched.district && errors.district ? "#ff4444" : 
                          touched.district && !errors.district && district ? "#4CAF50" : "#ccc"
            }}
            placeholder="Enter district name"
            value={district}
            onChange={(e) => handleChange("district", e.target.value)}
            onBlur={(e) => handleBlur("district", e.target.value)}
          />
          {touched.district && !errors.district && district && <span style={styles.tick}>✔</span>}
          {touched.district && errors.district && (
            <div style={styles.error}>{errors.district}</div>
          )}
        </div>

        {/* Bank Account */}
        <div style={styles.field}>
          <label style={styles.label}>Bank Account (Optional)</label>
          <input
            style={{
              ...styles.input,
              borderColor: touched.bankAccount && errors.bankAccount ? "#ff4444" : 
                          touched.bankAccount && !errors.bankAccount && bankAccount ? "#4CAF50" : "#ccc"
            }}
            placeholder="Enter bank account number"
            value={bankAccount}
            maxLength={18}
            onChange={(e) => handleChange("bankAccount", e.target.value)}
            onBlur={(e) => handleBlur("bankAccount", e.target.value)}
          />
          {touched.bankAccount && !errors.bankAccount && bankAccount && <span style={styles.tick}>✔</span>}
          {touched.bankAccount && errors.bankAccount && (
            <div style={styles.error}>{errors.bankAccount}</div>
          )}
        </div>

        {/* Address */}
        <div style={styles.field}>
          <label style={styles.label}>Address *</label>
          <input
            style={{
              ...styles.input,
              borderColor: touched.address && errors.address ? "#ff4444" : 
                          touched.address && !errors.address && address ? "#4CAF50" : "#ccc"
            }}
            placeholder="Enter complete address"
            value={address}
            onChange={(e) => handleChange("address", e.target.value)}
            onBlur={(e) => handleBlur("address", e.target.value)}
          />
          {touched.address && !errors.address && address && <span style={styles.tick}>✔</span>}
          {touched.address && errors.address && (
            <div style={styles.error}>{errors.address}</div>
          )}
        </div>

        {/* Contact */}
        <div style={styles.field}>
          <label style={styles.label}>Contact Number *</label>
          <input
            style={{
              ...styles.input,
              borderColor: touched.contact && errors.contact ? "#ff4444" : 
                          touched.contact && !errors.contact && contact.length === 10 ? "#4CAF50" : "#ccc"
            }}
            placeholder="Enter 10-digit mobile number"
            value={contact}
            maxLength={10}
            onChange={(e) => handleChange("contact", e.target.value)}
            onBlur={(e) => handleBlur("contact", e.target.value)}
          />
          {touched.contact && !errors.contact && contact.length === 10 && <span style={styles.tick}>✔</span>}
          {touched.contact && errors.contact && (
            <div style={styles.error}>{errors.contact}</div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            style={{
              ...styles.button,
              flex: editingId ? 2 : 1,
              backgroundColor: canSubmit() ? (editingId ? "#2c07ff" : "#4CAF50") : "#ccc",
              cursor: canSubmit() ? "pointer" : "not-allowed",
              opacity: isSubmitting ? 0.7 : 1,
            }}
            onClick={handleSubmit}
            disabled={!canSubmit()}
          >
            {isSubmitting ? "⏳ Saving..." : editingId ? "✏️ Update Farmer" : "✅ Add Farmer"}
          </button>
          {editingId && (
            <button
              style={{
                ...styles.button,
                flex: 1,
                backgroundColor: "#6c757d",
                cursor: "pointer",
              }}
              onClick={resetForm}
            >
              ❌ Cancel
            </button>
          )}
        </div>
      </div>

      {/* Farmers List */}
      <div style={styles.listCard}>
        <h3>🌾 Farmers List ({farmers.length})</h3>
        
        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search farmers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            ...styles.input,
            marginBottom: '15px',
            paddingRight: '12px',
          }}
        />
        
        {farmers.length === 0 ? (
          <p style={styles.emptyMessage}>No farmers registered yet</p>
        ) : filteredFarmers.length === 0 ? (
          <p style={styles.emptyMessage}>No matching farmers found</p>
        ) : (
          <ul style={styles.list}>
            {filteredFarmers.map((f) => (
              <li key={f.id} style={{
                ...styles.listItem,
                background: editingId === f.id ? '#fff3cd' : 'transparent',
                border: editingId === f.id ? '2px solid #ffda07' : '1px solid transparent'
              }}>
                <div style={styles.farmerHeader}>
                  <b style={styles.farmerName}>{f.name}</b>
                  <span style={styles.code}>({f.farmer_code || 'N/A'})</span>
                </div>
                {f.village && f.district && (
                  <div style={styles.detail}>
                    📍 {f.village}, {f.district}
                  </div>
                )}
                <div style={styles.detail}>📞 {f.contact}</div>
                <div style={styles.detail}>🏠 {f.address}</div>
                {f.bank_account && (
                  <div style={styles.detail}>🏦 A/C: {f.bank_account}</div>
                )}
                
                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid #e9ecef'
                }}>
                  <button
                    onClick={() => setViewFarmer(f)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: '#e8f5e9',
                      color: '#2e7d32',
                      border: '1px solid #c8e6c9',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    👁️ View
                  </button>
                  <button
                    onClick={() => editFarmer(f)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: '#fff3e0',
                      color: '#e65100',
                      border: '1px solid #ffe0b2',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteFarmer(f.id, f.name)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: '#fce4ec',
                      color: '#c62828',
                      border: '1px solid #ffcdd2',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* VIEW MODAL */}
      {viewFarmer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setViewFarmer(null)}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', color: '#1a1a2e' }}>🌾 Farmer Details</h2>
              <button onClick={() => setViewFarmer(null)} style={{
                background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999'
              }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #4CAF50, #2e7d32)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '24px', marginRight: '15px', flexShrink: 0,
              }}>
                {(viewFarmer.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e' }}>{viewFarmer.name}</div>
                <span style={{
                  fontSize: '12px', background: '#e8f5e9', padding: '4px 10px',
                  borderRadius: '20px', color: '#2e7d32', fontWeight: '600',
                }}>{viewFarmer.farmer_code || 'N/A'}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '15px' }}>
              {viewFarmer.village && (
                <div style={{ fontSize: '14px', color: '#555', padding: '8px 0' }}>
                  <strong>🏘️ Village:</strong> {viewFarmer.village}
                </div>
              )}
              {viewFarmer.district && (
                <div style={{ fontSize: '14px', color: '#555', padding: '8px 0' }}>
                  <strong>🗺️ District:</strong> {viewFarmer.district}
                </div>
              )}
              <div style={{ fontSize: '14px', color: '#555', padding: '8px 0' }}>
                <strong>📞 Contact:</strong> {viewFarmer.contact}
              </div>
              <div style={{ fontSize: '14px', color: '#555', padding: '8px 0' }}>
                <strong>🏠 Address:</strong> {viewFarmer.address}
              </div>
              {viewFarmer.bank_account && (
                <div style={{ fontSize: '14px', color: '#555', padding: '8px 0' }}>
                  <strong>🏦 Bank Account:</strong> {viewFarmer.bank_account}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => editFarmer(viewFarmer)} style={{
                flex: 1, padding: '10px', background: '#fff3e0', color: '#e65100',
                border: '1px solid #ffe0b2', borderRadius: '8px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '600',
              }}>✏️ Edit</button>
              <button onClick={() => { setViewFarmer(null); }} style={{
                flex: 1, padding: '10px', background: '#6c757d', color: '#fff',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '600',
              }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexWrap: "wrap",
    gap: "30px",
    justifyContent: "center",
    padding: "10px",
    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "500px",
    background: "#fff",
    padding: "30px",
    borderRadius: "15px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    boxSizing: "border-box",
  },
  title: {
    textAlign: "center",
    marginBottom: "25px",
    color: "#2c3e50",
    fontSize: "24px",
    fontWeight: "700",
  },
  label: {
    display: "block",
    marginBottom: "5px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#495057",
  },
  field: {
    marginBottom: "18px",
    position: "relative",
    width: "100%",
  },
  input: {
    width: "100%",
    padding: "12px",
    paddingRight: "35px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
    transition: "border-color 0.3s, box-shadow 0.3s",
    fontSize: "14px",
    outline: "none",
  },
  error: {
    color: "#dc3545",
    fontSize: "12px",
    marginTop: "5px",
    fontWeight: "500",
  },
  tick: {
    color: "#28a745",
    position: "absolute",
    right: "12px",
    top: "38px",
    fontWeight: "bold",
    fontSize: "16px",
  },
  button: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "bold",
    fontSize: "16px",
    transition: "all 0.3s ease",
    marginTop: "10px",
  },
  listCard: {
    width: "100%",
    maxWidth: "450px",
    background: "#fff",
    padding: "25px",
    borderRadius: "15px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    boxSizing: "border-box",
    maxHeight: "1000px",
    overflowY: "auto",
    height: "900px",
  },
  list: {
    listStyle: "none",
    padding: "0",
    margin: "0",
  },
  listItem: {
    padding: "15px",
    borderBottom: "1px solid #e9ecef",
    transition: "background-color 0.3s",
    borderRadius: "8px",
    marginBottom: "8px",
  },
  farmerHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "5px",
  },
  farmerName: {
    fontSize: "16px",
    color: "#2c3e50",
  },
  code: {
    color: "#6c757d",
    fontSize: "12px",
    marginLeft: "10px",
    background: "#f8f9fa",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  detail: {
    fontSize: "13px",
    color: "#495057",
    marginTop: "4px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  emptyMessage: {
    textAlign: "center",
    color: "#6c757d",
    padding: "40px 20px",
    fontSize: "16px",
  },
};