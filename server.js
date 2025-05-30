const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Устанавливаем путь к FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка соединения с базой данных
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "pblog"
});

// Секретный ключ для JWT
const SECRET_KEY = "game";

// Создаем необходимые директории при запуске сервера
const uploadDirs = [
    'public/uploads',
    'public/uploads/videos',
    'public/uploads/thumbnails',
    'public/uploads/avatars'
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Создана директория: ${dir}`);
    }
});

// Настройка хранилища для видео и обложек
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let dir;
        if (file.fieldname === 'video') {
            dir = 'public/uploads/videos';
        } else if (file.fieldname === 'thumbnail') {
            dir = 'public/uploads/thumbnails';
        }
        
        // Проверяем и создаем директорию, если её нет
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Создана директория: ${dir}`);
        }
        
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Настройка хранилища для аватаров
const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/avatars';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Создаем загрузчик для видео и обложек
const uploadVideo = multer({ 
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB
        files: 2 // Максимум 2 файла (видео и обложка)
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else if (file.fieldname === 'thumbnail' && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Неверный тип файла'));
        }
    }
});

// Создаем загрузчик для аватаров
const uploadAvatar = multer({ 
    storage: avatarStorage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Неверный тип файла. Пожалуйста, загрузите изображение.'));
        }
    }
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Настройка статических файлов с правильными MIME-типами
app.use('/uploads', (req, res, next) => {
    const filePath = path.join(__dirname, 'public', req.path);
    const ext = path.extname(filePath).toLowerCase();
    
    // Устанавливаем правильные MIME-типы для видео
    const mimeTypes = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.wmv': 'video/x-ms-wmv',
        '.flv': 'video/x-flv',
        '.mkv': 'video/x-matroska',
        '.mpeg': 'video/mpeg',
        '.mpg': 'video/mpeg'
    };

    if (mimeTypes[ext]) {
        res.setHeader('Content-Type', mimeTypes[ext]);
    }
    
    next();
});

// Middleware для конвертации видео в MP4 при необходимости
app.use('/uploads/videos', async (req, res, next) => {
    const filePath = path.join(__dirname, 'public', req.path);
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Файл не найден');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mp4Path = filePath.replace(/\.[^.]+$/, '.mp4');

    // Если файл уже MP4, просто отдаем его
    if (ext === '.mp4') {
        return next();
    }

    // Если запрашивается не MP4 файл и MP4 версия не существует
    if (!fs.existsSync(mp4Path)) {
        try {
            await new Promise((resolve, reject) => {
                ffmpeg(filePath)
                    .output(mp4Path)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .on('end', () => {
                        console.log('Видео успешно конвертировано в MP4:', mp4Path);
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Ошибка при конвертации видео:', err);
                        reject(err);
                    })
                    .run();
            });
        } catch (error) {
            console.error('Ошибка при конвертации видео:', error);
            // Если конвертация не удалась, отдаем оригинальный файл
            return next();
        }
    }

    // Если запрашивается не MP4 файл, но MP4 версия существует
    if (ext !== '.mp4' && fs.existsSync(mp4Path)) {
        req.url = req.url.replace(/\.[^.]+$/, '.mp4');
    }

    next();
});

// Обслуживание статических файлов
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/uploads/videos', express.static(path.join(__dirname, 'public/uploads/videos')));
app.use('/uploads/thumbnails', express.static(path.join(__dirname, 'public/uploads/thumbnails')));
app.use('/uploads/avatars', express.static(path.join(__dirname, 'public/uploads/avatars')));

// Подключение к базе данных
db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err);
        return;
    }
    console.log('Подключено к базе данных MySQL');

    // Проверяем и добавляем необходимые поля
    checkAndAddAdminField();
    checkAndAddVerificationFields();
});

// Функция для проверки и добавления поля is_admin
const checkAndAddAdminField = async () => {
    try {
        // Проверяем существование поля is_admin
        const [columns] = await db.promise().query(`
            SHOW COLUMNS FROM users LIKE 'is_admin'
        `);

        if (columns.length === 0) {
            // Добавляем поле is_admin, если его нет
            await db.promise().query(`
                ALTER TABLE users 
                ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
            `);

            // Делаем первого пользователя администратором
            await db.promise().query(`
                UPDATE users 
                SET is_admin = TRUE 
                WHERE user_id = 1
            `);

            console.log('Поле is_admin успешно добавлено в таблицу users');
        }
    } catch (error) {
        console.error('Ошибка при проверке поля is_admin:', error);
    }
};

// Функция для проверки и добавления полей верификации
const checkAndAddVerificationFields = async () => {
    try {
        // Проверяем существование поля verification_token
        const [columns] = await db.promise().query(`
            SHOW COLUMNS FROM users LIKE 'verification_token'
        `);

        if (columns.length === 0) {
            // Добавляем поля верификации, если их нет
            await db.promise().query(`
                ALTER TABLE users 
                ADD COLUMN verification_token VARCHAR(255),
                ADD COLUMN verification_token_expires DATETIME
            `);

            console.log('Поля верификации успешно добавлены в таблицу users');
        }
    } catch (error) {
        console.error('Ошибка при проверке полей верификации:', error);
    }
};

// Создание таблицы пользователей
db.query(`
    CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        profile_picture VARCHAR(255),
        is_verified BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        verification_token VARCHAR(255),
        verification_token_expires DATETIME,
        UNIQUE KEY unique_username (username),
        UNIQUE KEY unique_email (email),
        UNIQUE KEY unique_verification_token (verification_token),
        UNIQUE KEY unique_reset_token (reset_token)
    )
`, (err) => {
    if (err) {
        console.error('Ошибка при создании таблицы users:', err);
    } else {
        console.log('Таблица users успешно создана или уже существует');
    }
});

// Создаем таблицу videos, если она не существует
const createVideosTable = `
    CREATE TABLE IF NOT EXISTS videos (
        video_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        channel_id INT NOT NULL REFERENCES channels(channel_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        video_url VARCHAR(255) NOT NULL,
        thumbnail_url VARCHAR(255) NOT NULL,
        upload_date DATETIME NOT NULL,
        views INT DEFAULT 0
    )
`;

const createVideoViewsTable = `
    CREATE TABLE IF NOT EXISTS video_views (
        view_id INT AUTO_INCREMENT PRIMARY KEY,
        video_id INT NOT NULL REFERENCES videos(video_id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        view_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_view (video_id, user_id)
    )
`;

db.query(createVideoViewsTable, (err) => {
    if (err) {
        console.error('Ошибка при создании таблицы videos_views:', err);
    } else {
        console.log('Таблица video_views создана или уже существует');
    }
});

db.query(createVideosTable, (err) => {
    if (err) {
        console.error('Ошибка при создании таблицы videos:', err);
    } else {
        console.log('Таблица videos создана или уже существует');
    }
});

const createVideoAccessTable = `
    CREATE TABLE IF NOT EXISTS video_access (
        access_id Serial PRIMARY KEY,
        video_id INT REFERENCES videos(video_id) ON DELETE CASCADE,
        access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('public', 'private', 'unlisted')),
        password_hash VARCHAR(255),
        allowed_user_id INT REFERENCES users(user_id) ON DELETE CASCADE
    )
`;

db.query(createVideoAccessTable, (err) => {
    if (err) {
        console.error('Ошибка при создании таблицы video_access;', err);
    } else {
        console.log('Таблица video_access создана или уже существует')
    }
});

// Создаем таблицу video_likes, если она не существует
const createLikesTable = `
    CREATE TABLE IF NOT EXISTS video_likes (
        like_id INT AUTO_INCREMENT PRIMARY KEY,
        video_id INT NOT NULL REFERENCES videos(video_id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        like_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_like (video_id, user_id)
    )
`;

// Создаем таблицу video_dislikes, если она не существует
const createDislikesTable = `
    CREATE TABLE IF NOT EXISTS video_dislikes (
        dislike_id INT AUTO_INCREMENT PRIMARY KEY,
        video_id INT NOT NULL REFERENCES videos(video_id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        dislike_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_dislike (video_id, user_id)
    )
`;

// Создаем таблицы при запуске сервера
db.query(createLikesTable, (err) => {
    if (err) {
        console.error('Ошибка при создании таблицы video_likes:', err);
    } else {
        console.log('Таблица video_likes создана или уже существует');
    }
});

db.query(createDislikesTable, (err) => {
    if (err) {
        console.error('Ошибка при создании таблицы video_dislikes:', err);
    } else {
        console.log('Таблица video_dislikes создана или уже существует');
    }
});

