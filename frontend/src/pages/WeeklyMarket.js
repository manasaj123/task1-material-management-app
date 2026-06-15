import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export default function WeeklyMarket() {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, farmer, customer
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalFarmers: 0,
    totalCustomers: 0,
    totalMaterials: 0,
    totalQuantity: 0
  });

  const fetchWeeklyMarket = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5001/api/stock/weekly");
      
      const data = res.data || [];
      setWeeklyData(data);
      
      // Calculate statistics
      if (data.length > 0) {
        const farmers = new Set(data.filter(d => d.farmerName).map(d => d.farmerName));
        const customers = new Set(data.filter(d => d.customerName).map(d => d.customerName));
        const materials = new Set(data.map(d => d.materialName));
        const totalQty = data.reduce((sum, d) => sum + (Number(d.totalQty) || 0), 0);
        
        setStats({
          totalFarmers: farmers.size,
          totalCustomers: customers.size,
          totalMaterials: materials.size,
          totalQuantity: totalQty
        });
      }
    } catch (err) {
      console.error("Weekly market error:", err.response?.data || err.message);
      alert("Failed to load weekly market data: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeeklyMarket();
  }, [fetchWeeklyMarket]);

  // Filter and search data
  const filteredData = weeklyData.filter(item => {
    // Filter by type
    if (filter === "farmer" && !item.farmerName) return false;
    if (filter === "customer" && !item.customerName) return false;
    
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (item.farmerName && item.farmerName.toLowerCase().includes(term)) ||
        (item.customerName && item.customerName.toLowerCase().includes(term)) ||
        (item.materialName && item.materialName.toLowerCase().includes(term))
      );
    }
    
    return true;
  });

  // Group by material for summary view
  const materialSummary = filteredData.reduce((acc, item) => {
    const key = item.materialName;
    if (!acc[key]) {
      acc[key] = {
        materialName: key,
        totalQty: 0,
        farmers: new Set(),
        customers: new Set()
      };
    }
    acc[key].totalQty += Number(item.totalQty) || 0;
    if (item.farmerName) acc[key].farmers.add(item.farmerName);
    if (item.customerName) acc[key].customers.add(item.customerName);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="container" style={containerStyle}>
        <h2 style={titleStyle}>📊 Weekly Market – FRO View</h2>
        <div style={loadingStyle}>
          <div style={spinnerStyle}></div>
          <p>Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={containerStyle}>
      <h2 style={titleStyle}>📊 Weekly Market – FRO View</h2>

      {weeklyData.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📭</div>
          <h3>No Market Data Available</h3>
          <p>Complete some collections to see weekly market data here.</p>
          <button onClick={fetchWeeklyMarket} style={refreshButtonStyle}>
            🔄 Refresh Data
          </button>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div style={statsGridStyle}>
            <div style={{ ...statCardStyle, background: 'linear-gradient(135deg, #a3add7, #a3add7)' }}>
              <div style={statNumberStyle}>{stats.totalFarmers}</div>
              <div style={statLabelStyle}>🌾 Farmers</div>
            </div>
            <div style={{ ...statCardStyle, background: 'linear-gradient(135deg,  #a3add7, #a3add7)' }}>
              <div style={statNumberStyle}>{stats.totalCustomers}</div>
              <div style={statLabelStyle}>👥 Customers</div>
            </div>
            <div style={{ ...statCardStyle, background: 'linear-gradient(135deg,  #a3add7, #a3add7)' }}>
              <div style={statNumberStyle}>{stats.totalMaterials}</div>
              <div style={statLabelStyle}>📦 Materials</div>
            </div>
            <div style={{ ...statCardStyle, background: 'linear-gradient(135deg,  #a3add7, #a3add7)' }}>
              <div style={statNumberStyle}>{stats.totalQuantity}</div>
              <div style={statLabelStyle}>📊 Total Quantity</div>
            </div>
          </div>

          {/* Filters */}
          <div style={filterBarStyle}>
            <div style={filterGroupStyle}>
              <label style={filterLabelStyle}>Filter:</label>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="all">All Transactions</option>
                <option value="farmer">Farmers Only</option>
                <option value="customer">Customers Only</option>
              </select>
            </div>
            
            <div style={filterGroupStyle}>
              <label style={filterLabelStyle}>Search:</label>
              <input
                type="text"
                placeholder="Search by name or material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={searchInputStyle}
              />
            </div>

            <button onClick={fetchWeeklyMarket} style={refreshButtonStyle}>
              🔄 Refresh
            </button>
          </div>

          {/* Detailed Table */}
          <div style={tableContainerStyle}>
            <h3 style={sectionTitleStyle}>📋 Detailed Transactions</h3>
            {filteredData.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
                No matching records found
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>No</th>
                      <th style={thStyle}>👥 Customer</th>
                      <th style={thStyle}>🌾 Farmer</th>
                      <th style={thStyle}>📦 Material</th>
                      <th style={thStyle}>📊 Total Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, index) => (
                      <tr 
                        key={index} 
                        style={{
                          ...trStyle,
                          background: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                        }}
                      >
                        <td style={tdStyle}>{index + 1}</td>
                        <td style={tdStyle}>
                          {item.customerName ? (
                            <span style={badgeStyle('customer')}>{item.customerName}</span>
                          ) : (
                            <span style={noDataStyle}>-</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {item.farmerName ? (
                            <span style={badgeStyle('farmer')}>{item.farmerName}</span>
                          ) : (
                            <span style={noDataStyle}>-</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <strong>{item.materialName}</strong>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 'bold', color: '#2c3e50' }}>
                          {item.totalQty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Material Summary */}
          <div style={tableContainerStyle}>
            <h3 style={sectionTitleStyle}>📦 Material-wise Summary</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Material</th>
                    <th style={thStyle}>Total Qty</th>
                    <th style={thStyle}>Farmers</th>
                    <th style={thStyle}>Customers</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(materialSummary).map((item, index) => (
                    <tr 
                      key={index}
                      style={{
                        ...trStyle,
                        background: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                      }}
                    >
                      <td style={tdStyle}><strong>{item.materialName}</strong></td>
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: '#28a745' }}>
                        {item.totalQty}
                      </td>
                      <td style={tdStyle}>{item.farmers.size} 🌾</td>
                      <td style={tdStyle}>{item.customers.size} 👥</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Styles
const containerStyle = {
  maxWidth: '1400px',
  margin: '0 auto',
  padding: '20px',
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};

const titleStyle = {
  textAlign: 'center',
  color: '#2c3e50',
  marginBottom: '30px',
  fontSize: '2rem',
  fontWeight: '700',
};

const loadingStyle = {
  textAlign: 'center',
  padding: '60px 20px',
  color: '#6c757d',
};

const spinnerStyle = {
  width: '40px',
  height: '40px',
  border: '4px solid #f3f3f3',
  borderTop: '4px solid #667eea',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  margin: '0 auto 20px',
};

const emptyStateStyle = {
  textAlign: 'center',
  padding: '60px 20px',
  color: '#6c757d',
  background: 'white',
  borderRadius: '15px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
};

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '20px',
  marginBottom: '30px',
};

const statCardStyle = {
  padding: '25px',
  borderRadius: '15px',
  color: 'white',
  textAlign: 'center',
  boxShadow: '0 5px 20px rgba(0,0,0,0.15)',
};

const statNumberStyle = {
  fontSize: '2.5rem',
  fontWeight: '700',
  marginBottom: '5px',
};

const statLabelStyle = {
  fontSize: '1rem',
  fontWeight: '500',
  opacity: '0.9',
};

const filterBarStyle = {
  display: 'flex',
  gap: '20px',
  alignItems: 'center',
  padding: '20px',
  background: 'white',
  borderRadius: '10px',
  marginBottom: '30px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  flexWrap: 'wrap',
};

const filterGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const filterLabelStyle = {
  fontWeight: '600',
  color: '#495057',
  fontSize: '14px',
};

const selectStyle = {
  padding: '8px 15px',
  borderRadius: '5px',
  border: '1px solid #ddd',
  fontSize: '14px',
  outline: 'none',
};

const searchInputStyle = {
  padding: '8px 15px',
  borderRadius: '5px',
  border: '1px solid #ddd',
  fontSize: '14px',
  width: '250px',
  outline: 'none',
};

const refreshButtonStyle = {
  padding: '10px 20px',
  background: 'linear-gradient(135deg, #8891bc, #764ba2)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600',
};

const tableContainerStyle = {
  background: 'white',
  borderRadius: '15px',
  padding: '25px',
  marginBottom: '30px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
};

const sectionTitleStyle = {
  marginTop: '0',
  marginBottom: '20px',
  color: '#2c3e50',
  fontSize: '1.2rem',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle = {
  padding: '15px',
  textAlign: 'left',
  fontWeight: '600',
  color: '#495057',
  borderBottom: '2px solid #dee2e6',
  fontSize: '14px',
  background: '#f8f9fa',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '12px 15px',
  fontSize: '14px',
  borderBottom: '1px solid #e9ecef',
};

const trStyle = {
  transition: 'background-color 0.2s',
};

const badgeStyle = (type) => ({
  padding: '4px 10px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '600',
  background: type === 'farmer' ? '#d4edda' : '#cce5ff',
  color: type === 'farmer' ? '#155724' : '#004085',
});

const noDataStyle = {
  color: '#adb5bd',
  fontStyle: 'italic',
};