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
            <div id="user-detail-content">
                <!-- 详情内容将在这里显示 -->
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

    let allUsers = [];

    // 关闭详情面板
    closeDetailBtn.addEventListener('click', () => {
        userDetailContainer.style.display = 'none';
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
            cell.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;">😕 没有找到匹配的用户</div>';
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
                if (confirm(`⚠️ 危险操作警告！\n\n确定要删除用户 "${user.username}" 吗？\n\n此操作将：\n• 删除用户账号\n• 删除所有积分记录\n• 删除所有相关数据\n\n⚠️ 此操作不可恢复！`)) {
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
