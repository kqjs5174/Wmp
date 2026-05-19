// 这个文件包含弹窗版本的 showUserDetail 函数
// 在 admin_panel.js 中引用此函数

async function showUserDetailModal(user, makeApiRequest, userDetailModal) {
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
                <div class="info-grid">
                    <div class="info-card">
                        <h4>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                            </svg>
                            基本信息
                        </h4>
                        <p><strong>用户名:</strong> ${user.username}</p>
                        <p><strong>用户ID:</strong> <code style="background: var(--secondary-color); padding: 2px 6px; border-radius: 3px; font-size: 11px; font-family: monospace;">${user.id || 'N/A'}</code></p>
                        <p><strong>状态:</strong> ${user.status === 'banned' ? '<span style="color: var(--error-color);">🚫 已封禁</span>' : '<span style="color: var(--success-color);">✓ 正常</span>'}</p>
                        <p><strong>认证方式:</strong> ${user.authMethod === 'mcsm_bcrypt' ? 'MCSM' : '本地'}</p>
                        <p><strong>创建时间:</strong> ${user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : 'N/A'}</p>
                    </div>
                    <div class="info-card" style="background: linear-gradient(135deg, #e7f3ff, #cfe7ff);">
                        <h4 style="color: #004085; border-color: #b8daff;">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 9.511c.076.954.83 1.697 2.182 1.785V12h.6v-.709c1.4-.098 2.218-.846 2.218-1.932 0-.987-.626-1.496-1.745-1.76l-.473-.112V5.57c.6.068.982.396 1.074.85h1.052c-.076-.919-.864-1.638-2.126-1.716V4h-.6v.719c-1.195.117-2.01.836-2.01 1.853 0 .9.606 1.472 1.613 1.707l.397.098v2.034c-.615-.093-1.022-.43-1.114-.9H5.5zm2.177-2.166c-.59-.137-.91-.416-.91-.836 0-.47.345-.822.915-.925v1.76h-.005zm.692 1.193c.717.166 1.048.435 1.048.91 0 .542-.412.914-1.135.982V8.518l.087.02z"/>
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            </svg>
                            积分信息
                        </h4>
                        <p><strong>当前积分:</strong> <span style="color: var(--primary-color); font-size: 24px; font-weight: bold;">${userData.totalPoints || 0}</span></p>
                        <p><strong>累计充值:</strong> ¥${userData.totalAmount || 0}</p>
                        <p><strong>累计获得:</strong> ${userData.earnedPoints || 0} 积分</p>
                        <p><strong>累计消费:</strong> ${userData.totalDeducted || 0} 积分</p>
                        <p><strong>订单数量:</strong> ${userData.orderCount || 0}</p>
                    </div>
                </div>
                
                <h4 style="color: var(--text-color); border-bottom: 2px solid var(--border-color); padding-bottom: 10px; margin-bottom: 15px;">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;">
                        <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z"/>
                        <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z"/>
                    </svg>
                    积分记录
                </h4>
                <div class="history-table-container">
                    <table class="history-table">
                        <thead>
                            <tr>
                                <th>时间</th>
                                <th>积分变动</th>
                                <th>原因</th>
                                <th>余额</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            if (userData.deductHistory && userData.deductHistory.length > 0) {
                const allHistory = [...userData.deductHistory].reverse();
                allHistory.forEach((record) => {
                    const isPositive = record.points < 0;
                    const pointsColor = isPositive ? 'var(--success-color)' : 'var(--error-color)';
                    const displayValue = -record.points;
                    const pointsPrefix = isPositive ? '+' : '-';
                    html += `
                        <tr>
                            <td style="font-size: 0.85rem;">${new Date(record.time).toLocaleString('zh-CN')}</td>
                            <td style="color: ${pointsColor}; font-weight: bold;">${pointsPrefix}${Math.abs(displayValue)}</td>
                            <td style="font-size: 0.85rem;">${record.reason || '无'}</td>
                            <td style="font-weight: 600; color: var(--primary-color);">${record.afterPoints}</td>
                        </tr>
                    `;
                });
            } else {
                html += '<tr><td colspan="4" style="padding: 30px; text-align: center; color: var(--text-light);">暂无积分记录</td></tr>';
            }
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            detailContent.innerHTML = html;
        } else {
            detailContent.innerHTML = '<p style="color: var(--error-color); text-align: center; padding: 40px;">× 加载用户详情失败</p>';
        }
    } catch (error) {
        detailContent.innerHTML = `<p style="color: var(--error-color); text-align: center; padding: 40px;">× 加载失败: ${error.message}</p>`;
    }
}
