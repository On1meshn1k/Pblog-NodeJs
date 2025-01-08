// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
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


// регистрация
const submit = document.getElementById('submit');

submit.addEventListener("click", function (event) {
  event.preventDefault()

  const username = document.getElementById('login').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      //данные введены правильно
      const user = userCredential.user;
      localStorage.setItem('uid', user.uid);
      set(ref(db,"users/" + user.uid),{
        username: username,
        email: email,
        password: password
      })
      alert("Регистрация прошла успешно!");
      window.location.href = "index.html";
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      alert(errorMessage);
      // ..
    });

    set(ref(db, "users/" + username.value),{

      username: username,
      email: email,
      password: password

    });
    //alert("Создана БД!")
});

// вход
const submit1 = document.getElementById('submit1');

submit1.addEventListener("click", function (event) {
    event.preventDefault()

    const email = document.getElementById('email1').value;
    const password = document.getElementById('password1').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            alert("Вход...");
            window.location.href = "index.html";
        })
        .catch((error) => {
            const errorMessage = error.message;
            alert(errorMessage);
        });
});