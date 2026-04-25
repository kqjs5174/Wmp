document.addEventListener('DOMContentLoaded', async () => {
    const logoutButton = document.getElementById('logout-button');
    const sidebarLinks = document.querySelectorAll('.sidebar nav ul li a');
    const managementSections = document.querySelectorAll('.management-section');
    const authLoading = document.getElementById('auth-loading');
    const appContainer = document.getElementById('app');

    // Check for token and verify its validity
    const token = localStorage.getItem('root_token');
    if (!token) {
        console.warn('🚫 未找到管理员令牌，重定向到登录页面');
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
            console.warn('🚫 管理员令牌无效或已过期，重定向到登录页面');
            localStorage.removeItem('root_token');
            window.location.href = '/admin/index.html';
            return;
        }
        
        // 验证成功，显示页面内容
        authLoading.style.display = 'none';
        appContainer.style.display = 'flex';
        
    } catch (error) {
        console.error('🚫 验证令牌时发生错误:', error);
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
        const validSections = ['coupon-management', 'user-management', 'announcement-management', 'config-management'];
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
        sidebarLinks.forEach(link => {
            const linkTarget = link.getAttribute('href').substring(1);
            if (linkTarget === targetId) {
                link.parentElement.classList.add('active');
            } else {
                link.parentElement.classList.remove('active');
            }
        });

        // 显示/隐藏对应的管理区域
        managementSections.forEach(section => {
            if (section.id === targetId) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });

        // 加载对应区域的内容
        if (targetId === 'coupon-management') {
            loadCouponManagement();
        } else if (targetId === 'user-management') {
            loadUserManagement();
        } else if (targetId === 'announcement-management') {
            loadAnnouncementManagement();
        } else if (targetId === 'config-management') {
            loadConfigManagement();
        }
    }

    // 处理 hash 变化
    function handleHashChange() {
        const hash = window.location.hash.substring(1); // 去掉 '#'
        const targetId = hash || 'coupon-management'; // 默认显示兑换码管理
        navigateToSection(targetId, false); // updateHash=false 避免循环触发
    }

    // 绑定导航点击事件
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const targetId = link.getAttribute('href').substring(1); // Remove '#'
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
            <h2>兑换码管理</h2>
            <div class="coupon-stats">
                <p>总兑换码: <span id="total-coupons">0</span></p>
                <p>活跃: <span id="active-coupons">0</span></p>
                <p>已用完: <span id="exhausted-coupons">0</span></p>
                <p>已禁用: <span id="disabled-coupons">0</span></p>
                <p>总兑换次数: <span id="total-redeemed">0</span></p>
            </div>
            <h3>创建兑换码</h3>
            <form id="create-coupon-form">
                <div class="form-group">
                    <label for="coupon-code">兑换码 (留空自动生成):</label>
                    <input type="text" id="coupon-code">
                </div>
                <div class="form-group">
                    <label for="coupon-type">类型:</label>
                    <select id="coupon-type" required>
                        <option value="points">积分</option>
                        <option value="days">续费天数</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="coupon-value">值:</label>
                    <input type="number" id="coupon-value" required min="1">
                </div>
                <div class="form-group">
                    <label for="coupon-max-uses">最大使用次数 (0为无限):</label>
                    <input type="number" id="coupon-max-uses" value="1" min="0">
                </div>
                <div class="form-group">
                    <label for="coupon-expires-at">过期时间 (可选, YYYY-MM-DDTHH:MM):</label>
                    <input type="datetime-local" id="coupon-expires-at">
                </div>
                <div class="form-group">
                    <label for="coupon-description">描述:</label>
                    <input type="text" id="coupon-description">
                </div>
                <div class="form-group">
                    <label for="coupon-batch-count">批量创建数量 (1为单个):</label>
                    <input type="number" id="coupon-batch-count" value="1" min="1">
                </div>
                <button type="submit">创建</button>
                <p id="create-coupon-message" class="message"></p>
            </form>

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
            <h2>用户管理</h2>
            
            <div class="user-stats" style="display: flex; gap: 20px; margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <div style="flex: 1; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: #007bff;" id="total-users">0</div>
                    <div style="color: #666; margin-top: 5px;">总用户数</div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: #28a745;" id="active-users">0</div>
                    <div style="color: #666; margin-top: 5px;">正常用户</div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: #dc3545;" id="banned-users">0</div>
                    <div style="color: #666; margin-top: 5px;">已封禁</div>
                </div>
            </div>

            <h3>用户列表</h3>
            <div style="margin-bottom: 15px; display: flex; gap: 10px;">
                <input type="text" id="user-search" placeholder="🔍 搜索用户名..." style="padding: 10px; flex: 1; max-width: 400px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
                <select id="user-filter" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
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

            <h3>积分管理</h3>
            <form id="manage-points-form" style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <div class="form-group">
                    <label for="points-username">选择用户:</label>
                    <select id="points-username" required style="width: 100%;">
                        <option value="">-- 请选择用户 --</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="points-action">操作类型:</label>
                    <select id="points-action" required>
                        <option value="add">➕ 增加积分</option>
                        <option value="deduct">➖ 扣减积分</option>
                        <option value="set">⚙️ 设置积分</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="points-value">积分数量:</label>
                    <input type="number" id="points-value" required min="0" placeholder="输入积分数量">
                </div>
                <div class="form-group">
                    <label for="points-reason">操作原因:</label>
                    <input type="text" id="points-reason" placeholder="例如：活动奖励、违规扣除等（可选）">
                </div>
                <button type="submit">执行操作</button>
                <p id="manage-points-message" class="message"></p>
            </form>

            <div id="user-detail-container" style="display: none; background: #fff; padding: 25px; border-radius: 8px; margin-top: 30px; border: 2px solid #007bff; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #eee;">
                    <h3 style="margin: 0; color: #007bff;">👤 用户详情: <span id="detail-username"></span></h3>
                    <button id="close-detail-btn" style="background: #6c757d; padding: 8px 16px;">✖ 关闭</button>
                </div>
                <div id="user-detail-content"></div>
            </div>
        `;

        const userListTableBody = document.querySelector('#user-list-table tbody');
        const managePointsForm = document.getElementById('manage-points-form');
        const managePointsMessage = document.getElementById('manage-points-message');
        const userListMessage = document.getElementById('user-list-message');
        const userSearchInput = document.getElementById('user-search');
        const userFilterSelect = document.getElementById('user-filter');
        const userDetailContainer = document.getElementById('user-detail-container');
        const closeDetailBtn = document.getElementById('close-detail-btn');
        const selectAllCheckbox = document.getElementById('select-all-users');
        const pointsUsernameSelect = document.getElementById('points-username');

        let allUsers = [];
        let selectedUsers = new Set();

        closeDetailBtn.addEventListener('click', () => {
            userDetailContainer.style.display = 'none';
        });

        userSearchInput.addEventListener('input', renderUserList);
        userFilterSelect.addEventListener('change', renderUserList);

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
                    updateUserSelect();
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

        function updateUserSelect() {
            pointsUsernameSelect.innerHTML = '<option value="">-- 请选择用户 --</option>';
            allUsers.forEach(user => {
                const option = document.createElement('option');
                option.value = user.username;
                option.textContent = `${user.username} (积分: ${user.totalPoints || 0})`;
                pointsUsernameSelect.appendChild(option);
            });
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
                cell.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;">😕 没有找到匹配的用户</div>';
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
                    statusCell.innerHTML = '<span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #f8d7da; color: #721c24;">🚫 已封禁</span>';
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
                detailBtn.innerHTML = '📊 详情';
                detailBtn.style.backgroundColor = '#17a2b8';
                detailBtn.style.marginRight = '5px';
                detailBtn.style.fontSize = '13px';
                detailBtn.onclick = () => showUserDetail(user);
                actionsCell.appendChild(detailBtn);
                
                // 封禁/解封按钮
                const banBtn = document.createElement('button');
                if (user.status === 'banned') {
                    banBtn.innerHTML = '✓ 解封';
                    banBtn.style.backgroundColor = '#28a745';
                } else {
                    banBtn.innerHTML = '🚫 封禁';
                    banBtn.style.backgroundColor = '#ffc107';
                    banBtn.style.color = '#333';
                }
                banBtn.style.marginRight = '5px';
                banBtn.style.fontSize = '13px';
                banBtn.onclick = async () => {
                    const action = user.status === 'banned' ? 'unban' : 'ban';
                    const actionText = user.status === 'banned' ? '解封' : '封禁';
                    const warning = action === 'ban' ? '\n\n⚠️ 封禁后该用户将无法登录系统！' : '';
                    
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
                deleteBtn.innerHTML = '🗑️ 删除';
                deleteBtn.style.backgroundColor = '#dc3545';
                deleteBtn.style.fontSize = '13px';
                deleteBtn.onclick = async () => {
                    if (!user.id) {
                        showMessage(userListMessage, '❌ 无法删除：用户ID不存在', 'error');
                        return;
                    }
                    
                    if (confirm(`⚠️ 危险操作警告！\n\n确定要删除用户 "${user.username}" 吗？\n\n此操作将：\n• 删除用户账号\n• 删除所有积分记录\n• 删除所有相关数据\n\n⚠️ 此操作不可恢复！`)) {
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
                                showMessage(userListMessage, '❌ ' + error.message, 'error');
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
            detailContent.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">⏳ 加载中...</p>';
            userDetailContainer.style.display = 'block';
            userDetailContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            try {
                const result = await makeApiRequest(`/api/users/points?username=${encodeURIComponent(user.username)}`);
                
                if (result.code === 0) {
                    const userData = result.data;
                    
                    let html = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 25px;">
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                                <h4 style="margin-top: 0; color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">📋 基本信息</h4>
                                <p><strong>用户名:</strong> ${user.username}</p>
                                <p><strong>用户ID:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px; font-size: 12px;">${user.id || 'N/A'}</code></p>
                                <p><strong>状态:</strong> ${user.status === 'banned' ? '<span style="color: #dc3545;">🚫 已封禁</span>' : '<span style="color: #28a745;">✓ 正常</span>'}</p>
                                <p><strong>认证方式:</strong> ${user.authMethod === 'mcsm_bcrypt' ? 'MCSM' : '本地'}</p>
                                <p><strong>创建时间:</strong> ${user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : 'N/A'}</p>
                            </div>
                            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px;">
                                <h4 style="margin-top: 0; color: #004085; border-bottom: 2px solid #b8daff; padding-bottom: 10px;">💰 积分信息</h4>
                                <p><strong>当前积分:</strong> <span style="color: #007bff; font-size: 24px; font-weight: bold;">${userData.totalPoints || 0}</span></p>
                                <p><strong>累计充值:</strong> ¥${userData.totalAmount || 0}</p>
                                <p><strong>累计获得:</strong> ${userData.earnedPoints || 0} 积分</p>
                                <p><strong>累计消费:</strong> ${userData.totalDeducted || 0} 积分</p>
                                <p><strong>订单数量:</strong> ${userData.orderCount || 0}</p>
                            </div>
                        </div>
                        
                        <h4 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">📜 消费记录 (最近10条)</h4>
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
                        const recentHistory = userData.deductHistory.slice(-10).reverse();
                        recentHistory.forEach((record, index) => {
                            const bgColor = index % 2 === 0 ? '#fff' : '#f8f9fa';
                            html += `
                                <tr style="background: ${bgColor}; border-bottom: 1px solid #eee;">
                                    <td style="padding: 10px; font-size: 13px;">${new Date(record.time).toLocaleString('zh-CN')}</td>
                                    <td style="padding: 10px; color: #dc3545; font-weight: bold; font-size: 14px;">-${record.points}</td>
                                    <td style="padding: 10px; font-size: 13px;">${record.reason || '无'}</td>
                                    <td style="padding: 10px; font-weight: 600; color: #007bff; font-size: 14px;">${record.afterPoints}</td>
                                </tr>
                            `;
                        });
                    } else {
                        html += '<tr><td colspan="4" style="padding: 30px; text-align: center; color: #999;">😕 暂无消费记录</td></tr>';
                    }
                    
                    html += `
                                </tbody>
                            </table>
                        </div>
                    `;
                    
                    detailContent.innerHTML = html;
                } else {
                    detailContent.innerHTML = '<p style="color: #dc3545; text-align: center; padding: 20px;">❌ 加载用户详情失败</p>';
                }
            } catch (error) {
                detailContent.innerHTML = `<p style="color: #dc3545; text-align: center; padding: 20px;">❌ 加载失败: ${error.message}</p>`;
            }
        }

        managePointsForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            hideMessage(managePointsMessage);

            const username = pointsUsernameSelect.value;
            const action = document.getElementById('points-action').value;
            const value = parseInt(document.getElementById('points-value').value);
            const reason = document.getElementById('points-reason').value.trim() || '管理员操作';

            if (!username) {
                showMessage(managePointsMessage, '请选择用户', 'error');
                return;
            }

            if (value <= 0) {
                showMessage(managePointsMessage, '积分数量必须大于0', 'error');
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
                    showMessage(managePointsMessage, `✓ ${actionText}积分成功！当前积分: ${result.data.currentPoints}`, 'success');
                    managePointsForm.reset();
                    fetchUsers();
                } else {
                    showMessage(managePointsMessage, result.msg || '✗ 操作失败', 'error');
                }
            } catch (error) {
                showMessage(managePointsMessage, error.message, 'error');
            }
        });

        fetchUsers();
    }

    // ============== 公告管理功能 ==============
    async function loadAnnouncementManagement() {
        const announcementManagementSection = document.getElementById('announcement-management');
        announcementManagementSection.innerHTML = `
            <h2>公告管理</h2>
            <h3>当前公告</h3>
            <div id="current-announcement" style="border: 1px solid #ccc; padding: 10px; min-height: 100px; margin-bottom: 20px;">
                加载中...
            </div>
            <h3>编辑公告</h3>
            <form id="edit-announcement-form">
                <div class="form-group">
                    <label for="announcement-content">公告内容 (支持 Markdown):</label>
                    <textarea id="announcement-content" rows="10" style="width: 100%;"></textarea>
                </div>
                <button type="submit">保存公告</button>
                <p id="edit-announcement-message" class="message"></p>
            </form>
        `;

        const currentAnnouncementDiv = document.getElementById('current-announcement');
        const announcementContentTextarea = document.getElementById('announcement-content');
        const editAnnouncementForm = document.getElementById('edit-announcement-form');
        const editAnnouncementMessage = document.getElementById('edit-announcement-message');

        async function fetchAnnouncement() {
            const result = await makeApiRequest('/api/announcement');
            if (result.code === 0) {
                currentAnnouncementDiv.innerHTML = result.data.content ? marked.parse(result.data.content) : '暂无公告';
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

    function showMessage(element, msg, type) {
        element.textContent = msg;
        element.className = `message ${type}`;
        element.style.display = 'block';
    }

    function hideMessage(element) {
        element.style.display = 'none';
        element.textContent = '';
    }

    // ============== 配置管理功能 ==============
    async function loadConfigManagement() {
        const configManagementSection = document.getElementById('config-management');
        configManagementSection.innerHTML = `
            <h2>配置管理</h2>
            <p id="config-message" class="message"></p>
            <div id="config-forms-container">
                <!-- Config forms will be loaded here -->
            </div>
        `;

        const configMessage = document.getElementById('config-message');
        const configFormsContainer = document.getElementById('config-forms-container');

        // 定义需要管理的配置节
        const configSections = [
            'server', 'services', 'mcsm', 'renewal', 'auth', 'rootAdmin', 'cors',
            'customPlan', 'docker', 'checkin'
        ];

        // 遍历每个配置节，获取数据并生成表单
        for (const section of configSections) {
            try {
                const result = await makeApiRequest(`/api/config/get/${section}`);
                if (result.code === 0) {
                    renderConfigSection(section, result.data);
                } else {
                    showMessage(configMessage, `获取配置节 ${section} 失败: ${result.msg}`, 'error');
                }
            } catch (error) {
                showMessage(configMessage, `获取配置节 ${section} 异常: ${error.message}`, 'error');
            }
        }

        // 递归渲染配置项
        function renderConfigFields(container, data, prefix = '', depth = 0) {
            for (const key in data) {
                if (!Object.hasOwnProperty.call(data, key)) continue;
                
                const value = data[key];
                const fieldPath = prefix ? `${prefix}.${key}` : key;
                const fieldId = fieldPath.replace(/\./g, '-');
                
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // 嵌套对象 - 创建子分组
                    const nestedGroup = document.createElement('div');
                    nestedGroup.className = 'config-nested-group';
                    nestedGroup.style.marginLeft = `${depth * 20}px`;
                    
                    const groupTitle = document.createElement('div');
                    groupTitle.className = 'config-group-title';
                    groupTitle.textContent = key;
                    nestedGroup.appendChild(groupTitle);
                    
                    container.appendChild(nestedGroup);
                    
                    // 递归渲染子字段
                    renderConfigFields(nestedGroup, value, fieldPath, depth + 1);
                } else {
                    // 基本类型 - 创建输入框
                    const formGroup = document.createElement('div');
                    formGroup.className = 'form-group';
                    formGroup.style.marginLeft = `${depth * 20}px`;
                    
                    const label = document.createElement('label');
                    label.setAttribute('for', fieldId);
                    label.textContent = key + ':';
                    formGroup.appendChild(label);
                    
                    let inputElement;
                    
                    if (typeof value === 'boolean') {
                        inputElement = document.createElement('input');
                        inputElement.type = 'checkbox';
                        inputElement.id = fieldId;
                        inputElement.name = fieldPath;
                        inputElement.checked = value;
                        inputElement.dataset.type = 'boolean';
                    } else if (typeof value === 'number') {
                        inputElement = document.createElement('input');
                        inputElement.type = 'number';
                        inputElement.id = fieldId;
                        inputElement.name = fieldPath;
                        inputElement.value = value;
                        inputElement.dataset.type = 'number';
                        inputElement.step = 'any';
                    } else if (Array.isArray(value)) {
                        // 数组类型 - 使用 textarea 显示 JSON
                        inputElement = document.createElement('textarea');
                        inputElement.id = fieldId;
                        inputElement.name = fieldPath;
                        inputElement.rows = 3;
                        inputElement.value = JSON.stringify(value);
                        inputElement.dataset.type = 'array';
                        inputElement.placeholder = '输入 JSON 数组，如: ["item1", "item2"]';
                    } else if (typeof value === 'string' && (key.toLowerCase().includes('password') || key.toLowerCase().includes('apikey') || key.toLowerCase().includes('secret'))) {
                        inputElement = document.createElement('input');
                        inputElement.type = 'password';
                        inputElement.id = fieldId;
                        inputElement.name = fieldPath;
                        inputElement.value = value;
                        inputElement.dataset.type = 'string';
                        inputElement.placeholder = '留空则不修改';
                    } else {
                        inputElement = document.createElement('input');
                        inputElement.type = 'text';
                        inputElement.id = fieldId;
                        inputElement.name = fieldPath;
                        inputElement.value = value || '';
                        inputElement.dataset.type = 'string';
                    }
                    
                    formGroup.appendChild(inputElement);
                    container.appendChild(formGroup);
                }
            }
        }

        // 从表单数据重建配置对象
        function buildConfigObject(formData) {
            const result = {};
            
            for (const [path, value] of formData.entries()) {
                const element = document.querySelector(`[name="${path}"]`);
                const dataType = element?.dataset.type;
                
                let parsedValue;
                
                if (dataType === 'boolean') {
                    parsedValue = element.checked;
                } else if (dataType === 'number') {
                    parsedValue = parseFloat(value);
                    if (isNaN(parsedValue)) parsedValue = 0;
                } else if (dataType === 'array') {
                    try {
                        parsedValue = JSON.parse(value);
                        if (!Array.isArray(parsedValue)) {
                            throw new Error('不是有效的数组');
                        }
                    } catch (e) {
                        throw new Error(`字段 ${path} 的数组格式无效: ${e.message}`);
                    }
                } else {
                    parsedValue = value;
                }
                
                // 将路径转换为嵌套对象
                const keys = path.split('.');
                let current = result;
                
                for (let i = 0; i < keys.length - 1; i++) {
                    if (!current[keys[i]]) {
                        current[keys[i]] = {};
                    }
                    current = current[keys[i]];
                }
                
                current[keys[keys.length - 1]] = parsedValue;
            }
            
            return result;
        }

        function renderConfigSection(sectionName, configData) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-section-card';
            sectionDiv.innerHTML = `<h3>${sectionName} 配置</h3><form id="form-${sectionName}"></form><p id="message-${sectionName}" class="message"></p>`;
            configFormsContainer.appendChild(sectionDiv);

            const form = document.getElementById(`form-${sectionName}`);
            const messageElement = document.getElementById(`message-${sectionName}`);

            // 递归渲染所有配置字段
            renderConfigFields(form, configData);

            const submitButton = document.createElement('button');
            submitButton.type = 'submit';
            submitButton.textContent = '保存配置';
            form.appendChild(submitButton);

            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                hideMessage(messageElement);

                try {
                    const formData = new FormData(form);
                    const updatedConfig = buildConfigObject(formData);
                    
                    const saveResult = await makeApiRequest(`/api/config/save/${sectionName}`, 'POST', updatedConfig);
                    if (saveResult.code === 0) {
                        showMessage(messageElement, `配置节 ${sectionName} 保存成功！`, 'success');
                        // 重新加载该节的配置以显示最新状态
                        const refreshResult = await makeApiRequest(`/api/config/get/${sectionName}`);
                        if (refreshResult.code === 0) {
                            // 清空当前表单并重新渲染
                            sectionDiv.remove();
                            renderConfigSection(sectionName, refreshResult.data);
                        }
                    } else {
                        showMessage(messageElement, `保存配置节 ${sectionName} 失败: ${saveResult.msg}`, 'error');
                    }
                } catch (error) {
                    showMessage(messageElement, `保存配置异常: ${error.message}`, 'error');
                }
            });
        }
    }
});
