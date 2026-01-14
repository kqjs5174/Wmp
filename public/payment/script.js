// 配置
const CONFIG = {
    baseAmount: 1, // 默认基础金额（如果URL没有传入）
    queryApiUrl: '/query_payment', // 由服务器代理转发到 5001 后端
    successApiUrl: '/payment_success', // 支付成功回调
    pollInterval: 3000, // 轮询间隔（毫秒）
    maxPollTime: 60000, // 最大轮询时间（毫秒）
    decimalRange: { min: 1, max: 67 }, // 小数点范围 .01 到 .67
    verificationWindow: 300 // 验证时间窗口（秒），5分钟
};

// 订单信息（从URL参数获取）
let orderInfo = {
    orderId: '',
    amount: 0
};

// 全局状态
let currentMethod = 'decimal'; // 当前选择的支付方式
let verifyAmount = ''; // 小数点模式的验证金额
let verifyCode = ''; // 备注模式的验证码
let pollTimer = null; // 轮询定时器
let pollStartTime = 0; // 轮询开始时间

// DOM 元素
const methodButtons = document.querySelectorAll('.method-btn');
const decimalPanel = document.getElementById('decimal-panel');
const memoPanel = document.getElementById('memo-panel');
const decimalAmountEl = document.getElementById('decimal-amount');
const memoCodeEl = document.getElementById('memo-code');
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
        orderId: params.get('order_id')
    };
}

// 初始化
function init() {
    // 获取URL参数
    const urlParams = getUrlParams();
    
    // 验证必要参数
    if (!urlParams.orderId) {
        showStatusMessage('错误：缺少订单号参数 (order_id)', 'error');
        return;
    }
    
    if (!urlParams.amount || isNaN(parseFloat(urlParams.amount))) {
        showStatusMessage('错误：缺少有效的金额参数 (amount)', 'error');
        return;
    }
    
    // 设置订单信息
    orderInfo.orderId = urlParams.orderId;
    orderInfo.amount = parseFloat(urlParams.amount);
    
    console.log('订单信息:', orderInfo);
    
    // 更新页面显示
    updateOrderDisplay();
    
    // 生成验证数据
    generateVerificationData();
    
    // 绑定事件
    bindEvents();
    
    // 页面加载时立即启动倒计时和自动检测
    startPageCountdown();
}

// 更新订单显示
function updateOrderDisplay() {
    // 更新订单金额显示
    if (orderAmountEl) {
        orderAmountEl.textContent = `¥${orderInfo.amount.toFixed(2)}`;
    }
    
    // 更新订单号显示
    if (orderIdEl) {
        orderIdEl.textContent = orderInfo.orderId;
    }
    
    // 更新备注模式的金额显示
    const memoAmountText = document.querySelector('#memo-panel .instruction-text');
    if (memoAmountText) {
        memoAmountText.innerHTML = `支付金额：¥${orderInfo.amount.toFixed(2)}<br>请在微信支付备注中填写上方验证码`;
    }
}

