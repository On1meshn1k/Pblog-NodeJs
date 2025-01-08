// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDfKH9o_5TIursPTAV3kgHRo45Sh6-2T4Y",
  authDomain: "pblog-8e245.firebaseapp.com",
  projectId: "pblog-8e245",
  storageBucket: "pblog-8e245.appspot.com",
  messagingSenderId: "438974043232",
  appId: "1:438974043232:web:592cecb687e77958c2df05",
  databaseURL: "https://pblog-8e245-default-rtdb.europe-west1.firebasedatabase.app/",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);


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