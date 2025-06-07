document.addEventListener('DOMContentLoaded', () => {
    // Проверяем авторизацию пользователя
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'enter.html';
        return;
    }

    const uploadForm = document.getElementById('uploadForm');
    const videoInput = document.getElementById('videoInput');
    const thumbnailInput = document.getElementById('thumbnailInput');
    const titleInput = document.getElementById('titleInput');
    const descriptionInput = document.getElementById('descriptionInput');
    const submitButton = document.getElementById('submitButton');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    let isSubmitting = false;

    // Проверка размера файла
    const checkFileSize = (file, maxSizeMB) => {
        if (file.size > maxSizeMB * 1024 * 1024) {
            const sizeText = maxSizeMB >= 1024 
                ? `${maxSizeMB / 1024}GB` 
                : `${maxSizeMB}MB`;
            throw new Error(`Размер файла ${file.name} превышает ${sizeText}`);
        }
    };

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (isSubmitting) return;
        isSubmitting = true;

        // Отключаем кнопку и показываем индикатор загрузки
        submitButton.disabled = true;
        submitButton.textContent = 'Загрузка...';

        try {
            // Проверяем размер файлов
            if (videoInput.files[0]) {
                checkFileSize(videoInput.files[0], 1024); // 1GB для видео
            }
            if (thumbnailInput.files[0]) {
                checkFileSize(thumbnailInput.files[0], 100); // 100MB для обложки
            }

            const formData = new FormData();
            formData.append('video', videoInput.files[0]);
            formData.append('thumbnail', thumbnailInput.files[0]);
            formData.append('title', titleInput.value);
            formData.append('description', descriptionInput.value);
            formData.append('user_id', user.user_id);
            formData.append('access_type', document.getElementById('accessType').value);

            console.log('Отправка данных:', {
                title: titleInput.value,
                description: descriptionInput.value,
                user_id: user.user_id,
                access_type: document.getElementById('accessType').value,
                video: videoInput.files[0]?.name,
                thumbnail: thumbnailInput.files[0]?.name
            });

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const contentType = response.headers.get('content-type');
            let result;
            
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                result = { message: text };
            }

            if (!response.ok) {
                throw new Error(result.message || 'Ошибка при загрузке видео');
            }

            successMessage.textContent = result.message;
            successMessage.style.display = 'block';
            errorMessage.style.display = 'none';

            // Очищаем форму
            uploadForm.reset();

            // Перенаправляем на страницу видео через 2 секунды
            setTimeout(() => {
                window.location.href = `/video.html?id=${result.videoId}`;
            }, 2000);

        } catch (error) {
            console.error('Ошибка при загрузке видео:', error);
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';
        } finally {
            // Включаем кнопку обратно
            submitButton.disabled = false;
            submitButton.textContent = 'Загрузить видео';
            isSubmitting = false;
        }
    });
});
