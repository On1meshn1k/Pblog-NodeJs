document.addEventListener('DOMContentLoaded', () => {
    // Проверка прав администратора
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.is_admin) {
        window.location.href = '/';
        return;
    }

    // Получаем токен из localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    // Общие заголовки для всех запросов
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // Обработчик ошибок авторизации
    const handleAuthError = (response) => {
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = '/';
            return true;
        }
        return false;
    };

    // Переключение между вкладками
    const navItems = document.querySelectorAll('.admin-nav li');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            
            // Обновляем активные элементы
            navItems.forEach(navItem => navItem.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(tab).classList.add('active');
            
            // Загружаем данные для выбранной вкладки
            loadTabData(tab);
        });
    });

    // Загрузка данных для вкладки
    async function loadTabData(tab) {
        try {
            switch (tab) {
                case 'videos':
                    await loadVideos();
                    break;
                case 'comments':
                    await loadComments();
                    break;
                case 'users':
                    await loadUsers();
                    break;
            }
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            alert('Произошла ошибка при загрузке данных');
        }
    }

    // Загрузка списка видео
    async function loadVideos() {
        const response = await fetch('/api/videos', { headers });
        if (handleAuthError(response)) return;
        const videos = await response.json();
        
        const videoList = document.getElementById('adminVideoList');
        videoList.innerHTML = videos.map(video => `
            <div class="video-item">
                <div class="item-info">
                    <h3>${video.title}</h3>
                    <p>Автор: ${video.uploader_name}</p>
                    <p class="video-description">${video.description || 'Описание отсутствует'}</p>
                    <p>Просмотров: ${video.views}</p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-danger" onclick="deleteVideo(${video.video_id})">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Загрузка списка комментариев
    async function loadComments() {
        const response = await fetch('/api/comments', { headers });
        if (handleAuthError(response)) return;
        const comments = await response.json();
        
        const commentList = document.getElementById('adminCommentList');
        commentList.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <div class="item-info">
                    <p>${comment.comment_text}</p>
                    <small>Автор: ${comment.username}</small>
                </div>
                <div class="item-actions">
                    <button class="btn btn-danger" onclick="deleteComment(${comment.comment_id})">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Загрузка списка пользователей
    async function loadUsers() {
        const response = await fetch('/api/users', { headers });
        if (handleAuthError(response)) return;
        const users = await response.json();
        
        const userList = document.getElementById('adminUserList');
        userList.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="item-info">
                    <h3>${user.username}</h3>
                    <p>Email: ${user.email}</p>
                    <p>Роль: ${user.is_admin ? 'Администратор' : 'Пользователь'}</p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-danger" onclick="deleteUser(${user.user_id})">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                    <button class="btn" onclick="toggleAdmin(${user.user_id}, ${!user.is_admin})">
                        ${user.is_admin ? 'Убрать админа' : 'Сделать админом'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Функции для работы с модальным окном
    const modal = document.getElementById('confirmModal');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    function showModal(message, callback) {
        confirmMessage.textContent = message;
        modal.style.display = 'block';
        
        confirmBtn.onclick = () => {
            modal.style.display = 'none';
            callback();
        };
        
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }

    // Функция для удаления видео
    window.deleteVideo = async (videoId) => {
        if (!confirm('Вы уверены, что хотите удалить это видео?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Требуется авторизация');
            }

            const response = await fetch(`/api/videos/${videoId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }

            if (!response.ok) {
                throw new Error('Ошибка при удалении видео');
            }

            // Удаляем элемент видео из DOM
            const videoElement = document.querySelector(`[data-video-id="${videoId}"]`);
            if (videoElement) {
                videoElement.remove();
            }

            // Перезагружаем список видео
            await loadVideos();
        } catch (error) {
            console.error('Ошибка при удалении видео:', error);
            alert(error.message);
        }
    };

    window.deleteComment = async (commentId) => {
        showModal('Вы уверены, что хотите удалить этот комментарий?', async () => {
            try {
                const response = await fetch(`/api/comments/${commentId}`, {
                    method: 'DELETE',
                    headers
                });

                if (handleAuthError(response)) return;

                if (response.ok) {
                    await loadComments();
                    alert('Комментарий успешно удален');
                } else {
                    throw new Error('Ошибка при удалении комментария');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Произошла ошибка при удалении комментария');
            }
        });
    };

    window.deleteUser = async (userId) => {
        showModal('Вы уверены, что хотите удалить этого пользователя?', async () => {
            try {
                const response = await fetch(`/api/users/${userId}`, {
                    method: 'DELETE',
                    headers
                });

                if (handleAuthError(response)) return;

                if (response.ok) {
                    await loadUsers();
                    alert('Пользователь успешно удален');
                } else {
                    throw new Error('Ошибка при удалении пользователя');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Произошла ошибка при удалении пользователя');
            }
        });
    };

    window.toggleAdmin = async (userId, makeAdmin) => {
        showModal(`Вы уверены, что хотите ${makeAdmin ? 'назначить' : 'убрать'} администратора?`, async () => {
            try {
                const response = await fetch(`/api/users/${userId}/admin`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ is_admin: makeAdmin })
                });

                if (handleAuthError(response)) return;

                if (response.ok) {
                    await loadUsers();
                    alert(`Права администратора ${makeAdmin ? 'назначены' : 'убраны'}`);
                } else {
                    throw new Error('Ошибка при изменении прав');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Произошла ошибка при изменении прав');
            }
        });
    };

    // Поиск
    const searchInputs = {
        videos: document.getElementById('videoSearch'),
        comments: document.getElementById('commentSearch'),
        users: document.getElementById('userSearch')
    };

    Object.entries(searchInputs).forEach(([tab, input]) => {
        input.addEventListener('input', debounce(async (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const items = document.querySelectorAll(`#${tab} .${tab.slice(0, -1)}-item`);
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }, 300));
    });

    // Функция для дебаунса
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Загружаем начальные данные
    loadTabData('videos');
}); 