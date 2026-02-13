// Инициализация Supabase
// Инициализация Supabase - БЕЗ const, let или var!
supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let currentChatSettings = { is_open: true };
let selectedPMUser = null;
// Бесплатный API для изображений (RapidAPI) - ТВОЙ КЛЮЧ!
const RAPIDAPI_KEY = 'c5a6ebf560msh36f7d47844004ebp147858jsn99103f967b1d';

// ============================================
// УПРАВЛЕНИЕ ВКЛАДКАМИ
// ============================================

// Переключение вкладок
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Убираем активный класс у всех вкладок
            tabs.forEach(t => t.classList.remove('active'));
            
            // Добавляем активный класс текущей вкладке
            tab.classList.add('active');
            
            // Скрываем весь контент
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Показываем нужный контент
            const activeContent = document.getElementById(`tab-${tabName}`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
            
            // Специфичные действия при переключении
            if (tabName === 'users') {
                loadUsers(); // Обновляем список пользователей
            } else if (tabName === 'pm') {
                loadPMContacts(); // Загружаем контакты для ЛС
            } else if (tabName === 'profile') {
                loadProfile(); // Загружаем данные профиля
            }
        });
    });
}

// Загрузка контактов для ЛС
async function loadPMContacts() {
    const contactsList = document.getElementById('pm-contacts-list');
    if (!contactsList) return;
    
    const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .eq('approved', true)
        .neq('id', currentUser.id)
        .order('username');
    
    contactsList.innerHTML = '';
    
    users.forEach(user => {
        const contact = document.createElement('div');
        contact.className = `user-item ${user.role === 'admin' ? 'admin' : ''}`;
        contact.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; background: ${user.role === 'admin' ? 'var(--accent-red)' : 'var(--accent-blue)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                    ${user.username[0].toUpperCase()}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${user.username}</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">${user.role === 'admin' ? 'Админ' : 'Участник'}</div>
                </div>
            </div>
        `;
        
        contact.addEventListener('click', () => {
            document.querySelectorAll('#pm-contacts-list .user-item').forEach(el => {
                el.classList.remove('selected');
            });
            contact.classList.add('selected');
            selectedPMUser = user;
            document.getElementById('pm-receiver').textContent = user.username;
            document.getElementById('pm-input').disabled = false;
            document.getElementById('pm-send').disabled = false;
            loadPrivateMessages(user.id);
        });
        
        contactsList.appendChild(contact);
    });
}

// Загрузка профиля
async function loadProfile() {
    if (!currentUser) return;
    
    document.getElementById('profile-username').textContent = currentUser.username;
    document.getElementById('profile-avatar').textContent = currentUser.username[0].toUpperCase();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        document.getElementById('profile-email').textContent = user.email;
    }
    
    document.getElementById('profile-role').textContent = 
        currentUser.role === 'admin' ? 'Администратор' : 
        currentUser.role === 'user' ? 'Участник' : 'Заявитель';
    
    document.getElementById('profile-status').textContent = 
        currentUser.approved ? '✅ Активен' : '⏳ Ожидает одобрения';
    
    if (currentUser.created_at) {
        const date = new Date(currentUser.created_at);
        document.getElementById('profile-created').textContent = 
            date.toLocaleDateString('ru-RU');
    }
}

// Обновление статистики
async function updateStats() {
    // Количество пользователей
    const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('approved', true);
    
    document.getElementById('stat-users').textContent = usersCount || 0;
    
    // Сообщения сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
    
    document.getElementById('stat-messages').textContent = messagesCount || 0;
    
    // Онлайн (условно)
    document.getElementById('stat-online').textContent = '1';
}

// Обновление бейджей
function updateBadges() {
    // Проверяем неподтверждённые заявки (только для админов)
    if (currentUser.role === 'admin') {
        supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('approved', false)
            .then(({ count }) => {
                if (count > 0) {
                    document.getElementById('pending-badge').style.display = 'inline-block';
                    document.getElementById('pending-badge-mobile').style.display = 'inline-block';
                    document.getElementById('pending-badge').textContent = count;
                    document.getElementById('pending-badge-mobile').textContent = count;
                } else {
                    document.getElementById('pending-badge').style.display = 'none';
                    document.getElementById('pending-badge-mobile').style.display = 'none';
                }
            });
    }
}

// В функции initDashboard() добавь вызовы:
// initTabs();
// updateStats();
// updateBadges();
// setInterval(updateStats, 30000); // Обновление статистики каждые 30 секунд
// setInterval(updateBadges, 10000); // Обновление бейджей каждые 10 секунд
// Альтернативный API для изображений (бесплатный, без ключа)
async function uploadImage(file) {
    try {
        showNotification('🔄 Загрузка изображения...');
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const base64Image = e.target.result.split(',')[1];
                    
                    // Используем бесплатный API
                    const response = await fetch('https://api.imgur.com/3/image', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Client-ID c7c0b3c9f3b3c9f' // Публичный Client-ID Imgur
                        },
                        body: JSON.stringify({
                            image: base64Image,
                            type: 'base64'
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        showNotification('✅ Изображение загружено!');
                        resolve(data.data.link);
                    } else {
                        reject(new Error('Ошибка загрузки'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка загрузки', 'error');
        return URL.createObjectURL(file);
    }
}

// Регистрация (подача заявки)
// Регистрация (подача заявки) - ИСПРАВЛЕННАЯ ВЕРСИЯ
if (document.getElementById('register-form')) {
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault(); // ОСТАНАВЛИВАЕМ перезагрузку страницы!
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const username = document.getElementById('username').value;
        const messageDiv = document.getElementById('message');
        
        try {
            // 1. Регистрация в Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username // Передаём username в metadata
                    }
                }
            });

            if (authError) throw authError;

            // 2. Ждём немного, чтобы триггер сработал
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 3. Проверяем, создался ли профиль
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();
            
            if (profileError || !profile) {
                console.log('Профиль не создался автоматически, создаём вручную...');
                // Создаём профиль вручную, если триггер не сработал
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: authData.user.id,
                        username: username,
                        role: 'applicant',
                        approved: false
                    }]);
                
                if (insertError) throw insertError;
            }

            messageDiv.innerHTML = '✅ Заявка отправлена! Ждите одобрения админа.';
            messageDiv.style.color = 'green';
            messageDiv.style.display = 'block';
            
            // Очищаем форму
            document.getElementById('register-form').reset();
            
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            messageDiv.innerHTML = '❌ Ошибка: ' + error.message;
            messageDiv.style.color = '#d52b1e';
            messageDiv.style.display = 'block';
        }
    });
}

// Вход
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            document.getElementById('error-message').innerHTML = '❌ Ошибка входа: ' + error.message;
        } else {
            window.location.href = 'dashboard.html';
        }
    });
}

// DASHBOARD
if (window.location.pathname.includes('dashboard.html') || window.location.pathname === '/') {
    initDashboard();
}

async function initDashboard() {
    // Получаем текущего пользователя
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    initTabs();
    updateStats();
    updateBadges();
    setInterval(updateStats, 30000); // Обновление статистики каждые 30 секунд
    setInterval(updateBadges, 10000); // Обновление бейджей каждые 10 секунд
    // Получаем профиль
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile) {
        alert('Профиль не найден. Попробуйте зарегистрироваться заново.');
        return;
    }

    currentUser = profile;
    
    // Показываем имя пользователя
    const usernameSpan = document.getElementById('current-username');
    if (usernameSpan) usernameSpan.textContent = profile.username;

    // Проверка одобрения
    if (!profile.approved) {
        document.body.innerHTML = `
            <div class="container">
                <h1>⏳ Ожидайте одобрения</h1>
                <p>Ваша заявка еще не одобрена админом.</p>
                <p>Пожалуйста, подождите, пока администратор активирует ваш аккаунт.</p>
                <a href="index.html" class="btn-primary">На главную</a>
            </div>`;
        return;
    }

    // Загружаем настройки чата
    await loadChatSettings();

    // Загружаем список пользователей
    await loadUsers();

    // Загружаем сообщения
    await loadMessages();

    // НАСТРАИВАЕМ REALTIME ПОДПИСКИ (теперь должно работать!)
    setupRealtimeSubscriptions();

    // Обработчики кнопок
    const sendBtn = document.getElementById('send-message');
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);

    const imageUpload = document.getElementById('image-upload');
    if (imageUpload) imageUpload.addEventListener('change', handleImageUpload);

    const pmSend = document.getElementById('pm-send');
    if (pmSend) pmSend.addEventListener('click', sendPrivateMessage);

    // Админские кнопки
    if (currentUser.role === 'admin') {
        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel) adminPanel.style.display = 'block';
        
        const closeChat = document.getElementById('close-chat');
        const openChat = document.getElementById('open-chat');
        
        if (closeChat) closeChat.addEventListener('click', () => toggleChat(false));
        if (openChat) openChat.addEventListener('click', () => toggleChat(true));
        
        const approveUser = document.getElementById('approve-user');
        if (approveUser) approveUser.addEventListener('click', approveSelectedUser);
    }
}

// НАСТРОЙКА REALTIME (ИСПРАВЛЕНО)
function setupRealtimeSubscriptions() {
    // Подписка на новые сообщения в общем чате
    supabase
        .channel('public:messages')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages' 
            }, 
            payload => {
                addMessageToChat(payload.new);
            }
        )
        .on('postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: 'messages'
            },
            payload => {
                const msgElement = document.getElementById(`msg-${payload.old.id}`);
                if (msgElement) msgElement.remove();
            }
        )
        .subscribe();

    // Подписка на изменения настроек чата
    supabase
        .channel('public:chat_settings')
        .on('postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'chat_settings',
                filter: 'id=eq.1'
            },
            payload => {
                currentChatSettings = payload.new;
                updateChatUI();
            }
        )
        .subscribe();

    // Подписка на личные сообщения
    if (currentUser) {
        supabase
            .channel(`private:messages:${currentUser.id}`)
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'private_messages',
                    filter: `receiver_id=eq.${currentUser.id}`
                },
                payload => {
                    // Если открыт чат с этим пользователем, показываем сообщение
                    if (selectedPMUser && (payload.new.sender_id === selectedPMUser.id)) {
                        addPMToChat(payload.new);
                    } else {
                        // Иначе показываем уведомление
                        showNotification(`Новое сообщение от ${payload.new.username}`);
                    }
                }
            )
            .subscribe();
    }
}

// Загрузка настроек чата
async function loadChatSettings() {
    const { data } = await supabase
        .from('chat_settings')
        .select('*')
        .eq('id', 1)
        .single();

    if (data) {
        currentChatSettings = data;
        updateChatUI();
    }
}

// Переключение чата (админ)
async function toggleChat(openState) {
    await supabase
        .from('chat_settings')
        .update({ 
            is_open: openState, 
            updated_by: currentUser.id, 
            updated_at: new Date() 
        })
        .eq('id', 1);

    // Обновится автоматически через Realtime
}

// Обновление UI чата
function updateChatUI() {
    const chatInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-message');
    const uploadBtn = document.getElementById('image-upload');
    const statusSpan = document.getElementById('chat-status');

    if (!chatInput || !sendBtn) return;

    if (currentChatSettings.is_open || currentUser.role === 'admin') {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        if (uploadBtn) uploadBtn.disabled = false;
        if (statusSpan) {
            statusSpan.textContent = 'Чат открыт';
            statusSpan.style.color = 'green';
        }
    } else {
        chatInput.disabled = true;
        sendBtn.disabled = true;
        if (uploadBtn) uploadBtn.disabled = true;
        if (statusSpan) {
            statusSpan.textContent = 'Чат закрыт';
            statusSpan.style.color = '#d52b1e';
        }
    }
}

// Загрузка пользователей
async function loadUsers() {
    const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .order('username');

    const userList = document.getElementById('user-list');
    const userSelect = document.getElementById('user-select');
    
    if (!userList) return;
    
    userList.innerHTML = '<h4>👥 Участники:</h4>';

    users.forEach(user => {
        // Для списка пользователей (кликабельно)
        const div = document.createElement('div');
        div.className = `user-item ${user.role === 'admin' ? 'admin' : ''}`;
        div.textContent = user.username + (user.role === 'admin' ? ' 👑' : '');
        div.dataset.userId = user.id;
        div.dataset.username = user.username;

        div.addEventListener('click', () => {
            document.querySelectorAll('.user-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            selectedPMUser = user;
            const pmReceiver = document.getElementById('pm-receiver');
            if (pmReceiver) pmReceiver.textContent = `📨 с ${user.username}`;
            loadPrivateMessages(user.id);
        });

        userList.appendChild(div);

        // Для выпадающего списка админа
        if (userSelect && user.role === 'applicant') {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.username} (ждет одобрения)`;
            userSelect.appendChild(option);
        }
    });
}

