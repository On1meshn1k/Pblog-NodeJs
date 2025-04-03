// Подключаемся к элементам формы
const usernameInput = document.getElementById('username');
const avatarInput = document.getElementById('avatar');
const submit = document.getElementById("submit");

// Слушаем событие отправки формы
submit.addEventListener('click', function (event) {
  const newUsername = usernameInput.value;
  // Получаем текущие значения email и password из базы данных
  const user = auth.currentUser;
  auth.onAuthStateChanged(function (user) {

    if (user) {
      const userId = user.uid;
      const userRef = ref(db, 'users/' + userId);

      get(userRef)
        .then((snapshot) => {
          const userData = snapshot.val();
          const userEmail = userData.email;
          const userPassword = userData.password;

          // Обновляем данные пользователя в базе данных, включая новое имя пользователя, но оставляем email и password без изменений
          set(userRef, {
            username: newUsername,
            email: userEmail, // Используем текущее значение email
            password: userPassword // Используем текущее значение password
          })
            .then(() => {
              alert('Данные успешно сохранены');
            })
            .catch((error) => {
              alert('Ошибка при сохранении данных пользователя: ' + error.message);
            });
        })
        .catch((error) => {
          alert('Ошибка при получении данных пользователя: ' + error.message);
        });
    } else {
      alert('Пользователь не аутентифицирован');
    }
  })
});

// Загрузка фото профиля

avatarInput.addEventListener('change', function (event) {
  const file = event.target.files[0];
  const newUsername = usernameInput.value;
  const user = auth.currentUser;

  if (user) {
    const userId = user.uid;
    const avatarStorageRef = storageRef(storage, `avatars/${userId}/avatar.jpg`);

    uploadBytes(avatarStorageRef, file)
      .then((snapshot) => {
        return getDownloadURL(snapshot.ref);
      })
      .then((downloadURL) => {
        const userRef = ref(db, `users/${userId}`);

        get(userRef)
          .then((snapshot) => {
            const userData = snapshot.val();
            const userEmail = userData.email;
            const userPassword = userData.password;
            return userRef.set({
              username: newUsername,
              email: userEmail, // Используем текущее значение email
              password: userPassword, // Используем текущее значение password
              avatarURL: downloadURL
            })
          });
      })
      .then(() => {
        alert("Фото профиля успешно обновлено");
      })
      .catch((error) => {
        alert("Ошибка обновления фото профиля: " + error.message);
      });
  } else {
    alert("Пользователь не аутентифицирован");
  }
});

// Переход на главную страницу

const back = document.getElementById('previous_page');

back.addEventListener('click', function () {
  window.location.href = 'index.html';
})