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
    const videoUploader = document.getElementById('videoUploader');
    const authorAvatar = document.getElementById('authorAvatar');
    const authorLink = document.getElementById('authorLink');
    const errorMessage = document.getElementById('errorMessage');
    const username = document.getElementById('username');
    const upload = document.getElementById('upload');
    const logout = document.getElementById('logout');
    const enter = document.querySelector('.auth');
    const likeButton = document.getElementById('likeButton');
    const dislikeButton = document.getElementById('dislikeButton');
    const likeCount = document.getElementById('likeCount');
    const dislikeCount = document.getElementById('dislikeCount');
    const subscribeButton = document.getElementById('subscribeButton');

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

    // Обработчик для кнопки загрузки видео
    if (upload) {
        upload.addEventListener('click', () => {
            window.location.href = 'upload_video.html';
        });
    }

    // Функция для обновления состояния кнопки подписки
    const updateSubscriptionButton = async (channelId) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;

            const response = await fetch(`/api/channels/${channelId}/subscription/${user.user_id}`);
            const data = await response.json();

            if (subscribeButton) {
                // Проверяем, является ли текущий пользователь владельцем канала
                const isOwner = data.channelOwnerId === user.user_id;
                
                if (isOwner) {
                    subscribeButton.style.display = 'none'; // Скрываем кнопку для владельца
                } else {
                    subscribeButton.style.display = 'block'; // Показываем кнопку для других пользователей
                    if (data.isSubscribed) {
                        subscribeButton.textContent = 'Отписаться';
                        subscribeButton.classList.add('subscribed');
                    } else {
                        subscribeButton.textContent = 'Подписаться';
                        subscribeButton.classList.remove('subscribed');
                    }
                }
                
                // Обновляем счетчик подписчиков, если он есть на странице
                const subscribersCount = document.getElementById('subscribersCount');
                if (subscribersCount) {
                    subscribersCount.textContent = `${data.subscribersCount} подписчиков`;
                }
            }
        } catch (error) {
            console.error('Ошибка при обновлении состояния подписки:', error);
        }
    };

    // Обработчик для кнопки подписки
    if (subscribeButton) {
        subscribeButton.addEventListener('click', async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                window.location.href = 'enter.html';
                return;
            }
            
            try {
                // Получаем ID канала из ссылки на автора
                const channelId = authorLink.href.split('id=')[1];
                if (!channelId) {
                    console.error('ID канала не найден');
                    return;
                }

                const response = await fetch(`/api/channels/${channelId}/subscription`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId: user.user_id })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Ошибка при управлении подпиской');
                }

                const result = await response.json();
                console.log('Результат управления подпиской:', result);

                // Обновляем состояние кнопки подписки
                await updateSubscriptionButton(channelId);

            } catch (error) {
                console.error('Ошибка при управлении подпиской:', error);
                alert(error.message || 'Произошла ошибка при попытке подписки');
            }
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
                // Проверяем, активна ли кнопка дизлайка
                const isDisliked = dislikeButton.classList.contains('active');
                
                // Выбираем метод запроса в зависимости от состояния
                const method = isDisliked ? 'DELETE' : 'POST';
                
                const response = await fetch(`/api/videos/${videoId}/dislike`, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user_id: user.user_id })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Ошибка при управлении дизлайком');
                }

                const result = await response.json();
                console.log('Результат управления дизлайком:', result);

                // Обновляем UI в зависимости от результата
                if (dislikeButton) {
                    dislikeButton.classList.toggle('active', result.action === 'dislike');
                }

                // Обновляем счетчики
                await updateRatings();

            } catch (error) {
                console.error('Ошибка при управлении дизлайком:', error);
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

            const mimeType = mimeTypes[ext] || 'video/mp4';

            // Проверяем поддержку формата
            if (!canPlayType(videoPlayer, mimeType)) {
                console.warn(`Формат ${mimeType} не поддерживается браузером`);
            }

            // Устанавливаем источник видео
            videoPlayer.src = video.video_url;
            videoPlayer.type = mimeType;

            // Заполняем информацию о видео
            if (videoTitle) videoTitle.textContent = video.title;
            if (videoDescription) videoDescription.textContent = video.description || 'Описание отсутствует';
            if (videoViews) videoViews.textContent = formatViews(video.views || 0);
            if (uploadDate) uploadDate.textContent = formatDate(video.upload_date);
            if (videoUploader) videoUploader.textContent = video.author_name || 'Неизвестный автор';
            if (authorAvatar) authorAvatar.src = video.channel_avatar || 'images/default-avatar.png';
            
            // Обновляем счетчик просмотров
            await updateVideoViews(videoId);
            
            // Если есть ссылка на автора, устанавливаем её
            if (authorLink && video.channel_id) {
                authorLink.href = `channel_view.html?id=${video.channel_id}`;
            }
            
            // Обновляем состояние кнопки подписки, если есть ID канала
            if (video.channel_id) {
                await updateSubscriptionButton(video.channel_id);
            }
            
            // Загружаем рейтинги видео
            await updateRatings();
            
            // Загружаем другие видео
            await loadOtherVideos();
            
            // Загружаем комментарии
            await loadComments();
            
        } catch (error) {
            console.error('Ошибка при загрузке видео:', error);
            if (errorMessage) {
                errorMessage.textContent = error.message;
                errorMessage.style.display = 'block';
            }
        }
    };

    // Функция для обновления счетчика просмотров
    const updateVideoViews = async (videoId) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            
            const response = await fetch(`/api/videos/${videoId}/view`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: user.user_id })
            });
            
            if (!response.ok) {
                console.error('Ошибка при обновлении счетчика просмотров');
                return;
            }
            
            const result = await response.json();
            console.log('Результат обновления просмотров:', result);
            
            // Обновляем отображение количества просмотров
            if (result.viewCount > 0) {
                const currentViews = parseInt(videoViews.textContent) || 0;
                videoViews.textContent = formatViews(currentViews + 1);
            }
        } catch (error) {
            console.error('Ошибка при обновлении счетчика просмотров:', error);
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
            const error = videoPlayer.error;
            let errorMessageText = 'Ошибка при воспроизведении видео. ';
            
            if (error) {
                switch(error.code) {
                    case 1:
                        errorMessageText += 'Видео не найдено или недоступно.';
                        break;
                    case 2:
                        errorMessageText += 'Ошибка сети при загрузке видео.';
                        break;
                    case 3:
                        errorMessageText += 'Ошибка декодирования видео.';
                        break;
                    case 4:
                        errorMessageText += 'Видео не поддерживается вашим браузером.';
                        break;
                    default:
                        errorMessageText += 'Неизвестная ошибка.';
                }
            }
            
            if (errorMessage) {
                errorMessage.textContent = errorMessageText;
                errorMessage.style.display = 'block';
            }
            
            // Пробуем перезагрузить видео через 5 секунд
            setTimeout(() => {
                videoPlayer.load();
            }, 5000);
        });

        videoPlayer.addEventListener('stalled', () => {
            console.warn('Загрузка видео остановлена');
            if (errorMessage) {
                errorMessage.textContent = 'Загрузка видео остановлена. Пожалуйста, проверьте подключение к интернету.';
                errorMessage.style.display = 'block';
            }
        });

        videoPlayer.addEventListener('waiting', () => {
            console.log('Видео буферизируется...');
            if (errorMessage) {
                errorMessage.textContent = 'Видео загружается...';
                errorMessage.style.display = 'block';
            }
        });

        videoPlayer.addEventListener('playing', () => {
            console.log('Воспроизведение видео началось');
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
        });
    }

    // Функция для загрузки других видео
    const loadOtherVideos = async () => {
        try {
            const response = await fetch('/api/videos');
            if (!response.ok) {
                throw new Error('Ошибка при загрузке видео');
            }
            const videos = await response.json();
            
            // Фильтруем текущее видео из списка
            const otherVideos = videos.filter(video => video.video_id !== parseInt(videoId));
            
            // Отображаем видео
            displayOtherVideos(otherVideos);
        } catch (error) {
            console.error('Ошибка при загрузке других видео:', error);
        }
    };

    // Функция для отображения других видео
    const displayOtherVideos = (videos) => {
        const videoList = document.getElementById('videoList');
        videoList.innerHTML = '';

        if (videos.length === 0) {
            videoList.innerHTML = '<p>Других видео пока нет</p>';
            return;
        }

        videos.forEach(video => {
            const videoElement = document.createElement('div');
            videoElement.className = 'video-item';
            
            // Форматируем дату
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
                            <img src="${video.logo_url || 'images/default-avatar.png'}" alt="${video.uploader_name}" class="video-author-avatar">
                            <h4 class="video-title">${video.title}</h4>
                        </div>
                        <p class="video-uploader">${video.uploader_name}</p>
                        <p class="video-views">${video.views} просмотров</p>
                        <p class="video-date">${formattedDate}</p>
                    </div>
                </a>
            `;
            videoList.appendChild(videoElement);
        });
    };

    // Загружаем видео и другие видео при загрузке страницы
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