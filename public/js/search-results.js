document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('q');
    
    if (searchQuery) {
        document.querySelector('.search-input').value = searchQuery;
        searchVideos(searchQuery);
    }

    async function searchVideos(query) {
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success) {
                displaySearchResults(data.videos);
            } else {
                showError('Произошла ошибка при поиске видео');
            }
        } catch (error) {
            console.error('Ошибка при поиске:', error);
            showError('Произошла ошибка при поиске видео');
        }
    }

    function displaySearchResults(videos) {
        const container = document.getElementById('search-results-container');
        container.innerHTML = '';

        if (videos.length === 0) {
            container.innerHTML = '<p class="no-results">По вашему запросу ничего не найдено</p>';
            return;
        }

        videos.forEach(video => {
            const videoCard = createVideoCard(video);
            container.appendChild(videoCard);
        });
    }

    function createVideoCard(video) {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <a href="video.html?id=${video.id}" class="video-link">
                <div class="thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}">
                </div>
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                    <p class="channel-name">${video.channel_name}</p>
                    <div class="video-meta">
                        <span class="views">${video.views} просмотров</span>
                        <span class="date">${video.upload_date}</span>
                    </div>
                </div>
            </a>
        `;
        return card;
    }

    function showError(message) {
        const container = document.getElementById('search-results-container');
        container.innerHTML = `<p class="error-message">${message}</p>`;
    }
}); 