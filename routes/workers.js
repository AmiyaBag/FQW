// routes/workers.js
const express = require('express');
const pool = require('../config/db');
const bcrypt = require('bcryptjs'); // Нужен для хэширования пароля
const router = express.Router();

// GET /api/workers - Получение списка работников (Role=0) для фронта
router.get('/', async (req, res) => {
    try {
        const query = ` SELECT DISTINCT w.ID_Worker, w.FName_Worker FROM worker w WHERE w.Role = 0 ORDER BY w.FName_Worker `;
        const [workers] = await pool.query(query);
        res.json(workers);
    } catch (err) {
        console.error('Ошибка при получении списка работников:', err);
        res.status(500).json({ error: 'Ошибка сервера при получении списка работников' });
    }
});

// GET /api/workers/admin - Получение ВСЕХ работников для админки
router.get('/admin', async (req, res) => {
    try {
        const query = `
            SELECT w.ID_Worker, w.FName_Worker, w.JobTitle, w.PlaceWork, w.Degree, w.Rank, w.Login, w.Role
            FROM worker w
            ORDER BY w.FName_Worker
        `;
        const [workers] = await pool.query(query);
        res.json(workers);
    } catch (err) {
        console.error('Ошибка при получении списка работников (admin):', err);
        res.status(500).json({ error: 'Ошибка сервера при получении списка работников (admin)' });
    }
});

