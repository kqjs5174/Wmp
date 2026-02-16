// 主应用逻辑

// ============== 自定义弹窗系统 ==============

/**
 * 自定义弹窗类
 */
const Modal = {
    overlay: null,
    modal: null,
    iconEl: null,
    iconTextEl: null,
    titleEl: null,
    messageEl: null,
    inputEl: null,
    footerEl: null,
    cancelBtn: null,
    confirmBtn: null,
    resolveCallback: null,

    /**
     * 初始化弹窗元素引用
     */
    init() {
        this.overlay = document.getElementById('custom-modal-overlay');
        this.modal = document.getElementById('custom-modal');
        this.iconEl = document.getElementById('custom-modal-icon');
        this.iconTextEl = document.getElementById('custom-modal-icon-text');
        this.titleEl = document.getElementById('custom-modal-title');
        this.messageEl = document.getElementById('custom-modal-message');
        this.inputEl = document.getElementById('custom-modal-input');
        this.footerEl = document.getElementById('custom-modal-footer');
        this.cancelBtn = document.getElementById('custom-modal-cancel');
        this.confirmBtn = document.getElementById('custom-modal-confirm');

        // 绑定事件
        this.cancelBtn.addEventListener('click', () => this.handleCancel());
        this.confirmBtn.addEventListener('click', () => this.handleConfirm());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.handleCancel();
            }
        });

        // ESC 键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                this.handleCancel();
            }
            if (e.key === 'Enter' && this.overlay.classList.contains('active')) {
                this.handleConfirm();
            }
        });
    },

    /**
     * 显示弹窗
     */
    show(options) {
        const {
            type = 'info',
            title = '提示',
            message = '',
            showCancel = false,
            showInput = false,
            inputValue = '',
            inputPlaceholder = '',
            confirmText = '确定',
            cancelText = '取消',
            confirmClass = 'primary'
        } = options;

        // 设置图标
        const iconConfig = {
            info: { icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>', class: 'info' },
            success: { icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>', class: 'success' },
            warning: { icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>', class: 'warning' },
            error: { icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>', class: 'error' },
            confirm: { icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>', class: 'confirm' }
        };
        const iconInfo = iconConfig[type] || iconConfig.info;
        this.iconEl.innerHTML = iconInfo.icon; // Use innerHTML for SVG
        this.iconEl.className = 'custom-modal-icon ' + iconInfo.class;

        // 设置内容
        this.titleEl.textContent = title;
        // 使用 innerHTML 来支持富文本消息
        this.messageEl.innerHTML = message;

        // 设置输入框
        if (showInput) {
            this.inputEl.style.display = 'block';
            this.inputEl.value = inputValue;
            this.inputEl.placeholder = inputPlaceholder;
        } else {
            this.inputEl.style.display = 'none';
        }

        // 设置按钮
        this.cancelBtn.style.display = showCancel ? 'inline-block' : 'none';
        this.cancelBtn.textContent = cancelText;
        this.confirmBtn.textContent = confirmText;
        this.confirmBtn.className = 'custom-modal-btn custom-modal-btn-' + confirmClass;

        // 显示弹窗
        this.overlay.classList.add('active');

        // 聚焦
        if (showInput) {
            setTimeout(() => this.inputEl.focus(), 100);
        } else {
            setTimeout(() => this.confirmBtn.focus(), 100);
        }

        // 返回 Promise
        return new Promise((resolve) => {
            this.resolveCallback = resolve;
        });
    },

    /**
     * 隐藏弹窗
     */
    hide() {
        this.overlay.classList.remove('active');
    },

    /**
     * 处理取消
     */
    handleCancel() {
        this.hide();
        if (this.resolveCallback) {
            this.resolveCallback({ confirmed: false, value: null });
            this.resolveCallback = null;
        }
    },

    /**
     * 处理确认
     */
    handleConfirm() {
        const value = this.inputEl.style.display !== 'none' ? this.inputEl.value : null;
        this.hide();
        if (this.resolveCallback) {
            this.resolveCallback({ confirmed: true, value });
            this.resolveCallback = null;
        }
    }
};

/**
 * 显示提示弹窗（替代 alert）
 * @param {string} message 消息内容
 * @param {string} type 类型：info/success/warning/error
 * @param {string} title 标题
 */
async function showAlert(message, type = 'info', title = '提示') {
    return Modal.show({
        type,
        title,
        message,
        showCancel: false,
        confirmText: '确定'
    });
}

/**
 * 显示确认弹窗（替代 confirm）
 * @param {string} message 消息内容
 * @param {string} title 标题
 */
async function showConfirm(message, title = '确认') {
    const result = await Modal.show({
        type: 'confirm',
        title,
        message,
        showCancel: true,
        confirmText: '确定',
        cancelText: '取消'
    });
    return result.confirmed;
}

/**
 * 显示输入弹窗（替代 prompt）
 * @param {string} message 消息内容
 * @param {string} defaultValue 默认值
 * @param {string} title 标题
 */
async function showPrompt(message, defaultValue = '', title = '请输入') {
    const result = await Modal.show({
        type: 'info',
        title,
        message,
        showCancel: true,
        showInput: true,
        inputValue: defaultValue,
        confirmText: '确定',
        cancelText: '取消'
    });
    return result.confirmed ? result.value : null;
}

// 全局状态
let ordersData = [];
let instancesData = [];
let refreshTimer = null;
let statusRefreshTimer = null; // 新增：用于服务器状态页面的定时器
let currentUsername = ''; // 当前搜索的用户名
let currentUser = null; // 当前登录用户
let loginCaptchaCode = ''; // 登录验证码
let registerCaptchaCode = ''; // 注册验证码

// DOM 元素
const elements = {
    navItems: null,
    pages: null,
    pageTitle: null,
    rechargeIframe: null,
    loginContainer: null,
    appContainer: null
};

/**
 * 初始化应用
 */
function initApp() {
    // 缓存 DOM 元素
    elements.navItems = document.querySelectorAll('.nav-item');
    elements.pages = document.querySelectorAll('.page');
    elements.pageTitle = document.getElementById('page-title');
    elements.rechargeIframe = document.getElementById('recharge-iframe');
    elements.loginContainer = document.getElementById('login-container');
    elements.appContainer = document.getElementById('app-container');

    // 检查登录状态
    checkLoginStatus();

    // 绑定导航事件
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
        });
    });

    // 绑定回车键登录
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });

    document.getElementById('login-username').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('login-password').focus();
        }
    });

}

/**
 * 检查登录状态
 */
function checkLoginStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showApp();
        } catch (e) {
            localStorage.removeItem('currentUser');
            showLogin();
        }
    } else {
        showLogin();
    }
}

/**
 * 显示登录页面
 */
function showLogin() {
    elements.loginContainer.style.display = 'flex';
    elements.appContainer.style.display = 'none';
    stopAutoRefresh();
}

/**
 * 显示主应用
 */
function showApp() {
    elements.loginContainer.style.display = 'none';
    elements.appContainer.style.display = 'flex';
    
    // 更新用户显示
    if (currentUser) {
        document.getElementById('current-user').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>' + currentUser.username;
        document.getElementById('welcome-user').textContent = '欢迎, ' + currentUser.username;
    }
    
    // 加载初始数据
    loadDashboardData();
    loadAnnouncement();
    
    // 设置自动刷新
    startAutoRefresh();
}

/**
 * 显示登录表单
 */
function showLoginForm() {
    document.querySelector('.login-form').style.display = 'block';
    document.getElementById('register-form-container').style.display = 'none';
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('register-error').style.display = 'none';
}

/**
 * 显示注册表单
 */
function showRegisterForm() {
    document.querySelector('.login-form').style.display = 'none';
    document.getElementById('register-form-container').style.display = 'block';
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('register-error').style.display = 'none';
}

/**
 * 处理登录
 */
async function handleLogin() {
    const loginButton = document.querySelector('.login-form .btn');
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const captcha = document.getElementById('login-captcha').value.trim().toUpperCase();

    if (!username) {
        showLoginError('请输入用户名');
        return;
    }

    if (!password) {
        showLoginError('请输入密码');
        return;
    }

    if (!captcha) {
        showLoginError('请输入验证码');
        return;
    }

    if (captcha !== loginCaptchaCode) {
        showLoginError('验证码错误');
        refreshLoginCaptcha();
        return;
    }

    loginButton.classList.add('loading');
    loginButton.disabled = true;

    try {
        const response = await fetch(CONFIG.RENEWAL_API_URL + '/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.status === 'success') {
            currentUser = data.data;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showApp();
        } else {
            showLoginError(data.error || '登录失败');
            refreshLoginCaptcha();
        }
    } catch (error) {
        showLoginError('网络错误: ' + error.message);
    } finally {
        loginButton.classList.remove('loading');
        loginButton.disabled = false;
    }
}

/**
 * 处理注册
 */
async function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;
    const email = document.getElementById('reg-email').value.trim();
    const captcha = document.getElementById('reg-captcha').value.trim().toUpperCase();

    // 验证
    if (!username) {
        showRegisterError('请输入用户名');
        return;
    }

    if (username.length < 3 || username.length > 20) {
        showRegisterError('用户名长度必须在3-20个字符之间');
        return;
    }

    if (!password) {
        showRegisterError('请输入密码');
        return;
    }

    if (password.length < 6) {
        showRegisterError('密码长度至少6个字符');
        return;
    }

    if (password !== passwordConfirm) {
        showRegisterError('两次输入的密码不一致');
        return;
    }

    if (!captcha) {
        showRegisterError('请输入验证码');
        return;
    }

    if (captcha !== registerCaptchaCode) {
        showRegisterError('验证码错误');
        refreshRegisterCaptcha();
        return;
    }

    try {
        // 先验证用户名是否存在于 MCSManager
        showRegisterError('正在验证用户名...', false);  // 显示为提示信息（灰色）
        
        const validateResponse = await fetch(CONFIG.RENEWAL_API_URL + '/api/mcsm/validate?username=' + encodeURIComponent(username));
        const validateData = await validateResponse.json();
        
        // 如果 MCSManager 用户目录存在但用户不存在，则拒绝注册
        if (validateData.data && validateData.data.directoryExists && !validateData.data.valid) {
            showRegisterError('❌ ' + (validateData.msg || '该用户名未在面板中注册，请先在 MCSManager 面板注册账号'), true);
            refreshRegisterCaptcha();
            return;
        }
        
        // 显示注册中提示
        showRegisterError('正在注册...', false);
        
        // 继续注册流程
        const response = await fetch(CONFIG.RENEWAL_API_URL + '/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, email })
        });

        const data = await response.json();

        if (data.status === 'success') {
            // 注册成功，自动登录
            hideRegisterError();
            currentUser = data.data;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showApp();
        } else {
            showRegisterError('❌ ' + (data.error || '注册失败'), true);
            refreshRegisterCaptcha();
        }
    } catch (error) {
        showRegisterError('❌ 网络错误: ' + error.message, true);
        refreshRegisterCaptcha();
    }
}

