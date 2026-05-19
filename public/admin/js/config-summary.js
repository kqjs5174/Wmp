/**
 * 配置概要卡片 - 实时更新配置信息
 */

// 更新配置概要
function updateConfigSummary() {
    // 更新积分 - 从页面上的显示元素获取最新值
    const serverPointsEl = document.getElementById('server-user-points');
    const userPoints = serverPointsEl ? parseInt(serverPointsEl.textContent) || 0 : 0;
    
    const summaryPointsEl = document.getElementById('summary-user-points');
    if (summaryPointsEl) {
        summaryPointsEl.textContent = userPoints;
    }
    
    // 同时更新 currentUser 对象中的积分
    if (currentUser) {
        currentUser.points = userPoints;
    }
    
    // 更新套餐信息
    updateSummaryPlan();
    
    // 更新服务器信息
    updateSummaryServerInfo();
    
    // 更新总计和按钮状态
    updateSummaryTotal();
}

// 更新套餐信息
function updateSummaryPlan() {
    const planEl = document.getElementById('summary-plan');
    const memoryEl = document.getElementById('summary-memory');
    const cpuEl = document.getElementById('summary-cpu');
    const diskEl = document.getElementById('summary-disk');
    
    if (!selectedPlanId) {
        // 未选择套餐
        if (planEl) {
            planEl.textContent = '未选择';
            planEl.classList.add('empty');
            planEl.classList.remove('highlight');
        }
        if (memoryEl) {
            memoryEl.textContent = '-';
            memoryEl.classList.add('empty');
        }
        if (cpuEl) {
            cpuEl.textContent = '-';
            cpuEl.classList.add('empty');
        }
        if (diskEl) {
            diskEl.textContent = '-';
            diskEl.classList.add('empty');
        }
        return;
    }
    
    if (selectedPlanId === 'custom') {
        // 自定义套餐
        if (planEl) {
            planEl.textContent = '自定义配置';
            planEl.classList.remove('empty');
            planEl.classList.add('highlight');
        }
        
        const memory = document.getElementById('custom-memory')?.value || '2';
        const cpu = document.getElementById('custom-cpu')?.value || '2';
        const disk = document.getElementById('custom-disk')?.value || '10';
        
        if (memoryEl) {
            memoryEl.textContent = `${memory} GB`;
            memoryEl.classList.remove('empty');
        }
        if (cpuEl) {
            cpuEl.textContent = `${cpu} 核心`;
            cpuEl.classList.remove('empty');
        }
        if (diskEl) {
            diskEl.textContent = `${disk} GB`;
            diskEl.classList.remove('empty');
        }
    } else {
        // 普通套餐
        const plan = serverPlansData[selectedPlanId];
        if (plan) {
            if (planEl) {
                planEl.textContent = plan.name;
                planEl.classList.remove('empty');
                planEl.classList.add('highlight');
            }
            if (memoryEl) {
                // 内存：如果大于等于1024MB，转换为GB显示
                const memoryValue = plan.memory || 0;
                const memoryDisplay = memoryValue >= 1024 
                    ? `${(memoryValue / 1024).toFixed(1)} GB` 
                    : `${memoryValue} MB`;
                memoryEl.textContent = memoryDisplay;
                memoryEl.classList.remove('empty');
            }
            if (cpuEl) {
                // CPU：如果是百分比，转换为核心数（100% = 1核心）
                const cpuValue = plan.cpu || 0;
                const cpuDisplay = cpuValue >= 100 
                    ? `${(cpuValue / 100).toFixed(1)} 核心` 
                    : `${cpuValue}%`;
                cpuEl.textContent = cpuDisplay;
                cpuEl.classList.remove('empty');
            }
            if (diskEl) {
                diskEl.textContent = plan.disk ? `${plan.disk} GB` : '-';
                diskEl.classList.remove('empty');
            }
        }
    }
}

