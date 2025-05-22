// config/db.js
const mysql = require('mysql2/promise');

// Настройка подключения к базе данных
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
});

// Проверка подключения (опционально, можно оставить в server.js или убрать)
pool.getConnection()
    .then(connection => {
        console.log('Успешное подключение к базе данных через пул (из db.js)');
        connection.release();
    })
    .catch(err => {
        console.error('Ошибка подключения к базе данных через пул (из db.js):', err);
        // Возможно, здесь стоит завершить процесс: process.exit(1);
    });

pool.on('error', (err) => {
    console.error('Ошибка пула базы данных:', err);
});

// Экспортируем пул для использования в других модулях
module.exports = pool;