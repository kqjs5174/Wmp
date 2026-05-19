// 功能开关管理页面脚本

document.addEventListener('DOMContentLoaded', async () => {
    const logoutButton = document.getElementById('logout-button');
    const refreshButton = document.getElementById('refresh-button');
    const featuresContainer = document.getElementById('features-container');
    const featureMessage = document.getElementById('feature-message');
    const loadingOverlay = document.getElementById('loading-overlay');

    // 检查令牌
    const token = localStorage.getItem('root_token');
    if (!token) {
        console.warn('⛔ 未找到管理员令牌，重定向到登录页面');
        window.location.href = '/admin/index.html';
        return;
    }

    // 验证令牌
    try {
        const response = await fetch('/api/admin/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok || response.status === 401 || response.status === 403) {
            console.warn('⛔ 管理员令牌无效或已过期，重定向到登录页面');
            localStorage.removeItem('root_token');
            window.location.href = '/admin/index.html';
            return;
        }
    } catch (error) {
        console.error('⛔ 验证令牌时发生错误:', error);
        window.location.href = '/admin/index.html';
        return;
    }

    // 退出登录
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('root_token');
        window.location.href = '/admin/index.html';
    });

    // 刷新配置
    refreshButton.addEventListener('click', async () => {
        showLoading();
        try {
            await loadConfig();
            showMessage('✓ 配置已刷新', 'success');
        } catch (error) {
            showMessage('刷新失败: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });

    // 功能配置定义
    const featureDefinitions = {
        'services': {
            title: '服务模块',
            features: [
                {
                    path: 'services.payment.enabled',
                    title: '支付功能',
                    description: '是否启用支付功能模块'
                },
                {
                    path: 'services.recharge.enabled',
                    title: '充值功能',
                    description: '是否启用充值功能模块'
                },
                {
                    path: 'services.admin.enabled',
                    title: '管理面板',
                    description: '是否启用管理面板功能',
                    critical: true,
                    warning: '⚠️ 关闭后将无法访问管理面板'
                }
            ]
        },
        'features': {
            title: '功能模块',
            features: [
                {
                    path: 'checkin.enabled',
                    title: '签到功能',
                    description: '是否启用签到功能，用户可以每日签到获取积分'
                },
                {
                    path: 'dailyConsumption.enabled',
                    title: '每日消耗',
                    description: '是否启用每日消耗功能（注意：可能存在bug）'
                },
                {
                    path: 'autoRenewal.enabled',
                    title: '自动续费',
                    description: '是否启用自动续费功能，允许用户设置服务器自动续费'
                },
                {
                    path: 'autoRenewal.notifyOnSuccess',
                    title: '续费成功通知',
                    description: '自动续费成功后是否发送通知给用户'
                },
                {
                    path: 'autoRenewal.notifyOnFailure',
                    title: '续费失败通知',
                    description: '自动续费失败后是否发送通知给用户'
                }
            ]
        },
        'integrations': {
            title: '第三方集成',
            features: [
                {
                    path: 'onebot.enabled',
                    title: 'QQ机器人',
                    description: '是否启用QQ机器人功能（OneBot协议）'
                },
                {
                    path: 'email.enabled',
                    title: '邮件功能',
                    description: '是否启用邮件功能，用于发送验证码和通知'
                },
                {
                    path: 'email.secure',
                    title: '邮件SSL加密',
                    description: '是否使用SSL加密连接SMTP服务器'
                }
            ]
        },
        'system': {
            title: '系统功能',
            features: [
                {
                    path: 'logging.enabled',
                    title: '日志记录',
                    description: '是否启用日志记录功能',
                    critical: true,
                    warning: '⚠️ 关闭后将无法记录系统日志'
                },
                {
                    path: 'logging.console',
                    title: '控制台日志',
                    description: '是否将日志输出到控制台'
                },
                {
                    path: 'logging.file',
                    title: '文件日志',
                    description: '是否将日志保存到文件'
                },
                {
                    path: 'server.ssl.enabled',
                    title: 'HTTPS/SSL',
                    description: '是否启用HTTPS加密连接（需要配置证书）'
                },
                {
                    path: 'server.proxy.enabled',
                    title: 'PROXY Protocol',
                    description: '是否启用PROXY Protocol支持（用于FRP等反向代理）'
                }
            ]
        }
    };

    // 显示消息
    function showMessage(msg, type) {
        featureMessage.textContent = msg;
        featureMessage.className = `message ${type}`;
        featureMessage.style.display = 'block';
        setTimeout(() => {
            featureMessage.style.display = 'none';
        }, 3000);
    }

    // 显示/隐藏加载遮罩
    function showLoading() {
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    // 发起API请求
    async function makeApiRequest(url, method = 'GET', body = null) {
        console.log('🔑 发送请求:', { url, method, token: token ? `${token.substring(0, 20)}...` : 'null' });
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        const options = { method, headers };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(url, options);
        console.log('📡 响应状态:', response.status);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ 请求失败:', errorData);
            throw new Error(errorData.msg || `API请求失败，状态码: ${response.status}`);
        }
        return response.json();
    }

    // 获取配置值
    function getConfigValue(config, path) {
        const keys = path.split('.');
        let value = config;
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        return value;
    }

    // 渲染功能开关
    function renderFeatures(config) {
        featuresContainer.innerHTML = '';

        for (const [sectionKey, section] of Object.entries(featureDefinitions)) {
            // 统计该分类的启用/禁用数量
            let enabledCount = 0;
            let disabledCount = 0;
            section.features.forEach(feature => {
                const enabled = getConfigValue(config, feature.path);
                if (enabled) {
                    enabledCount++;
                } else {
                    disabledCount++;
                }
            });

            // 创建分类标题
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'section-title';
            sectionTitle.innerHTML = `
                <span>${section.title}</span>
                <span class="section-stats">
                    <span class="stats-badge stats-enabled">${enabledCount} 已启用</span>
                    <span class="stats-badge stats-disabled">${disabledCount} 已禁用</span>
                </span>
            `;
            featuresContainer.appendChild(sectionTitle);

            // 创建功能卡片网格
            const grid = document.createElement('div');
            grid.className = 'feature-toggle-grid';

            section.features.forEach(feature => {
                const enabled = getConfigValue(config, feature.path);
                
                const card = document.createElement('div');
                card.className = 'feature-card' + (feature.critical ? ' critical' : '');
                
                card.innerHTML = `
                    <div class="feature-header">
                        <div class="feature-title">${feature.title}</div>
                        <label class="toggle-switch">
                            <input type="checkbox" ${enabled ? 'checked' : ''} data-path="${feature.path}">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="feature-description">${feature.description}</div>
                    <div class="feature-path">${feature.path}</div>
                    <div class="feature-status ${enabled ? 'status-enabled' : 'status-disabled'}">
                        ${enabled ? '✓ 已启用' : '✗ 已禁用'}
                    </div>
                `;

                // 绑定开关事件
                const toggle = card.querySelector('input[type="checkbox"]');
                toggle.addEventListener('change', async (e) => {
                    const newValue = e.target.checked;
                    const path = e.target.dataset.path;
                    
                    // 如果是关键功能且要关闭，显示确认对话框
                    if (feature.critical && !newValue) {
                        const confirmMsg = feature.warning || `确定要关闭 ${feature.title} 吗？这可能会影响系统功能。`;
                        if (!confirm(confirmMsg)) {
                            e.target.checked = true;
                            return;
                        }
                    }
                    
                    try {
                        showLoading();
                        const result = await makeApiRequest('/api/config/toggle', 'POST', {
                            path: path,
                            enabled: newValue
                        });

                        if (result.code === 0) {
                            showMessage(`✓ ${feature.title} 已${newValue ? '启用' : '禁用'}`, 'success');
                            // 更新状态显示
                            const statusEl = card.querySelector('.feature-status');
                            statusEl.className = `feature-status ${newValue ? 'status-enabled' : 'status-disabled'}`;
                            statusEl.textContent = newValue ? '✓ 已启用' : '✗ 已禁用';
                        } else {
                            showMessage(result.msg || '操作失败', 'error');
                            // 恢复开关状态
                            e.target.checked = !newValue;
                        }
                    } catch (error) {
                        showMessage(error.message, 'error');
                        // 恢复开关状态
                        e.target.checked = !newValue;
                    } finally {
                        hideLoading();
                    }
                });

                grid.appendChild(card);
            });

            featuresContainer.appendChild(grid);
        }
    }

    // 加载配置
    async function loadConfig() {
        try {
            const result = await makeApiRequest('/api/config/features');
            if (result.code === 0) {
                renderFeatures(result.data);
            } else {
                showMessage(result.msg || '加载配置失败', 'error');
            }
        } catch (error) {
            showMessage(error.message, 'error');
        }
    }

    // 初始化加载
    await loadConfig();
});

// 主题切换函数（与其他页面保持一致）
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// 页面加载时应用保存的主题
(function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();
