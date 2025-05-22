import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AdminPanel.css';

const apiUrl = process.env.REACT_APP_API_URL; // Вынесем в глобальную область видимости файла

// --- Вспомогательная функция для форматирования даты ---
const formatDate = (dateStr, type = 'date') => {
    if (!dateStr) return ''; // Возвращаем пустую строку для input[type=date] или для отображения
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return ''; // Некорректная дата

        if (type === 'datetime-local') {
             // Формат YYYY-MM-DDTHH:mm (пример) - нужен для input type="datetime-local"
             // Корректируем под часовой пояс, чтобы избежать смещения на день назад/вперед
             const offset = date.getTimezoneOffset();
             const adjustedDate = new Date(date.getTime() - (offset*60*1000));
             return adjustedDate.toISOString().slice(0, 16);
        } else if (type === 'date') {
             // Формат YYYY-MM-DD (нужен для input type="date")
             const year = date.getFullYear();
             const month = (date.getMonth() + 1).toString().padStart(2, '0');
             const day = date.getDate().toString().padStart(2, '0');
             return `${year}-${month}-${day}`;
        } else {
             // Формат DD.MM.YYYY (для отображения в таблице)
             return date.toLocaleDateString('ru-RU');
        }
    } catch (e) {
        console.error("Ошибка форматирования даты:", dateStr, e);
        return ''; // Возвращаем пустую строку при ошибке
    }
};


// --- Компонент AddItemForm (БЕЗ ИЗМЕНЕНИЙ) ---
const AddItemForm = ({ type, onSave, onCancel, programTypes = [], allOrganizations = [] }) => {
    // ... (код AddItemForm остается прежним) ...
    const [newItem, setNewItem] = useState({});
    useEffect(() => { setNewItem({}); }, [type]);
    const handleChange = (field, value) => { setNewItem(prev => ({ ...prev, [field]: value })); };
    const handleSubmit = (e) => { e.preventDefault(); onSave(newItem); setNewItem({}); };
    const handleCancel = (e) => { e.preventDefault(); setNewItem({}); onCancel(); };

    if (type === 'programs') {
        return ( <form onSubmit={handleSubmit} className="add-form"> {/* ... поля для программы ... */}
             <h4>Добавить программу</h4>
                <input type="text" placeholder="Название программы" required value={newItem.Name_ProgDPO || ''} onChange={(e) => handleChange('Name_ProgDPO', e.target.value)} />
                <select required value={newItem.id_type || ''} onChange={(e) => handleChange('id_type', e.target.value)}> <option value="" disabled>Выберите тип</option> {programTypes.map(pt => <option key={pt.id_type} value={pt.id_type}>{pt.Name_Type}</option>)} </select>
                <select required value={newItem.ID_Org || ''} onChange={(e) => handleChange('ID_Org', e.target.value)}> <option value="" disabled>Выберите организацию</option> {allOrganizations.map(org => <option key={org.ID_Org} value={org.ID_Org}>{org.FName}</option>)} </select>
                <div className="form-actions"> <button type="submit">Сохранить</button> <button type="button" onClick={handleCancel}>Отмена</button> </div> </form> );
    }
    if (type === 'organizations') {
       return ( <form onSubmit={handleSubmit} className="add-form"> {/* ... поля для организации ... */}
        <h4>Добавить организацию</h4>
           <input type="text" placeholder="Полное название" required value={newItem.FName || ''} onChange={(e) => handleChange('FName', e.target.value)} />
           <input type="text" placeholder="Краткое название" required value={newItem.SName || ''} onChange={(e) => handleChange('SName', e.target.value)} />
           <div className="form-actions"> <button type="submit">Сохранить</button> <button type="button" onClick={handleCancel}>Отмена</button> </div> </form> );
    }
     if (type === 'kks') {
        return ( <form onSubmit={handleSubmit} className="add-form"> {/* ... поля для KKS ... */}
        <h4>Добавить KKS</h4>
           <input type="text" placeholder="Название KKS" required value={newItem.Name_KKS || ''} onChange={(e) => handleChange('Name_KKS', e.target.value)} />
           <input type="text" placeholder="Краткое обозначение" value={newItem.SName_KKS || ''} onChange={(e) => handleChange('SName_KKS', e.target.value)} />
           <div className="form-actions"> <button type="submit">Сохранить</button> <button type="button" onClick={handleCancel}>Отмена</button> </div> </form> );
    }
    return null;
};

