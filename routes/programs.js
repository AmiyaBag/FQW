// routes/programs.js
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET /api/programs - Получение всех программ с типом и организацией
router.get('/', async (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/programs - Request received.`);
    try {
        const query = `
            SELECT
                p.ID_ProgDPO,
                p.Name_ProgDPO,
                p.Type_ProgDPO,
                o.FName AS OrgName
            FROM programdpo p
            LEFT JOIN organization o ON p.ID_Org = o.ID_Org
            ORDER BY p.Name_ProgDPO;
        `;
        const [programs] = await pool.query(query);
        res.json(programs);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] GET /api/programs - ERROR occurred:`, err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Ошибка сервера при получении списка программ' });
        }
    }
});

// GET /api/programs/details/:programId - Получение деталей программы
router.get('/details/:programId', async (req, res) => {
    try {
        const programId = req.params.programId;
        console.log("ProgramId для деталей:", programId);
        const query = `
            SELECT
                p.ID_ProgDPO,
                p.Name_ProgDPO,
                o.ID_Org,
                o.FName AS OrgFName,
                o.SName AS OrgSName,
                p.Type_ProgDPO, -- Changed from t.Name_Type and removed t.id_type
                GROUP_CONCAT(DISTINCT k.ID_KKS ORDER BY k.ID_KKS SEPARATOR ', ') as KKS_Ids,
                GROUP_CONCAT(DISTINCT k.name_kks ORDER BY k.name_kks SEPARATOR ', ') as KKS_Names,
                GROUP_CONCAT(DISTINCT k.SName_KKS ORDER BY k.SName_KKS SEPARATOR ', ') as KKS_ShortNames
            FROM programdpo p
            JOIN organization o ON p.ID_Org = o.ID_Org
            -- Removed JOIN typedpo t ON p.id_type = t.id_type
            LEFT JOIN programpassport pp ON p.ID_ProgDPO = pp.ID_ProgDPO
            LEFT JOIN kks k ON pp.ID_KKS = k.ID_KKS
            WHERE p.ID_ProgDPO = ?
            GROUP BY p.ID_ProgDPO, p.Name_ProgDPO, o.ID_Org, o.FName, o.SName, p.Type_ProgDPO
        `;
        const [rows] = await pool.query(query, [programId]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Программа не найдена' });
        }
        const program = rows[0];
        const kksStatus = []; // Заглушка
        res.json({ ...program, kksStatus });
    } catch (err) {
        console.error('Ошибка при получении деталей программы:', err);
        res.status(500).json({ error: 'Ошибка сервера при получении деталей программы' });
    }
});

/*
// GET /api/programs/types - Получение типов программ
router.get('/types', async (req, res) => {
    try {
        const [types] = await pool.query('SELECT id_type, Name_Type FROM typedpo ORDER BY Name_Type');
        res.json(types);
    } catch (err) {
        console.error('Ошибка при получении типов программ:', err);
        res.status(500).json({ error: 'Ошибка сервера при получении типов программ' });
    }
});
*/

// GET /api/programs/recommended - Получение рекомендуемых программ
router.get('/recommended', async (req, res) => {
    const kksIdsString = req.query.kksIds;
    if (!kksIdsString) {
        return res.json([]);
    }
    const kksIds = kksIdsString.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0);
    if (kksIds.length === 0) {
        return res.json([]);
    }
    console.log(`Запрос рекомендуемых программ для KKS IDs: [${kksIds.join(', ')}]`);
    try {
        const query = `
            SELECT DISTINCT
                p.ID_ProgDPO,
                p.Name_ProgDPO,
                o.FName AS OrgFName,
                o.SName AS OrgSName,
                p.Type_ProgDPO -- Changed from t.Name_Type
            FROM programdpo p
            JOIN programpassport pp ON p.ID_ProgDPO = pp.ID_ProgDPO
            JOIN organization o ON p.ID_Org = o.ID_Org
            -- Removed JOIN typedpo t ON p.id_type = t.id_type
            WHERE pp.ID_KKS IN (?)
            ORDER BY p.Name_ProgDPO;
        `;
        const [recommendedPrograms] = await pool.query(query, [kksIds]);
        res.json(recommendedPrograms);
    } catch (err) {
        console.error(`Рекомендации: Ошибка при получении программ для KKS IDs [${kksIds.join(', ')}]:`, err);
        res.status(500).json({ error: 'Ошибка сервера при получении рекомендуемых программ ДПО' });
    }
});


