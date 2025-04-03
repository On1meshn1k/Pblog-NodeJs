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

// Функция для отправки запроса на сервер для аутентификации
async function loginUser(email, password) {
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log("User logged in:", data);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/'; // Перенаправляем на главную страницу после успешного входа
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