/**
 * 显示登录错误
 */
function showLoginError(message, isError = true) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.classList.add('show');
    
    // 设置样式：错误为红色，提示为灰色
    if (isError) {
        errorDiv.style.background = '#fee';
        errorDiv.style.color = '#c00';
    } else {
        errorDiv.style.background = '#f5f5f5';
        errorDiv.style.color = '#666';
    }
}

/**
 * 隐藏登录错误
 */
function hideLoginError() {
    const errorDiv = document.getElementById('login-error');
    errorDiv.style.display = 'none';
    errorDiv.classList.remove('show');
}

/**
 * 显示注册错误
 */
function showRegisterError(message, isError = true) {
    const errorDiv = document.getElementById('register-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.classList.add('show');
    
    // 设置样式：错误为红色，提示为灰色
    if (isError) {
        errorDiv.style.background = '#fee';
        errorDiv.style.color = '#c00';
    } else {
        errorDiv.style.background = '#f5f5f5';
        errorDiv.style.color = '#666';
    }
}

/**
 * 隐藏注册错误
 */
function hideRegisterError() {
    const errorDiv = document.getElementById('register-error');
    errorDiv.style.display = 'none';
    errorDiv.classList.remove('show');
}

/**
 * 处理退出登录
 */
async function handleLogout() {
    const confirmed = await showConfirm('确定要退出登录吗？', '退出确认');
    if (confirmed) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        showLogin();
        
        // 清空表单
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-error').classList.remove('show');
    }
}

/**
 * 页面导航
 * @param {string} pageName 页面名称
 */
function navigateTo(pageName) {
    // 清除所有定时器
    stopAutoRefresh();
    stopStatusRefresh();

    // 更新导航状态
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageName);
    });

    // 更新页面显示
    elements.pages.forEach(page => {
        page.classList.toggle('active', page.id === `${pageName}-page`);
    });

    // 更新标题
    elements.pageTitle.textContent = CONFIG.PAGE_TITLES[pageName] || pageName;

    // 页面特定逻辑
    switch (pageName) {
        case 'dashboard':
            loadAnnouncement();
            loadDashboardData();
            startAutoRefresh();
            break;
        case 'orders':
            loadOrdersPage();
            break;
        case 'instances':
            loadInstancesPage();
            break;
        case 'users':
            loadUsersPage();
            break;
        case 'recharge':
            loadRechargePage();
            break;
        case 'redeem':
            loadRedeemPage();
            break;
        case 'create-server':
            loadCreateServerPage();
            break;
        case 'status':
            loadStatusPage();
            startStatusRefresh(); // 为状态页启动刷新
            break;
    }
}

/**
 * 加载仪表盘数据
 */
async function loadDashboardData() {
    if (!currentUser || !currentUser.username) {
        // 如果未登录，可以将统计数据清零或显示提示
        updateDashboardStats({ instances: [], points: 0 });
        return;
    }

    try {
        // 并行获取实例数据和积分数据
        const [instancesResponse, pointsResponse] = await Promise.all([
            fetch(`${CONFIG.RENEWAL_API_URL}/api/user/instances?username=${encodeURIComponent(currentUser.username)}`),
            fetch(`${CONFIG.POINTS_API_URL}/api/users/points?username=${encodeURIComponent(currentUser.username)}`)
        ]);

        const instancesResult = await instancesResponse.json();
        const pointsResult = await pointsResponse.json();

        let instances = [];
        if (instancesResult.code === 0 && instancesResult.data && instancesResult.data.instances) {
            instances = instancesResult.data.instances;
        }

        let userBalance = 0;
        if ((pointsResult.code === 0 || pointsResult.status === 'success') && pointsResult.data) {
            if (pointsResult.data.users && Array.isArray(pointsResult.data.users)) {
                const userData = pointsResult.data.users.find(u => u.username === currentUser.username);
                if (userData) {
                    userBalance = userData.totalPoints || userData.points || 0;
                }
            } else {
                userBalance = pointsResult.data.totalPoints || pointsResult.data.points || 0;
            }
        }
        
        // 将整合后的数据传递给更新函数
        updateDashboardStats({ instances, points: userBalance });

    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
        // 即使失败，也调用更新函数以清零或显示错误状态
        updateDashboardStats({ instances: [], points: 0 });
    }
}


/**
 * 更新仪表盘统计数据
 * @param {object} data - 包含实例和积分信息的对象 { instances: [], points: 0 }
 */
function updateDashboardStats(data) {
    const { instances = [], points = 0 } = data;
    const now = Date.now();

    // 计算统计数据
    const totalInstances = instances.length;
    let expiringInstances = 0;
    let expiredInstances = 0;

    instances.forEach(instance => {
        if (instance.endTime) {
            const diffDays = (new Date(instance.endTime).getTime() - now) / (1000 * 60 * 60 * 24);
            if (diffDays < 0) {
                expiredInstances++;
            } else if (diffDays <= 7) {
                expiringInstances++;
            }
        }
    });

    // 更新 DOM
    const statTotalInstances = document.getElementById('stat-total-instances');
    const statExpiringInstances = document.getElementById('stat-expiring-instances');
    const statTotalPoints = document.getElementById('stat-total-points');
    const statExpiredInstances = document.getElementById('stat-expired-instances');

    if (statTotalInstances) statTotalInstances.textContent = totalInstances;
    if (statExpiringInstances) statExpiringInstances.textContent = expiringInstances;
    if (statTotalPoints) statTotalPoints.textContent = points;
    if (statExpiredInstances) statExpiredInstances.textContent = expiredInstances;
}

/**
 * 渲染最近订单（仪表盘） (已移除卡片功能)
 */
function renderRecentOrders() {
    // 卡片功能已移除
}

/**
 * 加载订单页面
 */
async function loadOrdersPage() {
    const container = document.getElementById('orders-list');
    container.innerHTML = '<p class="loading">加载中...</p>';

    // 检查用户是否登录
    if (!currentUser || !currentUser.username) {
        showError('orders-list', '请先登录以查看您的订单');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.RENEWAL_API_URL}/api/user/orders?username=${encodeURIComponent(currentUser.username)}`);
        const result = await response.json();

        if (result.status === 'success') {
            ordersData = API.parseOrders(result.orders);
            renderOrdersList();
        } else {
            showError('orders-list', result.error || '加载订单失败');
        }
    } catch (error) {
        showError('orders-list', '网络错误: ' + error.message);
    }
}

/**
 * 渲染订单列表
 */
function renderOrdersList() {
    const container = document.getElementById('orders-list');

    if (ordersData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:48px;height:48px;color:#9ca3af;"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg></div>
                <p>暂无订单数据</p>
            </div>
        `;
        return;
    }

    container.innerHTML = createOrdersTable(ordersData);
}

/**
 * 创建订单表格 HTML
 * @param {Array} orders 订单数组
 * @returns {string} HTML 字符串
 */
function createOrdersTable(orders) {
    let html = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>订单号</th>
                    <th>金额</th>
                    <th>状态</th>
                    <th>支付时间</th>
                </tr>
            </thead>
            <tbody>
    `;

    orders.forEach(order => {
        const statusDisplay = API.getStatusDisplay(order.status);
        html += `
            <tr>
                <td>${order.order_id || '-'}</td>
                <td>¥${order.amount || '0'}</td>
                <td>
                    <span class="status-badge ${statusDisplay.class}">
                        ${statusDisplay.text}
                    </span>
                </td>
                <td>${API.formatDateTime(order.paid_at)}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    return html;
}

/**
 * 加载充值页面
 */
function loadRechargePage() {
    if (elements.rechargeIframe) {
        // 设置 iframe 源
        elements.rechargeIframe.src = CONFIG.RECHARGE_URL;
    }
}

/**
 * 在新标签页打开充值页面
 */
function openRechargeNewTab() {
    window.open(CONFIG.RECHARGE_URL, '_blank');
}

/**
 * 刷新订单数据
 */
async function refreshOrders() {
    await loadOrdersPage();
}

