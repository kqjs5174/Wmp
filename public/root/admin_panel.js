document.addEventListener('DOMContentLoaded', async () => {
    const logoutButton = document.getElementById('logout-button');
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const authLoading = document.getElementById('auth-loading');
    const appContainer = document.getElementById('app');
    const pageTitle = document.getElementById('page-title');

    // Check for token and verify its validity
    const token = localStorage.getItem('root_token');
    if (!token) {
        console.warn('⛔ 未找到管理员令牌，重定向到登录页面');
        window.location.href = '/admin/index.html';
        return;
    }

    // Verify token validity by making a test API call
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
        
        // 验证成功，显示页面内容
        authLoading.style.display = 'none';
        appContainer.style.display = 'flex';
        
    } catch (error) {
        console.error('⛔ 验证令牌时发生错误:', error);
        // 网络错误时重定向到登录页
        window.location.href = '/admin/index.html';
        return;
    }

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('root_token');
        window.location.href = '/admin/index.html';
    });

    // 导航到指定页面
    function navigateToSection(targetId, updateHash = true) {
        // 验证页面ID是否有效
        const validSections = ['coupon-management', 'user-management', 'checkin-management', 'announcement-management', 'feature-toggle'];
        if (!validSections.includes(targetId)) {
            console.warn(`Invalid section: ${targetId}, redirecting to coupon-management`);
            targetId = 'coupon-management';
        }

        // 更新 URL hash（如果需要）
        if (updateHash) {
            const newHash = `#${targetId}`;
            if (window.location.hash !== newHash) {
                window.location.hash = newHash;
            }
        }

        // 更新侧边栏高亮
        navItems.forEach(item => {
            const itemPage = item.getAttribute('data-page');
            if (itemPage === targetId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // 显示/隐藏对应的管理区域
        pages.forEach(page => {
            if (page.id === targetId) {
                page.classList.add('active');
            } else {
                page.classList.remove('active');
            }
        });

        // 更新页面标题
        const titles = {
            'coupon-management': '兑换码管理',
            'user-management': '用户管理',
            'checkin-management': '签到管理',
            'announcement-management': '公告管理',
            'feature-toggle': '功能开关'
        };
        if (pageTitle) {
            pageTitle.textContent = titles[targetId] || '管理面板';
        }

        // 加载对应区域的内容
        if (targetId === 'coupon-management') {
            loadCouponManagement();
        } else if (targetId === 'user-management') {
            loadUserManagement();
        } else if (targetId === 'checkin-management') {
            loadCheckinManagement();
        } else if (targetId === 'announcement-management') {
            loadAnnouncementManagement();
        } else if (targetId === 'feature-toggle') {
            loadFeatureToggle();
        }
    }

    // 处理 hash 变化
    function handleHashChange() {
        const hash = window.location.hash.substring(1); // 去掉 '#'
        const targetId = hash || 'coupon-management'; // 默认显示兑换码管理
        navigateToSection(targetId, false); // updateHash=false 避免循环触发
    }

    // 绑定导航点击事件
    navItems.forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            const targetId = item.getAttribute('data-page');
            navigateToSection(targetId);
        });
    });

    // 监听 hash 变化（支持浏览器前进/后退）
    window.addEventListener('hashchange', handleHashChange);

    // 根据初始 hash 显示对应页面
    const initialHash = window.location.hash.substring(1);
    const initialSection = initialHash || 'coupon-management';
    navigateToSection(initialSection, false);

    // 如果没有 hash，设置默认 hash
    if (!initialHash) {
        window.location.hash = '#coupon-management';
    }

    // Helper function to make authenticated API requests
    async function makeApiRequest(url, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        const options = { method, headers };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(url, options);
        // 检查响应状态码，如果不是 200-299 范围，则抛出错误
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || `API请求失败，状态码: ${response.status}`);
        }
        return response.json();
    }

    // Helper function to display messages
    function showMessage(element, msg, type) {
        element.textContent = msg;
        element.className = `message ${type}`;
        element.style.display = 'block';
    }

    function hideMessage(element) {
        element.style.display = 'none';
        element.textContent = '';
    }

    // ============== 兑换码管理功能 ==============
    async function loadCouponManagement() {
        const couponManagementSection = document.getElementById('coupon-management');
        couponManagementSection.innerHTML = `
            <!-- 统计卡片 -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-card-value" id="total-coupons">0</div>
                    <div class="stat-card-label">总兑换码</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value" id="active-coupons" style="color: var(--success-color);">0</div>
                    <div class="stat-card-label">活跃</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value" id="exhausted-coupons" style="color: var(--warning-color);">0</div>
                    <div class="stat-card-label">已用完</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value" id="disabled-coupons" style="color: var(--error-color);">0</div>
                    <div class="stat-card-label">已禁用</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value" id="total-redeemed">0</div>
                    <div class="stat-card-label">总兑换次数</div>
                </div>
            </div>

            <!-- 创建兑换码表单 -->
            <div class="card">
                <h3>创建兑换码</h3>
                <form id="create-coupon-form">
                    <div class="form-group">
                        <label for="coupon-code">兑换码 (留空自动生成)</label>
                        <input type="text" id="coupon-code" placeholder="留空将自动生成">
                    </div>
                    <div class="form-group">
                        <label for="coupon-type">类型</label>
                        <select id="coupon-type" required>
                            <option value="points">积分</option>
                            <option value="days">续费天数</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="coupon-value">值</label>
                        <input type="number" id="coupon-value" required min="1" placeholder="输入数值">
                    </div>
                    <div class="form-group">
                        <label for="coupon-max-uses">最大使用次数 (0为无限)</label>
                        <input type="number" id="coupon-max-uses" value="1" min="0">
                    </div>
                    <div class="form-group">
                        <label for="coupon-expires-at">过期时间 (可选)</label>
                        <input type="datetime-local" id="coupon-expires-at">
                    </div>
                    <div class="form-group">
                        <label for="coupon-description">描述</label>
                        <input type="text" id="coupon-description" placeholder="兑换码用途说明">
                    </div>
                    <div class="form-group">
                        <label for="coupon-batch-count">批量创建数量 (1为单个)</label>
                        <input type="number" id="coupon-batch-count" value="1" min="1">
                    </div>
                    <button type="submit" class="btn btn-primary">创建兑换码</button>
                    <p id="create-coupon-message" class="message"></p>
                </form>
            </div>

            <!-- 兑换码列表 -->
            <div class="card">
                <h3>兑换码列表</h3>
                <table id="coupon-list-table">
                    <thead>
                        <tr>
                            <th>兑换码</th>
                            <th>类型</th>
                            <th>值</th>
                            <th>最大使用</th>
                            <th>已使用</th>
                            <th>过期时间</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Coupons will be loaded here -->
                    </tbody>
                </table>
            </div>
        `;

        const createCouponForm = document.getElementById('create-coupon-form');
        const createCouponMessage = document.getElementById('create-coupon-message');
        const couponListTableBody = document.querySelector('#coupon-list-table tbody');

        async function fetchCoupons() {
            const statsResult = await makeApiRequest('/api/coupon/stats');
            if (statsResult.code === 0) {
                document.getElementById('total-coupons').textContent = statsResult.data.total;
                document.getElementById('active-coupons').textContent = statsResult.data.active;
                document.getElementById('exhausted-coupons').textContent = statsResult.data.exhausted;
                document.getElementById('disabled-coupons').textContent = statsResult.data.disabled;
                document.getElementById('total-redeemed').textContent = statsResult.data.totalRedeemed;
            }

            const result = await makeApiRequest('/api/coupon/list');
            if (result.code === 0) {
                couponListTableBody.innerHTML = '';
                result.data.coupons.forEach(coupon => {
                    const row = couponListTableBody.insertRow();
                    row.insertCell().textContent = coupon.code;
                    row.insertCell().textContent = coupon.type === 'points' ? '积分' : '续费天数';
                    row.insertCell().textContent = coupon.value;
                    row.insertCell().textContent = coupon.maxUses === 0 ? '无限' : coupon.maxUses;
                    row.insertCell().textContent = coupon.usedCount;
                    row.insertCell().textContent = coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleString() : '永不';
                    row.insertCell().textContent = coupon.status;
                    
                    const actionsCell = row.insertCell();
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '删除';
                    deleteBtn.className = 'btn-danger';
                    deleteBtn.onclick = async () => {
                        if (confirm(`确定删除兑换码 ${coupon.code} 吗？`)) {
                            const deleteResult = await makeApiRequest('/api/coupon/delete', 'POST', { code: coupon.code });
                            if (deleteResult.code === 0) {
                                showMessage(createCouponMessage, '删除成功', 'success');
                                fetchCoupons();
                            } else {
                                showMessage(createCouponMessage, deleteResult.msg || '删除失败', 'error');
                            }
                        }
                    };
                    actionsCell.appendChild(deleteBtn);

                    const toggleStatusBtn = document.createElement('button');
                    toggleStatusBtn.textContent = coupon.status === 'active' ? '禁用' : '启用';
                    toggleStatusBtn.className = coupon.status === 'active' ? 'btn-secondary' : 'btn-success';
                    toggleStatusBtn.onclick = async () => {
                        const newStatus = coupon.status === 'active' ? 'disabled' : 'active';
                        const statusResult = await makeApiRequest('/api/coupon/status', 'POST', { code: coupon.code, status: newStatus });
                        if (statusResult.code === 0) {
                            showMessage(createCouponMessage, `${newStatus === 'active' ? '启用' : '禁用'}成功`, 'success');
                            fetchCoupons();
                        } else {
                            showMessage(createCouponMessage, statusResult.msg || '操作失败', 'error');
                        }
                    };
                    actionsCell.appendChild(toggleStatusBtn);
                });
            } else {
                showMessage(createCouponMessage, result.msg || '获取兑换码列表失败', 'error');
            }
        }

        createCouponForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            hideMessage(createCouponMessage);

            const code = document.getElementById('coupon-code').value;
            const type = document.getElementById('coupon-type').value;
            const value = parseInt(document.getElementById('coupon-value').value);
            const maxUses = parseInt(document.getElementById('coupon-max-uses').value);
            const expiresAt = document.getElementById('coupon-expires-at').value;
            const description = document.getElementById('coupon-description').value;
            const batchCount = parseInt(document.getElementById('coupon-batch-count').value);

            const couponData = {
                code: code || undefined,
                type,
                value,
                maxUses,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
                description
            };

            let result;
            if (batchCount > 1) {
                result = await makeApiRequest('/api/coupon/batch', 'POST', { ...couponData, count: batchCount });
            } else {
                result = await makeApiRequest('/api/coupon/create', 'POST', couponData);
            }

            if (result.code === 0) {
                showMessage(createCouponMessage, `成功创建 ${batchCount > 1 ? result.data.length : 1} 个兑换码`, 'success');
                createCouponForm.reset();
                fetchCoupons();
            } else {
                showMessage(createCouponMessage, result.msg || '创建失败', 'error');
            }
        });

        fetchCoupons();
    }

    // ============== 用户管理功能 ==============
    async function loadUserManagement() {
        const userManagementSection = document.getElementById('user-management');
        userManagementSection.innerHTML = `
            <!-- 用户统计 -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-card-value" id="total-users">0</div>
                    <div class="stat-card-label">总用户数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value" id="active-users" style="color: var(--success-color);">0</div>
                    <div class="stat-card-label">正常用户</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value" id="banned-users" style="color: var(--error-color);">0</div>
                    <div class="stat-card-label">已封禁</div>
                </div>
            </div>

            <!-- 用户列表 -->
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">用户列表</h3>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-secondary" id="import-mcsm-user-btn" style="display: flex; align-items: center; gap: 6px;">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                            </svg>
                            导入MCSM用户
                        </button>
                        <button class="btn btn-primary" id="create-user-btn" style="display: flex; align-items: center; gap: 6px;">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            </svg>
                            创建用户
                        </button>
                    </div>
                </div>
                <div style="margin-bottom: 15px; display: flex; gap: 10px;">
                    <input type="text" id="user-search" placeholder="搜索用户名..." style="flex: 1; max-width: 400px;">
                    <select id="user-filter">
                        <option value="all">全部用户</option>
                        <option value="active">正常用户</option>
                        <option value="banned">已封禁</option>
                    </select>
                </div>
                
                <table id="user-list-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;"><input type="checkbox" id="select-all-users"></th>
                            <th>用户名</th>
                            <th>用户ID</th>
                            <th>积分</th>
                            <th>状态</th>
                            <th>认证</th>
                            <th>创建时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Users will be loaded here -->
                    </tbody>
                </table>
                <p id="user-list-message" class="message"></p>
            </div>

            <!-- 用户详情弹窗 -->
            <div id="user-detail-modal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                            </svg>
                            用户详情: <span id="detail-username"></span>
                        </h3>
                        <button class="modal-close-btn" id="close-detail-modal">×</button>
                    </div>
                    <div class="modal-body" id="user-detail-content">
                        <!-- 用户详情内容将在这里动态加载 -->
                    </div>
                </div>
            </div>

            <!-- 积分管理弹窗 -->
            <div id="points-modal" class="modal-overlay points-modal">
                <div class="modal">
                    <div class="modal-header">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 9.511c.076.954.83 1.697 2.182 1.785V12h.6v-.709c1.4-.098 2.218-.846 2.218-1.932 0-.987-.626-1.496-1.745-1.76l-.473-.112V5.57c.6.068.982.396 1.074.85h1.052c-.076-.919-.864-1.638-2.126-1.716V4h-.6v.719c-1.195.117-2.01.836-2.01 1.853 0 .9.606 1.472 1.613 1.707l.397.098v2.034c-.615-.093-1.022-.43-1.114-.9H5.5zm2.177-2.166c-.59-.137-.91-.416-.91-.836 0-.47.345-.822.915-.925v1.76h-.005zm.692 1.193c.717.166 1.048.435 1.048.91 0 .542-.412.914-1.135.982V8.518l.087.02z"/>
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            </svg>
                            积分管理: <span id="points-username"></span>
                        </h3>
                        <button class="modal-close-btn" id="close-points-modal">×</button>
                    </div>
                    <div class="modal-body">
                        <!-- 当前积分显示 -->
                        <div class="points-current-display">
                            <div class="label">当前积分</div>
                            <div class="value" id="points-current-value">0</div>
                        </div>

                        <!-- 积分操作表单 -->
                        <form id="quick-points-form">
                            <div class="points-form-group">
                                <label for="points-action-select">操作类型</label>
                                <select id="points-action-select" required>
                                    <option value="add">+ 增加积分</option>
                                    <option value="deduct">- 扣减积分</option>
                                    <option value="set">⚙ 设置积分</option>
                                </select>
                            </div>
                            <div class="points-form-group">
                                <label for="points-value-input">积分数量</label>
                                <input type="number" id="points-value-input" required min="0" placeholder="输入积分数量">
                            </div>
                            <div class="points-form-group">
                                <label for="points-reason-input">操作原因</label>
                                <input type="text" id="points-reason-input" placeholder="例如：活动奖励、违规扣除等（可选）">
                            </div>
                            <p id="quick-points-message" class="message"></p>
                            <div class="points-action-buttons">
                                <button type="button" class="btn btn-secondary" id="cancel-points-btn">取消</button>
                                <button type="submit" class="btn btn-primary">确认操作</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- 导入 MCSM 用户弹窗 -->
            <div id="import-mcsm-modal" class="modal-overlay">
                <div class="modal" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                            </svg>
                            从 MCSManager 导入用户
                        </h3>
                        <button class="modal-close-btn" id="close-import-mcsm-modal">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="mcsm-users-loading" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                            <div class="spinner" style="margin: 0 auto 15px;"></div>
                            <p>正在加载 MCSM 用户列表...</p>
                        </div>
                        <div id="mcsm-users-content" style="display: none;">
                            <div style="margin-bottom: 15px; padding: 12px; background: var(--bg-secondary); border-radius: 6px; font-size: 13px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span><strong>MCSM 用户总数:</strong> <span id="mcsm-total-count">0</span></span>
                                    <span><strong>未导入:</strong> <span id="mcsm-not-imported-count" style="color: var(--primary-color);">0</span></span>
                                </div>
                                <div style="color: var(--text-secondary); font-size: 12px;">
                                    <strong>数据路径:</strong> <span id="mcsm-data-path"></span>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <input type="text" id="mcsm-user-search" placeholder="搜索 MCSM 用户名..." style="width: 100%;">
                            </div>

                            <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
                                <table id="mcsm-users-table" style="width: 100%; margin: 0;">
                                    <thead style="position: sticky; top: 0; background: var(--bg-primary); z-index: 1;">
                                        <tr>
                                            <th style="width: 40px;"></th>
                                            <th>用户名</th>
                                            <th>UUID</th>
                                            <th>邮箱</th>
                                            <th>注册时间</th>
                                            <th>状态</th>
                                        </tr>
                                    </thead>
                                    <tbody id="mcsm-users-tbody">
                                        <!-- MCSM 用户列表 -->
                                    </tbody>
                                </table>
                            </div>

                            <div class="form-group" style="margin-top: 20px;">
                                <label for="import-initial-points">
                                    初始积分 <span style="color: var(--text-secondary); font-weight: normal;">(可选)</span>
                                </label>
                                <input type="number" id="import-initial-points" min="0" value="0" placeholder="0">
                                <small style="color: var(--text-secondary); font-size: 12px; display: block; margin-top: 4px;">
                                    导入用户时赠送的积分数量
                                </small>
                            </div>

                            <p id="import-mcsm-message" class="message"></p>
                            <div class="points-action-buttons">
                                <button type="button" class="btn btn-secondary" id="cancel-import-mcsm-btn">取消</button>
                                <button type="button" class="btn btn-primary" id="confirm-import-mcsm-btn" disabled>
                                    ✓ 导入选中用户
                                </button>
                            </div>
                        </div>
                        <div id="mcsm-users-error" style="display: none; text-align: center; padding: 40px;">
                            <svg width="48" height="48" viewBox="0 0 16 16" fill="var(--error-color)" style="margin-bottom: 15px;">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                            </svg>
                            <p id="mcsm-error-message" style="color: var(--error-color); margin-bottom: 15px;"></p>
                            <button class="btn btn-secondary" id="retry-load-mcsm-btn">重试</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 创建用户弹窗 -->
            <div id="create-user-modal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            </svg>
                            创建本地用户
                        </h3>
                        <button class="modal-close-btn" id="close-create-user-modal">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="create-user-form">
                            <div class="form-group">
                                <label for="create-username">
                                    用户名 <span style="color: var(--error-color);">*</span>
                                </label>
                                <input type="text" id="create-username" required 
                                       placeholder="3-20个字符，仅限字母、数字和下划线">
                                <small style="color: var(--text-secondary); font-size: 12px; display: block; margin-top: 4px;">
                                    用户名将用于登录系统
                                </small>
                            </div>
                            <div class="form-group">
                                <label for="create-password">
                                    密码 <span style="color: var(--error-color);">*</span>
                                </label>
                                <input type="password" id="create-password" required 
                                       placeholder="至少6个字符">
                                <small style="color: var(--text-secondary); font-size: 12px; display: block; margin-top: 4px;">
                                    密码将使用 bcrypt 加密存储
                                </small>
                            </div>
                            <div class="form-group">
                                <label for="create-email">
                                    邮箱 <span style="color: var(--text-secondary); font-weight: normal;">(可选)</span>
                                </label>
                                <input type="email" id="create-email" 
                                       placeholder="user@example.com">
                            </div>
                            <div class="form-group">
                                <label for="create-initial-points">
                                    初始积分 <span style="color: var(--text-secondary); font-weight: normal;">(可选)</span>
                                </label>
                                <input type="number" id="create-initial-points" min="0" value="0" 
                                       placeholder="0">
                                <small style="color: var(--text-secondary); font-size: 12px; display: block; margin-top: 4px;">
                                    创建用户时赠送的积分数量
                                </small>
                            </div>
                            <p id="create-user-message" class="message"></p>
                            <div class="points-action-buttons">
                                <button type="button" class="btn btn-secondary" id="cancel-create-user-btn">取消</button>
                                <button type="submit" class="btn btn-primary">✓ 创建用户</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        const userListTableBody = document.querySelector('#user-list-table tbody');
        const userListMessage = document.getElementById('user-list-message');
        const userSearchInput = document.getElementById('user-search');
        const userFilterSelect = document.getElementById('user-filter');
        const userDetailModal = document.getElementById('user-detail-modal');
        const closeDetailModal = document.getElementById('close-detail-modal');
        const pointsModal = document.getElementById('points-modal');
        const closePointsModal = document.getElementById('close-points-modal');
        const cancelPointsBtn = document.getElementById('cancel-points-btn');
        const quickPointsForm = document.getElementById('quick-points-form');
        const quickPointsMessage = document.getElementById('quick-points-message');
        const selectAllCheckbox = document.getElementById('select-all-users');
        
        // 创建用户相关元素
        const createUserBtn = document.getElementById('create-user-btn');
        const createUserModal = document.getElementById('create-user-modal');
        const closeCreateUserModal = document.getElementById('close-create-user-modal');
        const cancelCreateUserBtn = document.getElementById('cancel-create-user-btn');
        const createUserForm = document.getElementById('create-user-form');
        const createUserMessage = document.getElementById('create-user-message');

        // 导入 MCSM 用户相关元素
        const importMcsmBtn = document.getElementById('import-mcsm-user-btn');
        const importMcsmModal = document.getElementById('import-mcsm-modal');
        const closeImportMcsmModal = document.getElementById('close-import-mcsm-modal');
        const cancelImportMcsmBtn = document.getElementById('cancel-import-mcsm-btn');
        const confirmImportMcsmBtn = document.getElementById('confirm-import-mcsm-btn');
        const mcsmUsersLoading = document.getElementById('mcsm-users-loading');
        const mcsmUsersContent = document.getElementById('mcsm-users-content');
        const mcsmUsersError = document.getElementById('mcsm-users-error');
        const mcsmUsersTbody = document.getElementById('mcsm-users-tbody');
        const mcsmUserSearch = document.getElementById('mcsm-user-search');
        const importMcsmMessage = document.getElementById('import-mcsm-message');
        const retryLoadMcsmBtn = document.getElementById('retry-load-mcsm-btn');

        let allUsers = [];
        let selectedUsers = new Set();
        let currentPointsUser = null; // 当前正在编辑积分的用户
        let mcsmUsers = []; // MCSM 用户列表
        let selectedMcsmUser = null; // 选中的 MCSM 用户

        // 打开导入 MCSM 用户弹窗
        importMcsmBtn.addEventListener('click', async () => {
            importMcsmModal.classList.add('active');
            selectedMcsmUser = null;
            confirmImportMcsmBtn.disabled = true;
            hideMessage(importMcsmMessage);
            await loadMcsmUsers();
        });

        // 关闭导入 MCSM 用户弹窗
        closeImportMcsmModal.addEventListener('click', () => {
            importMcsmModal.classList.remove('active');
        });

        cancelImportMcsmBtn.addEventListener('click', () => {
            importMcsmModal.classList.remove('active');
        });

        importMcsmModal.addEventListener('click', (e) => {
            if (e.target === importMcsmModal) {
                importMcsmModal.classList.remove('active');
            }
        });

        // 重试加载 MCSM 用户
        retryLoadMcsmBtn.addEventListener('click', loadMcsmUsers);

        // 加载 MCSM 用户列表
        async function loadMcsmUsers() {
            mcsmUsersLoading.style.display = 'block';
            mcsmUsersContent.style.display = 'none';
            mcsmUsersError.style.display = 'none';

            try {
                const result = await makeApiRequest('/api/admin/mcsm/users');
                
                if (result.code === 0) {
                    mcsmUsers = result.data.users;
                    document.getElementById('mcsm-total-count').textContent = result.data.total;
                    document.getElementById('mcsm-not-imported-count').textContent = result.data.notImported;
                    document.getElementById('mcsm-data-path').textContent = result.data.path;
                    
                    renderMcsmUsers();
                    mcsmUsersLoading.style.display = 'none';
                    mcsmUsersContent.style.display = 'block';
                } else {
                    throw new Error(result.msg || '加载失败');
                }
            } catch (error) {
                mcsmUsersLoading.style.display = 'none';
                mcsmUsersError.style.display = 'block';
                document.getElementById('mcsm-error-message').textContent = error.message;
            }
        }

        // 渲染 MCSM 用户列表
        function renderMcsmUsers() {
            const searchTerm = mcsmUserSearch.value.toLowerCase();
            const filteredUsers = mcsmUsers.filter(user => 
                user.username.toLowerCase().includes(searchTerm)
            );

            mcsmUsersTbody.innerHTML = '';

            if (filteredUsers.length === 0) {
                const row = mcsmUsersTbody.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 6;
                cell.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-secondary);">没有找到匹配的用户</div>';
                return;
            }

            filteredUsers.forEach(user => {
                const row = mcsmUsersTbody.insertRow();
                row.style.cursor = user.alreadyImported ? 'not-allowed' : 'pointer';
                row.style.opacity = user.alreadyImported ? '0.5' : '1';

                // 单选按钮
                const radioCell = row.insertCell();
                if (!user.alreadyImported) {
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = 'mcsm-user-select';
                    radio.value = user.uuid;
                    radio.addEventListener('change', () => {
                        selectedMcsmUser = user;
                        confirmImportMcsmBtn.disabled = false;
                    });
                    radioCell.appendChild(radio);
                } else {
                    radioCell.innerHTML = '<span style="color: var(--text-secondary);">✓</span>';
                }

                // 用户名
                const nameCell = row.insertCell();
                nameCell.textContent = user.username;
                nameCell.style.fontWeight = 'bold';

                // UUID
                const uuidCell = row.insertCell();
                const shortUuid = user.uuid.substring(0, 8) + '...';
                uuidCell.innerHTML = `<span title="${user.uuid}" style="font-size: 11px; color: var(--text-secondary); font-family: monospace;">${shortUuid}</span>`;

                // 邮箱
                const emailCell = row.insertCell();
                emailCell.textContent = user.email || '-';
                emailCell.style.fontSize = '13px';

                // 注册时间
                const timeCell = row.insertCell();
                timeCell.textContent = user.registerTime ? new Date(user.registerTime).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }) : '-';
                timeCell.style.fontSize = '13px';
                timeCell.style.color = 'var(--text-secondary)';

                // 状态
                const statusCell = row.insertCell();
                if (user.alreadyImported) {
                    statusCell.innerHTML = '<span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background: var(--bg-secondary); color: var(--text-secondary);">已导入</span>';
                } else if (!user.hasPassword) {
                    statusCell.innerHTML = '<span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #fff3cd; color: #856404;">⚠ 无密码</span>';
                } else {
                    statusCell.innerHTML = '<span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #d4edda; color: #155724;">可导入</span>';
                }

                // 点击行选中（仅未导入的用户）
                if (!user.alreadyImported) {
                    row.addEventListener('click', (e) => {
                        if (e.target.type !== 'radio') {
                            const radio = row.querySelector('input[type="radio"]');
                            if (radio) {
                                radio.checked = true;
                                selectedMcsmUser = user;
                                confirmImportMcsmBtn.disabled = false;
                            }
                        }
                    });
                }
            });
        }

        // MCSM 用户搜索
        mcsmUserSearch.addEventListener('input', renderMcsmUsers);

        // 确认导入 MCSM 用户
        confirmImportMcsmBtn.addEventListener('click', async () => {
            if (!selectedMcsmUser) {
                showMessage(importMcsmMessage, '请选择要导入的用户', 'error');
                return;
            }

            const initialPoints = parseInt(document.getElementById('import-initial-points').value) || 0;

            try {
                showMessage(importMcsmMessage, '正在导入用户...', 'info');
                confirmImportMcsmBtn.disabled = true;

                const result = await makeApiRequest('/api/admin/mcsm/import-user', 'POST', {
                    uuid: selectedMcsmUser.uuid,
                    initialPoints
                });

                if (result.code === 0) {
                    showMessage(importMcsmMessage, `✓ 用户 "${selectedMcsmUser.username}" 导入成功！${initialPoints > 0 ? ` 已赠送 ${initialPoints} 积分` : ''}`, 'success');
                    
                    // 2秒后关闭弹窗并刷新列表
                    setTimeout(() => {
                        importMcsmModal.classList.remove('active');
                        fetchUsers();
                    }, 2000);
                } else {
                    showMessage(importMcsmMessage, result.msg || '导入失败', 'error');
                    confirmImportMcsmBtn.disabled = false;
                }
            } catch (error) {
                showMessage(importMcsmMessage, error.message, 'error');
                confirmImportMcsmBtn.disabled = false;
            }
        });

        // 打开创建用户弹窗
        createUserBtn.addEventListener('click', () => {
            createUserModal.classList.add('active');
            createUserForm.reset();
            hideMessage(createUserMessage);
        });

        // 关闭创建用户弹窗
        closeCreateUserModal.addEventListener('click', () => {
            createUserModal.classList.remove('active');
            createUserForm.reset();
            hideMessage(createUserMessage);
        });

        cancelCreateUserBtn.addEventListener('click', () => {
            createUserModal.classList.remove('active');
            createUserForm.reset();
            hideMessage(createUserMessage);
        });

        // 点击弹窗外部关闭
        createUserModal.addEventListener('click', (e) => {
            if (e.target === createUserModal) {
                createUserModal.classList.remove('active');
                createUserForm.reset();
                hideMessage(createUserMessage);
            }
        });

        // 创建用户表单提交
        createUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('create-username').value.trim();
            const password = document.getElementById('create-password').value;
            const email = document.getElementById('create-email').value.trim();
            const initialPoints = parseInt(document.getElementById('create-initial-points').value) || 0;

            // 前端验证
            if (username.length < 3 || username.length > 20) {
                showMessage(createUserMessage, '用户名长度必须在3-20个字符之间', 'error');
                return;
            }

            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                showMessage(createUserMessage, '用户名只能包含字母、数字和下划线', 'error');
                return;
            }

            if (password.length < 6) {
                showMessage(createUserMessage, '密码长度至少6个字符', 'error');
                return;
            }

            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showMessage(createUserMessage, '邮箱格式不正确', 'error');
                return;
            }

            try {
                showMessage(createUserMessage, '正在创建用户...', 'info');
                
                const result = await makeApiRequest('/api/admin/users/create', 'POST', {
                    username,
                    password,
                    email,
                    initialPoints
                });

                if (result.code === 0) {
                    showMessage(createUserMessage, `✓ 用户创建成功！${initialPoints > 0 ? ` 已赠送 ${initialPoints} 积分` : ''}`, 'success');
                    
                    // 2秒后关闭弹窗并刷新列表
                    setTimeout(() => {
                        createUserModal.classList.remove('active');
                        createUserForm.reset();
                        hideMessage(createUserMessage);
                        fetchUsers();
                    }, 2000);
                } else {
                    showMessage(createUserMessage, result.msg || '创建失败', 'error');
                }
            } catch (error) {
                showMessage(createUserMessage, error.message, 'error');
            }
        });

        // 关闭用户详情弹窗
        closeDetailModal.addEventListener('click', () => {
            userDetailModal.classList.remove('active');
        });

        // 点击遮罩层关闭用户详情弹窗
        userDetailModal.addEventListener('click', (e) => {
            if (e.target === userDetailModal) {
                userDetailModal.classList.remove('active');
            }
        });

        // 关闭积分管理弹窗
        closePointsModal.addEventListener('click', () => {
            pointsModal.classList.remove('active');
            currentPointsUser = null;
        });

        cancelPointsBtn.addEventListener('click', () => {
            pointsModal.classList.remove('active');
            currentPointsUser = null;
        });

        // 点击遮罩层关闭积分管理弹窗
        pointsModal.addEventListener('click', (e) => {
            if (e.target === pointsModal) {
                pointsModal.classList.remove('active');
                currentPointsUser = null;
            }
        });

        // ESC 键关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (userDetailModal.classList.contains('active')) {
                    userDetailModal.classList.remove('active');
                }
                if (pointsModal.classList.contains('active')) {
                    pointsModal.classList.remove('active');
                    currentPointsUser = null;
                }
            }
        });

        userSearchInput.addEventListener('input', renderUserList);
        userFilterSelect.addEventListener('change', renderUserList);

        // 快速积分管理表单提交
        quickPointsForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            hideMessage(quickPointsMessage);

            if (!currentPointsUser) {
                showMessage(quickPointsMessage, '错误：未选择用户', 'error');
                return;
            }

            const action = document.getElementById('points-action-select').value;
            const value = parseInt(document.getElementById('points-value-input').value);
            const reason = document.getElementById('points-reason-input').value.trim() || '管理员操作';
            const username = currentPointsUser.username;

            if (value <= 0) {
                showMessage(quickPointsMessage, '积分数量必须大于0', 'error');
                return;
            }

            let url = '';
            let body = { username, reason };

            if (action === 'set') {
                url = '/api/points/set';
                body.points = value;
            } else if (action === 'add') {
                url = `/api/points/add?username=${encodeURIComponent(username)}&points=${value}&reason=${encodeURIComponent(reason)}`;
                body = null;
            } else if (action === 'deduct') {
                url = `/api/points/deduct?username=${encodeURIComponent(username)}&points=${value}&reason=${encodeURIComponent(reason)}`;
                body = null;
            }

            try {
                let result;
                if (action === 'add' || action === 'deduct') {
                    result = await makeApiRequest(url, 'GET');
                } else {
                    result = await makeApiRequest(url, 'POST', body);
                }

                if (result.code === 0) {
                    const actionText = action === 'set' ? '设置' : (action === 'add' ? '增加' : '扣减');
                    showMessage(quickPointsMessage, `✓ ${actionText}积分成功！当前积分: ${result.data.currentPoints}`, 'success');
                    
                    // 更新当前积分显示
                    document.getElementById('points-current-value').textContent = result.data.currentPoints;
                    
                    // 刷新用户列表
                    setTimeout(() => {
                        fetchUsers();
                        pointsModal.classList.remove('active');
                        currentPointsUser = null;
                        quickPointsForm.reset();
                        hideMessage(quickPointsMessage);
                    }, 1500);
                } else {
                    showMessage(quickPointsMessage, result.msg || '✗ 操作失败', 'error');
                }
            } catch (error) {
                showMessage(quickPointsMessage, error.message, 'error');
            }
        });

        // 全选/取消全选
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.user-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                if (e.target.checked) {
                    selectedUsers.add(cb.dataset.username);
                } else {
                    selectedUsers.delete(cb.dataset.username);
                }
            });
        });

        async function fetchUsers() {
            try {
                const result = await makeApiRequest('/api/users/points');
                if (result.code === 0) {
                    allUsers = result.data.users;
                    updateStats();
                    renderUserList();
                } else {
                    showMessage(userListMessage, result.msg || '获取用户列表失败', 'error');
                }
            } catch (error) {
                showMessage(userListMessage, error.message, 'error');
            }
        }

        function updateStats() {
            const total = allUsers.length;
            const active = allUsers.filter(u => u.status !== 'banned').length;
            const banned = allUsers.filter(u => u.status === 'banned').length;
            
            document.getElementById('total-users').textContent = total;
            document.getElementById('active-users').textContent = active;
            document.getElementById('banned-users').textContent = banned;
        }

        function renderUserList() {
            const searchTerm = userSearchInput.value.toLowerCase();
            const filterStatus = userFilterSelect.value;

            let filteredUsers = allUsers.filter(user => {
                const matchesSearch = user.username.toLowerCase().includes(searchTerm);
                const matchesFilter = filterStatus === 'all' || 
                                     (filterStatus === 'active' && user.status !== 'banned') ||
                                     (filterStatus === 'banned' && user.status === 'banned');
                return matchesSearch && matchesFilter;
            });

            userListTableBody.innerHTML = '';
            
            if (filteredUsers.length === 0) {
                const row = userListTableBody.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 8;
                cell.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;">没有找到匹配的用户</div>';
                return;
            }

            filteredUsers.forEach(user => {
                const row = userListTableBody.insertRow();
                
                // 复选框
                const checkboxCell = row.insertCell();
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'user-checkbox';
                checkbox.dataset.username = user.username;
                checkbox.checked = selectedUsers.has(user.username);
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedUsers.add(user.username);
                    } else {
                        selectedUsers.delete(user.username);
                    }
                });
                checkboxCell.appendChild(checkbox);
                
                // 用户名
                const nameCell = row.insertCell();
                nameCell.textContent = user.username;
                nameCell.style.fontWeight = 'bold';
                
                // 用户ID
                const idCell = row.insertCell();
                const shortId = user.id ? user.id.substring(0, 8) + '...' : 'N/A';
                idCell.innerHTML = `<span title="${user.id || 'N/A'}" style="font-size: 11px; color: #666; font-family: monospace;">${shortId}</span>`;
                
                // 积分
                const pointsCell = row.insertCell();
                pointsCell.innerHTML = `<span style="font-weight: bold; color: #007bff; font-size: 16px;">${user.totalPoints || 0}</span>`;
                
                // 状态
                const statusCell = row.insertCell();
                if (user.status === 'banned') {
                    statusCell.innerHTML = '<span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #f8d7da; color: #721c24;"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 2px;"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> 已封禁</span>';
                } else {
                    statusCell.innerHTML = '<span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #d4edda; color: #155724;">✓ 正常</span>';
                }
                
                // 认证方式
                const authCell = row.insertCell();
                const authType = user.authMethod === 'mcsm_bcrypt' ? 'MCSM' : '本地';
                authCell.innerHTML = `<span style="padding: 3px 8px; border-radius: 8px; font-size: 10px; background: #e7f3ff; color: #004085;">${authType}</span>`;
                
                // 创建时间
                const timeCell = row.insertCell();
                timeCell.textContent = user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) : 'N/A';
                timeCell.style.fontSize = '13px';
                timeCell.style.color = '#666';
                
                // 操作按钮
                const actionsCell = row.insertCell();
                actionsCell.style.whiteSpace = 'nowrap';
                
                // 查看详情按钮
                const detailBtn = document.createElement('button');
                detailBtn.innerHTML = '详情';
                detailBtn.style.backgroundColor = '#17a2b8';
                detailBtn.style.marginRight = '5px';
                detailBtn.style.fontSize = '13px';
                detailBtn.onclick = () => showUserDetail(user);
                actionsCell.appendChild(detailBtn);
                
                // 积分管理按钮
                const pointsBtn = document.createElement('button');
                pointsBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 2px;"><path d="M5.5 9.511c.076.954.83 1.697 2.182 1.785V12h.6v-.709c1.4-.098 2.218-.846 2.218-1.932 0-.987-.626-1.496-1.745-1.76l-.473-.112V5.57c.6.068.982.396 1.074.85h1.052c-.076-.919-.864-1.638-2.126-1.716V4h-.6v.719c-1.195.117-2.01.836-2.01 1.853 0 .9.606 1.472 1.613 1.707l.397.098v2.034c-.615-.093-1.022-.43-1.114-.9H5.5zm2.177-2.166c-.59-.137-.91-.416-.91-.836 0-.47.345-.822.915-.925v1.76h-.005zm.692 1.193c.717.166 1.048.435 1.048.91 0 .542-.412.914-1.135.982V8.518l.087.02z"/><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/></svg> 积分';
                pointsBtn.style.backgroundColor = '#28a745';
                pointsBtn.style.marginRight = '5px';
                pointsBtn.style.fontSize = '13px';
                pointsBtn.onclick = () => showPointsModal(user);
                actionsCell.appendChild(pointsBtn);
                
                // 封禁/解封按钮
                const banBtn = document.createElement('button');
                if (user.status === 'banned') {
                    banBtn.innerHTML = '✓ 解封';
                    banBtn.style.backgroundColor = '#28a745';
                } else {
                    banBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 2px;"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> 封禁';
                    banBtn.style.backgroundColor = '#ffc107';
                    banBtn.style.color = '#333';
                }
                banBtn.style.marginRight = '5px';
                banBtn.style.fontSize = '13px';
                banBtn.onclick = async () => {
                    const action = user.status === 'banned' ? 'unban' : 'ban';
                    const actionText = user.status === 'banned' ? '解封' : '封禁';
                    const warning = action === 'ban' ? '\n\n⚠ 封禁后该用户将无法登录系统！' : '';
                    
                    if (confirm(`确定${actionText}用户 "${user.username}" 吗？${warning}`)) {
                        try {
                            const result = await makeApiRequest(`/api/users/${action}`, 'POST', { 
                                username: user.username 
                            });
                            if (result.code === 0) {
                                showMessage(userListMessage, `✓ ${actionText}成功`, 'success');
                                fetchUsers();
                            } else {
                                showMessage(userListMessage, result.msg || `✗ ${actionText}失败`, 'error');
                            }
                        } catch (error) {
                            showMessage(userListMessage, error.message, 'error');
                        }
                    }
                };
                actionsCell.appendChild(banBtn);
                
                // 删除按钮
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '删除';
                deleteBtn.style.backgroundColor = '#dc3545';
                deleteBtn.style.fontSize = '13px';
                deleteBtn.onclick = async () => {
                    if (!user.id) {
                        showMessage(userListMessage, '× 无法删除：用户ID不存在', 'error');
                        return;
                    }
                    
                    if (confirm(`⚠ 危险操作警告！\n\n确定要删除用户 "${user.username}" 吗？\n\n此操作将：\n• 删除用户账号\n• 删除所有积分记录\n• 删除所有相关数据\n\n⚠ 此操作不可恢复！`)) {
                        if (confirm(`最后确认：真的要永久删除用户 "${user.username}" 吗？`)) {
                            try {
                                console.log('删除用户，ID:', user.id); // 调试信息
                                const result = await makeApiRequest('/api/users/delete', 'POST', { 
                                    id: user.id 
                                });
                                if (result.status === 'success') {
                                    showMessage(userListMessage, '✓ 删除成功', 'success');
                                    fetchUsers();
                                } else {
                                    showMessage(userListMessage, result.error || '✗ 删除失败', 'error');
                                }
                            } catch (error) {
                                showMessage(userListMessage, '× ' + error.message, 'error');
                            }
                        }
                    }
                };
                actionsCell.appendChild(deleteBtn);
            });
        }

        async function showUserDetail(user) {
            document.getElementById('detail-username').textContent = user.username;
            
            const detailContent = document.getElementById('user-detail-content');
            detailContent.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-light);"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 8px; animation: spin 1s linear infinite;"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg> 加载中...</p><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}</style>';
            
            // 显示弹窗
            userDetailModal.classList.add('active');
            
            try {
                const result = await makeApiRequest(`/api/users/points?username=${encodeURIComponent(user.username)}`);
                
                if (result.code === 0) {
                    const userData = result.data;
                    
                    let html = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 25px;">
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                                <h4 style="margin-top: 0; color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/><path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.266.266 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.71 12.71 0 0 1 1.01-.193 11.744 11.744 0 0 1-.51-.858 20.801 20.801 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 7.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z"/></svg> 基本信息</h4>
                                <p><strong>用户名:</strong> ${user.username}</p>
                                <p><strong>用户ID:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px; font-size: 12px;">${user.id || 'N/A'}</code></p>
                                <p><strong>状态:</strong> ${user.status === 'banned' ? '<span style="color: #dc3545;"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle;"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> 已封禁</span>' : '<span style="color: #28a745;">✓ 正常</span>'}</p>
                                <p><strong>认证方式:</strong> ${user.authMethod === 'mcsm_bcrypt' ? 'MCSM' : '本地'}</p>
                                <p><strong>创建时间:</strong> ${user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : 'N/A'}</p>
                            </div>
                            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px;">
                                <h4 style="margin-top: 0; color: #004085; border-bottom: 2px solid #b8daff; padding-bottom: 10px;"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M5.5 9.511c.076.954.83 1.697 2.182 1.785V12h.6v-.709c1.4-.098 2.218-.846 2.218-1.932 0-.987-.626-1.496-1.745-1.76l-.473-.112V5.57c.6.068.982.396 1.074.85h1.052c-.076-.919-.864-1.638-2.126-1.716V4h-.6v.719c-1.195.117-2.01.836-2.01 1.853 0 .9.606 1.472 1.613 1.707l.397.098v2.034c-.615-.093-1.022-.43-1.114-.9H5.5zm2.177-2.166c-.59-.137-.91-.416-.91-.836 0-.47.345-.822.915-.925v1.76h-.005zm.692 1.193c.717.166 1.048.435 1.048.91 0 .542-.412.914-1.135.982V8.518l.087.02z"/><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M8 13.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zm0 .5A6 6 0 1 0 8 2a6 6 0 0 0 0 12z"/></svg> 积分信息</h4>
                                <p><strong>当前积分:</strong> <span style="color: #007bff; font-size: 24px; font-weight: bold;">${userData.totalPoints || 0}</span></p>
                                <p><strong>累计充值:</strong> ¥${userData.totalAmount || 0}</p>
                                <p><strong>累计获得:</strong> ${userData.earnedPoints || 0} 积分</p>
                                <p><strong>累计消费:</strong> ${userData.totalDeducted || 0} 积分</p>
                                <p><strong>订单数量:</strong> ${userData.orderCount || 0}</p>
                            </div>
                        </div>
                        
                        <h4 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z"/><path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z"/></svg> 积分记录 (全部)</h4>
                        <div style="max-height: 350px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 6px; background: #fff;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="background: #f8f9fa; position: sticky; top: 0; z-index: 1;">
                                    <tr>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600;">时间</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600;">积分变动</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600;">原因</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600;">余额</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `;
                    
                    if (userData.deductHistory && userData.deductHistory.length > 0) {
                        const allHistory = [...userData.deductHistory].reverse();
                        allHistory.forEach((record, index) => {
                            const bgColor = index % 2 === 0 ? '#fff' : '#f8f9fa';
                            // 注意：数据库中负数表示增加，正数表示扣除
                            const isPositive = record.points < 0; // 负数是增加
                            const pointsColor = isPositive ? '#28a745' : '#dc3545';
                            const displayValue = -record.points; // 取反显示
                            const pointsPrefix = isPositive ? '+' : '-';
                            html += `
                                <tr style="background: ${bgColor}; border-bottom: 1px solid #eee;">
                                    <td style="padding: 10px; font-size: 13px;">${new Date(record.time).toLocaleString('zh-CN')}</td>
                                    <td style="padding: 10px; color: ${pointsColor}; font-weight: bold; font-size: 14px;">${pointsPrefix}${Math.abs(displayValue)}</td>
                                    <td style="padding: 10px; font-size: 13px;">${record.reason || '无'}</td>
                                    <td style="padding: 10px; font-weight: 600; color: #007bff; font-size: 14px;">${record.afterPoints}</td>
                                </tr>
                            `;
                        });
                    } else {
                        html += '<tr><td colspan="4" style="padding: 30px; text-align: center; color: #999;">暂无积分记录</td></tr>';
                    }
                    
                    html += `
                                </tbody>
                            </table>
                        </div>
                    `;
                    
                    detailContent.innerHTML = html;
                } else {
                    detailContent.innerHTML = '<p style="color: #dc3545; text-align: center; padding: 20px;">× 加载用户详情失败</p>';
                }
            } catch (error) {
                detailContent.innerHTML = `<p style="color: #dc3545; text-align: center; padding: 20px;">× 加载失败: ${error.message}</p>`;
            }
        }

        // 打开积分管理弹窗
        function showPointsModal(user) {
            currentPointsUser = user;
            document.getElementById('points-username').textContent = user.username;
            document.getElementById('points-current-value').textContent = user.totalPoints || 0;
            
            // 重置表单
            quickPointsForm.reset();
            hideMessage(quickPointsMessage);
            
            // 显示弹窗
            pointsModal.classList.add('active');
        }

        fetchUsers();
    }

    // ============== 公告管理功能 ==============
    async function loadAnnouncementManagement() {
        const announcementManagementSection = document.getElementById('announcement-management');
        announcementManagementSection.innerHTML = `
            <!-- 当前公告预览 -->
            <div class="card">
                <h3>当前公告预览</h3>
                <div id="current-announcement" style="border: 1px solid var(--border-color); padding: 20px; min-height: 120px; border-radius: 8px; background: var(--secondary-color);">
                    加载中...
                </div>
            </div>

            <!-- 编辑公告 -->
            <div class="card">
                <h3>编辑公告</h3>
                <form id="edit-announcement-form">
                    <div class="form-group">
                        <label for="announcement-content">公告内容 (支持 Markdown)</label>
                        <textarea id="announcement-content" rows="12" placeholder="输入公告内容，支持 Markdown 格式..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">保存公告</button>
                    <p id="edit-announcement-message" class="message"></p>
                </form>
            </div>
        `;

        const currentAnnouncementDiv = document.getElementById('current-announcement');
        const announcementContentTextarea = document.getElementById('announcement-content');
        const editAnnouncementForm = document.getElementById('edit-announcement-form');
        const editAnnouncementMessage = document.getElementById('edit-announcement-message');

        async function fetchAnnouncement() {
            const result = await makeApiRequest('/api/announcement');
            if (result.code === 0) {
                currentAnnouncementDiv.innerHTML = result.data.content ? marked.parse(result.data.content) : '<p style="color: var(--text-light); text-align: center;">暂无公告</p>';
                announcementContentTextarea.value = result.data.content || '';
            } else {
                showMessage(editAnnouncementMessage, result.msg || '获取公告失败', 'error');
            }
        }

        editAnnouncementForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            hideMessage(editAnnouncementMessage);

            const content = announcementContentTextarea.value;
            const result = await makeApiRequest('/api/announcement', 'POST', { content });

            if (result.code === 0) {
                showMessage(editAnnouncementMessage, '公告保存成功', 'success');
                fetchAnnouncement();
            } else {
                showMessage(editAnnouncementMessage, result.msg || '保存失败', 'error');
            }
        });

        fetchAnnouncement();
    }

    // ============== 签到管理功能 ==============
    async function loadCheckinManagement() {
        const checkinManagementSection = document.getElementById('checkin-management');
        checkinManagementSection.innerHTML = `
            <!-- 签到统计 -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-card-value" id="total-checkin-users">0</div>
                    <div class="stat-card-label">签到用户总数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value" id="today-checkins" style="color: var(--success-color);">0</div>
                    <div class="stat-card-label">今日签到人数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value" id="total-checkins" style="color: var(--warning-color);">0</div>
                    <div class="stat-card-label">累计签到次数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value" id="total-checkin-points">0</div>
                    <div class="stat-card-label">累计发放积分</div>
                </div>
            </div>

            <!-- 管理操作 -->
            <div class="card" style="background: linear-gradient(135deg, #fff3cd, #ffeaa7); border-color: var(--warning-color);">
                <h3>管理操作</h3>
                <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 15px;">
                    <button id="reset-checkin-btn" class="btn btn-secondary">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                        重置签到状态
                    </button>
                    <div style="flex: 1; color: var(--text-light); font-size: 0.9rem;">
                        <strong>重置说明：</strong>重置后所有用户可以重新签到，但历史数据会保留。
                    </div>
                </div>
                <div style="padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <button id="clear-checkin-btn" class="btn btn-danger">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                        清空所有签到数据
                    </button>
                    <span style="color: var(--error-color); font-size: 0.9rem; margin-left: 15px;">
                        <strong>危险操作：</strong>将永久删除所有签到数据！
                    </span>
                </div>
            </div>

            <!-- 用户签到列表 -->
            <div class="card">
                <h3>用户签到列表</h3>
                <div style="margin-bottom: 15px; display: flex; gap: 10px;">
                    <input type="text" id="checkin-search" placeholder="搜索用户名..." style="flex: 1; max-width: 400px;">
                    <select id="checkin-filter">
                        <option value="all">全部用户</option>
                        <option value="today">今日已签到</option>
                        <option value="not-today">今日未签到</option>
                    </select>
                </div>
                
                <table id="checkin-list-table">
                    <thead>
                        <tr>
                            <th>用户名</th>
                            <th>总签到次数</th>
                            <th>连续签到天数</th>
                            <th>最后签到日期</th>
                            <th>累计获得积分</th>
                            <th>今日状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Checkin data will be loaded here -->
                    </tbody>
                </table>
                <p id="checkin-list-message" class="message"></p>
            </div>

            <!-- 签到历史 -->
            <div id="checkin-history-container" class="card" style="display: none; border: 2px solid var(--primary-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid var(--border-color);">
                    <h3 style="margin: 0; color: var(--primary-color);">
                        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;">
                            <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z"/>
                            <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z"/>
                            <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z"/>
                        </svg>
                        签到历史: <span id="history-username"></span>
                    </h3>
                    <button id="close-history-btn" class="btn btn-secondary">× 关闭</button>
                </div>
                <div id="checkin-history-content"></div>
            </div>
        `;

        const checkinListTableBody = document.querySelector('#checkin-list-table tbody');
        const checkinListMessage = document.getElementById('checkin-list-message');
        const checkinSearchInput = document.getElementById('checkin-search');
        const checkinFilterSelect = document.getElementById('checkin-filter');
        const resetCheckinBtn = document.getElementById('reset-checkin-btn');
        const clearCheckinBtn = document.getElementById('clear-checkin-btn');
        const checkinHistoryContainer = document.getElementById('checkin-history-container');
        const closeHistoryBtn = document.getElementById('close-history-btn');

        let allCheckinUsers = [];

        closeHistoryBtn.addEventListener('click', () => {
            checkinHistoryContainer.style.display = 'none';
        });

        checkinSearchInput.addEventListener('input', renderCheckinList);
        checkinFilterSelect.addEventListener('change', renderCheckinList);

        // 重置签到状态
        resetCheckinBtn.addEventListener('click', async () => {
            if (confirm('确定要重置所有用户的签到状态吗？\n\n重置后：\n• 所有用户可以重新签到\n• 连续签到天数将清零\n• 历史数据（总签到次数、累计积分、签到记录）会保留\n\n是否继续？')) {
                try {
                    const result = await makeApiRequest('/api/admin/checkin/reset', 'POST');
                    if (result.code === 0) {
                        showMessage(checkinListMessage, `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 重置成功！已重置 ${result.data.affectedUsers} 个用户的签到状态`, 'success');
                        fetchCheckinData();
                    } else {
                        showMessage(checkinListMessage, result.msg || '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> 重置失败', 'error');
                    }
                } catch (error) {
                    showMessage(checkinListMessage, error.message, 'error');
                }
            }
        });

        // 清空所有签到数据
        clearCheckinBtn.addEventListener('click', async () => {
            if (confirm('⚠️ 危险操作警告！\n\n确定要清空所有签到数据吗？\n\n此操作将：\n• 删除所有用户的签到记录\n• 删除所有签到历史\n• 清空所有签到统计\n\n⚠️ 此操作不可恢复！（会自动备份）\n\n是否继续？')) {
                const confirmText = prompt('请输入 "CLEAR_ALL_CHECKIN_DATA" 以确认清空操作：');
                if (confirmText === 'CLEAR_ALL_CHECKIN_DATA') {
                    try {
                        const result = await makeApiRequest('/api/admin/checkin/clear', 'POST', { confirm: confirmText });
                        if (result.code === 0) {
                            showMessage(checkinListMessage, `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 清空成功！已删除 ${result.data.affectedUsers} 个用户的签到数据\n备份文件：${result.data.backupPath}`, 'success');
                            fetchCheckinData();
                        } else {
                            showMessage(checkinListMessage, result.msg || '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> 清空失败', 'error');
                        }
                    } catch (error) {
                        showMessage(checkinListMessage, error.message, 'error');
                    }
                } else if (confirmText !== null) {
                    showMessage(checkinListMessage, '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> 确认文本不正确，操作已取消', 'error');
                }
            }
        });

        async function fetchCheckinData() {
            try {
                // 获取统计数据
                const statsResult = await makeApiRequest('/api/admin/checkin/stats');
                if (statsResult.code === 0) {
                    document.getElementById('total-checkin-users').textContent = statsResult.data.totalUsers;
                    document.getElementById('today-checkins').textContent = statsResult.data.todayCheckins;
                    document.getElementById('total-checkins').textContent = statsResult.data.totalCheckins;
                    document.getElementById('total-checkin-points').textContent = statsResult.data.totalPoints;
                }

                // 获取用户列表
                const listResult = await makeApiRequest('/api/admin/checkin/list');
                if (listResult.code === 0) {
                    allCheckinUsers = listResult.data.users;
                    renderCheckinList();
                } else {
                    showMessage(checkinListMessage, listResult.msg || '获取签到列表失败', 'error');
                }
            } catch (error) {
                showMessage(checkinListMessage, error.message, 'error');
            }
        }

        function renderCheckinList() {
            const searchTerm = checkinSearchInput.value.toLowerCase();
            const filterStatus = checkinFilterSelect.value;

            let filteredUsers = allCheckinUsers.filter(user => {
                const matchesSearch = user.username.toLowerCase().includes(searchTerm);
                let matchesFilter = true;
                
                if (filterStatus === 'today') {
                    matchesFilter = user.hasCheckedInToday;
                } else if (filterStatus === 'not-today') {
                    matchesFilter = !user.hasCheckedInToday;
                }
                
                return matchesSearch && matchesFilter;
            });

            checkinListTableBody.innerHTML = '';
            
            if (filteredUsers.length === 0) {
                const row = checkinListTableBody.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 7;
                cell.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;">没有找到匹配的用户</div>';
                return;
            }

            filteredUsers.forEach(user => {
                const row = checkinListTableBody.insertRow();
                
                // 用户名
                const nameCell = row.insertCell();
                nameCell.textContent = user.username;
                nameCell.style.fontWeight = 'bold';
                
                // 总签到次数
                const totalCell = row.insertCell();
                totalCell.innerHTML = `<span style="font-weight: bold; color: #007bff; font-size: 16px;">${user.totalCheckins}</span>`;
                
                // 连续签到天数
                const continuousCell = row.insertCell();
                continuousCell.innerHTML = `<span style="font-weight: bold; color: #28a745; font-size: 16px;">${user.continuousDays}</span>`;
                
                // 最后签到日期
                const dateCell = row.insertCell();
                dateCell.textContent = user.lastCheckinDate || '从未签到';
                dateCell.style.fontSize = '13px';
                dateCell.style.color = '#666';
                
                // 累计获得积分
                const pointsCell = row.insertCell();
                pointsCell.innerHTML = `<span style="font-weight: bold; color: #ffc107; font-size: 16px;">${user.totalPoints}</span>`;
                
                // 今日状态
                const statusCell = row.insertCell();
                if (user.hasCheckedInToday) {
                    statusCell.innerHTML = '<span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #d4edda; color: #155724;"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 2px;"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已签到</span>';
                } else {
                    statusCell.innerHTML = '<span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #f8d7da; color: #721c24;"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 2px;"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg> 未签到</span>';
                }
                
                // 操作按钮
                const actionsCell = row.insertCell();
                actionsCell.style.whiteSpace = 'nowrap';
                
                // 查看历史按钮
                const historyBtn = document.createElement('button');
                historyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 2px;"><path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z"/><path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z"/><path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z"/></svg> 历史';
                historyBtn.style.backgroundColor = '#17a2b8';
                historyBtn.style.fontSize = '13px';
                historyBtn.onclick = () => showCheckinHistory(user.username);
                actionsCell.appendChild(historyBtn);
            });
        }

        async function showCheckinHistory(username) {
            document.getElementById('history-username').textContent = username;
            
            const historyContent = document.getElementById('checkin-history-content');
            historyContent.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">加载中...</p>';
            checkinHistoryContainer.style.display = 'block';
            checkinHistoryContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            try {
                const result = await makeApiRequest(`/api/admin/checkin/history?username=${encodeURIComponent(username)}`);
                
                if (result.code === 0) {
                    const data = result.data;
                    
                    let html = `
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 25px;">
                            <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 24px; font-weight: bold; color: #007bff;">${data.totalCheckins}</div>
                                <div style="color: #004085; margin-top: 5px; font-size: 13px;">总签到次数</div>
                            </div>
                            <div style="background: #d4edda; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 24px; font-weight: bold; color: #28a745;">${data.continuousDays}</div>
                                <div style="color: #155724; margin-top: 5px; font-size: 13px;">连续签到天数</div>
                            </div>
                            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 24px; font-weight: bold; color: #ffc107;">${data.totalPoints}</div>
                                <div style="color: #856404; margin-top: 5px; font-size: 13px;">累计获得积分</div>
                            </div>
                            <div style="background: #f8d7da; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 16px; font-weight: bold; color: #721c24;">${data.lastCheckinDate || '从未'}</div>
                                <div style="color: #721c24; margin-top: 5px; font-size: 13px;">最后签到日期</div>
                            </div>
                        </div>
                        
                        <h4 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px; margin-bottom: 15px;">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;">
                                <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z"/>
                                <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z"/>
                            </svg>
                            签到记录
                        </h4>
                        <div style="max-height: 400px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 6px; background: #fff;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="background: #f8f9fa; position: sticky; top: 0; z-index: 1;">
                                    <tr>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600;">日期</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600;">时间</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600;">获得积分</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600;">连续天数</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `;
                    
                    if (data.history && data.history.length > 0) {
                        const sortedHistory = [...data.history].reverse();
                        sortedHistory.forEach((record, index) => {
                            const bgColor = index % 2 === 0 ? '#fff' : '#f8f9fa';
                            const dateTime = new Date(record.time);
                            html += `
                                <tr style="background: ${bgColor}; border-bottom: 1px solid #eee;">
                                    <td style="padding: 10px; font-size: 13px; font-weight: 600;">${record.date}</td>
                                    <td style="padding: 10px; font-size: 13px; color: #666;">${dateTime.toLocaleTimeString('zh-CN')}</td>
                                    <td style="padding: 10px; color: #28a745; font-weight: bold; font-size: 14px;">+${record.points}</td>
                                    <td style="padding: 10px; color: #007bff; font-weight: 600; font-size: 14px;">${record.continuousDays} 天</td>
                                </tr>
                            `;
                        });
                    } else {
                        html += '<tr><td colspan="4" style="padding: 30px; text-align: center; color: #999;">暂无签到记录</td></tr>';
                    }
                    
                    html += `
                                </tbody>
                            </table>
                        </div>
                    `;
                    
                    historyContent.innerHTML = html;
                } else {
                    historyContent.innerHTML = '<p style="color: #dc3545; text-align: center; padding: 20px;">× 加载签到历史失败</p>';
                }
            } catch (error) {
                historyContent.innerHTML = `<p style="color: #dc3545; text-align: center; padding: 20px;">× 加载失败: ${error.message}</p>`;
            }
        }

        fetchCheckinData();
    }

    function showMessage(element, msg, type) {
        element.textContent = msg;
        element.className = `message ${type}`;
        element.style.display = 'block';
    }

    function hideMessage(element) {
        element.style.display = 'none';
        element.textContent = '';
    }
});


