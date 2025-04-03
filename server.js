const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");

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

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static('uploads'));
app.use('/uploads/avatars', express.static(path.join(__dirname, 'public/uploads/avatars')));

// Подключение к базе данных
db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err);
        return;
    }
    console.log('Подключено к базе данных MySQL');
});

// Главная страница
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Роут для получения списка видео
app.get("/api/videos", (req, res) => {
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

    db.query(query, (err, results) => {
        if (err) {
            console.error('Ошибка при получении видео:', err);
            return res.status(500).send('Ошибка при получении списка видео');
        }
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

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/avatars/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // ограничение размера файла (5MB)
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Неверный тип файла. Пожалуйста, загрузите изображение.'));
        }
    }
});

// Обработка загрузки видео
app.post('/upload', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
    if (!req.files || !req.files['video'] || !req.files['thumbnail']) {
        return res.status(400).send('Необходимо загрузить видео и обложку');
    }

    const videoFile = req.files['video'][0];
    const thumbnailFile = req.files['thumbnail'][0];
    const { title, description } = req.body;
    
    // Получаем длительность видео (это пример, нужно реализовать)
    const duration = 0; // Здесь нужно добавить код для получения длительности видео

    const query = `
        INSERT INTO videos (
            title, 
            description, 
            video_url, 
            thumbnail_url, 
            upload_date,
            views,
            user_id,
            channel_id,
            duration
        ) VALUES (?, ?, ?, ?, NOW(), 0, ?, ?, ?)
    `;

    try {
        // Здесь нужно получить user_id и channel_id из текущей сессии
        const userId = 1; // Временно, нужно заменить на реального пользователя
        const channelId = 1; // Временно, нужно заменить на реальный канал

        db.query(
            query,
            [
                title,
                description,
                `/uploads/${videoFile.filename}`,
                `/uploads/${thumbnailFile.filename}`,
                userId,
                channelId,
                duration
            ],
            (err, results) => {
                if (err) {
                    console.error('Ошибка при сохранении в базу данных:', err);
                    return res.status(500).send('Ошибка при загрузке видео: ' + err.message);
                }
                console.log('Видео успешно сохранено в базу данных');
                res.status(201).send('Видео успешно загружено');
            }
        );
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).send('Внутренняя ошибка сервера');
    }
});

// Обновление количества просмотров
app.post('/api/videos/:id/view', (req, res) => {
    const videoId = req.params.id;
    const query = 'UPDATE videos SET views = views + 1 WHERE id = ?';
    
    db.query(query, [videoId], (err, results) => {
        if (err) {
            console.error('Ошибка при обновлении просмотров:', err);
            return res.status(500).send('Ошибка при обновлении просмотров');
        }
        res.send('Просмотр засчитан');
    });
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
app.post('/api/update-profile', upload.single('avatar'), async (req, res) => {
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

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});