/**
 * 显示错误信息
 * @param {string} containerId 容器 ID
 * @param {string} message 错误信息
 */
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <strong>错误：</strong>${message}
                <br><br>
                <button class="btn btn-primary" onclick="location.reload()">重新加载</button>
            </div>
        `;
    }
}

/**
 * 开始自动刷新
 */
function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    refreshTimer = setInterval(() => {
        // 只在仪表盘页面自动刷新
        const dashboardPage = document.getElementById('dashboard-page');
        if (dashboardPage && dashboardPage.classList.contains('active')) {
            loadDashboardData();
        }
    }, CONFIG.REFRESH_INTERVAL);
}

/**
 * 停止自动刷新
 */
function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

/**
 * 开始状态页面自动刷新
 */
function startStatusRefresh() {
    if (statusRefreshTimer) {
        clearInterval(statusRefreshTimer);
    }
    statusRefreshTimer = setInterval(loadStatusPage, CONFIG.REFRESH_INTERVAL);
}

/**
 * 停止状态页面自动刷新
 */
function stopStatusRefresh() {
    if (statusRefreshTimer) {
        clearInterval(statusRefreshTimer);
        statusRefreshTimer = null;
    }
}

/**
 * 加载实例页面（自动加载当前用户的实例列表）
 */
async function loadInstancesPage() {
    const container = document.getElementById('instances-list');
    
    // 清空实例数据
    instancesData = [];
    currentUsername = '';
    
    // 检查用户是否登录
    if (!currentUser || !currentUser.username) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:48px;height:48px;color:#9ca3af;"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg></div>
                <p>请先登录</p>
                <p style="font-size: 0.85rem; margin-top: 10px; color: #888;">登录后将自动显示您的实例列表</p>
            </div>
        `;
        return;
    }
    
    // 显示加载状态
    container.innerHTML = '<p class="loading"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;vertical-align:middle;margin-right:8px;animation:spin 1s linear infinite;"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.691V5.25a3.375 3.375 0 00-3.375-3.375H8.25a3.375 3.375 0 00-3.375 3.375v3.192m13.156 0A8.25 8.25 0 019.75 21v0a8.25 8.25 0 01-6.765-3.356" /></svg>正在加载您的实例...</p>';
    currentUsername = currentUser.username;
    
    try {
        // 调用新的 API 获取当前用户的实例列表
        const response = await fetch(`${CONFIG.RENEWAL_API_URL}/api/user/instances?username=${encodeURIComponent(currentUser.username)}`);
        const result = await response.json();
        
        if (result.code === 0 && result.data && result.data.instances) {
            instancesData = result.data.instances;
            renderInstancesList();
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📭</div>
                    <p>${result.msg || '暂无实例'}</p>
                    <p style="font-size: 0.85rem; margin-top: 10px; color: #888;">您还没有任何实例，或实例信息获取失败</p>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <p>加载失败: ${error.message}</p>
                <p style="font-size: 0.85rem; margin-top: 10px; color: #888;">请检查网络连接后重试</p>
            </div>
        `;
    }
}

/**
 * 通过实例ID搜索实例（保留手动搜索功能）
 */
async function searchInstanceById() {
    const instanceIdInput = document.getElementById('renew-instance-id');
    const instanceId = instanceIdInput ? instanceIdInput.value.trim() : '';
    const container = document.getElementById('instances-list');
    const resultDiv = document.getElementById('renew-result');

    // 如果没有输入实例ID，则加载当前用户的所有实例
    if (!instanceId) {
        loadInstancesPage();
        return;
    }

    // 隐藏之前的结果提示
    if (resultDiv) {
        resultDiv.style.display = 'none';
    }
    
    container.innerHTML = '<p class="loading">🔍 正在搜索...</p>';
    currentUsername = instanceId; // 复用变量存储当前搜索的ID

    const result = await API.getInstanceById(instanceId);
    
    if (result.success) {
        instancesData = result.instances;
        renderInstancesList();
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">😕</div>
                <p>${result.error}</p>
                <p style="font-size: 0.85rem; margin-top: 10px; color: #888;">请检查实例ID是否正确</p>
            </div>
        `;
    }
}

/**
 * 刷新实例列表
 */
async function refreshInstances() {
    // 直接重新加载实例页面
    loadInstancesPage();
}

/**
 * 渲染实例列表
 */
