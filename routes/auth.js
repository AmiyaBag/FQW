// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db'); // Импорт пула БД

const router = express.Router();

// POST /api/auth/login - Аутентификация пользователя
router.post('/login', async (req, res) => {
    const { login, password } = req.body;
    console.log('Попытка входа (worker) через /api/auth/login:', { login });

    if (!login || !password) {
        return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    const query = 'SELECT ID_Worker, Login, Password, Role, FName_Worker FROM worker WHERE Login = ?'; // Добавили FName_Worker

    try {
        const [results] = await pool.query(query, [login]);
        console.log('Результаты поиска работника (worker):', results);

        if (results.length === 0) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        const worker = results[0];

        const isValidPassword = await bcrypt.compare(password, worker.Password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        // Пароль верный, возвращаем данные
        res.json({
            role: worker.Role,
            workerId: worker.ID_Worker,
            login: worker.Login,
            FName_Worker: worker.FName_Worker
        });

    } catch (err) {
        console.error('Ошибка при аутентификации:', err);
        res.status(500).json({ error: 'Ошибка сервера при попытке входа' });
    }
});

module.exports = router;