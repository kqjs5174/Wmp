// 配置
const CONFIG = {
    verifyApiUrl: '/api/verify_payment', // 后端验证接口
    getNextAmountUrl: '/api/get_next_amount', // 获取下一个可用金额
    heartbeatUrl: '/api/payment_heartbeat', // 心跳接口
    pollInterval: 3000, // 轮询间隔（毫秒）
    heartbeatInterval: 10000, // 心跳间隔（10秒）
    verificationWindow: 300 // 验证时间窗口（秒），5分钟
};

// 订单信息（从URL参数获取）
let orderInfo = {
    orderId: '',
    amount: 0,
    displayAmount: 0 // 实际显示的支付金额（金额模式可能递增）
};

// 全局状态
let currentMethod = 'amount'; // 当前选择的支付方式：amount（金额匹配）或 memo（备注匹配）
let verifyCode = ''; // 备注模式的验证码
let pollTimer = null; // 轮询定时器
let heartbeatTimer = null; // 心跳定时器
let isLoadingAmount = false; // 是否正在加载金额

// DOM 元素
const methodButtons = document.querySelectorAll('.method-btn');
const amountPanel = document.getElementById('amount-panel');
const memoPanel = document.getElementById('memo-panel');
const amountDisplayEl = document.getElementById('amount-display');
const memoCodeEl = document.getElementById('memo-code');
const memoAmountEl = document.getElementById('memo-amount');
const statusMessage = document.getElementById('statusMessage');
const countdownContainer = document.getElementById('countdownContainer');
const countdownTimer = document.getElementById('countdownTimer');
const memoHint = document.getElementById('memoHint');
const orderAmountEl = document.getElementById('order-amount');
const orderIdEl = document.getElementById('order-id');

// 倒计时相关
let countdownInterval = null;
let remainingTime = 0;

// 从URL获取参数
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        amount: params.get('amount'),
        orderId: params.get('order_id'),
        username: params.get('username') // 兼容旧版本
    };
}

// 生成订单号
function generateOrderId(username, amount) {
    const d = new Date();
    const ts = d.getFullYear().toString() +
        String(d.getMonth() + 1).padStart(2, '0') +
        String(d.getDate()).padStart(2, '0') +
        String(d.getHours()).padStart(2, '0') +
        String(d.getMinutes()).padStart(2, '0') +
        String(d.getSeconds()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return (username || 'guest') + '_' + ts + '_' + rand;
}

// 初始化
function init() {
    // 获取URL参数
    const urlParams = getUrlParams();
    
    // 验证必要参数
    if (!urlParams.amount || isNaN(parseFloat(urlParams.amount))) {
        showStatusMessage('错误：缺少有效的金额参数 (amount)', 'error');
        return;
    }
    
    // 如果没有订单号，自动生成一个
    if (!urlParams.orderId) {
        console.warn('缺少订单号，自动生成中...');
        urlParams.orderId = generateOrderId(urlParams.username, urlParams.amount);
        console.log('已生成订单号:', urlParams.orderId);
    }
    
    // 设置订单信息
    orderInfo.orderId = urlParams.orderId;
    orderInfo.amount = parseFloat(urlParams.amount);
    orderInfo.displayAmount = orderInfo.amount; // 初始显示金额等于订单金额
    
    console.log('订单信息:', orderInfo);
    
    // 更新页面显示
    updateOrderDisplay();
    
    // 生成验证数据
    generateVerificationData();
    
    // 获取下一个可用金额（仅金额模式需要）
    loadNextAmount().then(() => {
        // 绑定事件
        bindEvents();
        
        // 页面加载时立即启动倒计时和自动检测
        startPageCountdown();
    });
}

// 更新订单显示
function updateOrderDisplay() {
    // 更新订单金额显示（原始金额）
    if (orderAmountEl) {
        orderAmountEl.textContent = `¥${orderInfo.amount.toFixed(2)}`;
    }
    
    // 更新订单号显示
    if (orderIdEl) {
        orderIdEl.textContent = orderInfo.orderId;
    }
    
    // 更新金额匹配模式的显示（可能递增的金额）
    if (amountDisplayEl) {
        amountDisplayEl.textContent = `¥${orderInfo.displayAmount.toFixed(2)}`;
    }
    
    // 更新备注模式的金额显示（固定金额）
    if (memoAmountEl) {
        memoAmountEl.textContent = `¥${orderInfo.amount.toFixed(2)}`;
    }
}

// 加载下一个可用金额（金额匹配模式）
async function loadNextAmount() {
    if (isLoadingAmount) return;
    
    isLoadingAmount = true;
    showStatusMessage('正在检测可用金额...', 'info');
    
    try {
        const response = await fetch(`${CONFIG.getNextAmountUrl}?amount=${orderInfo.amount}&order_id=${encodeURIComponent(orderInfo.orderId)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            orderInfo.displayAmount = data.nextAmount;
            updateOrderDisplay();
            
            if (data.increment > 0) {
                console.log(`检测到金额冲突，已递增 +${data.increment} 元`);
                showStatusMessage(`检测到有人正在支付相同金额，已自动调整为 ¥${data.nextAmount.toFixed(2)}`, 'info');
                setTimeout(() => hideStatusMessage(), 3000);
            } else {
                console.log('金额可用，无需递增');
                hideStatusMessage();
            }
        } else {
            throw new Error(data.message || '获取金额失败');
        }
        
    } catch (error) {
        console.error('获取下一个金额失败:', error);
        // 失败时使用原始金额
        orderInfo.displayAmount = orderInfo.amount;
        updateOrderDisplay();
        showStatusMessage('金额检测失败，使用原始金额', 'info');
        setTimeout(() => hideStatusMessage(), 3000);
    } finally {
        isLoadingAmount = false;
    }
}

// 生成验证数据
function generateVerificationData() {
    // 生成4位随机验证码（用于备注模式）
    verifyCode = Math.floor(1000 + Math.random() * 9000).toString();
    memoCodeEl.textContent = verifyCode;

    console.log('验证数据已生成:', { amount: orderInfo.amount, verifyCode, orderId: orderInfo.orderId });
}

// 绑定事件
function bindEvents() {
    // 支付方式切换
    methodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const method = btn.dataset.method;
            switchMethod(method);
        });
    });
}

// 切换支付方式
function switchMethod(method) {
    currentMethod = method;

    // 更新按钮状态
    methodButtons.forEach(btn => {
        if (btn.dataset.method === method) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 切换面板
    if (method === 'amount') {
        amountPanel.classList.add('active');
        memoPanel.classList.remove('active');
        // 隐藏备注提示图片
        if (memoHint) {
            memoHint.classList.remove('show');
        }
    } else {
        amountPanel.classList.remove('active');
        memoPanel.classList.add('active');
        // 显示备注提示图片
        if (memoHint) {
            setTimeout(() => {
                memoHint.classList.add('show');
            }, 100);
        }
    }

    // 清除状态消息
    hideStatusMessage();
}

// 开始轮询
function startPolling() {
    pollTimer = setInterval(() => {
        checkPayment();
    }, CONFIG.pollInterval);

    // 立即执行一次
    checkPayment();
}

// 停止轮询
function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    // 同时停止倒计时和心跳
    stopCountdown();
    stopHeartbeat();
}

// 开始心跳
function startHeartbeat() {
    // 立即发送一次心跳
    sendHeartbeat();
    
    // 每10秒发送一次心跳
    heartbeatTimer = setInterval(() => {
        sendHeartbeat();
    }, CONFIG.heartbeatInterval);
}

// 停止心跳
function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}

// 发送心跳
async function sendHeartbeat() {
    try {
        const response = await fetch(`${CONFIG.heartbeatUrl}?order_id=${encodeURIComponent(orderInfo.orderId)}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
                console.log('心跳发送成功，订单剩余时间:', data.expiresIn, '秒');
            } else {
                console.warn('心跳响应异常:', data.message);
            }
        }
    } catch (error) {
        console.error('心跳发送失败:', error);
    }
}