// PUT /api/programs/:id - Обновление программы
router.put('/:id', async (req, res) => {
    const programId = req.params.id;
    const { Name_ProgDPO, Type_ProgDPO, ID_Org } = req.body; // Added Type_ProgDPO, ID_Org
    
    // Build update query dynamically
    const updates = [];
    const params = [];

    if (Name_ProgDPO !== undefined) {
        updates.push('Name_ProgDPO = ?');
        params.push(Name_ProgDPO);
    }
    if (Type_ProgDPO !== undefined) {
        updates.push('Type_ProgDPO = ?'); // Use Type_ProgDPO
        params.push(Type_ProgDPO);
    }
    if (ID_Org !== undefined) {
        updates.push('ID_Org = ?');
        params.push(ID_Org);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'Нет полей для обновления программы' });
    }

    params.push(programId); // Add ID for WHERE clause

    try {
        const updateQuery = `UPDATE programdpo SET ${updates.join(', ')} WHERE ID_ProgDPO = ?`;
        const [result] = await pool.query(updateQuery, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Программа с указанным ID не найдена' });
        }
        res.json({ message: 'Программа успешно обновлена' });
    } catch (err) {
        console.error(`Ошибка при обновлении программы ${programId}:`, err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
             return res.status(400).json({ error: 'Указанная Организация не существует' });
        }
        res.status(500).json({ error: 'Ошибка сервера при обновлении программы' });
    }
});

// POST /api/programs - Добавление новой программы
router.post('/', async (req, res) => {
    const { Name_ProgDPO, Type_ProgDPO, ID_Org } = req.body; // Changed id_type to Type_ProgDPO
    if (!Name_ProgDPO || Type_ProgDPO === undefined || ID_Org === undefined) {
        return res.status(400).json({ error: 'Необходимо указать Название, Тип и Организацию для программы' });
    }
    try {
        const insertQuery = 'INSERT INTO programdpo (Name_ProgDPO, Type_ProgDPO, ID_Org) VALUES (?, ?, ?)'; // Changed id_type to Type_ProgDPO
        const [result] = await pool.query(insertQuery, [Name_ProgDPO, Type_ProgDPO, ID_Org]);
        const insertId = result.insertId;
        const [newProgram] = await pool.query(
            `SELECT p.ID_ProgDPO, p.Name_ProgDPO, p.Type_ProgDPO, p.ID_Org FROM programdpo p WHERE p.ID_ProgDPO = ?`, // Changed t.Name_Type and removed p.id_type, removed LEFT JOIN typedpo
            [insertId]
        );
        res.status(201).json(newProgram[0] || { id: insertId });
    } catch (err) {
        console.error('Ошибка при добавлении программы:', err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ error: 'Указанная Организация не существует' });
        }
        res.status(500).json({ error: 'Ошибка сервера при добавлении программы' });
    }
});

// DELETE /api/programs/:id - Удаление программы
router.delete('/:id', async (req, res) => {
    const programId = req.params.id;
    try {
        const deleteQuery = 'DELETE FROM programdpo WHERE ID_ProgDPO = ?';
        const [result] = await pool.query(deleteQuery, [programId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Программа с указанным ID не найдена' });
        }
        res.status(200).json({ message: 'Программа успешно удалена' });
    } catch (err) {
        console.error(`Ошибка при удалении программы ${programId}:`, err);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Невозможно удалить программу, так как на нее ссылаются другие записи' });
        }
        res.status(500).json({ error: 'Ошибка сервера при удалении программы' });
    }
});

module.exports = router;