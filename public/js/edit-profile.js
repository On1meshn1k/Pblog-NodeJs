// Подключаемся к элементам формы
const usernameInput = document.getElementById('username');
const avatarInput = document.getElementById('avatar');
const channelDescriptionInput = document.getElementById('channelDescription');
const submit = document.getElementById("submit");
const backButton = document.getElementById('previous_page');

// Загружаем текущие данные пользователя при открытии страницы
document.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('user');
    if (!userData) {
        alert('Пользователь не авторизован');
        window.location.href = 'enter.html';
        return;
    }

    try {
        const user = JSON.parse(userData);
        usernameInput.value = user.username;
        
        // Загружаем текущую аватарку пользователя
        const avatarPreview = document.getElementById('avatarPreview');
        if (avatarPreview && user.profile_picture_url) {
            avatarPreview.src = user.profile_picture_url;
        }
        
        // Загружаем описание канала
        try {
            const response = await fetch(`/api/channels/user/${user.user_id}`);
            if (response.ok) {
                const channelData = await response.json();
                if (channelDescriptionInput && channelData.channel_description) {
                    channelDescriptionInput.value = channelData.channel_description;
                }
            }
        } catch (error) {
            console.error('Ошибка при загрузке описания канала:', error);
        }
    } catch (error) {
        console.error('Ошибка при загрузке данных пользователя:', error);
    }
});

// Обработка загрузки аватарки
avatarInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
        event.target.value = '';
        return;
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        event.target.value = '';
        return;
    }

    // Показываем предпросмотр аватарки
    const previewImage = document.getElementById('avatarPreview');
    if (previewImage) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// Обработка отправки формы
submit.addEventListener('click', async (event) => {
    event.preventDefault();

    const userData = localStorage.getItem('user');
    if (!userData) {
        alert('Пользователь не авторизован');
        window.location.href = 'enter.html';
        return;
    }

    try {
        const user = JSON.parse(userData);
        const newUsername = usernameInput.value.trim();
        const avatarFile = avatarInput.files[0];
        const channelDescription = channelDescriptionInput.value.trim();

        if (!newUsername) {
            alert('Пожалуйста, введите имя пользователя');
            return;
        }

        // Создаем FormData для отправки файла и данных
        const formData = new FormData();
        formData.append('username', newUsername);
        formData.append('user_id', user.user_id);
        formData.append('channel_description', channelDescription);
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        // Отправляем запрос на сервер
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка при обновлении профиля');
        }

        const result = await response.json();
        
        // Обновляем данные в localStorage
        const updatedUser = {
            ...user,
            username: newUsername,
            profile_picture_url: result.profile_picture_url || user.profile_picture_url
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));

        alert('Профиль успешно обновлен');
        window.location.href = 'channel.html';
    } catch (error) {
        console.error('Ошибка при обновлении профиля:', error);
        alert(error.message);
    }
});

// Обработка кнопки "На главную"
backButton.addEventListener('click', () => {
    window.location.href = 'channel.html';
});