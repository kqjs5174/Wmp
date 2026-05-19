// 完整的用户管理功能
// 使用方法：在 admin_panel.js 中替换 loadUserManagement 函数

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
        <div style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
            <input type="text" id="user-search" placeholder="搜索用户名..." style="padding: 10px; flex: 1; max-width: 400px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
            <select id="user-filter" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
                <option value="all">全部用户</option>
                <option value="active">正常用户</option>
                <option value="banned">已封禁</option>
            </select>
            <button id="create-user-btn" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                创建用户
            </button>
        </div>
        
        <table id="user-list-table">
            <thead>
                <tr>
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
                <label for="points-username">用户名:</label>
                <input type="text" id="points-username" required placeholder="输入用户名">
            </div>
            <div class="form-group">
                <label for="points-action">操作类型:</label>
                <select id="points-action" required>
                    <option value="add">+ 增加积分</option>
                    <option value="deduct">- 扣减积分</option>
                    <option value="set">⚙ 设置积分</option>
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
                <h3 style="margin: 0; color: #007bff;"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/></svg> 用户详情: <span id="detail-username"></span></h3>
                <button id="close-detail-btn" style="background: #6c757d; padding: 8px 16px;">× 关闭</button>
            </div>
            <div id="user-detail-content">
                <!-- 详情内容将在这里显示 -->
            </div>
        </div>

        <!-- 创建用户弹窗 -->
        <div id="create-user-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #eee;">
                    <h3 style="margin: 0; color: #28a745;">
                        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 6px;">
                            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                        </svg>
                        创建本地用户
                    </h3>
                    <button id="close-create-modal-btn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">× 关闭</button>
                </div>
                <form id="create-user-form">
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="create-username" style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                            用户名 <span style="color: #dc3545;">*</span>
                        </label>
                        <input type="text" id="create-username" required 
                               placeholder="3-20个字符，仅限字母、数字和下划线" 
                               style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                        <small style="color: #666; font-size: 12px;">用户名将用于登录系统</small>
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="create-password" style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                            密码 <span style="color: #dc3545;">*</span>
                        </label>
                        <input type="password" id="create-password" required 
                               placeholder="至少6个字符" 
                               style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                        <small style="color: #666; font-size: 12px;">密码将使用 bcrypt 加密存储</small>
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="create-email" style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                            邮箱 <span style="color: #999; font-weight: normal;">(可选)</span>
                        </label>
                        <input type="email" id="create-email" 
                               placeholder="user@example.com" 
                               style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="create-initial-points" style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                            初始积分 <span style="color: #999; font-weight: normal;">(可选)</span>
                        </label>
                        <input type="number" id="create-initial-points" min="0" value="0" 
                               placeholder="0" 
                               style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                        <small style="color: #666; font-size: 12px;">创建用户时赠送的积分数量</small>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 25px;">
                        <button type="submit" style="flex: 1; padding: 12px; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 15px; font-weight: 600; cursor: pointer;">
                            ✓ 创建用户
                        </button>
                        <button type="button" id="cancel-create-btn" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 4px; font-size: 15px; font-weight: 600; cursor: pointer;">
                            取消
                        </button>
                    </div>
                    <p id="create-user-message" class="message" style="margin-top: 15px;"></p>
                </form>
            </div>
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
    
    // 创建用户相关元素
    const createUserBtn = document.getElementById('create-user-btn');
    const createUserModal = document.getElementById('create-user-modal');
    const closeCreateModalBtn = document.getElementById('close-create-modal-btn');
    const cancelCreateBtn = document.getElementById('cancel-create-btn');
    const createUserForm = document.getElementById('create-user-form');
    const createUserMessage = document.getElementById('create-user-message');

    let allUsers = [];

    // 关闭详情面板
    closeDetailBtn.addEventListener('click', () => {
        userDetailContainer.style.display = 'none';
    });

    // 打开创建用户弹窗
    createUserBtn.addEventListener('click', () => {
        createUserModal.style.display = 'flex';
        createUserForm.reset();
        createUserMessage.textContent = '';
        createUserMessage.className = 'message';
    });

    // 关闭创建用户弹窗
    function closeCreateUserModal() {
        createUserModal.style.display = 'none';
        createUserForm.reset();
        createUserMessage.textContent = '';
    }

    closeCreateModalBtn.addEventListener('click', closeCreateUserModal);
    cancelCreateBtn.addEventListener('click', closeCreateUserModal);

    // 点击弹窗外部关闭
    createUserModal.addEventListener('click', (e) => {
        if (e.target === createUserModal) {
            closeCreateUserModal();
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
                    closeCreateUserModal();
                    fetchUsers();
                }, 2000);
            } else {
                showMessage(createUserMessage, result.msg || '创建失败', 'error');
            }
        } catch (error) {
            showMessage(createUserMessage, error.message, 'error');
        }
    });

    // 搜索和筛选
    userSearchInput.addEventListener('input', renderUserList);
    userFilterSelect.addEventListener('change', renderUserList);

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
            cell.colSpan = 7;
            cell.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;">没有找到匹配的用户</div>';
            return;
        }

        filteredUsers.forEach(user => {
            const row = userListTableBody.insertRow();
            
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
                if (confirm(`⚠ 危险操作警告！\n\n确定要删除用户 "${user.username}" 吗？\n\n此操作将：\n• 删除用户账号\n• 删除所有积分记录\n• 删除所有相关数据\n\n⚠ 此操作不可恢复！`)) {
                    if (confirm(`最后确认：真的要永久删除用户 "${user.username}" 吗？`)) {
                        try {
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
                            showMessage(userListMessage, error.message, 'error');
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
        detailContent.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 4px; animation: spin 1s linear infinite;"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg> 加载中...</p><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}</style>';
        userDetailContainer.style.display = 'block';
        userDetailContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
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
                            <p><strong>状态:</strong> ${user.status === 'banned' ? '<span style="color: #dc3545;">🚫 已封禁</span>' : '<span style="color: #28a745;">✓ 正常</span>'}</p>
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

    managePointsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideMessage(managePointsMessage);

        const username = document.getElementById('points-username').value.trim();
        const action = document.getElementById('points-action').value;
        const value = parseInt(document.getElementById('points-value').value);
        const reason = document.getElementById('points-reason').value.trim() || '管理员操作';

        if (!username) {
            showMessage(managePointsMessage, '请输入用户名', 'error');
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