// --- Компонент WorkerForm (БЕЗ ИЗМЕНЕНИЙ) ---
const WorkerForm = ({ initialData = {}, onSave, onCancel, isEditing = false }) => {
    const [workerData, setWorkerData] = useState(initialData);
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        setWorkerData({
            ...initialData,
            Role: initialData.Role !== undefined ? initialData.Role : '',
            JobTitle: initialData.JobTitle || '',
            PlaceWork: initialData.PlaceWork || '',
            Degree: initialData.Degree || '',
            Rank: initialData.Rank || '',
        });
        setNewPassword('');
    }, [initialData]);

    const handleChange = (field, value) => {
        setWorkerData(prev => ({ ...prev, [field]: value }));
    };

    const handlePasswordChange = (e) => {
        setNewPassword(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSend = { ...workerData };
        if (newPassword) {
            dataToSend.Password = newPassword;
        } else if (!isEditing) {
            alert('Пароль обязателен при создании пользователя.');
            return;
        }
        onSave(dataToSend);
    };

    const handleCancelClick = (e) => {
        e.preventDefault();
        onCancel();
    };

    return (
        <form onSubmit={handleSubmit} className="add-form user-form">
            <h4>{isEditing ? `Редактировать работника (ID: ${workerData.ID_Worker})` : 'Добавить работника'}</h4>
            <input type="text" placeholder="ФИО Работника" required value={workerData.FName_Worker || ''} onChange={(e) => handleChange('FName_Worker', e.target.value)} />
            <input type="text" placeholder="Должность" required value={workerData.JobTitle || ''} onChange={(e) => handleChange('JobTitle', e.target.value)} />
            <input type="text" placeholder="Место работы" required value={workerData.PlaceWork || ''} onChange={(e) => handleChange('PlaceWork', e.target.value)} />
            <input type="text" placeholder="Ученая степень" value={workerData.Degree || ''} onChange={(e) => handleChange('Degree', e.target.value)} />
            <input type="text" placeholder="Звание" value={workerData.Rank || ''} onChange={(e) => handleChange('Rank', e.target.value)} />
            <input type="text" placeholder="Логин" required value={workerData.Login || ''} onChange={(e) => handleChange('Login', e.target.value)} />
            <input type="password" placeholder={isEditing ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль'} value={newPassword} onChange={handlePasswordChange} required={!isEditing}/>
            <select required value={workerData.Role} onChange={(e) => handleChange('Role', parseInt(e.target.value, 10))}>
                <option value="" disabled>Выберите роль</option>
                <option value={0}>Работник ОУ</option>
                <option value={1}>Работник ЦДО (Админ)</option>
            </select>
            <div className="form-actions">
                <button type="submit">Сохранить</button>
                <button type="button" onClick={handleCancelClick}>Отмена</button>
            </div>
        </form>
    );
};

// --- НОВЫЙ Компонент формы для Документов ---
const DocumentForm = ({ initialData = {}, onSave, onCancel, isEditing = false, allWorkers = [], allPrograms = [] }) => {
    const [docData, setDocData] = useState({});

    useEffect(() => {
        // Инициализация формы данными для редактирования или пустыми значениями
        // Преобразуем даты в формат YYYY-MM-DD для input type="date"
        setDocData({
            ID_Worker: initialData.ID_Worker || '',
            ID_ProgDPO: initialData.ID_ProgDPO || '',
            regnumber: initialData.regnumber || '',
            formseries: initialData.formseries || '',
            formnumber: initialData.formnumber || '',
            DateIssue: formatDate(initialData.DateIssue, 'date'), // Преобразование
            DataStart: formatDate(initialData.DataStart, 'date'), // Преобразование
            DataEnd: formatDate(initialData.DataEnd, 'date')      // Преобразование
        });
    }, [initialData]);

    const handleChange = (field, value) => {
        setDocData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Перед отправкой можно добавить валидацию, если нужно
        const dataToSend = { ...docData };
         // Если ID есть (при редактировании), добавляем его
        if (isEditing && initialData.ID_Document) {
            dataToSend.ID_Document = initialData.ID_Document;
        }
        onSave(dataToSend); // Вызываем колбэк сохранения
    };

    const handleCancelClick = (e) => {
        e.preventDefault();
        onCancel(); // Вызываем колбэк отмены
    };

    return (
        <form onSubmit={handleSubmit} className="add-form document-form">
            <h4>{isEditing ? `Редактировать документ (ID: ${initialData.ID_Document})` : 'Добавить документ'}</h4>

            {/* Выбор работника */}
            <label htmlFor="doc-worker">Работник:</label>
            <select id="doc-worker" required value={docData.ID_Worker} onChange={(e) => handleChange('ID_Worker', e.target.value ? parseInt(e.target.value, 10) : '')}>
                <option value="" disabled>-- Выберите работника --</option>
                {allWorkers.map(w => <option key={w.ID_Worker} value={w.ID_Worker}>{w.FName_Worker} (ID: {w.ID_Worker})</option>)}
            </select>

             {/* Выбор программы */}
             <label htmlFor="doc-program">Программа ДПО:</label>
             <select id="doc-program" required value={docData.ID_ProgDPO} onChange={(e) => handleChange('ID_ProgDPO', e.target.value ? parseInt(e.target.value, 10) : '')}>
                 <option value="" disabled>-- Выберите программу --</option>
                 {allPrograms.map(p => <option key={p.ID_ProgDPO} value={p.ID_ProgDPO}>{p.Name_ProgDPO}</option>)}
             </select>

            {/* Поля документа */}
            <label htmlFor="doc-regnumber">Регистрационный номер:</label>
            <input id="doc-regnumber" type="text" placeholder="Рег. номер" value={docData.regnumber} onChange={(e) => handleChange('regnumber', e.target.value)} />

            <label htmlFor="doc-formseries">Серия формы:</label>
            <input id="doc-formseries" type="text" placeholder="Серия" value={docData.formseries} onChange={(e) => handleChange('formseries', e.target.value)} />

            <label htmlFor="doc-formnumber">Номер формы:</label>
            <input id="doc-formnumber" type="text" placeholder="Номер" value={docData.formnumber} onChange={(e) => handleChange('formnumber', e.target.value)} />

             {/* Даты */}
             <label htmlFor="doc-dateissue">Дата выдачи:</label>
             <input id="doc-dateissue" type="date" value={docData.DateIssue} onChange={(e) => handleChange('DateIssue', e.target.value)} />

             <label htmlFor="doc-datastart">Дата начала:</label>
             <input id="doc-datastart" type="date" value={docData.DataStart} onChange={(e) => handleChange('DataStart', e.target.value)} />

             <label htmlFor="doc-dataend">Дата окончания:</label>
             <input id="doc-dataend" type="date" value={docData.DataEnd} onChange={(e) => handleChange('DataEnd', e.target.value)} />

            <div className="form-actions">
                <button type="submit">Сохранить</button>
                <button type="button" onClick={handleCancelClick}>Отмена</button>
            </div>
        </form>
    );
};


// --- Основной компонент AdminPanel ---
function AdminPanel() {
    // Состояния
    const [activeTab, setActiveTab] = useState('programs'); // 'programs', 'organizations', 'kks', 'workers', 'documents'
    const [programs, setPrograms] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [kks, setKks] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [documents, setDocuments] = useState([]); // <<< НОВОЕ СОСТОЯНИЕ ДЛЯ ДОКУМЕНТОВ
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [addingItemType, setAddingItemType] = useState(null);
    const [programTypes, setProgramTypes] = useState([]);
    const [programTypesData, setProgramTypesData] = useState([]);
    const [allOrganizations, setAllOrganizations] = useState([]);
    const [allWorkers, setAllWorkers] = useState([]); // <<< НУЖНО ДЛЯ ФОРМЫ ДОКУМЕНТОВ
    const [allPrograms, setAllPrograms] = useState([]); // <<< НУЖНО ДЛЯ ФОРМЫ ДОКУМЕНТОВ
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    const navigate = useNavigate();
    // apiUrl определен глобально выше

    // Получение пользователя (без изменений)
    const user = useMemo(() => { /* ... */
         const storedUser = localStorage.getItem('user');
         try {
             return storedUser ? JSON.parse(storedUser) : null;
         } catch (e) {
             console.error("Failed to parse user from localStorage", e);
             localStorage.removeItem('user');
             return null;
         }
     }, []);

    // --- Сортировка ---
    const requestSort = (key) => { /* ... */
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
     };
    const getIdKeyForTab = (tab) => {
        switch (tab) {
            case 'programs': return 'ID_ProgDPO';
            case 'organizations': return 'ID_Org';
            case 'kks': return 'ID_KKS';
            case 'workers': return 'ID_Worker';
            case 'documents': return 'ID_Document';
            default: return null;
        }
    };
    useEffect(() => { /* ... сброс сортировки и форм ... */
        const idKey = getIdKeyForTab(activeTab);
        if (idKey) {
            setSortConfig({ key: idKey, direction: 'ascending' });
        } else {
            setSortConfig({ key: null, direction: 'ascending' });
        }
        setEditingItem(null);
        setAddingItemType(null);
    }, [activeTab]);

    // --- Загрузка данных ---
    const fetchData = useCallback(async () => {
        if (!user || user.role !== 1) {
            console.warn("fetchData called without admin user, aborting.");
            setLoading(false);
            setError("Доступ запрещен. Требуются права администратора.");
            return;
        }
        setLoading(true);
        setError('');
        console.log(`Fetching data for active tab: ${activeTab}`);

        try {
            let response;
            let endpoint;
            let config = {};
            switch (activeTab) {
                case 'programs': endpoint = `${apiUrl}/api/programs`; break;
                case 'organizations': endpoint = `${apiUrl}/api/organizations`; break;
                case 'kks': endpoint = `${apiUrl}/api/kks`; break;
                case 'workers': endpoint = `${apiUrl}/api/workers/admin`; break;
                case 'documents':
                    endpoint = `${apiUrl}/api/documents`;
                    if (user?.workerId && user?.role !== undefined) {
                        config.params = { userId: user.workerId, role: user.role };
                    }
                    break;
                default:
                    console.warn(`Unknown activeTab: ${activeTab}`);
                    setLoading(false);
                    return;
            }
            console.log(`Attempting to fetch ${endpoint}...`, config);
            response = await axios.get(endpoint, config);
            console.log(`Received response from ${endpoint}`, response.status);
            const responseData = Array.isArray(response.data) ? response.data : [];
            if (!Array.isArray(response.data)) {
                console.warn(`API endpoint ${endpoint} did not return an array.`);
            }
            switch (activeTab) {
                case 'programs': setPrograms(responseData); break;
                case 'organizations': setOrganizations(responseData); break;
                case 'kks': setKks(responseData); break;
                case 'workers': setWorkers(responseData); break;
                case 'documents': setDocuments(responseData); break;
            }
        } catch (err) {
            console.error(`Error fetching ${activeTab}:`, err.response || err.message || err);
            const mainErrorMsg = `Ошибка загрузки данных для вкладки "${activeTab}".`;
            setError(prev => prev ? `${prev}\n${mainErrorMsg}` : mainErrorMsg);
            switch (activeTab) {
                case 'programs': setPrograms([]); break;
                case 'organizations': setOrganizations([]); break;
                case 'kks': setKks([]); break;
                case 'workers': setWorkers([]); break;
                case 'documents': setDocuments([]); break;
            }
        } finally {
            console.log(`Setting loading to false for ${activeTab}.`);
            setLoading(false);
        }
    }, [activeTab, user, apiUrl]); // Убрали зависимости, которые обновляются внутри

    useEffect(() => {
        if (!user || user.role !== 1) {
            navigate('/login');
            return;
        }
        fetchData();
    }, [user, navigate, fetchData]);

    useEffect(() => {
        const loadAuxiliaryData = async () => {
            try {
                console.log("Fetching auxiliary data (types, orgs, workers, programs)...");
                const endpoints = [
                    `${apiUrl}/api/program-types`,
                    `${apiUrl}/api/programs/types`,
                    `${apiUrl}/api/organizations`,
                    `${apiUrl}/api/workers/admin`,
                    `${apiUrl}/api/programs`,
                ];
                const [typesRes, typesForFormRes, orgsRes, workersRes, progsRes] = await Promise.all(
                    endpoints.map(url => axios.get(url))
                );
                setProgramTypes(typesForFormRes.data || []); // Для dropdown в формах
                setProgramTypesData(typesRes.data || []);
                setAllOrganizations(orgsRes.data || []);
                setAllWorkers(workersRes.data || []);
                setAllPrograms(progsRes.data || []);
                console.log("Auxiliary data fetched on mount.");
            } catch (err) {
                console.error('Error fetching auxiliary data:', err);
                const auxErrorMsg = 'Ошибка загрузки вспомогательных данных.';
                setError(prev => prev ? `${prev}\n${auxErrorMsg}` : auxErrorMsg);
            }
        };

        if (user?.role === 1 && (programTypes.length === 0 || allOrganizations.length === 0 || allWorkers.length === 0 || allPrograms.length === 0)) {
            loadAuxiliaryData();
        }
    }, [user?.role, apiUrl, programTypes.length, allOrganizations.length, allWorkers.length, allPrograms.length]);

    // --- Мемоизированные отсортированные списки ---
    const sortedPrograms = useMemo(() => { 
        let sortableItems = [...programs]; if (sortConfig.key) { sortableItems.sort((a, b) => { if (a[sortConfig.key] < b[sortConfig.key]) { return sortConfig.direction === 'ascending' ? -1 : 1; } if (a[sortConfig.key] > b[sortConfig.key]) { return sortConfig.direction === 'ascending' ? 1 : -1; } return 0; }); } return sortableItems;
     }, [programs, sortConfig]);
    const sortedOrganizations = useMemo(() => { 
        let sortableItems = [...organizations]; if (sortConfig.key) { sortableItems.sort((a, b) => { const valA = a[sortConfig.key]; const valB = b[sortConfig.key]; const compareResult = typeof valA === 'number' && typeof valB === 'number' ? valA - valB : String(valA).localeCompare(String(valB)); return sortConfig.direction === 'ascending' ? compareResult : -compareResult; }); } return sortableItems;
     }, [organizations, sortConfig]);
    const sortedKks = useMemo(() => { 
        let sortableItems = [...kks]; if (sortConfig.key) { sortableItems.sort((a, b) => { const valA = a[sortConfig.key]; const valB = b[sortConfig.key]; const compareResult = typeof valA === 'number' && typeof valB === 'number' ? valA - valB : String(valA).localeCompare(String(valB)); return sortConfig.direction === 'ascending' ? compareResult : -compareResult; }); } return sortableItems;
     }, [kks, sortConfig]);
    const sortedWorkers = useMemo(() => { 
        let sortableItems = [...workers]; if (sortConfig.key) { sortableItems.sort((a, b) => { const valA = a[sortConfig.key]; const valB = b[sortConfig.key]; if (sortConfig.key === 'Role' && typeof valA === 'number' && typeof valB === 'number') { return sortConfig.direction === 'ascending' ? valA - valB : valB - valA; } if (sortConfig.key === 'FName_Worker') { const nameA = String(valA ?? '').toLowerCase(); const nameB = String(valB ?? '').toLowerCase(); if (nameA < nameB) return sortConfig.direction === 'ascending' ? -1 : 1; if (nameA > nameB) return sortConfig.direction === 'ascending' ? 1 : -1; return 0; } const compareResult = typeof valA === 'number' && typeof valB === 'number' ? valA - valB : String(valA ?? '').localeCompare(String(valB ?? '')); return sortConfig.direction === 'ascending' ? compareResult : -compareResult; }); } return sortableItems;
    }, [workers, sortConfig]);
    const sortedDocuments = useMemo(() => {
        let sortableItems = [...documents];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];

                // Сортировка по дате
                 if (['DateIssue', 'DataStart', 'DataEnd'].includes(sortConfig.key)) {
                    const dateA = valA ? new Date(valA).getTime() : 0;
                    const dateB = valB ? new Date(valB).getTime() : 0;
                     if (isNaN(dateA) && isNaN(dateB)) return 0;
                     if (isNaN(dateA)) return sortConfig.direction === 'ascending' ? -1 : 1; // nulls/invalid first or last
                     if (isNaN(dateB)) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
                }

                 // Сортировка по имени работника или программы
                if (['WorkerName', 'ProgramName'].includes(sortConfig.key)) {
                     const strA = String(valA ?? '').toLowerCase();
                     const strB = String(valB ?? '').toLowerCase();
                     if (strA < strB) return sortConfig.direction === 'ascending' ? -1 : 1;
                     if (strA > strB) return sortConfig.direction === 'ascending' ? 1 : -1;
                     return 0;
                }

                // Общая сортировка
                const compareResult = typeof valA === 'number' && typeof valB === 'number'
                    ? valA - valB
                    : String(valA ?? '').localeCompare(String(valB ?? ''));

                return sortConfig.direction === 'ascending' ? compareResult : -compareResult;
            });
        }
        return sortableItems;
    }, [documents, sortConfig]);

    // --- Обработчики CRUD ---
    const handleEdit = (item) => { setEditingItem(item); setAddingItemType(null); };
    const handleCancel = () => { setEditingItem(null); };
    const handleChangeInline = (field, value) => { setEditingItem(prev => ({ ...prev, [field]: value })); };
    const handleSave = async (editedData) => {
        const itemToSave = editedData || editingItem;
        if (!itemToSave) return;
        const idKey = getIdKeyForTab(activeTab);
        const id = itemToSave[idKey];
        if (id === undefined && activeTab !== 'documents') { // Для документов ID может не быть в itemToSave из формы
             if (activeTab === 'documents' && editingItem?.ID_Document) {
                 // Берем ID из исходного editingItem для документов
                 id = editingItem.ID_Document;
                 itemToSave.ID_Document = id; // Добавляем ID обратно для PUT запроса, если нужно
             } else {
                console.error("Cannot save item without ID", itemToSave);
                setError("Не удалось определить ID для сохранения.");
                return;
             }
        }
        console.log(`Saving edited item (ID: ${id}, Tab: ${activeTab}):`, itemToSave);
        setLoading(true);
        setError('');
        try {
            let endpoint;
            switch (activeTab) {
                case 'programs': endpoint = `${apiUrl}/api/programs/${id}`; break;
                case 'organizations': endpoint = `${apiUrl}/api/organizations/${id}`; break;
                case 'kks': endpoint = `${apiUrl}/api/kks/${id}`; break;
                case 'workers': endpoint = `${apiUrl}/api/workers/${id}`; break;
                case 'documents': endpoint = `${apiUrl}/api/documents/${id}`; break; // <<< ДОБАВЛЕНО (нужен PUT /api/documents/:id)
                default: throw new Error("Неизвестная вкладка для сохранения");
            }
            await axios.put(endpoint, itemToSave);
            setEditingItem(null);
            await fetchData();
            console.log(`Item (ID: ${id}) saved successfully.`);
        } catch (err) {
            console.error('Ошибка при сохранении изменений:', err.response?.data || err.message || err);
            setError(err.response?.data?.error || 'Ошибка при сохранении данных');
        } finally {
            setLoading(false);
        }
    };
    const handleShowAddForm = () => { setAddingItemType(activeTab); setEditingItem(null); };
    const handleCancelAdd = () => { setAddingItemType(null); };
    const handleAddItem = async (newItemData) => { // Добавление (POST)
        const type = addingItemType;
        if (!type) return;
        console.log(`Adding new ${type}:`, newItemData);
        setLoading(true);
        setError('');
        try {
            let endpoint;
            switch (type) {
                case 'programs': endpoint = `${apiUrl}/api/programs`; break;
                case 'organizations': endpoint = `${apiUrl}/api/organizations`; break;
                case 'kks': endpoint = `${apiUrl}/api/kks`; break;
                case 'workers': endpoint = `${apiUrl}/api/workers`; break;
                case 'documents': endpoint = `${apiUrl}/api/documents`; break;
                default: throw new Error("Неизвестный тип для добавления");
            }
            await axios.post(endpoint, newItemData);
            setAddingItemType(null);
            await fetchData();
            console.log(`Item of type ${type} added successfully.`);
        } catch (err) {
            console.error(`Ошибка при добавлении ${type}:`, err.response?.data || err.message || err);
            setError(err.response?.data?.error || `Ошибка при добавлении элемента`);
        } finally {
            setLoading(false);
        }
    };
    const handleDelete = async (idToDelete) => { // Удаление (DELETE)
        if (!window.confirm('Вы уверены, что хотите удалить этот элемент?')) { return; }
        const idKey = getIdKeyForTab(activeTab);
        console.log(`Deleting item with ID: ${idToDelete} (Key: ${idKey}) on tab: ${activeTab}`);
        setLoading(true);
        setError('');
        try {
            let endpoint;
            switch (activeTab) {
                case 'programs': endpoint = `${apiUrl}/api/programs/${idToDelete}`; break;
                case 'organizations': endpoint = `${apiUrl}/api/organizations/${idToDelete}`; break;
                case 'kks': endpoint = `${apiUrl}/api/kks/${idToDelete}`; break;
                case 'workers': endpoint = `${apiUrl}/api/workers/${idToDelete}`; break;
                case 'documents': endpoint = `${apiUrl}/api/documents/${idToDelete}`; break; // <<< ДОБАВЛЕНО (нужен DELETE /api/documents/:id)
                default: throw new Error("Неизвестная вкладка для удаления");
            }
            await axios.delete(endpoint);
            if (editingItem && editingItem[idKey] === idToDelete) { setEditingItem(null); }
            await fetchData();
            console.log(`Item (ID: ${idToDelete}) deleted successfully.`);
        } catch (err) {
            console.error(`Ошибка при удалении элемента (ID: ${idToDelete}):`, err.response?.data || err.message || err);
            setError(err.response?.data?.error || 'Ошибка при удалении элемента. Возможно, на него есть ссылки.');
        } finally {
            setLoading(false);
        }
    };

    // --- Вспомогательные функции рендеринга ---
    const displayRole = (roleValue) => { /* ... */ return roleValue === 1 ? 'Работник ЦДО' : roleValue === 0 ? 'Работник ОУ' : 'Неизвестно'; };
    const renderSortableHeader = (label, key) => ( /* ... */ <th onClick={() => requestSort(key)} className="sortable-header"> {label} {sortConfig.key === key ? (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼') : ' ↕'} </th> );

    // --- Основной рендеринг компонента ---
    if (!user && loading) return <div className="loading">Проверка авторизации и загрузка данных...</div>;
    if (!user) return <div className="error">Не удалось получить данные пользователя. <button onClick={() => navigate('/login')}>Войти</button></div>;
    if (user.role !== 1) return <div className="error">Доступ запрещен.</div>;
    const showLoadingIndicator = loading && !error;

    return (
        <div className="admin-panel">
            {/* Шапка */}
            <div className="admin-header">
                <h1>Панель администратора</h1>
                <div className="header-buttons">
                   <button onClick={() => navigate('/admin')} className="back-button">Назад</button>
                   <button onClick={() => { localStorage.removeItem('user'); navigate('/login'); }} className="logout-button">Выйти</button>
                </div>
            </div>

            {/* Вкладки */}
            <div className="admin-tabs">
                <button className={`tab-button ${activeTab === 'programs' ? 'active' : ''}`} onClick={() => setActiveTab('programs')}>Программы</button>
                <button className={`tab-button ${activeTab === 'organizations' ? 'active' : ''}`} onClick={() => setActiveTab('organizations')}>Организации</button>
                <button className={`tab-button ${activeTab === 'kks' ? 'active' : ''}`} onClick={() => setActiveTab('kks')}>ККС</button>
                <button className={`tab-button ${activeTab === 'workers' ? 'active' : ''}`} onClick={() => setActiveTab('workers')}>Работники</button>
                {/* <<< ДОБАВЛЕНА ВКЛАДКА >>> */}
                <button className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>Документы</button>
            </div>

            {/* Индикатор загрузки и ошибки */}
            {showLoadingIndicator && <div className="loading-inline">Обновление данных...</div>}
            {error && <div className="error-inline">{error} <button onClick={() => setError('')} title="Закрыть ошибку">×</button></div>}

            {/* Основной контент */}
            <div className="admin-content">

                 {/* Формы добавления/редактирования */}
                 {(addingItemType === 'workers' || (editingItem && activeTab === 'workers')) && ( <WorkerForm key={editingItem ? editingItem.ID_Worker : 'add-worker'} initialData={editingItem || {}} onSave={editingItem ? handleSave : handleAddItem} onCancel={editingItem ? handleCancel : handleCancelAdd} isEditing={!!editingItem} /> )}
                 {addingItemType && addingItemType !== 'workers' && addingItemType !== 'documents' && ( <AddItemForm key={`add-${addingItemType}`} type={addingItemType} onSave={handleAddItem} onCancel={handleCancelAdd} programTypes={programTypes} allOrganizations={allOrganizations} /> )}
                 {/* <<< УСЛОВИЕ ДЛЯ ФОРМЫ ДОКУМЕНТОВ >>> */}
                 {(addingItemType === 'documents' || (editingItem && activeTab === 'documents')) && (
                     <DocumentForm
                         key={editingItem ? editingItem.ID_Document : 'add-document'}
                         initialData={editingItem || {}}
                         onSave={editingItem ? handleSave : handleAddItem}
                         onCancel={editingItem ? handleCancel : handleCancelAdd}
                         isEditing={!!editingItem}
                         allWorkers={workers} // Передаем список работников (не allWorkers, а текущий загруженный)
                         allPrograms={allPrograms} // Передаем список программ
                     />
                 )}


                {/* Кнопка "Добавить" */}
                {!editingItem && !addingItemType && (
                    <button onClick={handleShowAddForm} className="add-button">
                        Добавить {
                            activeTab === 'programs' ? 'программу' :
                            activeTab === 'organizations' ? 'организацию' :
                            activeTab === 'kks' ? 'KKS' :
                            activeTab === 'workers' ? 'работника' :
                            activeTab === 'documents' ? 'документ' : '' // <<< ДОБАВЛЕНО
                        }
                    </button>
                )}

                {/* Таблица Программ */}
                {activeTab === 'programs' && ( <table className="admin-table"> {/* ... код таблицы ... */} <thead><tr> {renderSortableHeader('№', 'ID_ProgDPO')} {renderSortableHeader('Название', 'Name_ProgDPO')} {renderSortableHeader('Тип', 'Name_Type')} <th>Действия</th> </tr></thead> <tbody> {sortedPrograms.map((program, index) => ( <tr key={program.ID_ProgDPO}> {editingItem?.ID_ProgDPO === program.ID_ProgDPO ? (<> <td>{index + 1}</td> <td> <input type="text" value={editingItem.Name_ProgDPO} onChange={(e) => handleChangeInline('Name_ProgDPO', e.target.value)} /> </td> <td> {program.Name_Type || 'N/A'} </td> <td> <button onClick={() => handleSave()}>Сохранить</button> <button onClick={handleCancel}>Отмена</button> </td> </>) : (<> <td>{index + 1}</td> <td>{program.Name_ProgDPO}</td> <td>{program.Name_Type || 'N/A'}</td> <td className="actions-cell"> <button onClick={() => handleEdit(program)} disabled={!!addingItemType || !!editingItem}>Редакт.</button> <button onClick={() => handleDelete(program.ID_ProgDPO)} className="delete-button" disabled={!!addingItemType || !!editingItem}>Удалить</button> </td> </> )} </tr> ))} </tbody> </table> )}
                 {/* Таблица Организаций */}
                 {activeTab === 'organizations' && ( <table className="admin-table"> {/* ... код таблицы ... */} <thead><tr> {renderSortableHeader('№', 'ID_Org')} {renderSortableHeader('Полное название', 'FName')} {renderSortableHeader('Краткое название', 'SName')} <th>Действия</th> </tr></thead> <tbody> {sortedOrganizations.map((org, index) => ( <tr key={org.ID_Org}> {editingItem?.ID_Org === org.ID_Org ? (<> <td>{index + 1}</td> <td><input type="text" value={editingItem.FName} onChange={(e) => handleChangeInline('FName', e.target.value)} /></td> <td><input type="text" value={editingItem.SName} onChange={(e) => handleChangeInline('SName', e.target.value)} /></td> <td> <button onClick={handleSave}>Сохранить</button> <button onClick={handleCancel}>Отмена</button> </td> </>) : (<> <td>{index + 1}</td> <td>{org.FName}</td> <td>{org.SName}</td> <td className="actions-cell"> <button onClick={() => handleEdit(org)} disabled={!!addingItemType || !!editingItem}>Редакт.</button> <button onClick={() => handleDelete(org.ID_Org)} className="delete-button" disabled={!!addingItemType || !!editingItem}>Удалить</button> </td> </> )} </tr> ))} </tbody> </table> )}
                 {/* Таблица KKS */}
                 {activeTab === 'kks' && ( <table className="admin-table"> {/* ... код таблицы ... */} <thead><tr> {renderSortableHeader('№', 'ID_KKS')} {renderSortableHeader('Название', 'Name_KKS')} {renderSortableHeader('Краткое обозначение', 'SName_KKS')} <th>Действия</th> </tr></thead> <tbody> {sortedKks.map((kksItem, index) => ( <tr key={kksItem.ID_KKS}> {editingItem?.ID_KKS === kksItem.ID_KKS ? (<> <td>{index + 1}</td> <td><input type="text" value={editingItem.Name_KKS} onChange={(e) => handleChangeInline('Name_KKS', e.target.value)} /></td> <td><input type="text" value={editingItem.SName_KKS} onChange={(e) => handleChangeInline('SName_KKS', e.target.value)} /></td> <td> <button onClick={handleSave}>Сохранить</button> <button onClick={handleCancel}>Отмена</button> </td> </>) : (<> <td>{index + 1}</td> <td>{kksItem.Name_KKS}</td> <td>{kksItem.SName_KKS}</td> <td className="actions-cell"> <button onClick={() => handleEdit(kksItem)} disabled={!!addingItemType || !!editingItem}>Редакт.</button> <button onClick={() => handleDelete(kksItem.ID_KKS)} className="delete-button" disabled={!!addingItemType || !!editingItem}>Удалить</button> </td> </> )} </tr> ))} </tbody> </table> )}
                 {/* Таблица Работников */}
                 {activeTab === 'workers' && (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                {renderSortableHeader('№', 'ID_Worker')}
                                {renderSortableHeader('Логин', 'Login')}
                                {renderSortableHeader('ФИО Работника', 'FName_Worker')}
                                {renderSortableHeader('Должность', 'JobTitle')}
                                {renderSortableHeader('Место работы', 'PlaceWork')}
                                {renderSortableHeader('Степень', 'Degree')}
                                {renderSortableHeader('Звание', 'Rank')}
                                {renderSortableHeader('Роль', 'Role')}
                                {/*<th>Связанные KKS</th> {/* Новая колонка */}
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedWorkers.map((w, index) => (
                                <tr key={w.ID_Worker}>
                                    <td>{index + 1}</td>
                                    <td>{w.Login}</td>
                                    <td>{w.FName_Worker}</td>
                                    <td>{w.JobTitle}</td>
                                    <td>{w.PlaceWork}</td>
                                    <td>{w.Degree || 'N/A'}</td>
                                    <td>{w.Rank || 'N/A'}</td>
                                    <td>{displayRole(w.Role)}</td>
                                    {/*<td>{w.related_kks || 'Нет'}</td> {/* Отображение связанных KKS */}
                                    <td className="actions-cell">
                                        <button onClick={() => handleEdit(w)} disabled={!!addingItemType || !!editingItem}>Редакт.</button>
                                        <button onClick={() => handleDelete(w.ID_Worker)} className="delete-button" disabled={!!addingItemType || !!editingItem}>Удалить</button>
                                        {/* Кнопка для редактирования KKS (реализуем позже) */}
                                        {/* <button onClick={() => handleEditWorkerKKS(w.ID_Worker)}>Изменить KKS</button> */}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {/* <<< НОВАЯ ТАБЛИЦА ДЛЯ ДОКУМЕНТОВ >>> */}
                {activeTab === 'documents' && (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                {renderSortableHeader('№', 'ID_Document')}
                                {renderSortableHeader('Работник', 'WorkerName')}
                                {renderSortableHeader('Программа', 'ProgramName')}
                                {renderSortableHeader('Рег. номер', 'regnumber')}
                                {/* Можно добавить другие колонки: Серия, Номер формы */}
                                {renderSortableHeader('Дата выдачи', 'DateIssue')}
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedDocuments.map((doc, index) => (
                                <tr key={doc.ID_Document}>
                                    {/* Редактирование документов через форму, не inline */}
                                    <td>{index + 1}</td>
                                    <td>{doc.WorkerName || 'N/A'}</td>
                                    <td>{doc.ProgramName || 'N/A'}</td>
                                    <td>{doc.regnumber || 'N/A'}</td>
                                    <td>{formatDate(doc.DateIssue, 'display')}</td> {/* Используем formatDate для отображения */}
                                    <td className="actions-cell">
                                        {/* Кнопка редактирования открывает DocumentForm */}
                                        <button onClick={() => handleEdit(doc)} disabled={!!addingItemType || !!editingItem}>Редакт.</button>
                                        {/* Кнопка удаления */}
                                        <button onClick={() => handleDelete(doc.ID_Document)} className="delete-button" disabled={!!addingItemType || !!editingItem}>Удалить</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 )}

            </div> {/* admin-content */}
        </div> // admin-panel
    );
}

export default AdminPanel;