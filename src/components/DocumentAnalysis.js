import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './DocumentAnalysis.css'; // Make sure this CSS file exists and is styled appropriately

const apiUrl = process.env.REACT_APP_API_URL

// Set the app element for react-modal accessibility
Modal.setAppElement('#root'); // Adjust '#root' if your app's root element has a different ID

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

function DocumentAnalysis() {
    // State Variables
    const [documents, setDocuments] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [selectedWorker, setSelectedWorker] = useState(null); // Store worker ID
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState('analysis'); // 'analysis' or 'documents'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDocumentForModal, setSelectedDocumentForModal] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'DateIssue', direction: 'descending' }); // Added sort state
    
    // Hooks
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user')); // Assuming user info is stored here

    // Sort function
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
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

    // Render sortable header
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
        // Ensure workers is an array before using find
        if (user?.role !== 1 || !selectedWorker || !Array.isArray(workers)) return '';
        const worker = workers.find(w => w.ID_Worker === selectedWorker);
        return worker ? worker.FName_Worker : `ID ${selectedWorker}`; // Use FName_Worker or adjust as needed
    }, [user?.role, selectedWorker, workers]); // Dependencies for getWorkerName

    // --- useEffect for Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                // Fetch documents based on user ID and role
                const documentsResponse = await axios.get(`${apiUrl}/api/documents`, {
                    params: { userId: user.workerId, role: user.role }
                });

                // Validate documents response
                if (!Array.isArray(documentsResponse.data)) {
                    console.error('Documents API did not return an array:', documentsResponse.data);
                    throw new Error('Неверный формат данных документов');
                }
                setDocuments(documentsResponse.data);
                console.log("Frontend: Documents received:", documentsResponse.data.length);
                 if (documentsResponse.data.length > 0) {
                     // Log the structure of KKS_Data for the first doc for verification
                     console.log("Frontend: Sample KKS_Data in first doc:", documentsResponse.data[0]?.KKS_Data);
                 }

                // Fetch workers list if the user is an admin (role === 1)
                if (user.role === 1) {
                    const workersResponse = await axios.get(`${apiUrl}/api/workers`);

                    // Validate workers response
                    if (!Array.isArray(workersResponse.data)) {
                         console.error("Workers API did not return an array:", workersResponse.data);
                         setWorkers([]); // Set empty array on error
                    } else {
                        setWorkers(workersResponse.data);
                        // Set the initial selected worker ONLY if workers exist and NO worker is currently selected
                        // This prevents resetting selection if the component re-renders for other reasons
                        if (workersResponse.data.length > 0 && selectedWorker === null) {
                            setSelectedWorker(workersResponse.data[0].ID_Worker);
                        } else if (workersResponse.data.length === 0) {
                             setSelectedWorker(null); // No workers available
                        }
                    }
                } else {
                    // Not an admin, clear workers and selection
                    setWorkers([]);
                    setSelectedWorker(null);
                }

            } catch (err) {
                console.error('Ошибка при загрузке данных:', err);
                setError(err.response?.data?.error || err.message || 'Не удалось загрузить данные');
            } finally {
                setLoading(false);
            }
        };

        if (user?.workerId) {
            fetchData();
        } else {
            setError("Пользователь не найден. Пожалуйста, войдите снова.");
            setLoading(false);
            // Optional: Redirect to login
            // navigate('/login');
        }
        // Dependency array includes user info and selectedWorker (to potentially refetch if admin changes worker, though filtering handles display)
        // Note: Adding selectedWorker here caused a re-fetch loop in v1 - be careful. Let's keep it based on user info for initial load.
        // Re-filtering happens via useMemo when selectedWorker changes.
    }, [user?.workerId, user?.role]); // Re-run effect if user ID or role changes


    // --- Event Handlers ---
    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleBack = () => {
        // Navigate back based on user role
        navigate(user?.role === 1 ? '/admin' : '/user'); // Navigate to admin or user dashboard
    };

    const handleWorkerChange = (event) => {
        const workerIdValue = event.target.value;
        // Parse to integer, handle potential empty string value from a "--Select--" option
        const workerId = workerIdValue ? parseInt(workerIdValue, 10) : null;
        setSelectedWorker(workerId);
    };

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
    };

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

    // --- Chart Data Preparation Functions (Memoized with useCallback) ---

    // 1. Yearly & Cumulative Chart Data
    const prepareYearlyChartData = useCallback((docs) => {
        const documentsByYear = docs.reduce((acc, doc) => {
            try {
                // Ensure DateIssue exists and is a valid date string
                if (doc.DateIssue) {
                    const date = new Date(doc.DateIssue);
                    if (!isNaN(date.getTime())) { // Check if date is valid
                        const year = date.getFullYear();
                        acc[year] = (acc[year] || 0) + 1;
                    } else {
                        console.warn("Invalid DateIssue format:", doc.ID_Document, doc.DateIssue);
                    }
                } else {
                    console.warn("Missing DateIssue:", doc.ID_Document);
                }
            } catch (e) {
                console.error("Error parsing DateIssue:", doc.ID_Document, doc.DateIssue, e);
            }
            return acc;
        }, {});

        const yearsInData = Object.keys(documentsByYear).map(Number).sort((a, b) => a - b);
        const currentYear = new Date().getFullYear();

        const minDataYear = yearsInData.length > 0 ? Math.min(...yearsInData) : currentYear;
        const maxDataYear = yearsInData.length > 0 ? Math.max(...yearsInData) : currentYear;

        // Determine the range of years for the chart (from earliest data year to at least the current year)
        const startYear = minDataYear;
        const endYear = Math.max(maxDataYear, currentYear);

        const allYears = [];
        // Populate all years in the range
        if (startYear <= endYear) {
            for (let year = startYear; year <= endYear; year++) {
                allYears.push(year);
            }
        } else if (docs.length === 0) { // Handle case with no documents - maybe show current year?
            // Optionally add current year: allYears.push(currentYear);
        }

        // Map counts for each year in the final range
        const counts = allYears.map(year => documentsByYear[year] || 0);

        // Calculate cumulative counts
        const cumulativeCounts = counts.reduce((acc, count, index) => {
            acc.push(index === 0 ? count : (acc[index - 1] || 0) + count);
            return acc;
        }, []);

        return { years: allYears, counts, cumulativeCounts };
    }, []); // useCallback as the function definition itself doesn't depend on props/state

    // 2. KKS Criteria Chart Data (Processing KKS_Data array)
    const prepareKKSChartData = useCallback((docs) => {
        // Aggregate counts per KKS criterion (using shortName as key)
        const kksAggregated = docs.reduce((acc, doc) => {
            const kksItems = doc.KKS_Data; // Expecting an array like [{ shortName: '..', fullName: '..' }, ...]

            // Check if kksItems is a valid array
            if (Array.isArray(kksItems)) {
                kksItems.forEach(item => {
                    const shortName = item?.shortName?.trim(); // Use optional chaining and trim
                    const fullName = item?.fullName?.trim();

                    if (shortName) { // Process only if shortName exists
                        if (!acc[shortName]) {
                            // Initialize entry for this shortName if it's the first time seen
                            acc[shortName] = {
                                shortName: shortName,
                                fullName: fullName || shortName, // Use shortName as fallback if fullName is missing
                                count: 0
                            };
                        }
                        // Increment the count for this KKS criterion
                        acc[shortName].count += 1;
                    } else {
                         console.warn("KKS item missing shortName in doc:", doc.ID_Document, item);
                    }
                });
            } else if (kksItems) {
                 // Log if KKS_Data exists but isn't an array (should be handled by backend ideally)
                 console.error("KKS_Data is not an array for doc:", doc.ID_Document, kksItems);
            }
            // If KKS_Data is null/undefined or invalid, just skip and continue

            return acc;
        }, {}); // Initial value is an empty object

        // Sort aggregated data by shortName for consistent chart axis order
        const sortedShortNames = Object.keys(kksAggregated).sort((a, b) => a.localeCompare(b));

        // Extract data arrays needed for Chart.js
        const labels = sortedShortNames; // X-axis labels will be the Short Names
        const fullNames = sortedShortNames.map(key => kksAggregated[key].fullName); // Full Names for tooltips
        const counts = sortedShortNames.map(key => kksAggregated[key].count); // Bar heights

        console.log("Prepared KKS Chart Data:", { labels, fullNames, counts }); // Log for debugging

        return {
            labels: labels,       // Short names for axis
            fullNames: fullNames, // Full names for tooltips
            counts: counts        // Counts for bar heights
        };
    }, []); // useCallback as the function definition is stable

    // --- Memoized Chart Results ---
    // These recalculate only when filteredDocuments or the prep function changes (which it won't due to useCallback)
    const yearlyChartResult = useMemo(() => prepareYearlyChartData(filteredDocuments), [filteredDocuments, prepareYearlyChartData]);
    const kksChartResult = useMemo(() => prepareKKSChartData(filteredDocuments), [filteredDocuments, prepareKKSChartData]);

    // --- Расчет коэффициента K ---
    const calculateK = useCallback((cumulativeCounts) => {
        if (!Array.isArray(cumulativeCounts) || cumulativeCounts.length < 2) return 0;
        
        let K = 0;
        for (let i = 1; i < cumulativeCounts.length; i++) {
            const diff = cumulativeCounts[i] - cumulativeCounts[i-1];
            if (diff > 0) {
                K += diff;
            }
        }
        return K;
    }, []);

    const kCoefficient = useMemo(() => {
        return calculateK(yearlyChartResult.cumulativeCounts);
    }, [yearlyChartResult.cumulativeCounts, calculateK]);

    // --- Memoized Chart Data Objects (for react-chartjs-2) ---
    const yearlyData = useMemo(() => ({
        labels: yearlyChartResult.years,
        datasets: [{
            label: user.role === 1 ? `Документы по годам` : 'Документы по годам',
            data: yearlyChartResult.counts,
            backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
        }],
    }), [yearlyChartResult, user.role, getWorkerName]); // Update when results or worker name changes

    const cumulativeData = useMemo(() => ({
        labels: yearlyChartResult.years,
        datasets: [{
            label: user.role === 1 ? `Документы по годам с приращением` : 'Документы по годам с приращением',
            data: yearlyChartResult.cumulativeCounts,
            backgroundColor: 'rgba(75, 192, 192, 0.6)', // Teal
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
        }],
    }), [yearlyChartResult, user.role, getWorkerName]); // Update when results or worker name changes

    const kksData = useMemo(() => ({
        labels: kksChartResult.labels, // Use SHORT names for axis labels
        datasets: [{
            label: user.role === 1 ? `Документы по критериям ККС` : 'Документы по критериям ККС',
            data: kksChartResult.counts,
            backgroundColor: 'rgba(255, 159, 64, 0.6)', // Orange
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
        }],
    }), [kksChartResult, user.role, getWorkerName]); // Update when KKS results or worker name changes

    // --- Chart Options (Memoized) ---

    // Generator for common options
     const commonOptions = useMemo(() => (titleText, xAxisText) => ({
         responsive: true,
         maintainAspectRatio: false, // Allow chart to fill container height
         plugins: {
             legend: {
                 position: 'top', // Position legend at the top
             },
             title: {
                 display: true,
                 text: titleText, // Dynamic title
                 font: { size: 16 }, // Set title font size
             },
             tooltip: { // Base tooltip configuration
                 mode: 'index', // Show tooltips for all datasets at that index
                 intersect: false, // Tooltip appears even if not directly hovering over the bar
             }
         },
         scales: {
             x: { // X-axis configuration
                 title: {
                     display: true,
                     text: xAxisText, // Dynamic X-axis label
                 },
                 ticks: {
                     autoSkip: true, // Automatically skip labels if they overlap
                     maxRotation: 45, // Max rotation for labels
                     minRotation: 0 // Min rotation
                 }
             },
             y: { // Y-axis configuration
                 beginAtZero: true, // Start Y-axis at 0
                 title: {
                     display: true,
                     text: 'Количество документов', // Y-axis label
                 },
                 ticks: {
                      // Ensure integer ticks for document counts
                     precision: 0
                 }
             },
         },
     }), []); // No dependencies for the function generator itself

    // Specific options for each chart using the common generator
    const yearlyOptions = useMemo(() => commonOptions(
        user.role === 1 ? `Количество документов по годам (${getWorkerName() || 'Выбор...'})` : 'Документы по годам',
        'Год' // X-axis title
    ), [commonOptions, user.role, getWorkerName]);

    const cumulativeOptions = useMemo(() => commonOptions(
        user.role === 1 ? `Документы по годам с приращением (${getWorkerName() || 'Выбор...'})` : 'Документы по годам с приращением',
        'Год' // X-axis title
    ), [commonOptions, user.role, getWorkerName]);

    // KKS Options with custom tooltip callback
    const kksOptions = useMemo(() => {
        const title = user.role === 1
            ? `Распределение по критериям ККС (${getWorkerName() || 'Выбор...'})`
            : 'Распределение документов по критериям ККС';
        const baseOpts = commonOptions(title, 'Критерий ККС'); // X-axis title notes abbreviation

        // Customize tooltips specifically for the KKS chart to show full names
        baseOpts.plugins.tooltip = {
            ...baseOpts.plugins.tooltip, // Keep existing base settings (mode, intersect)
            callbacks: {
                label: function(context) { // Use 'function' to access 'this' if needed, or arrow function
                    try {
                        const labelIndex = context.dataIndex; // Index of the data point
                        const count = context.parsed.y ?? context.dataset.data[labelIndex] ?? 0; // Get count safely

                        // Access the fullNames array prepared earlier (available via closure)
                        // kksChartResult.fullNames should be available in this scope
                        const fullName = kksChartResult.fullNames?.[labelIndex]; // Use optional chaining

                        // Use the full name if available, otherwise fallback to the axis label (short name)
                        const displayLabel = fullName || context.label || ''; // context.label is the short name

                        return `${displayLabel}: ${count}`; // Tooltip format: "Full Name (or Short Name): Count"
                    } catch (e) {
                        console.error("Error in KKS tooltip callback:", e);
                        // Provide a fallback tooltip text in case of an error
                        return `${context.label || 'Ошибка'}: ${context.parsed.y || 0}`;
                    }
                }
            }
        };

        return baseOpts;

    }, [commonOptions, user.role, getWorkerName, kksChartResult.fullNames]); // Dependency on fullNames is crucial for the tooltip


    // --- Helper Function: Format Date (Memoized) ---
     const formatDate = useCallback((dateString) => {
         if (!dateString) return 'N/A'; // Handle null or empty date strings
         try {
             const date = new Date(dateString);
             // Check if the date object is valid
             return isNaN(date.getTime()) ? 'Неверная дата' : date.toLocaleDateString('ru-RU'); // Use Russian locale for DD.MM.YYYY
         } catch (e) {
             console.error("Error formatting date:", dateString, e);
             return 'Ошибка даты'; // Return error string if parsing fails
         }
     }, []); // No dependencies needed


    // --- Rendering Logic ---

    // Loading State
    if (loading) return <div className="loading">Загрузка данных...</div>;

    // Error State
    if (error) return (
        <div className="error-container">
            <div className="error">{error}</div>
            {/* Provide buttons even on error */}
             <div className="header-buttons" style={{ justifyContent: 'center', marginTop: '20px' }}>
                 <button onClick={handleBack} className="back-button">Назад</button>
                  {/* Optionally show logout even on error */}
                 {/* <button onClick={handleLogout} className="logout-button">Выйти</button> */}
             </div>
        </div>
    );

    // Main Content Render
    return (
        <div className="analysis-container">
            {/* Header Section */}
            <div className="analysis-header">
                <h1>Анализ документов</h1>
                <div className="header-buttons">
                    <button onClick={handleBack} className="back-button">Назад</button>
                    <button onClick={handleLogout} className="logout-button">Выйти</button>
                </div>
            </div>

            {/* Controls Section (Admin only) */}
            {user?.role === 1 && (
                <div className="controls-container">
                    {/* Worker Selector Dropdown */}
                     {workers.length > 0 ? (
                         <div className="worker-selector">
                             <label htmlFor="worker-select">Работник:</label>
                             <select
                                 id="worker-select"
                                 value={selectedWorker ?? ''} // Controlled component value, handle null state
                                 onChange={handleWorkerChange}
                                 className="worker-select"
                                 disabled={loading} // Disable while loading (though loading screen handles this mostly)
                             >
                                  {/* Optional: Default unselectable option */}
                                 {/* <option value="" disabled>-- Выберите работника --</option> */}
                                 {workers.map(worker => (
                                     <option key={worker.ID_Worker} value={worker.ID_Worker}>
                                         {/* Display worker name - ensure FName_Worker or similar exists */}
                                         {worker.FName_Worker || `ID: ${worker.ID_Worker}`}
                                     </option>
                                 ))}
                             </select>
                         </div>
                     ) : (
                          // Message if workers list couldn't be loaded or is empty
                         <p className="no-workers-message">Список работников не загружен или пуст.</p>
                     )}

                    {/* View Mode Toggle Buttons (Show only if a worker is selected) */}
                    {selectedWorker !== null && (
                        <div className="view-mode-buttons">
                            <button
                                className={`view-mode-button ${viewMode === 'analysis' ? 'active' : ''}`}
                                onClick={() => handleViewModeChange('analysis')}
                                aria-pressed={viewMode === 'analysis'} // Accessibility
                            >
                                Анализ (Графики)
                            </button>
                            <button
                                className={`view-mode-button ${viewMode === 'documents' ? 'active' : ''}`}
                                onClick={() => handleViewModeChange('documents')}
                                aria-pressed={viewMode === 'documents'} // Accessibility
                            >
                                Документы (Список)
                            </button>
                        </div>
                    )}
                     {selectedWorker === null && workers.length > 0 && (
                          <p className="select-worker-prompt">Выберите работника для просмотра данных.</p>
                     )}
                </div>
            )}

            {/* Content Area: Charts or Table */}
            <div className="content-area">
                {viewMode === 'analysis' ? (
                    // --- Analysis View (Charts) ---
                    <div className="charts-grid">
                        {/* Коэффициент K */}
                        <div className="k-coefficient-container">
                            <h3>Коэффициент динамики ККС</h3>
                            <div className="k-value">{kCoefficient}</div>
                            <div className="k-description">
                                Коэффициент K показывает сумму приращений количества ДОК, полученных к каждому году в периоде оценки.
                                Чем выше значение K, тем более прогрессивным является рост квалификации работника.
                            </div>
                        </div>

                        {/* Conditional Rendering based on whether there are documents to display */}
                         {(user.role !== 1 || selectedWorker !== null) && filteredDocuments.length > 0 ? (
                             <>
                                 {/* Yearly Chart */}
                                 <div className="chart-wrapper">
                                      {yearlyChartResult.years.length > 0 ? (
                                          <Bar options={yearlyOptions} data={yearlyData} />
                                      ) : (
                                          <p className="no-data-message">Нет данных по годам.</p>
                                      )}
                                 </div>
                                 {/* Cumulative Chart */}
                                 <div className="chart-wrapper">
                                      {yearlyChartResult.years.length > 0 ? (
                                          <Bar options={cumulativeOptions} data={cumulativeData} />
                                      ) : (
                                            <p className="no-data-message">Нет данных по годам.</p> // Redundant but harmless
                                      )}
                                 </div>
                                 {/* KKS Chart (Takes full width potentially on smaller screens, adjust CSS needed) */}
                                 <div className="chart-wrapper kks-chart-wrapper">
                                     {/* Check if there are KKS labels to display */}
                                      {kksChartResult.labels.length > 0 ? (
                                          <Bar options={kksOptions} data={kksData} />
                                      ) : (
                                          <p className="no-data-message">Нет данных по критериям ККС для отображения.</p>
                                      )}
                                 </div>
                             </>
                         ) : (
                             // Message when no documents are available for the current view/filter
                             <div className="no-data-message full-width-message">
                                 {user.role === 1 ?
                                     (selectedWorker === null ? "Пожалуйста, выберите работника для просмотра анализа." : `Нет документов для анализа у выбранного работника (${getWorkerName()}).`) :
                                     "У вас пока нет загруженных документов для анализа."
                                 }
                             </div>
                         )}
                    </div>
                ) : (
                    // --- Documents View (Table) ---
                     <div className="documents-list">
                         {/* Conditional Rendering for the table */}
                          {(user.role !== 1 || selectedWorker !== null) && filteredDocuments.length > 0 ? (
                              <table className="documents-table">
                                  <thead>
                                    <tr>
                                        {/* Show Worker column only for Admin */}
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
                                              {/* Document Details cells */}
                                              <td>{doc.ProgramName || 'N/A'}</td>
                                              <td>{doc.OrgSName || doc.OrgFName || 'N/A'}</td> {/* Display Short name, fallback to Full */}
                                              <td>{doc.regnumber || 'N/A'}</td>
                                              <td>{formatDate(doc.DateIssue)}</td> {/* Use formatted date */}
                                              <td>
                                                  {/* Button to open the modal */}
                                                  <button
                                                      className="details-button"
                                                      onClick={() => openModal(doc)} // Pass the whole document object
                                                  >
                                                      Дополнительно
                                                  </button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          ) : (
                              // Message when no documents are available for the table view
                              <div className="no-data-message full-width-message">
                                  {user.role === 1 ?
                                      (selectedWorker === null ? "Пожалуйста, выберите работника для просмотра списка документов." : `Нет документов для отображения у выбранного работника (${getWorkerName()}).`) :
                                      "У вас пока нет загруженных документов."
                                  }
                              </div>
                          )}
                     </div>
                )}
            </div>

            {/* Modal Definition */}
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

                        {/* Modal Body with Details */}
                        <div className="modal-details-grid">
                             {/* Display various document details */}
                              <p><strong>Работник:</strong> {selectedDocumentForModal.WorkerName || getWorkerName() || 'N/A'}</p>
                              <p><strong>Программа обучения:</strong> {selectedDocumentForModal.ProgramName || 'N/A'}</p>
                              <p><strong>Организация (полное):</strong> {selectedDocumentForModal.OrgFName || 'N/A'}</p>
                              <p><strong>Организация (краткое):</strong> {selectedDocumentForModal.OrgSName || 'N/A'}</p>
                              <p><strong>Регистрационный номер:</strong> {selectedDocumentForModal.regnumber || 'N/A'}</p>
                              <p><strong>Дата выдачи:</strong> {formatDate(selectedDocumentForModal.DateIssue)}</p>
                              {/* Add any other relevant fields from your 'doc' object */}

                              {/* Display KKS Criteria */}
                             <p className="kks-details">
                                 <strong>Критерии ККС:</strong>
                                 {/* Check if KKS_Data is an array and has items */}
                                  {Array.isArray(selectedDocumentForModal.KKS_Data) && selectedDocumentForModal.KKS_Data.length > 0
                                      ? selectedDocumentForModal.KKS_Data
                                            .map(k => k.fullName || k.shortName) // Prefer full name, fallback to short
                                            .filter(Boolean) // Remove any null/empty values
                                            .join(', ') // Join with comma and space
                                      : 'Нет данных'} {/* Message if no KKS data or not an array */}
                             </p>
                        </div>
                    </>
                ) : (
                     // Fallback message if modal opens before data is ready (shouldn't usually happen)
                    <p>Загрузка деталей...</p>
                )}
            </Modal>
        </div>
    );
}

export default DocumentAnalysis;