document.addEventListener('DOMContentLoaded', () => {
    const setupContainer = document.getElementById('setup-container');
    const loginContainer = document.getElementById('login-container');
    const setupForm = document.getElementById('setup-form');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const loginPasswordInput = document.getElementById('loginPassword');
    const setupMessage = document.getElementById('setup-message');
    const loginMessage = document.getElementById('login-message');

    let rootAdminPasswordSet = window.rootAdminPasswordSet; // 从 server.js 注入的全局变量

    function showMessage(element, msg, type) {
        element.textContent = msg;
        element.className = `message ${type}`;
        element.style.display = 'block';
    }

    function hideMessage(element) {
        element.style.display = 'none';
        element.textContent = '';
    }

    function updateUI() {
        if (rootAdminPasswordSet) {
            setupContainer.style.display = 'none';
            loginContainer.style.display = 'block';
        } else {
            setupContainer.style.display = 'block';
            loginContainer.style.display = 'none';
        }
        hideMessage(setupMessage);
        hideMessage(loginMessage);
    }

    // 初始 UI 更新
    updateUI();

    // 设置密码表单提交
    setupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideMessage(setupMessage);

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password.length < 6) {
            showMessage(setupMessage, '密码长度至少6位', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showMessage(setupMessage, '两次输入的密码不一致', 'error');
            return;
        }

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: password, isSetup: true })
            });
            const data = await response.json();

            if (data.code === 0) {
                showMessage(setupMessage, '密码设置成功，已自动登录！', 'success');
                localStorage.setItem('root_token', data.data.token);
                rootAdminPasswordSet = true; // 更新状态
                updateUI(); // 切换到登录界面
                window.location.href = '/admin/admin_panel.html'; // 重定向到新的管理页面
            } else {
                showMessage(setupMessage, data.msg || '密码设置失败', 'error');
            }
        } catch (error) {
            showMessage(setupMessage, '请求失败: ' + error.message, 'error');
        }
    });

    // 登录表单提交
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideMessage(loginMessage);

        const loginPassword = loginPasswordInput.value;

        if (loginPassword.length === 0) {
            showMessage(loginMessage, '请输入密码', 'error');
            return;
        }

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: loginPassword })
            });
            const data = await response.json();

            if (data.code === 0) {
                showMessage(loginMessage, '登录成功！', 'success');
                localStorage.setItem('root_token', data.data.token);
                window.location.href = '/admin/admin_panel.html'; // 重定向到新的管理页面
            } else {
                showMessage(loginMessage, data.msg || '登录失败', 'error');
            }
        } catch (error) {
            showMessage(loginMessage, '请求失败: ' + error.message, 'error');
        }aS
    });
});
