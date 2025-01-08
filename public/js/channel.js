// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
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

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

document.getElementById('change-logo').addEventListener("click", function () {
  const user = auth.currentUser;
  if (user) {
    window.location.href = "edit-profile.html";
  } else {
    alert('Пользователь не авторизирован');
  }
});

const username = document.getElementById('username');
const upload = document.getElementById('upload');
const logout = document.getElementById('logout');
const enter = document.querySelector('.auth');
const channel_name = document.querySelector('.channel-name');
const videoListContainer = document.querySelector('.vid-list');

auth.onAuthStateChanged(function (user) {
  if (user) {
    username.style.display = "block";
    upload.style.display = "block";
    logout.style.display = "block";
    enter.style.display = "none";
    const userId = user.uid;
    const usernameRef = ref(db, "users/" + userId + "/username");

    get(usernameRef).then((snapshot) => {
      if (snapshot.exists()) {
        const usernameValue = snapshot.val();
        username.innerText = usernameValue;
        channel_name.innerText = usernameValue;
      } else {
        alert('данные об имени пользователя не найдены');
      }
    }).catch((error) => {
      alert("Ошибка при получении имени пользователя: " + error);
    });

    const avatarStorageRef = storageRef(storage, `avatars/${userId}/avatar.jpg`);

    getDownloadURL(avatarStorageRef)
      .then((url) => {
        const imgElement = document.querySelector('.channel-logo');
        imgElement.src = url;
      })
      .catch((error) => {
        // alert('Ошибка получения URL изображения: ', error);
      });

    // Загрузка видео пользователя
    loadUserVideos(userId);
  }
});

// Функция для загрузки видео пользователя
function loadUserVideos(userId) {
  const userVideosRef = ref(db, `videos`);
  get(userVideosRef).then((snapshot) => {
    videoListContainer.innerHTML = '';
    snapshot.forEach((childSnapshot) => {
      const video = childSnapshot.val();
      if (video.userId === userId) {
        const videoElement = `
          <div class="vid-item">
              <img src="${video.thumbnailUrl}" class="thumbnail">
            <div class="vid-info">
              <span class="vid-title">${video.title}</span>
              <p>Просмотры: ${video.views}</p>
              <p>${video.uploadDate}</p>
            </div>
          </div>
        `;
        videoListContainer.innerHTML += videoElement;
      }
    });
  }).catch((error) => {
    console.error('Ошибка загрузки видео пользователя:', error);
  });
}

// Выход из аккаунта
logout.addEventListener('click', function () {
  auth.signOut().then(function () {
    alert('Вы вышли из аккаунта');
    username.style.display = "none";
    upload.style.display = "none";
    logout.style.display = "none";
    enter.style.display = "block";
  }).catch(function (error) {
    alert('Ошибка при выходе из аккаунта: ' + error);
  });
})