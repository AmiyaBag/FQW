import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import './Documents.css';

const apiUrl = process.env.REACT_APP_API_URL;

// Set the app element for react-modal accessibility
Modal.setAppElement('#root'); // Adjust '#root' if your app's root element has a different ID

// Вспомогательная функция для форматирования даты
const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? 'Неверная дата' : date.toLocaleDateString('ru-RU');
    } catch (e) {
        console.error("Error formatting date:", dateStr, e);
        return 'Ошибка даты';
    }
};

function Documents() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDocumentForModal, setSelectedDocumentForModal] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'DateIssue', direction: 'descending' });
    const navigate = useNavigate();
    // --- Modal Handlers ---
    const openModal = (doc) => {
        console.log("Opening modal for doc:", doc);
        setSelectedDocumentForModal(doc);
        setIsModalOpen(true);
    };
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedDocumentForModal(null); // Clear selected doc when closing
    };
// Helper function to sort documents
const sortDocuments = (docs, config) => {
    if (!config.key) return docs;
    return [...docs].sort((a, b) => {
        // Handle date fields specially
        if (['DateIssue', 'DataStart', 'DataEnd'].includes(config.key)) {
            const dateA = a[config.key] ? new Date(a[config.key]).getTime() : 0;
            const dateB = b[config.key] ? new Date(b[config.key]).getTime() : 0;
            if (dateA < dateB) {
                return config.direction === 'ascending' ? -1 : 1;
            }
            if (dateA > dateB) {
                return config.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        }
        // Handle numeric fields
        if (['ID_Document', 'ID_Worker', 'ID_ProgDPO'].includes(config.key)) {
            const valA = a[config.key] || 0;
            const valB = b[config.key] || 0;
            return config.direction === 'ascending' ? valA - valB : valB - valA;
        }
        // Handle string fields
        const valA = String(a[config.key] || '').toLowerCase();
        const valB = String(b[config.key] || '').toLowerCase();
        if (valA < valB) {
            return config.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
            return config.direction === 'ascending' ? 1 : -1;
        }
        return 0;
    });
};
// --- Filtered Documents (Memoized) ---
    const filteredDocuments = useMemo(() => {
        if (loading || !Array.isArray(documents)) return [];
    
        let filtered = documents;
        if (user?.role === 1) {
            filtered = selectedWorker !== null
                ? documents.filter(doc => doc.ID_Worker === selectedWorker)
                : [];
        }
        return sortDocuments(filtered, sortConfig);
    }, [documents, selectedWorker, user?.role, loading, sortConfig]);

    // Функция для изменения сортировки
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Компонент для заголовков с сортировкой
    const renderSortableHeader = (label, key) => (
        <th 
            onClick={() => requestSort(key)} 
            className="sortable-header"
            style={{ cursor: 'pointer' }}
        >
            {label} 
            {sortConfig.key === key ? (
                sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'
            ) : ' ↕'}
        </th>
    );

// --- Helper Function: Get Worker Name (Memoized) ---
    const getWorkerName = useCallback(() => {
        if (user?.role !== 1 || !selectedWorker || !Array.isArray(workers)) return '';
        const worker = workers.find(w => w.ID_Worker === selectedWorker);
        return worker ? worker.FName_Worker : `ID ${selectedWorker}`;
    }, [user?.role, selectedWorker, workers]);
    // Загрузка пользователя
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Ошибка парсинга пользователя:", e);
                localStorage.removeItem('user');
                setError("Ошибка данных пользователя. Пожалуйста, войдите снова.");
                setLoading(false);
            }
        } else {
            setError("Пользователь не аутентифицирован.");
            setLoading(false);
        }
    }, []);

    // Загрузка документов
    const fetchDocuments = useCallback(async () => {
        if (!user || user.workerId === undefined) {
            if (user !== null) {
                setError('Не удалось получить ID пользователя.');
            }
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.get(`${apiUrl}/api/documents`, {
                params: {
                    userId: user.workerId,
                    role: user.role
                }
            });

            if (!Array.isArray(response.data)) {
                throw new Error("Неверный формат данных документов.");
            }

            setDocuments(response.data);

        } catch (err) {
            console.error('Ошибка при загрузке документов:', err);
            setError(err.response?.data?.error || 'Ошибка при загрузке документов');
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, [user, apiUrl]);

    useEffect(() => {
        if (user) {
            fetchDocuments();
        }
    }, [user, fetchDocuments]);

    // Отсортированные документы
    const sortedDocuments = useMemo(() => {
        return sortDocuments(documents, sortConfig);
    }, [documents, sortConfig]);

    // Обработчики
    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleBack = () => {
        if (user) {
            navigate(user.role === 1 ? '/admin' : '/user');
        } else {
            navigate('/login');
        }
    };

    // Состояния загрузки и ошибок
    if (user === null && loading) return <div className="loading">Загрузка данных пользователя...</div>;
    if (error) return (
        <div className="documents-container">
            <div className="documents-header">
                <h1>Ошибка</h1>
                <div className="header-buttons">
                    <button onClick={handleBack} className="back-button">Назад</button>
                    <button onClick={handleLogout} className="logout-button">Выйти</button>
                </div>
            </div>
            <div className="error">{error}</div>
        </div>
    );
    if (loading) return <div className="loading">Загрузка документов...</div>;
    if (!user) return <div className="error">Не удалось загрузить данные пользователя. <button onClick={() => navigate('/login')}>Войти</button></div>;

    return (
        <div className="documents-container">
            <div className="documents-header">
                <h1>{user.role === 1 ? 'Все документы' : 'Мои документы'}</h1>
                <div className="header-buttons">
                    <button onClick={handleBack} className="back-button">Назад</button>
                    <button onClick={handleLogout} className="logout-button">Выйти</button>
                </div>
            </div>

            <div className="documents-list">
                {sortedDocuments.length === 0 ? (
                    <p className="no-documents">Документы не найдены</p>
                ) : (
                    <div className="documents-list">
                        <table className="documents-table">
                            <thead>
                            <tr>
                                {renderSortableHeader('Программа обучения', 'ProgramName')}
                                {renderSortableHeader('Организация', 'OrgSName')}
                                {renderSortableHeader('Рег. номер', 'regnumber')}
                                {renderSortableHeader('Дата выдачи', 'DateIssue')}
                                <th>Действия</th>
                            </tr>
                            </thead>
                            <tbody>
                                {filteredDocuments.map((doc) => (
                                    <tr key={doc.ID_Document}>
                                        <td>{doc.ProgramName || 'N/A'}</td>
                                        <td>{doc.OrgSName || doc.OrgFName || 'N/A'}</td>
                                        <td>{doc.regnumber || 'N/A'}</td>
                                        <td>{formatDate(doc.DateIssue)}</td>
                                        <td>
                                            <button
                                                className="details-button"
                                                onClick={() => openModal(doc)}
                                            >
                                                Дополнительно
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                )}
            </div>
            <Modal
                isOpen={isModalOpen}
                onRequestClose={closeModal}
                contentLabel="Детали документа" // Accessibility label
                className="modal-content" // Class for styling the modal content
                overlayClassName="modal-overlay" // Class for styling the background overlay
                ariaHideApp={true} // Helps with screen readers
            >
                {/* Content inside the modal */}
                {selectedDocumentForModal ? (
                    <>
                        {/* Modal Header */}
                        <h2>Детали документа № {selectedDocumentForModal.regnumber || selectedDocumentForModal.ID_Document}</h2>
                        <button onClick={closeModal} className="modal-close-button" aria-label="Закрыть">&times;</button>
                        <div className="modal-details-grid">
                                <p><strong>Работник:</strong> {selectedDocumentForModal.WorkerName || getWorkerName() || 'N/A'}</p>
                                <p><strong>Программа обучения:</strong> {selectedDocumentForModal.ProgramName || 'N/A'}</p>
                                <p><strong>Организация (полное):</strong> {selectedDocumentForModal.OrgFName || 'N/A'}</p>
                                <p><strong>Организация (краткое):</strong> {selectedDocumentForModal.OrgSName || 'N/A'}</p>
                                <p><strong>Регистрационный номер:</strong> {selectedDocumentForModal.regnumber || 'N/A'}</p>
                                <p><strong>Дата выдачи:</strong> {formatDate(selectedDocumentForModal.DateIssue)}</p>
                                <p className="kks-details">
                                    <strong>Критерии ККС:</strong>
                                    {Array.isArray(selectedDocumentForModal.KKS_Data) && selectedDocumentForModal.KKS_Data.length > 0
                                        ? selectedDocumentForModal.KKS_Data
                                            .map(k => k.fullName || k.shortName)
                                            .filter(Boolean)
                                            .join(', ')
                                        : 'Нет данных'}
                                </p>
                        </div>
                    </>
                ) : (
                    <p>Загрузка деталей...</p>
                )}
            </Modal>
        </div>
    );
}

export default Documents;