// 更新服务器信息
function updateSummaryServerInfo() {
    // 服务器名称
    const nameEl = document.getElementById('summary-name');
    const serverName = document.getElementById('server-name')?.value.trim();
    if (nameEl) {
        if (serverName) {
            nameEl.textContent = serverName;
            nameEl.classList.remove('empty');
        } else {
            nameEl.textContent = '未填写';
            nameEl.classList.add('empty');
        }
    }
    
    // Java版本
    const javaEl = document.getElementById('summary-java');
    if (javaEl) {
        if (selectedJavaVersion && dockerImagesData) {
            const image = dockerImagesData.find(img => img.id === selectedJavaVersion);
            if (image) {
                javaEl.textContent = image.name;
                javaEl.classList.remove('empty');
            } else {
                javaEl.textContent = '未选择';
                javaEl.classList.add('empty');
            }
        } else {
            javaEl.textContent = '未选择';
            javaEl.classList.add('empty');
        }
    }
    
    // 节点
    const daemonEl = document.getElementById('summary-daemon');
    if (daemonEl) {
        if (selectedDaemon && daemonsData) {
            const daemon = daemonsData.find(d => d.uuid === selectedDaemon);
            if (daemon) {
                daemonEl.textContent = daemon.remarks || daemon.ip || daemon.uuid;
                daemonEl.classList.remove('empty');
            } else {
                daemonEl.textContent = '自动选择';
                daemonEl.classList.add('empty');
            }
        } else {
            daemonEl.textContent = '自动选择';
            daemonEl.classList.add('empty');
        }
    }
}

// 更新总计和按钮状态
function updateSummaryTotal() {
    const totalEl = document.getElementById('summary-total-points');
    const warningEl = document.getElementById('summary-warning');
    const createBtn = document.getElementById('summary-create-btn');
    const oldCreateBtn = document.getElementById('create-server-btn');
    
    let totalPoints = 0;
    
    if (selectedPlanId === 'custom') {
        totalPoints = currentCustomPrice || 0;
    } else if (selectedPlanId && serverPlansData[selectedPlanId]) {
        totalPoints = serverPlansData[selectedPlanId].points || 0;
    }
    
    // 更新总计显示
    if (totalEl) {
        totalEl.textContent = totalPoints + ' 积分';
    }
    
    // 检查积分是否足够 - 从页面显示元素获取最新积分
    const serverPointsEl = document.getElementById('server-user-points');
    const userPoints = serverPointsEl ? parseInt(serverPointsEl.textContent) || 0 : 0;
    const isInsufficientPoints = totalPoints > userPoints;
    
    // 显示/隐藏警告
    if (warningEl) {
        if (isInsufficientPoints && totalPoints > 0) {
            warningEl.style.display = 'block';
        } else {
            warningEl.style.display = 'none';
        }
    }
    
    // 更新按钮状态
    const canCreate = selectedPlanId && !isInsufficientPoints && totalPoints > 0;
    
    if (createBtn) {
        createBtn.disabled = !canCreate;
    }
    if (oldCreateBtn) {
        oldCreateBtn.disabled = !canCreate;
    }
}

// 监听表单变化
function initConfigSummaryListeners() {
    // 监听服务器名称输入
    const serverNameInput = document.getElementById('server-name');
    if (serverNameInput) {
        serverNameInput.addEventListener('input', updateConfigSummary);
    }
    
    // 监听自定义配置输入
    const customInputs = ['custom-memory', 'custom-cpu', 'custom-disk', 'custom-ports', 'custom-duration'];
    customInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                updateConfigSummary();
                // 如果是自定义套餐，重新计算价格
                if (selectedPlanId === 'custom' && window.updateCustomPrice) {
                    window.updateCustomPrice();
                }
            });
        }
    });
    
    // 定期更新（确保数据同步）
    setInterval(updateConfigSummary, 1000);
}

// 导出函数
window.updateConfigSummary = updateConfigSummary;
window.initConfigSummaryListeners = initConfigSummaryListeners;

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConfigSummaryListeners);
} else {
    initConfigSummaryListeners();
}