// 生成验证数据
function generateVerificationData() {
    // 小数点验证金额：基于订单金额 + 随机小数
    // 使用递增模式：从.01开始，每次成功后加0.01
    let currentDecimal = parseInt(localStorage.getItem('currentDecimal') || '1');
    
    // 如果超过最大值，重置为最小值
    if (currentDecimal > CONFIG.decimalRange.max) {
        currentDecimal = CONFIG.decimalRange.min;
    }
    
    // 验证金额 = 订单金额 + 小数部分
    const baseAmount = Math.floor(orderInfo.amount); // 取整数部分
    verifyAmount = `${baseAmount}.${currentDecimal.toString().padStart(2, '0')}`;
    decimalAmountEl.textContent = `¥${verifyAmount}`;

    // 生成4位随机验证码
    verifyCode = Math.floor(1000 + Math.random() * 9000).toString();
    memoCodeEl.textContent = verifyCode;

    console.log('验证数据已生成:', { verifyAmount, verifyCode, currentDecimal, orderId: orderInfo.orderId });
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
    if (method === 'decimal') {
        decimalPanel.classList.add('active');
        memoPanel.classList.remove('active');
        // 隐藏备注提示图片
        if (memoHint) {
            memoHint.classList.remove('show');
        }
    } else {
        decimalPanel.classList.remove('active');
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
    // 同时停止倒计时
    stopCountdown();
}

// 检查支付状态
async function checkPayment() {
    try {
        // 检查倒计时是否结束
        if (remainingTime <= 0) {
            stopPolling();
            handlePaymentTimeout();
            return;
        }

        // 请求 API
        const response = await fetch(CONFIG.queryApiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API 响应:', data);

        // 检查响应状态
        if (data.status !== 'success' || !data.records || data.records.length === 0) {
            console.log('暂无支付记录');
            return;
        }

        // 验证支付
        const isValid = verifyPayment(data.records);
        
        if (isValid) {
            stopPolling();
            // 调用支付成功回调
            await notifyPaymentSuccess();
            handlePaymentSuccess();
        }

    } catch (error) {
        console.error('API 请求失败:', error);
        // 继续轮询，不中断
    }
}

// 通知支付成功（调用回调API）
async function notifyPaymentSuccess() {
    try {
        const callbackUrl = `${CONFIG.successApiUrl}?order_id=${encodeURIComponent(orderInfo.orderId)}&amount=${orderInfo.amount}`;
        
        console.log('调用支付成功回调:', callbackUrl);
        
        const response = await fetch(callbackUrl, {
            method: 'GET' // 或者 POST，根据你的API要求
        });
        
        if (!response.ok) {
            console.error('回调API响应错误:', response.status);
        } else {
            const result = await response.json().catch(() => ({}));
            console.log('回调API响应:', result);
        }
    } catch (error) {
        console.error('调用回调API失败:', error);
        // 即使回调失败，也继续显示成功（因为支付已经验证成功）
    }
}

// 验证支付
function verifyPayment(records) {
    // 获取验证开始时间戳
    const startTimestamp = window.verificationStartTimestamp || 0;
    // 计算验证结束时间戳（开始时间 + 时间窗口）
    const endTimestamp = startTimestamp + CONFIG.verificationWindow;
    
    if (currentMethod === 'decimal') {
        // 小数点模式：先检查金额，再检查时间戳
        return records.some(record => {
            // 1. 首先检查金额是否匹配
            const actualAmount = parseFloat(record.actual_amount);
            const expectedAmount = parseFloat(verifyAmount);
            const amountMatch = Math.abs(actualAmount - expectedAmount) < 0.001;
            
            if (!amountMatch) {
                return false;
            }
            
            // 2. 金额匹配后，再检查时间戳
            const recordTimestamp = parseRecordTimestamp(record);
            const allowedEarlyTime = startTimestamp - 30;
            
            if (recordTimestamp < allowedEarlyTime) {
                console.log('金额匹配但时间太早，跳过旧记录');
                return false;
            }
            
            if (recordTimestamp > endTimestamp) {
                console.log('金额匹配但超出时间窗口');
                return false;
            }
            
            console.log('小数点验证成功:', { expected: expectedAmount, actual: actualAmount });
            return true;
        });
    } else {
        // 备注模式：先检查备注，再检查时间戳
        return records.some(record => {
            const userMemo = record.user_memo || '';
            const memoMatch = userMemo.includes(verifyCode);
            
            if (!memoMatch) {
                return false;
            }
            
            const recordTimestamp = parseRecordTimestamp(record);
            const allowedEarlyTime = startTimestamp - 30;
            
            if (recordTimestamp < allowedEarlyTime) {
                console.log('备注匹配但时间太早，跳过旧记录');
                return false;
            }
            
            if (recordTimestamp > endTimestamp) {
                console.log('备注匹配但超出时间窗口');
                return false;
            }
            
            console.log('备注验证成功:', { expected: verifyCode, actual: userMemo });
            return true;
        });
    }
}

// 解析记录的时间戳
function parseRecordTimestamp(record) {
    if (record.payment_time) {
        try {
            const dateStr = record.payment_time.replace(/-/g, '/');
            const timestamp = Math.floor(new Date(dateStr).getTime() / 1000);
            if (!isNaN(timestamp)) {
                return timestamp;
            }
        } catch (e) {
            console.warn('解析 payment_time 失败:', e);
        }
    }
    
    if (record.timestamp) {
        return parseInt(record.timestamp);
    }
    
    return 0;
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
    
    const verificationStartTimestamp = Math.floor(Date.now() / 1000);
    window.verificationStartTimestamp = verificationStartTimestamp;
    
    console.log('页面加载，倒计时开始，订单号:', orderInfo.orderId);
    
    showStatusMessage('正在自动检测支付，请完成支付...', 'info');
    updateCountdownDisplay();
    
    countdownInterval = setInterval(() => {
        remainingTime--;
        updateCountdownDisplay();
        
        if (remainingTime <= 0) {
            stopCountdown();
            stopPolling();
            showStatusMessage('验证时间已过期，请刷新页面重新开始', 'error');
        }
    }, 1000);
    
    pollStartTime = Date.now();
    startPolling();
}

// 支付成功
function handlePaymentSuccess() {
    showStatusMessage('✓ 支付验证成功！订单已完成', 'success');
    console.log('支付成功，订单号:', orderInfo.orderId);
    
    // 如果是小数点模式，递增金额并保存
    if (currentMethod === 'decimal') {
        let currentDecimal = parseInt(localStorage.getItem('currentDecimal') || '1');
        currentDecimal++;
        
        if (currentDecimal > CONFIG.decimalRange.max) {
            currentDecimal = CONFIG.decimalRange.min;
        }
        
        localStorage.setItem('currentDecimal', currentDecimal.toString());
    }
}

// 支付超时
async function handlePaymentTimeout() {
    showStatusMessage('检测超时，未找到匹配的支付记录', 'error');
    console.log('支付验证超时，订单号:', orderInfo.orderId);
    
    // 通知服务器订单超时/失败
    await notifyPaymentFailed('timeout');
}

// 通知支付失败（调用失败回调API）
async function notifyPaymentFailed(reason) {
    try {
        const failedUrl = `/payment_failed?order_id=${encodeURIComponent(orderInfo.orderId)}&amount=${orderInfo.amount}&reason=${encodeURIComponent(reason)}`;
        
        console.log('调用支付失败回调:', failedUrl);
        
        const response = await fetch(failedUrl, {
            method: 'GET'
        });
        
        if (!response.ok) {
            console.error('失败回调API响应错误:', response.status);
        } else {
            const result = await response.json().catch(() => ({}));
            console.log('失败回调API响应:', result);
        }
    } catch (error) {
        console.error('调用失败回调API失败:', error);
    }
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
