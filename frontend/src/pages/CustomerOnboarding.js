import { useState, useEffect } from "react";
import axios from "axios";

export default function CustomerOnboarding() {
  const [customers, setCustomers] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [email, setEmail] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState("Active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewCustomer, setViewCustomer] = useState(null); // For view modal

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5001/api/customers");
      if (res.data && Array.isArray(res.data)) {
        setCustomers(res.data);
      } else {
        setCustomers([]);
      }
      if (!editingId) {
        setCustomerCode(generateNextCode(res.data || []));
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setCustomers([]);
      if (!editingId) setCustomerCode('CUST-00001');
    } finally {
      setLoading(false);
    }
  };

  const generateNextCode = (existingCustomers) => {
    if (!existingCustomers || existingCustomers.length === 0) return 'CUST-00001';
    let maxNumber = 0;
    existingCustomers.forEach(customer => {
      if (customer.customer_code) {
        const match = String(customer.customer_code).match(/CUST-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNumber) maxNumber = num;
        }
      }
    });
    return `CUST-${String(maxNumber + 1).padStart(5, '0')}`;
  };

  const validateField = (field, value) => {
    let msg = "";
    if (field === "name") {
      if (!value || !value.trim()) msg = "Customer name is required";
      else if (value.trim().length < 2) msg = "Name must be at least 2 characters";
      else if (value.trim().length > 50) msg = "Name must be less than 50 characters";
      else if (!/^[A-Za-z]/.test(value.trim())) msg = "Name must start with a letter";
      else if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(value.trim())) msg = "Name can only contain letters, spaces, hyphens, and apostrophes";
    }
    if (field === "email") {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) msg = "Please enter a valid email address";
    }
    if (field === "gstNumber") {
      if (value && !/^\d{2}[A-Z]{5}\d{4}[A-Z]\dZ[A-Z\d]$/.test(value)) msg = "Please enter a valid GST number (e.g., 29ABCDE1234F1Z5)";
    }
    if (field === "address") {
      if (!value || !value.trim()) msg = "Address is required";
      else if (value.trim().length < 3) msg = "Address must be at least 3 characters";
      else if (value.trim().length > 200) msg = "Address must be less than 200 characters";
      else if (/[<>{}[\]\\|`~^]/.test(value)) msg = "Address contains invalid characters";
      else if (/[@#$%^&*]/.test(value)) msg = "Address cannot contain @, #, $, %, ^, &, *";
    }
    if (field === "contact") {
      if (!value || !value.trim()) msg = "Contact is required";
      else if (!/^\d+$/.test(value)) msg = "Only numbers allowed";
      else if (value.length !== 10) msg = "Must be exactly 10 digits";
      else if (!/^[6-9]/.test(value)) msg = "Must start with 6, 7, 8, or 9";
      else if (/^(\d)\1{9}$/.test(value)) msg = "Invalid contact number (all same digits)";
    }
    setErrors((prev) => ({ ...prev, [field]: msg }));
    return msg;
  };

  const handleChange = (field, value) => {
    if (field === "contact" && !/^\d*$/.test(value)) return;
    if (field === "name") {
      if (/[0-9@#$%^&*()_+=:;'"`,.?/\\|<>{}[\]~`]/.test(value)) return;
      if (value.startsWith(' ') || value.startsWith('-') || value.startsWith("'")) return;
    }
    if (field === "address") {
      if (/[<>{}[\]\\|`~^@#$%^&*]/.test(value)) return;
    }
    if (field === "gstNumber") {
      value = value.toUpperCase();
      if (value && !/^[\dA-Z]*$/.test(value)) return;
    }
    if (field === "name") setCustomerName(value);
    if (field === "email") setEmail(value);
    if (field === "gstNumber") setGstNumber(value);
    if (field === "address") setAddress(value);
    if (field === "contact") setContact(value);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  const isValidField = (field) => touched[field] && !errors[field] && getValue(field);
  
  const getValue = (field) => {
    if (field === "name") return customerName;
    if (field === "email") return email;
    if (field === "gstNumber") return gstNumber;
    if (field === "address") return address;
    if (field === "contact") return contact;
    return "";
  };

  const canSubmit = () => (
    customerName.trim().length >= 2 && 
    /^[A-Za-z]/.test(customerName.trim()) &&
    address.trim().length >= 3 && 
    !/[@#$%^&*]/.test(address) &&
    contact.length === 10 && 
    /^[6-9]/.test(contact) && 
    !isSubmitting
  );

  const editCustomer = (customer) => {
    setEditingId(customer.id);
    setCustomerCode(customer.customer_code || "");
    setCustomerName(customer.name || "");
    setEmail(customer.email || "");
    setGstNumber(customer.gst_number || "");
    setAddress(customer.address || "");
    setContact(customer.contact || "");
    setStatus(customer.status || "Active");
    setErrors({}); 
    setTouched({});
    setViewCustomer(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setCustomerName(""); 
    setEmail(""); 
    setGstNumber("");
    setAddress(""); 
    setContact(""); 
    setStatus("Active");
    setErrors({}); 
    setTouched({});
    setCustomerCode(generateNextCode(customers));
  };

  const updateCustomer = async () => {
    setTouched({ name: true, email: true, gstNumber: true, address: true, contact: true });
    if (validateField("name", customerName) || validateField("address", address) || validateField("contact", contact)) return;
    if (!customerName.trim() || !address.trim() || !contact.trim()) {
      alert("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.put(`http://localhost:5001/api/customers/${editingId}`, {
        name: customerName.trim(), 
        email: email.trim(), 
        gstNumber: gstNumber.trim(),
        address: address.trim(), 
        contact: contact.trim(), 
        status
      });
      alert("Customer updated successfully!");
      resetForm(); 
      await fetchCustomers();
    } catch (error) {
      console.error("Update error:", error);
      alert(error.response?.data?.error || "Failed to update customer");
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const deleteCustomer = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"?\nThis action cannot be undone.`)) return;
    try {
      await axios.delete(`http://localhost:5001/api/customers/${id}`);
      alert(`Customer "${name}" deleted successfully!`);
      if (editingId === id) resetForm();
      if (viewCustomer && viewCustomer.id === id) setViewCustomer(null);
      await fetchCustomers();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.response?.data?.error || "Failed to delete customer");
    }
  };

  const toggleStatus = async (customer) => {
    const newStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await axios.put(`http://localhost:5001/api/customers/${customer.id}`, {
        name: customer.name, 
        email: customer.email || "", 
        gstNumber: customer.gst_number || "",
        address: customer.address, 
        contact: customer.contact,
        status: newStatus
      });
      await fetchCustomers();
      alert(`Customer "${customer.name}" marked as ${newStatus}`);
    } catch (error) {
      console.error("Status update error:", error);
      alert("Failed to update status");
    }
  };

  const handleSubmit = () => {
    if (editingId) {
      updateCustomer();
    } else {
      addCustomer();
    }
  };

  const addCustomer = async () => {
    setTouched({ name: true, email: true, gstNumber: true, address: true, contact: true });
    const nameError = validateField("name", customerName);
    const addressError = validateField("address", address);
    const contactError = validateField("contact", contact);
    validateField("email", email);
    validateField("gstNumber", gstNumber);
    if (nameError || addressError || contactError) return;
    if (!customerName.trim() || !address.trim() || !contact.trim()) {
      alert("Please fill in all required fields (Name, Address, Contact)");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post("http://localhost:5001/api/customers", {
        customerCode,
        name: customerName.trim(),
        email: email.trim(),
        gstNumber: gstNumber.trim(),
        address: address.trim(),
        contact: contact.trim(),
        status
      });
      alert(`Customer added successfully! Code: ${customerCode}`);
      resetForm();
      await fetchCustomers();
    } catch (error) {
      console.error("Error adding customer:", error);
      const errorMsg = error.response?.data?.error || "Failed to add customer";
      if (errorMsg.includes("already exists")) {
        const newCode = generateNextCode(customers);
        setCustomerCode(newCode);
        alert(`${errorMsg}\nNew code generated: ${newCode}. Please try again.`);
      } else {
        alert(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(t)) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(t)) ||
      (c.contact && c.contact.includes(t)) ||
      (c.email && c.email.toLowerCase().includes(t))
    );
  });

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* LEFT - FORM CARD */}
        <div style={styles.formCard}>
          <h2 style={styles.title}>
            {editingId ? '✏️ Edit Customer' : '👥 Customer Onboarding'}
          </h2>

          {/* Customer Code */}
          <div style={styles.field}>
            <label style={styles.label}>Customer Code (Auto-generated)</label>
            <input 
              style={{...styles.input, backgroundColor: '#f0f0f0', fontWeight: 'bold', color: '#2c3e50'}}
              value={customerCode} 
              readOnly 
            />
          </div>

          {/* Name */}
          <div style={styles.field}>
            <label style={styles.label}>Customer Name <span style={{color:'red'}}>*</span></label>
            <input 
              style={{
                ...styles.input,
                borderColor: touched.name && errors.name ? "#ff4444" : 
                            isValidField("name") ? "#4CAF50" : "#ccc"
              }}
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={(e) => handleBlur("name", e.target.value)}
            />
            {isValidField("name") && <span style={styles.tick}>✔</span>}
            {touched.name && errors.name && <div style={styles.error}>{errors.name}</div>}
          </div>

          {/* Email */}
          <div style={styles.field}>
            <label style={styles.label}>Email <span style={{color:'#999',fontSize:'11px'}}>(Optional)</span></label>
            <input 
              style={{
                ...styles.input,
                borderColor: touched.email && errors.email ? "#ff4444" : 
                            isValidField("email") ? "#4CAF50" : "#ccc"
              }}
              placeholder="Enter email address"
              type="email"
              value={email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={(e) => handleBlur("email", e.target.value)}
            />
            {isValidField("email") && <span style={styles.tick}>✔</span>}
            {touched.email && errors.email && <div style={styles.error}>{errors.email}</div>}
          </div>

          {/* GST Number */}
          <div style={styles.field}>
            <label style={styles.label}>GST Number <span style={{color:'#999',fontSize:'11px'}}>(Optional)</span></label>
            <input 
              style={{
                ...styles.input,
                borderColor: touched.gstNumber && errors.gstNumber ? "#ff4444" : 
                            isValidField("gstNumber") ? "#4CAF50" : "#ccc"
              }}
              placeholder="Enter GST number (e.g., 29ABCDE1234F1Z5)"
              value={gstNumber}
              maxLength={15}
              onChange={(e) => handleChange("gstNumber", e.target.value)}
              onBlur={(e) => handleBlur("gstNumber", e.target.value)}
            />
            {isValidField("gstNumber") && <span style={styles.tick}>✔</span>}
            {touched.gstNumber && errors.gstNumber && <div style={styles.error}>{errors.gstNumber}</div>}
          </div>

          {/* Address */}
          <div style={styles.field}>
            <label style={styles.label}>Address <span style={{color:'red'}}>*</span></label>
            <input 
              style={{
                ...styles.input,
                borderColor: touched.address && errors.address ? "#ff4444" : 
                            isValidField("address") ? "#4CAF50" : "#ccc"
              }}
              placeholder="Enter complete address"
              value={address}
              onChange={(e) => handleChange("address", e.target.value)}
              onBlur={(e) => handleBlur("address", e.target.value)}
            />
            {isValidField("address") && <span style={styles.tick}>✔</span>}
            {touched.address && errors.address && <div style={styles.error}>{errors.address}</div>}
          </div>

          {/* Contact */}
          <div style={styles.field}>
            <label style={styles.label}>Contact Number <span style={{color:'red'}}>*</span></label>
            <input 
              style={{
                ...styles.input,
                borderColor: touched.contact && errors.contact ? "#ff4444" : 
                            isValidField("contact") ? "#4CAF50" : "#ccc"
              }}
              placeholder="Enter 10-digit mobile number"
              value={contact}
              maxLength={10}
              onChange={(e) => handleChange("contact", e.target.value)}
              onBlur={(e) => handleBlur("contact", e.target.value)}
            />
            {isValidField("contact") && <span style={styles.tick}>✔</span>}
            {touched.contact && errors.contact && <div style={styles.error}>{errors.contact}</div>}
          </div>

          {/* Status */}
          <div style={styles.field}>
            <label style={styles.label}>Status</label>
            <select 
              style={{...styles.input, borderColor: "#ccc"}}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Active">🟢 Active</option>
              <option value="Inactive">🔴 Inactive</option>
            </select>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              style={{
                ...styles.button,
                flex: 2,
                backgroundColor: canSubmit() ? (editingId ? "#0728ff" : "#4CAF50") : "#ccc",
                cursor: canSubmit() ? "pointer" : "not-allowed",
                opacity: isSubmitting ? 0.7 : 1,
              }}
              onClick={handleSubmit}
              disabled={!canSubmit()}
            >
              {isSubmitting ? "⏳ Saving..." : editingId ? "✏️ Update Customer" : "✅ Add Customer"}
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

        {/* RIGHT - CUSTOMER LIST */}
        <div style={styles.listCard}>
          {/* Fixed Header */}
          <div style={{ flexShrink: 0 }}>
            <h3 style={{ margin: '0 0 10px 0' }}>👥 Customers ({customers.length})</h3>
            
            {/* Search Bar */}
            <input 
              type="text" 
              placeholder="🔍 Search customers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                ...styles.input, 
                marginBottom: '15px', 
                paddingRight: '12px',
              }} 
            />
          </div>
          
          {/* Scrollable Content */}
          <div style={styles.scrollArea}>
            {loading ? (
              <p style={styles.emptyMessage}>Loading customers...</p>
            ) : filteredCustomers.length === 0 ? (
              <p style={styles.emptyMessage}>
                {searchTerm ? 'No matching customers found' : 'No customers registered yet'}
              </p>
            ) : (
              filteredCustomers.map((c) => (
                <div key={c.id} style={{
                  ...styles.customerCard,
                  border: editingId === c.id ? '2px solid #f39c12' : '1px solid #e0e0e0',
                  background: editingId === c.id ? '#fffef5' : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                }}>
                  {/* Header - Avatar, Name, Code, Status */}
                  <div style={styles.customerHeader}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {/* Avatar Circle */}
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '17px',
                        marginRight: '12px',
                        flexShrink: 0,
                      }}>
                        {(c.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={styles.customerName}>{c.name}</div>
                        <span style={styles.code}>{c.customer_code || 'N/A'}</span>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <span style={{
                      ...styles.statusBadge,
                      background: c.status === 'Active' ? '#d4edda' : '#fce4ec',
                      color: c.status === 'Active' ? '#155724' : '#c62828',
                    }}>
                      {c.status === 'Active' ? '● Active' : '● Inactive'}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ paddingLeft: '54px' }}>
                    {c.email && (
                      <div style={styles.detail}>📧 {c.email}</div>
                    )}
                    <div style={styles.detail}>📞 {c.contact}</div>
                    <div style={styles.detail}>🏠 {c.address}</div>
                    {c.gst_number && (
                      <div style={styles.detail}>🧾 GST: {c.gst_number}</div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={styles.actionContainer}>
                    <button 
                      onClick={() => setViewCustomer(c)}
                      style={styles.viewBtn}
                    >
                      👁️ View
                    </button>
                    <button 
                      onClick={() => editCustomer(c)}
                      style={styles.editBtn}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={() => toggleStatus(c)}
                      style={styles.toggleBtn}
                    >
                      {c.status === 'Active' ? '🔴 Inactivate' : '🟢 Activate'}
                    </button>
                    <button 
                      onClick={() => deleteCustomer(c.id, c.name)}
                      style={styles.deleteBtn}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* VIEW MODAL */}
      {viewCustomer && (
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
        }} onClick={() => setViewCustomer(null)}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', color: '#1a1a2e' }}>👤 Customer Details</h2>
              <button onClick={() => setViewCustomer(null)} style={{
                background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999'
              }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '24px', marginRight: '15px', flexShrink: 0,
              }}>
                {(viewCustomer.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e' }}>{viewCustomer.name}</div>
                <span style={{
                  fontSize: '12px', background: '#e8f0fe', padding: '4px 10px',
                  borderRadius: '20px', color: '#1967d2', fontWeight: '600',
                }}>{viewCustomer.customer_code || 'N/A'}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '15px' }}>
              {viewCustomer.email && (
                <div style={{ fontSize: '14px', color: '#555', padding: '8px 0' }}>
                  <strong>📧 Email:</strong> {viewCustomer.email}
                </div>
              )}
              <div style={{ fontSize: '14px', color: '#555', padding: '8px 0' }}>
                <strong>📞 Contact:</strong> {viewCustomer.contact}
              </div>
              <div style={{ fontSize: '14px', color: '#555', padding: '8px 0' }}>
                <strong>🏠 Address:</strong> {viewCustomer.address}
              </div>
              {viewCustomer.gst_number && (
                <div style={{ fontSize: '14px', color: '#555', padding: '8px 0' }}>
                  <strong>🧾 GST:</strong> {viewCustomer.gst_number}
                </div>
              )}
              <div style={{ fontSize: '14px', color: '#555', padding: '8px 0' }}>
                <strong>Status:</strong>{' '}
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                  background: viewCustomer.status === 'Active' ? '#d4edda' : '#fce4ec',
                  color: viewCustomer.status === 'Active' ? '#155724' : '#c62828',
                }}>
                  {viewCustomer.status === 'Active' ? '● Active' : '● Inactive'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => editCustomer(viewCustomer)} style={{
                flex: 1, padding: '10px', background: '#fff3e0', color: '#e65100',
                border: '1px solid #ffe0b2', borderRadius: '8px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '600',
              }}>✏️ Edit</button>
              <button onClick={() => { setViewCustomer(null); }} style={{
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

// Styles
const styles = {
  wrapper: {
    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
    minHeight: "100vh",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },

  container: {
    display: "flex",
    gap: "20px",
    width: "100%",
    maxWidth: "1500px",
    margin: "0 auto",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "nowrap",
  },

  formCard: {
    flex: 1,
    minWidth: "500px",
    background: "#fff",
    padding: "25px",
    borderRadius: "15px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    boxSizing: "border-box",
  },

  listCard: {
    flex: 1,
    minWidth: "500px",
    background: "#fff",
    padding: "20px",
    borderRadius: "15px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    height: "850px",
    overflow: "hidden",
  },

  title: {
    textAlign: "center",
    marginBottom: "20px",
    color: "#2c3e50",
    fontSize: "24px",
    fontWeight: "700",
  },

  label: {
    display: "block",
    marginBottom: "6px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#495057",
  },

  field: {
    marginBottom: "14px",
    position: "relative",
    width: "100%",
  },

  input: {
    width: "100%",
    height: "48px",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #ced4da",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.3s ease",
  },

  error: {
    color: "#dc3545",
    fontSize: "12px",
    marginTop: "4px",
    fontWeight: "500",
  },

  tick: {
    color: "#28a745",
    position: "absolute",
    right: "12px",
    top: "38px",
    fontWeight: "bold",
    fontSize: "15px",
  },

  button: {
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "600",
    fontSize: "15px",
    cursor: "pointer",
    transition: "0.3s",
  },

  detail: {
    fontSize: "13px",
    color: "#495057",
    marginTop: "5px",
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

  customerCard: {
    padding: "16px 18px",
    background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    marginBottom: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    transition: "all 0.3s ease",
  },

  customerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
    paddingBottom: "12px",
    borderBottom: "1px solid #f0f0f0",
  },

  customerName: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1a1a2e",
  },

  code: {
    fontSize: "11px",
    background: "#e8f0fe",
    padding: "4px 10px",
    borderRadius: "20px",
    color: "#1967d2",
    fontWeight: "600",
    display: "inline-block",
    marginTop: "3px",
  },

  statusBadge: {
    padding: '5px 14px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  },

  scrollArea: {
    flex: 1,
    overflowY: "auto",
    paddingRight: "5px",
  },

  actionContainer: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f0f0f0',
    paddingLeft: '54px',
  },

  // Action Buttons
  viewBtn: {
    flex: 1,
    padding: '8px 12px',
    background: '#e8f5e9',
    color: '#2e7d32',
    border: '1px solid #c8e6c9',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },

  editBtn: {
    flex: 1,
    padding: '8px 12px',
    background: '#fff3e0',
    color: '#e65100',
    border: '1px solid #ffe0b2',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },

  toggleBtn: {
    flex: 1,
    padding: '8px 12px',
    background: '#e3f2fd',
    color: '#1565c0',
    border: '1px solid #bbdefb',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },

  deleteBtn: {
    flex: 1,
    padding: '8px 12px',
    background: '#fce4ec',
    color: '#c62828',
    border: '1px solid #ffcdd2',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
};