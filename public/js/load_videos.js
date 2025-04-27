// load_videos.js

const videoListContainer = document.getElementById("videoList");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");

// Функция для отображения видео
function renderVideos(videos) {
    if (videos.length === 0) {
        videoListContainer.innerHTML = "<p>Видео не найдены</p>";
        return;
    }

    videoListContainer.innerHTML = videos
        .map(
            (video) => `
            <div class="video-item" onclick="window.location.href='/video.html?id=${video.video_id}'">
                <img src="${video.thumbnail_url}" alt="${video.title}" class="video-thumbnail">
                <div class="video-info">
                    <h3>${video.title}</h3>
                    <p>${video.channel_name}</p>
                    <p>${video.views} просмотров</p>
                    <p>${new Date(video.upload_date).toLocaleDateString()}</p>
                </div>
            </div>
        `
        )
        .join("");
}

// Обработчик поиска
if (searchInput) {
    // Обработка нажатия Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchQuery = e.target.value.trim();
            fetchVideos(searchQuery);
        }
    });
}

// Обработка клика по кнопке поиска
if (searchButton) {
    searchButton.addEventListener('click', () => {
        const searchQuery = searchInput.value.trim();
        fetchVideos(searchQuery);
    });
}

async function fetchVideos(searchQuery = '') {
    try {
        const url = new URL('/api/videos', window.location.origin);
        if (searchQuery) {
            url.searchParams.append('search', searchQuery);
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error("Ошибка загрузки видео");

        const videos = await response.json();
        renderVideos(videos);
    } catch (error) {
        console.error(error);
        videoListContainer.innerHTML = "<p>Ошибка загрузки видео</p>";
    }
}

// Запуск функции
fetchVideos();

