document.addEventListener("DOMContentLoaded", async () => {
    // Получаем элементы страницы
    const usernameSpan = document.getElementById("username");
    const logoutButton = document.getElementById("logoutButton");
    const uploadButton = document.getElementById("uploadButton");
    const authLink = document.getElementById("authLink");
    const channelNameSpan = document.getElementById("channelName");
    const channelLogo = document.getElementById("channelLogo");
    const channelDescription = document.getElementById("channelDescription");
    const subscribeButton = document.getElementById("subscribeButton");
    const videoList = document.getElementById("videoList");
    const subscribersCount = document.getElementById("subscribersCount");

    // Проверяем наличие всех необходимых элементов
    if (!channelNameSpan || !channelLogo || !videoList) {
        console.error("Не найдены необходимые элементы на странице");
        return;
    }

    // Получаем ID канала из URL
    const urlParams = new URLSearchParams(window.location.search);
    const channelId = urlParams.get("id");

    if (!channelId) {
        console.error("ID канала не указан в URL");
        return;
    }

    // Проверяем авторизацию пользователя
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user) {
        if (usernameSpan) usernameSpan.textContent = user.username;
        if (logoutButton) logoutButton.style.display = "block";
        if (uploadButton) uploadButton.style.display = "block";
        if (authLink) authLink.style.display = "none";
    } else {
        if (usernameSpan) usernameSpan.textContent = "Гость";
        if (logoutButton) logoutButton.style.display = "none";
        if (uploadButton) uploadButton.style.display = "none";
        if (authLink) authLink.style.display = "block";
    }

    // Обработчик для кнопки выхода
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("user");
            window.location.reload();
        });
    }

    // Обработчик для кнопки загрузки видео
    if (uploadButton) {
        uploadButton.addEventListener("click", () => {
            if (!user) {
                window.location.href = "enter.html";
                return;
            }
            window.location.href = "upload.html";
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
                if (data.isSubscribed) {
                    subscribeButton.textContent = 'Отписаться';
                    subscribeButton.classList.add('subscribed');
                } else {
                    subscribeButton.textContent = 'Подписаться';
                    subscribeButton.classList.remove('subscribed');
                }
                
                // Обновляем счетчик подписчиков
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
        subscribeButton.addEventListener("click", async () => {
            if (!user) {
                window.location.href = "enter.html";
                return;
            }

            try {
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

    // Загрузка информации о канале
    const loadChannelInfo = async () => {
        try {
            const response = await fetch(`/api/channels/${channelId}`);
            if (!response.ok) {
                throw new Error('Ошибка при загрузке информации о канале');
            }
            const channel = await response.json();
            
            // Обновляем информацию о канале
            if (channelNameSpan) {
                channelNameSpan.innerHTML = `
                    ${channel.channel_name}
                    ${channel.is_verified ? `
                        <span class="verified-badge" title="Подтвержденный канал">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.5 14.5l-4-4 1.5-1.5 2.5 2.5 5-5 1.5 1.5-6.5 6.5z"/>
                            </svg>
                        </span>
                    ` : ''}
                `;
            }
            if (channelLogo) channelLogo.src = channel.logo_url || "images/default-avatar.png";
            if (channelDescription) channelDescription.textContent = channel.channel_description || "Описание отсутствует";
            
            // Обновляем счетчик подписчиков
            if (subscribersCount) {
                subscribersCount.textContent = `${channel.subscribers_count || 0} подписчиков`;
            }
            
            // Проверяем, является ли текущий пользователь владельцем канала
            const currentUser = JSON.parse(localStorage.getItem("user") || "null");
            if (subscribeButton) {
                if (currentUser && channel.user_id === currentUser.user_id) {
                    // Если пользователь просматривает свой канал, скрываем кнопку подписки
                    subscribeButton.style.display = "none";
                } else {
                    // Если пользователь просматривает чужой канал, показываем кнопку подписки
                    subscribeButton.style.display = "block";
                    // Обновляем состояние кнопки подписки
                    await updateSubscriptionButton(channelId);
                }
            }
            
            // Загружаем видео канала
            await loadChannelVideos(channelId);
            
        } catch (error) {
            console.error('Ошибка при загрузке информации о канале:', error);
        }
    };

    // Загрузка видео канала
    const loadChannelVideos = async (channelId) => {
        try {
            const response = await fetch(`/api/channels/${channelId}/videos`);
            if (!response.ok) {
                throw new Error("Не удалось загрузить видео");
            }
            const videos = await response.json();

            if (videos.length === 0) {
                if (videoList) {
                    videoList.innerHTML = "<p>На этом канале пока нет видео</p>";
                }
                return;
            }

            // Очищаем список видео
            if (videoList) {
                videoList.innerHTML = "";
            }

            // Добавляем видео на страницу
            videos.forEach((video) => {
                const videoElement = createVideoElement(video);
                if (videoList && videoElement) {
                    videoList.appendChild(videoElement);
                }
            });
        } catch (error) {
            console.error("Ошибка при загрузке видео канала:", error);
            if (videoList) {
                videoList.innerHTML = "<p>Ошибка при загрузке видео</p>";
            }
        }
    };

    // Создание элемента видео
    const createVideoElement = (video) => {
        const videoDiv = document.createElement("div");
        videoDiv.className = "video-item";
        videoDiv.innerHTML = `
            <a href="/video.html?id=${video.video_id}" class="video-link">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail_url}" alt="${video.title}">
                </div>
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                    <p class="video-meta">
                        <span class="video-views">${formatViews(video.views)} просмотров</span>
                        <span class="video-date">${formatDate(video.upload_date)}</span>
                    </p>
                </div>
            </a>
        `;
        return videoDiv;
    };

    // Форматирование длительности видео
    const formatDuration = (seconds) => {
        if (!seconds) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    };

    // Форматирование количества просмотров
    const formatViews = (views) => {
        if (views >= 1000000) {
            return `${(views / 1000000).toFixed(1)}M`;
        } else if (views >= 1000) {
            return `${(views / 1000).toFixed(1)}K`;
        }
        return views.toString();
    };

    // Форматирование даты
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);
        const diffInMonths = Math.floor(diffInDays / 30);
        const diffInYears = Math.floor(diffInMonths / 12);

        if (diffInYears > 0) {
            return `${diffInYears} ${getPluralForm(diffInYears, "год", "года", "лет")} назад`;
        } else if (diffInMonths > 0) {
            return `${diffInMonths} ${getPluralForm(diffInMonths, "месяц", "месяца", "месяцев")} назад`;
        } else if (diffInDays > 0) {
            return `${diffInDays} ${getPluralForm(diffInDays, "день", "дня", "дней")} назад`;
        } else if (diffInHours > 0) {
            return `${diffInHours} ${getPluralForm(diffInHours, "час", "часа", "часов")} назад`;
        } else if (diffInMinutes > 0) {
            return `${diffInMinutes} ${getPluralForm(diffInMinutes, "минуту", "минуты", "минут")} назад`;
        } else {
            return "только что";
        }
    };

    // Получение правильной формы слова в зависимости от числа
    const getPluralForm = (number, one, two, five) => {
        let n = Math.abs(number);
        n %= 100;
        if (n >= 5 && n <= 20) {
            return five;
        }
        n %= 10;
        if (n === 1) {
            return one;
        }
        if (n >= 2 && n <= 4) {
            return two;
        }
        return five;
    };

    // Загружаем информацию о канале
    loadChannelInfo();
}); 