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

        // 移除可能存在的 closing 类
        this.overlay.classList.remove('closing');
        // 添加 active 类触发动画
        requestAnimationFrame(() => {
            this.overlay.classList.add('active');
        });

        // 聚焦
        if (showInput) {
            setTimeout(() => this.inputEl.focus(), 150);
        } else {
            setTimeout(() => this.confirmBtn.focus(), 150);
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
        // 添加关闭动画
        this.overlay.classList.add('closing');
        
        // 等待动画完成后移除 active 类和 closing 类
        setTimeout(() => {
            this.overlay.classList.remove('active');
            this.overlay.classList.remove('closing');
        }, 300);
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
let loginCaptchaId = ''; // 登录验证码ID
let registerCaptchaId = ''; // 注册验证码ID
let loginCaptchaTimer = null; // 登录验证码计时器
let registerCaptchaTimer = null; // 注册验证码计时器

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

    // 初始化主题
    initTheme();

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

    // 监听 hash 变化（支持浏览器前进/后退按钮）
    window.addEventListener('hashchange', handleHashChange);
}

/**
 * 初始化主题
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

/**
 * 切换主题
 */
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // 添加切换动画效果
    const btn = document.querySelector('.theme-toggle-btn');
    btn.style.transform = 'rotate(360deg) scale(1.2)';
    setTimeout(() => {
        btn.style.transform = '';
    }, 300);
}

/**
 * 处理 URL hash 变化
 */
function handleHashChange() {
    // 只有在已登录状态下才处理 hash 变化
    if (!currentUser) {
        return;
    }

    const hash = window.location.hash.slice(2); // 去掉 '#/'
    const pageName = hash || 'dashboard';
    
    // 使用 updateHash=false 避免循环触发
    navigateTo(pageName, false);
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
    
    // 根据 URL hash 导航到对应页面，如果没有 hash 则显示 dashboard
    const hash = window.location.hash.slice(2); // 去掉 '#/'
    const initialPage = hash || 'dashboard';
    
    // 使用 updateHash=false 避免重复设置 hash
    navigateTo(initialPage, false);
    
    // 如果没有 hash，设置默认 hash
    if (!hash) {
        window.location.hash = '#/dashboard';
    }
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
    const captchaText = document.getElementById('login-captcha').value.trim(); // 不再转大写

    if (!username) {
        showLoginError('请输入用户名');
        return;
    }

    if (!password) {
        showLoginError('请输入密码');
        return;
    }

    if (!captchaText) {
        showLoginError('请输入验证码');
        return;
    }

    if (!loginCaptchaId) {
        showLoginError('请刷新验证码');
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
            body: JSON.stringify({ username, password, captchaText, captchaId: loginCaptchaId })
        });

        const data = await response.json();

        if (data.status === 'success') {
            currentUser = data.data;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showApp();
        } else {
            showLoginError(data.error || '登录失败');
            refreshLoginCaptcha(); // 登录失败时刷新验证码
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
    const captchaText = document.getElementById('reg-captcha').value.trim(); // 不再转大写

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

    if (!captchaText) {
        showRegisterError('请输入验证码');
        return;
    }

    if (!registerCaptchaId) {
        showRegisterError('请刷新验证码');
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
            body: JSON.stringify({ username, password, email, captchaText, captchaId: registerCaptchaId })
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
            refreshRegisterCaptcha(); // 注册失败时刷新验证码
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
 * QQ绑定相关功能
 */
let qqBindingModal = null;
let qqVerifyTimer = null;
let qqCheckInterval = null;

// 初始化QQ绑定状态
async function initQQBindingStatus() {
    if (!currentUser || !currentUser.username) return;
    
    try {
        const response = await fetch(`/api/qq/check-binding?username=${encodeURIComponent(currentUser.username)}`);
        const result = await response.json();
        
        if (result.code === 0 && result.data.bound) {
            updateQQButtonStatus(true, result.data.qqNumber);
        } else {
            updateQQButtonStatus(false);
        }
    } catch (error) {
        console.error('检查QQ绑定状态失败:', error);
    }
}

// 更新QQ按钮状态
function updateQQButtonStatus(bound, qqNumber = '') {
    const btn = document.getElementById('qq-bind-btn');
    const text = document.getElementById('qq-bind-text');
    
    if (bound) {
        btn.classList.add('bound');
        text.textContent = '已绑定';
        btn.title = `已绑定QQ: ${qqNumber}`;
    } else {
        btn.classList.remove('bound');
        text.textContent = '绑定QQ';
        btn.title = '绑定QQ';
    }
}

// 处理QQ绑定
async function handleQQBinding() {
    if (!currentUser || !currentUser.username) {
        showAlert('请先登录', 'error');
        return;
    }
    
    // 检查当前绑定状态
    try {
        const response = await fetch(`/api/qq/check-binding?username=${encodeURIComponent(currentUser.username)}`);
        const result = await response.json();
        
        if (result.code === 0 && result.data.bound) {
            // 已绑定,显示解绑选项
            showQQUnbindModal(result.data.qqNumber, result.data.bindTime);
        } else {
            // 未绑定,显示绑定流程
            showQQBindModal();
        }
    } catch (error) {
        console.error('检查QQ绑定状态失败:', error);
        showAlert('检查绑定状态失败', 'error');
    }
}

// 显示QQ绑定弹窗
async function showQQBindModal() {
    // 生成验证码
    try {
        const response = await fetch('/api/qq/generate-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username })
        });
        
        const result = await response.json();
        
        if (result.code !== 0) {
            showAlert(result.msg || '生成验证码失败', 'error');
            return;
        }
        
        const { verifyCode, expireSeconds } = result.data;
        
        // 创建弹窗
        const modalHTML = `
            <div id="qq-binding-modal" class="qq-modal">
                <div class="qq-modal-content">
                    <div class="qq-modal-header">
                        <h2>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" style="color: #12b7f5;">
                                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM4.5 7.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z"/>
                            </svg>
                            绑定QQ账号
                        </h2>
                        <span class="qq-modal-close" onclick="closeQQModal()">&times;</span>
                    </div>
                    <div class="qq-modal-body">
                        <div class="qq-instructions">
                            <p style="font-weight: 600; margin-bottom: 10px;">📱 绑定步骤：</p>
                            <ol>
                                <li>复制下方验证码</li>
                                <li>在指定的QQ群中发送验证码</li>
                                <li>等待系统自动验证（约2-5秒）</li>
                            </ol>
                        </div>
                        <div class="qq-verify-code" id="qq-verify-code">${verifyCode}</div>
                        <div style="text-align: center; margin: 15px 0;">
                            <button class="btn btn-primary" onclick="copyVerifyCode('${verifyCode}')">
                                📋 复制验证码
                            </button>
                        </div>
                        <div class="qq-timer" id="qq-timer">
                            ⏱️ 验证码有效期: <span id="qq-countdown">${expireSeconds}</span> 秒
                        </div>
                        <div id="qq-status" style="text-align: center; color: #666; margin-top: 15px;">
                            等待验证中...
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML;
        document.body.appendChild(tempDiv.firstElementChild);
        
        qqBindingModal = document.getElementById('qq-binding-modal');
        qqBindingModal.style.display = 'block';
        
        // 启动倒计时
        startQQTimer(expireSeconds, verifyCode);
        
        // 启动验证检查
        startQQVerifyCheck(verifyCode);
        
    } catch (error) {
        console.error('显示QQ绑定弹窗失败:', error);
        showAlert('显示绑定弹窗失败', 'error');
    }
}

// 显示解绑弹窗
async function showQQUnbindModal(qqNumber, bindTime) {
    const confirmed = await showConfirm(
        `当前已绑定QQ: ${qqNumber}\n绑定时间: ${new Date(bindTime).toLocaleString()}\n\n确定要解绑吗？`,
        '解绑QQ'
    );
    
    if (confirmed) {
        try {
            const response = await fetch('/api/qq/unbind', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser.username })
            });
            
            const result = await response.json();
            
            if (result.code === 0) {
                showAlert('解绑成功', 'success');
                updateQQButtonStatus(false);
            } else {
                showAlert(result.msg || '解绑失败', 'error');
            }
        } catch (error) {
            console.error('解绑QQ失败:', error);
            showAlert('解绑失败', 'error');
        }
    }
}

// 复制验证码
function copyVerifyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showAlert('验证码已复制到剪贴板', 'success');
    }).catch(() => {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showAlert('验证码已复制到剪贴板', 'success');
    });
}

// 启动倒计时
function startQQTimer(seconds, code) {
    let remaining = seconds;
    const countdownEl = document.getElementById('qq-countdown');
    
    qqVerifyTimer = setInterval(() => {
        remaining--;
        if (countdownEl) {
            countdownEl.textContent = remaining;
        }
        
        if (remaining <= 0) {
            clearInterval(qqVerifyTimer);
            if (qqBindingModal) {
                document.getElementById('qq-status').innerHTML = '<span style="color: #ef4444;">❌ 验证码已过期，请重新获取</span>';
                setTimeout(() => closeQQModal(), 2000);
            }
        }
    }, 1000);
}

// 启动验证检查
function startQQVerifyCheck(code) {
    qqCheckInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/qq/verify-status?code=${encodeURIComponent(code)}`);
            const result = await response.json();
            
            if (result.code === 0) {
                const status = result.data.status;
                
                if (status === 'verified') {
                    // 验证成功
                    clearInterval(qqCheckInterval);
                    clearInterval(qqVerifyTimer);
                    
                    document.getElementById('qq-status').innerHTML = '<span style="color: #10b981;">✅ 绑定成功！</span>';
                    
                    setTimeout(() => {
                        closeQQModal();
                        updateQQButtonStatus(true, result.data.qqNumber);
                        showAlert('QQ绑定成功！', 'success');
                    }, 1500);
                } else if (status === 'expired' || status === 'not_found') {
                    clearInterval(qqCheckInterval);
                    clearInterval(qqVerifyTimer);
                    document.getElementById('qq-status').innerHTML = '<span style="color: #ef4444;">❌ 验证码已过期</span>';
                    setTimeout(() => closeQQModal(), 2000);
                }
            }
        } catch (error) {
            console.error('检查验证状态失败:', error);
        }
    }, 2000); // 每2秒检查一次
}

