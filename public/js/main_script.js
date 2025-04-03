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

    // Функционал сворачивания/разворачивания сайдбара
    const menuIcon = document.querySelector('.menu-icon');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if (menuIcon && sidebar && mainContent) {
        // Проверяем сохраненное состояние сайдбара
        const isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isSidebarCollapsed) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
        }

        menuIcon.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
            
            // Сохраняем состояние сайдбара
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });
    }
});

// Загрузка видео

const upload_video = document.getElementById('upload');

upload_video.addEventListener("click", function() {
  window.location.href = "upload_video.html"
})

function createVideoElement(video) {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    
    videoItem.innerHTML = `
        <img src="${video.thumbnail_url}" alt="${video.title}">
        <div class="video-info">
            <h3>${video.title}</h3>
            <p>${video.views} просмотров</p>
        </div>
    `;
    
    videoItem.addEventListener('click', () => {
        window.location.href = `video.html?id=${video.video_id}`;
    });
    
    return videoItem;
}