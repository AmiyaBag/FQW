import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AdminPanel.css';

const apiUrl = process.env.REACT_APP_API_URL;

// --- Вспомогательная функция для форматирования даты ---
const formatDate = (dateStr, type = 'date') => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    if (type === 'datetime-local') {
      const offset = date.getTimezoneOffset();
      const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
      return adjustedDate.toISOString().slice(0, 16);
    } else if (type === 'date') {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      // CORRECTED: Removed problematic <span> tags
      return `${year}-${month}-${day}`;
    } else {
      return date.toLocaleDateString('ru-RU');
    }
  } catch (e) {
    console.error("Ошибка форматирования даты:", dateStr, e);
    return '';
  }
};


// --- Компонент AddItemForm ---
const AddItemForm = ({ type, onSave, onCancel, allOrganizations = [] }) => {
  const [newItem, setNewItem] = useState({});
  useEffect(() => { setNewItem({}); }, [type]);
  const handleChange = (field, value) => { setNewItem(prev => ({ ...prev, [field]: value })); };
  const handleSubmit = (e) => { e.preventDefault(); onSave(newItem); setNewItem({}); };
  const handleCancel = (e) => { e.preventDefault(); setNewItem({}); onCancel(); };

  if (type === 'programs') {
    const staticProgramTypes = [
      'Повышение квалификации',
      'Профессиональная переподготовка',
    ];
    return (
      <form onSubmit={handleSubmit} className="add-form">
        <h4>Добавить программу</h4>
        <input
          type="text"
          placeholder="Название программы"
          required
          value={newItem.Name_ProgDPO || ''}
          onChange={(e) => handleChange('Name_ProgDPO', e.target.value)}
        />
        <select
          required
          value={newItem.Type_ProgDPO || ''}
          onChange={(e) => handleChange('Type_ProgDPO', e.target.value)}
        >
          <option value="" disabled>Выберите тип</option>
          {staticProgramTypes.map(typeOption => (
            <option key={typeOption} value={typeOption}>{typeOption}</option>
          ))}
        </select>
        <select
          required
          value={newItem.ID_Org || ''}
          onChange={(e) => handleChange('ID_Org', e.target.value)}
        >
          <option value="" disabled>Выберите организацию</option>
          {allOrganizations.map(org => (
            <option key={org.ID_Org} value={org.ID_Org}>{org.FName}</option>
          ))}
        </select>
        <div className="form-actions">
          <button type="submit">Сохранить</button>
          <button type="button" onClick={handleCancel}>Отмена</button>
        </div>
      </form>
    );
  }
  if (type === 'organizations') {
   return ( <form onSubmit={handleSubmit} className="add-form">
    <h4>Добавить организацию</h4>
      <input type="text" placeholder="Полное название" required value={newItem.FName || ''} onChange={(e) => handleChange('FName', e.target.value)} />
      <input type="text" placeholder="Краткое название" required value={newItem.SName || ''} onChange={(e) => handleChange('SName', e.target.value)} />
      <div className="form-actions"> <button type="submit">Сохранить</button> <button type="button" onClick={handleCancel}>Отмена</button> </div> </form> );
  }
   if (type === 'kks') {
     return ( <form onSubmit={handleSubmit} className="add-form">
    <h4>Добавить критерий ККС</h4>
      <input type="text" placeholder="Название критерия ККС" required value={newItem.Name_KKS || ''} onChange={(e) => handleChange('Name_KKS', e.target.value)} />
      <input type="text" placeholder="Краткое обозначение" value={newItem.SName_KKS || ''} onChange={(e) => handleChange('SName_KKS', e.target.value)} />
      <div className="form-actions"> <button type="submit">Сохранить</button> <button type="button" onClick={handleCancel}>Отмена</button> </div> </form> );
  }
  return null;
};

// --- Компонент WorkerForm ---
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