// Создание таблицы каналов
const createChannelsTable = `
CREATE TABLE IF NOT EXISTS channels (
    channel_id INT PRIMARY KEY AUTO_INCREMENT,
    channel_name VARCHAR(255) NOT NULL,
    user_id INT NOT NULL REFERENCES users(user_id),
    created_at DATETIME NOT NULL,
    UNIQUE KEY unique_channel_name_per_user (channel_name, user_id)
)`;

db.query(createChannelsTable, (err) => {
    if (err) {
        console.error('Ошибка при создании таблицы channels:', err);
    } else {
        console.log('Таблица channels успешно создана или уже существует');
    }
});

// Создаем таблицу comments, если она не существует
const createCommentsTable = `
CREATE TABLE IF NOT EXISTS comments (
    comment_id serial PRIMARY KEY,
    video_id INT REFERENCES videos(video_id),
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    comment_text TEXT NOT NULL,
    comment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

db.query(createCommentsTable, (err) => {
    if (err) {
        console.error('Ошибка при создании таблицы comments:', err);
    } else {
        console.log('Таблица comments успешно создана или уже существует');
    }
});

// Создаем таблицу playlists, если она не существует
const createPlaylistsTable = `
CREATE TABLE IF NOT EXISTS playlists (
    playlist_id Serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    playlist_name VARCHAR(100) NOT NULL,
    playlist_description TEXT,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

// Создаем таблицу subscriptions, если она не существует
const createSubscriptionsTable = `
CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id Serial PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    channel_id INT REFERENCES channels(channel_id) ON DELETE CASCADE,
    subscription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_subscription (user_id, channel_id)
)`;

db.query(createSubscriptionsTable, (err) => {
    if (err) {
        console.error('Ошибка при создании таблицы subscriptions:', err);
    } else {
        console.log('Таблица subscriptions успешно создана или уже существует');
    }
});

// Сначала создаем таблицу playlists
db.query(createPlaylistsTable, (err) => {
    if (err) {
        console.error('Ошибка при создании таблицы playlists:', err);
    } else {
        console.log('Таблица playlists успешно создана или уже существует');
        
        // После создания playlists создаем playlists_videos
        db.query(createPlaylistsVideosTable, (err) => {
            if (err) {
                console.error('Ошибка при создании таблицы playlists_videos:', err);
            } else {
                console.log('Таблица playlists_videos успешно создана или уже существует');
            }
        });
    }
});

// Создаем таблицу playlists_videos, если она не существует
const createPlaylistsVideosTable = `
CREATE TABLE IF NOT EXISTS playlists_videos (
    playlist_video_id Serial PRIMARY KEY,
    playlist_id INT REFERENCES playlists(playlist_id) ON DELETE CASCADE,
    video_id INT REFERENCES videos(video_id) ON DELETE CASCADE,
    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (playlist_id, video_id)
)`;

// Главная страница
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Middleware для проверки прав администратора
const checkAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        const [users] = await db.promise().query('SELECT is_admin FROM users WHERE user_id = ?', [decoded.userId]);

        if (users.length === 0 || !users[0].is_admin) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Ошибка при проверке прав администратора:', error);
        res.status(401).json({ error: 'Недействительный токен' });
    }
};

// Публичный роут для получения списка видео
app.get("/api/videos", (req, res) => {
    console.log('Получен запрос на список видео');
    const searchQuery = req.query.search || '';
    
    let query = `
        SELECT 
            v.video_id,
            v.title,
            v.description,
            v.video_url,
            v.thumbnail_url,
            v.upload_date,
            v.views,
            u.username as uploader_name,
            c.channel_name,
            c.logo_url
        FROM videos v
        LEFT JOIN users u ON v.user_id = u.user_id
        LEFT JOIN channels c ON v.channel_id = c.channel_id
    `;

    if (searchQuery) {
        query += ` WHERE v.title LIKE ? OR v.description LIKE ? OR c.channel_name LIKE ?`;
    }

    query += ` ORDER BY v.upload_date DESC`;

    console.log('Выполняется SQL запрос:', query);

    const searchParam = `%${searchQuery}%`;
    const params = searchQuery ? [searchParam, searchParam, searchParam] : [];

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Ошибка при получении видео:', {
                message: err.message,
                code: err.code,
                sqlMessage: err.sqlMessage,
                sqlState: err.sqlState,
                stack: err.stack
            });
            return res.status(500).json({ 
                error: 'Ошибка при получении списка видео',
                details: err.message,
                code: err.code,
                sqlMessage: err.sqlMessage
            });
        }
        console.log('Успешно получено видео:', results.length);
        res.json(results);
    });
});

// Защищенный роут для получения списка видео (для админ-панели)
app.get("/api/admin/videos", checkAdmin, (req, res) => {
    console.log('Получен запрос на список видео для админ-панели');
    const query = `
        SELECT 
            v.video_id,
            v.title,
            v.description,
            v.video_url,
            v.thumbnail_url,
            v.upload_date,
            v.views,
            u.username as uploader_name,
            c.channel_name,
            c.logo_url
        FROM videos v
        LEFT JOIN users u ON v.user_id = u.user_id
        LEFT JOIN channels c ON v.channel_id = c.channel_id
        ORDER BY v.upload_date DESC
    `;

    console.log('Выполняется SQL запрос:', query);

    db.query(query, (err, results) => {
        if (err) {
            console.error('Ошибка при получении видео:', {
                message: err.message,
                code: err.code,
                sqlMessage: err.sqlMessage,
                sqlState: err.sqlState,
                stack: err.stack
            });
            return res.status(500).json({ 
                error: 'Ошибка при получении списка видео',
                details: err.message,
                code: err.code,
                sqlMessage: err.sqlMessage
            });
        }
        console.log('Успешно получено видео:', results.length);
        res.json(results);
    });
});

// Регистрация пользователя
app.post("/register", async (req, res) => {
    console.log('Начало регистрации:', req.body);

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        console.log('Отсутствуют обязательные поля');
        return res.status(400).json({
            message: "Все поля обязательны для заполнения"
        });
    }

    let connection;
    try {
        connection = await db.promise();
        await connection.beginTransaction();
        console.log('Начало транзакции');

        // Проверка существующих пользователей
        const [existingUsers] = await connection.query(
            "SELECT username, email FROM users WHERE username = ? OR email = ?",
            [username, email]
        );
        console.log('Проверка существующих пользователей:', existingUsers);

        if (existingUsers.length > 0) {
            const existing = existingUsers[0];
            if (existing.email === email) {
                await connection.rollback();
                return res.status(400).json({
                    message: "Этот email уже зарегистрирован"
                });
            }
            if (existing.username === username) {
                await connection.rollback();
                return res.status(400).json({
                    message: "Это имя пользователя уже занято"
                });
            }
        }

        // Генерируем токен подтверждения
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 3600000); // Токен действителен 24 часа

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);
        const defaultProfilePicture = '/images/default-avatar.png';

        // Добавление пользователя
        console.log('Добавление пользователя');
        const [userResult] = await connection.query(
            `INSERT INTO users (
                username, 
                email, 
                password_hash, 
                profile_picture_url, 
                registration_date, 
                last_login,
                verification_token,
                verification_token_expires,
                is_verified
            ) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, FALSE)`,
            [username, email, hashedPassword, defaultProfilePicture, verificationToken, verificationTokenExpires]
        );

        const userId = userResult.insertId;
        console.log('Пользователь создан с ID:', userId);

        // Создание канала
        console.log('Создание канала');
        await connection.query(
            `INSERT INTO channels (
                user_id, 
                channel_name, 
                channel_description,
                creation_date,
                logo_url
            ) VALUES (?, ?, ?, NOW(), ?)`,
            [userId, username, `Канал пользователя ${username}`, null]
        );

        // Отправляем email с подтверждением
        const verificationUrl = `http://localhost:3000/verify-email.html?token=${verificationToken}`;
        const mailOptions = {
            from: 'pashenka.gorbunov.05@mail.ru',
            to: email,
            subject: 'Подтверждение регистрации',
            html: `
                <p>Здравствуйте, ${username}!</p>
                <p>Спасибо за регистрацию. Для подтверждения вашего аккаунта перейдите по ссылке:</p>
                <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                <p>Ссылка действительна в течение 24 часов.</p>
                <p>Если вы не регистрировались на нашем сайте, проигнорируйте это письмо.</p>
            `
        };

        await transporter.sendMail(mailOptions);

        await connection.commit();
        console.log('Транзакция завершена успешно');

        return res.status(201).json({
            message: "Регистрация успешна. Пожалуйста, проверьте вашу почту для подтверждения аккаунта.",
            user: {
                user_id: userId,
                username,
                email,
                profile_picture_url: defaultProfilePicture
            }
        });

    } catch (error) {
        console.error('Ошибка при регистрации:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage,
            stack: error.stack
        });

        if (connection) {
            await connection.rollback();
            console.log('Транзакция отменена');
        }

        return res.status(500).json({
            message: "Ошибка при регистрации пользователя",
            details: error.message
        });
    }
});