// Загрузка сообщений
async function loadMessages() {
    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;
    
    chatBox.innerHTML = '';

    messages.forEach(msg => addMessageToChat(msg));
}

// Добавление сообщения в чат
function addMessageToChat(msg) {
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;
    
    // Проверяем, нет ли уже такого сообщения
    if (document.getElementById(`msg-${msg.id}`)) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.id = `msg-${msg.id}`;
    msgDiv.className = `message ${msg.role === 'admin' ? 'admin' : ''}`;

    let content = `<strong>${msg.username}</strong> <span class="timestamp">${new Date(msg.created_at).toLocaleTimeString()}</span><br>${msg.content}`;

    if (msg.image_url) {
        content += `<br><img src="${msg.image_url}" alt="image" style="max-width: 200px; max-height: 200px; border-radius: 4px; cursor: pointer;" onclick="window.open(this.src)">`;
    }

    msgDiv.innerHTML = content;

    // Кнопка удаления для админов
    if (currentUser && currentUser.role === 'admin') {
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '✕';
        delBtn.onclick = async () => {
            await supabase.from('messages').delete().eq('id', msg.id);
        };
        msgDiv.appendChild(delBtn);
    }

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Отправка сообщения
async function sendMessage() {
    if (!currentChatSettings.is_open && currentUser.role !== 'admin') {
        alert('Чат закрыт администратором');
        return;
    }

    const input = document.getElementById('message-input');
    const content = input.value.trim();

    if (!content) return;

    const { error } = await supabase
        .from('messages')
        .insert([{
            user_id: currentUser.id,
            username: currentUser.username,
            content: content,
            role: currentUser.role
        }]);

    if (!error) {
        input.value = '';
    }
}

// Загрузка личных сообщений
async function loadPrivateMessages(otherUserId) {
    const { data } = await supabase
        .from('private_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

    const pmBox = document.getElementById('pm-chat-box');
    if (!pmBox) return;
    
    pmBox.innerHTML = '';

    if (data.length === 0) {
        pmBox.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Нет сообщений. Напишите первым!</div>';
        return;
    }

    data.forEach(msg => {
        addPMToChat(msg);
    });
    
    pmBox.scrollTop = pmBox.scrollHeight;
}

// Добавление ЛС в чат
function addPMToChat(msg) {
    const pmBox = document.getElementById('pm-chat-box');
    if (!pmBox) return;
    
    const div = document.createElement('div');
    div.className = 'message';
    const sender = msg.sender_id === currentUser.id ? 'Вы' : msg.username;
    div.innerHTML = `<strong>${sender}:</strong> ${msg.content}`;
    if (msg.image_url) {
        div.innerHTML += `<br><img src="${msg.image_url}" style="max-width: 100px; max-height: 100px; border-radius: 4px;">`;
    }
    pmBox.appendChild(div);
    pmBox.scrollTop = pmBox.scrollHeight;
}

// Отправка личного сообщения
async function sendPrivateMessage() {
    if (!selectedPMUser) {
        alert('Выберите пользователя из списка слева');
        return;
    }

    const input = document.getElementById('pm-input');
    const content = input.value.trim();

    if (!content) return;

    const { error } = await supabase
        .from('private_messages')
        .insert([{
            sender_id: currentUser.id,
            receiver_id: selectedPMUser.id,
            username: currentUser.username,
            content: content
        }]);

    if (!error) {
        input.value = '';
        // Сообщение добавится через Realtime
    }
}

// Обработка загрузки изображения
async function handleImageUpload(e) {
    if (!currentChatSettings.is_open && currentUser.role !== 'admin') {
        showNotification('❌ Чат закрыт администратором', 'error');
        return;
    }

    const file = e.target.files[0];
    if (!file) return;

    // Проверка размера файла (макс 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('❌ Файл слишком большой (макс 10MB)', 'error');
        return;
    }

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
        showNotification('❌ Можно загружать только изображения', 'error');
        return;
    }

    try {
        // Показываем превью перед отправкой
        const previewUrl = URL.createObjectURL(file);
        
        // Отправляем сообщение с превью
        const tempId = 'temp-' + Date.now();
        const tempMessage = {
            id: tempId,
            username: currentUser.username,
            content: '🖼️ Загрузка изображения...',
            image_url: previewUrl,
            created_at: new Date().toISOString(),
            role: currentUser.role,
            user_id: currentUser.id
        };
        
        // Показываем временное сообщение
        addMessageToChat(tempMessage);
        
        // Загружаем на сервер
        const imageUrl = await uploadImage(file);
        
        // Удаляем временное сообщение
        document.getElementById(`msg-${tempId}`)?.remove();
        
        // Отправляем реальное сообщение
        await supabase
            .from('messages')
            .insert([{
                user_id: currentUser.id,
                username: currentUser.username,
                content: '📷 [Изображение]',
                image_url: imageUrl,
                role: currentUser.role
            }]);
        
        showNotification('✅ Изображение отправлено!');
        
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Не удалось загрузить изображение', 'error');
    }

    // Очищаем input
    e.target.value = '';
}

// Одобрение пользователя (админ)
async function approveSelectedUser() {
    const select = document.getElementById('user-select');
    if (!select || !select.value) {
        alert('Выберите пользователя из списка');
        return;
    }

    await supabase
        .from('profiles')
        .update({ approved: true, role: 'user' })
        .eq('id', select.value);

    alert('✅ Пользователь одобрен!');
    
    // Очищаем и перезагружаем список
    select.innerHTML = '<option value="">Выберите пользователя</option>';
    loadUsers();
}

// Функция для показа уведомлений
function showNotification(text, type = 'info') {
    // Проверяем, есть ли уже контейнер для уведомлений
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(notificationContainer);
    }
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        background: ${type === 'error' ? '#d52b1e' : '#0033a0'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease;
        font-size: 14px;
    `;
    notification.textContent = text;
    
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Добавь стили для анимации в начало файла или в style.css
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Выход
async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';

}



