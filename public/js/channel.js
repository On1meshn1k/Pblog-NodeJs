document.addEventListener("DOMContentLoaded", function() { // Убедимся, что DOM загружен

  const usernameSpan = document.getElementById("username");
  const logoutButton = document.getElementById("logout");
  const uploadButton = document.getElementById("upload");
  const authLink = document.querySelector(".authLink"); // Кнопка "Войти" или ссылка
  const channelNameSpan = document.querySelector(".channel-name"); // Добавляем элемент для имени канала

  // Проверка, что элементы существуют
  if (!usernameSpan || !logoutButton || !uploadButton || !authLink || !channelNameSpan) {
    console.error("Один или несколько элементов не найдены.");
    return;
  }

  const isLoggedIn = localStorage.getItem("user"); // Получаем данные из localStorage

  if (isLoggedIn) {
    try {
      const user = JSON.parse(isLoggedIn); // Преобразуем строку JSON обратно в объект

      // Отображаем имя пользователя и скрываем кнопки входа/регистрации
      usernameSpan.textContent = user.username;
      channelNameSpan.textContent = user.username; // Отображаем имя пользователя в channel-name
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
  }
  // Переход на страницу редактирования профиля
  const changeLogoButton = document.getElementById("change-logo");
  if (changeLogoButton) {
    changeLogoButton.addEventListener("click", () => {
      window.location.href = "edit-profile.html";
    });
  }
});