// Обновление last_login при входе
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await db.promise().query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: "Неправильный email или пароль" });
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ message: "Неправильный email или пароль" });
        }

        // Обновляем last_login
        await db.promise().query(
            "UPDATE users SET last_login = NOW() WHERE user_id = ?",
            [user.user_id]
        );

        // Получаем информацию о канале пользователя
        const [channels] = await db.promise().query(
            "SELECT * FROM channels WHERE user_id = ?",
            [user.user_id]
        );

        // Генерируем JWT токен
        const token = jwt.sign(
            { 
                userId: user.user_id,
                isAdmin: user.is_admin
            }, 
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: "Успешный вход",
            token,
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                profile_picture_url: user.profile_picture_url,
                is_verified: user.is_verified,
                is_admin: user.is_admin,
                channel: channels[0] || null
            }
        });

    } catch (error) {
        console.error('Ошибка при входе:', error);
        res.status(500).json({
            message: "Ошибка сервера при входе",
            error: error.message
        });
    }
});

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log('Authorization header:', authHeader); // Добавляем логирование

    if (!authHeader) {
        console.log('No authorization header');
        return res.status(403).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader;
    console.log('Token:', token); // Добавляем логирование

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.log('Token verification error:', err); // Добавляем логирование
            return res.status(403).json({ error: 'Неверный или просроченный токен' });
        }

        console.log('Token verified successfully, user:', user); // Добавляем логирование
        req.user = user;
        next();
    });
};

// Маршрут для загрузки видео
app.post('/upload', uploadVideo.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
    try {
        console.log('Получен запрос на загрузку видео');
        console.log('Тело запроса:', req.body);
        console.log('Файлы:', req.files);

        const { title, description, user_id } = req.body;
        const videoFile = req.files['video']?.[0];
        const thumbnailFile = req.files['thumbnail']?.[0];

        // Проверяем наличие всех необходимых данных
        if (!title || !description || !user_id) {
            console.log('Отсутствуют обязательные поля:', { title, description, user_id });
            return res.status(400).json({ 
                message: 'Все поля обязательны для заполнения', 
                error: 'MISSING_FIELDS' 
            });
        }

        if (!videoFile || !thumbnailFile) {
            console.log('Отсутствуют файлы:', { videoFile, thumbnailFile });
            return res.status(400).json({ 
                message: 'Необходимо загрузить видео и обложку', 
                error: 'MISSING_FILES' 
            });
        }

        // Получаем информацию о пользователе и его канале
        const [users] = await db.promise().query(
            'SELECT u.*, c.channel_id FROM users u LEFT JOIN channels c ON u.user_id = c.user_id WHERE u.user_id = ?',
            [user_id]
        );

        if (users.length === 0) {
            console.log('Пользователь не найден:', user_id);
            return res.status(401).json({ 
                message: 'Пользователь не найден', 
                error: 'USER_NOT_FOUND' 
            });
        }

        const user = users[0];
        if (!user.channel_id) {
            console.log('Канал не найден для пользователя:', user_id);
            return res.status(400).json({ 
                message: 'У пользователя нет канала', 
                error: 'CHANNEL_NOT_FOUND' 
            });
        }

        // Конвертируем видео в MP4 формат, если это не MP4
        const inputPath = videoFile.path;
        console.log('Путь к загруженному файлу:', inputPath);
        
        // Проверяем существование файла
        if (!fs.existsSync(inputPath)) {
            console.error('Файл не найден по пути:', inputPath);
            return res.status(500).json({ 
                message: 'Ошибка при загрузке видео: файл не найден', 
                error: 'FILE_NOT_FOUND' 
            });
        }

        // Сохраняем оригинальное расширение файла
        const originalExt = path.extname(inputPath).toLowerCase();
        const outputPath = inputPath.replace(originalExt, '.mp4');
        let finalVideoPath = inputPath;
        
        // Если файл уже в формате MP4 (независимо от регистра)
        if (originalExt === '.mp4') {
            console.log('Файл уже в формате MP4, конвертация не требуется');
            finalVideoPath = inputPath;
        } else {
            try {
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .output(outputPath)
                        .videoCodec('libx264')
                        .audioCodec('aac')
                        .on('end', () => {
                            // Удаляем оригинальный файл
                            fs.unlinkSync(inputPath);
                            finalVideoPath = outputPath;
                            console.log('Видео успешно конвертировано в MP4:', finalVideoPath);
                            resolve();
                        })
                        .on('error', (err) => {
                            console.error('Ошибка при конвертации видео:', err);
                            reject(err);
                        })
                        .run();
                });
            } catch (error) {
                console.error('Ошибка при конвертации видео:', error);
                // Если конвертация не удалась, используем оригинальный файл
                finalVideoPath = inputPath;
            }
        }

        // Проверяем существование финального файла
        if (!fs.existsSync(finalVideoPath)) {
            console.error('Финальный файл не найден по пути:', finalVideoPath);
            return res.status(500).json({ 
                message: 'Ошибка при загрузке видео: финальный файл не найден', 
                error: 'FINAL_FILE_NOT_FOUND' 
            });
        }

        const videoUrl = `/uploads/videos/${path.basename(finalVideoPath)}`;
        const thumbnailUrl = `/uploads/thumbnails/${thumbnailFile.filename}`;

        console.log('Сохранение информации о видео в базу данных');
        console.log('Путь к видео:', videoUrl);
        console.log('Путь к обложке:', thumbnailUrl);
        console.log('SQL параметры:', [user_id, user.channel_id, title, description, videoUrl, thumbnailUrl]);

        const [result] = await db.promise().query(
            'INSERT INTO videos (user_id, channel_id, title, description, video_url, thumbnail_url, upload_date, views) VALUES (?, ?, ?, ?, ?, ?, NOW(), 0)',
            [user_id, user.channel_id, title, description, videoUrl, thumbnailUrl]
        );

        console.log('Видео успешно загружено:', result.insertId);
        res.status(201).json({ 
            message: 'Видео успешно загружено', 
            videoId: result.insertId, 
            videoUrl: videoUrl, 
            thumbnailUrl: thumbnailUrl 
        });
    } catch (error) {
        console.error('Ошибка при загрузке видео:', error);
        res.status(500).json({ 
            message: 'Ошибка при загрузке видео', 
            error: error.message, 
            code: error.code,
            stack: error.stack 
        });
    }
});

// Обновление количества просмотров
app.post('/api/videos/:id/view', async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.body.user_id; // Получаем ID пользователя из тела запроса

        console.log('Увеличение счетчика просмотров для видео:', videoId, 'пользователем:', userId);

        if (!userId) {
            return res.status(400).json({ 
                message: 'ID пользователя не указан',
                error: 'USER_ID_REQUIRED'
            });
        }

        // Проверяем существование пользователя
        const [users] = await db.promise().query(
            'SELECT user_id FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                message: 'Пользователь не найден',
                error: 'USER_NOT_FOUND'
            });
        }

        // Проверяем существование видео
        const [videos] = await db.promise().query(
            'SELECT video_id FROM videos WHERE video_id = ?',
            [videoId]
        );

        if (videos.length === 0) {
            return res.status(404).json({ 
                message: 'Видео не найдено',
                error: 'VIDEO_NOT_FOUND'
            });
        }

        // Проверяем, не просматривал ли пользователь это видео в последние 24 часа
        const [recentViews] = await db.promise().query(
            'SELECT view_id FROM video_views WHERE user_id = ? AND video_id = ? AND view_date > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
            [userId, videoId]
        );

        if (recentViews.length === 0) {
            // Добавляем запись о просмотре
            await db.promise().query(
                'INSERT INTO video_views (user_id, video_id, view_date) VALUES (?, ?, NOW())',
                [userId, videoId]
            );

            // Увеличиваем общий счетчик просмотров
            await db.promise().query(
                'UPDATE videos SET views = views + 1 WHERE video_id = ?',
                [videoId]
            );

            console.log('Просмотр зарегистрирован для пользователя:', userId);
        } else {
            console.log('Просмотр уже зарегистрирован в последние 24 часа');
        }

        res.json({ 
            message: 'Просмотр зарегистрирован',
            viewCount: recentViews.length === 0 ? 1 : 0
        });

    } catch (error) {
        console.error('Ошибка при регистрации просмотра:', error);
        res.status(500).json({ 
            message: 'Ошибка при регистрации просмотра',
            error: error.message,
            code: error.code
        });
    }
});

