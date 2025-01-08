// load_videos.js

const videoListContainer = document.getElementById("videoList");

async function fetchVideos() {
    try {
        const response = await fetch("http://localhost:3000/api/videos"); // Маршрут вашего сервера
        if (!response.ok) throw new Error("Ошибка загрузки видео");

        const videos = await response.json();
        renderVideos(videos);
    } catch (error) {
        console.error(error);
        videoListContainer.innerHTML = "<p>Ошибка загрузки видео</p>";
    }
}

function renderVideos(videos) {
    videoListContainer.innerHTML = videos
        .map(
            (video) => `
            <div class="video-item" onclick="window.location.href='/video.html?id=${video.video_id}'">
                <img src="${video.thumbnail_url}" alt="${video.title}" class="video-thumbnail">
                <h3>${video.title}</h3>
                <p>${video.description}</p>
                <p>Просмотры: ${video.views}</p>
            </div>
        `
        )
        .join("");
}


// Запуск функции
fetchVideos();

