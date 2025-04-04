document.addEventListener('DOMContentLoaded', () => {
    // Получаем элементы страницы
    const username = document.getElementById('username');
    const upload = document.getElementById('upload');
    const logout = document.getElementById('logout');
    const enter = document.querySelector('.auth');
    const subscriptionsList = document.querySelector('.subscriptions-list');

    // Проверяем авторизацию
    const user = JSON.parse(localStorage.getItem('user'));

    // Обновляем UI в зависимости от авторизации
    if (user) {
        if (username) username.style.display = "block";
        if (upload) upload.style.display = "block";
        if (logout) logout.style.display = "block";
        if (enter) enter.style.display = "none";
        if (username) username.innerText = user.username;
        
        // Загружаем подписки пользователя
        loadUserSubscriptions(user.user_id);
    } else {
        if (username) username.style.display = "none";
        if (upload) upload.style.display = "none";
        if (logout) logout.style.display = "none";
        if (enter) enter.style.display = "block";
        if (subscriptionsList) {
            subscriptionsList.innerHTML = '<p class="no-subscriptions">Войдите, чтобы видеть подписки</p>';
        }
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

// Функция загрузки подписок пользователя
async function loadUserSubscriptions(userId) {
    try {
        const response = await fetch(`/api/users/${userId}/subscriptions`);
        if (!response.ok) {
            throw new Error('Ошибка при загрузке подписок');
        }
        
        const subscriptions = await response.json();
        const subscriptionsList = document.querySelector('.subscriptions-list');
        
        if (!subscriptionsList) return;
        
        if (subscriptions.length === 0) {
            subscriptionsList.innerHTML = '<p class="no-subscriptions">У вас пока нет подписок</p>';
            return;
        }
        
        // Очищаем список подписок
        subscriptionsList.innerHTML = '';
        
        // Добавляем каждую подписку в список
        subscriptions.forEach(channel => {
            const channelElement = document.createElement('div');
            channelElement.className = 'subscription-item';
            channelElement.innerHTML = `
                <a href="/channel_view.html?id=${channel.channel_id}" class="subscription-link">
                    <img src="${channel.logo_url || 'images/default-avatar.png'}" alt="${channel.channel_name}" class="channel-avatar">
                    <span class="channel-name">${channel.channel_name}</span>
                </a>
            `;
            subscriptionsList.appendChild(channelElement);
        });
    } catch (error) {
        console.error('Ошибка при загрузке подписок:', error);
        const subscriptionsList = document.querySelector('.subscriptions-list');
        if (subscriptionsList) {
            subscriptionsList.innerHTML = '<p class="error">Ошибка при загрузке подписок</p>';
        }
    }
}

// Загрузка видео
const upload_video = document.getElementById('upload');

if (upload_video) {
    upload_video.addEventListener("click", function() {
        window.location.href = "upload_video.html"
    });
}

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