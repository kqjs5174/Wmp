// API 调用模块

const API = {
    /**
     * 根据实例ID搜索实例
     * @param {string} instanceId 实例UUID（必填）
     * @returns {Promise<Object>} 实例数据
     */
    async getInstanceById(instanceId) {
        try {
            if (!instanceId) {
                return {
                    success: false,
                    error: '请输入实例ID'
                };
            }
            
            const url = CONFIG.RENEWAL_API_URL + CONFIG.ENDPOINTS.INSTANCES + '?instanceId=' + encodeURIComponent(instanceId);
            const response = await fetch(url);
            
            const data = await response.json();
            
            if (data.status === 'success') {
                return {
                    success: true,
                    instances: data.data || []
                };
            } else {
                return {
                    success: false,
                    error: data.error || '未找到该实例'
                };
            }
        } catch (error) {
            console.error('获取实例失败:', error);
            return {
                success: false,
                error: error.message || '网络请求失败'
            };
        }
    },

    /**
     * 按用户名续费
     * @param {string} username 用户名
     * @param {number} days 续费天数
     * @returns {Promise<Object>} 续费结果
     */
    async renewByUsername(username, days) {
        try {
            const response = await fetch(CONFIG.RENEWAL_API_URL + CONFIG.ENDPOINTS.RENEW, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, days })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                return {
                    success: true,
                    data: data.data
                };
            } else {
                return {
                    success: false,
                    error: data.error || '续费失败'
                };
            }
        } catch (error) {
            console.error('续费失败:', error);
            return {
                success: false,
                error: error.message || '网络请求失败'
            };
        }
    },

    /**
     * 按实例ID续费
     * @param {string} daemonId 守护进程ID
     * @param {string} uuid 实例UUID
     * @param {number} days 续费天数
     * @returns {Promise<Object>} 续费结果
     */
    async renewByInstanceId(daemonId, uuid, days) {
        try {
            const response = await fetch(CONFIG.RENEWAL_API_URL + CONFIG.ENDPOINTS.INSTANCE_RENEW, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ daemonId, uuid, days })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                return {
                    success: true,
                    data: data.data
                };
            } else {
                return {
                    success: false,
                    error: data.error || '续费失败'
                };
            }
        } catch (error) {
            console.error('续费失败:', error);
            return {
                success: false,
                error: error.message || '网络请求失败'
            };
        }
    },

    /**
     * 获取用户积分余额
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 积分信息
     */
    async getPointsBalance(userId) {
        try {
            const response = await fetch(CONFIG.RENEWAL_API_URL + '/api/points/balance?userId=' + encodeURIComponent(userId));
            const data = await response.json();
            
            if (data.status === 'success') {
                return {
                    success: true,
                    data: data.data
                };
            } else {
                return {
                    success: false,
                    error: data.error || '获取积分失败'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message || '网络请求失败'
            };
        }
    },

    /**
     * 充值积分（管理员接口）
     * @param {string} userId 用户ID
     * @param {number} amount 充值金额
     * @param {string} name 用户名称
     * @param {string} reason 充值原因
     * @returns {Promise<Object>} 充值结果
     */
    async addPoints(userId, amount, name, reason) {
        try {
            const response = await fetch(CONFIG.RENEWAL_API_URL + '/api/points/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, amount, name, reason })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                return {
                    success: true,
                    data: data.data
                };
            } else {
                return {
                    success: false,
                    error: data.error || '充值失败'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message || '网络请求失败'
            };
        }
    },

    /**
     * 获取续费价格配置
     * @returns {Promise<Object>} 价格配置
     */
    async getRenewalPrice() {
        try {
            const response = await fetch(CONFIG.RENEWAL_API_URL + '/api/points/price');
            const data = await response.json();
            
            if (data.status === 'success') {
                return {
                    success: true,
                    data: data.data
                };
            } else {
                return {
                    success: false,
                    error: data.error || '获取价格失败'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message || '网络请求失败'
            };
        }
    },

    /**
     * 获取续费服务状态
     * @returns {Promise<Object>} 服务状态
     */
    async getRenewalServiceStatus() {
        try {
            const response = await fetch(CONFIG.RENEWAL_API_URL + CONFIG.ENDPOINTS.STATUS);
            const data = await response.json();
            return {
                success: data.status === 'success',
                data: data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * 获取订单列表
     * @returns {Promise<Object>} 订单数据
     */
    async getOrders() {
        try {
            const response = await fetch(CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.LIST_ORDERS);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                return {
                    success: true,
                    orders: data.orders || {}
                };
            } else {
                return {
                    success: false,
                    error: '获取订单失败'
                };
            }
        } catch (error) {
            console.error('获取订单列表失败:', error);
            return {
                success: false,
                error: error.message || '网络请求失败'
            };
        }
    },

    /**
     * 将订单对象转换为数组并排序
     * @param {Object} ordersObj 订单对象
     * @returns {Array} 排序后的订单数组
     */
    parseOrders(ordersObj) {
        if (!ordersObj || typeof ordersObj !== 'object') {
            return [];
        }

        const ordersArray = Object.values(ordersObj);
        
        // 按支付时间降序排序（最新的在前）
        ordersArray.sort((a, b) => {
            const dateA = new Date(a.paid_at || 0);
            const dateB = new Date(b.paid_at || 0);
            return dateB - dateA;
        });

        return ordersArray;
    },

    /**
     * 计算订单统计数据
     * @param {Array} orders 订单数组
     * @returns {Object} 统计数据
     */
    calculateStats(orders) {
        const stats = {
            totalOrders: orders.length,
            paidOrders: 0,
            totalAmount: 0,
            todayOrders: 0
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        orders.forEach(order => {
            // 统计已支付订单
            if (order.status === 'paid') {
                stats.paidOrders++;
                stats.totalAmount += parseFloat(order.amount) || 0;
            }

            // 统计今日订单
            if (order.paid_at) {
                const orderDate = new Date(order.paid_at);
                orderDate.setHours(0, 0, 0, 0);
                if (orderDate.getTime() === today.getTime()) {
                    stats.todayOrders++;
                }
            }
        });

        return stats;
    },

    /**
     * 格式化日期时间
     * @param {string} dateString ISO 日期字符串
     * @returns {string} 格式化后的日期时间
     */
    formatDateTime(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch (e) {
            return dateString;
        }
    },

    /**
     * 获取状态显示文本
     * @param {string} status 状态码
     * @returns {Object} 状态文本和样式类
     */
    getStatusDisplay(status) {
        const statusMap = {
            'paid': { text: '已支付', class: 'status-paid' },
            'pending': { text: '待支付', class: 'status-pending' },
            'failed': { text: '失败', class: 'status-failed' }
        };

        return statusMap[status] || { text: status || '未知', class: '' };
    }
};
