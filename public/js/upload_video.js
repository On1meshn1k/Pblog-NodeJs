document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    const fileInput = document.getElementById('fileInput');
    const thumbnailInput = document.getElementById('thumbnailInput');
    const videoTitle = document.getElementById('videoTitleInput').value;
    const videoDescription = document.getElementById('videoDescriptionInput').value;
    
    if (!fileInput.files[0] || !thumbnailInput.files[0] || !videoTitle || !videoDescription) {
        alert('Пожалуйста, заполните все поля и выберите файлы');
        return;
    }
    
    formData.append('video', fileInput.files[0]);
    formData.append('thumbnail', thumbnailInput.files[0]);
    formData.append('title', videoTitle);
    formData.append('description', videoDescription);

    const uploadProgress = document.getElementById('uploadProgress');
    const uploadMessage = document.getElementById('uploadMessage');
    uploadMessage.innerText = 'Загрузка...';

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.text();
        
        if (response.ok) {
            uploadMessage.innerText = 'Видео успешно загружено!';
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            uploadMessage.innerText = `Ошибка: ${result}`;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        uploadMessage.innerText = 'Ошибка при загрузке видео: ' + error.message;
    }
});

document.getElementById('previous_page').addEventListener('click', function() {
    window.location.href = 'index.html';
});
