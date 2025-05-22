// routes/status.js
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET /api/user-kks-status - Получение статуса ККС для работника
router.get('/user-kks-status', async (req, res) => {
    const workerId = req.query.userId;
    if (!workerId) { return res.status(400).json({ error: 'Не указан userId (workerId) пользователя' }); }
    console.log(`Запрос статуса ККС для workerId: ${workerId}`);
    try {
        const kksStatusQuery = `
            SELECT 
                k.ID_KKS, 
                k.name_kks AS KKS_FullName, 
                k.SName_KKS AS KKS_ShortName, 
                MAX(doc.DateIssue) AS LastTrainingDate 
            FROM workercharact wc
            JOIN kks k ON wc.ID_KKS = k.ID_KKS
            LEFT JOIN programpassport pp ON k.ID_KKS = pp.ID_KKS 
            LEFT JOIN document doc ON pp.ID_ProgDPO = doc.ID_ProgDPO 
                                AND doc.ID_Worker = wc.ID_Worker
            WHERE wc.ID_Worker = ?
            GROUP BY k.ID_KKS, k.name_kks, k.SName_KKS
            ORDER BY k.name_kks;
        `;
        const [kksStatuses] = await pool.query(kksStatusQuery, [workerId]);
        console.log(`[DEBUG] Результат SQL для workerId ${workerId}:`, JSON.stringify(kksStatuses, null, 2));
        console.log(`Статус ККС: Найдено ${kksStatuses.length} статусов для работника ${workerId}`);
        res.json(kksStatuses);
    } catch (err) {
        console.error(`Статус ККС: Ошибка для workerId ${workerId}:`, err);
        res.status(500).json({ error: 'Ошибка сервера при получении статуса обучения по ККС' });
    }
});

module.exports = router;