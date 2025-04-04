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
        fileSize: 500 * 1024 * 1024, // Увеличиваем до 500MB
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
        fileSize: 5 * 1024 * 1024 // 5MB
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

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/uploads/videos', express.static(path.join(__dirname, 'public/uploads/videos')));
app.use('/uploads/thumbnails', express.static(path.join(__dirname, 'public/uploads/thumbnails')));
app.use('/uploads/avatars', express.static(path.join(__dirname, 'public/uploads/avatars')));

// Middleware для конвертации видео в MP4 при необходимости
app.use('/uploads/videos', async (req, res, next) => {
    const filePath = path.join(__dirname, 'public', req.path);
    const mp4Path = filePath.replace(/\.[^.]+$/, '.mp4');

    // Если запрашивается не MP4 файл и MP4 версия не существует
    if (!filePath.endsWith('.mp4') && !fs.existsSync(mp4Path)) {
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
            // Продолжаем обработку запроса, даже если конвертация не удалась
        }
    }
    next();
});

// Подключение к базе данных
db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err);
        return;
    }
    console.log('Подключено к базе данных MySQL');
});

// Создаем таблицу videos, если она не существует
const createVideosTable = `
    CREATE TABLE IF NOT EXISTS videos (
        video_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        channel_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        video_url VARCHAR(255) NOT NULL,
        thumbnail_url VARCHAR(255) NOT NULL,
        upload_date DATETIME NOT NULL,
        views INT DEFAULT 0,
        duration INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE
    )
`;

db.query(createVideosTable, (err) => {
    if (err) {
        console.error('Ошибка при создании таблицы videos:', err);
    } else {
        console.log('Таблица videos создана или уже существует');
    }
});

// Создаем таблицу video_likes, если она не существует
const createLikesTable = `
    CREATE TABLE IF NOT EXISTS video_likes (
        like_id INT AUTO_INCREMENT PRIMARY KEY,
        video_id INT NOT NULL,
        user_id INT NOT NULL,
        like_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE KEY unique_like (video_id, user_id)
    )
`;

// Создаем таблицу video_dislikes, если она не существует
const createDislikesTable = `
    CREATE TABLE IF NOT EXISTS video_dislikes (
        dislike_id INT AUTO_INCREMENT PRIMARY KEY,
        video_id INT NOT NULL,
        user_id INT NOT NULL,
        dislike_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
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
    user_id INT NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
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
    video_id INT REFERENCES videos(video_id) ON DELETE CASCADE,
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

// Главная страница
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Роут для получения списка видео
app.get("/api/videos", (req, res) => {
    console.log('Получен запрос на список видео');
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
            c.channel_name
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
                last_login
            ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [username, email, hashedPassword, defaultProfilePicture]
        );

        const userId = userResult.insertId;
        console.log('Пользователь создан с ID:', userId);

        // Создание канала
        console.log('Создание канала');
        await connection.query(
            `INSERT INTO channels (
                user_id, 
                channel_name, 
                channel_description
            ) VALUES (?, ?, ?)`,
            [userId, username, `Канал пользователя ${username}`]
        );

        await connection.commit();
        console.log('Транзакция завершена успешно');

        return res.status(201).json({
            message: "Регистрация успешна",
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

        res.status(200).json({
                message: "Успешный вход",
                user: {
                user_id: user.user_id,
                    username: user.username,
                email: user.email,
                profile_picture_url: user.profile_picture_url,
                is_verified: user.is_verified,
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
    const token = req.header('Authorization');

    if (!token) {
        return res.status(403).send('Доступ запрещен');
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).send('Неверный или просроченный токен');
        }

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
        const outputPath = inputPath.replace(path.extname(inputPath), '.mp4');
        
        if (!inputPath.endsWith('.mp4')) {
            try {
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .output(outputPath)
                        .videoCodec('libx264')
                        .audioCodec('aac')
                        .on('end', () => {
                            // Удаляем оригинальный файл
                            fs.unlinkSync(inputPath);
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
                outputPath = inputPath;
            }
        }

        const videoUrl = `/uploads/videos/${path.basename(outputPath)}`;
        const thumbnailUrl = `/uploads/thumbnails/${thumbnailFile.filename}`;

        console.log('Сохранение информации о видео в базу данных');
        console.log('SQL параметры:', [user_id, user.channel_id, title, description, videoUrl, thumbnailUrl]);

        const [result] = await db.promise().query(
            'INSERT INTO videos (user_id, channel_id, title, description, video_url, thumbnail_url, upload_date, views, duration) VALUES (?, ?, ?, ?, ?, ?, NOW(), 0, 0)',
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
        console.log('Новое имя пользователя:', username);
        
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
                c.channel_id,
                u.username as uploader_name,
                u.profile_picture_url as channel_avatar,
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
            channel_avatar: video.channel_avatar || '/images/default-avatar.png',
            uploader_name: video.uploader_name,
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
            ORDER BY created_at DESC
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
                u.profile_picture_url as channel_avatar,
                u.user_id
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

        const channel = channels[0];
        console.log('Найден канал:', channel);

        res.json({
            channel_id: channel.channel_id,
            channel_name: channel.channel_name,
            channel_description: channel.channel_description,
            channel_avatar: channel.channel_avatar || '/images/default-avatar.png',
            owner_name: channel.owner_name,
            user_id: channel.user_id,
            subscriber_count: channel.subscriber_count || 0
        });

    } catch (error) {
        console.error('Ошибка при получении информации о канале:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении информации о канале',
            error: error.message,
            code: error.code
        });
    }
});

// Маршрут для получения видео канала
app.get('/api/channels/:id/videos', async (req, res) => {
    try {
        const channelId = req.params.id;
        console.log('Получен запрос на получение видео канала:', channelId);

        // Получаем видео канала
        const [videos] = await db.promise().query(`
            SELECT 
                v.*,
                u.username as uploader_name
            FROM videos v
            LEFT JOIN users u ON v.user_id = u.user_id
            WHERE v.channel_id = ?
            ORDER BY v.upload_date DESC
        `, [channelId]);

        console.log('Найдено видео канала:', videos.length);

        res.json(videos);

    } catch (error) {
        console.error('Ошибка при получении видео канала:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении видео канала',
            error: error.message,
            code: error.code
        });
    }
});

// Проверка подписки пользователя на канал
app.get('/api/channels/:channelId/subscription/:userId', async (req, res) => {
    const { channelId, userId } = req.params;
    
    try {
        const [subscription] = await db.promise().query(
            'SELECT * FROM subscriptions WHERE channel_id = ? AND subscriber_id = ?',
            [channelId, userId]
        );
        
        res.json({ 
            isSubscribed: subscription.length > 0,
            subscribersCount: await getSubscribersCount(channelId)
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

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Запущен на сервере http://localhost:${PORT}`);
});