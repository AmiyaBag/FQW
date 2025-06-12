// server.js (Основной файл)

// Импорт базовых модулей
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const os = require('os');
// const pool = require('./config/db'); // Пул теперь импортируется в роутерах

// Создание экземпляра Express
const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json()); // Для парсинга JSON тел запросов

// --- Импорт Роутеров ---
const authRouter = require('./routes/auth');
const programsRouter = require('./routes/programs');
const organizationsRouter = require('./routes/organizations');
const kksRouter = require('./routes/kks');
const workersRouter = require('./routes/workers');
const documentsRouter = require('./routes/documents');
const statusRouter = require('./routes/status'); // Роутер для статуса ККС

// --- Подключение Роутеров ---
app.use('/api/auth', authRouter);           // Маршруты аутентификации (например, /api/auth/login)
app.use('/api/programs', programsRouter);     // Маршруты для программ
app.use('/api/organizations', organizationsRouter); // Маршруты для организаций
app.use('/api/kks', kksRouter);             // Маршруты для KKS
app.use('/api/workers', workersRouter);       // Маршруты для работников
app.use('/api/documents', documentsRouter);   // Маршруты для документов
app.use('/api', statusRouter);              // Маршруты для статусов (например, /api/user-kks-status)

// --- Обработка несуществующих маршрутов (Опционально, но полезно) ---
app.use((req, res, next) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

// --- Глобальный обработчик ошибок (Опционально, но полезно) ---
app.use((err, req, res, next) => {
    console.error("Глобальная ошибка сервера:", err.stack || err);
    res.status(err.status || 500).json({
        error: 'Внутренняя ошибка сервера',
        // message: err.message // Можно добавить сообщение об ошибке в режиме разработки
    });
});


// --- Запуск сервера ---
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Слушаем на всех интерфейсах

app.listen(PORT, HOST, () => {
    console.log(`Сервер успешно запущен на http://${HOST}:${PORT} и доступен в локальной сети`);
    const networkInterfaces = os.networkInterfaces();
    console.log("Для доступа с других устройств в сети используйте один из следующих IP:");
    Object.keys(networkInterfaces).forEach((ifaceName) => {
        networkInterfaces[ifaceName].forEach((iface) => {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`- http://${iface.address}:${PORT}`);
            }
        });
    });
});

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
      for (const config of iface) {
        if (config.family === 'IPv4' && !config.internal) {
          return config.address;
        }
      }
    }
    return 'localhost';
  }
  
  const LOCAL_IP = getLocalIp();
  process.env.REACT_APP_API_URL = `http://${LOCAL_IP}:${PORT}`;