// --- Компонент формы для Документов ---
const DocumentForm = ({ initialData = {}, onSave, onCancel, isEditing = false, allWorkers = [], allPrograms = [] }) => {
  const [docData, setDocData] = useState({});

  useEffect(() => {
    setDocData({
      ID_Worker: initialData.ID_Worker || '',
      ID_ProgDPO: initialData.ID_ProgDPO || '',
      regnumber: initialData.regnumber || '',
      formseries: initialData.formseries || '',
      formnumber: initialData.formnumber || '',
      DateIssue: formatDate(initialData.DateIssue, 'date'),
      DataStart: formatDate(initialData.DataStart, 'date'),
      DataEnd: formatDate(initialData.DataEnd, 'date')
    });
  }, [initialData]);

  const handleChange = (field, value) => {
    setDocData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = { ...docData };
    if (isEditing && initialData.ID_Document) {
      dataToSend.ID_Document = initialData.ID_Document;
    }
    onSave(dataToSend);
  };

  const handleCancelClick = (e) => {
    e.preventDefault();
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="add-form document-form">
      <h4>{isEditing ? `Редактировать документ (ID: ${initialData.ID_Document})` : 'Добавить документ'}</h4>

      <label htmlFor="doc-worker">Работник:</label>
      <select id="doc-worker" required value={docData.ID_Worker} onChange={(e) => handleChange('ID_Worker', e.target.value ? parseInt(e.target.value, 10) : '')}>
        <option value="" disabled>-- Выберите работника --</option>
        {allWorkers.map(w => <option key={w.ID_Worker} value={w.ID_Worker}>{w.FName_Worker} (ID: {w.ID_Worker})</option>)}
      </select>

      <label htmlFor="doc-program">Программа ДПО:</label>
      <select id="doc-program" required value={docData.ID_ProgDPO} onChange={(e) => handleChange('ID_ProgDPO', e.target.value ? parseInt(e.target.value, 10) : '')}>
        <option value="" disabled>-- Выберите программу --</option>
        {allPrograms.map(p => <option key={p.ID_ProgDPO} value={p.ID_ProgDPO}>{p.Name_ProgDPO}</option>)}
      </select>

      <label htmlFor="doc-regnumber">Регистрационный номер:</label>
      <input id="doc-regnumber" type="text" placeholder="Рег. номер" value={docData.regnumber} onChange={(e) => handleChange('regnumber', e.target.value)} />

      <label htmlFor="doc-formseries">Серия формы:</label>
      <input id="doc-formseries" type="text" placeholder="Серия" value={docData.formseries} onChange={(e) => handleChange('formseries', e.target.value)} />

      <label htmlFor="doc-formnumber">Номер формы:</label>
      <input id="doc-formnumber" type="text" placeholder="Номер" value={docData.formnumber} onChange={(e) => handleChange('formnumber', e.target.value)} />

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
  // State Variables
  const [activeTab, setActiveTab] = useState('programs'); // 'programs', 'organizations', 'kks', 'workers', 'documents'
  const [programs, setPrograms] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [kks, setKks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [addingItemType, setAddingItemType] = useState(null);
  const [allOrganizations, setAllOrganizations] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);
  const [allPrograms, setAllPrograms] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  const navigate = useNavigate();

  const user = useMemo(() => {
        const storedUser = localStorage.getItem('user');
        try {
          return storedUser ? JSON.parse(storedUser) : null;
        } catch (e) {
          console.error("Failed to parse user from localStorage", e);
          localStorage.removeItem('user');
          return null;
        }
      }, []);

  // --- Sort function ---
  const requestSort = (key) => {
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
  useEffect(() => {
    const idKey = getIdKeyForTab(activeTab);
    if (idKey) {
      setSortConfig({ key: idKey, direction: 'ascending' });
    } else {
      setSortConfig({ key: null, direction: 'ascending' });
    }
    setEditingItem(null);
    setAddingItemType(null);
  }, [activeTab]);

  // --- Data Fetching ---
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
      if (!Array.isArray(responseData)) { // Changed from response.data to responseData
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
      // CORRECTED: Removed problematic <span> tags
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
  }, [activeTab, user, apiUrl]);

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
        console.log("Fetching auxiliary data (orgs, workers, programs)...");
        const endpoints = [
          `${apiUrl}/api/organizations`,
          `${apiUrl}/api/workers/admin`,
          `${apiUrl}/api/programs`,
        ];
        const [orgsRes, workersRes, progsRes] = await Promise.all(
          endpoints.map(url => axios.get(url))
        );
        setAllOrganizations(orgsRes.data || []);
        setAllWorkers(workersRes.data || []);
        setAllPrograms(progsRes.data || []);
        console.log("Auxiliary data fetched on mount.");
      } catch (err) {
        console.error('Error fetching auxiliary data:', err);
        const auxErrorMsg = 'Ошибка загрузки вспомогательных данных.';
        // CORRECTED: Removed problematic <span> tags
        setError(prev => prev ? `${prev}\n${auxErrorMsg}` : auxErrorMsg);
      }
    };

    if (user?.role === 1 && (allOrganizations.length === 0 || allWorkers.length === 0 || allPrograms.length === 0)) {
      loadAuxiliaryData();
    }
  }, [user?.role, apiUrl, allOrganizations.length, allWorkers.length, allPrograms.length]);

  // --- Memoized Sorted Lists ---
  const sortedPrograms = useMemo(() => {
    let sortableItems = [...programs];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'Type_ProgDPO') {
          const typeA = String(a.Type_ProgDPO ?? '').toLowerCase();
          const typeB = String(b.Type_ProgDPO ?? '').toLowerCase();
          if (typeA < typeB) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (typeA > typeB) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
        }
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        const compareResult = typeof valA === 'number' && typeof valB === 'number'
          ? valA - valB
          : String(valA ?? '').localeCompare(String(valB ?? ''));
        return sortConfig.direction === 'ascending' ? compareResult : -compareResult;
      });
    }
    return sortableItems;
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

        if (['DateIssue', 'DataStart', 'DataEnd'].includes(sortConfig.key)) {
           const dateA = valA ? new Date(valA).getTime() : 0;
           const dateB = valB ? new Date(valB).getTime() : 0;
            if (isNaN(dateA) && isNaN(dateB)) return 0;
            if (isNaN(dateA)) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (isNaN(dateB)) return sortConfig.direction === 'ascending' ? 1 : -1;
            return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
         }

         if (['WorkerName', 'ProgramName'].includes(sortConfig.key)) {
           const strA = String(valA ?? '').toLowerCase();
           const strB = String(valB ?? '').toLowerCase();
           if (strA < strB) return sortConfig.direction === 'ascending' ? -1 : 1;
           if (strA > strB) return sortConfig.direction === 'ascending' ? 1 : -1;
           return 0;
         }

         const compareResult = typeof valA === 'number' && typeof valB === 'number'
           ? valA - valB
           : String(valA ?? '').localeCompare(String(valB ?? ''));

        return sortConfig.direction === 'ascending' ? compareResult : -compareResult;
      });
    }
    return sortableItems;
  }, [documents, sortConfig]);

  // --- CRUD Handlers ---
  const handleEdit = (item) => {
    setEditingItem(item);
    setAddingItemType(null);
  };
  const handleCancel = () => {
    setEditingItem(null);
    setAddingItemType(null);
  };

  const handleChangeInline = (field, value) => {
    setEditingItem(prev => ({ ...prev, [field]: value }));
  };
  const handleSave = async (editedDataFromForm) => {
    const itemToSave = editedDataFromForm || editingItem;
    if (!itemToSave) {
      setError("Данные для сохранения отсутствуют.");
      return;
    }

    let id;
    const idKey = getIdKeyForTab(activeTab);

    if (editingItem && editingItem[idKey] !== undefined) {
      id = editingItem[idKey];
    }
    else if (editedDataFromForm && editedDataFromForm[idKey] !== undefined) {
       id = editedDataFromForm[idKey];
    }
    else if (activeTab === 'documents' && editingItem?.ID_Document) {
      id = editingItem.ID_Document;
    }


    if (id === undefined || id === null) {
      console.error("Attempted to save without a valid ID:", itemToSave, "Active Tab:", activeTab);
      setError("Не удалось определить ID для сохранения элемента. Пожалуйста, убедитесь, что это существующий элемент.");
      setLoading(false);
      return;
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
        case 'documents': endpoint = `${apiUrl}/api/documents/${id}`; break;
        default: throw new Error("Неизвестная вкладка для сохранения");
      }
      await axios.put(endpoint, itemToSave);
      setEditingItem(null);
      await fetchData();
      console.log(`Item (ID: ${id}) saved successfully.`);
    } catch (err) {
      // CORRECTED: Structured logging for err
      const errorMessageToLog = {
        message: err.message,
        code: err.code,
        sqlState: err.sqlState,
        responseError: err.response?.data?.error,
        responseStatus: err.response?.status
      };
      console.error('Ошибка при сохранении изменений:', errorMessageToLog);

      setError(err.response?.data?.error || err.message || 'Неизвестная ошибка при сохранении данных');
    } finally {
      setLoading(false);
    }
  };
  const handleShowAddForm = () => {
    setAddingItemType(activeTab);
    setEditingItem(null);
  };

  const handleCancelAdd = () => {
    setAddingItemType(null);
  };

  const handleAddItem = async (newItemData) => {
    const type = addingItemType;
    if (!type) return;

    if (type === 'workers' && !newItemData.Password) {
      setError('Для нового работника необходим пароль.');
      return;
    }

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
      // CORRECTED: Structured logging for err
      const errorMessageToLog = {
        message: err.message,
        code: err.code,
        sqlState: err.sqlState,
        responseError: err.response?.data?.error,
        responseStatus: err.response?.status
      };
      console.error(`Ошибка при добавлении ${type}:`, errorMessageToLog);

      setError(err.response?.data?.error || `Ошибка при добавлении элемента`);
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (idToDelete) => {
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
        case 'documents': endpoint = `${apiUrl}/api/documents/${idToDelete}`; break;
        default: throw new Error("Неизвестная вкладка для удаления");
      }
      await axios.delete(endpoint);
      if (editingItem && editingItem[idKey] === idToDelete) { setEditingItem(null); }
      await fetchData();
      console.log(`Item (ID: ${idToDelete}) deleted successfully.`);
    } catch (err) {
      // CORRECTED: Structured logging for err
      const errorMessageToLog = {
        message: err.message,
        code: err.code,
        sqlState: err.sqlState,
        responseError: err.response?.data?.error,
        responseStatus: err.response?.status
      };
      console.error(`Ошибка при удалении элемента (ID: ${idToDelete}):`, errorMessageToLog);

      setError(err.response?.data?.error || 'Ошибка при удалении элемента. Возможно, на него есть ссылки.');
    } finally {
      setLoading(false);
    }
  };

  // --- Helper Functions for Rendering ---
  const displayRole = (roleValue) => { return roleValue === 1 ? 'Работник ЦДО' : roleValue === 0 ? 'Работник ОУ' : 'Неизвестно'; };
  const renderSortableHeader = (label, key) => ( <th onClick={() => requestSort(key)} className="sortable-header"> {label} {sortConfig.key === key ? (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼') : ' ↕'} </th> );

  // --- Main Component Render ---
  if (!user && loading) return <div className="loading">Проверка авторизации и загрузка данных...</div>;
  if (!user) return <div className="error">Не удалось получить данные пользователя. <button onClick={() => navigate('/login')}>Войти</button></div>;
  if (user.role !== 1) return <div className="error">Доступ запрещен.</div>;
  const showLoadingIndicator = loading && !error;

  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header">
        <h1>Панель администратора</h1>
        <div className="header-buttons">
          <button onClick={() => navigate('/admin')} className="back-button">Назад</button>
          <button onClick={() => { localStorage.removeItem('user'); navigate('/login'); }} className="logout-button">Выйти</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`tab-button ${activeTab === 'programs' ? 'active' : ''}`} onClick={() => setActiveTab('programs')}>Программы</button>
        <button className={`tab-button ${activeTab === 'organizations' ? 'active' : ''}`} onClick={() => setActiveTab('organizations')}>Организации</button>
        <button className={`tab-button ${activeTab === 'kks' ? 'active' : ''}`} onClick={() => setActiveTab('kks')}>Критерии ККС</button>
        <button className={`tab-button ${activeTab === 'workers' ? 'active' : ''}`} onClick={() => setActiveTab('workers')}>Работники</button>
        <button className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>Документы</button>
      </div>

      {/* Loading and Error Indicators */}
      {showLoadingIndicator && <div className="loading-inline">Обновление данных...</div>}
      {error && <div className="error-inline">{error} <button onClick={() => setError('')} title="Закрыть ошибку">×</button></div>}

      {/* Main Content Area */}
      <div className="admin-content">

        {/* Add/Edit Forms */}
        {(addingItemType === 'workers' || (editingItem && activeTab === 'workers')) && (
          <WorkerForm
            key={editingItem ? editingItem.ID_Worker : 'add-worker'}
            initialData={editingItem || {}}
            onSave={editingItem ? handleSave : handleAddItem}
            onCancel={editingItem ? handleCancel : handleCancelAdd}
            isEditing={!!editingItem}
          />
        )}
        {addingItemType && addingItemType !== 'workers' && addingItemType !== 'documents' && (
          <AddItemForm
            key={`add-${addingItemType}`}
            type={addingItemType}
            onSave={handleAddItem}
            onCancel={handleCancelAdd}
            allOrganizations={allOrganizations}
          />
        )}
        {(addingItemType === 'documents' || (editingItem && activeTab === 'documents')) && (
          <DocumentForm
            key={editingItem ? editingItem.ID_Document : 'add-document'}
            initialData={editingItem || {}}
            onSave={editingItem ? handleSave : handleAddItem}
            onCancel={editingItem ? handleCancel : handleCancelAdd}
            isEditing={!!editingItem}
            allWorkers={workers}
            allPrograms={allPrograms}
          />
        )}

        {/* Add Button */}
        {!editingItem && !addingItemType && (
          <button onClick={handleShowAddForm} className="add-button">
            Добавить {
              activeTab === 'programs' ? 'программу' :
              activeTab === 'organizations' ? 'организацию' :
              activeTab === 'kks' ? 'критерий ККС' :
              activeTab === 'workers' ? 'работника' :
              activeTab === 'documents' ? 'документ' : ''
            }
          </button>
        )}

        {/* Programs Table */}
        {activeTab === 'programs' && (
          <table className="admin-table">
            <thead><tr> {/* Compacted for whitespace */}
              {renderSortableHeader('№', 'ID_ProgDPO')}
              {renderSortableHeader('Название', 'Name_ProgDPO')}
              {renderSortableHeader('Тип', 'Type_ProgDPO')}
              <th>Действия</th>
            </tr></thead>
            <tbody>{sortedPrograms.map((program, index) => (
              <tr key={program.ID_ProgDPO}>{editingItem?.ID_ProgDPO === program.ID_ProgDPO ? (<>
                <td>{index + 1}</td>
                <td>
                  <input type="text" value={editingItem.Name_ProgDPO} onChange={(e) => handleChangeInline('Name_ProgDPO', e.target.value)} />
                </td>
                <td>
                  <select value={editingItem.Type_ProgDPO || ''} onChange={(e) => handleChangeInline('Type_ProgDPO', e.target.value)}>
                    <option value="Повышение квалификации">Повышение квалификации</option>
                    <option value="Профессиональная переподготовка">Профессиональная переподготовка</option>
                  </select>
                </td>
                <td>
                  <button onClick={() => handleSave()}>Сохранить</button>
                  <button onClick={handleCancel}>Отмена</button>
                </td>
              </>
              ) : (
              <>
                <td>{index + 1}</td>
                <td>{program.Name_ProgDPO}</td>
                <td>{program.Type_ProgDPO || 'N/A'}</td>
                <td className="actions-cell">
                  <button onClick={() => handleEdit(program)} disabled={!!addingItemType || !!editingItem}>Редакт.</button>
                  <button onClick={() => handleDelete(program.ID_ProgDPO)} className="delete-button" disabled={!!addingItemType || !!editingItem}>Удалить</button>
                </td>
              </>
              )}</tr>
            ))}</tbody>
          </table>
        )}

        {/* Organizations Table */}
        {activeTab === 'organizations' && (
          <table className="admin-table">
            <thead><tr>
              {renderSortableHeader('№', 'ID_Org')}
              {renderSortableHeader('Полное название', 'FName')}
              {renderSortableHeader('Краткое название', 'SName')}
              <th>Действия</th>
            </tr></thead>
            <tbody>{sortedOrganizations.map((org, index) => (
              <tr key={org.ID_Org}>{editingItem?.ID_Org === org.ID_Org ? (<>
                <td>{index + 1}</td>
                <td><input type="text" value={editingItem.FName} onChange={(e) => handleChangeInline('FName', e.target.value)} /></td>
                <td><input type="text" value={editingItem.SName} onChange={(e) => handleChangeInline('SName', e.target.value)} /></td>
                <td> <button onClick={handleSave}>Сохранить</button> <button onClick={handleCancel}>Отмена</button> </td>
              </>) : (<>
                <td>{index + 1}</td>
                <td>{org.FName}</td>
                <td>{org.SName}</td>
                <td className="actions-cell">
                  <button onClick={() => handleEdit(org)} disabled={!!addingItemType || !!editingItem}>Редакт.</button>
                  <button onClick={() => handleDelete(org.ID_Org)} className="delete-button" disabled={!!addingItemType || !!editingItem}>Удалить</button>
                </td>
              </>)}</tr>
            ))}</tbody>
          </table>
        )}

        {/* KKS Table */}
        {activeTab === 'kks' && (
          <table className="admin-table">
            <thead><tr>
              {renderSortableHeader('№', 'ID_KKS')}
              {renderSortableHeader('Название', 'Name_KKS')}
              {renderSortableHeader('Краткое обозначение', 'SName_KKS')}
              <th>Действия</th>
            </tr></thead>
            <tbody>{sortedKks.map((kksItem, index) => (
              <tr key={kksItem.ID_KKS}>{editingItem?.ID_KKS === kksItem.ID_KKS ? (<>
                <td>{index + 1}</td>
                <td><input type="text" value={editingItem.Name_KKS} onChange={(e) => handleChangeInline('Name_KKS', e.target.value)} /></td>
                <td><input type="text" value={editingItem.SName_KKS} onChange={(e) => handleChangeInline('SName_KKS', e.target.value)} /></td>
                <td> <button onClick={handleSave}>Сохранить</button> <button onClick={handleCancel}>Отмена</button> </td>
              </>) : (<>
                <td>{index + 1}</td>
                <td>{kksItem.Name_KKS}</td>
                <td>{kksItem.SName_KKS}</td>
                <td className="actions-cell">
                  <button onClick={() => handleEdit(kksItem)} disabled={!!addingItemType || !!editingItem}>Редакт.</button>
                  <button onClick={() => handleDelete(kksItem.ID_KKS)} className="delete-button" disabled={!!addingItemType || !!editingItem}>Удалить</button>
                </td>
              </>)}</tr>
            ))}</tbody>
          </table>
        )}

        {/* Workers Table */}
        {activeTab === 'workers' && (
          <table className="admin-table">
            <thead><tr>
              {renderSortableHeader('№', 'ID_Worker')}
              {renderSortableHeader('Логин', 'Login')}
              {renderSortableHeader('ФИО Работника', 'FName_Worker')}
              {renderSortableHeader('Должность', 'JobTitle')}
              {renderSortableHeader('Место работы', 'PlaceWork')}
              {renderSortableHeader('Степень', 'Degree')}
              {renderSortableHeader('Звание', 'Rank')}
              {renderSortableHeader('Роль', 'Role')}
              <th>Действия</th>
            </tr></thead>
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
                  <td className="actions-cell">
                    <button onClick={() => handleEdit(w)} disabled={!!addingItemType || !!editingItem}>Редакт.</button>
                    <button onClick={() => handleDelete(w.ID_Worker)} className="delete-button" disabled={!!addingItemType || !!editingItem}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Documents Table */}
        {activeTab === 'documents' && (
          <table className="admin-table">
            <thead><tr>
              {renderSortableHeader('№', 'ID_Document')}
              {renderSortableHeader('Работник', 'WorkerName')}
              {renderSortableHeader('Программа', 'ProgramName')}
              {renderSortableHeader('Рег. номер', 'regnumber')}
              {renderSortableHeader('Дата выдачи', 'DateIssue')}
              <th>Действия</th>
            </tr></thead>
            <tbody>
              {sortedDocuments.map((doc, index) => (
                <tr key={doc.ID_Document}>
                  <td>{index + 1}</td>
                  <td>{doc.WorkerName || 'N/A'}</td>
                  <td>{doc.ProgramName || 'N/A'}</td>
                  <td>{doc.regnumber || 'N/A'}</td>
                  <td>{formatDate(doc.DateIssue, 'display')}</td>
                  <td className="actions-cell">
                    <button onClick={() => handleEdit(doc)} disabled={!!addingItemType || !!editingItem}>Редакт.</button>
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