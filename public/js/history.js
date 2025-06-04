document.addEventListener('DOMContentLoaded', () => {
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistory');

    // Проверяем авторизацию
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = 'enter.html';
        return;
    }

    const user = JSON.parse(userData);

    // Загрузка истории просмотров
    async function loadHistory() {
        try {
            const response = await fetch(`/api/users/${user.user_id}/history`);
            if (!response.ok) {
                throw new Error('Ошибка при загрузке истории');
            }

            const history = await response.json();
            
            if (history.length === 0) {
                historyList.innerHTML = '<div class="no-history">История просмотров пуста</div>';
                return;
            }

            historyList.innerHTML = history.map(item => `
                <div class="history-item" onclick="window.location.href='video.html?id=${item.video_id}'">
                    <img src="${item.thumbnail_url}" alt="${item.title}">
                    <div class="history-item-content">
                        <div class="history-item-title">${item.title}</div>
                        <div class="history-item-channel">${item.channel_name}</div>
                        <div class="history-item-date">${formatDate(item.view_date)}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Ошибка при загрузке истории:', error);
            historyList.innerHTML = '<div class="no-history">Ошибка при загрузке истории</div>';
        }
    }

    // Форматирование даты
    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        // Если прошло меньше минуты
        if (diff < 60 * 1000) {
            return 'только что';
        }

        // Если прошло меньше часа
        if (diff < 60 * 60 * 1000) {
            const minutes = Math.floor(diff / (60 * 1000));
            return `${minutes} ${getMinutesText(minutes)} назад`;
        }

        // Если прошло меньше суток
        if (diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (60 * 60 * 1000));
            return `${hours} ${getHoursText(hours)} назад`;
        }

        // Если прошло больше суток
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    // Вспомогательные функции для склонения слов
    function getMinutesText(minutes) {
        const cases = [2, 0, 1, 1, 1, 2];
        const titles = ['минута', 'минуты', 'минут'];
        return titles[(minutes % 100 > 4 && minutes % 100 < 20) ? 2 : cases[(minutes % 10 < 5) ? minutes % 10 : 5]];
    }

    function getHoursText(hours) {
        const cases = [2, 0, 1, 1, 1, 2];
        const titles = ['час', 'часа', 'часов'];
        return titles[(hours % 100 > 4 && hours % 100 < 20) ? 2 : cases[(hours % 10 < 5) ? hours % 10 : 5]];
    }

    // Очистка истории
    clearHistoryBtn.addEventListener('click', async () => {
        if (!confirm('Вы уверены, что хотите очистить историю просмотров?')) {
            return;
        }

        try {
            const response = await fetch(`/api/users/${user.user_id}/history`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Ошибка при очистке истории');
            }

            historyList.innerHTML = '<div class="no-history">История просмотров пуста</div>';
        } catch (error) {
            console.error('Ошибка при очистке истории:', error);
            alert('Ошибка при очистке истории');
        }
    });

    // Загружаем историю при загрузке страницы
    loadHistory();
}); 