// routes/documents.js
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET /api/documents - Получение документов (для пользователя или админа)
router.get('/', async (req, res) => {
    console.log('Backend (/api/documents): Внутри обработчика!');
    try {
        const loggedInWorkerId = req.query.userId; // Может быть не передан (для админа в AdminPanel)
        const loggedInRoleStr = req.query.role;   // Может быть не передан
        const loggedInRole = loggedInRoleStr !== undefined ? parseInt(loggedInRoleStr, 10) : undefined;

        console.log('Backend (/api/documents): Params received:', { loggedInWorkerId, loggedInRoleStr });

        let whereClause = '';
        let params = [];

        // Логика: Если есть role=0 и userId, фильтруем по userId.
        // Если есть role=1 (или нет role/userId - считаем запросом админа из панели), не фильтруем.
        if (loggedInRole === 0 && loggedInWorkerId) {
            whereClause = 'WHERE doc.ID_Worker = ?';
            params.push(loggedInWorkerId);
            console.log(`Backend (/api/documents): Role 0. Фильтр по ID_Worker: ${loggedInWorkerId}`);
        } else if (loggedInRole === 1 || (loggedInWorkerId === undefined && loggedInRole === undefined)) {
             // Для админа (role=1) или если параметры не переданы (запрос из AdminPanel) - показываем всё
            console.log('Backend (/api/documents): Role 1 or no params. Получение всех документов.');
            whereClause = ''; // Нет фильтра
        } else {
            // Если переданы некорректные параметры (например, есть userId но нет role, или role не 0/1)
             console.log('Backend (/api/documents): Ошибка - Некорректная комбинация параметров userId/role');
             // Возвращаем ошибку или пустой массив? Вернем ошибку.
             return res.status(400).json({ error: 'Некорректные параметры запроса для получения документов' });
        }


        // Основной запрос (остается как был)
        const query = `
             SELECT
                 doc.ID_Document, doc.ID_Worker, doc.ID_ProgDPO, doc.regnumber,
                 doc.formseries, doc.formnumber, doc.DateIssue, doc.DataStart,
                 doc.DataEnd, prog.Name_ProgDPO AS ProgramName, prog.ID_Org,
                 org.SName AS OrgSName, org.FName AS OrgFName, w.FName_Worker AS WorkerName,
                 COALESCE(ProgramKKS.KKS_JsonData, '[]') AS KKS_Data
             FROM document AS doc
             LEFT JOIN programdpo AS prog ON doc.ID_ProgDPO = prog.ID_ProgDPO
             LEFT JOIN Organization AS org ON prog.ID_Org = org.ID_Org
             LEFT JOIN worker AS w ON doc.ID_Worker = w.ID_Worker
             LEFT JOIN ( SELECT kks_agg.ID_ProgDPO, JSON_ARRAYAGG(JSON_OBJECT('shortName', kks_agg.SName_KKS, 'fullName', kks_agg.name_kks)) AS KKS_JsonData FROM ( SELECT DISTINCT pp_inner.ID_ProgDPO, k.SName_KKS, k.name_kks FROM programpassport pp_inner JOIN kks k ON pp_inner.ID_KKS = k.ID_KKS ) AS kks_agg GROUP BY kks_agg.ID_ProgDPO ) AS ProgramKKS ON doc.ID_ProgDPO = ProgramKKS.ID_ProgDPO
             ${whereClause} ORDER BY doc.DateIssue DESC
         `;

        console.log('Backend (/api/documents): Параметры SQL:', params);
        const [rows] = await pool.query(query, params);
        console.log(`Backend (/api/documents): Получено строк из БД: ${rows.length}`);

        // Обработка KKS_Data
        const processedRows = rows.map(row => {
            try {
                if (typeof row.KKS_Data === 'string') {
                    return { ...row, KKS_Data: JSON.parse(row.KKS_Data) };
                }
                return row;
            } catch (e) {
                console.error("Backend (/api/documents): Ошибка парсинга KKS_Data JSON для doc ID:", row.ID_Document, e);
                return { ...row, KKS_Data: [] };
            }
        });

        res.json(processedRows || []);

    } catch (err) {
        console.error("Backend (/api/documents): Ошибка в catch блоке:", err);
        res.status(500).json({
            error: 'Ошибка базы данных при получении документов',
        });
    }
});


