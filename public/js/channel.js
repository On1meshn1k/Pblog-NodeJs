document.addEventListener("DOMContentLoaded", function() { // Убедимся, что DOM загружен

  const usernameSpan = document.getElementById("username");
  const logoutButton = document.getElementById("logout");
  const uploadButton = document.getElementById("upload");
  const authLink = document.querySelector(".authLink"); // Кнопка "Войти" или ссылка
  const channelNameSpan = document.getElementById("channelName"); // Исправляем селектор
  const channelLogo = document.getElementById("channelLogo"); // Исправляем селектор
  const channelDescription = document.getElementById("channelDescription");
  const editProfileButton = document.getElementById("editProfile");
  const verifyEmailButton = document.getElementById("verifyEmail");
  const videoList = document.getElementById("videoList");
  const subscribersCount = document.getElementById("subscribersCount");
  
  // Проверка, что элементы существуют
  if (!usernameSpan || !logoutButton || !uploadButton || !authLink || !channelNameSpan || !channelLogo || !channelDescription || !editProfileButton || !videoList || !verifyEmailButton) {
    console.error("Один или несколько элементов не найдены.");
    return;
  }

  const isLoggedIn = localStorage.getItem("user"); // Получаем данные из localStorage

  // Функция для загрузки информации о канале
  const loadChannelInfo = async (userId) => {
    try {
      const response = await fetch(`/api/channels/user/${userId}`);
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
      
      // Получаем актуальное количество подписчиков
      const subscribersResponse = await fetch(`/api/channels/${channel.channel_id}/subscription/${userId}`);
      if (subscribersResponse.ok) {
        const subscribersData = await subscribersResponse.json();
        if (subscribersCount) {
          subscribersCount.textContent = `${subscribersData.subscribersCount} подписчиков`;
        }
      }
      
      // Показываем кнопку подтверждения email только если пользователь не подтвердил email
      if (verifyEmailButton) {
        if (!channel.is_verified) {
          verifyEmailButton.classList.add('visible');
        } else {
          verifyEmailButton.classList.remove('visible');
        }
      }
      
      // Загружаем видео канала
      await loadChannelVideos(channel.channel_id);
      
    } catch (error) {
      console.error('Ошибка при загрузке информации о канале:', error);
    }
  };

  // Функция для загрузки видео канала
  const loadChannelVideos = async (channelId) => {
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
            window.location.href = "enter.html";
            return;
        }

        const response = await fetch(`/api/channels/${channelId}/videos?user_id=${user.user_id}`);
        if (!response.ok) {
            throw new Error('Ошибка при загрузке видео канала');
        }
        const videos = await response.json();
        
        // Очищаем список видео
        videoList.innerHTML = '';
        
        if (videos.length === 0) {
            videoList.innerHTML = '<p class="no-videos">У вас пока нет видео</p>';
            return;
        }
        
        // Отображаем видео
        videos.forEach(video => {
            const videoElement = createVideoElement(video);
            videoList.appendChild(videoElement);
        });
    } catch (error) {
        console.error('Ошибка при загрузке видео канала:', error);
        videoList.innerHTML = '<p class="error-message">Ошибка при загрузке видео</p>';
    }
  };

  // Функция для создания элемента видео
  function createVideoElement(video) {
    const videoElement = document.createElement('div');
    videoElement.className = 'video-item';
    videoElement.innerHTML = `
        <a href="video.html?id=${video.video_id}">
            <img src="${video.thumbnail_url}" alt="${video.title}">
            <h3>${video.title}</h3>
            <p>${video.views} просмотров</p>
            <p>${new Date(video.upload_date).toLocaleDateString()}</p>
        </a>
        <div class="video-actions">
            <button class="delete-video-btn" data-video-id="${video.video_id}">
                <i class="fas fa-trash"></i> Удалить
            </button>
        </div>
    `;

    // Добавляем обработчик для кнопки удаления
    const deleteBtn = videoElement.querySelector('.delete-video-btn');
    deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('Вы уверены, что хотите удалить это видео?')) {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    alert('Требуется авторизация');
                    return;
                }

                const response = await fetch(`/api/videos/${video.video_id}/owner`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': token,
                        'Content-Type': 'application/json'
                    }
                });

                // Сначала проверяем статус авторизации
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/';
                    return;
                }

                // Затем проверяем общий статус ответа
                if (!response.ok) {
                    let errorMessage = 'Ошибка при удалении видео';
                    try {
                        const error = await response.json();
                        errorMessage = error.error || errorMessage;
                    } catch (e) {
                        // Если не удалось распарсить JSON, используем стандартное сообщение
                        console.error('Ошибка при парсинге ответа:', e);
                    }
                    throw new Error(errorMessage);
                }

                // Если всё успешно, удаляем видео со страницы
                videoElement.remove();
                alert('Видео успешно удалено');
            } catch (error) {
                console.error('Ошибка при удалении видео:', error);
                alert(error.message);
            }
        }
    });

    return videoElement;
  }

  if (isLoggedIn) {
    try {
      const user = JSON.parse(isLoggedIn); // Преобразуем строку JSON обратно в объект
      uploadButton.addEventListener('click', function() {
            window.location.href = 'upload_video.html';
        });

      // Отображаем имя пользователя и скрываем кнопки входа/регистрации
      usernameSpan.textContent = user.username;
      channelNameSpan.textContent = user.username; // Отображаем имя пользователя в channel-name
      
      // Устанавливаем аватарку пользователя
      if (user.profile_picture_url) {
        channelLogo.src = user.profile_picture_url;
      } else {
        channelLogo.src = "images/default-avatar.png"; // Используем стандартную аватарку, если нет своей
      }
      
      authLink.style.display = "none"; // Скрыть кнопку "Войти"
      uploadButton.style.display = "block"; // Показать кнопку загрузки видео
      logoutButton.style.display = "block"; // Показать кнопку выхода
      usernameSpan.style.display = "block"; // Показать имя пользователя

      // Загружаем информацию о канале
      loadChannelInfo(user.user_id);

      logoutButton.addEventListener("click", () => {
        localStorage.removeItem("user"); // Удалить данные при выходе
        window.location.reload(); // Перезагружаем страницу
      });
    } catch (error) {
      console.error("Ошибка при парсинге данных пользователя:", error);
    }
  } else {
    // Если пользователь не авторизован
    usernameSpan.style.display = "none"; // Скрыть имя пользователя
    uploadButton.style.display = "none"; // Скрыть кнопку загрузки
    logoutButton.style.display = "none"; // Скрыть кнопку выхода
    channelNameSpan.textContent = ""; // Очищаем имя канала
    channelLogo.src = "images/default-avatar.png"; // Устанавливаем стандартную аватарку
    alert("Пожалуйста, авторизуйтесь для просмотра канала");
    window.location.href = "enter.html";
  }
  
  // Переход на страницу редактирования профиля
  const changeLogoButton = document.getElementById("changeLogo");
  if (changeLogoButton) {
    changeLogoButton.addEventListener("click", () => {
      window.location.href = "edit-profile.html";
    });
  }

  // Обработчик для кнопки "Изменить профиль"
  if (editProfileButton) {
    editProfileButton.addEventListener("click", () => {
      window.location.href = "edit-profile.html";
    });
  }

  // Обработчик для кнопки подтверждения email
  if (verifyEmailButton) {
    verifyEmailButton.addEventListener('click', async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
          alert('Требуется авторизация');
          return;
        }

        const response = await fetch('/api/resend-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: user.email })
        });

        const data = await response.json();

        if (response.ok) {
          alert('Письмо с подтверждением отправлено на ваш email');
        } else {
          alert(data.message || 'Ошибка при отправке письма подтверждения');
        }
      } catch (error) {
        console.error('Ошибка при отправке письма подтверждения:', error);
        alert('Произошла ошибка при отправке письма подтверждения');
      }
    });
  }
});