// 检查支付状态
async function checkPayment() {
    try {
        if (remainingTime <= 0) {
            stopPolling();
            handlePaymentTimeout();
            return;
        }

        const requestBody = {
            orderId: orderInfo.orderId,
            amount: orderInfo.amount, // 使用原始订单金额
            method: currentMethod
        };

        // 备注模式需要传递验证码
        if (currentMethod === 'memo') {
            requestBody.verifyCode = verifyCode;
        }

        const response = await fetch(CONFIG.verifyApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('后端验证响应:', data);

        if (data.status === 'success') {
            stopPolling();
            handlePaymentSuccess(data.order);
        } else {
            console.log('后端状态:', data.message || '待处理');
        }

    } catch (error) {
        console.error('API 请求失败:', error);
        // 继续轮询
    }
}

// 启动倒计时
function startCountdown() {
    remainingTime = CONFIG.verificationWindow;
    countdownContainer.style.display = 'block';
    updateCountdownDisplay();
    
    countdownInterval = setInterval(() => {
        remainingTime--;
        updateCountdownDisplay();
        
        if (remainingTime <= 0) {
            stopCountdown();
        }
    }, 1000);
}

// 停止倒计时
function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    countdownContainer.style.display = 'none';
}

// 更新倒计时显示
function updateCountdownDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    countdownTimer.textContent = timeString;
    
    if (remainingTime <= 30) {
        countdownTimer.style.animation = 'blink 1s infinite';
    } else {
        countdownTimer.style.animation = 'none';
    }
}

// 页面加载时启动倒计时和自动检测
function startPageCountdown() {
    remainingTime = CONFIG.verificationWindow;
    countdownContainer.style.display = 'block';
    
    console.log('页面加载，倒计时开始，订单号:', orderInfo.orderId);
    
    showStatusMessage('正在自动检测支付，请完成支付...', 'info');
    updateCountdownDisplay();
    
    countdownInterval = setInterval(() => {
        remainingTime--;
        updateCountdownDisplay();
        
        if (remainingTime <= 0) {
            stopCountdown();
            stopPolling();
            stopHeartbeat();
            showStatusMessage('验证时间已过期，请刷新页面重新开始', 'error');
        }
    }, 1000);
    
    startPolling();
    startHeartbeat(); // 启动心跳
}

// 支付成功
function handlePaymentSuccess(orderData) {
    let message = '✓ 支付验证成功！订单已完成';
    
    // 如果实际支付金额与订单金额不同，显示提示
    if (orderData && orderData.actual_amount && orderData.actual_amount !== orderData.amount) {
        message += `\n实际支付: ¥${orderData.actual_amount.toFixed(2)}`;
    }
    
    showStatusMessage(message, 'success');
    console.log('支付成功，订单号:', orderInfo.orderId, '订单数据:', orderData);
    
    // 停止心跳
    stopHeartbeat();
}

// 支付超时
function handlePaymentTimeout() {
    showStatusMessage('检测超时，未找到匹配的支付记录', 'error');
    console.log('支付验证超时，订单号:', orderInfo.orderId);
}

// 显示状态消息
function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${type}`;
}

// 隐藏状态消息
function hideStatusMessage() {
    statusMessage.className = 'status-message';
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
