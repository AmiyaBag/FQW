// routes/documents.js
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// No need for parseKKSData helper if KKS_Data is not a JSON field on 'document'
// However, the JOIN for ProgramKKS is still useful for fetching KKS associated with the program.

// GET /api/documents - Получение документов (для пользователя или админа)
router.get('/', async (req, res) => {
    console.log('Backend (/api/documents): Внутри обработчика!');
    try {
        const loggedInWorkerId = req.query.userId;
        const loggedInRoleStr = req.query.role;
        const loggedInRole = loggedInRoleStr !== undefined ? parseInt(loggedInRoleStr, 10) : undefined;

        console.log('Backend (/api/documents): Params received:', { loggedInWorkerId, loggedInRoleStr });

        let whereClause = '';
        let params = [];

        if (loggedInRole === 0 && loggedInWorkerId) {
            whereClause = 'WHERE doc.ID_Worker = ?';
            params.push(loggedInWorkerId);
            console.log(`Backend (/api/documents): Role 0. Фильтр по ID_Worker: ${loggedInWorkerId}`);
        } else if (loggedInRole === 1 || (loggedInWorkerId === undefined && loggedInRole === undefined)) {
            console.log('Backend (/api/documents): Role 1 or no params. Получение всех документов.');
            whereClause = '';
        } else {
            console.log('Backend (/api/documents): Ошибка - Некорректная комбинация параметров userId/role');
            return res.status(400).json({ error: 'Некорректные параметры запроса для получения документов' });
        }

        const query = `
            SELECT
                doc.ID_Document, doc.ID_Worker, doc.ID_ProgDPO, doc.regnumber,
                doc.formseries, doc.formnumber, doc.DateIssue, doc.DataStart,
                doc.DataEnd,
                prog.Name_ProgDPO AS ProgramName,
                prog.Type_ProgDPO, -- Keep this, it's from programdpo table
                org.ID_Org, org.SName AS OrgSName, org.FName AS OrgFName,
                w.FName_Worker AS WorkerName,
                -- We are now selecting KKS_Ids, KKS_Names, KKS_ShortNames related to the PROGRAM,
                -- not storing KKS_Data directly on the document.
                GROUP_CONCAT(DISTINCT k.ID_KKS ORDER BY k.ID_KKS SEPARATOR ',') AS KKS_Ids,
                GROUP_CONCAT(DISTINCT k.name_kks ORDER BY k.name_kks SEPARATOR '||') AS KKS_Names,
                GROUP_CONCAT(DISTINCT k.SName_KKS ORDER BY k.SName_KKS SEPARATOR ',') AS KKS_ShortNames
            FROM document AS doc
            LEFT JOIN programdpo AS prog ON doc.ID_ProgDPO = prog.ID_ProgDPO
            LEFT JOIN Organization AS org ON prog.ID_Org = org.ID_Org
            LEFT JOIN worker AS w ON doc.ID_Worker = w.ID_Worker
            -- Join programpassport and kks to get KKS data related to the program
            LEFT JOIN programpassport pp ON prog.ID_ProgDPO = pp.ID_ProgDPO
            LEFT JOIN kks k ON pp.ID_KKS = k.ID_KKS
            ${whereClause}
            GROUP BY
                doc.ID_Document, doc.ID_Worker, doc.ID_ProgDPO, doc.regnumber,
                doc.formseries, doc.formnumber, doc.DateIssue, doc.DataStart,
                doc.DataEnd, prog.Name_ProgDPO, prog.Type_ProgDPO, prog.ID_Org,
                org.SName, org.FName, w.FName_Worker
            ORDER BY doc.DateIssue DESC
        `;

        console.log('Backend (/api/documents): Параметры SQL:', params);
        const [rows] = await pool.query(query, params);
        console.log(`Backend (/api/documents): Получено строк из БД: ${rows.length}`);

        // Format the KKS data into an array of objects
        const formattedRows = rows.map(row => {
            const kksData = [];
            if (row.KKS_Ids && row.KKS_Names && row.KKS_ShortNames) {
                const ids = row.KKS_Ids.split(',').map(Number);
                const names = row.KKS_Names.split('||'); // Use '||' as separator for names as they might contain commas
                const shortNames = row.KKS_ShortNames.split(',');

                for (let i = 0; i < ids.length; i++) {
                    kksData.push({
                        id: ids[i],
                        fullName: names[i] || '',
                        shortName: shortNames[i] || ''
                    });
                }
            }
            return {
                ...row,
                KKS_Data: kksData,
                KKS_Ids: undefined, // Clear raw concatenated fields if desired
                KKS_Names: undefined,
                KKS_ShortNames: undefined
            };
        });

        res.json(formattedRows || []);

    } catch (err) {
        console.error("Backend (/api/documents): Ошибка в catch блоке:", err);
        res.status(500).json({
            error: 'Ошибка базы данных при получении документов',
        });
    }
});