// POST /api/workers - Создание нового работника (включая логин/пароль)
router.post('/', async (req, res) => {
    const { FName_Worker, JobTitle, PlaceWork, Degree, Rank, Login, Password, Role } = req.body;

    // Валидация (теперь проверяем и новые обязательные поля)
    if (!FName_Worker || !JobTitle || !PlaceWork || !Login || !Password || Role === undefined) {
        return res.status(400).json({ error: 'Необходимо указать ФИО, Должность, Место работы, Логин, Пароль и Роль' });
    }

    try {
        // Хэширование пароля
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(Password, saltRounds);

        const insertQuery = `
            INSERT INTO worker (FName_Worker, JobTitle, PlaceWork, Degree, Rank, Login, Password, Role)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [FName_Worker, JobTitle, PlaceWork, Degree, Rank, Login, hashedPassword, Role];

        const [result] = await pool.query(insertQuery, params);
        const insertId = result.insertId;

        console.log(`Работник добавлен с ID: ${insertId}`);
        // Можно вернуть созданного работника (без пароля)
        const [newWorker] = await pool.query('SELECT ID_Worker, FName_Worker, JobTitle, PlaceWork, Degree, Rank, Login, Role FROM worker WHERE ID_Worker = ?', [insertId]);
        res.status(201).json(newWorker[0] || { id: insertId });

    } catch (err) {
        console.error('Ошибка при добавлении работника:', err);
        if (err.code === 'ER_DUP_ENTRY') { // Обработка дубликата логина
            return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
        }
        res.status(500).json({ error: 'Ошибка сервера при добавлении работника' });
    }
});

// PUT /api/workers/:id - Обновление работника
router.put('/:id', async (req, res) => {
    const workerId = parseInt(req.params.id, 10);
    if (isNaN(workerId)) { return res.status(400).json({ error: 'Некорректный ID работника' }); }

    const { FName_Worker, JobTitle, PlaceWork, Degree, Rank, Login, Password, Role } = req.body;

    // Валидация (теперь проверяем и новые обязательные поля)
    if (!FName_Worker || !JobTitle || !PlaceWork || !Login || Role === undefined) {
        return res.status(400).json({ error: 'Необходимо указать ФИО, Должность, Место работы и Логин' });
    }

    try {
        let hashedPassword = null;
        if (Password) { // Хэшируем пароль, только если он был передан
            const saltRounds = 10;
            hashedPassword = await bcrypt.hash(Password, saltRounds);
        }

        // Динамическое построение запроса в зависимости от наличия пароля
        let updateQuery;
        let params;
        if (hashedPassword) {
            updateQuery = `
                UPDATE worker SET FName_Worker = ?, JobTitle = ?, PlaceWork = ?, Degree = ?, Rank = ?, Login = ?, Password = ?, Role = ?
                WHERE ID_Worker = ?
            `;
            params = [FName_Worker, JobTitle, PlaceWork, Degree, Rank, Login, hashedPassword, Role, workerId];
        } else {
            updateQuery = `
                UPDATE worker SET FName_Worker = ?, JobTitle = ?, PlaceWork = ?, Degree = ?, Rank = ?, Login = ?, Role = ?
                WHERE ID_Worker = ?
            `;
            params = [FName_Worker, JobTitle, PlaceWork, Degree, Rank, Login, Role, workerId];
        }

        const [result] = await pool.query(updateQuery, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Работник с указанным ID не найден' });
        }

        console.log(`Работник ${workerId} успешно обновлен.`);
        res.json({ message: 'Работник успешно обновлен' });

    } catch (err) {
        console.error(`Ошибка при обновлении работника ${workerId}:`, err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
        }
        res.status(500).json({ error: 'Ошибка сервера при обновлении работника' });
    }
});

// DELETE /api/workers/:id - Удаление работника
router.delete('/:id', async (req, res) => {
    const workerId = parseInt(req.params.id, 10);
    if (isNaN(workerId)) { return res.status(400).json({ error: 'Некорректный ID работника' }); }

    console.log(`DELETE /api/workers/${workerId}`);

    try {
        // Проверка, не пытается ли пользователь удалить сам себя (опционально, но полезно)
        // const currentUserId = req.user?.workerId; // Если у вас есть middleware для аутентификации
        // if (currentUserId === workerId) {
        //  return res.status(403).json({ error: 'Нельзя удалить самого себя' });
        // }

        // Сначала проверим, не ссылаются ли на работника документы
        const checkQuery = 'SELECT COUNT(*) as count FROM document WHERE ID_Worker = ?';
        const [checkResult] = await pool.query(checkQuery, [workerId]);
        if (checkResult[0].count > 0) {
            return res.status(400).json({ error: 'Невозможно удалить работника, так как у него есть связанные документы' });
        }

        // Если ссылок нет, удаляем работника
        const deleteQuery = 'DELETE FROM worker WHERE ID_Worker = ?';
        const [result] = await pool.query(deleteQuery, [workerId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Работник с указанным ID не найден' });
        }

        console.log(`Работник ${workerId} удален.`);
        res.status(200).json({ message: 'Работник успешно удален' });

    } catch (err) {
        console.error(`Ошибка при удалении работника ${workerId}:`, err);
        // Другие возможные ошибки внешних ключей, если worker на что-то ссылается
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Невозможно удалить работника, так как на него есть ссылки в других таблицах' });
        }
        res.status(500).json({ error: 'Ошибка сервера при удалении работника' });
    }
});

// POST /api/workers/:workerId/kks - Добавление KKS к работнику
router.post('/:workerId/kks', async (req, res) => {
    const workerId = parseInt(req.params.workerId, 10);
    const { kksId } = req.body;

    if (isNaN(workerId) || isNaN(kksId)) {
        return res.status(400).json({ error: 'Некорректные ID работника или KKS' });
    }

    try {
        const checkQuery = 'SELECT * FROM worker_kks WHERE ID_Worker = ? AND ID_KKS = ?';
        const [existing] = await pool.query(checkQuery, [workerId, kksId]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Данный KKS уже связан с этим работником' });
        }

        const insertQuery = 'INSERT INTO worker_kks (ID_Worker, ID_KKS) VALUES (?, ?)';
        await pool.query(insertQuery, [workerId, kksId]);
        res.status(201).json({ message: 'KKS успешно добавлен к работнику' });
    } catch (err) {
        console.error('Ошибка при добавлении KKS к работнику:', err);
        res.status(500).json({ error: 'Ошибка сервера при добавлении KKS к работнику' });
    }
});

// DELETE /api/workers/:workerId/kks/:kksId - Удаление KKS у работника
router.delete('/:workerId/kks/:kksId', async (req, res) => {
    const workerId = parseInt(req.params.workerId, 10);
    const kksId = parseInt(req.params.kksId, 10);

    if (isNaN(workerId) || isNaN(kksId)) {
        return res.status(400).json({ error: 'Некорректные ID работника или KKS' });
    }

    try {
        const deleteQuery = 'DELETE FROM worker_kks WHERE ID_Worker = ? AND ID_KKS = ?';
        const [result] = await pool.query(deleteQuery, [workerId, kksId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Связь между работником и KKS не найдена' });
        }
        res.status(200).json({ message: 'KKS успешно удален у работника' });
    } catch (err) {
        console.error('Ошибка при удалении KKS у работника:', err);
        res.status(500).json({ error: 'Ошибка сервера при удалении KKS у работника' });
    }
});


module.exports = router;