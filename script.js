// ============================================
// script.js - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================

// ИНИЦИАЛИЗАЦИЯ
supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentChatSettings = { is_open: true };
let selectedPMUser = null;

// Хранилище для blob URLs
window.blobUrls = window.blobUrls || new Set();

// ============================================
// УПРАВЛЕНИЕ ВКЛАДКАМИ
// ============================================

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const activeContent = document.getElementById(`tab-${tabName}`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
            
            if (currentUser) {
                if (tabName === 'users') {
                    loadUsers();
                } else if (tabName === 'pm') {
                    loadPMContacts();
                } else if (tabName === 'profile') {
                    loadProfile();
                }
            }
        });
    });
}

// ============================================
// ЗАГРУЗКА ДАННЫХ
// ============================================

async function loadUsers() {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .order('username');
        
        if (error) throw error;

        // Обновляем список всех пользователей
        const approvedList = document.getElementById('approved-users-list');
        const pendingList = document.getElementById('pending-users-list');
        const userSelect = document.getElementById('user-select');
        
        if (approvedList) {
            approvedList.innerHTML = '<h4 style="margin-bottom: 10px;">✅ Активные участники</h4>';
        }
        
        if (pendingList) {
            pendingList.innerHTML = '';
        }
        
        if (userSelect) {
            userSelect.innerHTML = '<option value="">Выберите пользователя</option>';
        }

        let pendingCount = 0;

        users.forEach(user => {
            if (user.approved) {
                // Активные пользователи
                if (approvedList) {
                    const div = document.createElement('div');
                    div.className = `user-item ${user.role === 'admin' ? 'admin' : ''}`;
                    div.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; background: ${user.role === 'admin' ? 'var(--accent-red)' : 'var(--accent-blue)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                ${user.username ? user.username[0].toUpperCase() : '?'}
                            </div>
                            <div>
                                <strong>${user.username}</strong>
                                ${user.role === 'admin' ? ' 👑' : ''}
                            </div>
                        </div>
                    `;
                    approvedList.appendChild(div);
                }
            } else {
                // Ожидающие одобрения
                pendingCount++;
                if (pendingList && currentUser?.role === 'admin') {
                    const div = document.createElement('div');
                    div.className = 'user-item';
                    div.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; background: var(--text-muted); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                ${user.username ? user.username[0].toUpperCase() : '?'}
                            </div>
                            <div>
                                <strong>${user.username}</strong>
                                <span style="color: var(--accent-red); font-size: 0.8rem; margin-left: 5px;">(ожидает)</span>
                            </div>
                        </div>
                    `;
                    pendingList.appendChild(div);
                }
                
                if (userSelect && currentUser?.role === 'admin') {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.username} (ждет одобрения)`;
                    userSelect.appendChild(option);
                }
            }
        });

        // Показываем/скрываем секцию ожидающих
        const pendingSection = document.getElementById('pending-users-section');
        if (pendingSection) {
            if (pendingCount > 0 && currentUser?.role === 'admin') {
                pendingSection.style.display = 'block';
            } else {
                pendingSection.style.display = 'none';
            }
        }

        // Обновляем счетчик пользователей
        const usersCount = document.getElementById('users-count');
        if (usersCount) {
            usersCount.textContent = users.filter(u => u.approved).length;
        }

    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

async function loadPMContacts() {
    if (!currentUser || !currentUser.id) return;
    
    const contactsList = document.getElementById('pm-contacts-list');
    if (!contactsList) return;
    
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('approved', true)
            .neq('id', currentUser.id)
            .order('username');
        
        if (error) throw error;
        
        if (!users || users.length === 0) {
            contactsList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Нет других участников</div>';
            return;
        }
        
        contactsList.innerHTML = '';
        
        users.forEach(user => {
            const contact = document.createElement('div');
            contact.className = `user-item ${user.role === 'admin' ? 'admin' : ''}`;
            contact.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; background: ${user.role === 'admin' ? 'var(--accent-red)' : 'var(--accent-blue)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                        ${user.username ? user.username[0].toUpperCase() : '?'}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${user.username || 'Без имени'}</div>
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
                document.getElementById('pm-receiver').textContent = user.username || 'Пользователь';
                document.getElementById('pm-input').disabled = false;
                document.getElementById('pm-send').disabled = false;
                loadPrivateMessages(user.id);
            });
            
            contactsList.appendChild(contact);
        });
    } catch (error) {
        console.error('Ошибка загрузки контактов:', error);
        contactsList.innerHTML = '<div style="text-align: center; color: var(--accent-red); padding: 20px;">Ошибка загрузки</div>';
    }
}

async function loadPrivateMessages(otherUserId) {
    if (!currentUser || !otherUserId) return;
    
    try {
        const { data, error } = await supabase
            .from('private_messages')
            .select('*')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const pmBox = document.getElementById('pm-chat-box');
        if (!pmBox) return;
        
        pmBox.innerHTML = '';

        if (data.length === 0) {
            pmBox.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Нет сообщений. Напишите первым!</div>';
            return;
        }

        data.forEach(msg => {
            addPMToChat(msg);
        });
        
        pmBox.scrollTop = pmBox.scrollHeight;
    } catch (error) {
        console.error('Ошибка загрузки ЛС:', error);
    }
}

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

async function loadProfile() {
    if (!currentUser) return;
    
    try {
        const usernameEl = document.getElementById('profile-username');
        const avatarEl = document.getElementById('profile-avatar');
        const emailEl = document.getElementById('profile-email');
        const roleEl = document.getElementById('profile-role');
        const statusEl = document.getElementById('profile-status');
        const createdEl = document.getElementById('profile-created');
        
        if (usernameEl) usernameEl.textContent = currentUser.username || 'Не указано';
        if (avatarEl) avatarEl.textContent = currentUser.username ? currentUser.username[0].toUpperCase() : '?';
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user && emailEl) {
            emailEl.textContent = user.email || 'Не указан';
        }
        
        if (roleEl) {
            roleEl.textContent = 
                currentUser.role === 'admin' ? 'Администратор' : 
                currentUser.role === 'user' ? 'Участник' : 'Заявитель';
        }
        
        if (statusEl) {
            statusEl.textContent = currentUser.approved ? '✅ Активен' : '⏳ Ожидает одобрения';
        }
        
        if (createdEl) {
            if (currentUser.created_at) {
                const date = new Date(currentUser.created_at);
                createdEl.textContent = date.toLocaleDateString('ru-RU');
            } else {
                createdEl.textContent = 'Неизвестно';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
}

// ============================================
// НАСТРОЙКИ ЧАТА
// ============================================

async function loadChatSettings() {
    try {
        const { data, error } = await supabase
            .from('chat_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) throw error;
        
        if (data) {
            currentChatSettings = data;
            updateChatUI();
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
    }
}

function updateChatUI() {
    const chatInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-message');
    const uploadBtn = document.getElementById('image-upload');
    const uploadBtn2 = document.querySelector('button[onclick*="image-upload"]');
    const statusSpan = document.getElementById('chat-status');

    if (!chatInput || !sendBtn) return;

    if (currentChatSettings.is_open || currentUser?.role === 'admin') {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        if (uploadBtn) uploadBtn.disabled = false;
        if (uploadBtn2) uploadBtn2.disabled = false;
        if (statusSpan) {
            statusSpan.textContent = 'Чат открыт';
            statusSpan.className = 'chat-status open';
        }
    } else {
        chatInput.disabled = true;
        sendBtn.disabled = true;
        if (uploadBtn) uploadBtn.disabled = true;
        if (uploadBtn2) uploadBtn2.disabled = true;
        if (statusSpan) {
            statusSpan.textContent = 'Чат закрыт';
            statusSpan.className = 'chat-status closed';
        }
    }
}

async function toggleChat(openState) {
    if (!currentUser) return;
    
    try {
        await supabase
            .from('chat_settings')
            .update({ 
                is_open: openState, 
                updated_by: currentUser.id, 
                updated_at: new Date() 
            })
            .eq('id', 1);
    } catch (error) {
        console.error('Ошибка переключения чата:', error);
    }
}

// ============================================
// СООБЩЕНИЯ
// ============================================

async function loadMessages() {
    try {
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) throw error;

        const chatBox = document.getElementById('chat-box');
        if (!chatBox) return;
        
        chatBox.innerHTML = '';

        messages.forEach(msg => addMessageToChat(msg));
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
    }
}

function addMessageToChat(msg) {
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;
    
    if (document.getElementById(`msg-${msg.id}`)) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.id = `msg-${msg.id}`;
    msgDiv.className = `message ${msg.role === 'admin' ? 'admin' : ''}`;

    let content = `<strong>${msg.username}</strong> <span class="timestamp">${new Date(msg.created_at).toLocaleTimeString()}</span><br>${msg.content}`;

    if (msg.image_url) {
        content += `<br><img src="${msg.image_url}" alt="image" style="max-width: 200px; max-height: 200px; border-radius: 4px; cursor: pointer;" onclick="window.open(this.src)">`;
    }

    msgDiv.innerHTML = content;

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

async function sendMessage() {
    if (!currentChatSettings.is_open && currentUser?.role !== 'admin') {
        showNotification('❌ Чат закрыт администратором', 'error');
        return;
    }

    const input = document.getElementById('message-input');
    const content = input.value.trim();

    if (!content) return;

    try {
        const { error } = await supabase
            .from('messages')
            .insert([{
                user_id: currentUser.id,
                username: currentUser.username,
                content: content,
                role: currentUser.role
            }]);

        if (error) throw error;

        input.value = '';
    } catch (error) {
        console.error('Ошибка отправки:', error);
        showNotification('❌ Ошибка отправки', 'error');
    }
}

// ============================================
// ЛИЧНЫЕ СООБЩЕНИЯ - ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================

async function sendPrivateMessage() {
    if (!selectedPMUser) {
        showNotification('❌ Выберите пользователя', 'error');
        return;
    }

    const input = document.getElementById('pm-input');
    const content = input.value.trim();

    if (!content) return;

    try {
        // Убираем поле username, оставляем только нужные поля
        const { error } = await supabase
            .from('private_messages')
            .insert([{
                sender_id: currentUser.id,
                receiver_id: selectedPMUser.id,
                content: content
                // username не отправляем!
            }]);

        if (error) {
            console.error('Детали ошибки:', error);
            throw error;
        }

        input.value = '';
        
        // Добавляем сообщение в чат сразу (для оптимистичного UI)
        const tempMsg = {
            sender_id: currentUser.id,
            receiver_id: selectedPMUser.id,
            content: content,
            created_at: new Date().toISOString()
        };
        addPMToChat(tempMsg);
        
    } catch (error) {
        console.error('Ошибка отправки ЛС:', error);
        showNotification('❌ Ошибка отправки: ' + error.message, 'error');
    }
}

// Исправленная функция добавления сообщения в ЛС
function addPMToChat(msg) {
    const pmBox = document.getElementById('pm-chat-box');
    if (!pmBox) return;
    
    const div = document.createElement('div');
    div.className = 'message';
    
    // Определяем отправителя
    let senderName = 'Неизвестно';
    if (msg.sender_id === currentUser.id) {
        senderName = 'Вы';
    } else if (selectedPMUser && msg.sender_id === selectedPMUser.id) {
        senderName = selectedPMUser.username;
    } else if (msg.username) {
        // Если вдруг есть username в старых сообщениях
        senderName = msg.username;
    }
    
    div.innerHTML = `<strong>${senderName}:</strong> ${msg.content}`;
    
    if (msg.image_url) {
        div.innerHTML += `<br><img src="${msg.image_url}" style="max-width: 100px; max-height: 100px; border-radius: 4px;">`;
    }
    
    pmBox.appendChild(div);
    pmBox.scrollTop = pmBox.scrollHeight;
}

// Исправленная функция загрузки ЛС
async function loadPrivateMessages(otherUserId) {
    if (!currentUser || !otherUserId) return;
    
    try {
        const { data, error } = await supabase
            .from('private_messages')
            .select(`
                *,
                sender:profiles!sender_id(username, role),
                receiver:profiles!receiver_id(username, role)
            `)
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const pmBox = document.getElementById('pm-chat-box');
        if (!pmBox) return;
        
        pmBox.innerHTML = '';

        if (!data || data.length === 0) {
            pmBox.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Нет сообщений. Напишите первым!</div>';
            return;
        }

        data.forEach(msg => {
            // Добавляем username из связанной таблицы
            if (msg.sender) {
                msg.username = msg.sender.username;
            }
            addPMToChat(msg);
        });
        
        pmBox.scrollTop = pmBox.scrollHeight;
    } catch (error) {
        console.error('Ошибка загрузки ЛС:', error);
        const pmBox = document.getElementById('pm-chat-box');
        if (pmBox) {
            pmBox.innerHTML = '<div style="text-align: center; color: var(--accent-red); padding: 20px;">Ошибка загрузки сообщений</div>';
        }
    }
}

// ============================================
// ИЗОБРАЖЕНИЯ
// ============================================

// Универсальная функция загрузки с несколькими API
// Загрузка изображений через ImgBB с вашим ключом
async function uploadImage(file) {
    try {
        showNotification('🔄 Загрузка изображения...');
        
        const formData = new FormData();
        formData.append('image', file);
        
        // ВАШ КЛЮЧ API
        const API_KEY = '6f2da13598184fa66d3d748ae6cbfec8';
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ответ ImgBB:', errorText);
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ Изображение загружено!');
            // Возвращаем прямую ссылку на изображение
            return data.data.url;
        } else {
            throw new Error(data.error?.message || 'Неизвестная ошибка');
        }
        
    } catch (error) {
        console.error('Ошибка загрузки в ImgBB:', error);
        showNotification('❌ Ошибка загрузки: ' + error.message, 'error');
        
        // Если ImgBB не работает, пробуем локальный просмотр
        return URL.createObjectURL(file);
    }
}

// Исправленная функция загрузки изображения
// Исправленная функция обработки загрузки
// Обработка загрузки изображения
async function handleImageUpload(e) {
    if (!currentChatSettings.is_open && currentUser?.role !== 'admin') {
        showNotification('❌ Чат закрыт администратором', 'error');
        return;
    }

    const file = e.target.files[0];
    if (!file) return;

    // Проверка размера (ImgBB принимает до 32MB, оставим 10MB для надежности)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('❌ Файл слишком большой (макс 10MB)', 'error');
        return;
    }

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
        showNotification('❌ Можно загружать только изображения', 'error');
        return;
    }

    // Создаем временный URL для предпросмотра
    const previewUrl = URL.createObjectURL(file);
    const tempId = 'temp-' + Date.now();
    
    try {
        // Показываем предпросмотр
        const tempMessage = {
            id: tempId,
            username: currentUser.username,
            content: '🖼️ Загрузка...',
            image_url: previewUrl,
            created_at: new Date().toISOString(),
            role: currentUser.role
        };
        
        addMessageToChat(tempMessage);

        // Загружаем на ImgBB
        const imageUrl = await uploadImage(file);
        
        // Удаляем временное сообщение
        const tempElement = document.getElementById(`msg-${tempId}`);
        if (tempElement) {
            tempElement.remove();
        }

        // Отправляем постоянное сообщение
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
        
        // Удаляем временное сообщение
        const tempElement = document.getElementById(`msg-${tempId}`);
        if (tempElement) tempElement.remove();
        
    } finally {
        // Очищаем временный URL
        setTimeout(() => {
            URL.revokeObjectURL(previewUrl);
        }, 1000);
        
        // Очищаем input
        e.target.value = '';
    }
}
// ============================================
// АДМИН ФУНКЦИИ
// ============================================

async function approveSelectedUser() {
    const select = document.getElementById('user-select');
    if (!select || !select.value) {
        showNotification('❌ Выберите пользователя', 'error');
        return;
    }

    try {
        await supabase
            .from('profiles')
            .update({ approved: true, role: 'user' })
            .eq('id', select.value);

        showNotification('✅ Пользователь одобрен!');
        
        select.innerHTML = '<option value="">Выберите пользователя</option>';
        loadUsers();
        updateBadges();
        
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка при одобрении', 'error');
    }
}

// ============================================
// REALTIME ПОДПИСКИ
// ============================================

function setupRealtimeSubscriptions() {
    supabase
        .channel('public:messages')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'messages' }, 
            payload => {
                addMessageToChat(payload.new);
            }
        )
        .on('postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'messages' },
            payload => {
                const msgElement = document.getElementById(`msg-${payload.old.id}`);
                if (msgElement) msgElement.remove();
            }
        )
        .subscribe();

    supabase
        .channel('public:chat_settings')
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'chat_settings', filter: 'id=eq.1' },
            payload => {
                currentChatSettings = payload.new;
                updateChatUI();
            }
        )
        .subscribe();

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
                    if (selectedPMUser && (payload.new.sender_id === selectedPMUser.id)) {
                        addPMToChat(payload.new);
                    } else {
                        showNotification(`💌 Новое сообщение от ${payload.new.username}`);
                        updatePMBadge();
                    }
                }
            )
            .subscribe();
    }
}

// ============================================
// УВЕДОМЛЕНИЯ И БЕЙДЖИ
// ============================================

function showNotification(text, type = 'info') {
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = text;
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function updateStats() {
    try {
        const { count: usersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('approved', true);
        
        const statUsers = document.getElementById('stat-users');
        if (statUsers) statUsers.textContent = usersCount || 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: messagesCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());
        
        const statMessages = document.getElementById('stat-messages');
        if (statMessages) statMessages.textContent = messagesCount || 0;
        
        const statOnline = document.getElementById('stat-online');
        if (statOnline) statOnline.textContent = '1';
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
    }
}

async function updateBadges() {
    if (!currentUser) return;
    
    try {
        if (currentUser.role === 'admin') {
            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('approved', false);
            
            if (error) throw error;
            
            const pendingBadge = document.getElementById('pending-badge');
            const pendingBadgeMobile = document.getElementById('pending-badge-mobile');
            
            if (count > 0) {
                if (pendingBadge) {
                    pendingBadge.style.display = 'inline-block';
                    pendingBadge.textContent = count;
                }
                if (pendingBadgeMobile) {
                    pendingBadgeMobile.style.display = 'inline-block';
                    pendingBadgeMobile.textContent = count;
                }
            } else {
                if (pendingBadge) pendingBadge.style.display = 'none';
                if (pendingBadgeMobile) pendingBadgeMobile.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Ошибка обновления бейджей:', error);
    }
}

function updatePMBadge() {
    // Функция для обновления бейджа новых сообщений
    // Можно реализовать позже
}

// ============================================
// РЕГИСТРАЦИЯ И ВХОД
// ============================================

if (document.getElementById('register-form')) {
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const username = document.getElementById('username').value;
        const messageDiv = document.getElementById('message');
        
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username: username }
                }
            });

            if (authError) throw authError;

            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();
            
            if (profileError || !profile) {
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
            
            document.getElementById('register-form').reset();
            
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            messageDiv.innerHTML = '❌ Ошибка: ' + error.message;
            messageDiv.style.color = '#d52b1e';
            messageDiv.style.display = 'block';
        }
    });
}

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

// ============================================
// ВЫХОД
// ============================================

async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ DASHBOARD
// ============================================

if (window.location.pathname.includes('dashboard.html') || window.location.pathname === '/') {
    initDashboard();
}

async function initDashboard() {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            console.error('Профиль не найден');
            return;
        }

        currentUser = profile;
        
        const usernameDisplay = document.getElementById('current-username-display');
        if (usernameDisplay) usernameDisplay.textContent = profile.username || 'Пользователь';
        
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) userAvatar.textContent = profile.username ? profile.username[0].toUpperCase() : '👤';
        
        const userRoleDisplay = document.getElementById('user-role-display');
        if (userRoleDisplay) {
            userRoleDisplay.textContent = profile.role === 'admin' ? 'Администратор' : 'Участник';
        }

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

        initTabs();
        await loadChatSettings();
        await loadMessages();
        await loadUsers();
        await loadPMContacts();
        await loadProfile();
        await updateStats();
        await updateBadges();

        setupRealtimeSubscriptions();

        setInterval(updateStats, 30000);
        setInterval(updateBadges, 10000);

        const sendBtn = document.getElementById('send-message');
        if (sendBtn) sendBtn.addEventListener('click', sendMessage);

        const imageUpload = document.getElementById('image-upload');
        if (imageUpload) imageUpload.addEventListener('change', handleImageUpload);

        const pmSend = document.getElementById('pm-send');
        if (pmSend) pmSend.addEventListener('click', sendPrivateMessage);

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
        // ============================================
// ДОБАВЬТЕ В ИНИЦИАЛИЗАЦИЮ (в конец функции initDashboard)
// ============================================
        if (currentUser.role === 'admin') {
            await loadBanUsers();
    
    // Добавляем обработчики для новых кнопок
            document.getElementById('ban-user')?.addEventListener('click', banUser);
            document.getElementById('unban-user')?.addEventListener('click', unbanUser);
            document.getElementById('clear-user-messages')?.addEventListener('click', clearUserMessages);
            document.getElementById('clear-all-messages')?.addEventListener('click', clearAllMessages);
        }
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
}

// Очистка при выходе
window.addEventListener('beforeunload', () => {
    window.blobUrls.forEach(url => URL.revokeObjectURL(url));
});
// ============================================
// ФУНКЦИИ БАНА ПОЛЬЗОВАТЕЛЕЙ
// ============================================

// Загрузка списка пользователей для бана
async function loadBanUsers() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        // Активные пользователи (не забаненные)
        const { data: activeUsers } = await supabase
            .from('profiles')
            .select('*')
            .eq('approved', true)
            .eq('banned', false)
            .neq('id', currentUser.id)
            .order('username');
        
        const banSelect = document.getElementById('ban-user-select');
        if (banSelect) {
            banSelect.innerHTML = '<option value="">Выберите пользователя для бана</option>';
            activeUsers?.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.username} (${user.role})`;
                banSelect.appendChild(option);
            });
        }
        
        // Забаненные пользователи
        const { data: bannedUsers } = await supabase
            .from('profiles')
            .select('*')
            .eq('banned', true)
            .order('username');
        
        const unbanSelect = document.getElementById('unban-user-select');
        if (unbanSelect) {
            unbanSelect.innerHTML = '<option value="">Выберите пользователя для разбана</option>';
            bannedUsers?.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.username} (забанен)`;
                unbanSelect.appendChild(option);
            });
        }
        
        // Для очистки сообщений
        const clearSelect = document.getElementById('clear-user-select');
        if (clearSelect) {
            clearSelect.innerHTML = '<option value="">Выберите пользователя</option>';
            
            // Все пользователи (кроме текущего)
            const { data: allUsers } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', currentUser.id)
                .order('username');
            
            allUsers?.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.username} ${user.banned ? '(забанен)' : ''}`;
                clearSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Ошибка загрузки списка пользователей:', error);
    }
}

