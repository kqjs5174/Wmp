// API 配置 - 整合版本
const CONFIG = {
    // API 基础地址（使用相对路径，自动适配当前服务器）
    API_BASE_URL: '',
    
    // 续费服务地址（整合后使用同一服务器）
    RENEWAL_API_URL: '',
    
    // 积分服务地址（整合后使用同一服务器）
    POINTS_API_URL: '',
    
    // 充值页面地址
    RECHARGE_URL: '/recharge/',
    
    // API 端点
    ENDPOINTS: {
        LIST_ORDERS: '/api/list_orders',
        // 续费服务端点
        INSTANCES: '/api/instances',
        RENEW: '/api/renew',
        INSTANCE_RENEW: '/api/instance/renew',
        STATUS: '/api/status',
        // 积分端点
        USERS_POINTS: '/api/users/points',
        POINTS_DEDUCT: '/api/points/deduct',
        // 服务器创建端点
        SERVER_PLANS: '/api/server/plans',
        SERVER_DAEMONS: '/api/server/daemons',
        SERVER_CREATE: '/api/server/create',
        SERVER_LIST: '/api/server/list',
        SERVER_DETAIL: '/api/server/detail',
        SERVER_IMAGES: '/api/server/images'
    },
    
    // 刷新间隔（毫秒）
    REFRESH_INTERVAL: 30000,
    
    // 页面标题映射
    PAGE_TITLES: {
        'dashboard': '仪表盘',
        'orders': '订单管理',
        'instances': '实例管理',
        'users': '用户管理',
        'recharge': '充值中心',
        'register': '用户注册',
        'redeem': '兑换码兑换',
        'create-server': '创建服务器'
    },
    
    // 续费配置
    RENEWAL: {
        pricePerDay: 0.33,  // 每天价格
        defaultDays: 30      // 默认续费天数
    }
};
