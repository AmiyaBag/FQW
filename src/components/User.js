import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './User.css'; // Убедитесь, что стили подключены и обновлены

const apiUrl = process.env.REACT_APP_API_URL;

// --- Helper Functions (без изменений) ---
const isTrainingNeeded = (lastTrainingDateStr) => {
    if (!lastTrainingDateStr) {
        return true; // No training date found, assume training is needed
    }
    try {
        const lastTrainingDate = new Date(lastTrainingDateStr);
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

        if (isNaN(lastTrainingDate.getTime())) {
            console.warn("Invalid date encountered:", lastTrainingDateStr);
            return true; // Treat invalid date as needing training
        }

        return lastTrainingDate < threeYearsAgo;
    } catch (e) {
        console.error("Error parsing date:", lastTrainingDateStr, e);
        return true; // Error parsing date, assume training needed
    }
};

const formatDate = (dateStr) => {
    if (!dateStr) return 'Нет данных';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Некорректная дата';
        return date.toLocaleDateString('ru-RU'); // Format to DD.MM.YYYY
    } catch (e) {
        return 'Ошибка формата';
    }
};
// --- ---

function User() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [kksStatus, setKksStatus] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // This remains for initial user load
    const [error, setError] = useState(null);

    // --- Состояния для рекомендаций по конкретному ККС (без изменений) ---
    const [visibleRecommendationsKksId, setVisibleRecommendationsKksId] = useState(null);
    const [currentRecommendations, setCurrentRecommendations] = useState([]);
    const [isCurrentRecLoading, setIsCurrentRecLoading] = useState(false);
    const [currentRecError, setCurrentRecError] = useState(null);

    // --- Состояния для общих списков (изменено: теперь для организаций) ---
    const [allKks, setAllKks] = useState([]);
    const [allOrganizations, setAllOrganizations] = useState([]); // <-- Changed from allPrograms
    const [showAllKks, setShowAllKks] = useState(false);
    const [showAllOrganizations, setShowAllOrganizations] = useState(false); // <-- Changed from showAllPrograms
    const [isAllKksLoading, setIsAllKksLoading] = useState(false);
    const [allKksError, setAllKksError] = useState(null);
    const [isAllOrganizationsLoading, setIsAllOrganizationsLoading] = useState(false); // <-- Changed from isAllProgramsLoading
    const [allOrganizationsError, setAllOrganizationsError] = useState(null); // <-- Changed from allProgramsError

    // --- Состояния для времени загрузки (УДАЛЕНЫ) ---
    // const [kksStatusLoadTime, setKksStatusLoadTime] = useState(null);
    // const [allKksLoadTime, setAllKksLoadTime] = useState(null);
    // const [allProgramsLoadTime, setAllProgramsLoadTime] = useState(null);
    // const [recommendationsLoadTime, setRecommendationsLoadTime] = useState(null);

    // Эффект для загрузки данных пользователя (без изменений)
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (!parsedUser.FName_Worker) {
                   console.warn("FName_Worker отсутствует в данных пользователя из localStorage.");
                }
                setUser(parsedUser);
            } catch (e) {
                console.error("Ошибка парсинга пользователя из localStorage:", e);
                localStorage.removeItem('user');
                setError("Ошибка данных пользователя. Пожалуйста, войдите снова.");
            } finally {
                setIsLoading(false);
            }
        } else {
            setError("Пользователь не аутентифицирован.");
            setIsLoading(false);
            // navigate('/login');
        }
    }, []);

    // Эффект для загрузки ТОЛЬКО статуса ККС (Убраны расчеты времени)
    useEffect(() => {
        if (!user || user.role !== 0) {
            if (user === null && !isLoading) {
                setError("Данные пользователя отсутствуют.");
            } else if (user?.role !== 0) {
                console.log("Пользователь не является работником (role != 0), данные ККС не запрашиваются.");
                setKksStatus([]);
            }
            return;
        }

        const fetchKksData = async () => {
            setError(null);
            // setKksStatusLoadTime(null); // Removed
            setVisibleRecommendationsKksId(null);
            setCurrentRecommendations([]);
            setIsCurrentRecLoading(false);
            setCurrentRecError(null);

            // const startTime = performance.now(); // Removed

            try {
                console.log(`Fetching KKS status for workerId: ${user.workerId}`);
                const kksResponse = await axios.get(`${apiUrl}/api/user-kks-status?userId=${user.workerId}`);
                const fetchedKksStatus = kksResponse.data || [];
                setKksStatus(fetchedKksStatus);
                console.log("KKS Status Response:", fetchedKksStatus);
            } catch (kksErr) {
                console.error('Ошибка при загрузке статуса ККС:', kksErr);
                setError(kksErr.response?.data?.error || 'Не удалось загрузить статус обучения по ККС.');
                setKksStatus([]);
            } finally {
                // const endTime = performance.now(); // Removed
                // setKksStatusLoadTime((endTime - startTime).toFixed(2)); // Removed
            }
        };

        if (user && user.role === 0 && !isLoading) {
            fetchKksData();
        }

    }, [user, isLoading]);

    // --- Обработчик для показа/скрытия и загрузки рекомендаций (Убраны расчеты времени) ---
    const handleToggleRecommendations = useCallback(async (kksId) => {
        if (visibleRecommendationsKksId === kksId) {
            setVisibleRecommendationsKksId(null);
            setCurrentRecommendations([]);
            // setRecommendationsLoadTime(null); // Removed
            return;
        }

        setVisibleRecommendationsKksId(kksId);
        setIsCurrentRecLoading(true);
        setCurrentRecommendations([]);
        setCurrentRecError(null);
        // setRecommendationsLoadTime(null); // Removed

        // const startTime = performance.now(); // Removed

        try {
            console.log(`Fetching recommended programs for KKS ID: ${kksId}`);
            const recResponse = await axios.get(`${apiUrl}/api/programs/recommended?kksIds=${kksId}`);
            console.log("Recommended Programs Response for KKS", kksId, ":", recResponse.data);
            setCurrentRecommendations(recResponse.data || []);
        } catch (recErr) {
            console.error(`Ошибка при загрузке рекомендуемых программ для KKS ${kksId}:`, recErr);
            setCurrentRecError(recErr.response?.data?.error || 'Не удалось загрузить рекомендуемые программы.');
            setCurrentRecommendations([]);
        } finally {
            // const endTime = performance.now(); // Removed
            // setRecommendationsLoadTime((endTime - startTime).toFixed(2)); // Removed
            setIsCurrentRecLoading(false);
        }
    }, [visibleRecommendationsKksId]);

    // --- Эффект для загрузки ОБЩЕГО списка ККС (Убраны расчеты времени) ---
    useEffect(() => {
        const fetchAllKks = async () => {
            if (showAllKks && allKks.length === 0 && !isAllKksLoading && !allKksError) {
                setIsAllKksLoading(true);
                setAllKksError(null);
                // setAllKksLoadTime(null); // Removed
                // const startTime = performance.now(); // Removed
                try {
                    console.log("Fetching all KKS criteria...");
                    const response = await axios.get(`${apiUrl}/api/kks`);
                    setAllKks(response.data || []);
                    console.log("All KKS Response:", response.data);
                } catch (err) {
                    console.error('Ошибка при загрузке всех ККС:', err);
                    setAllKksError(err.response?.data?.error || 'Не удалось загрузить общий список ККС.');
                } finally {
                    // const endTime = performance.now(); // Removed
                    // setAllKksLoadTime((endTime - startTime).toFixed(2)); // Removed
                    setIsAllKksLoading(false);
                }
            }
        };
        fetchAllKks();
    }, [showAllKks, allKks.length, isAllKksLoading, allKksError]);

    // --- Эффект для загрузки ОБЩЕГО списка ОРГАНИЗАЦИЙ (Новый) ---
    useEffect(() => {
        const fetchAllOrganizations = async () => {
            if (showAllOrganizations && allOrganizations.length === 0 && !isAllOrganizationsLoading && !allOrganizationsError) {
                setIsAllOrganizationsLoading(true);
                setAllOrganizationsError(null);
                try {
                    console.log("Fetching all Organizations...");
                    const response = await axios.get(`${apiUrl}/api/organizations`); // Endpoint for organizations
                    setAllOrganizations(response.data || []);
                    console.log("All Organizations Response:", response.data);
                } catch (err) {
                    console.error('Ошибка при загрузке всех организаций:', err);
                    setAllOrganizationsError(err.response?.data?.error || 'Не удалось загрузить общий список организаций.');
                } finally {
                    setIsAllOrganizationsLoading(false);
                }
            }
        };
        fetchAllOrganizations();
    }, [showAllOrganizations, allOrganizations.length, isAllOrganizationsLoading, allOrganizationsError]);


    // Обработчики навигации и выхода (без изменений)
    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
    };

    const handleViewDocuments = () => {
        navigate('/documents');
    };

    const handleViewAnalysis = () => {
        navigate('/analysis');
    };

    // --- Рендеринг ---

    if (isLoading && user === null) {
        return <div className="loading">Загрузка данных пользователя...</div>;
    }
    if (!user && !isLoading) {
        return <div className="error-container"><div className="error">{error || "Не удалось загрузить данные пользователя."}</div> <button onClick={() => navigate('/login')}>Войти</button></div>;
    }

    return (
        <div className="user-container">
            <div className="user-header">
                <h1>Личный кабинет</h1>
                <button onClick={handleLogout} className="logout-button">Выйти</button>
            </div>

            <div className="user-content">
                {/* Информация о пользователе (без изменений) */}
                <div className="user-info">
                    <h2>Информация о пользователе</h2>
                    <p><strong>ФИО: </strong> {user?.FName_Worker || 'Имя не найдено'}</p>
                    <p><strong>Логин:</strong> {user?.login || 'Логин не найден'}</p>
                    <p><strong>Роль:</strong> {user?.role === 0 ? 'Работник ОУ' : user?.role === 1 ? 'Работник ЦДО (Админ)' : 'Неизвестная роль'}</p>
                </div>

                {/* Статус обучения по ККС (только для работников) - ТАБЛИЦА */}
                {user?.role === 0 && (
                    <div className="user-kks-status-table">
                        <h2>
                            Статус обучения по ККС
                            {/* {kksStatusLoadTime && <span className="load-time"> (Загружено за {kksStatusLoadTime} мс)</span>} Removed */}
                        </h2>
                        {isLoading && <p>Загрузка статуса ККС...</p>}
                        {error && user && <p className="error-message">Ошибка загрузки статуса ККС: {error}</p>}


                        {!isLoading && !error && kksStatus.length > 0 && (
                            <table className="kks-table">
                                <thead>
                                    <tr>
                                        <th>Критерий ККС</th>
                                        <th>Статус</th>
                                        <th>Действие / Дата</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {kksStatus.map((kks) => {
                                        const needsTraining = isTrainingNeeded(kks.LastTrainingDate);
                                        const isVisible = visibleRecommendationsKksId === kks.ID_KKS;

                                        return (
                                            <React.Fragment key={kks.ID_KKS}>
                                                <tr>
                                                    <td>{kks.KKS_FullName} ({kks.KKS_ShortName})</td>
                                                    <td className={`status ${needsTraining ? 'status-needed' : 'status-ok'}`}>
                                                        {needsTraining ? '✕' : '✓'}
                                                    </td>
                                                    <td>
                                                        {/* Всегда отображаем дату */}
                                                        <span>
                                                            Последнее обучение: {formatDate(kks.LastTrainingDate)}
                                                        </span>

                                                        {/* Если обучение требуется (needsTraining === true), ДОПОЛНИТЕЛЬНО показываем кнопку ниже */}
                                                        {needsTraining && (
                                                            <div style={{ marginTop: '5px' }}>
                                                                <button
                                                                    onClick={() => handleToggleRecommendations(kks.ID_KKS)}
                                                                    className="recommendation-toggle-button"
                                                                    disabled={isCurrentRecLoading && isVisible}
                                                                >
                                                                    {isVisible ? 'Скрыть программы' : 'Показать программы'}
                                                                    {isCurrentRecLoading && isVisible && '...'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                                {/* --- Условный рендеринг рекомендаций ПОД строкой --- */}
                                                {isVisible && (
                                                    <tr className="recommendations-row">
                                                        <td colSpan="3">
                                                            <div className="recommendations-details">
                                                                {isCurrentRecLoading && <p>Загрузка рекомендуемых программ...</p>}
                                                                {/* {recommendationsLoadTime && <span className="load-time"> (Загружено за {recommendationsLoadTime} мс)</span>} Removed */}
                                                                {currentRecError && <p className="error-message">Ошибка: {currentRecError}</p>}
                                                                {!isCurrentRecLoading && !currentRecError && (
                                                                    <>
                                                                        {currentRecommendations.length > 0 ? (
                                                                            <>
                                                                                <h4>Рекомендуемые программы ДПО:</h4>
                                                                                <ul>
                                                                                    {currentRecommendations.map(program => (
                                                                                        <li key={program.ID_ProgDPO} className="program-item">
                                                                                            <strong>{program.Name_ProgDPO}</strong>
                                                                                            <br />
                                                                                            <small>
                                                                                                Организация: {program.OrgSName || program.OrgFName || 'Не указана'}
                                                                                                {' | '}
                                                                                                Тип: {program.Name_Type || 'Не указан'}
                                                                                            </small>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </>
                                                                        ) : (
                                                                            <p>Подходящих программ ДПО для данного ККС не найдено.</p>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                {/* --- --- */}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                        {!isLoading && !error && kksStatus.length === 0 && (
                            <p>Нет данных о прохождении обучения по ККС.</p>
                        )}
                    </div>
                )}

                {/* --- Общий список критериев ККС (Убраны расчеты времени) --- */}
                <div className="general-list-section">
                    <h2>
                        Общий список критериев ККС
                        {/* {allKksLoadTime && <span className="load-time"> (Загружено за {allKksLoadTime} мс)</span>} Removed */}
                    </h2>
                    <button
                        onClick={() => setShowAllKks(prev => !prev)}
                        className="toggle-list-button"
                    >
                        {showAllKks ? 'Скрыть список ККС' : 'Показать список ККС'}
                    </button>

                    {showAllKks && (
                        <div className="list-content">
                            {isAllKksLoading && <p>Загрузка всех ККС...</p>}
                            {allKksError && <p className="error-message">Ошибка: {allKksError}</p>}
                            {!isAllKksLoading && !allKksError && (
                                <>
                                    {allKks.length > 0 ? (
                                        <ul className="simple-list">
                                            {allKks.map(kksItem => (
                                                <li key={kksItem.ID_KKS}>
                                                    <strong>{kksItem.Name_KKS}</strong> ({kksItem.SName_KKS})
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>Общий список критериев ККС не найден.</p>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* --- Общий список ОРГАНИЗАЦИЙ (Изменено) --- */}
                <div className="general-list-section">
                    <h2>
                        Общий список организаций
                        {/* {allOrganizationsLoadTime && <span className="load-time"> (Загружено за {allOrganizationsLoadTime} мс)</span>} Removed */}
                    </h2>
                    <button
                        onClick={() => setShowAllOrganizations(prev => !prev)}
                        className="toggle-list-button"
                    >
                        {showAllOrganizations ? 'Скрыть список организаций' : 'Показать список организаций'}
                    </button>

                    {showAllOrganizations && (
                        <div className="list-content">
                            {isAllOrganizationsLoading && <p>Загрузка всех организаций...</p>}
                            {allOrganizationsError && <p className="error-message">Ошибка: {allOrganizationsError}</p>}
                            {!isAllOrganizationsLoading && !allOrganizationsError && (
                                <>
                                    {allOrganizations.length > 0 ? (
                                        <ul className="simple-list">
                                            {allOrganizations.map(org => (
                                                <li key={org.ID_Org}>
                                                    <strong>{org.FName}</strong> ({org.SName})
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>Общий список организаций не найден.</p>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Кнопки действий (без изменений) */}
                <div className="user-actions">
                    <button onClick={handleViewDocuments} className="action-button">
                        Просмотр Моих Документов
                    </button>
                    <button onClick={handleViewAnalysis} className="action-button">
                        Просмотр Анализа
                    </button>
                </div>
            </div>
        </div>
    );
}

export default User;