// ============== 主题切换功能 ==============
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// 页面加载时应用保存的主题
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

// 初始化主题
loadTheme();


    // ============== 功能开关管理 ==============
    async function loadFeatureToggle() {
        const featureToggleSection = document.getElementById('feature-toggle');
        
        // 获取token
        const featureToken = localStorage.getItem('root_token');
        if (!featureToken) {
            console.error('未找到管理员令牌');
            return;
        }
        
        // 本地API请求函数
        async function makeFeatureApiRequest(url, method = 'GET', body = null) {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${featureToken}`
            };
            const options = { method, headers };
            if (body) {
                options.body = JSON.stringify(body);
            }
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || `API请求失败，状态码: ${response.status}`);
            }
            return response.json();
        }
        
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
                        warning: '⚠️ 关闭后将无法访问管理面板！确定要关闭吗？'
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
                        warning: '⚠️ 关闭后将无法记录系统日志！确定要关闭吗？'
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

        featureToggleSection.innerHTML = `
            <style>
                .feature-toggle-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 20px;
                    margin-top: 20px;
                }
                
                .feature-card {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 20px;
                    transition: all 0.3s ease;
                    position: relative;
                }
                
                .feature-card:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    transform: translateY(-2px);
                }
                
                .feature-card.critical::before {
                    content: '⚠️';
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    font-size: 16px;
                    opacity: 0.6;
                }
                
                .feature-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .feature-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                
                .feature-description {
                    font-size: 14px;
                    color: var(--text-secondary);
                    margin-bottom: 15px;
                    line-height: 1.5;
                }
                
                .feature-path {
                    font-size: 12px;
                    color: var(--text-tertiary);
                    font-family: 'Courier New', monospace;
                    background: var(--bg-secondary);
                    padding: 4px 8px;
                    border-radius: 4px;
                    margin-bottom: 15px;
                    word-break: break-all;
                }
                
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 26px;
                }
                
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: 0.4s;
                    border-radius: 26px;
                }
                
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: 0.4s;
                    border-radius: 50%;
                }
                
                input:checked + .toggle-slider {
                    background-color: var(--primary-color);
                }
                
                input:checked + .toggle-slider:before {
                    transform: translateX(24px);
                }
                
                .feature-status {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                    margin-top: 10px;
                }
                
                .status-enabled {
                    background-color: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                }
                
                .status-disabled {
                    background-color: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }
                
                .section-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 30px 0 15px 0;
                    padding-bottom: 10px;
                    border-bottom: 2px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .section-stats {
                    font-size: 14px;
                    font-weight: 400;
                    color: var(--text-secondary);
                }
                
                .stats-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 12px;
                    margin-left: 8px;
                }
                
                .stats-enabled {
                    background-color: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                }
                
                .stats-disabled {
                    background-color: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }
                
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                
                .loading-content {
                    background: var(--card-bg);
                    padding: 30px;
                    border-radius: 12px;
                    text-align: center;
                }
            </style>
            
            <!-- 加载遮罩层 -->
            <div id="feature-loading-overlay" class="loading-overlay" style="display: none;">
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p>正在保存配置...</p>
                </div>
            </div>
            
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <p style="color: var(--text-secondary); margin: 0;">
                        在这里可以快速开启或关闭系统的各项功能。修改后会立即保存到配置文件中。
                    </p>
                    <button class="btn btn-primary" id="refresh-features-button" style="padding: 8px 16px;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-right:4px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        刷新配置
                    </button>
                </div>
                <p id="feature-message" class="message" style="display: none;"></p>
                
                <div id="features-container">
                    <!-- 功能开关将在这里动态加载 -->
                </div>
            </div>
        `;

        const featuresContainer = document.getElementById('features-container');
        const featureMessage = document.getElementById('feature-message');
        const loadingOverlay = document.getElementById('feature-loading-overlay');

        // 显示消息
        function showFeatureMessage(msg, type) {
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
                            const result = await makeFeatureApiRequest('/api/config/toggle', 'POST', {
                                path: path,
                                enabled: newValue
                            });

                            if (result.code === 0) {
                                showFeatureMessage(`✓ ${feature.title} 已${newValue ? '启用' : '禁用'}`, 'success');
                                // 更新状态显示
                                const statusEl = card.querySelector('.feature-status');
                                statusEl.className = `feature-status ${newValue ? 'status-enabled' : 'status-disabled'}`;
                                statusEl.textContent = newValue ? '✓ 已启用' : '✗ 已禁用';
                                
                                // 更新统计信息
                                if (newValue) {
                                    enabledCount++;
                                    disabledCount--;
                                } else {
                                    enabledCount--;
                                    disabledCount++;
                                }
                                sectionTitle.querySelector('.stats-enabled').textContent = `${enabledCount} 已启用`;
                                sectionTitle.querySelector('.stats-disabled').textContent = `${disabledCount} 已禁用`;
                            } else {
                                showFeatureMessage(result.msg || '操作失败', 'error');
                                // 恢复开关状态
                                e.target.checked = !newValue;
                            }
                        } catch (error) {
                            showFeatureMessage(error.message, 'error');
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
                const result = await makeFeatureApiRequest('/api/config/features');
                if (result.code === 0) {
                    renderFeatures(result.data);
                } else {
                    showFeatureMessage(result.msg || '加载配置失败', 'error');
                }
            } catch (error) {
                showFeatureMessage(error.message, 'error');
            }
        }

        // 绑定刷新按钮事件
        const refreshButton = document.getElementById('refresh-features-button');
        if (refreshButton) {
            refreshButton.addEventListener('click', async () => {
                showLoading();
                try {
                    await loadConfig();
                    showFeatureMessage('✓ 配置已刷新', 'success');
                } catch (error) {
                    showFeatureMessage('刷新失败: ' + error.message, 'error');
                } finally {
                    hideLoading();
                }
            });
        }

        // 初始化加载
        await loadConfig();
    }

