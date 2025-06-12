// routes/kks.js
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET /api/kks
router.get('/', async (req, res) => {
    try {
        const query = 'SELECT ID_KKS, name_kks, SName_KKS FROM kks ORDER BY name_kks';
        const [kksItems] = await pool.query(query);
        const formattedKks = kksItems.map(item => ({ ID_KKS: item.ID_KKS, Name_KKS: item.name_kks, SName_KKS: item.SName_KKS }));
        res.json(formattedKks);
    } catch (err) {
        console.error('Ошибка при получении списка KKS:', err);
        res.status(500).json({ error: 'Ошибка сервера при получении списка KKS' });
    }
});

// PUT /api/kks/:id
router.put('/:id', async (req, res) => {
    const kksId = req.params.id;
    const { Name_KKS, SName_KKS } = req.body;
    if (!Name_KKS) { return res.status(400).json({ error: 'Название KKS обязательно' }); }
    try {
        const updateQuery = 'UPDATE kks SET name_kks = ?, SName_KKS = ? WHERE ID_KKS = ?';
        const [result] = await pool.query(updateQuery, [Name_KKS, SName_KKS, kksId]);
        if (result.affectedRows === 0) { return res.status(404).json({ error: 'KKS с указанным ID не найден' }); }
        res.json({ message: 'KKS успешно обновлен' });
    } catch (err) {
        console.error(`Ошибка при обновлении KKS ${kksId}:`, err);
        res.status(500).json({ error: 'Ошибка сервера при обновлении KKS' });
    }
});

// POST /api/kks
router.post('/', async (req, res) => {
    const { Name_KKS, SName_KKS } = req.body;
    if (!Name_KKS) { return res.status(400).json({ error: 'Название KKS обязательно' }); }
    try {
        const insertQuery = 'INSERT INTO kks (name_kks, SName_KKS) VALUES (?, ?)';
        const [result] = await pool.query(insertQuery, [Name_KKS, SName_KKS || null]);
        const insertId = result.insertId;
        const [newKks] = await pool.query('SELECT ID_KKS, name_kks AS Name_KKS, SName_KKS FROM kks WHERE ID_KKS = ?', [insertId]);
        res.status(201).json(newKks[0] || { id: insertId });
    } catch (err) {
        console.error('Ошибка при добавлении KKS:', err.message); // Log message
        console.error('SQL State:', err.sqlState); // Log SQL state if it's a database error
        console.error('Error Code:', err.code);     // Log error code if it's a database error (e.g., ER_DUP_ENTRY)
        console.error('Full Error Object:', err);   // Log the full object for more detail

        // Optionally, send a more detailed error to the frontend during development
        res.status(500).json({
            error: 'Ошибка сервера при добавлении KKS',
            details: err.message, // Send error message to frontend
            code: err.code,       // Send error code to frontend
            sqlState: err.sqlState // Send SQL state to frontend
        });
    }
});

// DELETE /api/kks/:id
router.delete('/:id', async (req, res) => {
    const kksId = req.params.id;
    try {
        const deleteQuery = 'DELETE FROM kks WHERE ID_KKS = ?';
        const [result] = await pool.query(deleteQuery, [kksId]);
        if (result.affectedRows === 0) { return res.status(404).json({ error: 'KKS с указанным ID не найден' }); }
        res.status(200).json({ message: 'KKS успешно удален' });
    } catch (err) {
        console.error(`Ошибка при удалении KKS ${kksId}:`, err);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') { return res.status(400).json({ error: 'Невозможно удалить KKS, так как на него ссылаются паспорта программ' }); }
        res.status(500).json({ error: 'Ошибка сервера при удалении KKS' });
    }
});


module.exports = router;