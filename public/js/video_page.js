const username = document.getElementById('username');
const upload = document.getElementById('upload');
const logout = document.getElementById('logout');

onAuthStateChanged(auth, function (user) {
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
            } else {
                alert('Данные об имени пользователя не найдены');
            }
        }).catch((error) => {
            alert("Ошибка при получении имени пользователя: " + error);
        });
    } else {
        username.style.display = "none";
        upload.style.display = "none";
        logout.style.display = "none";
        enter.style.display = "block";
    }
});

function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('videoId');
}

function loadVideo() {
    const videoId = getVideoId();
    if (videoId) {
        const videoRef = ref(db, `videos/${videoId}`);
        get(videoRef).then((snapshot) => {
            if (snapshot.exists()) {
                const video = snapshot.val();
                const videoPlayer = document.getElementById('videoPlayer');
                const videoTitle = document.getElementById('videoTitle');
                const videoUploader = document.getElementById('videoUploader');

                videoPlayer.src = video.url;
                videoTitle.innerText = video.title;
                videoUploader.innerText = `Автор: ${video.userId}`;


                const viewsRef = ref(db, `videos/${videoId}/views`);
                set(viewsRef, (video.views || 0) + 1);

                loadLikes(videoId);
                loadComments(videoId);
            } else {
                console.error('Видео не найдено');
            }
        }).catch((error) => {
            console.error('Ошибка базы данных:', error);
        });
    } else {
        console.error('ID видео не указан');
    }
}

function loadLikes(videoId) {
    const likesRef = ref(db, `likes/${videoId}`);
    onValue(likesRef, (snapshot) => {
        const likesCount = snapshot.size;
        document.getElementById('likesCount').innerText = likesCount;
    });
}

function toggleLike(videoId, userId) {
    const likeRef = ref(db, `likes/${videoId}/${userId}`);
    get(likeRef).then((snapshot) => {
        if (snapshot.exists()) {
            // Если уже лайк был, то убрать его
            set(likeRef, null);
        } else {
            // Если не было лайка, то добавить
            set(likeRef, true);
        }
    });
}

document.getElementById('likeButton').addEventListener('click', () => {
    const videoId = getVideoId();
    const user = auth.currentUser;
    if (user) {
        toggleLike(videoId, user.uid);
    } else {
        alert('Вы должны быть авторизованы, чтобы ставить лайки');
    }
});

function loadComments(videoId) {
    const commentsRef = ref(db, `comments/${videoId}`);
    const commentsContainer = document.getElementById('commentsContainer');
    onValue(commentsRef, (snapshot) => {
        commentsContainer.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const comment = childSnapshot.val();
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';
            commentElement.innerText = `${comment.username}: ${comment.text}`;
            commentsContainer.appendChild(commentElement);
        });
    });
}

document.getElementById('commentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const videoId = getVideoId();
    const user = auth.currentUser;
    if (user) {
        const commentInput = document.getElementById('commentInput');
        const commentText = commentInput.value;
        if (commentText) {
            const newCommentRef = push(ref(db, `comments/${videoId}`));
            set(newCommentRef, {
                text: commentText,
                username: username.innerText,
                userId: user.uid,
                timestamp: Date.now()
            }).then(() => {
                commentInput.value = '';
            }).catch((error) => {
                console.error('Ошибка при добавлении комментария:', error);
            });
        }
    } else {
        alert('Вы должны быть авторизованы, чтобы оставлять комментарии');
    }
});

function loadOtherVideos() {
  const videosRef = ref(db, 'videos');
  const videoListContainer = document.getElementById('videoList');

  get(videosRef).then((snapshot) => {
    videoListContainer.innerHTML = '';
    snapshot.forEach((childSnapshot) => {
      const video = childSnapshot.val();
      const videoElement = `
        <div class="vid-list">
          <a href="?videoId=${childSnapshot.key}">
            <img src="${video.thumbnailUrl}" class="thumbnail">
          </a>
          <div class="flex-div">
            <div class="vid-info">
              <a href="?videoId=${childSnapshot.key}">${video.title}</a>
              <p>Автор: ${video.userId}</p>
              <p>${video.uploadDate}</p>
            </div>
          </div>
        </div>
      `;
      videoListContainer.innerHTML += videoElement;
    });
  }).catch((error) => {
    console.error('Ошибка загрузки других видео:', error);
  });
}

window.onload = () => {
    loadVideo();
    loadOtherVideos();
};

const enter = document.querySelector('.auth');

enter.addEventListener('click', function() {
    window.location.href = "enter.html"
})