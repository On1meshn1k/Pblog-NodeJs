import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDfKH9o_5TIursPTAV3kgHRo45Sh6-2T4Y",
  authDomain: "pblog-8e245.firebaseapp.com",
  projectId: "pblog-8e245",
  storageBucket: "pblog-8e245.appspot.com",
  messagingSenderId: "438974043232",
  appId: "1:438974043232:web:592cecb687e77958c2df05",
  databaseURL: "https://pblog-8e245-default-rtdb.europe-west1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const videoListContainer = document.querySelector('.list-container');

function fetchVideos() {
    const videosRef = ref(database, 'videos');
    const userRef = ref(database, 'users');
    onValue(videosRef, (snapshot) => {
        videoListContainer.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const video = childSnapshot.val();
            const videoElement = `
                <div class="vid-list">
                    <a href="video.html?videoId=${childSnapshot.key}"><img src="${video.thumbnailUrl}" class="thumbnail"></a>
                    <div class="flex-div">
                        <div class="vid-info">
                            <a href="video.html?videoId=${childSnapshot.key}">${video.title}</a>
                            <p>Автор: ${video.userId}</p>
                            <p>${video.uploadDate}</p>
                        </div>
                    </div>
                </div>
            `;
            videoListContainer.innerHTML += videoElement;
        });
    });
}


fetchVideos();
