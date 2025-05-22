import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const apiUrl = process.env.REACT_APP_API_URL

function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${apiUrl}/api/auth/login`, {
        login,
        password
      });

      // Сохраняем данные пользователя в localStorage
      localStorage.setItem('user', JSON.stringify(response.data));
      // Лог для проверки, что сохраняется
      console.log('User data saved to localStorage:', response.data);
      // ---> КОНЕЦ ИЗМЕНЕНИЯ <---

      // Перенаправляем в зависимости от роли
      if (response.data.role === 1) {
          navigate('/admin');
      } else if (response.data.role === 0) { // Явная проверка на роль 0
          navigate('/user');
      } else {
            // На случай непредвиденной роли
            console.error("Неизвестная роль пользователя:", response.data.role);
            setError('Не удалось определить роль пользователя.');
            localStorage.removeItem('user'); // Удаляем некорректные данные
      }
    } catch (err) {
      console.error("Login error details:", err.response || err); // Логируем ошибку подробнее
      setError(err.response?.data?.error || 'Произошла ошибка при авторизации');
      localStorage.removeItem('user'); // Удаляем данные при ошибке входа
    }
    };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Вход в систему</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login">Логин:</label>
            <input
              type="text"
              id="login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Пароль:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">Войти</button>
        </form>
      </div>
    </div>
  );
}

export default Login; 