// Забанить пользователя
async function banUser() {
    const userId = document.getElementById('ban-user-select')?.value;
    const reason = document.getElementById('ban-reason')?.value;
    
    if (!userId) {
        showNotification('❌ Выберите пользователя', 'error');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите забанить этого пользователя?')) return;
    
    try {
        // Обновляем профиль
        await supabase
            .from('profiles')
            .update({ 
                banned: true, 
                banned_at: new Date().toISOString(),
                banned_by: currentUser.id
            })
            .eq('id', userId);
        
        // Записываем в историю банов
        await supabase
            .from('banned_users')
            .insert([{
                user_id: userId,
                banned_by: currentUser.id,
                reason: reason || null,
                banned_at: new Date().toISOString(),
                active: true
            }]);
        
        showNotification('✅ Пользователь забанен');
        
        // Обновляем списки
        await loadBanUsers();
        await loadUsers(); // Обновляем основной список
        
        // Очищаем поля
        document.getElementById('ban-reason').value = '';
        
    } catch (error) {
        console.error('Ошибка бана:', error);
        showNotification('❌ Ошибка при бане', 'error');
    }
}

// Разбанить пользователя
async function unbanUser() {
    const userId = document.getElementById('unban-user-select')?.value;
    
    if (!userId) {
        showNotification('❌ Выберите пользователя', 'error');
        return;
    }
    
    if (!confirm('Разбанить этого пользователя?')) return;
    
    try {
        // Обновляем профиль
        await supabase
            .from('profiles')
            .update({ banned: false, banned_at: null, banned_by: null })
            .eq('id', userId);
        
        // Обновляем историю банов
        await supabase
            .from('banned_users')
            .update({ active: false, unbanned_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('active', true);
        
        showNotification('✅ Пользователь разбанен');
        
        // Обновляем списки
        await loadBanUsers();
        await loadUsers();
        
    } catch (error) {
        console.error('Ошибка разбана:', error);
        showNotification('❌ Ошибка при разбане', 'error');
    }
}

// ============================================
// ФУНКЦИИ ОЧИСТКИ СООБЩЕНИЙ
// ============================================

// Очистить сообщения пользователя
async function clearUserMessages() {
    const userId = document.getElementById('clear-user-select')?.value;
    
    if (!userId) {
        showNotification('❌ Выберите пользователя', 'error');
        return;
    }
    
    // Получаем имя пользователя для подтверждения
    const { data: user } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
    
    if (!confirm(`⚠️ Удалить ВСЕ сообщения пользователя ${user?.username}? Это действие нельзя отменить!`)) return;
    
    try {
        // Удаляем сообщения из общего чата
        await supabase
            .from('messages')
            .delete()
            .eq('user_id', userId);
        
        // Удаляем личные сообщения (обе стороны)
        await supabase
            .from('private_messages')
            .delete()
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
        
        showNotification(`✅ Все сообщения пользователя ${user?.username} удалены`);
        
        // Перезагружаем чат
        await loadMessages();
        
    } catch (error) {
        console.error('Ошибка очистки:', error);
        showNotification('❌ Ошибка при очистке', 'error');
    }
}

// Очистить весь чат
async function clearAllMessages() {
    if (!confirm('⚠️⚠️⚠️ ЭТО УДАЛИТ ВСЕ СООБЩЕНИЯ В ЧАТЕ!\n\nВы уверены? Это действие нельзя отменить!')) return;
    
    if (!confirm('Последнее подтверждение: УДАЛИТЬ ВСЕ СООБЩЕНИЯ?')) return;
    
    try {
        showNotification('🔄 Очистка чата...');
        
        // Удаляем все сообщения из общего чата
        await supabase
            .from('messages')
            .delete()
            .neq('id', 0); // Удаляем всё
        
        showNotification('✅ Чат полностью очищен');
        
        // Перезагружаем чат
        await loadMessages();
        
    } catch (error) {
        console.error('Ошибка очистки чата:', error);
        showNotification('❌ Ошибка при очистке', 'error');
    }
}

// ============================================
// ОБНОВЛЕННАЯ ФУНКЦИЯ ЗАГРУЗКИ ПОЛЬЗОВАТЕЛЕЙ
// ============================================

// Добавьте в функцию loadUsers отображение забаненных
async function loadUsers() {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .order('username');
        
        if (error) throw error;

        const approvedList = document.getElementById('approved-users-list');
        const pendingList = document.getElementById('pending-users-list');
        
        if (approvedList) approvedList.innerHTML = '<h4 style="margin-bottom: 10px;">✅ Активные участники</h4>';
        if (pendingList) pendingList.innerHTML = '';
        
        let pendingCount = 0;

        users.forEach(user => {
            if (user.banned) {
                // Забаненные пользователи
                if (approvedList && currentUser?.role === 'admin') {
                    const div = document.createElement('div');
                    div.className = 'user-item';
                    div.style.opacity = '0.5';
                    div.style.background = 'rgba(213, 43, 30, 0.1)';
                    div.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; background: #666; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                ${user.username ? user.username[0].toUpperCase() : '?'}
                            </div>
                            <div>
                                <strong>${user.username}</strong>
                                <span style="color: var(--accent-red); font-size: 0.8rem; margin-left: 5px;">🔨 ЗАБАНЕН</span>
                            </div>
                        </div>
                    `;
                    approvedList.appendChild(div);
                }
            } else if (user.approved) {
                // Активные пользователи
                if (approvedList) {
                    const div = document.createElement('div');
                    div.className = `user-item ${user.role === 'admin' ? 'admin' : ''}`;
                    div.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; background: ${user.role === 'admin' ? 'var(--accent-red)' : 'var(--accent-blue)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                ${user.username ? user.username[0].toUpperCase() : '?'}
                            </div>
                            <div>
                                <strong>${user.username}</strong>
                                ${user.role === 'admin' ? ' 👑' : ''}
                            </div>
                        </div>
                    `;
                    approvedList.appendChild(div);
                }
            } else {
                pendingCount++;
                if (pendingList && currentUser?.role === 'admin') {
                    const div = document.createElement('div');
                    div.className = 'user-item';
                    div.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; background: var(--text-muted); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                                ${user.username ? user.username[0].toUpperCase() : '?'}
                            </div>
                            <div>
                                <strong>${user.username}</strong>
                                <span style="color: var(--accent-red); font-size: 0.8rem; margin-left: 5px;">(ожидает)</span>
                            </div>
                        </div>
                    `;
                    pendingList.appendChild(div);
                }
            }
        });

        const pendingSection = document.getElementById('pending-users-section');
        if (pendingSection) {
            pendingSection.style.display = (pendingCount > 0 && currentUser?.role === 'admin') ? 'block' : 'none';
        }

        const usersCount = document.getElementById('users-count');
        if (usersCount) {
            usersCount.textContent = users.filter(u => u.approved && !u.banned).length;
        }

    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

// ============================================
// ОБНОВЛЕНИЕ ПРОВЕРКИ ПРИ ВХОДЕ
// ============================================

// Добавьте эту проверку в функцию initDashboard после получения профиля
if (profile.banned) {
    document.body.innerHTML = `
        <div class="container">
            <h1 style="color: var(--accent-red);">🚫 ДОСТУП ЗАПРЕЩЕН</h1>
            <p>Вы были забанены администратором.</p>
            ${profile.banned_at ? `<p>Дата: ${new Date(profile.banned_at).toLocaleDateString()}</p>` : ''}
            <p style="color: var(--text-muted); font-size: 0.9rem;">Если вы считаете, что это ошибка, свяжитесь с администратором.</p>
            <a href="index.html" class="btn-primary">На главную</a>
        </div>
    `;
    return;
}







