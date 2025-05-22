import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

function Admin() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleAdminPanel = () => {
    navigate('/admin-panel');
  };
  const handleViewAnalysis = () => {
    navigate('/analysis');
  };
  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Панель администратора</h1>
        <button onClick={handleLogout} className="logout-button">Выйти</button>
      </div>
      
      <div className="admin-content">
        <div className="admin-info">
          <h2>Информация об администраторе</h2>
          <p><strong>Логин:</strong> {user.login}</p>
          <p><strong>Роль:</strong> Работник ЦДО</p>
        </div>

        <div className="admin-actions">
          <button onClick={handleAdminPanel} className="action-button">
            Управление данными
          </button>
          <button className="action-button" onClick={handleViewAnalysis}>Документы и анализ пользователей</button>
        </div>
      </div>
    </div>
  );
}

export default Admin; 