function renderInstancesList() {
    const container = document.getElementById('instances-list');

    if (instancesData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <p>暂无实例</p>
                <p style="font-size: 0.85rem; margin-top: 10px; color: #888;">您还没有任何实例</p>
            </div>
        `;
        return;
    }

    // 容器已经是 instance-cards-container，直接填充卡片
    let html = '';
    instancesData.forEach(instance => {
        html += createInstanceCard(instance);
    });
    container.innerHTML = html;
}

/**
 * 创建单个实例卡片的 HTML
 * @param {Object} instance 实例对象
 * @returns {string} HTML 字符串
 */
function createInstanceCard(instance) {
    const statusInfo = getInstanceStatusInfo(instance.status);
    const expireInfo = getExpireTimeInfo(instance.endTime);

    return `
        <div class="instance-card">
            <div class="instance-card-header">
                <h3>${instance.nickname || '未命名'}</h3>
                <div class="instance-status">
                    <span class="status-dot ${statusInfo.class}"></span>
                    <span>${statusInfo.text}</span>
                </div>
            </div>
            <div class="instance-card-body">
                <div class="instance-card-info">
                    <strong>ID:</strong> ${instance.uuid}
                </div>
                <div class="instance-card-info">
                    <strong>到期时间:</strong> 
                    <span class="expire-time ${expireInfo.class}">${expireInfo.text}</span>
                </div>
            </div>
            <div class="instance-card-footer">
                <button class="btn btn-primary" onclick="renewInstance('${instance.daemonId}', '${instance.uuid}', '${instance.nickname}')">
                    ⏰ 续费
                </button>
                <button class="btn btn-secondary" onclick="showEditInstanceModal('${instance.uuid}')">
                    ✏️ 修改
                </button>
                <button class="btn btn-tertiary" onclick="showConfigureInstanceModal('${instance.uuid}')">
                    ⚙️ 配置
                </button>
            </div>
        </div>
    `;
}

/**
 * 获取实例状态信息
 * @param {number} status 状态码
 * @returns {Object} 状态信息
 */
function getInstanceStatusInfo(status) {
    const statusMap = {
        '-1': { text: '忙碌', class: 'starting' },
        '0': { text: '已停止', class: 'stopped' },
        '1': { text: '停止中', class: 'stopping' },
        '2': { text: '启动中', class: 'starting' },
        '3': { text: '运行中', class: 'running' }
    };
    return statusMap[String(status)] || { text: '未知', class: 'stopped' };
}

/**
 * 获取到期时间信息
 * @param {number} endTime 到期时间戳
 * @returns {Object} 到期时间信息
 */
function getExpireTimeInfo(endTime) {
    if (!endTime) {
        return { text: '永久', class: 'valid' };
    }

    const now = Date.now();
    const expireDate = new Date(endTime);
    const diffDays = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24));

    const formattedDate = expireDate.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    if (diffDays < 0) {
        return { text: `已过期 (${formattedDate})`, class: 'expired' };
    } else if (diffDays <= 7) {
        return { text: `${formattedDate} (${diffDays}天后)`, class: 'expiring-soon' };
    } else {
        return { text: `${formattedDate} (${diffDays}天后)`, class: 'valid' };
    }
}

/**
 * 续费实例
 * @param {string} daemonId 守护进程ID
 * @param {string} uuid 实例UUID
 * @param {string} nickname 实例名称
 */
async function renewInstance(daemonId, uuid, nickname) {
    // 先获取价格配置
    const priceResult = await API.getRenewalPrice();
    let pricePerDay = 0.33; // 默认价格
    if (priceResult.success && priceResult.data) {
        pricePerDay = priceResult.data.pricePerDay;
    }

    const days = await showPrompt(`实例: ${nickname}\n每天价格: ${pricePerDay} 积分\n\n请输入续费天数：`, '30', '实例续费');
    
    if (days === null) return;
    
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1) {
        await showAlert('请输入有效的天数', 'warning', '输入错误');
        return;
    }

    // 计算所需积分
    const requiredPoints = daysNum * pricePerDay;

    // 检查用户是否登录
    if (!currentUser || !currentUser.username) {
        await showAlert('请先登录', 'warning', '未登录');
        return;
    }

    // 先查询用户积分余额
    let userBalance = 0;
    try {
        const pointsUrl = `${CONFIG.POINTS_API_URL}/api/users/points?username=${encodeURIComponent(currentUser.username)}`;
        console.log('[DEBUG] 查询积分URL:', pointsUrl);
        const pointsResponse = await fetch(pointsUrl);
        const pointsResult = await pointsResponse.json();
        console.log('[DEBUG] 积分查询结果:', pointsResult);
        
        // 适配两种返回格式: {code: 0, msg: 'success'} 或 {status: 'success'}
        const isSuccess = pointsResult.code === 0 || pointsResult.status === 'success';
        if (isSuccess && pointsResult.data) {
            // 如果返回的是用户列表，从中查找当前用户
            if (pointsResult.data.users && Array.isArray(pointsResult.data.users)) {
                const currentUserData = pointsResult.data.users.find(u => 
                    u.username === currentUser.username
                );
                console.log('[DEBUG] 找到的用户数据:', currentUserData);
                if (currentUserData) {
                    userBalance = currentUserData.totalPoints || currentUserData.points || currentUserData.balance || 0;
                }
            } else {
                // 直接返回单个用户数据
                userBalance = pointsResult.data.totalPoints || pointsResult.data.points || pointsResult.data.balance || 0;
            }
            console.log('[DEBUG] 解析到的余额:', userBalance);
        }
    } catch (error) {
        console.error('[DEBUG] 获取积分失败:', error);
    }

    // 检查积分是否足够
    if (userBalance < requiredPoints) {
        await showAlert(`积分不足！\n\n当前余额: ${userBalance}\n所需积分: ${requiredPoints}\n\n请先充值积分`, 'warning', '余额不足');
        return;
    }

    // 确认续费
    const confirmed = await showConfirm(`实例: ${nickname}\n续费天数: ${daysNum}天\n所需积分: ${requiredPoints}\n当前余额: ${userBalance}\n\n点击"确定"将执行续费操作`, '确认续费');
    if (!confirmed) {
        return;
    }

    // 调用新的原子续费API
    try {
        const response = await fetch('/api/instance/renew', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser.username,
                daemonId: daemonId,
                uuid: uuid,
                days: daysNum
            })
        });

        const result = await response.json();

        if (result.code === 0) {
            // 续费成功
            const data = result.data;
            await showAlert(
                `实例: ${nickname}\n续费天数: ${daysNum}天\n扣除积分: ${data.pointsDeducted}\n剩余积分: ${data.currentPoints}\n新到期时间: ${API.formatDateTime(data.newEndTime)}`,
                'success',
                '续费成功'
            );
            refreshInstances();
        } else {
            // 续费失败 (后端已自动处理积分回滚)
            await showAlert(
                `续费失败: ${result.msg}`,
                'error',
                '操作失败'
            );
        }
    } catch (error) {
        console.error('续费请求失败:', error);
        await showAlert(`操作失败: ${error.message}`, 'error', '网络错误');
    }
}

// Global variable to store the UUID of the instance being edited
let currentEditingInstanceUUID = null;
let originalInstanceImageId = null; // Store the original image ID for comparison

/**
 * 显示修改实例信息（基础）的模态框
 * @param {string} uuid 实例UUID
 */
async function showEditInstanceModal(uuid) {
    currentEditingInstanceUUID = uuid;
    const modalOverlay = document.getElementById('edit-instance-modal-overlay');
    const modal = document.getElementById('edit-instance-modal');
    const nicknameInput = document.getElementById('edit-instance-nickname');
    const javaVersionSelect = document.getElementById('edit-instance-java-version');
    const loadingDiv = modal.querySelector('.loading-state');
    const formDiv = modal.querySelector('.form-state');

    if (!modalOverlay || !nicknameInput || !javaVersionSelect) {
        console.error('修改模态框的元素未找到!');
        showAlert('无法打开修改窗口，页面元素缺失。', 'error');
        return;
    }

    modalOverlay.classList.add('active');
    loadingDiv.style.display = 'flex';
    formDiv.style.display = 'none';
    javaVersionSelect.innerHTML = '<option value="">加载中...</option>';

    const instance = instancesData.find(inst => inst.uuid === uuid);
    if (!instance) {
        showAlert('未找到实例数据，请刷新后重试。', 'error');
        closeEditInstanceModal();
        return;
    }
    const daemonId = instance.daemonId;

    try {
        const [instanceResponse, imagesResponse] = await Promise.all([
            fetch(`${CONFIG.RENEWAL_API_URL}/api/instance/detail?daemonId=${encodeURIComponent(daemonId)}&uuid=${encodeURIComponent(uuid)}`),
            fetch(CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.SERVER_IMAGES)
        ]);

        const instanceResult = await instanceResponse.json();
        const imagesResult = await imagesResponse.json();

        if (instanceResult.status !== 'success' || !instanceResult.data) {
            showAlert(`获取实例详情失败: ${instanceResult.error || '未知错误'}`, 'error');
            closeEditInstanceModal();
            return;
        }
        if (imagesResult.code !== 0 || !imagesResult.data || !imagesResult.data.images) {
            showAlert(`获取Java版本列表失败: ${imagesResult.msg || '未知错误'}`, 'error');
            closeEditInstanceModal();
            return;
        }

        const details = instanceResult.data;
        const config = details.config || {};
        const dockerConfig = config.docker || {};
        const availableImages = imagesResult.data.images;

        const originalImage = availableImages.find(image => dockerConfig.image === image.image);
        originalInstanceImageId = originalImage ? originalImage.id : null;

        javaVersionSelect.innerHTML = '';
        availableImages.forEach(image => {
            const option = document.createElement('option');
            option.value = image.id;
            option.textContent = image.name;
            if (dockerConfig.image === image.image) {
                option.selected = true;
            }
            javaVersionSelect.appendChild(option);
        });

        nicknameInput.value = config.nickname || '';
        
        loadingDiv.style.display = 'none';
        formDiv.style.display = 'block';

    } catch (error) {
        showAlert(`网络错误: ${error.message}`, 'error');
        closeEditInstanceModal();
    }
}

/**
 * 关闭修改实例信息（基础）的模态框
 */
function closeEditInstanceModal() {
    const modalOverlay = document.getElementById('edit-instance-modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
    }
    currentEditingInstanceUUID = null;
}

/**
 * 处理更新实例信息（基础）
 */
async function handleUpdateInstance() {
    if (!currentEditingInstanceUUID) {
        showAlert('没有正在编辑的实例。', 'error');
        return;
    }

    const nickname = document.getElementById('edit-instance-nickname').value.trim();
    const imageId = document.getElementById('edit-instance-java-version').value;
    const saveBtn = document.getElementById('edit-instance-save-btn');

    if (!imageId) {
        showAlert('请选择一个Java版本。', 'warning');
        return;
    }

    const instance = instancesData.find(inst => inst.uuid === currentEditingInstanceUUID);
    if (!instance) {
        showAlert('未找到实例数据，请刷新后重试。', 'error');
        closeEditInstanceModal();
        return;
    }
    const daemonId = instance.daemonId;

    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
        const response = await fetch(`${CONFIG.RENEWAL_API_URL}/api/instance/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                daemonId,
                uuid: currentEditingInstanceUUID,
                nickname,
                imageId
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            closeEditInstanceModal();
            let successMessage = '实例信息更新成功！';
            if (originalInstanceImageId && imageId !== originalInstanceImageId) {
                successMessage += `
                    <div style="margin-top: 15px; padding: 10px; background: #fffbe6; border: 1px solid #fde68a; border-radius: 8px; color: #854d0e; font-size: 0.9rem; text-align: center;">
                        *镜像需重启服务器生效
                    </div>
                `;
            }
            await showAlert(successMessage, 'success', '操作成功');
            refreshInstances();
        } else {
            showAlert(`更新失败: ${result.error || '未知错误'}`, 'error');
        }
    } catch (error) {
        showAlert(`网络错误: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '保存更改';
    }
}

/**
 * 显示修改实例配置（硬件）的模态框
 * @param {string} uuid 实例UUID
 */
async function showConfigureInstanceModal(uuid) {
    currentEditingInstanceUUID = uuid;
    const modalOverlay = document.getElementById('configure-instance-modal-overlay');
    const modal = document.getElementById('configure-instance-modal');
    const memoryInput = document.getElementById('configure-instance-memory');
    const portsInput = document.getElementById('configure-instance-ports');
    const loadingDiv = modal.querySelector('.loading-state');
    const formDiv = modal.querySelector('.form-state');

    if (!modalOverlay || !memoryInput || !portsInput) {
        console.error('配置模态框的元素未找到!');
        showAlert('无法打开配置窗口，页面元素缺失。', 'error');
        return;
    }

    modalOverlay.classList.add('active');
    loadingDiv.style.display = 'flex';
    formDiv.style.display = 'none';

    const instance = instancesData.find(inst => inst.uuid === uuid);
    if (!instance) {
        showAlert('未找到实例数据，请刷新后重试。', 'error');
        closeConfigureInstanceModal();
        return;
    }
    const daemonId = instance.daemonId;

    try {
        const response = await fetch(`${CONFIG.RENEWAL_API_URL}/api/instance/detail?daemonId=${encodeURIComponent(daemonId)}&uuid=${encodeURIComponent(uuid)}`);
        const result = await response.json();

        if (result.status !== 'success' || !result.data) {
            showAlert(`获取实例详情失败: ${result.error || '未知错误'}`, 'error');
            closeConfigureInstanceModal();
            return;
        }

        const details = result.data;
        const config = details.config || {};
        const dockerConfig = config.docker || {};

        memoryInput.value = dockerConfig.memory || '1024';
        const portNumbers = (dockerConfig.ports || []).map(p => p.split(':')[0]).filter((v, i, a) => a.indexOf(v) === i);
        portsInput.value = portNumbers.join(', ');
        
        loadingDiv.style.display = 'none';
        formDiv.style.display = 'block';

    } catch (error) {
        showAlert(`网络错误: ${error.message}`, 'error');
        closeConfigureInstanceModal();
    }
}

/**
 * 关闭修改实例配置（硬件）的模态框
 */
function closeConfigureInstanceModal() {
    const modalOverlay = document.getElementById('configure-instance-modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
    }
    currentEditingInstanceUUID = null;
}

/**
 * 处理更新实例配置（硬件）
 */
async function handleUpdateConfiguration() {
    if (!currentEditingInstanceUUID) {
        showAlert('没有正在编辑的实例。', 'error');
        return;
    }
    // 将全局UUID捕获到局部常量，防止在异步操作（如弹窗）期间被修改
    const uuid = currentEditingInstanceUUID;

    const memory = document.getElementById('configure-instance-memory').value.trim();
    const portsStr = document.getElementById('configure-instance-ports').value.trim();
    const saveBtn = document.getElementById('configure-instance-save-btn');

    const memoryNum = parseInt(memory);
    if (isNaN(memoryNum) || memoryNum < 512) {
        showAlert('内存大小无效，必须是大于等于 512 的数字。', 'warning');
        return;
    }

    const ports = portsStr.split(',').map(p => p.trim()).filter(p => p);
    if (ports.some(p => isNaN(parseInt(p)) || parseInt(p) < 1 || parseInt(p) > 65535)) {
        showAlert('端口格式无效。请输入1-65535之间的数字，多个端口用英文逗号分隔。', 'warning');
        return;
    }

    const instance = instancesData.find(inst => inst.uuid === uuid);
    if (!instance) {
        showAlert('未找到实例数据，请刷新后重试。', 'error');
        closeConfigureInstanceModal();
        return;
    }
    const daemonId = instance.daemonId;

    saveBtn.disabled = true;
    saveBtn.textContent = '计算中...';

    try {
        // 1. 调用预更新接口进行计算
        const preUpdateResponse = await fetch(`${CONFIG.RENEWAL_API_URL}/api/instance/pre-update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                daemonId,
                uuid: uuid,
                memory: memoryNum,
                ports,
            })
        });

        const preUpdateResult = await preUpdateResponse.json();

        if (preUpdateResult.status !== 'success') {
            showAlert(`计算失败: ${preUpdateResult.error || '未知错误'}`, 'error');
            return;
        }

        const { action, cost, refund, isSufficient, currentUserPoints, owner } = preUpdateResult.data;
        let confirmationMessage = '';
        let proceed = false;

        // 2. 根据计算结果生成确认信息
        if (action === 'upgrade') {
            if (!isSufficient) {
                confirmationMessage = `积分不足！<br><br>
                    操作：升级配置<br>
                    需要：<strong style="color:#e74c3c;">${cost}</strong> 积分<br>
                    拥有：<strong>${currentUserPoints}</strong> 积分 (用户: ${owner})`;
                await showAlert(confirmationMessage, 'error', '余额不足');
            } else {
                confirmationMessage = `确认升级？<br><br>
                    操作：升级配置<br>
                    将消耗：<strong style="color:#e74c3c;">${cost}</strong> 积分<br>
                    当前积分：<strong>${currentUserPoints}</strong> (用户: ${owner})`;
                proceed = await showConfirm(confirmationMessage, '确认操作');
            }
        } else if (action === 'downgrade') {
            confirmationMessage = `确认降级？<br><br>
                操作：降级配置<br>
                将返还：<strong style="color:#2ecc71;">${refund}</strong> 积分 (税率10%)<br>
                当前积分：<strong>${currentUserPoints}</strong> (用户: ${owner})`;
            proceed = await showConfirm(confirmationMessage, '确认操作');
        } else { // action === 'none'
            confirmationMessage = '配置未发生变化，无需调整积分。是否仍要保存？';
            proceed = await showConfirm(confirmationMessage, '确认保存');
        }

        // 3. 如果用户确认，则执行实际更新
        if (proceed) {
            saveBtn.textContent = '保存中...';
            const updateResponse = await fetch(`${CONFIG.RENEWAL_API_URL}/api/instance/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    daemonId,
                    uuid: uuid,
                    memory: memoryNum,
                    ports,
                })
            });

            const updateResult = await updateResponse.json();

            if (updateResult.status === 'success') {
                closeConfigureInstanceModal();
                await showAlert('实例配置更新成功！', 'success', '操作成功');
                refreshInstances();
            } else {
                showAlert(`更新失败: ${updateResult.error || '未知错误'}`, 'error');
            }
        }
    } catch (error) {
        showAlert(`网络错误: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '确认调整';
    }
}

