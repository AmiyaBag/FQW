import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import User from './components/User';
import Admin from './components/Admin';
import Documents from './components/Documents';
import DocumentAnalysis from './components/DocumentAnalysis';
import AdminPanel from './components/AdminPanel';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/user" element={<User />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/analysis" element={<DocumentAnalysis />} />
          <Route path="/admin-panel" element={<AdminPanel />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 