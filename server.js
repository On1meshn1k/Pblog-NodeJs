const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const app = express();
const path = require('path');
const mysql = require('mysql2');
const port = 3000;

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nodeDB'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to the MySQL database.');
});

app.use(session({
    secret: 'secret', // Здесь можно указать более сложный секрет
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/channel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'channel.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});