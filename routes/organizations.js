// routes/organizations.js
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET /api/organizations
router.get('/', async (req, res) => {
    try {
        const query = 'SELECT ID_Org, FName, SName FROM organization ORDER BY FName';
        const [organizations] = await pool.query(query);
        res.json(organizations);
    } catch (err) {
        console.error('Ошибка при получении списка организаций:', err);
        res.status(500).json({ error: 'Ошибка сервера при получении списка организаций' });
    }
});

// PUT /api/organizations/:id
router.put('/:id', async (req, res) => {
    const orgId = req.params.id;
    const { FName, SName } = req.body;
    if (!FName || !SName) { return res.status(400).json({ error: 'Полное и краткое название организации обязательны' }); }
    try {
        const updateQuery = 'UPDATE organization SET FName = ?, SName = ? WHERE ID_Org = ?';
        const [result] = await pool.query(updateQuery, [FName, SName, orgId]);
        if (result.affectedRows === 0) { return res.status(404).json({ error: 'Организация с указанным ID не найдена' }); }
        res.json({ message: 'Организация успешно обновлена' });
    } catch (err) {
        console.error(`Ошибка при обновлении организации ${orgId}:`, err);
        res.status(500).json({ error: 'Ошибка сервера при обновлении организации' });
    }
});

// POST /api/organizations
router.post('/', async (req, res) => {
    const { FName, SName } = req.body;
    if (!FName || !SName) { return res.status(400).json({ error: 'Полное и краткое название организации обязательны' }); }
    try {
        const insertQuery = 'INSERT INTO organization (FName, SName) VALUES (?, ?)';
        const [result] = await pool.query(insertQuery, [FName, SName]);
        const insertId = result.insertId;
        const [newOrg] = await pool.query('SELECT * FROM organization WHERE ID_Org = ?', [insertId]);
        res.status(201).json(newOrg[0] || { id: insertId });
    } catch (err) {
        console.error('Ошибка при добавлении организации:', err);
        res.status(500).json({ error: 'Ошибка сервера при добавлении организации' });
    }
});

// DELETE /api/organizations/:id
router.delete('/:id', async (req, res) => {
    const orgId = req.params.id;
    try {
        const deleteQuery = 'DELETE FROM organization WHERE ID_Org = ?';
        const [result] = await pool.query(deleteQuery, [orgId]);
        if (result.affectedRows === 0) { return res.status(404).json({ error: 'Организация с указанным ID не найдена' }); }
        res.status(200).json({ message: 'Организация успешно удалена' });
    } catch (err) {
        console.error(`Ошибка при удалении организации ${orgId}:`, err);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') { return res.status(400).json({ error: 'Невозможно удалить организацию, так как на нее ссылаются программы' }); }
        res.status(500).json({ error: 'Ошибка сервера при удалении организации' });
    }
});

module.exports = router;