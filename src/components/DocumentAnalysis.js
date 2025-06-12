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

// Import jsPDF and html2canvas
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

    // --- NEW STATES FOR PERIOD FILTERING ---
    const [startDate, setStartDate] = useState(''); // Stores date in YYYY-MM-DD format
    const [endDate, setEndDate] = useState(''); // Stores date in YYYY-MM-DD format
    // --- END NEW STATES ---

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
    }, [user?.workerId, user?.role, selectedWorker]); // Added selectedWorker to dependency to ensure worker list updates correctly on initial load if needed, and to avoid stale closure for initial setSelectedWorker.


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

    // --- Filtered Documents (Memoized) - Now includes date range filter ---
    const filteredDocuments = useMemo(() => {
        if (loading || !Array.isArray(documents)) return [];

        let filtered = documents;

        // Filter by worker for admin role
        if (user?.role === 1) {
            filtered = selectedWorker !== null
                ? documents.filter(doc => doc.ID_Worker === selectedWorker)
                : [];
        }

        // --- NEW: Filter by DateRange ---
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && !isNaN(start.getTime())) {
            filtered = filtered.filter(doc => {
                const docDate = new Date(doc.DateIssue);
                // Compare only date parts, ignore time for 'date' type inputs
                return docDate.setHours(0,0,0,0) >= start.setHours(0,0,0,0);
            });
        }
        if (end && !isNaN(end.getTime())) {
            filtered = filtered.filter(doc => {
                const docDate = new Date(doc.DateIssue);
                // Compare only date parts, ignore time for 'date' type inputs
                return docDate.setHours(0,0,0,0) <= end.setHours(0,0,0,0);
            });
        }
        // --- END NEW ---

        return sortDocuments(filtered, sortConfig);
    }, [documents, selectedWorker, user?.role, loading, sortConfig, startDate, endDate]); // Add startDate, endDate dependencies

    // --- Chart Data Preparation Functions (Memoized with useCallback) ---

    // 1. Yearly & Cumulative Chart Data - Now receives filtered documents
    const prepareYearlyChartData = useCallback((docsToAnalyze) => {
        const documentsByYear = docsToAnalyze.reduce((acc, doc) => {
            try {
                if (doc.DateIssue) {
                    const date = new Date(doc.DateIssue);
                    if (!isNaN(date.getTime())) {
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

        const startYear = minDataYear;
        const endYear = Math.max(maxDataYear, currentYear);

        const allYears = [];
        if (startYear <= endYear) {
            for (let year = startYear; year <= endYear; year++) {
                allYears.push(year);
            }
        } else if (docsToAnalyze.length === 0) {
            // Optionally add current year: allYears.push(currentYear);
        }

        const counts = allYears.map(year => documentsByYear[year] || 0);

        const cumulativeCounts = counts.reduce((acc, count, index) => {
            acc.push(index === 0 ? count : (acc[index - 1] || 0) + count);
            return acc;
        }, []);

        return { years: allYears, counts, cumulativeCounts };
    }, []); // No dependencies for the function definition itself

    // 2. KKS Criteria Chart Data (Processing KKS_Data array) - Now receives filtered documents
    const prepareKKSChartData = useCallback((docsToAnalyze) => {
        const kksAggregated = docsToAnalyze.reduce((acc, doc) => {
            const kksItems = doc.KKS_Data;

            if (Array.isArray(kksItems)) {
                kksItems.forEach(item => {
                    const shortName = item?.shortName?.trim();
                    const fullName = item?.fullName?.trim();

                    if (shortName) {
                        if (!acc[shortName]) {
                            acc[shortName] = {
                                shortName: shortName,
                                fullName: fullName || shortName,
                                count: 0
                            };
                        }
                        acc[shortName].count += 1;
                    } else {
                        console.warn("KKS item missing shortName in doc:", doc.ID_Document, item);
                    }
                });
            } else if (kksItems) {
                console.error("KKS_Data is not an array for doc:", doc.ID_Document, kksItems);
            }

            return acc;
        }, {});

        const sortedShortNames = Object.keys(kksAggregated).sort((a, b) => a.localeCompare(b));

        const labels = sortedShortNames;
        const fullNames = sortedShortNames.map(key => kksAggregated[key].fullName);
        const counts = sortedShortNames.map(key => kksAggregated[key].count);

        console.log("Prepared KKS Chart Data:", { labels, fullNames, counts });

        return {
            labels: labels,
            fullNames: fullNames,
            counts: counts
        };
    }, []);

    // --- Memoized Chart Results (now depend on filteredDocuments) ---
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
    }), [yearlyChartResult, user.role]); // Removed getWorkerName from here, as the chart title now incorporates worker name based on commonOptions

    const cumulativeData = useMemo(() => ({
        labels: yearlyChartResult.years,
        datasets: [{
            label: user.role === 1 ? `Документы по годам с приращением` : 'Документы по годам с приращением',
            data: yearlyChartResult.cumulativeCounts,
            backgroundColor: 'rgba(75, 192, 192, 0.6)', // Teal
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
        }],
    }), [yearlyChartResult, user.role]); // Removed getWorkerName

    const kksData = useMemo(() => ({
        labels: kksChartResult.labels, // Use SHORT names for axis labels
        datasets: [{
            label: user.role === 1 ? `Документы по критериям ККС` : 'Документы по критериям ККС',
            data: kksChartResult.counts,
            backgroundColor: 'rgba(255, 159, 64, 0.6)', // Orange
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
        }],
    }), [kksChartResult, user.role]); // Removed getWorkerName

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

    // --- NEW: handleDownloadReport function ---
    const handleDownloadReport = async () => {
        // Only allow download if user is admin and a worker is selected
        if (user?.role !== 1 || selectedWorker === null) {
            alert('Для скачивания отчета выберите работника.');
            return;
        }

        setLoading(true); // Indicate loading for PDF generation
        const input = document.getElementById('report-table'); // Get the table element by ID

        if (!input) {
            setError('Ошибка: таблица отчета не найдена для экспорта.');
            setLoading(false);
            return;
        }

        try {
            const canvas = await html2canvas(input, {
                scale: 2, // Increase scale for better resolution
                useCORS: true, // If your images/assets are from different origins
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for units, 'a4' for paper size

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const workerName = getWorkerName();
            const fileName = `Отчет_${workerName.replace(/\s/g, '_')}_${startDate}_${endDate}.pdf`;
            pdf.save(fileName);

        } catch (err) {
            console.error("Ошибка при генерации PDF:", err);
            setError('Не удалось сгенерировать PDF-отчет. Пожалуйста, попробуйте еще раз.');
        } finally {
            setLoading(false);
        }
    };
    // --- END NEW ---

    // --- Rendering Logic ---

    // Loading State
    if (loading) return <div className="loading">Загрузка данных...</div>;

    // Error State
    if (error) return (
        <div className="error-container">
            <div className="error">{error}</div>
            <div className="header-buttons" style={{ justifyContent: 'center', marginTop: '20px' }}>
                <button onClick={handleBack} className="back-button">Назад</button>
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
                                value={selectedWorker ?? ''}
                                onChange={handleWorkerChange}
                                className="worker-select"
                                disabled={loading}
                            >
                                {workers.map(worker => (
                                    <option key={worker.ID_Worker} value={worker.ID_Worker}>
                                        {worker.FName_Worker || `ID: ${worker.ID_Worker}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <p className="no-workers-message">Список работников не загружен или пуст.</p>
                    )}

                    {/* --- NEW: Period Filter for Admin --- */}
                    {selectedWorker !== null && (
                        <div className="period-filter-container">
                            <label htmlFor="start-date">Период оценки K:</label>
                            <input
                                type="date"
                                id="start-date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="date-input"
                            />
                            <span>—</span>
                            <input
                                type="date"
                                id="end-date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="date-input"
                            />
                        </div>
                    )}
                    {/* --- END NEW --- */}

                    {/* View Mode Toggle Buttons (Show only if a worker is selected) */}
                    {selectedWorker !== null && (
                        <div className="view-mode-buttons">
                            <button
                                className={`view-mode-button ${viewMode === 'analysis' ? 'active' : ''}`}
                                onClick={() => handleViewModeChange('analysis')}
                                aria-pressed={viewMode === 'analysis'}
                            >
                                Анализ (Графики)
                            </button>
                            <button
                                className={`view-mode-button ${viewMode === 'documents' ? 'active' : ''}`}
                                onClick={() => handleViewModeChange('documents')}
                                aria-pressed={viewMode === 'documents'}
                            >
                                Документы (Список)
                            </button>
                            {/* --- NEW: Download Report Button (visible when in 'documents' view) --- */}
                            {viewMode === 'documents' && filteredDocuments.length > 0 && (
                                <button
                                    onClick={handleDownloadReport}
                                    className="download-report-button"
                                    disabled={loading} // Disable during PDF generation
                                >
                                    {loading ? 'Генерация PDF...' : 'Скачать Отчет (PDF)'}
                                </button>
                            )}
                            {/* --- END NEW --- */}
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

                        {(user.role !== 1 || selectedWorker !== null) && filteredDocuments.length > 0 ? (
                            <>
                                {/* Yearly Chart */}
                                <div className="chart-wrapper">
                                    {yearlyChartResult.years.length > 0 ? (
                                        <Bar options={yearlyOptions} data={yearlyData} />
                                    ) : (
                                        <p className="no-data-message">Нет данных по годам за выбранный период.</p>
                                    )}
                                </div>
                                {/* Cumulative Chart */}
                                <div className="chart-wrapper">
                                    {yearlyChartResult.years.length > 0 ? (
                                        <Bar options={cumulativeOptions} data={cumulativeData} />
                                    ) : (
                                        <p className="no-data-message">Нет данных по годам за выбранный период.</p>
                                    )}
                                </div>
                                {/* KKS Chart */}
                                <div className="chart-wrapper kks-chart-wrapper">
                                    {kksChartResult.labels.length > 0 ? (
                                        <Bar options={kksOptions} data={kksData} />
                                    ) : (
                                        <p className="no-data-message">Нет данных по критериям ККС для отображения за выбранный период.</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="no-data-message full-width-message">
                                {user.role === 1 ?
                                    (selectedWorker === null ? "Пожалуйста, выберите работника для просмотра анализа." : `Нет документов для анализа у выбранного работника (${getWorkerName()}) за выбранный период.`) :
                                    "У вас пока нет загруженных документов для анализа за выбранный период."
                                }
                            </div>
                        )}
                    </div>
                ) : (
                    // --- Documents View (Table) ---
                    <div className="documents-list">
                        {(user.role !== 1 || selectedWorker !== null) && filteredDocuments.length > 0 ? (
                            <table className="documents-table" id="report-table"> {/* ADDED ID HERE */}
                                <thead>
                                    <tr>
                                        {/* NEW: Add FIO and Doljnost for Admin Report */}
                                        {user?.role === 1 && (
                                            <>
                                                <th>ФИО Работника</th>
                                                <th>Должность</th>
                                            </>
                                        )}
                                        {renderSortableHeader('Программа обучения', 'ProgramName')}
                                        {renderSortableHeader('Организация', 'OrgSName')}
                                        {renderSortableHeader('Рег. номер', 'regnumber')}
                                        {renderSortableHeader('Дата выдачи', 'DateIssue')}
                                        {/* NEW: Last DOC Date (Green/Red), PK, PP, KKS Coeff */}
                                        <th>Дата посл. ДОК</th>
                                        <th>Повышения квалификации (ПК)</th>
                                        <th>Проф. переподготовки (ПП)</th>
                                        <th>KКС</th>
                                        <th>Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Prepare data for the report table */}
                                    {filteredDocuments.map((doc) => {
                                        const workerInfo = workers.find(w => w.ID_Worker === doc.ID_Worker);
                                        const FIO = workerInfo ? workerInfo.FName_Worker : 'N/A';
                                        const Doljnost = workerInfo ? workerInfo.Post_Worker : 'N/A'; // Assuming Post_Worker exists

                                        // Calculate Last DOC Date (Green/Red)
                                        const lastDocDate = doc.DateIssue; // Or the actual last DOC date for the worker in the filtered period
                                        const threeYearsAgo = new Date();
                                        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
                                        const isLastDocValid = lastDocDate ? new Date(lastDocDate) >= threeYearsAgo : false;
                                        const lastDocColor = isLastDocValid ? 'green' : 'red';

                                        // Calculate PK and PP for the period (assuming you have this data or need to aggregate)
                                        // For simplicity, let's count docs by Type_ProgDPO for the current worker and period
                                        const pkCount = filteredDocuments.filter(d => d.ID_Worker === doc.ID_Worker && d.Type_ProgDPO === 'Повышение квалификации').length;
                                        const ppCount = filteredDocuments.filter(d => d.ID_Worker === doc.ID_Worker && d.Type_ProgDPO === 'Профессиональная переподготовка').length;

                                        // KKS Coefficient for this worker and period (reuse your kCoefficient logic if needed per worker)
                                        // For a full report table, you might need to calculate K for each worker individually if the current kCoefficient is global
                                        // For now, let's just display the global K. To make it per-worker, you'd need to pre-process `documents` to group by worker.
                                        // A simpler approach for the table is to just show the K for the currently selected worker based on the current filter.
                                        const workerKCoefficient = kCoefficient; // This is the K for the currently selected worker based on filteredDocuments

                                        return (
                                            <tr key={doc.ID_Document}>
                                                {user?.role === 1 && (
                                                    <>
                                                        <td>{FIO}</td>
                                                        <td>{Doljnost}</td>
                                                    </>
                                                )}
                                                <td>{doc.ProgramName || 'N/A'}</td>
                                                <td>{doc.OrgSName || doc.OrgFName || 'N/A'}</td>
                                                <td>{doc.regnumber || 'N/A'}</td>
                                                <td>{formatDate(doc.DateIssue)}</td>
                                                {/* NEW: Last DOC Date, PK, PP, KKS Coeff */}
                                                <td style={{ color: lastDocColor }}>{formatDate(lastDocDate)}</td>
                                                <td>{pkCount}</td>
                                                <td>{ppCount}</td>
                                                <td>{workerKCoefficient}</td> {/* Display K for the selected worker/period */}
                                                <td>
                                                    <button
                                                        className="details-button"
                                                        onClick={() => openModal(doc)}
                                                    >
                                                        Дополнительно
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="no-data-message full-width-message">
                                {user.role === 1 ?
                                    (selectedWorker === null ? "Пожалуйста, выберите работника для просмотра списка документов." : `Нет документов для отображения у выбранного работника (${getWorkerName()}) за выбранный период.`) :
                                    "У вас пока нет загруженных документов за выбранный период."
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
                contentLabel="Детали документа"
                className="modal-content"
                overlayClassName="modal-overlay"
                ariaHideApp={true}
            >
                {selectedDocumentForModal ? (
                    <>
                        <h2>Детали документа № {selectedDocumentForModal.regnumber || selectedDocumentForModal.ID_Document}</h2>
                        <button onClick={closeModal} className="modal-close-button" aria-label="Закрыть">&times;</button>

                        <div className="modal-details-grid">
                            <p><strong>Работник:</strong> {selectedDocumentForModal.WorkerName || getWorkerName() || 'N/A'}</p>
                            <p><strong>Программа обучения:</strong> {selectedDocumentForModal.ProgramName || 'N/A'}</p>
                            <p><strong>Организация (полное):</strong> {selectedDocumentForModal.OrgFName || 'N/A'}</p>
                            <p><strong>Организация (краткое):</strong> {selectedDocumentForModal.OrgSName || 'N/A'}</p>
                            <p><strong>Регистрационный номер:</strong> {selectedDocumentForModal.regnumber || 'N/A'}</p>
                            <p><strong>Дата выдачи:</strong> {formatDate(selectedDocumentForModal.DateIssue)}</p>
                            <p><strong>Тип программы:</strong> {selectedDocumentForModal.Type_ProgDPO || 'N/A'}</p>
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

export default DocumentAnalysis;