/**
 * 加载服务器状态页面
 */
async function loadStatusPage() {
    const container = document.getElementById('status-list');
    // 仅在第一次加载时显示“加载中”
    if (!container.querySelector('.status-card')) {
        container.innerHTML = '<p class="loading">加载中...</p>';
    }

    try {
        // Assuming a new API endpoint for server status
        const response = await fetch(`${CONFIG.RENEWAL_API_URL}/api/servers/status`);
        const result = await response.json();

        if (result.status === 'success' && result.data) {
            renderStatusList(result.data);
        } else {
            showError('status-list', result.error || '加载服务器状态失败');
        }
    } catch (error) {
        showError('status-list', '网络错误: ' + error.message);
    }
}

/**
 * 创建圆形进度条 SVG 的 HTML
 * @param {number} percentage - 百分比 (0-100)
 * @param {string} label - 中间显示的标签
 * @param {string} subLabel - 底部的小标签
 * @returns {string} SVG HTML 字符串
 */
function createCircularProgressBar(percentage, label, subLabel) {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    let strokeColor = '#2ecc71'; // 绿色
    if (percentage > 70) strokeColor = '#f39c12'; // 黄色
    if (percentage > 90) strokeColor = '#e74c3c'; // 红色

    return `
        <div class="progress-circle-container">
            <svg class="progress-ring" width="120" height="120">
                <circle class="progress-ring-bg" stroke="#e6e6e6" stroke-width="10" fill="transparent" r="${radius}" cx="60" cy="60"/>
                <circle class="progress-ring-fg"
                    stroke="${strokeColor}"
                    stroke-width="10"
                    fill="transparent"
                    r="${radius}"
                    cx="60"
                    cy="60"
                    style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};"
                />
            </svg>
            <div class="progress-text">
                <div class="progress-label">${label}</div>
                <div class="progress-sublabel">${subLabel}</div>
            </div>
        </div>
    `;
}


/**
 * 将字符串转换为安全的 DOM ID
 * @param {string} str 输入字符串
 * @returns {string} 清理后的字符串
 */
function sanitizeForId(str) {
    return str.replace(/[^a-zA-Z0-9-_]/g, '_');
}

/**
 * 更新圆形进度条的函数
 * @param {string} cardId - 卡片的ID
 * @param {string} type - 'cpu' 或 'mem'
 * @param {number} percentage - 新的百分比
 * @param {string} label - 新的主标签
 * @param {string} subLabel - 新的副标签
 */
function updateCircularProgressBar(cardId, type, percentage, label, subLabel) {
    const circleFg = document.querySelector(`#${cardId} .progress-ring-fg.${type}`);
    const labelEl = document.querySelector(`#${cardId} .progress-label.${type}`);
    const subLabelEl = document.querySelector(`#${cardId} .progress-sublabel.${type}`);

    if (!circleFg || !labelEl || !subLabelEl) return;

    const radius = parseFloat(circleFg.getAttribute('r'));
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    let strokeColor = '#2ecc71'; // 绿色
    if (percentage > 70) strokeColor = '#f39c12'; // 黄色
    if (percentage > 90) strokeColor = '#e74c3c'; // 红色

    circleFg.style.strokeDashoffset = offset;
    circleFg.setAttribute('stroke', strokeColor);
    labelEl.textContent = label;
    subLabelEl.textContent = subLabel;
}


/**
 * 渲染服务器状态列表（支持动态更新）
 */
function renderStatusList(servers) {
    const container = document.getElementById('status-list');
    const isFirstRender = container.children.length === 0 || !container.querySelector('.status-card');

    if (!servers || servers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📡</div>
                <p>暂无服务器状态信息</p>
            </div>
        `;
        return;
    }

    if (isFirstRender) {
        // 首次渲染：创建所有卡片
        const radius = 50;
        const circumference = 2 * Math.PI * radius;
        let html = '';
        servers.forEach(server => {
            const cardId = `status-card-${sanitizeForId(server.name)}`;
            const onlineStatus = server.online ? { text: '在线', class: 'running' } : { text: '离线', class: 'stopped' };
            
            // CPU
            const cpuPercentage = server.cpu ? Math.min(100, server.cpu) : 0;
            const cpuLabel = `${cpuPercentage.toFixed(1)}%`;
            
            // Memory
            const memPercentage = (server.memory && server.memory.total > 0) ? (server.memory.current / server.memory.total) * 100 : 0;
            const memLabel = `${memPercentage.toFixed(1)}%`;
            const memSubLabel = `${(server.memory.current / 1024 / 1024).toFixed(0)}/${(server.memory.total / 1024 / 1024).toFixed(0)}MB`;

            html += `
                <div class="status-card" id="${cardId}">
                    <div class="status-card-header">
                        <h3>${server.name}</h3>
                        <div class="instance-status">
                            <span class="status-dot ${onlineStatus.class}"></span>
                            <span class="status-text">${onlineStatus.text}</span>
                        </div>
                    </div>
                    <div class="status-card-body-grid">
                        <!-- CPU Progress Bar -->
                        <div class="progress-circle-container">
                            <svg class="progress-ring" width="120" height="120">
                                <circle class="progress-ring-bg" r="50" cx="60" cy="60"/>
                                <circle class="progress-ring-fg cpu" r="50" cx="60" cy="60" style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${circumference};"/>
                            </svg>
                            <div class="progress-text">
                                <div class="progress-label cpu">${cpuLabel}</div>
                                <div class="progress-sublabel cpu">CPU</div>
                            </div>
                        </div>
                        <!-- Memory Progress Bar -->
                        <div class="progress-circle-container">
                            <svg class="progress-ring" width="120" height="120">
                                <circle class="progress-ring-bg" r="50" cx="60" cy="60"/>
                                <circle class="progress-ring-fg mem" r="50" cx="60" cy="60" style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${circumference};"/>
                            </svg>
                            <div class="progress-text">
                                <div class="progress-label mem">${memLabel}</div>
                                <div class="progress-sublabel mem">${memSubLabel}</div>
                            </div>
                        </div>
                    </div>
                    <div class="status-card-footer">
                        <div class="status-item">
                            <span class="status-label">节点:</span>
                            <span class="status-value node-value">${server.node}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">实例:</span>
                            <span class="status-value instance-count-value">${server.instanceCount.running} / ${server.instanceCount.total}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    // 首次渲染和后续更新都执行
    servers.forEach(server => {
        const cardId = `status-card-${sanitizeForId(server.name)}`;
        const card = document.getElementById(cardId);
        if (!card) return;

        // 更新在线状态
        const onlineStatus = server.online ? { text: '在线', class: 'running' } : { text: '离线', class: 'stopped' };
        const statusDot = card.querySelector('.status-dot');
        const statusText = card.querySelector('.status-text');
        if (statusDot) statusDot.className = `status-dot ${onlineStatus.class}`;
        if (statusText) statusText.textContent = onlineStatus.text;

        // 更新 CPU
        const cpuPercentage = server.cpu ? Math.min(100, server.cpu) : 0;
        const cpuLabel = `${cpuPercentage.toFixed(1)}%`;
        updateCircularProgressBar(cardId, 'cpu', cpuPercentage, cpuLabel, 'CPU');

        // 更新 Memory
        const memPercentage = (server.memory && server.memory.total > 0) ? (server.memory.current / server.memory.total) * 100 : 0;
        const memLabel = `${memPercentage.toFixed(1)}%`;
        const memSubLabel = `${(server.memory.current / 1024 / 1024).toFixed(0)}/${(server.memory.total / 1024 / 1024).toFixed(0)}MB`;
        updateCircularProgressBar(cardId, 'mem', memPercentage, memLabel, memSubLabel);

        // 更新实例数
        const instanceCountEl = card.querySelector('.instance-count-value');
        if (instanceCountEl) instanceCountEl.textContent = `${server.instanceCount.running} / ${server.instanceCount.total}`;
    });
}


/**
 * 刷新服务器状态
 */
async function refreshServerStatus() {
    await loadStatusPage();
}

/**
 * 快速续费（按实例ID）- 调用搜索功能
 */
async function quickRenew() {
    // 调用搜索功能
    searchInstanceById();
}

/**
 * 生成验证码
 * @param {string} canvasId canvas元素ID
 * @returns {string} 验证码字符串
 */
function generateCaptcha(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return '';
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = 120;
    const height = canvas.height = 44;
    
    // 背景
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    // 生成随机验证码
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // 绘制验证码文字
    ctx.font = 'bold 28px Arial';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(15 + i * 26, height / 2);
        ctx.rotate((Math.random() - 0.5) * 0.4);
        
        // 随机颜色
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        
        ctx.fillText(code[i], 0, 0);
        ctx.restore();
    }
    
    // 添加干扰线
    for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},0.5)`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
    }
    
    // 添加干扰点
    for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},0.5)`;
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, 1, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    return code;
}

/**
 * 刷新登录验证码
 */
function refreshLoginCaptcha() {
    loginCaptchaCode = generateCaptcha('login-captcha-canvas');
    document.getElementById('login-captcha').value = '';
}

/**
 * 刷新注册验证码
 */
function refreshRegisterCaptcha() {
    registerCaptchaCode = generateCaptcha('reg-captcha-canvas');
    document.getElementById('reg-captcha').value = '';
}

// ============== 用户管理功能 ==============

// 用户积分数据
let usersPointsData = [];

/**
 * 加载用户管理页面
 */
