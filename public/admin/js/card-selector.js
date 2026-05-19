/**
 * 卡片选择器 - 替代下拉框的美观选择方式
 */

// 全局变量
let selectedJavaVersion = '';
let selectedDaemon = '';

/**
 * 渲染Java版本卡片选择器
 */
function renderJavaVersionCards() {
    const container = document.getElementById('java-version-selector');
    const selectElement = document.getElementById('server-java-version');
    
    if (!container || !dockerImagesData || dockerImagesData.length === 0) {
        return;
    }
    
    let html = '';
    
    dockerImagesData.forEach((image, index) => {
        const isRecommended = index === 0; // 第一个作为推荐
        const isSelected = image.id === selectedJavaVersion || (index === 0 && !selectedJavaVersion);
        
        html += `
            <div class="card-selector-item java-card ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}" 
                 onclick="selectJavaVersion('${image.id}')" 
                 data-image-id="${image.id}">
                <div class="java-icon">☕</div>
                <div class="card-selector-title">${image.name}</div>
                ${image.description ? `<div class="card-selector-desc">${image.description}</div>` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // 默认选中第一个
    if (!selectedJavaVersion && dockerImagesData.length > 0) {
        selectJavaVersion(dockerImagesData[0].id);
    }
}

/**
 * 选择Java版本
 */
function selectJavaVersion(imageId) {
    selectedJavaVersion = imageId;
    
    // 更新卡片选中状态
    document.querySelectorAll('.java-card').forEach(card => {
        card.classList.remove('selected');
    });
    const selectedCard = document.querySelector(`.java-card[data-image-id="${imageId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // 同步到隐藏的select元素
    const selectElement = document.getElementById('server-java-version');
    if (selectElement) {
        selectElement.value = imageId;
    }
    
    console.log('Selected Java version:', imageId);
}

/**
 * 渲染节点卡片选择器
 */
function renderDaemonCards() {
    const container = document.getElementById('daemon-selector');
    const selectElement = document.getElementById('server-daemon');
    
    if (!container) {
        return;
    }
    
    let html = '';
    
    // 自动选择选项
    const isAutoSelected = !selectedDaemon || selectedDaemon === '';
    html += `
        <div class="card-selector-item daemon-card ${isAutoSelected ? 'selected recommended' : ''}" 
             onclick="selectDaemon('')" 
             data-daemon-id="">
            <div class="card-selector-title">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                自动选择
            </div>
            <div class="card-selector-desc">系统自动为您选择最优节点</div>
            <div class="daemon-status">
                <span class="status-dot"></span>
                <span>智能分配</span>
            </div>
        </div>
    `;
    
    // 渲染可用节点
    if (daemonsData && daemonsData.length > 0) {
        daemonsData.forEach(daemon => {
            const isSelected = daemon.uuid === selectedDaemon;
            const daemonName = daemon.remarks || daemon.ip || daemon.uuid;
            const location = daemon.remarks || '未知位置';
            
            html += `
                <div class="card-selector-item daemon-card ${isSelected ? 'selected' : ''}" 
                     onclick="selectDaemon('${daemon.uuid}')" 
                     data-daemon-id="${daemon.uuid}">
                    <div class="card-selector-title">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                        </svg>
                        ${daemonName}
                    </div>
                    <div class="daemon-location">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        ${location}
                    </div>
                    <div class="daemon-status">
                        <span class="status-dot"></span>
                        <span>在线</span>
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
    
    // 默认选中自动选择
    if (!selectedDaemon) {
        selectDaemon('');
    }
}

/**
 * 选择节点
 */
function selectDaemon(daemonId) {
    selectedDaemon = daemonId;
    
    // 更新卡片选中状态
    document.querySelectorAll('.daemon-card').forEach(card => {
        card.classList.remove('selected');
    });
    const selectedCard = document.querySelector(`.daemon-card[data-daemon-id="${daemonId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // 同步到隐藏的select元素
    const selectElement = document.getElementById('server-daemon');
    if (selectElement) {
        selectElement.value = daemonId;
    }
    
    console.log('Selected daemon:', daemonId || 'auto');
}

/**
 * 初始化卡片选择器
 * 在加载完Docker镜像和节点数据后调用
 */
function initCardSelectors() {
    // 等待数据加载完成后渲染
    const checkInterval = setInterval(() => {
        if (dockerImagesData && dockerImagesData.length > 0) {
            renderJavaVersionCards();
        }
        
        // 节点数据可能为空（使用自动选择）
        renderDaemonCards();
        
        // 如果两个都已处理，清除定时器
        if (dockerImagesData && dockerImagesData.length > 0) {
            clearInterval(checkInterval);
        }
    }, 100);
    
    // 10秒后强制停止检查
    setTimeout(() => {
        clearInterval(checkInterval);
    }, 10000);
}

// 导出函数供全局使用
window.renderJavaVersionCards = renderJavaVersionCards;
window.renderDaemonCards = renderDaemonCards;
window.selectJavaVersion = selectJavaVersion;
window.selectDaemon = selectDaemon;
window.initCardSelectors = initCardSelectors;
