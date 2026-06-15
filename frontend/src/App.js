import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useState } from "react";

import Dashboard from "./pages/Dashboard";
import CustomerOnboarding from "./pages/CustomerOnboarding";
import FarmerOnboarding from "./pages/FarmerOnboarding";
import MaterialManagement from "./pages/MaterialManagement";
import Collection from "./pages/Collection";
import Stock from "./pages/Stock";
import CallingApp from "./pages/CallingApp";
import WeeklyMarket from  "./pages/WeeklyMarket";

export default function App() {

 
  const [customers, setCustomers] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [collections, setCollections] = useState([]);

  return (
    <BrowserRouter>
      <div className="app-layout">

        
        <div className="sidebar">
          <h2>Material App</h2>
          <Link to="/">Dashboard</Link><br />
         
          <Link to="/materials">Material Master</Link><br />
          <Link to="/collection">Collection App</Link><br />
          <Link to="/calling">Calling App</Link> <br />
          <Link to="/stock">Stock FIFO / LIFO</Link><br />
          
          <Link to="/weekly">Weekly Market</Link>
        </div>

        
        <div className="content">
          <Routes>

            <Route
  path="/"
  element={
    <Dashboard
      customers={customers}
      farmers={farmers}
      materials={materials}
      collections={collections}
    />
  }
/>

            <Route
              path="/customers"
              element={
                <CustomerOnboarding
                  customers={customers}
                  setCustomers={setCustomers}
                />
              }
            />

            <Route
              path="/farmers"
              element={
                <FarmerOnboarding
                  farmers={farmers}
                  setFarmers={setFarmers}
                />
              }
            />

            <Route
              path="/materials"
              element={
                <MaterialManagement
                  materials={materials}
                  setMaterials={setMaterials}
                />
              }
            />
            <Route path="/weekly" element={<WeeklyMarket collections={collections} />} />


            <Route
  path="/collection"
  element={
    <Collection
      farmers={farmers}
      customers={customers}
      materials={materials}
      collections={collections}
      setCollections={setCollections}
    />
  }
/>

            <Route
              path="/stock"
              element={
                <Stock
                  collections={collections}
                  materials={materials}
                />
              }
            />

            <Route
              path="/calling"
              element={
                <CallingApp
                  farmers={farmers}
                  materials={materials}
                  collections={collections}
                  setCollections={setCollections}
                />
              }
            />

          </Routes>
        </div>

      </div>
    </BrowserRouter>
  );
}