// 关闭QQ弹窗
function closeQQModal() {
    if (qqVerifyTimer) {
        clearInterval(qqVerifyTimer);
        qqVerifyTimer = null;
    }
    if (qqCheckInterval) {
        clearInterval(qqCheckInterval);
        qqCheckInterval = null;
    }
    if (qqBindingModal) {
        // 添加关闭动画
        qqBindingModal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            qqBindingModal.remove();
            qqBindingModal = null;
        }, 300);
    }
}

// 在页面加载时初始化QQ绑定状态
window.addEventListener('load', () => {
    // 延迟初始化,确保用户已登录
    setTimeout(() => {
        if (currentUser && currentUser.username) {
            initQQBindingStatus();
        }
    }, 1000);
});

/**
 * 强制退出登录（用于API认证失败）
 */
function forceLogout() {
    // 避免因多个并发API请求失败而重复触发
    if (document.body.dataset.loggingOut === 'true') return;
    document.body.dataset.loggingOut = 'true'; // 设置全局标志

    console.warn('Authentication error detected. Forcing logout.');
    currentUser = null;
    instancesData = []; // 清空实例数据
    localStorage.removeItem('currentUser');
    
    // 立即切换到登录视图，防止用户在看到提示前进行其他操作
    showLogin();
    
    // 然后，向用户显示会话过期的提示
    showAlert('登录已过期，请重新登录。', 'warning', '会话超时').then(() => {
        // 清理表单字段并重置登出标志
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-error').classList.remove('show');
        // 刷新验证码以备下次登录
        refreshLoginCaptcha();
        delete document.body.dataset.loggingOut; // 清除全局标志
    });
}
// 将其暴露到全局，以便其他脚本可以调用
window.forceLogout = forceLogout;

/**
 * 页面导航
 * @param {string} pageName 页面名称
 * @param {boolean} updateHash 是否更新 URL hash（默认 true）
 */
function navigateTo(pageName, updateHash = true) {
    // 如果正在强制登出，则阻止任何导航操作，防止出现竞态条件
    if (document.body.dataset.loggingOut === 'true') {
        console.warn('Navigation blocked during logout process.');
        return;
    }

    // 验证页面名称是否有效
    const validPages = ['dashboard', 'orders', 'instances', 'recharge', 'redeem', 'create-server', 'status', 'upgrade'];
    if (!validPages.includes(pageName)) {
        console.warn(`Invalid page name: ${pageName}, redirecting to dashboard`);
        pageName = 'dashboard';
    }

    // 更新 URL hash（如果需要）
    if (updateHash) {
        const newHash = `#/${pageName}`;
        if (window.location.hash !== newHash) {
            window.location.hash = newHash;
        }
    }

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
        case 'recharge':
            rechargeModule.init();
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
        case 'upgrade':
            // 此页面无需特殊加载逻辑
            break;
    }
}

/**
 * 加载仪表盘数据
 */
