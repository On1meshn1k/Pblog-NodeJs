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
app.post("/register", (req, res) => {
    const { username, email, password } = req.body;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Ошибка хеширования пароля");
        }

        const query = "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)";
        db.query(query, [username, email, hash], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Ошибка регистрации пользователя");
            }
            res.status(201).send("Пользователь успешно зарегистрирован");
        });
    });
});

// Вход пользователя
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    const query = "SELECT * FROM users WHERE email = ?";
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Ошибка сервера");
        }

        if (results.length === 0) {
            return res.status(401).send({ message: "Неправильный email или пароль" });
        }

        const user = results[0];
        const bcrypt = require("bcrypt");

        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Ошибка проверки пароля");
            }

            if (!isMatch) {
                return res.status(401).send({ message: "Неправильный email или пароль" });
            }

            // Возвращаем только нужные данные пользователя
            res.status(200).send({
                message: "Успешный вход",
                user: {
                    username: user.username,
                    email: user.email
                }
            });
        });
    });
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
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // ограничение размера файла (100MB)
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

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});