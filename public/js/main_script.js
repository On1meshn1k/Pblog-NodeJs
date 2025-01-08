const username = document.getElementById('username');
const logout = document.getElementById('logout');
const enter = document.querySelector('.auth');
const user = auth.currentUser;

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