async function loadUsersPage() {
    const container = document.getElementById('users-list');
    container.innerHTML = '<p class="loading">加载中...</p>';

    try {
        const response = await fetch(CONFIG.POINTS_API_URL + '/api/users/points');
        const result = await response.json();

        if (result.code === 0 && result.data) {
            usersPointsData = result.data.users || [];
            renderUsersList();
        } else {
            showError('users-list', result.msg || '加载失败');
        }
    } catch (error) {
        showError('users-list', '网络错误: ' + error.message);
    }
}

/**
 * 刷新用户列表
 */
async function refreshUsersList() {
    await loadUsersPage();
}

/**
 * 渲染用户列表
 */
function renderUsersList() {
    const container = document.getElementById('users-list');

    if (usersPointsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">👥</div>
                <p>暂无用户数据</p>
            </div>
        `;
        return;
    }

    container.innerHTML = createUsersTable(usersPointsData);
}

/**
 * 创建用户表格 HTML
 * @param {Array} users 用户数组
 * @returns {string} HTML 字符串
 */
function createUsersTable(users) {
    let html = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>用户名</th>
                    <th>当前积分</th>
                    <th>充值金额</th>
                    <th>获得积分</th>
                    <th>已消费</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    users.forEach(user => {
        const totalDeducted = user.totalDeducted || 0;
        const earnedPoints = user.earnedPoints || 0;
        
        html += `
            <tr>
                <td><strong>${user.username}</strong></td>
                <td style="color: #10b981; font-weight: 600;">${user.totalPoints || 0}</td>
                <td>¥${(user.totalAmount || 0).toFixed(2)}</td>
                <td>${earnedPoints}</td>
                <td style="color: #ef4444;">${totalDeducted}</td>
                <td>
                    <button class="action-btn renew" onclick="quickEditUser('${user.username}', ${user.totalPoints || 0})">
                        ✏️ 修改积分
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    return html;
}

/**
 * 快速编辑用户积分
 * @param {string} username 用户名
 * @param {number} currentPoints 当前积分
 */
function quickEditUser(username, currentPoints) {
    document.getElementById('edit-username').value = username;
    document.getElementById('edit-points').value = '';
    document.getElementById('edit-points').placeholder = `当前: ${currentPoints}`;
    document.getElementById('edit-action').value = 'set';
    document.getElementById('edit-reason').value = '';
    
    // 滚动到表单
    document.querySelector('.renew-form-card').scrollIntoView({ behavior: 'smooth' });
}

/**
 * 提交积分修改
 */
async function submitPointsEdit() {
    const username = document.getElementById('edit-username').value.trim();
    const points = document.getElementById('edit-points').value;
    const action = document.getElementById('edit-action').value;
    const reason = document.getElementById('edit-reason').value.trim();
    const resultDiv = document.getElementById('edit-result');

    // 验证
    if (!username) {
        showEditResult('请输入用户名', false);
        return;
    }

    if (!points || isNaN(parseInt(points))) {
        showEditResult('请输入有效的积分数量', false);
        return;
    }

    const pointsNum = parseInt(points);
    if (pointsNum < 0) {
        showEditResult('积分不能为负数', false);
        return;
    }

    try {
        let url, method, body;

        if (action === 'set') {
            // 设置积分
            url = CONFIG.POINTS_API_URL + '/api/points/set';
            method = 'POST';
            body = JSON.stringify({
                username: username,
                points: pointsNum,
                reason: reason || '管理员设置积分'
            });
        } else if (action === 'add') {
            // 增加积分
            url = `${CONFIG.POINTS_API_URL}/api/points/add?username=${encodeURIComponent(username)}&points=${pointsNum}&reason=${encodeURIComponent(reason || '管理员增加积分')}`;
            method = 'GET';
        } else if (action === 'deduct') {
            // 扣减积分
            url = `${CONFIG.POINTS_API_URL}/api/points/deduct?username=${encodeURIComponent(username)}&points=${pointsNum}&reason=${encodeURIComponent(reason || '管理员扣减积分')}`;
            method = 'GET';
        }

        const options = { method };
        if (method === 'POST') {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = body;
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (result.code === 0) {
            const actionText = action === 'set' ? '设置' : (action === 'add' ? '增加' : '扣减');
            showEditResult(`${actionText}成功！用户 ${username} 当前积分: ${result.data.currentPoints}`, true);
            
            // 刷新用户列表
            await refreshUsersList();
            
            // 清空表单
            document.getElementById('edit-username').value = '';
            document.getElementById('edit-points').value = '';
            document.getElementById('edit-reason').value = '';
        } else {
            showEditResult(result.msg || '操作失败', false);
        }
    } catch (error) {
        showEditResult('网络错误: ' + error.message, false);
    }
}

/**
 * 显示编辑结果
 * @param {string} message 消息
 * @param {boolean} success 是否成功
 */
function showEditResult(message, success) {
    const resultDiv = document.getElementById('edit-result');
    resultDiv.textContent = message;
    resultDiv.className = 'renew-result ' + (success ? 'success' : 'error');
    resultDiv.style.display = 'block';
    
    // 3秒后自动隐藏成功消息
    if (success) {
        setTimeout(() => {
            resultDiv.style.display = 'none';
        }, 3000);
    }
}

// ============== 兑换码功能 ==============

let currentRedeemCode = null; // 当前查询的兑换码信息

/**
 * 查询兑换码
 */
async function checkRedeemCode() {
    const codeInput = document.getElementById('redeem-code');
    const code = codeInput.value.trim().toUpperCase();
    const infoDiv = document.getElementById('redeem-info');
    const resultDiv = document.getElementById('redeem-result');
    const submitBtn = document.getElementById('redeem-submit-btn');
    
    // 重置状态
    infoDiv.style.display = 'none';
    resultDiv.style.display = 'none';
    submitBtn.disabled = true;
    currentRedeemCode = null;
    
    if (!code) {
        showRedeemResult('请输入兑换码', false);
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.POINTS_API_URL}/api/coupon/check?code=${encodeURIComponent(code)}`);
        const result = await response.json();
        
        if (result.code === 0 && result.data) {
            const coupon = result.data;
            currentRedeemCode = coupon;
            
            // 检查是否可用
            const now = new Date();
            const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < now;
            const isFullyUsed = coupon.maxUses && coupon.usedCount >= coupon.maxUses;
            const isDisabled = coupon.status === 'disabled';
            
            const typeText = coupon.type === 'points' ? '积分' : '续费天数';
            const valueText = coupon.type === 'points' ? `${coupon.value} 积分` : `${coupon.value} 天`;
            const usageText = coupon.maxUses ? `${coupon.usedCount}/${coupon.maxUses}` : `${coupon.usedCount}/无限`;
            const expiresText = coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleString('zh-CN') : '永不过期';
            
            let statusHtml = '';
            let canRedeem = false;
            
            if (isDisabled) {
                statusHtml = '<span style="color:#ef4444;font-weight:600;">❌ 此兑换码已被禁用</span>';
            } else if (isExpired) {
                statusHtml = '<span style="color:#f59e0b;font-weight:600;">⏰ 此兑换码已过期</span>';
            } else if (isFullyUsed) {
                statusHtml = '<span style="color:#6b7280;font-weight:600;">📦 此兑换码已用完</span>';
            } else {
                statusHtml = '<span style="color:#10b981;font-weight:600;">✅ 此兑换码可用</span>';
                canRedeem = true;
            }
            
            infoDiv.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
                    <div><strong>兑换类型：</strong>${typeText}</div>
                    <div><strong>兑换数值：</strong>${valueText}</div>
                    <div><strong>使用次数：</strong>${usageText}</div>
                    <div><strong>过期时间：</strong>${expiresText}</div>
                </div>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;">
                    ${statusHtml}
                </div>
            `;
            infoDiv.style.display = 'block';
            
            if (canRedeem) {
                submitBtn.disabled = false;
            }
        } else {
            showRedeemResult(result.msg || '兑换码不存在或无效', false);
        }
    } catch (error) {
        showRedeemResult('网络错误: ' + error.message, false);
    }
}

/**
 * 提交兑换
 */
async function submitRedeem() {
    const codeInput = document.getElementById('redeem-code');
    const code = codeInput.value.trim().toUpperCase();
    const submitBtn = document.getElementById('redeem-submit-btn');
    
    if (!code || !currentRedeemCode) {
        showRedeemResult('请先查询兑换码', false);
        return;
    }
    
    if (!currentUser || !currentUser.username) {
        showRedeemResult('请先登录', false);
        return;
    }
    
    // 确认兑换
    const typeText = currentRedeemCode.type === 'points' ? '积分' : '续费天数';
    const valueText = currentRedeemCode.type === 'points' ? `${currentRedeemCode.value} 积分` : `${currentRedeemCode.value} 天`;
    
    const confirmed = await showConfirm(`兑换码: ${code}\n类型: ${typeText}\n数值: ${valueText}\n\n点击"确定"将立即兑换`, '确认兑换');
    if (!confirmed) {
        return;
    }
    
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${CONFIG.POINTS_API_URL}/api/coupon/redeem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code,
                username: currentUser.username
            })
        });
        const result = await response.json();
        
        if (result.code === 0) {
            const data = result.data;
            let successMsg = '';
            
            if (data.type === 'points') {
                successMsg = `获得积分: ${data.value}\n当前积分: ${data.newBalance || '-'}`;
            } else {
                successMsg = `获得续费天数: ${data.value} 天`;
            }
            
            await showAlert(successMsg, 'success', '兑换成功');
            showRedeemResult('兑换成功！', true);
            
            // 清空表单
            codeInput.value = '';
            document.getElementById('redeem-info').style.display = 'none';
            currentRedeemCode = null;
            
            // 刷新兑换记录
            loadRedeemHistory();
        } else {
            showRedeemResult(result.msg || '兑换失败', false);
            submitBtn.disabled = false;
        }
    } catch (error) {
        showRedeemResult('网络错误: ' + error.message, false);
        submitBtn.disabled = false;
    }
}

/**
 * 显示兑换结果
 */
function showRedeemResult(message, success) {
    const resultDiv = document.getElementById('redeem-result');
    resultDiv.textContent = message;
    resultDiv.className = 'renew-result ' + (success ? 'success' : 'error');
    resultDiv.style.display = 'block';
    
    if (success) {
        setTimeout(() => {
            resultDiv.style.display = 'none';
        }, 3000);
    }
}

