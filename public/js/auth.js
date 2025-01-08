const isLoggedIn = localStorage.getItem("user");

const usernameSpan = document.getElementById("username");
const logoutButton = document.getElementById("logout");
const authLink = document.querySelector(".auth");

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

// Функция для отправки запроса на сервер для аутентификации
async function loginUser(email, password) {
    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }), // Отправляем данные на сервер
    });

    const data = await response.json();

    if (response.ok) {
        console.log("User logged in:", data);
        // Сохраняем информацию о пользователе в localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.reload(); // Перезагружаем страницу для обновления состояния
    } else {
        console.error("Login failed:", data.message);
    }
}

// Пример использования loginUser при отправке формы
document.getElementById("submit1").addEventListener("click", function(e) {
    e.preventDefault(); // Останавливаем стандартную отправку формы

    const email = document.getElementById("email1").value;
    const password = document.getElementById("password1").value;

    loginUser(email, password); // Вызов функции для входа
});