// Временный маршрут для диагностики
app.get('/debug/users', async (req, res) => {
    try {
        // Проверяем структуру таблицы
        const [structure] = await db.promise().query('DESCRIBE users');
        
        // Получаем все записи
        const [users] = await db.promise().query('SELECT user_id, username, email FROM users');
        
        res.json({
            tableStructure: structure,
            users: users
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// Обновление профиля пользователя
app.post('/api/update-profile', uploadAvatar.single('avatar'), async (req, res) => {
    console.log('Получен запрос на обновление профиля');
    console.log('Тело запроса:', req.body);
    console.log('Файл:', req.file);
    
    const userId = req.body.user_id;
    if (!userId) {
        console.log('Ошибка: не указан ID пользователя');
        return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    try {
        // Получаем данные пользователя из базы данных
        const [users] = await db.promise().query(
            "SELECT * FROM users WHERE user_id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Пользователь не найден' });
        }

        const user = users[0];
        const username = req.body.username;
        const channelDescription = req.body.channel_description || '';
        console.log('Новое имя пользователя:', username);
        console.log('Новое описание канала:', channelDescription);
        
        if (!username) {
            return res.status(400).json({ message: 'Имя пользователя обязательно' });
        }

        // Проверяем, не занято ли новое имя пользователя
        if (username !== user.username) {
            const [existingUsers] = await db.promise().query(
                "SELECT username FROM users WHERE username = ? AND user_id != ?",
                [username, userId]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({ message: 'Это имя пользователя уже занято' });
            }
        }

        let profilePictureUrl = user.profile_picture_url;

        // Если загружена новая аватарка
        if (req.file) {
            profilePictureUrl = `/uploads/avatars/${req.file.filename}`;
            console.log('Новая аватарка:', profilePictureUrl);
        }

        // Обновляем данные пользователя
        await db.promise().query(
            "UPDATE users SET username = ?, profile_picture_url = ? WHERE user_id = ?",
            [username, profilePictureUrl, userId]
        );

        // Обновляем имя канала
        await db.promise().query(
            "UPDATE channels SET channel_name = ? WHERE user_id = ?",
            [username, userId]
        );

        // Обновляем логотип канала
        await db.promise().query(
            "UPDATE channels SET logo_url = ? WHERE user_id = ?",
            [profilePictureUrl, userId]
        );
        
        // Обновляем описание канала
        await db.promise().query(
            "UPDATE channels SET channel_description = ? WHERE user_id = ?",
            [channelDescription, userId]
        );

        console.log('Профиль успешно обновлен');
        res.json({
            message: 'Профиль успешно обновлен',
            profile_picture_url: profilePictureUrl
        });
    } catch (error) {
        console.error('Ошибка при обновлении профиля:', error);
        res.status(500).json({ message: 'Ошибка при обновлении профиля', error: error.message });
    }
});

// Маршрут для проверки структуры таблицы videos
app.get('/debug/videos', async (req, res) => {
    try {
        // Проверяем структуру таблицы
        const [structure] = await db.promise().query('DESCRIBE videos');
        
        // Получаем все записи
        const [videos] = await db.promise().query('SELECT * FROM videos');
        
        res.json({
            tableStructure: structure,
            videos: videos
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// Маршрут для получения информации о видео
app.get('/api/videos/:id', async (req, res) => {
    try {
        const videoId = req.params.id;
        console.log('Получен запрос на получение видео:', videoId);

        // Получаем информацию о видео и канале
        const [videos] = await db.promise().query(`
            SELECT 
                v.*,
                c.channel_name,
                c.logo_url,
                u.username as author_name,
                u.profile_picture_url as author_avatar,
                u.user_id
            FROM videos v
            LEFT JOIN channels c ON v.channel_id = c.channel_id
            LEFT JOIN users u ON v.user_id = u.user_id
            WHERE v.video_id = ?
        `, [videoId]);

        if (videos.length === 0) {
            console.log('Видео не найдено:', videoId);
            return res.status(404).json({ 
                message: 'Видео не найдено',
                error: 'VIDEO_NOT_FOUND'
            });
        }

        const video = videos[0];
        console.log('Найдено видео:', video);

        // Проверяем существование файла видео
        const videoPath = path.join(__dirname, 'public', video.video_url);
        const mp4Path = videoPath.replace(/\.[^.]+$/, '.mp4');

        // Если MP4 версия существует, используем её
        if (fs.existsSync(mp4Path)) {
            video.video_url = video.video_url.replace(/\.[^.]+$/, '.mp4');
        }

        res.json({
            video_id: video.video_id,
            title: video.title,
            description: video.description,
            video_url: video.video_url,
            thumbnail_url: video.thumbnail_url,
            upload_date: video.upload_date,
            views: video.views,
            channel_id: video.channel_id,
            channel_name: video.channel_name,
            channel_avatar: video.logo_url || '/images/default-avatar.png',
            author_name: video.author_name,
            author_avatar: video.author_avatar || '/images/default-avatar.png',
            user_id: video.user_id
        });

    } catch (error) {
        console.error('Ошибка при получении видео:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении видео',
            error: error.message,
            code: error.code
        });
    }
});

// Маршрут для получения рейтинга видео
app.get('/api/videos/:id/ratings', async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.query.user_id;

        // Получаем количество лайков и дизлайков
        const [likes] = await db.promise().query(
            'SELECT COUNT(*) as count FROM video_likes WHERE video_id = ?',
            [videoId]
        );

        const [dislikes] = await db.promise().query(
            'SELECT COUNT(*) as count FROM video_dislikes WHERE video_id = ?',
            [videoId]
        );

        // Проверяем, поставил ли пользователь лайк или дизлайк
        let userRating = null;
        if (userId) {
            const [userLike] = await db.promise().query(
                'SELECT 1 FROM video_likes WHERE video_id = ? AND user_id = ?',
                [videoId, userId]
            );

            const [userDislike] = await db.promise().query(
                'SELECT 1 FROM video_dislikes WHERE video_id = ? AND user_id = ?',
                [videoId, userId]
            );

            if (userLike.length > 0) {
                userRating = 'like';
            } else if (userDislike.length > 0) {
                userRating = 'dislike';
            }
        }

        res.json({
            likes: likes[0].count,
            dislikes: dislikes[0].count,
            userRating: userRating
        });

    } catch (error) {
        console.error('Ошибка при получении рейтинга:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении рейтинга',
            error: error.message
        });
    }
});

// Маршрут для постановки лайка
app.post('/api/videos/:id/like', async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.body.user_id;

        if (!userId) {
            return res.status(400).json({ 
                message: 'ID пользователя не указан',
                error: 'USER_ID_REQUIRED'
            });
        }

        // Проверяем существование пользователя и видео
        const [users] = await db.promise().query(
            'SELECT user_id FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                message: 'Пользователь не найден',
                error: 'USER_NOT_FOUND'
            });
        }

        const [videos] = await db.promise().query(
            'SELECT video_id FROM videos WHERE video_id = ?',
            [videoId]
        );

        if (videos.length === 0) {
            return res.status(404).json({ 
                message: 'Видео не найдено',
                error: 'VIDEO_NOT_FOUND'
            });
        }

        // Проверяем, не поставил ли пользователь уже лайк
        const [existingLikes] = await db.promise().query(
            'SELECT like_id FROM video_likes WHERE video_id = ? AND user_id = ?',
            [videoId, userId]
        );

        if (existingLikes.length > 0) {
            // Если лайк уже существует, удаляем его
            await db.promise().query(
                'DELETE FROM video_likes WHERE video_id = ? AND user_id = ?',
                [videoId, userId]
            );
            return res.json({ 
                message: 'Лайк удален',
                action: 'unlike'
            });
        }

        // Проверяем, не поставил ли пользователь дизлайк
        const [existingDislikes] = await db.promise().query(
            'SELECT dislike_id FROM video_dislikes WHERE video_id = ? AND user_id = ?',
            [videoId, userId]
        );

        // Если есть дизлайк, удаляем его
        if (existingDislikes.length > 0) {
            await db.promise().query(
                'DELETE FROM video_dislikes WHERE video_id = ? AND user_id = ?',
                [videoId, userId]
            );
        }

        // Добавляем лайк
        await db.promise().query(
            'INSERT INTO video_likes (video_id, user_id, like_date) VALUES (?, ?, NOW())',
            [videoId, userId]
        );

        res.json({ 
            message: 'Лайк успешно поставлен',
            action: 'like'
        });

    } catch (error) {
        console.error('Ошибка при постановке лайка:', error);
        res.status(500).json({ 
            message: 'Ошибка при постановке лайка',
            error: error.message
        });
    }
});

// Маршрут для постановки дизлайка
app.post('/api/videos/:id/dislike', async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.body.user_id;

        if (!userId) {
            return res.status(400).json({ 
                message: 'ID пользователя не указан',
                error: 'USER_ID_REQUIRED'
            });
        }

        // Проверяем существование пользователя и видео
        const [users] = await db.promise().query(
            'SELECT user_id FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                message: 'Пользователь не найден',
                error: 'USER_NOT_FOUND'
            });
        }

        const [videos] = await db.promise().query(
            'SELECT video_id FROM videos WHERE video_id = ?',
            [videoId]
        );

        if (videos.length === 0) {
            return res.status(404).json({ 
                message: 'Видео не найдено',
                error: 'VIDEO_NOT_FOUND'
            });
        }

        // Проверяем, не поставил ли пользователь уже дизлайк
        const [existingDislikes] = await db.promise().query(
            'SELECT dislike_id FROM video_dislikes WHERE video_id = ? AND user_id = ?',
            [videoId, userId]
        );

        if (existingDislikes.length > 0) {
            return res.status(400).json({ 
                message: 'Дизлайк уже поставлен',
                error: 'DISLIKE_ALREADY_EXISTS'
            });
        }

        // Проверяем, не поставил ли пользователь лайк
        const [existingLikes] = await db.promise().query(
            'SELECT like_id FROM video_likes WHERE video_id = ? AND user_id = ?',
            [videoId, userId]
        );

        // Если есть лайк, удаляем его
        if (existingLikes.length > 0) {
            await db.promise().query(
                'DELETE FROM video_likes WHERE video_id = ? AND user_id = ?',
                [videoId, userId]
            );
        }

        // Добавляем дизлайк
        await db.promise().query(
            'INSERT INTO video_dislikes (video_id, user_id, dislike_date) VALUES (?, ?, NOW())',
            [videoId, userId]
        );

        res.json({ 
            message: 'Дизлайк успешно поставлен',
            action: 'dislike'
        });

    } catch (error) {
        console.error('Ошибка при постановке дизлайка:', error);
        res.status(500).json({ 
            message: 'Ошибка при постановке дизлайка',
            error: error.message
        });
    }
});

