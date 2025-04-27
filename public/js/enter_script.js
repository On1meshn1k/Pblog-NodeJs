const signInForm = document.querySelector(".form_signin");
const signUpForm = document.querySelector(".form_signup");

const signInBtn = document.querySelector('.signin-btn');
const signUpBtn = document.querySelector('.signup-btn');
const formBox = document.querySelector('.form-box');

// Переключение между формами входа и регистрации
signUpBtn.addEventListener('click', function() {
    formBox.classList.add('active');
});

signInBtn.addEventListener('click', function() {
    formBox.classList.remove('active');
});

// Обработка регистрации
signUpForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const username = document.getElementById("login").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        // Валидация
        if (username.length < 3) {
            alert('Имя пользователя должно содержать минимум 3 символа');
            return;
        }

        if (username.length > 50) {
            alert('Имя пользователя не должно превышать 50 символов');
            return;
        }

        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            alert('Пожалуйста, введите корректный email');
            return;
        }

        if (password.length < 6) {
            alert('Пароль должен содержать минимум 6 символов');
            return;
        }

        const response = await fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Ошибка регистрации");
        }

        // Только если регистрация успешна
        localStorage.setItem('user', JSON.stringify(data.user));
        alert("Регистрация успешна!");
        window.location.href = "/"; // Перенаправляем на главную страницу

    } catch (error) {
        alert(error.message || "Произошла ошибка при регистрации");
        return; // Прерываем выполнение в случае ошибки
    }
});

// Обработка входа
signInForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email1").value.trim();
    const password = document.getElementById("password1").value;

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Неправильный email или пароль");
        }

        // Сохраняем данные пользователя и токен
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        
        // Перенаправляем на главную страницу
        window.location.href = "/";

    } catch (error) {
        alert(error.message || "Произошла ошибка при входе");
    }
});
