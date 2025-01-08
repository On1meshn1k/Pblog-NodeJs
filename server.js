const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const app = express();
const PORT = 3000;

// Настройка базы данных
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "nodedb",
});

// Секретный ключ для JWT
const SECRET_KEY = "game";

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Проверка подключения к базе данных
db.getConnection((err) => {
    if (err) {
        console.error("Ошибка подключения к базе данных:", err);
        return;
    }
    console.log("Подключение к базе данных успешно");
});

// Главная страница
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Роут для получения списка видео
app.get("/api/videos", (req, res) => {
    db.query("SELECT * FROM videos", (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Ошибка сервера");
        }
        res.json(results); // Возвращаем JSON с видео.
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

// Настройка multer для загрузки видео
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

app.post("/upload", upload.single("video"), (req, res) => {
    const { title, description } = req.body;
    const videoUrl = `/uploads/${req.file.filename}`; // URL видео
    const thumbnailUrl = `/uploads/${req.file.filename}_thumbnail.jpg`; // URL обложки

    // Пример для сохранения обложки отдельно, если она загружается отдельно
    // или создается отдельно при загрузке видео
    const query = "INSERT INTO videos (title, description, video_url, thumbnail_url) VALUES (?, ?, ?, ?)";
    db.query(query, [title, description, videoUrl, thumbnailUrl], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Ошибка загрузки видео");
        }
        res.status(201).send("Видео успешно загружено");
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
