// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

const user = auth.currentUser;
const username = document.getElementById('username');
const upload = document.getElementById('upload');
const logout = document.getElementById('logout');
const enter = document.querySelector('.auth');

auth.onAuthStateChanged(function(user) {
  if(user) {
    username.style.display = "block"
    upload.style.display = "block"
    logout.style.display = "block"
    enter.style.display = "none"

    const userId = user.uid;
    const usernameRef = ref(db, "users/" + userId + "/username");

    get(usernameRef).then((snapshot) => {
      if (snapshot.exists()) {
        const usernameValue = snapshot.val();
        username.innerText = usernameValue;
      } else {
        alert('данные об имени пользователя не найдены')
      }
    }).catch((error) => {
      alert("Ошибка при получении имени пользователя" + error);
  })
  }
})

logout.addEventListener('click', function() {
  auth.signOut().then(function() {
    alert('Вы вышли из аккаунта');

    username.style.display = "none"
    upload.style.display = "none"
    logout.style.display = "none"
    enter.style.display = "block"
  }) .catch(function(error) {
    alert.error('Ошибка при выходе из аккаунта', error);
  });
});

// Загрузка видео

const upload_video = document.getElementById('upload');

upload_video.addEventListener("click", function() {
  window.location.href = "upload_video.html"
})