// Маршрут для удаления дизлайка
app.delete('/api/videos/:id/dislike', async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.body.user_id;

        if (!userId) {
            return res.status(400).json({ 
                message: 'ID пользователя не указан',
                error: 'USER_ID_REQUIRED'
            });
        }

        // Проверяем существование пользователя и видео
        const [users] = await db.promise().query(
            'SELECT user_id FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                message: 'Пользователь не найден',
                error: 'USER_NOT_FOUND'
            });
        }

        const [videos] = await db.promise().query(
            'SELECT video_id FROM videos WHERE video_id = ?',
            [videoId]
        );

        if (videos.length === 0) {
            return res.status(404).json({ 
                message: 'Видео не найдено',
                error: 'VIDEO_NOT_FOUND'
            });
        }

        // Удаляем дизлайк
        const [result] = await db.promise().query(
            'DELETE FROM video_dislikes WHERE video_id = ? AND user_id = ?',
            [videoId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: 'Дизлайк не найден',
                error: 'DISLIKE_NOT_FOUND'
            });
        }

        res.json({ 
            message: 'Дизлайк успешно удален',
            action: 'remove_dislike'
        });
    } catch (error) {
        console.error('Ошибка при удалении дизлайка:', error);
        res.status(500).json({ 
            message: 'Ошибка при удалении дизлайка',
            error: error.message
        });
    }
});

