const isLoggedIn = localStorage.getItem("user");

const usernameSpan = document.getElementById("username");
const logoutButton = document.getElementById("logout");
const authLink = document.querySelector(".authLink");

// Проверяем, существуют ли элементы, прежде чем работать с ними
if (usernameSpan && logoutButton && authLink) {
    if (isLoggedIn) {
        const user = JSON.parse(isLoggedIn);
        usernameSpan.textContent = user.username;  // Отображаем имя пользователя
        authLink.style.display = "none";           // Прячем ссылку "Войти"
        logoutButton.style.display = "block"; // Показываем кнопку "Выйти"

        // Логика выхода
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("user"); // Удаляем пользователя из localStorage
            window.location.reload();         // Перезагружаем страницу
        });
    } else {
        usernameSpan.style.display = "none";     // Прячем имя пользователя
        logoutButton.style.display = "none";    // Прячем кнопку "Выйти"
        authLink.style.display = "block"; // Показываем ссылку "Войти"
    }
}

// Функция регистрации пользователя
async function registerUser(username, email, password) {
    try {
        // Валидация на стороне клиента
        if (username.length < 3) {
            alert('Имя пользователя должно содержать минимум 3 символа');
            return;
        }

        if (username.length > 50) {
            alert('Имя пользователя не должно превышать 50 символов');
            return;
        }

        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            alert('Пожалуйста, введите корректный email');
            return;
        }

        if (password.length < 6) {
            alert('Пароль должен содержать минимум 6 символов');
            return;
        }

        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('user', JSON.stringify(data.user));
            alert('Регистрация успешна! Сейчас вы будете перенаправлены на главную страницу.');
            window.location.href = '/'; // Перенаправление на главную после успешной регистрации
        } else {
            throw new Error(data.message || 'Ошибка при регистрации');
        }
    } catch (error) {
        alert(error.message || 'Произошла ошибка при регистрации');
    }
}

// Обработчик формы регистрации
const signupForm = document.getElementById("signupForm");
if (signupForm) {
    signupForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const username = document.getElementById("login").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        
        await registerUser(username, email, password);
    });
}

// Функция для отображения сообщений
function showMessage(elementId, message, isError = false) {
    const messageDiv = document.getElementById(elementId);
    messageDiv.textContent = message;
    messageDiv.className = 'message ' + (isError ? 'error' : 'success');
    messageDiv.style.display = 'block';
}

// Обработчик формы входа
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Сохраняем токен и информацию о пользователе
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Перенаправляем на главную страницу
                    window.location.href = '/';
                } else {
                    showMessage('message', data.message, true);
                }
            } catch (error) {
                showMessage('message', 'Произошла ошибка при входе', true);
            }
        });
    }

    // Обработчик формы восстановления пароля
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            
            try {
                const response = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                showMessage('message', data.message, !response.ok);
                
                if (response.ok) {
                    forgotPasswordForm.reset();
                }
            } catch (error) {
                showMessage('message', 'Произошла ошибка при отправке запроса', true);
            }
        });
    }

    // Обработчик формы сброса пароля
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const token = new URLSearchParams(window.location.search).get('token');
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                showMessage('message', 'Пароли не совпадают', true);
                return;
            }
            
            try {
                const response = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token, password })
                });
                
                const data = await response.json();
                
                showMessage('message', data.message, !response.ok);
                
                if (response.ok) {
                    setTimeout(() => {
                        window.location.href = '/enter.html';
                    }, 2000);
                }
            } catch (error) {
                showMessage('message', 'Произошла ошибка при сбросе пароля', true);
            }
        });
    }
});
