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
signUpForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const username = document.getElementById("login").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    fetch("/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, email, password })
    })
        .then(response => {
            if (response.ok) {
                alert("Регистрация успешна. Пожалуйста, войдите.");
                formBox.classList.remove('active');  // Показываем форму входа
            } else {
                alert("Ошибка регистрации.");
            }
        })
        .catch(error => {
            console.error("Ошибка при регистрации:", error);
        });
});

// Обработка входа
signInForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const email = document.getElementById("email1").value;
    const password = document.getElementById("password1").value;

    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.message === "Успешный вход") {
                // Сохраняем информацию о пользователе в localStorage
                localStorage.setItem("user", JSON.stringify(data.user)); // Предполагается, что data.user — это объект пользователя
                window.location.href = "/";  // Перенаправляем на главную страницу
            } else {
                alert("Неправильный email или пароль.");
            }
        })
        .catch(error => {
            console.error("Ошибка при входе:", error);
        });
});
