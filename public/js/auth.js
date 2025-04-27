const isLoggedIn = localStorage.getItem("user");

const usernameSpan = document.getElementById("username");
const logoutButton = document.getElementById("logout");
const authLink = document.querySelector(".authLink");

// Проверяем, существуют ли элементы, прежде чем работать с ними
if (usernameSpan && logoutButton && authLink) {
    if (isLoggedIn) {
        const user = JSON.parse(isLoggedIn);
        usernameSpan.textContent = user.username;  // Отображаем имя пользователя
        authLink.style.display = "none";           // Прячем ссылку "Войти"
        logoutButton.style.display = "block"; // Показываем кнопку "Выйти"

        // Логика выхода
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("user"); // Удаляем пользователя из localStorage
            window.location.reload();         // Перезагружаем страницу
        });
    } else {
        usernameSpan.style.display = "none";     // Прячем имя пользователя
        logoutButton.style.display = "none";    // Прячем кнопку "Выйти"
        authLink.style.display = "block"; // Показываем ссылку "Войти"
    }
}

// Функция регистрации пользователя
async function registerUser(username, email, password) {
    try {
        // Валидация на стороне клиента
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

        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('user', JSON.stringify(data.user));
            alert('Регистрация успешна! Сейчас вы будете перенаправлены на главную страницу.');
            window.location.href = '/'; // Перенаправление на главную после успешной регистрации
        } else {
            throw new Error(data.message || 'Ошибка при регистрации');
        }
    } catch (error) {
        alert(error.message || 'Произошла ошибка при регистрации');
    }
}

// Обработчик формы регистрации
const signupForm = document.getElementById("signupForm");
if (signupForm) {
    signupForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const username = document.getElementById("login").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        
        await registerUser(username, email, password);
    });
}

// Обновляем функцию входа для сохранения всех данных пользователя
async function loginUser(email, password) {
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("User logged in:", data);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/';
        } else {
            console.error("Login failed:", data.message);
            alert(data.message || 'Ошибка входа');
        }
    } catch (error) {
        console.error("Error during login:", error);
        alert('Произошла ошибка при попытке входа');
    }
}

// Проверяем, находимся ли мы на странице входа
const signinForm = document.getElementById("signinForm");
if (signinForm) {
    signinForm.addEventListener("submit", function(e) {
        e.preventDefault();
        
        const emailInput = document.getElementById("email1");
        const passwordInput = document.getElementById("password1");
        
        if (emailInput && passwordInput) {
            const email = emailInput.value;
            const password = passwordInput.value;
            loginUser(email, password);
        }
    });
}
