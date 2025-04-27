document.addEventListener("DOMContentLoaded", function() { // Убедимся, что DOM загружен

    const usernameSpan = document.getElementById("username");
    const logoutButton = document.getElementById("logout");
    const uploadButton = document.getElementById("upload");
    const authLink = document.querySelector(".authLink"); // Кнопка "Войти" или ссылка

    // Проверка, что элементы существуют
    if (!usernameSpan || !logoutButton || !uploadButton || !authLink) {
        console.error("Один или несколько элементов не найдены.");
        return;
    }

    // Проверяем авторизацию пользователя
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
        // Пользователь авторизован
        usernameSpan.textContent = user.username;
        authLink.style.display = "none";
        uploadButton.style.display = "block";
        logoutButton.style.display = "block";
        usernameSpan.style.display = "block";

        // Обработчик для кнопки загрузки видео
        uploadButton.addEventListener('click', function() {
            window.location.href = 'upload_video.html';
        });

        // Обработчик для кнопки выхода
        logoutButton.addEventListener('click', function() {
            localStorage.removeItem('user');
            window.location.reload();
        });
    } else {
        // Пользователь не авторизован
        usernameSpan.style.display = "none";
        uploadButton.style.display = "none";
        logoutButton.style.display = "none";
        authLink.style.display = "block";
    }
});