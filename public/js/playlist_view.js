document.addEventListener('DOMContentLoaded', () => {
    // Проверяем авторизацию
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'enter.html';
        return;
    }

    // Получаем ID плейлиста из URL
    const urlParams = new URLSearchParams(window.location.search);
    const playlistId = urlParams.get('id');

    if (!playlistId) {
        console.error('ID плейлиста не указан');
        return;
    }

    // Получаем элементы страницы
    const playlistName = document.getElementById('playlistName');
    const playlistDescription = document.getElementById('playlistDescription');
    const videoCount = document.getElementById('videoCount');
    const createdDate = document.getElementById('createdDate');
    const videosList = document.getElementById('videosList');
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

    // Загрузка информации о плейлисте
    const loadPlaylist = async () => {
        try {
            const response = await fetch(`/api/playlists/${playlistId}`);
            if (!response.ok) {
                throw new Error('Ошибка при загрузке плейлиста');
            }

            const playlist = await response.json();
            displayPlaylistInfo(playlist);
        } catch (error) {
            console.error('Ошибка при загрузке плейлиста:', error);
            alert('Ошибка при загрузке плейлиста');
        }
    };

    // Отображение информации о плейлисте
    const displayPlaylistInfo = (playlist) => {
        playlistName.textContent = playlist.playlist_name;
        playlistDescription.textContent = playlist.playlist_description || 'Нет описания';
        videoCount.textContent = `${playlist.video_count} видео`;
        
        const date = new Date(playlist.creation_date);
        createdDate.textContent = `Создан: ${date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })}`;
    };

    // Загрузка видео из плейлиста
    const loadPlaylistVideos = async () => {
        try {
            const response = await fetch(`/api/playlists/${playlistId}/videos`);
            if (!response.ok) {
                throw new Error('Ошибка при загрузке видео');
            }

            const videos = await response.json();
            displayVideos(videos);
        } catch (error) {
            console.error('Ошибка при загрузке видео:', error);
            alert('Ошибка при загрузке видео');
        }
    };

    // Отображение видео
    const displayVideos = (videos) => {
        videosList.innerHTML = '';

        if (videos.length === 0) {
            videosList.innerHTML = '<p>В плейлисте пока нет видео</p>';
            return;
        }

        videos.forEach(video => {
            const videoElement = document.createElement('div');
            videoElement.className = 'video-item';
            
            const date = new Date(video.upload_date);
            const formattedDate = date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            videoElement.innerHTML = `
                <a href="/video.html?id=${video.video_id}" class="video-link">
                    <div class="thumbnail-container">
                        <img src="${video.thumbnail_url}" alt="${video.title}" class="video-thumbnail">
                    </div>
                    <div class="video-info">
                        <div class="video-author-info">
                            <h4 class="video-title">${video.title}</h4>
                        </div>
                        <div class="video-author-info-name">
                            <img src="${video.author_avatar || 'images/default-avatar.png'}" alt="${video.author_name}" class="video-author-avatar">
                            <p class="video-uploader">${video.author_name}</p>
                        </div>
                        <p class="video-views">${video.views} просмотров</p>
                        <p class="video-date">${formattedDate}</p>
                    </div>
                </a>
                <button class="remove-from-playlist-btn" data-video-id="${video.video_id}">
                    <i class="fas fa-times"></i>
                </button>
            `;

            videosList.appendChild(videoElement);

            // Добавляем обработчик для кнопки удаления из плейлиста
            const removeBtn = videoElement.querySelector('.remove-from-playlist-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => removeFromPlaylist(video.video_id));
            }
        });
    };

    // Удаление видео из плейлиста
    const removeFromPlaylist = async (videoId) => {
        if (!confirm('Вы уверены, что хотите удалить это видео из плейлиста?')) {
            return;
        }

        try {
            const response = await fetch(`/api/playlists/${playlistId}/videos/${videoId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: user.user_id })
            });

            if (!response.ok) {
                throw new Error('Ошибка при удалении видео из плейлиста');
            }

            // Обновляем список видео
            await loadPlaylistVideos();
            // Обновляем информацию о плейлисте
            await loadPlaylist();
        } catch (error) {
            console.error('Ошибка при удалении видео из плейлиста:', error);
            alert('Ошибка при удалении видео из плейлиста');
        }
    };

    // Загружаем информацию о плейлисте и видео при загрузке страницы
    loadPlaylist();
    loadPlaylistVideos();
}); 