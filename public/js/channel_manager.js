document.addEventListener('DOMContentLoaded', async () => {
    const channelSelect = document.getElementById('channelSelect');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!channelSelect || !user) return;

    // Загрузка каналов пользователя
    async function loadUserChannels() {
        try {
            const response = await fetch(`/api/users/${user.user_id}/channels`);
            if (!response.ok) throw new Error('Ошибка при загрузке каналов');
            
            const channels = await response.json();
            
            // Сохраняем текущий выбранный канал
            const currentChannel = channelSelect.value;
            
            // Очищаем список, оставляя только первые два опциона
            while (channelSelect.options.length > 2) {
                channelSelect.remove(2);
            }
            
            // Добавляем каналы в список
            channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.channel_id;
                option.textContent = channel.name;
                channelSelect.appendChild(option);
            });
            
            // Восстанавливаем выбранный канал
            if (currentChannel) {
                channelSelect.value = currentChannel;
            }
            
            // Сохраняем список каналов в localStorage
            localStorage.setItem('userChannels', JSON.stringify(channels));
        } catch (error) {
            console.error('Ошибка при загрузке каналов:', error);
        }
    }

    // Создание нового канала
    async function createNewChannel() {
        const channelName = prompt('Введите название нового канала:');
        if (!channelName) return;

        try {
            const response = await fetch('/api/channels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: channelName,
                    user_id: user.user_id
                })
            });

            if (!response.ok) throw new Error('Ошибка при создании канала');
            
            const newChannel = await response.json();
            
            // Добавляем новый канал в список
            const option = document.createElement('option');
            option.value = newChannel.channel_id;
            option.textContent = newChannel.name;
            channelSelect.appendChild(option);
            
            // Выбираем новый канал
            channelSelect.value = newChannel.channel_id;
            
            // Обновляем список каналов
            await loadUserChannels();
            
            alert('Канал успешно создан!');
        } catch (error) {
            console.error('Ошибка при создании канала:', error);
            alert('Ошибка при создании канала');
        }
    }

    // Обработчик изменения выбранного канала
    channelSelect.addEventListener('change', async (e) => {
        if (e.target.value === 'create') {
            await createNewChannel();
        } else if (e.target.value) {
            // Сохраняем выбранный канал
            localStorage.setItem('selectedChannel', e.target.value);
            
            // Если мы на странице канала, обновляем информацию
            if (window.location.pathname.includes('channel.html')) {
                window.location.reload();
            }
        }
    });

    // Загружаем каналы при загрузке страницы
    await loadUserChannels();
    
    // Восстанавливаем выбранный канал
    const selectedChannel = localStorage.getItem('selectedChannel');
    if (selectedChannel) {
        channelSelect.value = selectedChannel;
    }
}); 