// Маршрут для проверки структуры базы данных
app.get('/debug/db', async (req, res) => {
    try {
        // Получаем список всех таблиц
        const [tables] = await db.promise().query('SHOW TABLES');
        
        // Получаем структуру каждой таблицы
        const tableStructures = {};
        for (const table of tables) {
            const tableName = table[Object.keys(table)[0]];
            const [structure] = await db.promise().query(`DESCRIBE ${tableName}`);
            tableStructures[tableName] = structure;
        }
        
        res.json({
            tables: tables,
            structures: tableStructures
        });
    } catch (error) {
        console.error('Ошибка при проверке структуры базы данных:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// Маршрут для отладки лайков и дизлайков
app.get('/debug/ratings/:videoId', async (req, res) => {
    try {
        const videoId = req.params.videoId;

        // Получаем все лайки для видео
        const [likes] = await db.promise().query(
            'SELECT * FROM video_likes WHERE video_id = ?',
            [videoId]
        );

        // Получаем все дизлайки для видео
        const [dislikes] = await db.promise().query(
            'SELECT * FROM video_dislikes WHERE video_id = ?',
            [videoId]
        );

        res.json({
            likes: likes,
            dislikes: dislikes
        });
    } catch (error) {
        console.error('Ошибка при получении отладочной информации:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// Получение видео пользователя
app.get('/api/users/:userId/videos', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Проверяем существование пользователя
        const [user] = await db.promise().query('SELECT * FROM users WHERE user_id = ?', [userId]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Получаем видео пользователя
        const [videos] = await db.promise().query(`
            SELECT v.*, u.username as uploader_name 
            FROM videos v 
            JOIN users u ON v.user_id = u.user_id 
            WHERE v.user_id = ? 
            ORDER BY v.upload_date DESC
        `, [userId]);

        res.json(videos);
    } catch (error) {
        console.error('Ошибка при получении видео пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение каналов пользователя
app.get('/api/users/:userId/channels', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Проверяем существование пользователя
        const [user] = await db.promise().query('SELECT * FROM users WHERE user_id = ?', [userId]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Получаем каналы пользователя
        const [channels] = await db.promise().query(`
            SELECT * FROM channels 
            WHERE user_id = ? 
            ORDER BY creation_date DESC
        `, [userId]);

        res.json(channels);
    } catch (error) {
        console.error('Ошибка при получении каналов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создание нового канала
app.post('/api/channels', async (req, res) => {
    try {
        const { name, user_id } = req.body;

        // Проверяем существование пользователя
        const [user] = await db.promise().query('SELECT * FROM users WHERE user_id = ?', [user_id]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Создаем новый канал
        const [result] = await db.promise().query(`
            INSERT INTO channels (channel_name, user_id, created_at) 
            VALUES (?, ?, NOW())
        `, [name, user_id]);

        const [newChannel] = await db.promise().query(`
            SELECT * FROM channels 
            WHERE channel_id = ?
        `, [result.insertId]);

        res.status(201).json(newChannel[0]);
    } catch (error) {
        console.error('Ошибка при создании канала:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Отладочный маршрут для проверки видео
app.get('/debug/videos/:id', async (req, res) => {
    try {
        const videoId = req.params.id;
        console.log('Отладочный запрос для видео:', videoId);

        // Проверяем существование видео
        const [videos] = await db.promise().query('SELECT * FROM videos WHERE video_id = ?', [videoId]);
        console.log('Результат запроса:', videos);

        if (videos.length === 0) {
            return res.json({ 
                message: 'Видео не найдено',
                videoId: videoId
            });
        }

        res.json(videos[0]);
    } catch (error) {
        console.error('Ошибка при отладке:', error);
        res.status(500).json({ error: error.message });
    }
});

// Маршрут для получения комментариев видео
app.get('/api/videos/:id/comments', async (req, res) => {
    try {
        const videoId = req.params.id;
        console.log('Получен запрос на получение комментариев для видео:', videoId);

        const [comments] = await db.promise().query(`
            SELECT 
                c.*,
                u.username,
                u.profile_picture_url
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.user_id
            WHERE c.video_id = ?
            ORDER BY c.comment_date DESC
        `, [videoId]);

        res.json(comments);
    } catch (error) {
        console.error('Ошибка при получении комментариев:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении комментариев',
            error: error.message
        });
    }
});

// Маршрут для добавления комментария
app.post('/api/videos/:id/comments', async (req, res) => {
    try {
        const videoId = req.params.id;
        const { user_id, comment_text } = req.body;

        if (!user_id || !comment_text) {
            return res.status(400).json({ 
                message: 'ID пользователя и текст комментария обязательны',
                error: 'MISSING_FIELDS'
            });
        }

        const [result] = await db.promise().query(
            'INSERT INTO comments (video_id, user_id, comment_text) VALUES (?, ?, ?)',
            [videoId, user_id, comment_text]
        );

        // Получаем добавленный комментарий с информацией о пользователе
        const [comments] = await db.promise().query(`
            SELECT 
                c.*,
                u.username,
                u.profile_picture_url
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.user_id
            WHERE c.comment_id = ?
        `, [result.insertId]);

        res.status(201).json(comments[0]);
    } catch (error) {
        console.error('Ошибка при добавлении комментария:', error);
        res.status(500).json({ 
            message: 'Ошибка при добавлении комментария',
            error: error.message
        });
    }
});

// Отладочный маршрут для проверки структуры таблицы videos
app.get('/debug/videos/structure', async (req, res) => {
    try {
        const [structure] = await db.promise().query('DESCRIBE videos');
        res.json(structure);
    } catch (error) {
        console.error('Ошибка при проверке структуры таблицы videos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Маршрут для получения информации о канале
app.get('/api/channels/:id', async (req, res) => {
    try {
        const channelId = req.params.id;
        console.log('Получен запрос на получение информации о канале:', channelId);

        // Получаем информацию о канале
        const [channels] = await db.promise().query(`
            SELECT 
                c.*,
                u.username as owner_name,
                u.profile_picture_url as owner_avatar,
                u.user_id,
                u.is_verified
            FROM channels c
            LEFT JOIN users u ON c.user_id = u.user_id
            WHERE c.channel_id = ?
        `, [channelId]);

        if (channels.length === 0) {
            console.log('Канал не найден:', channelId);
            return res.status(404).json({ 
                message: 'Канал не найден',
                error: 'CHANNEL_NOT_FOUND'
            });
        }

        res.json(channels[0]);
    } catch (error) {
        console.error('Ошибка при получении информации о канале:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении информации о канале',
            error: error.message,
            code: error.code
        });
    }
});

// Получение видео канала
app.get('/api/channels/:channelId/videos', async (req, res) => {
    try {
        const channelId = req.params.channelId;
        const [videos] = await db.promise().query(
            `SELECT v.*, u.username as author_name 
             FROM videos v 
             JOIN users u ON v.user_id = u.user_id 
             WHERE v.channel_id = ? 
             ORDER BY v.upload_date DESC`,
            [channelId]
        );
        res.json(videos);
    } catch (error) {
        console.error('Ошибка при получении видео канала:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение информации о канале по ID пользователя
app.get('/api/channels/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Получаем информацию о канале
        const [channels] = await db.promise().query(`
            SELECT 
                c.*,
                u.is_verified
            FROM channels c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.user_id = ?
        `, [userId]);

        if (channels.length === 0) {
            return res.status(404).json({ error: 'Канал не найден' });
        }

        res.json(channels[0]);
    } catch (error) {
        console.error('Ошибка при получении информации о канале:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Проверка подписки пользователя на канал
app.get('/api/channels/:channelId/subscription/:userId', async (req, res) => {
    const { channelId, userId } = req.params;
    
    try {
        // Получаем информацию о канале и подписке
        const [channel] = await db.promise().query(
            'SELECT user_id FROM channels WHERE channel_id = ?',
            [channelId]
        );
        
        if (channel.length === 0) {
            return res.status(404).json({ error: 'Канал не найден' });
        }

        const [subscription] = await db.promise().query(
            'SELECT * FROM subscriptions WHERE channel_id = ? AND subscriber_id = ?',
            [channelId, userId]
        );
        
        res.json({ 
            isSubscribed: subscription.length > 0,
            subscribersCount: await getSubscribersCount(channelId),
            channelOwnerId: channel[0].user_id
        });
    } catch (error) {
        console.error('Ошибка при проверке подписки:', error);
        res.status(500).json({ error: 'Ошибка при проверке подписки' });
    }
});

// Получение количества подписчиков канала
async function getSubscribersCount(channelId) {
    try {
        const [result] = await db.promise().query(
            'SELECT COUNT(*) as count FROM subscriptions WHERE channel_id = ?',
            [channelId]
        );
        return result[0].count;
    } catch (error) {
        console.error('Ошибка при подсчете подписчиков:', error);
        return 0;
    }
}

// Подписка/отписка от канала
app.post('/api/channels/:channelId/subscription', async (req, res) => {
    const { channelId } = req.params;
    const { userId } = req.body;
    
    try {
        // Проверяем, не пытается ли пользователь подписаться на свой канал
        const [channel] = await db.promise().query(
            'SELECT user_id FROM channels WHERE channel_id = ?',
            [channelId]
        );
        
        if (channel.length === 0) {
            return res.status(404).json({ error: 'Канал не найден' });
        }
        
        if (channel[0].user_id === parseInt(userId)) {
            return res.status(400).json({ error: 'Нельзя подписаться на свой канал' });
        }
        
        // Проверяем текущий статус подписки
        const [subscription] = await db.promise().query(
            'SELECT * FROM subscriptions WHERE channel_id = ? AND subscriber_id = ?',
            [channelId, userId]
        );
        
        if (subscription.length > 0) {
            // Если подписка существует - отписываемся
            await db.promise().query(
                'DELETE FROM subscriptions WHERE channel_id = ? AND subscriber_id = ?',
                [channelId, userId]
            );
            res.json({ 
                action: 'unsubscribed',
                subscribersCount: await getSubscribersCount(channelId)
            });
        } else {
            // Если подписки нет - подписываемся
            await db.promise().query(
                'INSERT INTO subscriptions (channel_id, subscriber_id) VALUES (?, ?)',
                [channelId, userId]
            );
            res.json({ 
                action: 'subscribed',
                subscribersCount: await getSubscribersCount(channelId)
            });
        }
    } catch (error) {
        console.error('Ошибка при управлении подпиской:', error);
        res.status(500).json({ error: 'Ошибка при управлении подпиской' });
    }
});

// Получение подписок пользователя
app.get('/api/users/:userId/subscriptions', async (req, res) => {
    try {
        const [subscriptions] = await db.promise().query(`
            SELECT c.channel_id, c.channel_name, c.logo_url
            FROM subscriptions s
            JOIN channels c ON s.channel_id = c.channel_id
            WHERE s.subscriber_id = ?
            ORDER BY s.subscription_date DESC
        `, [req.params.userId]);

        res.json(subscriptions);
    } catch (error) {
        console.error('Ошибка при получении подписок:', error);
        res.status(500).json({ error: 'Ошибка при получении подписок' });
    }
});

// Получение всех комментариев
app.get('/api/comments', checkAdmin, async (req, res) => {
    try {
        const [comments] = await db.promise().query(`
            SELECT c.*, u.username 
            FROM comments c 
            JOIN users u ON c.user_id = u.user_id 
            ORDER BY c.comment_date DESC
        `);
        res.json(comments);
    } catch (error) {
        console.error('Ошибка при получении комментариев:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удаление комментария
app.delete('/api/comments/:id', checkAdmin, async (req, res) => {
    try {
        // Сначала проверяем существование комментария
        const [comment] = await db.promise().query('SELECT * FROM comments WHERE comment_id = ?', [req.params.id]);
        
        if (comment.length === 0) {
            return res.status(404).json({ error: 'Комментарий не найден' });
        }

        // Удаляем только комментарий, без каскадного удаления
        await db.promise().query('DELETE FROM comments WHERE comment_id = ?', [req.params.id]);
        
        res.json({ 
            message: 'Комментарий успешно удален',
            comment_id: req.params.id
        });
    } catch (error) {
        console.error('Ошибка при удалении комментария:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение всех пользователей
app.get('/api/users', checkAdmin, async (req, res) => {
    try {
        const [users] = await db.promise().query('SELECT user_id, username, email, is_admin FROM users');
        res.json(users);
    } catch (error) {
        console.error('Ошибка при получении пользователей:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удаление пользователя
app.delete('/api/users/:id', checkAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const [user] = await db.promise().query('SELECT is_admin FROM users WHERE user_id = ?', [userId]);

        if (user.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if (user[0].is_admin) {
            return res.status(403).json({ error: 'Нельзя удалить администратора' });
        }

        // Начинаем транзакцию
        const connection = await db.promise();
        await connection.beginTransaction();

        try {
            // Получаем все видео пользователя для удаления файлов
            const [videos] = await connection.query('SELECT video_url, thumbnail_url FROM videos WHERE user_id = ?', [userId]);
            
            // Удаляем файлы видео и обложек
            for (const video of videos) {
                const videoPath = path.join(__dirname, 'public', video.video_url);
                const thumbnailPath = path.join(__dirname, 'public', video.thumbnail_url);
                
                if (fs.existsSync(videoPath)) {
                    fs.unlinkSync(videoPath);
                }
                if (fs.existsSync(thumbnailPath)) {
                    fs.unlinkSync(thumbnailPath);
                }
            }

            // Удаляем все связанные записи в правильном порядке
            await connection.query('DELETE FROM subscriptions WHERE subscriber_id = ? OR channel_id IN (SELECT channel_id FROM channels WHERE user_id = ?)', [userId, userId]);
            await connection.query('DELETE FROM video_likes WHERE user_id = ?', [userId]);
            await connection.query('DELETE FROM video_dislikes WHERE user_id = ?', [userId]);
            await connection.query('DELETE FROM video_views WHERE user_id = ?', [userId]);
            await connection.query('DELETE FROM playlists_videos WHERE playlist_id IN (SELECT playlist_id FROM playlists WHERE user_id = ?)', [userId]);
            await connection.query('DELETE FROM videos WHERE user_id = ?', [userId]);
            await connection.query('DELETE FROM channels WHERE user_id = ?', [userId]);
            
            // Удаляем самого пользователя
            await connection.query('DELETE FROM users WHERE user_id = ?', [userId]);

            // Подтверждаем транзакцию
            await connection.commit();
            res.json({ message: 'Пользователь и все связанные данные успешно удалены' });
        } catch (error) {
            // В случае ошибки откатываем транзакцию
            await connection.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Ошибка при удалении пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Изменение прав администратора
app.put('/api/users/:id/admin', checkAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { is_admin } = req.body;

        await db.promise().query('UPDATE users SET is_admin = ? WHERE user_id = ?', [is_admin, userId]);
        res.json({ message: 'Права администратора успешно изменены' });
    } catch (error) {
        console.error('Ошибка при изменении прав администратора:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Роут для админ-панели
app.get('/admin.html', checkAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Удаление видео
app.delete('/api/videos/:videoId/owner', authenticateToken, async (req, res) => {
    try {
        const videoId = req.params.videoId;
        const userId = req.user.userId;

        // Получаем информацию о видео
        const [video] = await db.promise().query(
            'SELECT * FROM videos WHERE video_id = ? AND user_id = ?',
            [videoId, userId]
        );

        if (video.length === 0) {
            return res.status(404).json({ error: 'Видео не найдено или вы не являетесь владельцем' });
        }

        // Получаем пути к файлам
        const videoPath = path.join(__dirname, 'public', video[0].video_url);
        const thumbnailPath = path.join(__dirname, 'public', video[0].thumbnail_url);

        // Удаляем файлы
        if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
        }
        if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
        }

        // Удаляем записи из базы данных
        await db.promise().query('DELETE FROM video_likes WHERE video_id = ?', [videoId]);
        await db.promise().query('DELETE FROM video_dislikes WHERE video_id = ?', [videoId]);
        await db.promise().query('DELETE FROM comments WHERE video_id = ?', [videoId]);
        await db.promise().query('DELETE FROM video_views WHERE video_id = ?', [videoId]);
        await db.promise().query('DELETE FROM playlists_videos WHERE video_id = ?', [videoId]);
        await db.promise().query('DELETE FROM videos WHERE video_id = ?', [videoId]);

        res.json({ message: 'Видео успешно удалено' });
    } catch (error) {
        console.error('Ошибка при удалении видео:', error);
        res.status(500).json({ error: 'Ошибка при удалении видео' });
    }
});

// Удаление видео администратором
app.delete('/api/videos/:videoId/admin', checkAdmin, async (req, res) => {
    try {
        const videoId = req.params.videoId;

        // Получаем информацию о видео
        const [video] = await db.promise().query(
            'SELECT * FROM videos WHERE video_id = ?',
            [videoId]
        );

        if (video.length === 0) {
            return res.status(404).json({ error: 'Видео не найдено' });
        }

        // Получаем пути к файлам
        const videoPath = path.join(__dirname, 'public', video[0].video_url);
        const thumbnailPath = path.join(__dirname, 'public', video[0].thumbnail_url);

        // Удаляем файлы
        if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
        }
        if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
        }

        // Удаляем записи из базы данных
        await db.promise().query('DELETE FROM video_likes WHERE video_id = ?', [videoId]);
        await db.promise().query('DELETE FROM video_dislikes WHERE video_id = ?', [videoId]);
        await db.promise().query('DELETE FROM comments WHERE video_id = ?', [videoId]);
        await db.promise().query('DELETE FROM video_views WHERE video_id = ?', [videoId]);
        await db.promise().query('DELETE FROM playlists_videos WHERE video_id = ?', [videoId]);
        await db.promise().query('DELETE FROM videos WHERE video_id = ?', [videoId]);

        res.json({ message: 'Видео успешно удалено' });
    } catch (error) {
        console.error('Ошибка при удалении видео:', error);
        res.status(500).json({ error: 'Ошибка при удалении видео' });
    }
});

// Маршрут для удаления комментария пользователем
app.delete('/api/videos/:videoId/comments/:commentId', async (req, res) => {
    try {
        const videoId = req.params.videoId;
        const commentId = req.params.commentId;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(401).json({ 
                message: 'Требуется авторизация',
                error: 'UNAUTHORIZED'
            });
        }

        // Проверяем существование комментария и права доступа
        const [comment] = await db.promise().query(
            'SELECT * FROM comments WHERE comment_id = ? AND video_id = ?',
            [commentId, videoId]
        );

        if (comment.length === 0) {
            return res.status(404).json({ 
                message: 'Комментарий не найден',
                error: 'COMMENT_NOT_FOUND'
            });
        }

        // Проверяем, является ли пользователь автором комментария
        if (comment[0].user_id !== user_id) {
            return res.status(403).json({ 
                message: 'Нет прав на удаление этого комментария',
                error: 'FORBIDDEN'
            });
        }

        // Удаляем комментарий
        await db.promise().query(
            'DELETE FROM comments WHERE comment_id = ?',
            [commentId]
        );

        res.json({ 
            message: 'Комментарий успешно удален',
            comment_id: commentId
        });
    } catch (error) {
        console.error('Ошибка при удалении комментария:', error);
        res.status(500).json({ 
            message: 'Ошибка при удалении комментария',
            error: error.message
        });
    }
});

// Получение плейлистов пользователя
app.get('/api/users/:userId/playlists', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        const [playlists] = await db.promise().query(`
            SELECT p.*, COUNT(pv.video_id) as video_count
            FROM playlists p
            LEFT JOIN playlists_videos pv ON p.playlist_id = pv.playlist_id
            WHERE p.user_id = ?
            GROUP BY p.playlist_id
            ORDER BY p.creation_date DESC
        `, [userId]);

        res.json(playlists);
    } catch (error) {
        console.error('Ошибка при получении плейлистов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создание нового плейлиста
app.post('/api/playlists', async (req, res) => {
    try {
        const { user_id, name, description } = req.body;

        if (!user_id || !name) {
            return res.status(400).json({ 
                message: 'ID пользователя и название плейлиста обязательны',
                error: 'MISSING_FIELDS'
            });
        }

        const [result] = await db.promise().query(
            'INSERT INTO playlists (user_id, playlist_name, playlist_description) VALUES (?, ?, ?)',
            [user_id, name, description]
        );

        const [newPlaylist] = await db.promise().query(
            'SELECT * FROM playlists WHERE playlist_id = ?',
            [result.insertId]
        );

        res.status(201).json(newPlaylist[0]);
    } catch (error) {
        console.error('Ошибка при создании плейлиста:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавление видео в плейлист
app.post('/api/playlists/:playlistId/videos', async (req, res) => {
    try {
        const playlistId = req.params.playlistId;
        const { video_id, user_id } = req.body;

        if (!video_id || !user_id) {
            return res.status(400).json({ 
                message: 'ID видео и ID пользователя обязательны',
                error: 'MISSING_FIELDS'
            });
        }

        // Проверяем, принадлежит ли плейлист пользователю
        const [playlist] = await db.promise().query(
            'SELECT * FROM playlists WHERE playlist_id = ? AND user_id = ?',
            [playlistId, user_id]
        );

        if (playlist.length === 0) {
            return res.status(403).json({ 
                message: 'Нет прав на изменение этого плейлиста',
                error: 'FORBIDDEN'
            });
        }

        // Проверяем, не добавлено ли уже видео в плейлист
        const [existing] = await db.promise().query(
            'SELECT * FROM playlists_videos WHERE playlist_id = ? AND video_id = ?',
            [playlistId, video_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                message: 'Видео уже добавлено в плейлист',
                error: 'VIDEO_ALREADY_EXISTS'
            });
        }

        // Добавляем видео в плейлист
        await db.promise().query(
            'INSERT INTO playlists_videos (playlist_id, video_id) VALUES (?, ?)',
            [playlistId, video_id]
        );

        res.status(201).json({ 
            message: 'Видео успешно добавлено в плейлист',
            playlist_id: playlistId,
            video_id: video_id
        });
    } catch (error) {
        console.error('Ошибка при добавлении видео в плейлист:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удаление видео из плейлиста
app.delete('/api/playlists/:playlistId/videos/:videoId', async (req, res) => {
    try {
        const playlistId = req.params.playlistId;
        const videoId = req.params.videoId;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(401).json({ 
                message: 'Требуется авторизация',
                error: 'UNAUTHORIZED'
            });
        }

        // Проверяем, принадлежит ли плейлист пользователю
        const [playlist] = await db.promise().query(
            'SELECT * FROM playlists WHERE playlist_id = ? AND user_id = ?',
            [playlistId, user_id]
        );

        if (playlist.length === 0) {
            return res.status(403).json({ 
                message: 'Нет прав на изменение этого плейлиста',
                error: 'FORBIDDEN'
            });
        }

        // Удаляем видео из плейлиста
        await db.promise().query(
            'DELETE FROM playlists_videos WHERE playlist_id = ? AND video_id = ?',
            [playlistId, videoId]
        );

        res.json({ 
            message: 'Видео успешно удалено из плейлиста',
            playlist_id: playlistId,
            video_id: videoId
        });
    } catch (error) {
        console.error('Ошибка при удалении видео из плейлиста:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение видео из плейлиста
app.get('/api/playlists/:playlistId/videos', async (req, res) => {
    try {
        const playlistId = req.params.playlistId;

        const [videos] = await db.promise().query(`
            SELECT 
                v.*, 
                u.username as author_name,
                u.profile_picture_url as author_avatar,
                c.channel_name,
                c.logo_url as channel_avatar
            FROM playlists_videos pv
            JOIN videos v ON pv.video_id = v.video_id
            JOIN users u ON v.user_id = u.user_id
            JOIN channels c ON v.channel_id = c.channel_id
            WHERE pv.playlist_id = ?
            ORDER BY pv.added_date DESC
        `, [playlistId]);

        res.json(videos);
    } catch (error) {
        console.error('Ошибка при получении видео из плейлиста:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удаление плейлиста
app.delete('/api/playlists/:playlistId', async (req, res) => {
    try {
        const playlistId = req.params.playlistId;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(401).json({ 
                message: 'Требуется авторизация',
                error: 'UNAUTHORIZED'
            });
        }

        // Проверяем, принадлежит ли плейлист пользователю
        const [playlist] = await db.promise().query(
            'SELECT * FROM playlists WHERE playlist_id = ? AND user_id = ?',
            [playlistId, user_id]
        );

        if (playlist.length === 0) {
            return res.status(403).json({ 
                message: 'Нет прав на удаление этого плейлиста',
                error: 'FORBIDDEN'
            });
        }

        // Удаляем плейлист (каскадное удаление удалит все связанные записи)
        await db.promise().query(
            'DELETE FROM playlists WHERE playlist_id = ?',
            [playlistId]
        );

        res.json({ 
            message: 'Плейлист успешно удален',
            playlist_id: playlistId
        });
    } catch (error) {
        console.error('Ошибка при удалении плейлиста:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение информации о плейлисте
app.get('/api/playlists/:playlistId', async (req, res) => {
    try {
        const playlistId = req.params.playlistId;
        
        const [playlists] = await db.promise().query(`
            SELECT p.*, COUNT(pv.video_id) as video_count
            FROM playlists p
            LEFT JOIN playlists_videos pv ON p.playlist_id = pv.playlist_id
            WHERE p.playlist_id = ?
            GROUP BY p.playlist_id
        `, [playlistId]);

        if (playlists.length === 0) {
            return res.status(404).json({ error: 'Плейлист не найден' });
        }

        res.json(playlists[0]);
    } catch (error) {
        console.error('Ошибка при получении информации о плейлисте:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение истории просмотров пользователя
app.get('/api/users/:userId/history', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        const [history] = await db.promise().query(`
            SELECT 
                v.video_id,
                v.title,
                v.thumbnail_url,
                v.views,
                c.channel_name,
                vv.view_date
            FROM video_views vv
            JOIN videos v ON vv.video_id = v.video_id
            JOIN channels c ON v.channel_id = c.channel_id
            WHERE vv.user_id = ?
            ORDER BY vv.view_date DESC
        `, [userId]);

        res.json(history);
    } catch (error) {
        console.error('Ошибка при получении истории просмотров:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Очистка истории просмотров пользователя
app.delete('/api/users/:userId/history', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        await db.promise().query(
            'DELETE FROM video_views WHERE user_id = ?',
            [userId]
        );

        res.json({ message: 'История просмотров успешно очищена' });
    } catch (error) {
        console.error('Ошибка при очистке истории просмотров:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Запущен на сервере http://localhost:${PORT}`);
});

// Настройка транспорта для отправки email
const transporter = nodemailer.createTransport({
    host: 'smtp.mail.ru',
    port: 465,
    secure: true,
    auth: {
        user: 'pashenka.gorbunov.05@mail.ru',
        pass: 'aLWF6C0qlH4np32v6Rcv' // Здесь нужно использовать пароль приложения
    }
});

// Эндпоинт для запроса сброса пароля
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // Проверяем существование пользователя
        const [user] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (user.length === 0) {
            return res.status(404).json({ message: 'Пользователь с таким email не найден' });
        }

        // Генерируем токен сброса пароля
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000); // Токен действителен 1 час

        // Сохраняем токен в базе данных
        await db.promise().query(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
            [resetToken, resetTokenExpires, email]
        );

        // Отправляем email с ссылкой для сброса пароля
        const resetUrl = `http://localhost:3000/reset-password.html?token=${resetToken}`;
        const mailOptions = {
            from: 'pashenka.gorbunov.05@mail.ru',
            to: email,
            subject: 'Сброс пароля',
            html: `
                <p>Вы запросили сброс пароля.</p>
                <p>Для сброса пароля перейдите по ссылке: <a href="${resetUrl}">${resetUrl}</a></p>
                <p>Ссылка действительна в течение 1 часа.</p>
                <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Инструкции по сбросу пароля отправлены на ваш email' });
    } catch (error) {
        console.error('Ошибка при запросе сброса пароля:', error);
        res.status(500).json({ message: 'Произошла ошибка при обработке запроса' });
    }
});

// Эндпоинт для сброса пароля
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // Проверяем токен и его срок действия
        const [user] = await db.promise().query(
            'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [token]
        );

        if (user.length === 0) {
            return res.status(400).json({ message: 'Недействительный или просроченный токен' });
        }

        // Хешируем новый пароль
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Обновляем пароль и очищаем токен
        await db.promise().query(
            'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = ?',
            [hashedPassword, token]
        );

        res.json({ message: 'Пароль успешно изменен' });
    } catch (error) {
        console.error('Ошибка при сбросе пароля:', error);
        res.status(500).json({ message: 'Произошла ошибка при сбросе пароля' });
    }
});

// Эндпоинт для подтверждения email
app.post('/api/verify-email', async (req, res) => {
    const { token } = req.body;

    try {
        // Проверяем токен и его срок действия
        const [user] = await db.promise().query(
            'SELECT * FROM users WHERE verification_token = ? AND verification_token_expires > NOW()',
            [token]
        );

        if (user.length === 0) {
            return res.status(400).json({ message: 'Недействительный или просроченный токен' });
        }

        // Обновляем статус подтверждения и очищаем токен
        await db.promise().query(
            'UPDATE users SET is_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE verification_token = ?',
            [token]
        );

        res.json({ message: 'Email успешно подтвержден' });
    } catch (error) {
        console.error('Ошибка при подтверждении email:', error);
        res.status(500).json({ message: 'Произошла ошибка при подтверждении email' });
    }
});

// Эндпоинт для повторной отправки письма подтверждения
app.post('/api/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email не указан' });
    }

    // Проверяем существование пользователя
    const [users] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const user = users[0];

    // Если email уже подтвержден
    if (user.is_verified) {
      return res.status(400).json({ message: 'Email уже подтвержден' });
    }

    // Генерируем новый токен подтверждения
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

    // Обновляем токен в базе данных
    await db.promise().query(
      'UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE email = ?',
      [verificationToken, verificationTokenExpires, email]
    );

    // Отправляем письмо с подтверждением
    const mailOptions = {
      from: 'pashenka.gorbunov.05@mail.ru',
      to: email,
      subject: 'Подтверждение email адреса',
      html: `
        <h1>Подтверждение email адреса</h1>
        <p>Для подтверждения вашего email адреса, пожалуйста, перейдите по следующей ссылке:</p>
        <a href="http://localhost:3000/verify-email.html?token=${verificationToken}">Подтвердить email</a>
        <p>Ссылка действительна в течение 24 часов.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Письмо с подтверждением отправлено' });
  } catch (error) {
    console.error('Ошибка при отправке письма подтверждения:', error);
    res.status(500).json({ message: 'Ошибка при отправке письма подтверждения' });
  }
});