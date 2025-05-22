import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './User.css'; // Убедитесь, что стили подключены и обновлены

const apiUrl = process.env.REACT_APP_API_URL;

// --- Helper Functions (без изменений) ---
const isTrainingNeeded = (lastTrainingDateStr) => {
    // ... (ваш существующий код)
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
    // ... (ваш существующий код)
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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Новые состояния для рекомендаций по конкретному ККС ---
    const [visibleRecommendationsKksId, setVisibleRecommendationsKksId] = useState(null); // ID ККС, чьи рекомендации показываем
    const [currentRecommendations, setCurrentRecommendations] = useState([]); // Список программ для выбранного ККС
    const [isCurrentRecLoading, setIsCurrentRecLoading] = useState(false); // Загрузка для выбранного ККС
    const [currentRecError, setCurrentRecError] = useState(null); // Ошибка для выбранного ККС
    // --- ---

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
                setIsLoading(false);
            }
        } else {
            setError("Пользователь не аутентифицирован.");
            setIsLoading(false);
            // navigate('/login');
        }
    }, []);

    // Эффект для загрузки ТОЛЬКО статуса ККС
    useEffect(() => {
        if (!user || !user.workerId) {
            if (user === null && !isLoading) {
                setError("Данные пользователя отсутствуют.");
            }
            return;
        }

        if (user.role !== 0) {
            console.log("Пользователь не является работником (role != 0), данные ККС не запрашиваются.");
            setKksStatus([]);
            setIsLoading(false);
            return;
        }

        const fetchKksStatus = async () => {
            setIsLoading(true);
            setError(null);
            setKksStatus([]);
            // Сбрасываем состояния рекомендаций при перезагрузке статуса
            setVisibleRecommendationsKksId(null);
            setCurrentRecommendations([]);
            setIsCurrentRecLoading(false);
            setCurrentRecError(null);

            try {
                console.log(`Workspaceing KKS status for workerId: ${user.workerId}`);
                const kksResponse = await axios.get(`${apiUrl}/api/user-kks-status?userId=${user.workerId}`);
                const fetchedKksStatus = kksResponse.data || [];
                setKksStatus(fetchedKksStatus);
                console.log("KKS Status Response:", fetchedKksStatus);
            } catch (kksErr) {
                console.error('Ошибка при загрузке статуса ККС:', kksErr);
                setError(kksErr.response?.data?.error || 'Не удалось загрузить статус обучения по ККС.');
                setKksStatus([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchKksStatus();

    }, [user]); // Зависимость только от user

    // --- Обработчик для показа/скрытия и загрузки рекомендаций ---
    const handleToggleRecommendations = useCallback(async (kksId) => {
        // Если кликнули по той же кнопке, просто скрываем
        if (visibleRecommendationsKksId === kksId) {
            setVisibleRecommendationsKksId(null);
            setCurrentRecommendations([]); // Очищаем список
            return;
        }

        // Показываем лоадер и сбрасываем предыдущие данные/ошибки
        setVisibleRecommendationsKksId(kksId);
        setIsCurrentRecLoading(true);
        setCurrentRecommendations([]);
        setCurrentRecError(null);

        try {
            console.log(`Workspaceing recommended programs for KKS ID: ${kksId}`);
            // Запрос ТОЛЬКО для ОДНОГО kksId
            const recResponse = await axios.get(`${apiUrl}/api/programs/recommended?kksIds=${kksId}`);
            console.log("Recommended Programs Response for KKS", kksId, ":", recResponse.data);
            setCurrentRecommendations(recResponse.data || []);
        } catch (recErr) {
            console.error(`Ошибка при загрузке рекомендуемых программ для KKS ${kksId}:`, recErr);
            setCurrentRecError(recErr.response?.data?.error || 'Не удалось загрузить рекомендуемые программы.');
            setCurrentRecommendations([]); // Убедимся, что пусто при ошибке
        } finally {
            setIsCurrentRecLoading(false); // Загрузка завершена (успех/ошибка)
        }
    }, [visibleRecommendationsKksId, apiUrl]); // Зависим от visibleRecommendationsKksId для логики скрытия
    // --- ---

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

    if (isLoading && !user) {
        return <div className="loading">Загрузка данных пользователя...</div>;
    }
    if (error && !isLoading && !user) { // Показываем общую ошибку, если нет пользователя
        return <div className="error-container"><div className="error">{error}</div> <button onClick={() => navigate('/login')}>Войти</button></div>;
    }
    if (!user) {
        return <div className="error-container"><div className="error">Не удалось загрузить данные пользователя.</div><button onClick={() => navigate('/login')}>Войти</button></div>;
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
                        <h2>Статус обучения по ККС</h2>
                        {isLoading && <p>Загрузка статуса ККС...</p>}
                        {/* Показываем ошибку загрузки ККС, если она не связана с отсутствием пользователя */}
                        {error && !isLoading && <p className="error-message">Ошибка загрузки статуса ККС: {error}</p>}

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
                                                            <div style={{ marginTop: '5px' }}> {/* Добавляем небольшой отступ сверху для кнопки */}
                                                                <button
                                                                    onClick={() => handleToggleRecommendations(kks.ID_KKS)}
                                                                    className="recommendation-toggle-button"
                                                                    disabled={isCurrentRecLoading && isVisible} // Блокируем кнопку во время загрузки для этого ККС
                                                                >
                                                                    {/* Меняем текст кнопки в зависимости от состояния */}
                                                                    {isVisible ? 'Скрыть программы' : 'Показать программы'}
                                                                    {/* Можно добавить спиннер */}
                                                                    {isCurrentRecLoading && isVisible && '...'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                                {/* --- Условный рендеринг рекомендаций ПОД строкой --- */}
                                                {isVisible && (
                                                    <tr className="recommendations-row">
                                                        {/* Объединяем ячейки для отображения рекомендаций */}
                                                        <td colSpan="3">
                                                            <div className="recommendations-details">
                                                                {isCurrentRecLoading && <p>Загрузка рекомендуемых программ...</p>}
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
                        {/* Сообщение, если ККС вообще нет */}
                        {!isLoading && !error && kksStatus.length === 0 && (
                            <p>Нет данных о прохождении обучения по ККС.</p>
                        )}
                    </div>
                )}

                {/* Убираем старые блоки уведомлений и рекомендаций */}
                {/* {user?.role === 0 && kksNeedingTraining.length > 0 && (...) } */}
                {/* {user?.role === 0 && (...) } */}

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