document.addEventListener('DOMContentLoaded', () => {
    // Проверяем авторизацию
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'enter.html';
        return;
    }

    // Получаем элементы страницы
    const playlistsList = document.getElementById('playlistsList');
    const createPlaylistBtn = document.getElementById('createPlaylistBtn');
    const createPlaylistModal = document.getElementById('createPlaylistModal');
    const createPlaylistForm = document.getElementById('createPlaylistForm');
    const closeBtn = document.querySelector('.close');
    const username = document.querySelector('.username');
    const upload = document.querySelector('.upload');
    const logout = document.querySelector('.logout');
    const enter = document.querySelector('.authLink');

    // Обновляем UI в зависимости от авторизации
    if (user) {
        if (username) username.style.display = "block";
        if (upload) upload.style.display = "block";
        if (logout) logout.style.display = "block";
        if (enter) enter.style.display = "none";
        if (username) username.innerText = user.username;
    }

    // Обработчик выхода
    if (logout) {
        logout.addEventListener('click', () => {
            localStorage.removeItem('user');
            window.location.href = 'enter.html';
        });
    }

    // Обработчик для кнопки загрузки видео
    if (upload) {
        upload.addEventListener('click', () => {
            window.location.href = 'upload_video.html';
        });
    }

    // Открытие модального окна
    createPlaylistBtn.addEventListener('click', () => {
        createPlaylistModal.style.display = 'block';
    });

    // Закрытие модального окна
    closeBtn.addEventListener('click', () => {
        createPlaylistModal.style.display = 'none';
    });

    // Закрытие модального окна при клике вне его
    window.addEventListener('click', (e) => {
        if (e.target === createPlaylistModal) {
            createPlaylistModal.style.display = 'none';
        }
    });

    // Создание нового плейлиста
    createPlaylistForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('playlistName').value;
        const description = document.getElementById('playlistDescription').value;

        try {
            const response = await fetch('/api/playlists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user.user_id,
                    name,
                    description
                })
            });

            if (!response.ok) {
                throw new Error('Ошибка при создании плейлиста');
            }

            // Очищаем форму и закрываем модальное окно
            createPlaylistForm.reset();
            createPlaylistModal.style.display = 'none';

            // Обновляем список плейлистов
            loadPlaylists();
        } catch (error) {
            console.error('Ошибка при создании плейлиста:', error);
            alert('Ошибка при создании плейлиста');
        }
    });

    // Загрузка плейлистов
    const loadPlaylists = async () => {
        try {
            const response = await fetch(`/api/users/${user.user_id}/playlists`);
            if (!response.ok) {
                throw new Error('Ошибка при загрузке плейлистов');
            }

            const playlists = await response.json();
            displayPlaylists(playlists);
        } catch (error) {
            console.error('Ошибка при загрузке плейлистов:', error);
            alert('Ошибка при загрузке плейлистов');
        }
    };

    // Отображение плейлистов
    const displayPlaylists = (playlists) => {
        playlistsList.innerHTML = '';

        if (playlists.length === 0) {
            playlistsList.innerHTML = '<p>У вас пока нет плейлистов</p>';
            return;
        }

        playlists.forEach(playlist => {
            const playlistElement = document.createElement('div');
            playlistElement.className = 'playlist-item';
            
            const date = new Date(playlist.creation_date);
            const formattedDate = date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            playlistElement.innerHTML = `
                <div class="playlist-header">
                    <h3>${playlist.playlist_name}</h3>
                    <div class="playlist-actions">
                        <button class="delete-playlist-btn" data-playlist-id="${playlist.playlist_id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p class="playlist-description">${playlist.playlist_description || 'Нет описания'}</p>
                <p class="playlist-info">
                    <span class="video-count">${playlist.video_count} видео</span>
                    <span class="created-date">Создан: ${formattedDate}</span>
                </p>
                <a href="playlist_view.html?id=${playlist.playlist_id}" class="view-playlist-btn">
                    Просмотреть плейлист
                </a>
            `;

            playlistsList.appendChild(playlistElement);

            // Добавляем обработчик для кнопки удаления
            const deleteBtn = playlistElement.querySelector('.delete-playlist-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => deletePlaylist(playlist.playlist_id));
            }
        });
    };

    // Удаление плейлиста
    const deletePlaylist = async (playlistId) => {
        if (!confirm('Вы уверены, что хотите удалить этот плейлист?')) {
            return;
        }

        try {
            const response = await fetch(`/api/playlists/${playlistId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: user.user_id })
            });

            if (!response.ok) {
                throw new Error('Ошибка при удалении плейлиста');
            }

            // Обновляем список плейлистов
            loadPlaylists();
        } catch (error) {
            console.error('Ошибка при удалении плейлиста:', error);
            alert('Ошибка при удалении плейлиста');
        }
    };

    // Загружаем плейлисты при загрузке страницы
    loadPlaylists();
}); 