// GET /api/documents/:id - Получение деталей конкретного документа
router.get('/:id', async (req, res) => {
    const documentId = parseInt(req.params.id, 10);
    if (isNaN(documentId)) {
        return res.status(400).json({ error: 'Некорректный ID документа' });
    }
    try {
        const query = `
            SELECT
                d.ID_Document, d.ID_Worker, d.ID_ProgDPO, d.regnumber,
                d.formseries, d.formnumber, d.DateIssue, d.DataStart,
                d.DataEnd,
                p.Name_ProgDPO AS ProgramName,
                p.Type_ProgDPO, -- Keep this
                o.FName AS OrgFName, o.SName AS OrgSName,
                w.FName_Worker AS WorkerName,
                GROUP_CONCAT(DISTINCT k.ID_KKS ORDER BY k.ID_KKS SEPARATOR ',') AS KKS_Ids,
                GROUP_CONCAT(DISTINCT k.name_kks ORDER BY k.name_kks SEPARATOR '||') AS KKS_Names,
                GROUP_CONCAT(DISTINCT k.SName_KKS ORDER BY k.SName_KKS SEPARATOR ',') AS KKS_ShortNames
            FROM document d
            JOIN worker w ON d.ID_Worker = w.ID_Worker
            JOIN programdpo p ON d.ID_ProgDPO = p.ID_ProgDPO
            LEFT JOIN organization o ON p.ID_Org = o.ID_Org
            LEFT JOIN programpassport pp ON p.ID_ProgDPO = pp.ID_ProgDPO
            LEFT JOIN kks k ON pp.ID_KKS = k.ID_KKS
            WHERE d.ID_Document = ?
            GROUP BY
                d.ID_Document, d.ID_Worker, d.ID_ProgDPO, d.regnumber,
                d.formseries, d.formnumber, d.DateIssue, d.DataStart,
                d.DataEnd, p.Name_ProgDPO, p.Type_ProgDPO, o.FName, o.SName,
                w.FName_Worker
        `;
        const [rows] = await pool.query(query, [documentId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Документ не найден' });
        }

        const row = rows[0];
        const kksData = [];
        if (row.KKS_Ids && row.KKS_Names && row.KKS_ShortNames) {
            const ids = row.KKS_Ids.split(',').map(Number);
            const names = row.KKS_Names.split('||');
            const shortNames = row.KKS_ShortNames.split(',');

            for (let i = 0; i < ids.length; i++) {
                kksData.push({
                    id: ids[i],
                    fullName: names[i] || '',
                    shortName: shortNames[i] || ''
                });
            }
        }

        const document = {
            ...row,
            KKS_Data: kksData, // Create KKS_Data array on the fly
            KKS_Ids: undefined, // Clear raw concatenated fields
            KKS_Names: undefined,
            KKS_ShortNames: undefined
        };

        res.json(document);
    } catch (err) {
        console.error(`Ошибка при получении деталей документа ${documentId}:`, err);
        res.status(500).json({ error: 'Ошибка сервера при получении деталей документа' });
    }
});


// POST /api/documents - Создание нового документа
router.post('/', async (req, res) => {
    const { ID_Worker, ID_ProgDPO, regnumber, formseries, formnumber, DateIssue, DataStart, DataEnd } = req.body;
    console.log('POST /api/documents - Received data:', req.body);
    if (ID_Worker === undefined || ID_Worker === null || ID_ProgDPO === undefined || ID_ProgDPO === null) {
        return res.status(400).json({ error: 'ID_Worker и ID_ProgDPO обязательны' });
    }
    // No KKS_Data here, as it's not stored directly on document
    const dbRegNumber = regnumber || null;
    const dbFormSeries = formseries || null;
    const dbFormNumber = formnumber || null;
    const dbDateIssue = DateIssue || null;
    const dbDataStart = DataStart || null;
    const dbDataEnd = DataEnd || null;

    try {
        const insertQuery = `
            INSERT INTO document (ID_Worker, ID_ProgDPO, regnumber, formseries, formnumber, DateIssue, DataStart, DataEnd)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            ID_Worker, ID_ProgDPO, dbRegNumber, dbFormSeries, dbFormNumber,
            dbDateIssue, dbDataStart, dbDataEnd
        ];
        const [result] = await pool.query(insertQuery, params);
        const insertId = result.insertId;
        console.log(`Документ добавлен с ID: ${insertId}`);

        // Fetch the newly created document with full details for response
        const [newDocRows] = await pool.query(`
            SELECT
                d.ID_Document, d.ID_Worker, w.FName_Worker AS WorkerName,
                d.ID_ProgDPO, p.Name_ProgDPO AS ProgramName, p.Type_ProgDPO,
                o.FName AS OrgFName, o.SName AS OrgSName,
                d.regnumber, d.formseries, d.formnumber, d.DateIssue, d.DataStart, d.DataEnd,
                -- Still fetch KKS data for the program to include in response
                GROUP_CONCAT(DISTINCT k.ID_KKS ORDER BY k.ID_KKS SEPARATOR ',') AS KKS_Ids,
                GROUP_CONCAT(DISTINCT k.name_kks ORDER BY k.name_kks SEPARATOR '||') AS KKS_Names,
                GROUP_CONCAT(DISTINCT k.SName_KKS ORDER BY k.SName_KKS SEPARATOR ',') AS KKS_ShortNames
            FROM document d
            JOIN worker w ON d.ID_Worker = w.ID_Worker
            JOIN programdpo p ON d.ID_ProgDPO = p.ID_ProgDPO
            LEFT JOIN organization o ON p.ID_Org = o.ID_Org
            LEFT JOIN programpassport pp ON p.ID_ProgDPO = pp.ID_ProgDPO
            LEFT JOIN kks k ON pp.ID_KKS = k.ID_KKS
            WHERE d.ID_Document = ?
            GROUP BY
                d.ID_Document, d.ID_Worker, w.FName_Worker, d.ID_ProgDPO, p.Name_ProgDPO, p.Type_ProgDPO,
                o.FName, o.SName, d.regnumber, d.formseries, d.formnumber, d.DateIssue, d.DataStart, d.DataEnd
        `, [insertId]);

        if (newDocRows.length === 0) {
            return res.status(500).json({ error: 'Не удалось получить данные о созданном документе.' });
        }

        const newDocumentRow = newDocRows[0];
        const newDocKKSData = [];
        if (newDocumentRow.KKS_Ids && newDocumentRow.KKS_Names && newDocumentRow.KKS_ShortNames) {
            const ids = newDocumentRow.KKS_Ids.split(',').map(Number);
            const names = newDocumentRow.KKS_Names.split('||');
            const shortNames = newDocumentRow.KKS_ShortNames.split(',');
            for (let i = 0; i < ids.length; i++) {
                newDocKKSData.push({
                    id: ids[i],
                    fullName: names[i] || '',
                    shortName: shortNames[i] || ''
                });
            }
        }

        const newDocument = {
            ...newDocumentRow,
            KKS_Data: newDocKKSData,
            KKS_Ids: undefined,
            KKS_Names: undefined,
            KKS_ShortNames: undefined
        };

        res.status(201).json(newDocument);

    } catch (err) {
        console.error('Ошибка при добавлении документа:', err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ error: 'Указанный Работник или Программа не существуют' });
        }
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
        const updateQuery = `
            UPDATE document SET
                ID_Worker = ?, ID_ProgDPO = ?, regnumber = ?, formseries = ?, formnumber = ?,
                DateIssue = ?, DataStart = ?, DataEnd = ?
            WHERE ID_Document = ?
        `;
        const params = [
            ID_Worker, ID_ProgDPO, dbRegNumber, dbFormSeries, dbFormNumber,
            dbDateIssue, dbDataStart, dbDataEnd, documentId
        ];
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

// DELETE /api/documents/:id - Удаление документа (remains unchanged)
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