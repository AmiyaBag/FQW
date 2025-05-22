// routes/programTypes.js
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET /api/program-types - Получение всех типов для таблицы админки
router.get('/', async (req, res) => {
    try {
        const [types] = await pool.query('SELECT id_type, Name_Type FROM typedpo ORDER BY Name_Type');
        res.json(types);
    } catch (err) {
        console.error('Ошибка при получении типов программ:', err);
        res.status(500).json({ error: 'Ошибка сервера при получении типов программ' });
    }
});

// POST /api/program-types - Создание нового типа
router.post('/', async (req, res) => {
    const { Name_Type } = req.body;
    if (!Name_Type || Name_Type.trim() === '') {
        return res.status(400).json({ error: 'Необходимо указать название типа' });
    }
    try {
        const insertQuery = 'INSERT INTO typedpo (Name_Type) VALUES (?)';
        const [result] = await pool.query(insertQuery, [Name_Type.trim()]);
        const insertId = result.insertId;
        // Возвращаем созданный тип
        const [newType] = await pool.query('SELECT id_type, Name_Type FROM typedpo WHERE id_type = ?', [insertId]);
        res.status(201).json(newType[0] || { id: insertId });
    } catch (err) {
        console.error('Ошибка при добавлении типа программы:', err);
        if (err.code === 'ER_DUP_ENTRY') {
             return res.status(400).json({ error: 'Такой тип программы уже существует' });
        }
        res.status(500).json({ error: 'Ошибка сервера при добавлении типа программы' });
    }
});

// PUT /api/program-types/:id - Обновление типа
router.put('/:id', async (req, res) => {
    const typeId = parseInt(req.params.id, 10);
     if (isNaN(typeId)) { return res.status(400).json({ error: 'Некорректный ID типа' }); }

    const { Name_Type } = req.body;
    if (!Name_Type || Name_Type.trim() === '') {
        return res.status(400).json({ error: 'Необходимо указать название типа' });
    }
    try {
        const updateQuery = 'UPDATE typedpo SET Name_Type = ? WHERE id_type = ?';
        const [result] = await pool.query(updateQuery, [Name_Type.trim(), typeId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Тип программы с указанным ID не найден' });
        }
        res.json({ message: 'Тип программы успешно обновлен' });
    } catch (err) {
        console.error(`Ошибка при обновлении типа программы ${typeId}:`, err);
         if (err.code === 'ER_DUP_ENTRY') {
             return res.status(400).json({ error: 'Такой тип программы уже существует' });
        }
        res.status(500).json({ error: 'Ошибка сервера при обновлении типа программы' });
    }
});

// DELETE /api/program-types/:id - Удаление типа
router.delete('/:id', async (req, res) => {
    const typeId = parseInt(req.params.id, 10);
    if (isNaN(typeId)) { return res.status(400).json({ error: 'Некорректный ID типа' }); }

    try {
         // Важно: Проверка на связанные программы перед удалением
        const checkQuery = 'SELECT COUNT(*) as count FROM programdpo WHERE id_type = ?';
        const [checkResult] = await pool.query(checkQuery, [typeId]);
        if (checkResult[0].count > 0) {
            return res.status(400).json({ error: 'Невозможно удалить тип, так как существуют связанные с ним программы' });
        }

        const deleteQuery = 'DELETE FROM typedpo WHERE id_type = ?';
        const [result] = await pool.query(deleteQuery, [typeId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Тип программы с указанным ID не найден' });
        }
        res.status(200).json({ message: 'Тип программы успешно удален' });
    } catch (err) {
        console.error(`Ошибка при удалении типа программы ${typeId}:`, err);
         // Обработка других возможных ошибок ссылочной целостности
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
             return res.status(400).json({ error: 'Невозможно удалить тип, так как на него есть ссылки' });
        }
        res.status(500).json({ error: 'Ошибка сервера при удалении типа программы' });
    }
});

module.exports = router;