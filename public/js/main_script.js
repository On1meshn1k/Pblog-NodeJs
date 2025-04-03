document.addEventListener('DOMContentLoaded', () => {
    // Получаем элементы страницы
    const username = document.getElementById('username');
    const upload = document.getElementById('upload');
    const logout = document.getElementById('logout');
    const enter = document.querySelector('.auth');

    // Проверяем авторизацию
    const user = JSON.parse(localStorage.getItem('user'));

    // Обновляем UI в зависимости от авторизации
    if (user) {
        if (username) username.style.display = "block";
        if (upload) upload.style.display = "block";
        if (logout) logout.style.display = "block";
        if (enter) enter.style.display = "none";
        if (username) username.innerText = user.username;
    } else {
        if (username) username.style.display = "none";
        if (upload) upload.style.display = "none";
        if (logout) logout.style.display = "none";
        if (enter) enter.style.display = "block";
    }

    // Обработчик выхода
    if (logout) {
        logout.addEventListener('click', () => {
            localStorage.removeItem('user');
            window.location.href = 'enter.html';
        });
    }

    // Обработчик входа
    if (enter) {
        enter.addEventListener('click', () => {
            window.location.href = 'enter.html';
        });
    }
});

// Загрузка видео

const upload_video = document.getElementById('upload');

upload_video.addEventListener("click", function() {
  window.location.href = "upload_video.html"
})