/**
 * 加载兑换记录
 */
async function loadRedeemHistory() {
    const container = document.getElementById('redeem-history');
    
    if (!currentUser || !currentUser.username) {
        container.innerHTML = '<p style="color:#888;text-align:center;">请先登录查看兑换记录</p>';
        return;
    }
    
    container.innerHTML = '<p class="loading">加载中...</p>';
    
    // 注意：当前后端API没有提供用户兑换记录查询接口
    // 这里显示一个提示信息
    container.innerHTML = `
        <div style="text-align:center;padding:20px;color:#888;">
            <p>暂无兑换记录</p>
            <p style="font-size:0.85rem;margin-top:8px;">成功兑换后，积分将直接添加到您的账户</p>
        </div>
    `;
}

/**
 * 加载兑换页面
 */
function loadRedeemPage() {
    // 清空表单
    document.getElementById('redeem-code').value = '';
    document.getElementById('redeem-info').style.display = 'none';
    document.getElementById('redeem-result').style.display = 'none';
    document.getElementById('redeem-submit-btn').disabled = true;
    currentRedeemCode = null;
    
    // 加载兑换记录
    loadRedeemHistory();
}

// ============== 图片提示弹窗功能 ==============

/**
 * 显示支付提示图片弹窗
 */
function showPaymentTip() {
    const overlay = document.getElementById('image-modal-overlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

/**
 * 关闭图片弹窗
 * @param {Event} event 点击事件（可选）
 */
function closeImageModal(event) {
    // 如果点击的是遮罩层本身（而不是弹窗内容），则关闭
    if (event && event.target !== event.currentTarget) {
        return;
    }
    const overlay = document.getElementById('image-modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// ============== 创建服务器功能 ==============

let serverPlansData = {}; // 套餐数据
let selectedPlanId = null; // 选中的套餐ID
let daemonsData = []; // 节点数据
let dockerImagesData = []; // Docker镜像数据（Java版本）
let currentCustomPrice = 0; // 新增：用于存储当前自定义套餐的价格
let priceUpdateTimeout = null; // 新增：用于价格计算的防抖定时器

/**
 * 加载创建服务器页面
 */
async function loadCreateServerPage() {
    // 显示5秒提示弹窗
    showPurchaseReminder();
    
    // 加载用户积分
    await loadServerUserPoints();
    
    // 加载套餐列表
    await loadServerPlans();
    
    // 加载节点列表
    await loadServerDaemons();
    
    // 加载 Docker 镜像列表（Java 版本）
    await loadDockerImages();
    
    // 加载我的服务器列表
    await loadMyServers();

    // 为自定义配置输入框绑定价格更新事件
    const customInputs = ['custom-memory', 'custom-cpu', 'custom-disk', 'custom-ports'];
    customInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                // 使用防抖，避免过于频繁的API请求
                clearTimeout(priceUpdateTimeout);
                priceUpdateTimeout = setTimeout(updateCustomPrice, 300);
            });
        }
    });

    // 页面加载时，如果自定义套餐默认显示，则计算一次初始价格
    if (document.getElementById('custom-options-card')?.style.display === 'block') {
        updateCustomPrice();
    }
}

/**
 * 更新自定义套餐价格（调用后端API）
 */
async function updateCustomPrice() {
    const priceDisplay = document.getElementById('custom-plan-price-display');
    if (!priceDisplay) return;

    priceDisplay.textContent = '计算中...';

    // 收集表单数据
    const customConfig = {
        memory: document.getElementById('custom-memory')?.value || '1024',
        cpu: document.getElementById('custom-cpu')?.value || '1',
        disk: document.getElementById('custom-disk')?.value || '10',
        ports: document.getElementById('custom-ports')?.value || '1'
    };

    try {
        const url = CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.SERVER_CALCULATE_PRICE;
        console.log('Fetching price from URL:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customConfig)
        });
        console.log('Price API response status:', response.status);
        const result = await response.json();
        console.log('Price API response data:', result);

        if (result.code === 0) {
            currentCustomPrice = result.data.points;
            priceDisplay.textContent = `${currentCustomPrice} 积分`;
            console.log('价格更新成功:', currentCustomPrice);
        } else {
            priceDisplay.textContent = '计算失败';
            console.error('价格计算失败:', result.msg);
        }
    } catch (error) {
        priceDisplay.textContent = '计算失败';
        console.error('价格计算API请求失败:', error);
    }
}

/**
 * 显示购买提醒弹窗（5秒后自动关闭）
 */
function showPurchaseReminder() {
    // 创建弹窗元素
    const overlay = document.createElement('div');
    overlay.id = 'purchase-reminder-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 30px 40px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
        <h3 style="margin: 0 0 15px 0; color: #333; font-size: 1.3rem;">重要提示</h3>
        <p style="color: #666; margin: 0 0 20px 0; line-height: 1.6; font-size: 1rem;">
            如果你完成购买就必须重新登录
        </p>
        <div style="color: #999; font-size: 0.9rem;">
            <span id="purchase-reminder-countdown">5</span> 秒后自动关闭
        </div>
        <button onclick="closePurchaseReminder()" style="
            margin-top: 15px;
            padding: 8px 24px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.95rem;
        ">我知道了</button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // 添加动画样式
    const style = document.createElement('style');
    style.id = 'purchase-reminder-style';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // 倒计时
    let countdown = 5;
    const countdownEl = document.getElementById('purchase-reminder-countdown');
    const timer = setInterval(() => {
        countdown--;
        if (countdownEl) {
            countdownEl.textContent = countdown;
        }
        if (countdown <= 0) {
            clearInterval(timer);
            closePurchaseReminder();
        }
    }, 1000);
    
    // 保存定时器引用以便手动关闭时清除
    overlay.dataset.timer = timer;
}

/**
 * 关闭购买提醒弹窗
 */
function closePurchaseReminder() {
    const overlay = document.getElementById('purchase-reminder-overlay');
    if (overlay) {
        // 清除定时器
        if (overlay.dataset.timer) {
            clearInterval(parseInt(overlay.dataset.timer));
        }
        overlay.remove();
    }
    
    // 移除样式
    const style = document.getElementById('purchase-reminder-style');
    if (style) {
        style.remove();
    }
}

/**
 * 刷新服务器页面
 */
async function refreshServerPage() {
    await loadCreateServerPage();
}

/**
 * 加载用户积分
 */
async function loadServerUserPoints() {
    const pointsEl = document.getElementById('server-user-points');
    if (!pointsEl) return;
    
    if (!currentUser || !currentUser.username) {
        pointsEl.textContent = '0';
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.POINTS_API_URL}/api/users/points?username=${encodeURIComponent(currentUser.username)}`);
        const result = await response.json();
        
        if ((result.code === 0 || result.status === 'success') && result.data) {
            let userBalance = 0;
            if (result.data.users && Array.isArray(result.data.users)) {
                const userData = result.data.users.find(u => u.username === currentUser.username);
                if (userData) {
                    userBalance = userData.totalPoints || userData.points || 0;
                }
            } else {
                userBalance = result.data.totalPoints || result.data.points || 0;
            }
            pointsEl.textContent = userBalance;
        }
    } catch (error) {
        console.error('获取积分失败:', error);
        pointsEl.textContent = '0';
    }
}

/**
 * 加载套餐列表
 */
async function loadServerPlans() {
    const container = document.getElementById('server-plans-grid');
    if (!container) return;

    // 不再从API加载套餐，直接渲染自定义选项
    renderServerPlans();
}

/**
 * 渲染套餐列表
 */
function renderServerPlans() {
    const container = document.getElementById('server-plans-grid');
    if (!container) return;

    // 只保留自定义选项
    const html = `
        <div class="plan-card custom-plan" data-plan-id="custom" onclick="selectPlan('custom')" style="border:2px dashed #667eea;background:linear-gradient(135deg, #f5f7ff 0%, #e8ecff 100%);">
            <div class="plan-header">
                <div class="plan-name">⚙️ 自定义配置</div>
                <div class="plan-price" style="font-size:1rem;">按需计费</div>
                <div class="plan-duration">灵活配置</div>
            </div>
            <div class="plan-specs">
                <div class="spec-item">
                    <span class="spec-label">CPU</span>
                    <span class="spec-value">自选</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">内存</span>
                    <span class="spec-value">自选</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">存储</span>
                    <span class="spec-value">自选</span>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // 默认选中自定义套餐
    selectPlan('custom');
}

/**
 * 选择套餐
 */