async function loadDashboardData() {
    if (!currentUser || !currentUser.username || !currentUser.token) {
        // 如果未登录，可以将统计数据清零或显示提示
        updateDashboardStats({ points: 0, stats: { total: 0, expiring: 0, expired: 0 } });
        return;
    }

    try {
        // 并行获取实例数据和积分数据 (Authorization 头由全局 fetch 拦截器添加)
        const [instancesResponse, pointsResponse] = await Promise.all([
            fetch(`${CONFIG.RENEWAL_API_URL}/api/user/instances`),
            fetch(`${CONFIG.POINTS_API_URL}/api/users/points?username=${encodeURIComponent(currentUser.username)}`)
        ]);

        const instancesResult = await instancesResponse.json();
        const pointsResult = await pointsResponse.json();

        let stats = { total: 0, expiring: 0, expired: 0 };
        if (instancesResult.code === 0 && instancesResult.data && instancesResult.data.stats) {
            stats = instancesResult.data.stats;
        }

        let userBalance = 0;
        if ((pointsResult.code === 0 || pointsResult.status === 'success') && pointsResult.data) {
            const data = pointsResult.data;
            // Case 1: Response is { data: { users: [...] } }
            if (data.users && Array.isArray(data.users)) {
                const userData = data.users.find(u => u.username === currentUser.username);
                if (userData) {
                    userBalance = userData.totalPoints || userData.points || userData.balance || 0;
                }
            // Case 2: Response is { data: { totalPoints: ... } }
            } else if (typeof data === 'object' && data !== null) {
                userBalance = data.totalPoints || data.points || data.balance || 0;
            }
        }
        
        // 将整合后的数据传递给更新函数
        updateDashboardStats({ points: userBalance, stats: stats });

    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
        // 即使失败，也调用更新函数以清零或显示错误状态
        updateDashboardStats({ points: 0, stats: { total: 0, expiring: 0, expired: 0 } });
    }
}


/**
 * 更新仪表盘统计数据
 * @param {object} data - 包含实例和积分信息的对象 { instances: [], points: 0 }
 */
function updateDashboardStats(data) {
    const { points = 0, stats = { total: 0, expiring: 0, expired: 0 } } = data;

    // 更新 DOM
    const statTotalInstances = document.getElementById('stat-total-instances');
    const statExpiringInstances = document.getElementById('stat-expiring-instances');
    const statTotalPoints = document.getElementById('stat-total-points');
    const statExpiredInstances = document.getElementById('stat-expired-instances');

    if (statTotalInstances) statTotalInstances.textContent = stats.total;
    if (statExpiringInstances) statExpiringInstances.textContent = stats.expiring;
    if (statTotalPoints) statTotalPoints.textContent = points;
    if (statExpiredInstances) statExpiredInstances.textContent = stats.expired;
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
    
    // 1. 入口检查：如果正在登出或未登录，立即清空并退出
    if (document.body.dataset.loggingOut === 'true' || !currentUser) {
        if (container) container.innerHTML = '';
        return;
    }

    // 清空旧数据
    instancesData = [];
    currentUsername = currentUser.username;
    
    // 显示加载状态
    if (container) {
        container.innerHTML = '<p class="loading">正在加载您的实例...</p>';
    }
    
    try {
        const response = await fetch(`${CONFIG.RENEWAL_API_URL}/api/user/instances`);
        
        // 2. 异步操作后的二次检查：防止在请求期间发生了登出
        if (document.body.dataset.loggingOut === 'true' || !currentUser) {
            if (container) container.innerHTML = '';
            return;
        }

        const result = await response.json();
        
        // 3. 解析数据后的三次检查
        if (document.body.dataset.loggingOut === 'true' || !currentUser) {
            if (container) container.innerHTML = '';
            return;
        }

        if (result.code === 0 && result.data && result.data.instances) {
            instancesData = result.data.instances;
            renderInstancesList();
        } else {
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="icon">📭</div>
                        <p>${result.msg || '暂无实例'}</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        // 4. 错误处理中的检查
        if (document.body.dataset.loggingOut === 'true' || !currentUser) {
            if (container) container.innerHTML = '';
            return;
        }
        if (container) {
            container.innerHTML = `<div class="empty-state"><div class="icon">❌</div><p>加载失败</p></div>`;
        }
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
    
    // 加载所有实例的自动续费状态
    loadAllAutoRenewalStatus();
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
        <div class="instance-card" id="instance-card-${instance.uuid}">
            <div class="instance-card-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <h3>${instance.nickname || '未命名'}</h3>
                    <button class="btn-icon btn-icon-auto-renewal" onclick="showAutoRenewalModal('${instance.uuid}')" title="自动续费设置" id="auto-renewal-icon-${instance.uuid}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18px" height="18px">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                    <button class="btn-icon btn-icon-danger" onclick="deleteInstance('${instance.daemonId}', '${instance.uuid}', '${instance.nickname}')" title="删除实例">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18px" height="18px">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                    </button>
                </div>
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
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16px" height="16px" class="inline-block align-text-bottom mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 续费
                </button>
                <button class="btn btn-secondary" onclick="showEditInstanceModal('${instance.uuid}')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16px" height="16px" class="inline-block align-text-bottom mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14.25v4.75a2 2 0 01-2 2H5.25a2 2 0 01-2-2V6a2 2 0 012-2h4.75" /></svg> 修改
                </button>
                <button class="btn btn-tertiary" onclick="showConfigureInstanceModal('${instance.uuid}')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16px" height="16px" class="inline-block align-text-bottom mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 10-3 0M3.75 18H7.5m3-6h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 12H7.5" /></svg> 配置
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
            const data = pointsResult.data;
            // 如果返回的是用户列表，从中查找当前用户
            if (data.users && Array.isArray(data.users)) {
                const currentUserData = data.users.find(u => 
                    u.username === currentUser.username
                );
                console.log('[DEBUG] 找到的用户数据:', currentUserData);
                if (currentUserData) {
                    userBalance = currentUserData.totalPoints || currentUserData.points || currentUserData.balance || 0;
                }
            } else if (typeof data === 'object' && data !== null) {
                // 直接返回单个用户数据
                userBalance = data.totalPoints || data.points || data.balance || 0;
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

/**
 * 删除实例
 * @param {string} daemonId 守护进程ID
 * @param {string} uuid 实例UUID
 * @param {string} nickname 实例名称
 */
async function deleteInstance(daemonId, uuid, nickname) {
    // 确认删除
    const confirmed = await showConfirm(
        `确定要删除实例吗？\n\n实例名称: ${nickname}\n实例ID: ${uuid}\n\n⚠️ 警告：此操作将永久删除实例及其所有文件，无法恢复！`,
        '确认删除'
    );
    
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/instance?daemonId=${encodeURIComponent(daemonId)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uuids: [uuid]
            })
        });

        const result = await response.json();

        if (result.status === 200) {
            await showAlert(
                `实例 "${nickname}" 已成功删除`,
                'success',
                '删除成功'
            );
            // 刷新实例列表
            refreshInstances();
        } else {
            await showAlert(
                `删除失败: ${result.error || '未知错误'}`,
                'error',
                '操作失败'
            );
        }
    } catch (error) {
        console.error('删除实例请求失败:', error);
        await showAlert(`操作失败: ${error.message}`, 'error', '网络错误');
    }
}

// Global variable to store the UUID of the instance being edited
let currentEditingInstanceUUID = null;
let originalInstanceImageId = null; // Store the original image ID for comparison
let currentInstancePrice = 0; // Store the price of the current configuration
let priceUpdateDebounceTimer = null; // Timer for debouncing price updates

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

    // 移除可能存在的 closing 类，并添加动画
    modalOverlay.classList.remove('closing');
    requestAnimationFrame(() => {
        modalOverlay.classList.add('active');
    });
    
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
            // 添加图标和描述信息，使选项更美观
            const icon = '☕'; // Java 图标
            const description = image.description ? ` - ${image.description}` : '';
            option.textContent = `${icon} ${image.name}${description}`;
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
        modalOverlay.classList.add('closing');
        setTimeout(() => {
            modalOverlay.classList.remove('active');
            modalOverlay.classList.remove('closing');
        }, 300);
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

