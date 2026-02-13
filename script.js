// ============================================
// script.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================

// ИНИЦИАЛИЗАЦИЯ (БЕЗ CONST!)
supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentChatSettings = { is_open: true };
let selectedPMUser = null;

// Хранилище для blob URLs
window.blobUrls = window.blobUrls || new Set();

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
            
            // Специфичные действия при переключении (только если пользователь загружен)
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

// Загрузка контактов для ЛС
async function loadPMContacts() {
    // Проверяем, что currentUser существует
    if (!currentUser || !currentUser.id) {
        console.log('Пользователь не загружен, пропускаем загрузку контактов');
        return;
    }
    
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

// Загрузка профиля
async function loadProfile() {
    if (!currentUser) return;
    
    try {
        document.getElementById('profile-username').textContent = currentUser.username || 'Не указано';
        document.getElementById('profile-avatar').textContent = currentUser.username ? currentUser.username[0].toUpperCase() : '?';
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            document.getElementById('profile-email').textContent = user.email || 'Не указан';
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
        } else {
            document.getElementById('profile-created').textContent = 'Неизвестно';
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
}

// Обновление статистики
async function updateStats() {
    try {
        // Количество пользователей
        const { count: usersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('approved', true);
        
        const statUsers = document.getElementById('stat-users');
        if (statUsers) statUsers.textContent = usersCount || 0;
        
        // Сообщения сегодня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: messagesCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());
        
        const statMessages = document.getElementById('stat-messages');
        if (statMessages) statMessages.textContent = messagesCount || 0;
        
        // Онлайн (условно)
        const statOnline = document.getElementById('stat-online');
        if (statOnline) statOnline.textContent = '1';
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
    }
}

// Обновление бейджей
async function updateBadges() {
    // Проверяем, что currentUser существует
    if (!currentUser) {
        console.log('Пользователь не загружен, пропускаем обновление бейджей');
        return;
    }
    
    try {
        // Проверяем неподтверждённые заявки (только для админов)
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

// Регистрация (подача заявки)
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
            
            // Проверяем, создался ли профиль
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();
            
            if (profileError || !profile) {
                // Создаём профиль вручную
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
    try {
        // Получаем текущего пользователя
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Получаем профиль
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
        
        // Обновляем UI с именем пользователя
        const usernameDisplay = document.getElementById('current-username-display');
        if (usernameDisplay) usernameDisplay.textContent = profile.username || 'Пользователь';
        
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) userAvatar.textContent = profile.username ? profile.username[0].toUpperCase() : '👤';
        
        const userRoleDisplay = document.getElementById('user-role-display');
        if (userRoleDisplay) {
            userRoleDisplay.textContent = profile.role === 'admin' ? 'Администратор' : 'Участник';
        }

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

        // Инициализируем вкладки
        initTabs();

        // Загружаем настройки чата
        await loadChatSettings();

        // Загружаем сообщения
        await loadMessages();

        // Загружаем данные для разных вкладок
        await loadUsers();
        await loadPMContacts();
        await loadProfile();
        await updateStats();
        await updateBadges();

        // Настраиваем Realtime подписки
        setupRealtimeSubscriptions();

        // Периодические обновления
        setInterval(updateStats, 30000);
        setInterval(updateBadges, 10000);

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

    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
}

// Остальные функции (sendMessage, loadMessages, addMessageToChat и т.д.) остаются без изменений
// Вставьте сюда все остальные функции из предыдущих версий
