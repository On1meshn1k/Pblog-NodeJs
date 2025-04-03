document.addEventListener("DOMContentLoaded", function() { // Убедимся, что DOM загружен

  const usernameSpan = document.getElementById("username");
  const logoutButton = document.getElementById("logout");
  const uploadButton = document.getElementById("upload");
  const authLink = document.querySelector(".authLink"); // Кнопка "Войти" или ссылка
  const channelNameSpan = document.querySelector(".channel-name"); // Добавляем элемент для имени канала
  const channelLogo = document.querySelector(".channel-logo"); // Добавляем элемент для аватарки

  // Проверка, что элементы существуют
  if (!usernameSpan || !logoutButton || !uploadButton || !authLink || !channelNameSpan || !channelLogo) {
    console.error("Один или несколько элементов не найдены.");
    return;
  }

  const isLoggedIn = localStorage.getItem("user"); // Получаем данные из localStorage

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
  }
  // Переход на страницу редактирования профиля
  const changeLogoButton = document.getElementById("changeLogo");
  if (changeLogoButton) {
    changeLogoButton.addEventListener("click", () => {
      window.location.href = "edit-profile.html";
    });
  }
});

document.addEventListener('DOMContentLoaded', async () => {
    const videoList = document.getElementById('videoList');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = 'enter.html';
        return;
    }

    try {
        // Загружаем видео пользователя
        const response = await fetch(`/api/users/${user.user_id}/videos`);
        if (!response.ok) {
            throw new Error('Ошибка при загрузке видео');
        }
        
        const videos = await response.json();
        console.log('Загружены видео пользователя:', videos);

        // Очищаем контейнер
        videoList.innerHTML = '';

        // Добавляем каждое видео
        videos.forEach(video => {
            const videoElement = createVideoElement(video);
            videoList.appendChild(videoElement);
        });

        // Если видео нет, показываем сообщение
        if (videos.length === 0) {
            videoList.innerHTML = '<p class="no-videos">У вас пока нет загруженных видео</p>';
        }

    } catch (error) {
        console.error('Ошибка:', error);
        videoList.innerHTML = '<p class="error">Ошибка при загрузке видео</p>';
    }
});

function createVideoElement(video) {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    
    videoItem.innerHTML = `
        <img src="${video.thumbnail_url}" alt="${video.title}">
        <div class="video-info">
            <h3>${video.title}</h3>
            <p>${video.views} просмотров</p>
            <p class="upload-date">Загружено: ${new Date(video.upload_date).toLocaleDateString()}</p>
        </div>
    `;
    
    videoItem.addEventListener('click', () => {
        window.location.href = `video.html?id=${video.video_id}`;
    });
    
    return videoItem;
}