// Helper function to get points for a specific user
async function getPointsForUser(username) {
    if (!username) return 0;
    try {
        const response = await fetch(`${CONFIG.POINTS_API_URL}/api/users/points?username=${encodeURIComponent(username)}`);
        const result = await response.json();
        if ((result.code === 0 || result.status === 'success') && result.data) {
            let userBalance = 0;
            const data = result.data;
            if (data.users && Array.isArray(data.users)) {
                const userData = data.users.find(u => u.username === username);
                if (userData) {
                    userBalance = userData.totalPoints || userData.points || userData.balance || 0;
                }
            } else if (typeof data === 'object' && data !== null) {
                userBalance = data.totalPoints || data.points || data.balance || 0;
            }
            return userBalance;
        }
        return 0;
    } catch (error) {
        console.error(`获取用户 ${username} 积分失败:`, error);
        return 0;
    }
}

/**
 * 获取实例价格变动预览
 * @param {string} daemonId
 * @param {string} uuid
 * @param {object} newConfig - { memory, cpu, disk, ports }
 * @returns {Promise<object>} 包含 oldPrice, newPrice, cost, refund, isSufficient 等信息
 */
async function getConfigurePricePreview(daemonId, uuid, newConfig) {
    try {
        const url = `${CONFIG.RENEWAL_API_URL}/api/instance/pre-update`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ daemonId, uuid, ...newConfig })
        });
        const result = await response.json();
        if (result.code === 0) {
            return result.data;
        }
        console.error('预计算价格API请求失败:', result.msg);
        return null; // 表示计算失败
    } catch (error) {
        console.error('预计算价格API请求失败:', error);
        return null;
    }
}


/**
 * 更新配置变更的价格预览
 */
async function updateConfigurePricePreview() {
    const previewContainer = document.getElementById('configure-price-preview');
    const currentPriceEl = document.getElementById('configure-current-price');
    const newPriceEl = document.getElementById('configure-new-price');
    const diffPriceEl = document.getElementById('configure-price-diff');
    const diffLabelEl = document.getElementById('configure-price-diff-label');
    const balanceEl = document.getElementById('configure-user-balance');
    const warningEl = document.getElementById('configure-price-warning');
    const saveBtn = document.getElementById('configure-instance-save-btn');

    previewContainer.style.display = 'block';
    currentPriceEl.textContent = '计算中...';
    newPriceEl.textContent = '计算中...';
    diffPriceEl.textContent = '计算中...';
    balanceEl.textContent = '加载中...';
    warningEl.style.display = 'none';
    saveBtn.disabled = true;

    if (!currentEditingInstanceUUID) {
        console.error('没有正在编辑的实例UUID');
        currentPriceEl.textContent = '错误';
        newPriceEl.textContent = '错误';
        diffPriceEl.textContent = '错误';
        return;
    }

    const instance = instancesData.find(inst => inst.uuid === currentEditingInstanceUUID);
    if (!instance) {
        console.error('未找到实例数据');
        currentPriceEl.textContent = '错误';
        newPriceEl.textContent = '错误';
        diffPriceEl.textContent = '错误';
        return;
    }
    const daemonId = instance.daemonId;

    // 1. 获取用户积分
    const userBalance = await getPointsForUser(currentUser.username);
    balanceEl.textContent = `${userBalance} 积分`;

    // 2. 准备新配置数据
    const newConfig = {
        memory: parseInt(document.getElementById('configure-instance-memory').value),
        cpu: parseFloat(document.getElementById('configure-instance-cpu').value),
        disk: parseFloat(document.getElementById('configure-instance-disk').value),
        ports: document.getElementById('configure-instance-ports').value.split(',').map(p => p.trim()).filter(p => p).join(',') // 确保是逗号分隔字符串
    };

    // 3. 调用后端预计算 API
    const previewResult = await getConfigurePricePreview(daemonId, currentEditingInstanceUUID, newConfig);

    if (!previewResult) {
        currentPriceEl.textContent = '计算失败';
        newPriceEl.textContent = '计算失败';
        diffPriceEl.textContent = '计算失败';
        return;
    }

    currentInstancePrice = previewResult.oldPrice; // Store globally
    currentPriceEl.textContent = `${previewResult.oldPrice.toFixed(2)} 积分`;
    newPriceEl.textContent = `${previewResult.newPrice.toFixed(2)} 积分`;

    saveBtn.disabled = false;
    warningEl.style.display = 'none';

    if (previewResult.pointDifference > 0) { // 升级 (pointDifference > 0 表示新价格更高)
        diffLabelEl.textContent = '预计扣除:';
        diffPriceEl.textContent = `${previewResult.cost.toFixed(2)} 积分`;
        diffPriceEl.style.color = '#f97316'; // Orange for increase
        if (!previewResult.isSufficient) {
            warningEl.textContent = `您的积分不足以支付升级费用 ${previewResult.cost.toFixed(2)} 积分。`;
            warningEl.style.display = 'block';
            saveBtn.disabled = true;
        }
    } else if (previewResult.pointDifference < 0) { // 降级 (pointDifference < 0 表示新价格更低)
        diffLabelEl.textContent = '预计返还:';
        diffPriceEl.textContent = `${previewResult.refund.toFixed(2)} 积分 (已扣除10%手续费)`;
        diffPriceEl.style.color = '#10b981'; // Green for decrease
    } else {
        diffLabelEl.textContent = '积分变动:';
        diffPriceEl.textContent = `0 积分`;
        diffPriceEl.style.color = '#6b7280'; // Gray for no change
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
    const cpuInput = document.getElementById('configure-instance-cpu');
    const diskInput = document.getElementById('configure-instance-disk');
    const portsInput = document.getElementById('configure-instance-ports');
    const loadingDiv = modal.querySelector('.loading-state');
    const formDiv = modal.querySelector('.form-state');
    const pricePreview = document.getElementById('configure-price-preview');

    if (!modalOverlay || !memoryInput || !cpuInput || !diskInput || !portsInput) {
        console.error('配置模态框的元素未找到!');
        showAlert('无法打开配置窗口，页面元素缺失。', 'error');
        return;
    }

    // 移除可能存在的 closing 类，并添加动画
    modalOverlay.classList.remove('closing');
    requestAnimationFrame(() => {
        modalOverlay.classList.add('active');
    });
    
    loadingDiv.style.display = 'flex';
    formDiv.style.display = 'none';
    pricePreview.style.display = 'none'; // Hide price preview initially

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

        // Store original values in data attributes
        memoryInput.dataset.originalValue = dockerConfig.memory || '1024';
        cpuInput.dataset.originalValue = (dockerConfig.cpuUsage || 100) / 100;
        diskInput.dataset.originalValue = dockerConfig.maxSpace ? dockerConfig.maxSpace / 1024 : 10;
        const portNumbers = (dockerConfig.ports || []).map(p => p.split(':')[0]).filter((v, i, a) => a.indexOf(v) === i);
        portsInput.dataset.originalValue = portNumbers.join(','); // 确保是逗号分隔字符串，没有空格

        // Fill form with original values
        memoryInput.value = memoryInput.dataset.originalValue;
        cpuInput.value = cpuInput.dataset.originalValue;
        diskInput.value = diskInput.dataset.originalValue;
        portsInput.value = portsInput.dataset.originalValue;
        
        loadingDiv.style.display = 'none';
        formDiv.style.display = 'block';

        // Add event listeners for price updates
        [memoryInput, cpuInput, diskInput, portsInput].forEach(input => {
            input.removeEventListener('input', updateConfigurePricePreview); // Remove old listeners
            input.addEventListener('input', () => {
                clearTimeout(priceUpdateDebounceTimer);
                priceUpdateDebounceTimer = setTimeout(updateConfigurePricePreview, 300);
            });
        });

        // Initial price calculation
        updateConfigurePricePreview();

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
        modalOverlay.classList.add('closing');
        setTimeout(() => {
            modalOverlay.classList.remove('active');
            modalOverlay.classList.remove('closing');
        }, 300);
    }
    currentEditingInstanceUUID = null;
    currentInstancePrice = 0;
    clearTimeout(priceUpdateDebounceTimer);
}