function selectPlan(planId) {
    // 忽略空白套餐的点击
    if (!planId || planId === '') {
        return;
    }
    
    selectedPlanId = planId;
    
    // 更新选中状态
    document.querySelectorAll('.plan-card').forEach(card => {
        card.classList.remove('selected');
    });
    const selectedCard = document.querySelector(`.plan-card[data-plan-id="${planId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // 更新显示
    const displayEl = document.getElementById('selected-plan-display');
    const customOptionsCard = document.getElementById('custom-options-card');
    
    if (planId === 'custom') {
        // 选择自定义套餐
        if (displayEl) {
            displayEl.innerHTML = `<strong>⚙️ 自定义配置</strong> - 按需计费`;
            displayEl.style.color = '#667eea';
        }
        // 显示自定义配置区域
        if (customOptionsCard) {
            customOptionsCard.style.display = 'block';
            // 滚动到自定义配置区域
            setTimeout(() => {
                customOptionsCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
        // 启用创建按钮（自定义模式）
        const createBtn = document.getElementById('create-server-btn');
        if (createBtn) {
            createBtn.disabled = false;
        }
        // 首次选择自定义时，计算价格
        updateCustomPrice();
    } else {
        // 选择普通套餐
        const plan = serverPlansData[planId];
        if (displayEl) {
            if (plan) {
                displayEl.innerHTML = `<strong>${plan.name}</strong> - ${plan.points} 积分`;
                displayEl.style.color = '#333';
            } else {
                displayEl.innerHTML = '套餐信息加载中...';
                displayEl.style.color = '#999';
            }
        }
        // 隐藏自定义配置区域
        if (customOptionsCard) {
            customOptionsCard.style.display = 'none';
        }
        // 启用创建按钮（仅当套餐有效时）
        const createBtn = document.getElementById('create-server-btn');
        if (createBtn) {
            createBtn.disabled = !plan;
        }
    }
}

/**
 * 加载节点列表
 */
async function loadServerDaemons() {
    const select = document.getElementById('server-daemon');
    if (!select) return;
    
    try {
        const response = await fetch(CONFIG.ENDPOINTS.SERVER_DAEMONS);
        const result = await response.json();
        
        if (result.code === 0 && result.data && result.data.daemons) {
            daemonsData = result.data.daemons;
            
            // 清空并重新填充选项
            select.innerHTML = '<option value="">自动选择</option>';
            daemonsData.forEach(daemon => {
                const option = document.createElement('option');
                option.value = daemon.uuid;
                option.textContent = daemon.remarks || daemon.ip || daemon.uuid;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载节点失败:', error);
    }
}

/**
 * 加载 Docker 镜像列表（Java 版本选择）
 */
async function loadDockerImages() {
    const select = document.getElementById('server-java-version');
    if (!select) return;
    
    select.innerHTML = '<option value="">加载中...</option>';
    
    try {
        const response = await fetch(CONFIG.ENDPOINTS.SERVER_IMAGES);
        const result = await response.json();
        
        if (result.code === 0 && result.data && result.data.images) {
            dockerImagesData = result.data.images;
            const defaultImageId = result.data.defaultImage || '';
            
            // 清空并重新填充选项
            select.innerHTML = '';
            dockerImagesData.forEach(image => {
                const option = document.createElement('option');
                option.value = image.id;
                option.textContent = image.name;
                if (image.description) {
                    option.title = image.description;
                }
                // 设置默认选中
                if (image.id === defaultImageId) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            // 如果没有默认选中，选择第一个
            if (select.selectedIndex === -1 && dockerImagesData.length > 0) {
                select.selectedIndex = 0;
            }
        } else {
            select.innerHTML = '<option value="">加载失败</option>';
            console.error('加载镜像失败:', result.msg);
        }
    } catch (error) {
        select.innerHTML = '<option value="">加载失败</option>';
        console.error('加载镜像失败:', error);
    }
}

/**
 * 提交创建服务器
 */
async function submitCreateServer() {
    const serverName = document.getElementById('server-name').value.trim();
    const daemonId = document.getElementById('server-daemon').value;
    const imageId = document.getElementById('server-java-version').value;
    const resultDiv = document.getElementById('create-server-result');
    
    // 验证
    if (!currentUser || !currentUser.username) {
        showCreateServerResult('请先登录', false);
        return;
    }
    
    if (!selectedPlanId) {
        showCreateServerResult('请选择套餐', false);
        return;
    }
    
    if (!serverName) {
        showCreateServerResult('请输入服务器名称', false);
        return;
    }
    
    // 获取选中的 Java 版本名称
    const javaVersionSelect = document.getElementById('server-java-version');
    const javaVersionName = javaVersionSelect.options[javaVersionSelect.selectedIndex]?.text || 'Java 17';
    
    let planName = '';
    let planPoints = 0;
    let requestBody = {
        username: currentUser.username,
        planId: selectedPlanId,
        serverName: serverName,
        daemonId: daemonId || undefined,
        imageId: imageId || undefined
    };
    
    // 处理自定义套餐
    if (selectedPlanId === 'custom') {
        // 获取自定义配置
        const customMemory = document.getElementById('custom-memory')?.value || '2048';
        const customCpu = document.getElementById('custom-cpu')?.value || '100';
        const customDisk = document.getElementById('custom-disk')?.value || '10';
        const customPorts = document.getElementById('custom-ports')?.value || '25565';

        planPoints = currentCustomPrice; // 直接使用从后端获取的价格
        planName = '自定义配置';

        // 添加自定义配置到请求
        requestBody.customConfig = {
            memory: parseInt(customMemory),
            cpu: parseInt(customCpu),
            disk: parseInt(customDisk),
            ports: customPorts
        };
    } else {
        // 普通套餐
        const plan = serverPlansData[selectedPlanId];
        if (!plan) {
            showCreateServerResult('套餐信息错误', false);
            return;
        }
        planName = plan.name;
        planPoints = plan.points;
    }
    
    // 如果是自定义套餐，在确认前刷新价格
    if (selectedPlanId === 'custom') {
        await updateCustomPrice();
        planPoints = currentCustomPrice;
        console.log('确认前的价格:', planPoints);
    }

    // 确认创建
    const confirmed = await showConfirm(
        `套餐: ${planName}\n消耗积分: ${planPoints}\n服务器名称: ${serverName}\nJava 版本: ${javaVersionName}\n\n确定要创建服务器吗？`,
        '确认创建'
    );
    
    if (!confirmed) return;
    
    // 禁用按钮
    const createBtn = document.getElementById('create-server-btn');
    if (createBtn) {
        createBtn.disabled = true;
        createBtn.textContent = '创建中...';
    }
    
    try {
        const response = await fetch(CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.SERVER_CREATE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (result.code === 0) {
            await showAlert(
                `服务器创建成功！\n\n服务器名称: ${serverName}\n套餐: ${planName}\n消耗积分: ${planPoints}`,
                'success',
                '创建成功'
            );
            
            // 清空表单
            document.getElementById('server-name').value = '';
            selectedPlanId = null;
            document.querySelectorAll('.plan-card').forEach(card => card.classList.remove('selected'));
            document.getElementById('selected-plan-display').innerHTML = '请先选择套餐';
            document.getElementById('selected-plan-display').style.color = '#666';
            
            // 隐藏自定义配置区域
            const customOptionsCard = document.getElementById('custom-options-card');
            if (customOptionsCard) {
                customOptionsCard.style.display = 'none';
            }
            
            // 刷新页面数据
            await loadServerUserPoints();
            await loadMyServers();
            
            showCreateServerResult('服务器创建成功！', true);
        } else {
            showCreateServerResult(result.msg || '创建失败', false);
        }
    } catch (error) {
        showCreateServerResult('网络错误: ' + error.message, false);
    } finally {
        if (createBtn) {
            createBtn.disabled = false;
            createBtn.textContent = '🎮 创建服务器';
        }
    }
}

/**
 * 显示创建结果
 */
function showCreateServerResult(message, success) {
    const resultDiv = document.getElementById('create-server-result');
    if (!resultDiv) return;
    
    resultDiv.textContent = message;
    resultDiv.className = 'renew-result ' + (success ? 'success' : 'error');
    resultDiv.style.display = 'block';
    
    if (success) {
        setTimeout(() => {
            resultDiv.style.display = 'none';
        }, 3000);
    }
}

/**
 * 加载我的服务器列表
 */
async function loadMyServers() {
    const container = document.getElementById('my-servers-list');
    if (!container) return;
    
    if (!currentUser || !currentUser.username) {
        container.innerHTML = '<div class="empty-servers"><div class="icon">🔒</div><p>请先登录</p></div>';
        return;
    }
    
    container.innerHTML = '<p class="loading">加载中...</p>';
    
    try {
        const response = await fetch(`${CONFIG.ENDPOINTS.SERVER_LIST}?username=${encodeURIComponent(currentUser.username)}`);
        const result = await response.json();
        
        if (result.code === 0 && result.data && result.data.servers) {
            const servers = result.data.servers;
            
            if (servers.length === 0) {
                container.innerHTML = `
                    <div class="empty-servers">
                        <div class="icon">🖥️</div>
                        <p>您还没有服务器</p>
                        <p class="hint">选择上方套餐，使用积分创建您的第一台服务器</p>
                    </div>
                `;return;
            }
            
            let html = '';
            servers.forEach(server => {
                const expireInfo = getServerExpireInfo(server.expiresAt);
                const planName = server.planName || server.planId || '未知';
                
                html += `
                    <div class="my-server-item">
                        <div class="server-info-main">
                            <h4>${server.serverName || '未命名服务器'}</h4>
                            <p>创建于 ${formatDate(server.createdAt)}</p>
                        </div>
                        <div class="server-meta">
                            <span class="server-plan-badge ${server.planId || 'basic'}">${planName}</span>
                            <span class="server-expire ${expireInfo.class}">${expireInfo.text}</span>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="empty-servers">
                    <div class="icon">🖥️</div>
                    <p>您还没有服务器</p>
                    <p class="hint">选择上方套餐，使用积分创建您的第一台服务器</p>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = `<div class="empty-servers"><div class="icon">❌</div><p>加载失败: ${error.message}</p></div>`;
    }
}

/**
 * 获取服务器到期信息
 */
function getServerExpireInfo(expiresAt) {
    if (!expiresAt) {
        return { text: '永久', class: '' };
    }
    
    const now = Date.now();
    const expireTime = new Date(expiresAt).getTime();
    const diffDays = Math.ceil((expireTime - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { text: '已过期', class: 'expired' };
    } else if (diffDays <= 7) {
        return { text: `${diffDays}天后到期`, class: 'expiring-soon' };
    } else {
        return { text: `${diffDays}天后到期`, class: '' };
    }
}

/**
 * 格式化日期
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
}

/**
 * 加载并显示公告
 */
async function loadAnnouncement() {
    const announcementBox = document.getElementById('announcement-box');
    const announcementContent = document.getElementById('announcement-content');
    if (!announcementBox || !announcementContent) return;

    try {
        const response = await fetch('/api/announcement');
        const result = await response.json();
        if (result.code === 0 && result.data && result.data.content) {
            // 确保 marked 库已加载
            if (window.marked) {
                announcementContent.innerHTML = window.marked.parse(result.data.content);
            } else {
                // 如果 marked 未加载，直接显示原始内容
                announcementContent.textContent = result.data.content;
                console.error('marked.js not loaded');
            }
            announcementBox.style.display = 'block';
        } else {
            announcementBox.style.display = 'none';
        }
    } catch (error) {
        console.error('加载公告失败:', error);
        announcementBox.style.display = 'none';
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化自定义弹窗
    Modal.init();
    
    initApp();
    // 初始化验证码
    refreshLoginCaptcha();
    refreshRegisterCaptcha();
});

// 页面卸载时清理
window.addEventListener('beforeunload', stopAutoRefresh);

// 页面完全加载后隐藏加载动画
window.addEventListener('load', () => {
    const loader = document.getElementById('loader-wrapper');
    if (loader) {
        // 添加 'hidden' 类来触发淡出效果
        loader.classList.add('hidden');
    }
});