// POST /api/documents - Создание нового документа
router.post('/', async (req, res) => {
    const { ID_Worker, ID_ProgDPO, regnumber, formseries, formnumber, DateIssue, DataStart, DataEnd } = req.body;
    console.log('POST /api/documents - Received data:', req.body);
    if (ID_Worker === undefined || ID_Worker === null || ID_ProgDPO === undefined || ID_ProgDPO === null) { return res.status(400).json({ error: 'ID_Worker и ID_ProgDPO обязательны' }); }
    const dbRegNumber = regnumber || null;
    const dbFormSeries = formseries || null;
    const dbFormNumber = formnumber || null;
    const dbDateIssue = DateIssue || null;
    const dbDataStart = DataStart || null;
    const dbDataEnd = DataEnd || null;
    try {
        const insertQuery = ` INSERT INTO document (ID_Worker, ID_ProgDPO, regnumber, formseries, formnumber, DateIssue, DataStart, DataEnd) VALUES (?, ?, ?, ?, ?, ?, ?, ?) `;
        const params = [ ID_Worker, ID_ProgDPO, dbRegNumber, dbFormSeries, dbFormNumber, dbDateIssue, dbDataStart, dbDataEnd ];
        const [result] = await pool.query(insertQuery, params);
        const insertId = result.insertId;
        console.log(`Документ добавлен с ID: ${insertId}`);
        res.status(201).json({ message: 'Документ успешно добавлен', insertedId: insertId });
    } catch (err) {
        console.error('Ошибка при добавлении документа:', err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2') { return res.status(400).json({ error: 'Указанный Работник или Программа не существуют' }); }
        res.status(500).json({ error: 'Ошибка сервера при добавлении документа' });
    }
});

// PUT /api/documents/:id - Обновление существующего документа
router.put('/:id', async (req, res) => {
    const documentId = parseInt(req.params.id, 10);
    if (isNaN(documentId)) { return res.status(400).json({ error: 'Некорректный ID документа' }); }
    const { ID_Worker, ID_ProgDPO, regnumber, formseries, formnumber, DateIssue, DataStart, DataEnd } = req.body;
    console.log(`PUT /api/documents/${documentId} - Received data:`, req.body);
    if (ID_Worker === undefined || ID_Worker === null || ID_ProgDPO === undefined || ID_ProgDPO === null) { return res.status(400).json({ error: 'ID_Worker и ID_ProgDPO обязательны' }); }
    const dbRegNumber = regnumber || null;
    const dbFormSeries = formseries || null;
    const dbFormNumber = formnumber || null;
    const dbDateIssue = DateIssue || null;
    const dbDataStart = DataStart || null;
    const dbDataEnd = DataEnd || null;
    try {
        const updateQuery = ` UPDATE document SET ID_Worker = ?, ID_ProgDPO = ?, regnumber = ?, formseries = ?, formnumber = ?, DateIssue = ?, DataStart = ?, DataEnd = ? WHERE ID_Document = ? `;
        const params = [ ID_Worker, ID_ProgDPO, dbRegNumber, dbFormSeries, dbFormNumber, dbDateIssue, dbDataStart, dbDataEnd, documentId ];
        const [result] = await pool.query(updateQuery, params);
        if (result.affectedRows === 0) { return res.status(404).json({ error: 'Документ с указанным ID не найден' }); }
        console.log(`Документ ${documentId} успешно обновлен.`);
        res.json({ message: 'Документ успешно обновлен' });
    } catch (err) {
        console.error(`Ошибка при обновлении документа ${documentId}:`, err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2') { return res.status(400).json({ error: 'Указанный Работник или Программа не существуют' }); }
        res.status(500).json({ error: 'Ошибка сервера при обновлении документа' });
    }
});

// DELETE /api/documents/:id - Удаление документа
router.delete('/:id', async (req, res) => {
    const documentId = parseInt(req.params.id, 10);
    if (isNaN(documentId)) { return res.status(400).json({ error: 'Некорректный ID документа' }); }
    console.log(`DELETE /api/documents/${documentId}`);
    try {
        const deleteQuery = 'DELETE FROM document WHERE ID_Document = ?';
        const [result] = await pool.query(deleteQuery, [documentId]);
        if (result.affectedRows === 0) { return res.status(404).json({ error: 'Документ с указанным ID не найден' }); }
        console.log(`Документ ${documentId} удален.`);
        res.status(200).json({ message: 'Документ успешно удален' });
    } catch (err) {
        console.error(`Ошибка при удалении документа ${documentId}:`, err);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') { return res.status(400).json({ error: 'Невозможно удалить документ, так как на него есть ссылки' }); }
        res.status(500).json({ error: 'Ошибка сервера при удалении документа' });
    }
});

module.exports = router;