/**
 * 处理更新实例配置（硬件）
 */
async function handleUpdateConfiguration() {
    if (!currentEditingInstanceUUID) {
        showAlert('没有正在编辑的实例。', 'error');
        return;
    }
    const uuid = currentEditingInstanceUUID;

    const memory = document.getElementById('configure-instance-memory').value.trim();
    const cpu = document.getElementById('configure-instance-cpu').value.trim();
    const disk = document.getElementById('configure-instance-disk').value.trim();
    const portsStr = document.getElementById('configure-instance-ports').value.trim();
    const saveBtn = document.getElementById('configure-instance-save-btn');

    const memoryNum = parseInt(memory);
    const cpuValue = parseFloat(cpu);
    const diskValue = parseFloat(disk);

    // Validation
    if (isNaN(memoryNum) || memoryNum < 512) {
        showAlert('内存大小无效，必须是大于等于 512 的数字。', 'warning');
        return;
    }
    if (isNaN(cpuValue) || cpuValue <= 0) {
        showAlert('CPU核心数无效，必须是大于 0 的数字。', 'warning');
        return;
    }
    if (isNaN(diskValue) || diskValue <= 0) {
        showAlert('磁盘空间无效，必须是大于 0 的数字。', 'warning');
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

    // Recalculate prices for confirmation
    const newConfig = { memory: memoryNum, cpu: cpuValue, disk: diskValue, ports: ports.join(',') }; // 确保ports是逗号分隔字符串
    const previewResult = await getConfigurePricePreview(daemonId, currentEditingInstanceUUID, newConfig);

    if (!previewResult) {
        showAlert('无法获取价格预览，请重试。', 'error');
        return;
    }

    // Confirmation dialog
    let confirmMessage = `确定要保存这些配置更改吗？<br><br>
        当前配置价值: <strong>${previewResult.oldPrice.toFixed(2)} 积分</strong><br>
        新配置价值: <strong>${previewResult.newPrice.toFixed(2)} 积分</strong>`;
    
    if (previewResult.pointDifference > 0) { // 升级
        confirmMessage += `<br><br><span style="color:#ef4444;">此操作将立即从您的余额中扣除 <strong>${previewResult.cost.toFixed(2)}</strong> 积分。</span>`;
    } else if (previewResult.pointDifference < 0) { // 降级
        confirmMessage += `<br><br><span style="color:#10b981;">此操作将立即向您的余额返还 <strong>${previewResult.refund.toFixed(2)}</strong> 积分 (已扣除10%手续费)。</span>`;
    }

    const confirmed = await showConfirm(confirmMessage, '确认修改');
    if (!confirmed) {
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
        // Use the new atomic update endpoint
        const response = await fetch(`${CONFIG.RENEWAL_API_URL}/api/instance/configure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                daemonId,
                uuid,
                username: currentUser.username,
                memory: memoryNum,
                cpu: cpuValue, // 直接发送核心数
                disk: diskValue, // 直接发送 GB
                ports: ports.join(','), // 确保是逗号分隔字符串
            })
        });

        const result = await response.json();

        if (result.code === 0) {
            closeConfigureInstanceModal();
            // pointsChange 现在是正数表示扣除，负数表示增加
            let pointsChangeText = result.data.pointsChange > 0 ? `扣除 ${result.data.pointsChange.toFixed(2)}` : `返还 ${Math.abs(result.data.pointsChange).toFixed(2)}`;
            if (result.data.pointsChange === 0) pointsChangeText = '无变动';

            await showAlert(
                `配置更新成功！<br>
                 积分变更: ${pointsChangeText}<br>
                 当前余额: ${result.data.newBalance.toFixed(2)}`,
                'success',
                '操作成功'
            );
            refreshInstances();
            loadDashboardData(); // Refresh dashboard points
        } else {
            showAlert(`更新失败: ${result.msg || '未知错误'}`, 'error');
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
                            <span class="status-value node-value">${server.name}</span>
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
 * 从后端获取并刷新验证码图片
 * @param {string} imgId 图片元素ID
 * @param {Function} setCaptchaIdCallback 设置验证码ID的回调函数
 */
async function fetchAndRefreshCaptcha(imgId, setCaptchaIdCallback) {
        const captchaImg = document.getElementById(imgId);
        const captchaOverlay = document.getElementById(imgId.replace('-img', '-overlay'));
        const captchaInput = document.getElementById(imgId.replace('-img', ''));

        if (!captchaImg || !captchaOverlay || !captchaInput) return;

        // 清除旧的计时器
        const timerId = imgId === 'login-captcha-img' ? loginCaptchaTimer : registerCaptchaTimer;
        if (timerId) {
            clearTimeout(timerId);
            if (imgId === 'login-captcha-img') loginCaptchaTimer = null;
            else registerCaptchaTimer = null;
        }

        try {
            // 生成一个唯一的ID用于请求验证码
            const captchaRequestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            const response = await fetch(`${CONFIG.RENEWAL_API_URL}/api/captcha?id=${captchaRequestId}`);
            
            // 从响应头中获取 X-Captcha-Id 和 X-Captcha-Expires-In
            const captchaId = response.headers.get('X-Captcha-Id');
            const expiresIn = parseInt(response.headers.get('X-Captcha-Expires-In')) || 0; // 秒
            
            if (captchaId) {
                setCaptchaIdCallback(captchaId);
            } else {
                console.error('未从响应头中获取到 X-Captcha-Id');
                setCaptchaIdCallback('');
            }

            const svgText = await response.text();
            // 将 SVG 文本作为 data URL 设置给 img 元素的 src
            captchaImg.src = 'data:image/svg+xml;base64,' + btoa(svgText);
            captchaInput.value = ''; // 清空验证码输入框

            // 隐藏覆盖层，显示验证码图片
            updateCaptchaDisplay(imgId, false);

            // 设置新的计时器
            if (expiresIn > 0) {
                const newTimerId = setTimeout(() => {
                    updateCaptchaDisplay(imgId, true); // 显示覆盖层
                    if (imgId === 'login-captcha-img') loginCaptchaTimer = null;
                    else registerCaptchaTimer = null;
                }, expiresIn * 1000); // 转换为毫秒
                
                if (imgId === 'login-captcha-img') loginCaptchaTimer = newTimerId;
                else registerCaptchaTimer = newTimerId;
            }

        } catch (error) {
            console.error('获取验证码失败:', error);
            captchaImg.src = ''; // 清空图片
            setCaptchaIdCallback('');
            updateCaptchaDisplay(imgId, true); // 获取失败也显示过期
        }
    }

    /**
     * 控制验证码图片和覆盖层的显示
     * @param {string} imgId 验证码图片元素的ID (e.g., 'login-captcha-img')
     * @param {boolean} showOverlay 是否显示覆盖层 (true: 显示, false: 隐藏)
     */
    function updateCaptchaDisplay(imgId, showOverlay) {
        const captchaImg = document.getElementById(imgId);
        const captchaOverlay = document.getElementById(imgId.replace('-img', '-overlay'));
        const captchaInput = document.getElementById(imgId.replace('-img', ''));

        if (!captchaImg || !captchaOverlay || !captchaInput) return;

        if (showOverlay) {
            captchaOverlay.style.display = 'flex'; // 显示覆盖层
            captchaImg.style.display = 'none'; // 隐藏图片
            captchaInput.disabled = true; // 禁用输入框
        } else {
            captchaOverlay.style.display = 'none'; // 隐藏覆盖层
            captchaImg.style.display = 'block'; // 显示图片
            captchaInput.disabled = false; // 启用输入框
        }
    }

    /**
     * 刷新登录验证码
     */
    function refreshLoginCaptcha() {
        fetchAndRefreshCaptcha('login-captcha-img', (id) => {
            loginCaptchaId = id;
        });
    }

    /**
     * 刷新注册验证码
     */
    function refreshRegisterCaptcha() {
        fetchAndRefreshCaptcha('reg-captcha-img', (id) => {
            registerCaptchaId = id;
        });
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
        container.innerHTML = '<p class="redeem-empty-state">请先登录查看兑换记录</p>';
        return;
    }
    
    container.innerHTML = '<p class="loading">加载中...</p>';
    
    try {
        const response = await fetch(`${CONFIG.RENEWAL_API_URL}/api/coupon/user-history?username=${encodeURIComponent(currentUser.username)}`);
        const result = await response.json();
        
        if (result.code === 0 && result.data) {
            const redeems = result.data.redeems || [];
            
            if (redeems.length === 0) {
                container.innerHTML = `
                    <div class="redeem-empty-state">
                        <p>暂无兑换记录</p>
                        <p style="font-size:0.85rem;margin-top:8px;">成功兑换后，记录将显示在这里</p>
                    </div>
                `;
                return;
            }
            
            // 渲染兑换记录表格
            let html = `
                <div style="overflow-x:auto;">
                    <table class="redeem-history-table">
                        <thead>
                            <tr>
                                <th>兑换码</th>
                                <th>类型</th>
                                <th style="text-align:right;">数值</th>
                                <th>说明</th>
                                <th>兑换时间</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            redeems.forEach((redeem) => {
                const typeClass = redeem.type === 'points' ? 'redeem-type-points' : 'redeem-type-days';
                const valueClass = redeem.type === 'points' ? 'redeem-value-points' : 'redeem-value-days';
                const redeemedDate = redeem.redeemedAt ? new Date(redeem.redeemedAt).toLocaleString('zh-CN') : '未知';
                
                html += `
                    <tr>
                        <td class="redeem-code-cell">${redeem.code}</td>
                        <td>
                            <span class="redeem-type-badge ${typeClass}">
                                ${redeem.typeText}
                            </span>
                        </td>
                        <td class="redeem-value-cell ${valueClass}">
                            ${redeem.value}
                        </td>
                        <td class="redeem-description-cell">${redeem.description || '-'}</td>
                        <td class="redeem-date-cell">${redeemedDate}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
                <div class="redeem-stats">
                    <strong>📊 统计：</strong>共兑换 ${redeems.length} 次
                </div>
            `;
            
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="redeem-error-state">
                    <p>加载失败：${result.msg || '未知错误'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('加载兑换记录失败:', error);
        container.innerHTML = `
            <div class="redeem-error-state">
                <p>网络错误：${error.message}</p>
                <button class="btn btn-secondary" onclick="loadRedeemHistory()" style="margin-top:10px;">重试</button>
            </div>
        `;
    }
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
        overlay.classList.remove('closing');
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
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
        overlay.classList.add('closing');
        setTimeout(() => {
            overlay.classList.remove('active');
            overlay.classList.remove('closing');
        }, 300);
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
    // showPurchaseReminder();
    
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
            const data = result.data;
            if (data.users && Array.isArray(data.users)) {
                const userData = data.users.find(u => u.username === currentUser.username);
                if (userData) {
                    userBalance = userData.totalPoints || userData.points || userData.balance || 0;
                }
            } else if (typeof data === 'object' && data !== null) {
                userBalance = data.totalPoints || data.points || data.balance || 0;
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
                // 添加图标和描述信息，使选项更美观
                const icon = '☕'; // Java 图标
                const description = image.description ? ` - ${image.description}` : '';
                option.textContent = `${icon} ${image.name}${description}`;
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
 * 加载并显示公告 (全新 Markdown 版本)
 */
async function loadAnnouncement() {
    const announcementCard = document.getElementById('announcement-card');
    const announcementBody = document.getElementById('announcement-body');
    if (!announcementCard || !announcementBody) return;

    try {
        const response = await fetch('/api/announcement');
        const result = await response.json();

        if (result.code === 0 && result.data && result.data.content.trim()) {
            // 有内容，确保卡片显示
            announcementCard.style.display = 'block';
            
            // 尝试用 marked.js 渲染
            try {
                if (window.marked) {
                    window.marked.setOptions({
                        mangle: false,
                        headerIds: false,
                        gfm: true,
                        breaks: true
                    });
                    // For modern marked versions (like v12+), use marked.parse()
                    announcementBody.innerHTML = window.marked.parse(result.data.content);
                } else {
                    // marked.js 未加载时的后备方案
                    announcementBody.textContent = result.data.content;
                    console.error('marked.js library not found. Displaying raw text.');
                }
            } catch (e) {
                // marked.js 渲染失败时的后备方案
                console.error('Error during Markdown parsing:', e);
                announcementBody.textContent = result.data.content;
            }
        } else {
            // 没有公告内容，则隐藏卡片
            announcementCard.style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to load announcement:', error);
        announcementCard.style.display = 'none';
    }
}


// ============== 充值模块 ==============
const rechargeModule = {
    amount: 0,
    // username: '', // 移除内部状态，直接使用全局 currentUser
    pointsRatio: 1,
    payUrl: '',
    checkinConfig: {
        basePoints: 10,
        continuousBonus: 5,
        maxContinuousBonus: 50
    },
    amountOptions: [10, 30, 50, 100, 200, 500],

    init: function() {
        if (!currentUser || !currentUser.username) {
            showAlert('请先登录再进行充值', 'warning');
            navigateTo('dashboard');
            return;
        }
        // this.username = currentUser.username; // 移除

        this.loadConfig().then(() => {
            this.initGrid();
            this.initCustom();
            this.loadPoints();
            this.loadCheckinConfig().then(() => {
                this.loadCheckinStatus();
            });
            this.bindEvents();
        });
    },

    bindEvents: function() {
        document.getElementById('rechargeSubmitBtn').onclick = () => this.pay();
        document.getElementById('rechargeCheckinBtn').onclick = () => this.doCheckin();
    },

    loadConfig: function() {
        return fetch('/api/config')
            .then(r => r.json())
            .then(data => {
                if (data.code === 0 && data.data) {
                    this.pointsRatio = data.data.pointsRatio || 1;
                    if (data.data.payUrl) {
                        this.payUrl = data.data.payUrl;
                    }
                    document.getElementById('rechargeRatioInfo').textContent = '1元 = ' + this.pointsRatio + '积分';
                }
            })
            .catch(e => {
                console.error('加载充值配置失败:', e);
                showAlert('加载充值配置失败', 'error');
            });
    },

    initGrid: function() {
        const grid = document.getElementById('rechargeAmountGrid');
        let html = '';
        const getIcon = (value) => {
            if (value < 50) {
                return '<svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.25 7.756a4.5 4.5 0 100 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
            } else if (value < 200) {
                return '<svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /></svg>';
            } else {
                return '<svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>';
            }
        };

        this.amountOptions.forEach(val => {
            const pts = val * this.pointsRatio;
            html += `<div class="amount-item" data-val="${val}">
                ${getIcon(val)}
                <div class="amount-value">
                    <div class="num">${val}</div>
                    <div class="unit">元</div>
                </div>
                <div class="pts">${pts}积分</div>
            </div>`;
        });
        grid.innerHTML = html;

        const items = document.querySelectorAll('.amount-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.amount = parseInt(item.dataset.val);
                document.getElementById('rechargeCustomField').value = '';
            });
        });
    },

    initCustom: function() {
        const customField = document.getElementById('rechargeCustomField');
        customField.addEventListener('input', () => {
            document.querySelectorAll('.amount-item').forEach(i => i.classList.remove('active'));
            this.amount = parseFloat(customField.value) || 0;
        });
    },

    pay: function() {
        if (this.amount <= 0) {
            showAlert('请选择或输入有效金额', 'warning');
            return;
        }
        if (!this.payUrl) {
            showAlert('支付网关未配置，请联系管理员', 'error');
            return;
        }
        if (!currentUser || !currentUser.username) {
            showAlert('用户未登录，无法充值。', 'error');
            return;
        }

        const params = new URLSearchParams({
            amount: this.amount,
            username: currentUser.username
        });
        const url = `${this.payUrl}?${params.toString()}`;
        window.open(url, '_blank');
    },

    loadPoints: function() {
        if (!currentUser || !currentUser.username) return;
        fetch(`/api/users/points?username=${currentUser.username}`)
            .then(r => r.json())
            .then(data => {
                if (data.code === 0 && data.data) {
                    const pointsEl = document.getElementById('rechargeCurrentPoints');
                    if (pointsEl) {
                        // 适配两种可能的返回格式
                        const points = data.data.totalPoints !== undefined ? data.data.totalPoints : (data.data.users ? (data.data.users[0]?.totalPoints || 0) : 0);
                        pointsEl.textContent = points;
                    }
                }
            });
    },

    loadCheckinConfig: function() {
        return fetch('/api/checkin/config')
            .then(r => r.json())
            .then(data => {
                if (data.code === 0 && data.data) {
                    this.checkinConfig = data.data;
                    const todayRewardEl = document.getElementById('rechargeTodayReward');
                    if (todayRewardEl) {
                        const maxReward = data.data.basePoints + data.data.maxContinuousBonus;
                        todayRewardEl.textContent = `${data.data.basePoints}-${maxReward} 积分`;
                    }
                }
            });
    },

    loadCheckinStatus: function() {
        if (!currentUser || !currentUser.username) return;
        fetch(`/api/checkin/status?username=${encodeURIComponent(currentUser.username)}`)
            .then(r => r.json())
            .then(data => {
                if (data.code === 0 && data.data) {
                    const totalCheckinsEl = document.getElementById('rechargeTotalCheckins');
                    if (totalCheckinsEl) {
                        // FIX: Use the correct property `totalCheckins` from the API response
                        totalCheckinsEl.textContent = `${data.data.totalCheckins || 0} 天`;
                    }

                    const btn = document.getElementById('rechargeCheckinBtn');
                    const btnSpan = btn ? btn.querySelector('span') : null;

                    // FIX: Use the correct property `hasCheckedInToday` from the API response
                    if (data.data.hasCheckedInToday) {
                        if (btn) btn.disabled = true;
                        if (btnSpan) btnSpan.textContent = '今日已签到';
                    } else {
                        if (btn) btn.disabled = false;
                        if (btnSpan) btnSpan.textContent = '签到领积分';
                    }
                }
            });
    },

    doCheckin: function() {
        const btn = document.getElementById('rechargeCheckinBtn');
        if (btn) btn.disabled = true;

        if (!currentUser || !currentUser.username) {
            showAlert('用户未登录，无法签到。', 'error');
            if (btn) btn.disabled = false;
            return;
        }
        
        fetch('/api/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username })
        })
        .then(r => r.json())
        .then(data => {
            if (data.code === 0 && data.data) {
                // FIX: Use the correct property `rewardPoints` from the API response
                showAlert(`签到成功！获得 ${data.data.rewardPoints} 积分`, 'success');
                this.loadCheckinStatus();
                this.loadPoints();
                loadDashboardData(); // Refresh dashboard stats
            } else {
                showAlert(data.msg || '签到失败', 'error');
                // Re-enable the button only on failure
                if (btn) btn.disabled = false;
            }
        })
        .catch(e => {
            showAlert('网络错误，签到失败', 'error');
            if (btn) btn.disabled = false;
        });
    }
};

// ============== 自动续费功能 ==============

// ============== 自动续费功能 ==============

let currentAutoRenewalUUID = ''; // 当前正在设置自动续费的实例UUID

/**
 * 显示自动续费设置弹窗
 */
async function showAutoRenewalModal(uuid) {
    if (!currentUser || !currentUser.username) {
        await showAlert('请先登录', 'warning');
        return;
    }
    
    currentAutoRenewalUUID = uuid;
    const modalOverlay = document.getElementById('auto-renewal-modal-overlay');
    
    // 显示弹窗
    modalOverlay.classList.remove('closing');
    requestAnimationFrame(() => {
        modalOverlay.classList.add('active');
    });
    
    // 加载配置
    await loadAutoRenewalConfigToModal(uuid);
}

/**
 * 关闭自动续费设置弹窗
 */
function closeAutoRenewalModal() {
    const modalOverlay = document.getElementById('auto-renewal-modal-overlay');
    modalOverlay.classList.add('closing');
    setTimeout(() => {
        modalOverlay.classList.remove('active');
        modalOverlay.classList.remove('closing');
    }, 300);
    currentAutoRenewalUUID = '';
}

/**
 * 加载自动续费配置到弹窗
 */
async function loadAutoRenewalConfigToModal(uuid) {
    try {
        const response = await fetch(`/api/auto-renewal/config?username=${encodeURIComponent(currentUser.username)}&instanceUuid=${encodeURIComponent(uuid)}`);
        const result = await response.json();
        
        if (result.code === 0 && result.data) {
            const config = result.data;
            document.getElementById('auto-renewal-enabled').checked = config.enabled;
            document.getElementById('auto-renewal-days').value = config.renewalDays;
            document.getElementById('auto-renewal-advance').value = config.advanceDays;
            document.getElementById('auto-renewal-reserve').value = config.minPointsReserve;
        } else {
            // 没有配置，使用默认值
            document.getElementById('auto-renewal-enabled').checked = false;
            document.getElementById('auto-renewal-days').value = 30;
            document.getElementById('auto-renewal-advance').value = 3;
            document.getElementById('auto-renewal-reserve').value = 50;
        }
    } catch (error) {
        console.error('加载自动续费配置失败:', error);
        await showAlert('加载配置失败', 'error');
    }
}

/**
 * 从弹窗保存自动续费配置
 */
async function saveAutoRenewalConfigFromModal() {
    if (!currentUser || !currentUser.username || !currentAutoRenewalUUID) {
        await showAlert('请先登录', 'warning');
        return;
    }
    
    const enabled = document.getElementById('auto-renewal-enabled').checked;
    const renewalDays = parseInt(document.getElementById('auto-renewal-days').value);
    const advanceDays = parseInt(document.getElementById('auto-renewal-advance').value);
    const minPointsReserve = parseInt(document.getElementById('auto-renewal-reserve').value);
    
    // 验证输入
    if (isNaN(renewalDays) || renewalDays < 1 || renewalDays > 365) {
        await showAlert('续费天数必须在 1-365 之间', 'warning');
        return;
    }
    
    if (isNaN(advanceDays) || advanceDays < 1 || advanceDays > 30) {
        await showAlert('提前天数必须在 1-30 之间', 'warning');
        return;
    }
    
    if (isNaN(minPointsReserve) || minPointsReserve < 0) {
        await showAlert('保留积分必须大于等于 0', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/auto-renewal/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser.username,
                instanceUuid: currentAutoRenewalUUID,
                enabled,
                renewalDays,
                advanceDays,
                minPointsReserve
            })
        });
        
        const result = await response.json();
        
        if (result.code === 0) {
            // 更新徽章显示
            updateAutoRenewalBadge(currentAutoRenewalUUID, enabled);
            // 关闭弹窗
            closeAutoRenewalModal();
        } else {
            await showAlert(`保存失败: ${result.msg}`, 'error');
        }
    } catch (error) {
        console.error('保存自动续费配置失败:', error);
        await showAlert('保存失败，请重试', 'error');
    }
}

/**
 * 从弹窗查看自动续费历史
 */
async function viewAutoRenewalHistoryFromModal() {
    if (!currentAutoRenewalUUID) return;
    await viewAutoRenewalHistory(currentAutoRenewalUUID);
}

/**
 * 更新自动续费徽章显示
 */
function updateAutoRenewalBadge(uuid, enabled) {
    const icon = document.getElementById(`auto-renewal-icon-${uuid}`);
    
    if (enabled) {
        if (icon) icon.classList.add('enabled');
    } else {
        if (icon) icon.classList.remove('enabled');
    }
}

/**
 * 查看自动续费历史记录
 */
async function viewAutoRenewalHistory(uuid) {
    if (!currentUser || !currentUser.username) {
        await showAlert('请先登录', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/auto-renewal/history?username=${encodeURIComponent(currentUser.username)}&instanceUuid=${encodeURIComponent(uuid)}&limit=20`);
        const result = await response.json();
        
        if (result.code === 0) {
            const history = result.data.history || [];
            
            if (history.length === 0) {
                await showAlert('暂无自动续费历史记录', 'info', '历史记录');
                return;
            }
            
            let historyHtml = '<div style="max-height:400px;overflow-y:auto;">';
            historyHtml += '<table style="width:100%;border-collapse:collapse;font-size:0.9rem;">';
            historyHtml += '<thead><tr style="background:#f5f5f5;"><th style="padding:8px;text-align:left;">时间</th><th style="padding:8px;text-align:right;">积分</th><th style="padding:8px;text-align:left;">说明</th></tr></thead>';
            historyHtml += '<tbody>';
            
            history.forEach(record => {
                const time = new Date(record.time).toLocaleString('zh-CN');
                const points = Math.abs(record.points);
                const reason = record.reason || '';
                historyHtml += `<tr style="border-bottom:1px solid #eee;">
                    <td style="padding:8px;">${time}</td>
                    <td style="padding:8px;text-align:right;color:#ef4444;">-${points}</td>
                    <td style="padding:8px;">${reason}</td>
                </tr>`;
            });
            
            historyHtml += '</tbody></table></div>';
            
            await showAlert(historyHtml, 'info', '自动续费历史记录');
        } else {
            await showAlert(`获取历史记录失败: ${result.msg}`, 'error');
        }
    } catch (error) {
        console.error('获取自动续费历史失败:', error);
        await showAlert(`获取历史记录失败: ${error.message}`, 'error');
    }
}

/**
 * 在实例列表加载后，加载所有实例的自动续费状态
 */
async function loadAllAutoRenewalStatus() {
    if (!currentUser || !currentUser.username || instancesData.length === 0) return;
    
    try {
        const response = await fetch(`/api/auto-renewal/config?username=${encodeURIComponent(currentUser.username)}`);
        const result = await response.json();
        
        if (result.code === 0 && result.data) {
            const configs = result.data;
            
            // 更新所有实例的徽章显示
            for (const [uuid, config] of Object.entries(configs)) {
                updateAutoRenewalBadge(uuid, config.enabled);
            }
        }
    } catch (error) {
        console.error('加载自动续费状态失败:', error);
    }
}

// ============== 自动续费功能结束 ==============

// 在 DOM 加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    Modal.init();
    // 页面加载时刷新验证码
    refreshLoginCaptcha();
    refreshRegisterCaptcha();
});
