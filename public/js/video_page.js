document.addEventListener('DOMContentLoaded', () => {
    // Проверяем авторизацию
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'enter.html';
        return;
    }

    // Получаем ID видео из URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');

    if (!videoId) {
        console.error('ID видео не указан');
        return;
    }

    // Получаем элементы страницы
    const videoPlayer = document.getElementById('videoPlayer');
    const videoTitle = document.getElementById('videoTitle');
    const videoDescription = document.getElementById('videoDescription');
    const videoViews = document.getElementById('videoViews');
    const uploadDate = document.getElementById('uploadDate');
    const channelName = document.getElementById('channelName');
    const channelAvatar = document.getElementById('channelAvatar');
    const channelLink = document.getElementById('channelLink');
    const errorMessage = document.getElementById('errorMessage');
const username = document.getElementById('username');
const upload = document.getElementById('upload');
const logout = document.getElementById('logout');
    const enter = document.querySelector('.auth');
    const likeButton = document.getElementById('likeButton');
    const dislikeButton = document.getElementById('dislikeButton');
    const likeCount = document.getElementById('likeCount');
    const dislikeCount = document.getElementById('dislikeCount');

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

    // Обработчик входа
    if (enter) {
        enter.addEventListener('click', () => {
            window.location.href = 'enter.html';
        });
    }

    // Функция для форматирования даты
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Функция для форматирования количества просмотров
    const formatViews = (views) => {
        if (views >= 1000000) {
            return `${(views / 1000000).toFixed(1)}M просмотров`;
        } else if (views >= 1000) {
            return `${(views / 1000).toFixed(1)}K просмотров`;
        }
        return `${views} просмотров`;
    };

    // Функция для проверки поддержки формата видео
    const canPlayType = (videoElement, mimeType) => {
        return videoElement.canPlayType(mimeType) !== '';
    };

    // Функция для обновления рейтинга
    const updateRatings = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const userId = user ? user.user_id : null;

            const response = await fetch(`/api/videos/${videoId}/ratings${userId ? `?user_id=${userId}` : ''}`);
            if (!response.ok) {
                throw new Error('Ошибка при получении рейтинга');
            }

            const ratings = await response.json();
            console.log('Получен рейтинг:', ratings);
            
            // Обновляем счетчики
            if (likeCount) {
                likeCount.textContent = ratings.likes;
                console.log('Обновлен счетчик лайков:', ratings.likes);
            }
            if (dislikeCount) {
                dislikeCount.textContent = ratings.dislikes;
                console.log('Обновлен счетчик дизлайков:', ratings.dislikes);
            }

            // Обновляем состояние кнопок
            if (likeButton) {
                likeButton.classList.toggle('active', ratings.userRating === 'like');
                console.log('Обновлено состояние кнопки лайка:', ratings.userRating === 'like');
            }
            if (dislikeButton) {
                dislikeButton.classList.toggle('active', ratings.userRating === 'dislike');
                console.log('Обновлено состояние кнопки дизлайка:', ratings.userRating === 'dislike');
            }

        } catch (error) {
            console.error('Ошибка при обновлении рейтинга:', error);
            if (errorMessage) {
                errorMessage.textContent = error.message;
                errorMessage.style.display = 'block';
            }
        }
    };

    // Обработчики для кнопок лайка и дизлайка
    if (likeButton) {
        likeButton.addEventListener('click', async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                window.location.href = 'enter.html';
                return;
            }

            try {
                const response = await fetch(`/api/videos/${videoId}/like`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user_id: user.user_id })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Ошибка при постановке лайка');
                }

                const result = await response.json();
                console.log('Результат постановки лайка:', result);

                // Обновляем UI в зависимости от результата
                if (likeButton) {
                    likeButton.classList.toggle('active', result.action === 'like');
                }

                // Обновляем счетчики
                await updateRatings();

            } catch (error) {
                console.error('Ошибка при постановке лайка:', error);
                if (errorMessage) {
                    errorMessage.textContent = error.message;
                    errorMessage.style.display = 'block';
                }
            }
        });
    }

    if (dislikeButton) {
        dislikeButton.addEventListener('click', async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                window.location.href = 'enter.html';
                return;
            }

            try {
                const response = await fetch(`/api/videos/${videoId}/dislike`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user_id: user.user_id })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Ошибка при постановке дизлайка');
                }

                const result = await response.json();
                console.log('Результат постановки дизлайка:', result);

                // Обновляем UI в зависимости от результата
                if (dislikeButton) {
                    dislikeButton.classList.toggle('active', result.action === 'dislike');
                }

                // Обновляем счетчики
                await updateRatings();

            } catch (error) {
                console.error('Ошибка при постановке дизлайка:', error);
                if (errorMessage) {
                    errorMessage.textContent = error.message;
                    errorMessage.style.display = 'block';
                }
        }
    });
}

    // Загружаем информацию о видео
    const loadVideo = async () => {
        try {
            console.log('Загрузка информации о видео:', videoId);
            const response = await fetch(`/api/videos/${videoId}`);
            
            if (response.status === 404) {
                throw new Error('Видео не найдено');
            }
            
            if (!response.ok) {
                throw new Error('Ошибка при загрузке видео');
            }

            const video = await response.json();
            console.log('Получены данные о видео:', video);

            if (!video.video_url) {
                throw new Error('URL видео не найден');
            }

            // Определяем MIME-тип видео
            const ext = video.video_url.split('.').pop().toLowerCase();
            const mimeTypes = {
                'mp4': 'video/mp4',
                'webm': 'video/webm',
                'ogg': 'video/ogg',
                'mov': 'video/quicktime',
                'avi': 'video/x-msvideo',
                'wmv': 'video/x-ms-wmv',
                'flv': 'video/x-flv',
                'mkv': 'video/x-matroska',
                'mpeg': 'video/mpeg',
                'mpg': 'video/mpeg'
            };

            const mimeType = mimeTypes[ext];
            if (!mimeType) {
                throw new Error('Неподдерживаемый формат видео');
            }

            // Проверяем поддержку формата
            if (!canPlayType(videoPlayer, mimeType)) {
                // Если формат не поддерживается, пробуем MP4
                if (mimeType !== 'video/mp4') {
                    const mp4Url = video.video_url.replace(/\.[^.]+$/, '.mp4');
                    if (canPlayType(videoPlayer, 'video/mp4')) {
                        videoPlayer.src = mp4Url;
                        videoPlayer.type = 'video/mp4';
                    } else {
                        throw new Error('Браузер не поддерживает формат видео. Пожалуйста, используйте современный браузер.');
                    }
                } else {
                    throw new Error('Браузер не поддерживает формат видео. Пожалуйста, используйте современный браузер.');
                }
    } else {
                videoPlayer.src = video.video_url;
                videoPlayer.type = mimeType;
            }

            // Обновляем информацию на странице
            if (videoTitle) videoTitle.textContent = video.title;
            if (videoDescription) videoDescription.textContent = video.description;
            if (videoViews) videoViews.textContent = formatViews(video.views);
            if (uploadDate) uploadDate.textContent = formatDate(video.upload_date);
            if (channelName) channelName.textContent = video.channel_name;
            if (channelAvatar) channelAvatar.src = video.channel_avatar || '/images/default-avatar.png';
            if (channelLink) channelLink.href = `/channel.html?id=${video.channel_id}`;

            // Загружаем видео
            if (videoPlayer) {
                videoPlayer.load();
                console.log('Видео загружено:', video.video_url);
            }

            // Увеличиваем счетчик просмотров
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && user.user_id) {
                try {
                    const viewResponse = await fetch(`/api/videos/${videoId}/view`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ user_id: user.user_id })
                    });

                    if (!viewResponse.ok) {
                        console.error('Ошибка при регистрации просмотра:', await viewResponse.json());
                    } else {
                        const result = await viewResponse.json();
                        if (result.viewCount > 0) {
                            // Обновляем счетчик просмотров на странице
                            if (videoViews) {
                                videoViews.textContent = formatViews(video.views + 1);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Ошибка при регистрации просмотра:', error);
                }
            }

            // Загружаем рейтинг после загрузки видео
            await updateRatings();

        } catch (error) {
            console.error('Ошибка при загрузке видео:', error);
            if (errorMessage) {
                errorMessage.textContent = error.message;
                errorMessage.style.display = 'block';
            }
        }
    };

    // Обработчики событий для видео
    if (videoPlayer) {
        videoPlayer.addEventListener('loadeddata', () => {
            console.log('Видео загружено и готово к воспроизведению');
            if (errorMessage) errorMessage.style.display = 'none';
        });

        videoPlayer.addEventListener('error', (e) => {
            console.error('Ошибка при воспроизведении видео:', e);
            if (errorMessage) {
                errorMessage.textContent = 'Ошибка при воспроизведении видео. Пожалуйста, попробуйте позже.';
                errorMessage.style.display = 'block';
            }
        });

        videoPlayer.addEventListener('stalled', () => {
            console.log('Загрузка видео остановлена');
            if (errorMessage) {
                errorMessage.textContent = 'Загрузка видео остановлена. Пожалуйста, проверьте подключение к интернету.';
                errorMessage.style.display = 'block';
            }
        });
    }

    // Загружаем видео при загрузке страницы
    loadVideo();

    // Функция для загрузки комментариев
    const loadComments = async () => {
        try {
            const response = await fetch(`/api/videos/${videoId}/comments`);
            if (!response.ok) {
                throw new Error('Ошибка при загрузке комментариев');
            }
            const comments = await response.json();
            displayComments(comments);
        } catch (error) {
            console.error('Ошибка при загрузке комментариев:', error);
        }
    };

    // Функция для отображения комментариев
    const displayComments = (comments) => {
        const commentsList = document.getElementById('commentsList');
        commentsList.innerHTML = '';

        if (comments.length === 0) {
            commentsList.innerHTML = '<p>Комментариев пока нет</p>';
            return;
        }

        comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';
            
            const date = new Date(comment.comment_date);
            const formattedDate = date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            commentElement.innerHTML = `
                <img src="${comment.profile_picture_url || '/images/default-avatar.png'}" alt="Аватар" class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-username">${comment.username}</span>
                        <span class="comment-date">${formattedDate}</span>
                    </div>
                    <p class="comment-text">${comment.comment_text}</p>
                </div>
            `;
            commentsList.appendChild(commentElement);
        });
    };

    // Функция для добавления комментария
    const addComment = async () => {
        const commentText = document.getElementById('commentText').value.trim();
        if (!commentText) {
            alert('Введите текст комментария');
            return;
        }

        if (!user) {
            alert('Для добавления комментария необходимо авторизоваться');
            window.location.href = '/enter.html';
            return;
        }

        try {
            const response = await fetch(`/api/videos/${videoId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user.user_id,
                    comment_text: commentText
                })
            });

            if (!response.ok) {
                throw new Error('Ошибка при добавлении комментария');
            }

            // Очищаем поле ввода и обновляем список комментариев
            document.getElementById('commentText').value = '';
            loadComments();
        } catch (error) {
            console.error('Ошибка при добавлении комментария:', error);
            alert('Ошибка при добавлении комментария');
        }
    };

    // Загружаем комментарии при загрузке страницы
    loadComments();

    // Обработчик для кнопки отправки комментария
    document.getElementById('submitComment').addEventListener('click', addComment);

    // Обработчик для отправки комментария по Enter
    document.getElementById('commentText').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addComment();
        }
    });
});