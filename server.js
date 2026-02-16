/**
 * 神秘Mwp程序
 * 使用传统html文件加nodejs完成的 
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const bcrypt = require('bcrypt');
const yaml = require('js-yaml');

// ============== 配置文件处理 ==============
const CONFIG_PATH = path.join(__dirname, 'config.yml');
const DATA_DIR = path.join(__dirname, 'data');

// 数据文件路径
const ORDERS_PATH = path.join(DATA_DIR, 'orders.json');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const POINTS_PATH = path.join(DATA_DIR, 'points.json');
const PROCESSED_ORDERS_PATH = path.join(DATA_DIR, 'processed_orders.json');
const CHECKIN_PATH = path.join(DATA_DIR, 'checkin.json');
const COUPONS_PATH = path.join(DATA_DIR, 'coupons.json');
const SERVERS_PATH = path.join(DATA_DIR, 'servers.json');
const ANNOUNCEMENT_PATH = path.join(DATA_DIR, 'announcement.json');

// 默认配置
const DEFAULT_CONFIG = {
    server: {
        host: '0.0.0.0',
        port: 3000
    },
    services: {
        payment: {
            enabled: true,
            prefix: '/payment',
            backend: {
                host: '127.0.0.1',
                port: 5001,
                path: '/query_payment'
            }
        },
        recharge: {
            enabled: true,
            prefix: '/recharge',
            pointsRatio: 10,
            sync: {
                interval: 30000,
                enabled: true
            }
        },
        admin: {
            enabled: true,
            prefix: '/admin'
        }
    },
    mcsm: {
        panelUrl: 'https://panel.example.com:23333',
        apiKey: 'YOUR_API_KEY_HERE',
        daemonId: ''
    },
    renewal: {
        pricePerDay: 0.33,
        minAmount: 10,
        defaultDays: 30
    },
    auth: {
        method: 'local' // Can be 'local' or 'mcsm_bcrypt'
    },
    cors: {
        allowedOrigins: ['*']
    }
};

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 已创建数据目录: data/');
}

// 加载或创建配置
function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, yaml.dump(DEFAULT_CONFIG));
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║  已生成默认配置文件: config.yml                              ║');
        console.log('║  请根据需要修改配置后重启服务                                    ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log('');
        return DEFAULT_CONFIG;
    }
    try {
        const rawConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const config = yaml.load(rawConfig);
        console.log('✓ 已读取配置文件: config.yml');
        return { ...DEFAULT_CONFIG, ...config };
    } catch (e) {
        console.error('❌ 配置文件解析失败，使用默认配置:', e.message);
        return DEFAULT_CONFIG;
    }
}

const config = loadConfig();

// ============== 数据存储 ==============

// 本地数据缓存
let localOrders = {};
let localUsers = [];
let localPoints = {};
let processedOrders = {};
let checkinData = {};
let couponsData = {};
let serversData = {};
let lastSyncTime = null;

// 通用文件读写函数
function readJsonFile(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) {
        return defaultValue;
    }
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`❌ 读取文件失败 ${filePath}:`, e.message);
        return defaultValue;
    }
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error(`❌ 写入文件失败 ${filePath}:`, e.message);
        return false;
    }
}

// 加载所有本地数据
function loadLocalData() {
    // 加载订单数据
    const ordersData = readJsonFile(ORDERS_PATH, { orders: {}, lastSync: null });
    localOrders = ordersData.orders || {};
    lastSyncTime = ordersData.lastSync || null;
    console.log(`✓ 已加载本地订单数据: ${Object.keys(localOrders).length} 条`);

    // 加载用户数据
    const usersData = readJsonFile(USERS_PATH, { users: [] });
    localUsers = usersData.users || [];
    console.log(`✓ 已加载本地用户数据: ${localUsers.length} 个`);

    // 加载积分数据
    const pointsData = readJsonFile(POINTS_PATH, { points: {} });
    localPoints = pointsData.points || {};
    console.log(`✓ 已加载本地积分数据: ${Object.keys(localPoints).length} 个用户`);

    // 加载已处理订单
    processedOrders = readJsonFile(PROCESSED_ORDERS_PATH, {});
    console.log(`✓ 已加载已处理订单: ${Object.keys(processedOrders).length} 条`);

    // 加载签到数据
    checkinData = readJsonFile(CHECKIN_PATH, {});
    console.log(`✓ 已加载签到数据: ${Object.keys(checkinData).length} 个用户`);

// 加载兑换码数据
    couponsData = readJsonFile(COUPONS_PATH, {});
    console.log(`✓ 已加载兑换码数据: ${Object.keys(couponsData).length} 个`);

    // 加载服务器数据
    const serversFileData = readJsonFile(SERVERS_PATH, { servers: {} });
    serversData = serversFileData.servers || {};
    console.log(`✓ 已加载服务器数据: ${Object.keys(serversData).length} 个`);
}

// ============== MCSManager 用户验证 ==============

/**
 * 读取 MCSManager 用户目录中的所有用户
 * @returns {Array} 用户名列表
 */
function getMcsmUsers() {
    const userDataPath = config.mcsm?.userDataPath || '/opt/mcsmanager/web/data/User';
    
    // 检查目录是否存在
    if (!fs.existsSync(userDataPath)) {
        console.log(`⚠️ MCSManager 用户目录不存在: ${userDataPath}`);
        return { exists: false, users: [], error: '用户目录不存在' };
    }
    
    try {
        const files = fs.readdirSync(userDataPath);
        const users = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(userDataPath, file);
                try {
                    const userData = readJsonFile(filePath, null);
                    if (userData && userData.userName) {
                        users.push({
                            userName: userData.userName,
                            uuid: userData.uuid || file.replace('.json', ''),
                            registerTime: userData.registerTime
                        });
                    }
                } catch (e) {
                    console.error(`读取用户文件失败 ${file}:`, e.message);
                }
            }
        }
        
        console.log(`✓ 已读取 MCSManager 用户: ${users.length} 个`);
        return { exists: true, users: users, error: null };
    } catch (e) {
        console.error('读取 MCSManager 用户目录失败:', e.message);
        return { exists: false, users: [], error: e.message };
    }
}

/**
 * 检查用户名是否存在于 MCSManager
 * @param {string} username 用户名
 * @returns {Object} 验证结果
 */
function validateMcsmUser(username) {
    const result = getMcsmUsers();
    
    if (!result.exists) {
        // 目录不存在时，返回特殊状态（开发环境可能没有这个目录）
        return { 
            valid: false, 
            exists: false, 
            directoryExists: false,
            error: result.error,
            message: 'MCSManager 用户目录不存在，无法验证用户'
        };
    }
    
    const user = result.users.find(u => u.userName === username);
    
    if (user) {
        return { 
            valid: true, 
            exists: true, 
            directoryExists: true,
            user: { userName: user.userName, uuid: user.uuid },
            message: '用户验证通过'
        };
    } else {
        return { 
            valid: false, 
            exists: false, 
            directoryExists: true,
            error: '用户不存在于 MCSManager',
            message: '该用户名未在 MCSManager 中注册，请先在面板注册账号'
        };
    }
}

/**
 * 手动将实例添加到 MCSManager 用户的实例列表中
 * @param {string} username 用户名
 * @param {string} daemonId 守护进程ID
 * @param {string} instanceUuid 实例UUID
 * @returns {Object} 操作结果
 */
function addInstanceToMcsmUser(username, daemonId, instanceUuid) {
    const userDataPath = config.mcsm?.userDataPath || '/opt/mcsmanager/web/data/User';
    
    // 检查目录是否存在
    if (!fs.existsSync(userDataPath)) {
        return { success: false, error: '用户目录不存在', directoryExists: false };
    }
    
    try {
        const files = fs.readdirSync(userDataPath);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(userDataPath, file);
                try {
                    const userData = readJsonFile(filePath, null);
                    if (userData && userData.userName === username) {
                        // 找到用户，检查实例是否已存在
                        if (!userData.instances) {
                            userData.instances = [];
                        }
                        
                        const existingInstance = userData.instances.find(
                            inst => inst.instanceUuid === instanceUuid && inst.daemonId === daemonId
                        );
                        
                        if (existingInstance) {
                            return { 
                                success: false, 
                                error: '该实例已存在于用户账户中',
                                user: { uuid: userData.uuid, userName: userData.userName }
                            };
                        }
                        
                        // 添加新实例
        userData.instances.push({
            instanceUuid: instanceUuid,
            daemonId: daemonId
        });
                        
                        // 写回文件
                        if (writeJsonFile(filePath, userData)) {
                            console.log(`✓ 已将实例 ${instanceUuid} 添加到用户 ${username} 的账户`);
                            return {
                                success: true,
                                user: { uuid: userData.uuid, userName: userData.userName },
                                instanceCount: userData.instances.length
                            };
                        } else {
                            return { success: false, error: '写入用户文件失败' };
                        }
                    }
                } catch (e) {
                    console.error(`读取用户文件失败 ${file}:`, e.message);
                }
            }
        }
        
        return { success: false, error: '用户不存在', directoryExists: true };
    } catch (e) {
        console.error('操作 MCSManager 用户目录失败:', e.message);
        return { success: false, error: e.message, directoryExists: false };
    }
}

/**
 * 从 MCSManager 用户的实例列表中移除实例
 * @param {string} username 用户名
 * @param {string} instanceUuid 实例UUID
 * @returns {Object} 操作结果
 */
function removeInstanceFromMcsmUser(username, instanceUuid) {
    const userDataPath = config.mcsm?.userDataPath || '/opt/mcsmanager/web/data/User';
    
    // 检查目录是否存在
    if (!fs.existsSync(userDataPath)) {
        return { success: false, error: '用户目录不存在', directoryExists: false };
    }
    
    try {
        const files = fs.readdirSync(userDataPath);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(userDataPath, file);
                try {
                    const userData = readJsonFile(filePath, null);
                    if (userData && userData.userName === username) {
                        if (!userData.instances || userData.instances.length === 0) {
                            return { success: false, error: '用户没有任何实例' };
                        }
                        
                        const originalLength = userData.instances.length;
                        userData.instances = userData.instances.filter(
                            inst => inst.instanceUuid !== instanceUuid
                        );
                        
                        if (userData.instances.length === originalLength) {
                            return { success: false, error: '该实例不在用户账户中' };
                        }
                        
                        // 写回文件
                        if (writeJsonFile(filePath, userData)) {
                            console.log(`✓ 已从用户 ${username} 的账户移除实例 ${instanceUuid}`);
                            return {
                                success: true,
                                user: { uuid: userData.uuid, userName: userData.userName },
                                instanceCount: userData.instances.length
                            };
                        } else {
                            return { success: false, error: '写入用户文件失败' };
                        }
                    }
                } catch (e) {
                    console.error(`读取用户文件失败 ${file}:`, e.message);
                }
            }
        }
        
        return { success: false, error: '用户不存在', directoryExists: true };
    } catch (e) {
        console.error('操作 MCSManager 用户目录失败:', e.message);
        return { success: false, error: e.message, directoryExists: false };
    }
}

/**
 * 根据实例 UUID 在 MCSManager 用户文件中查找所有者
 * @param {string} instanceUuid 实例UUID
 * @returns {string|null} 用户名或 null
 */
function findOwnerByInstanceUuid(instanceUuid) {
    const userDataPath = config.mcsm?.userDataPath || '/opt/mcsmanager/web/data/User';
    
    if (!fs.existsSync(userDataPath)) {
        console.log(`[OWNER_LOOKUP] MCSManager user directory not found: ${userDataPath}`);
        return null;
    }
    
    try {
        const files = fs.readdirSync(userDataPath);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(userDataPath, file);
                try {
                    const userData = readJsonFile(filePath, null);
                    if (userData && userData.userName && userData.instances) {
                        const foundInstance = userData.instances.find(inst => inst.instanceUuid === instanceUuid);
                        if (foundInstance) {
                            console.log(`[OWNER_LOOKUP] Found owner for ${instanceUuid}: ${userData.userName}`);
                            return userData.userName;
                        }
                    }
                } catch (e) {
                    // 忽略单个文件读取错误
                }
            }
        }
        
        console.log(`[OWNER_LOOKUP] Could not find owner for ${instanceUuid} in any user file.`);
        return null;
    } catch (e) {
        console.error(`[OWNER_LOOKUP] Error reading MCSManager user directory:`, e.message);
        return null;
    }
}

/**
 * 根据用户名获取 MCSManager 用户的完整信息（包括实例列表）
 * @param {string} username 用户名
 * @returns {Object} 用户信息
 */
function getMcsmUserByUsername(username) {
    const userDataPath = config.mcsm?.userDataPath || '/opt/mcsmanager/web/data/User';
    
    // 检查目录是否存在
    if (!fs.existsSync(userDataPath)) {
        return { success: false, error: '用户目录不存在', directoryExists: false };
    }
    
    try {
        const files = fs.readdirSync(userDataPath);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(userDataPath, file);
                try {
                    const userData = readJsonFile(filePath, null);
                    if (userData && userData.userName === username) {
                        return {
                            success: true,
                            directoryExists: true,
                            user: {
                                uuid: userData.uuid,
                                userName: userData.userName,
                                passwordHash: userData.passWord, // For bcrypt auth
                                registerTime: userData.registerTime,
                                instances: userData.instances || []
                            }
                        };
                    }
                } catch (e) {
                    console.error(`读取用户文件失败 ${file}:`, e.message);
                }
            }
        }
        
        return { success: false, error: '用户不存在', directoryExists: true };
    } catch (e) {
        console.error('读取 MCSManager 用户目录失败:', e.message);
        return { success: false, error: e.message, directoryExists: false };
    }
}

/**
 * 根据用户名获取用户的所有实例详情
 * @param {string} username 用户名
 * @returns {Object} 实例列表
 */
async function getUserInstancesByUsername(username) {
    // 从本地 MCSManager 用户文件获取实例列表
    const userResult = getMcsmUserByUsername(username);
    
    if (!userResult.success) {
        return { success: false, error: userResult.error, directoryExists: userResult.directoryExists };
    }
    
    const instances = userResult.user.instances || [];
    
    if (instances.length === 0) {
        return { success: true, instances: [], message: '该用户没有任何实例' };
    }
    
    // 获取每个实例的详细信息
    const instanceDetails = [];
    
    for (const inst of instances) {
        try {
            const detail = await mcsmApi.getInstance(inst.daemonId, inst.instanceUuid);
            if (detail.data.status === 200 && detail.data.data) {
                const instConfig = detail.data.data.config || {};
                instanceDetails.push({
                    daemonId: inst.daemonId,
                    uuid: inst.instanceUuid,
                    nickname: instConfig.nickname || '未命名',
                    status: detail.data.data.status,
                    endTime: instConfig.endTime,
                    endTimeFormatted: instConfig.endTime 
                        ? new Date(instConfig.endTime).toLocaleString('zh-CN')
                        : '永久',
                    isExpired: instConfig.endTime ? instConfig.endTime < Date.now() : false
                });
            } else {
                // API 获取失败，仍然添加基本信息
                instanceDetails.push({
                    daemonId: inst.daemonId,
                    uuid: inst.instanceUuid,
                    nickname: '获取失败',
                    status: -1,
                    endTime: null,
                    endTimeFormatted: '未知',
                    error: '无法获取实例详情'
                });
            }
        } catch (e) {
            console.error(`获取实例 ${inst.instanceUuid} 详情失败:`, e.message);
            instanceDetails.push({
                daemonId: inst.daemonId,
                uuid: inst.instanceUuid,
                nickname: '获取失败',
                status: -1,
                endTime: null,
                endTimeFormatted: '未知',
                error: e.message
            });
        }
    }
    
    return {
        success: true,
        user: {
            uuid: userResult.user.uuid,
            userName: userResult.user.userName
        },
        instances: instanceDetails,
        total: instanceDetails.length
    };
}

// 保存签到数据
function saveCheckin() {
    return writeJsonFile(CHECKIN_PATH, checkinData);
}

// 保存兑换码数据
function saveCoupons() {
    return writeJsonFile(COUPONS_PATH, couponsData);
}

// 保存服务器数据
function saveServers() {
    return writeJsonFile(SERVERS_PATH, { lastUpdate: new Date().toISOString(), servers: serversData });
}

// ============== 价格计算辅助函数 ==============

/**
 * 根据自定义配置计算积分价格
 * @param {object} customConfig - { memory, cpu, disk, ports }
 * @returns {number} - 计算出的积分
 */
function calculateCustomPlanPrice(customConfig) {
    const customPlanConfig = config.customPlan || {};
    const limits = customPlanConfig.limits || {};
    const formula = customPlanConfig.pointsFormula || {};

    let memoryMB = parseInt(customConfig.memory) || 1024;
    // CPU 核心数转换为百分比
    const cpuCores = parseInt(customConfig.cpu) || 1;
    const cpuPercent = cpuCores * 100;
    let diskGB = parseInt(customConfig.disk) || 10;

    let portsInput = customConfig.ports || '25565';
    let portsCount = 0;

    if (typeof portsInput === 'string') {
        const portStrings = portsInput.split(',').map(p => p.trim()).filter(p => p);
        portsCount = portStrings.length || 1;
    } else if (typeof portsInput === 'number') {
        portsCount = 1;
    }

    // 应用配置中的限制
    memoryMB = Math.max(limits.minMemory || 512, Math.min(limits.maxMemory || 16384, memoryMB));
    // cpuPercent is not directly limited here, but cpuCores could be.
    diskGB = Math.max(limits.minDisk || 5, Math.min(limits.maxDisk || 100, diskGB));
    portsCount = Math.max(limits.minPorts || 1, Math.min(limits.maxPorts || 10, portsCount));

    // 从配置读取公式参数
    const memoryPerMB = formula.memoryPerMB || 0.01;
    const cpuPerPercent = formula.cpuPerPercent || 0.1;
    const diskPerGB = formula.diskPerGB || 0.5;
    const perPort = formula.perPort || 5;

    const points = memoryMB * memoryPerMB +
                   cpuPercent * cpuPerPercent +
                   diskGB * diskPerGB +
                   portsCount * perPort;

    // 返回四舍五入到两位小数的结果
    return parseFloat(points.toFixed(2));
}


// ============== 服务器管理（积分创建服务器 - 调用MCSManager API） ==============

const serverManager = {
    // 获取可用套餐列表
    getPlans() {
        return config.serverPlans || {
            basic: {
                name: '基础版',
                points: 100,
                description: '1核1G内存，适合小型服务器',
                specs: { cpu: 1, memory: 1024, storage: '10G', duration: 30 }
            },
            standard: {
                name: '标准版',
                points: 200,
                description: '2核2G内存，适合中型服务器',
                specs: { cpu: 2, memory: 2048, storage: '20G', duration: 30 }
            },
            premium: {
                name: '高级版',
                points: 500,
                description: '4核4G内存，适合大型服务器',
                specs: { cpu: 4, memory: 4096, storage: '50G', duration: 30 }
            }
        };
    },

    // 获取单个套餐信息
    getPlan(planId) {
        const plans = this.getPlans();
        return plans[planId] || null;
    },

    // 获取守护进程节点列表
    async getDaemons() {
        try {
            const result = await mcsmApi.getRemoteServices();
            if (result.data.status === 200) {
                return {
                    success: true,daemons: (result.data.data || []).map(d => ({
                        uuid: d.uuid,
                        remarks: d.remarks || '未命名节点',
                        ip: d.ip,
                        port: d.port,
                        available: d.available !== false
                    }))
                };
            }
            return { success: false, error: '获取节点列表失败' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // 创建MCSManager实例（调用API）
    async createInstance(daemonId, instanceConfig) {
        const apiUrl = `${config.mcsm.panelUrl}/api/instance?apikey=${config.mcsm.apiKey}&daemonId=${daemonId}`;
        return await makeRequest(apiUrl, {
            method: 'POST',
            body: instanceConfig
        });
    },

    // 将实例分配给用户
    async assignInstanceToUser(mcsmUserUuid, daemonId, instanceUuid) {
        // 通过API更新用户的实例列表
        const apiUrl = `${config.mcsm.panelUrl}/api/auth/update?apikey=${config.mcsm.apiKey}&uuid=${mcsmUserUuid}`;
        // 先获取用户当前的实例列表
        const searchResult = await makeRequest(`${config.mcsm.panelUrl}/api/auth/search?apikey=${config.mcsm.apiKey}&uuid=${mcsmUserUuid}&page=1&page_size=1`);
        
        if (searchResult.data.status !== 200) {
            return { success: false, error: '无法获取用户信息' };
        }
        
        const users = searchResult.data.data?.data || [];
        if (users.length === 0) {
            return { success: false, error: '用户不存在' };
        }
        
        const user = users[0];
        const currentInstances = user.instances || [];
        
        // 添加新实例
        const newInstances = [...currentInstances, { daemonId, instanceUuid }];
        
        const updateResult = await makeRequest(apiUrl, {
            method: 'PUT',
            body: { instances: newInstances }
        });
        
        return {
            success: updateResult.data.status === 200,
            error: updateResult.data.status !== 200 ? '分配实例失败' : null
        };
    },

    // 获取可用的Docker镜像列表
    getAvailableImages() {
        return config.docker?.availableImages || [
            {
                id: 'java17',
                name: 'Java 17 (OpenJDK)',
                image: 'openjdk:17-slim',
                description: '默认镜像'
            }
        ];
    },

    // 创建服务器（主函数）
    async createServer(username, planId, serverName = '', daemonId = null, imageId = null, customConfig = null) {
        console.log('========== 创建服务器 DEBUG 开始 ==========');
        console.log('[DEBUG] 收到的参数:');
        console.log('  - username:', username);
        console.log('  - planId:', planId);
        console.log('  - customConfig:', JSON.stringify(customConfig, null, 2));
        
        // 验证套餐或自定义配置
        let plan;
        let isCustomPlan = false;
        let cpuPercent; // 在这里声明 cpuPercent
        
        if (planId === 'custom') {
            // 自定义套餐
            if (!customConfig) {
                return { success: false, error: '自定义套餐需要提供配置参数' };
            }
            
            // 检查自定义套餐是否启用
            const customPlanConfig = config.customPlan || {};
            if (customPlanConfig.enabled === false) {
                return { success: false, error: '自定义套餐功能已禁用' };
            }
            
            // 获取配置中的限制和公式参数
            const limits = customPlanConfig.limits || {};
            const formula = customPlanConfig.pointsFormula || {};
            
                // 解析自定义配置并应用限制
                let memoryMB = parseInt(customConfig.memory) || 1024;
                // 用户输入的是核心数 (e.g., 1, 2)，转换为 API 需要的百分比
                const cpuCores = parseInt(customConfig.cpu) || 1;
                cpuPercent = cpuCores * 100; // 赋值，而不是声明
                let diskGB = parseInt(customConfig.disk) || 10;
            
            // 解析端口配置 - 支持用户指定具体端口号
            let portsInput = customConfig.ports || '25565';
            let portsList = [];
            let portsCount = 0;
            
            // 解析端口输入（支持逗号分隔的多个端口，如 "25565,25566,8080"）
            if (typeof portsInput === 'string') {
                const portStrings = portsInput.split(',').map(p => p.trim()).filter(p => p);
                for (const portStr of portStrings) {
                    const port = parseInt(portStr);
                    if (!isNaN(port) && port >= 1 && port <= 65535) {
                        portsList.push(`${port}:${port}/tcp`);
                        portsList.push(`${port}:${port}/udp`);
                    }
                }
                portsCount = portStrings.length;
            } else if (typeof portsInput === 'number') {
                // 如果是数字，作为单个端口处理
                const port = portsInput;
                if (port >= 1 && port <= 65535) {
                    portsList.push(`${port}:${port}/tcp`);
                    portsList.push(`${port}:${port}/udp`);
                    portsCount = 1;
                }
            }
            
            // 如果没有有效端口，使用默认端口
            if (portsList.length === 0) {
                portsList = ['25565:25565/tcp', '25565:25565/udp'];
                portsCount = 1;
            }
            
            // 应用限制
            memoryMB = Math.max(limits.minMemory || 512, Math.min(limits.maxMemory || 16384, memoryMB));
            cpuPercent = Math.max(limits.minCpu || 50, Math.min(limits.maxCpu || 400, cpuPercent));
            diskGB = Math.max(limits.minDisk || 5, Math.min(limits.maxDisk || 100, diskGB));
            portsCount = Math.max(limits.minPorts || 1, Math.min(limits.maxPorts || 10, portsCount));
            
            // 调用新的辅助函数在后端计算价格
            const customPoints = calculateCustomPlanPrice({
                memory: memoryMB,
                cpu: cpuCores, // 传递核心数
                disk: diskGB,
                ports: portsInput
            });
            
            // 获取默认时长
            const defaultDuration = customPlanConfig.defaultDuration || 30;
            
            plan = {
                name: '自定义配置',
                points: customPoints,
                description: `${memoryMB}MB内存, ${cpuPercent}%CPU, ${diskGB}GB存储, ${portsCount}个端口`,
                specs: {
                    cpu: Math.ceil(cpuPercent / 100),
                    memory: memoryMB,
                    storage: `${diskGB}G`,
                    duration: defaultDuration,
                    portsCount: portsCount,
                    ports: portsList  // 用户指定的端口映射列表
                }
            };
            isCustomPlan = true;
            
            console.log('[DEBUG] 自定义套餐解析结果:');
            console.log('  - portsInput:', portsInput, '(类型:', typeof portsInput, ')');
            console.log('  - portsList:', JSON.stringify(portsList));
            console.log('  - plan.specs.ports:', JSON.stringify(plan.specs.ports));
        } else {
            // 预设套餐
            plan = this.getPlan(planId);
            if (!plan) {
                return { success: false, error: '无效的套餐类型' };
            }
            // 为预设套餐计算 cpuPercent
            cpuPercent = (plan.specs.cpu || 1) * 100;
        }

        // 确保用户积分数据存在
        pointsManager.ensureUser(username);

        // 检查积分是否足够
        const userPoints = pointsManager.getBalance(username);
        if (userPoints < plan.points) {
            return { 
                success: false, 
                error: '积分不足', 
                required: plan.points, 
                current: userPoints 
            };
        }

        // 获取MCSManager用户信息
        const mcsmUser = getMcsmUserByUsername(username);
        if (!mcsmUser.success) {
            return { success: false, error: 'MCSManager用户不存在，请先在面板注册' };
        }

        // 确定使用的守护进程节点
        let targetDaemonId = daemonId || config.mcsm.daemonId;
        
        if (!targetDaemonId) {
            // 如果没有指定，获取第一个可用节点
            const daemonsResult = await this.getDaemons();
            if (!daemonsResult.success || daemonsResult.daemons.length === 0) {
                return { success: false, error: '没有可用的守护进程节点' };
            }
            const availableDaemon = daemonsResult.daemons.find(d => d.available);
            if (!availableDaemon) {
                return { success: false, error: '没有可用的守护进程节点' };
            }
            targetDaemonId = availableDaemon.uuid;
        }

        // 计算到期时间
        const now = Date.now();
        const endTime = now + (plan.specs.duration * 24 * 60 * 60 * 1000);

        // 构建实例配置 - 强制使用Docker容器以提高安全性
        // 获取Docker配置（如果套餐有自定义配置则使用，否则使用默认配置）
        const dockerConfig = plan.specs.docker || {};
        const defaultImage = config.docker?.defaultImage || 'azul/zulu-openjdk-debian:17-latest';
        
        // 确定使用的Docker镜像
        let selectedImage = defaultImage;
        if (imageId) {
            const availableImages = this.getAvailableImages();
            const imageConfig = availableImages.find(img => img.id === imageId);
            if (imageConfig) {
                selectedImage = imageConfig.image;
            }
        }
        
        // 设置默认的工作目录
        const defaultWorkingDir = '';
        
        // 确定最终使用的端口配置
        const finalPorts = (plan.specs.ports && plan.specs.ports.length > 0) ? plan.specs.ports : (dockerConfig.ports || ['25565:25565/tcp', '25565:25565/udp']);
        
        console.log('[DEBUG] 最终端口配置:');
        console.log('  - plan.specs.ports:', JSON.stringify(plan.specs.ports));
        console.log('  - plan.specs.ports 长度:', plan.specs.ports ? plan.specs.ports.length : 0);
        console.log('  - dockerConfig.ports:', JSON.stringify(dockerConfig.ports));
        console.log('  - 最终使用的 finalPorts:', JSON.stringify(finalPorts));
        
        const instanceConfig = {
            nickname: serverName || `${username}的${plan.name}服务器`,
            startCommand: dockerConfig.startCommand || '',
            stopCommand: "stop",
            cwd: "",
            ie: 'utf-8',
            oe: 'utf-8',
            type: 'minecraft/java',
            tag: [`plan:${planId}`, `user:${username}`, 'docker:true'],
            endTime: endTime,
            processType: 'docker',  // 强制使用Docker
            terminalOption: {
                haveColor: true,
                pty: true
            },
            eventTask: {
                autoStart: false,
                autoRestart: false,
                ignore: false
            },
            // Docker容器配置 - 所有实例都使用容器隔离
            docker: {
                containerName: '',
                image: selectedImage,  // 使用用户选择的镜像
                memory: typeof plan.specs.memory === 'number' ? plan.specs.memory : 1024,
                ports: finalPorts,  // 使用上面计算的最终端口配置
                extraVolumes: dockerConfig.extraVolumes || [],
                maxSpace: dockerConfig.maxSpace || null,
                network: dockerConfig.network || null,
                networkMode: dockerConfig.networkMode || 'host',
                cpusetCpus: dockerConfig.cpusetCpus || '',
                cpuUsage: cpuPercent,
                workingDir: '/data',
                env: dockerConfig.env || []
            }
        };
        
        console.log('[DEBUG] 完整的 instanceConfig.docker:', JSON.stringify(instanceConfig.docker, null, 2));
        console.log('========== 创建服务器 DEBUG 结束 ==========');

        try {
            // 调用MCSManager API创建实例
            const createResult = await this.createInstance(targetDaemonId, instanceConfig);
            
            if (createResult.data.status !== 200) {
                console.error('创建实例失败:', createResult.data);
                return { 
                    success: false, 
                    error: '创建实例失败: ' + (createResult.data.data || '未知错误')
                };
            }

            const instanceUuid = createResult.data.data?.instanceUuid;
            if (!instanceUuid) {
                return { success: false, error: '创建实例失败：未返回实例ID' };
            }

            // [新增逻辑] 修改实例配置文件的工作目录
            try {
                const daemonDataPath = config.mcsm?.daemonDataPath;
                if (daemonDataPath) {
                    const instanceConfigPath = path.join(daemonDataPath, instanceUuid + '.json');
                    console.log(`[DEBUG] 准备修改实例配置文件: ${instanceConfigPath}`);

                    // 稍微延迟以确保文件已创建
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    if (fs.existsSync(instanceConfigPath)) {
                        const instanceConfigData = readJsonFile(instanceConfigPath, null);
                        if (instanceConfigData && instanceConfigData.docker) {
                            console.log(`[DEBUG] 读取到实例原 workingDir: "${instanceConfigData.docker.workingDir}"`);
                            instanceConfigData.docker.workingDir = '/data';
                            if (writeJsonFile(instanceConfigPath, instanceConfigData)) {
                                console.log(`✓ 成功将实例 ${instanceUuid} 的 workingDir 修改为 /data`);
                            } else {
                                console.error(`❌ 写入实例 ${instanceUuid} 的配置文件失败`);
                            }
                        } else {
                            console.error(`❌ 读取或解析实例 ${instanceUuid} 的配置文件失败，或缺少 docker 属性`);
                        }
                    } else {
                        console.error(`❌ 实例配置文件不存在: ${instanceConfigPath}`);
                    }
                } else {
                    console.warn('⚠️ 未配置 daemonDataPath，跳过修改实例配置文件步骤');
                }
            } catch (e) {
                console.error(`❌ 修改实例 ${instanceUuid} 配置文件时发生异常:`, e.message);
            }

            // 将实例分配给用户（直接写入本地用户文件）
            const assignResult = addInstanceToMcsmUser(username, targetDaemonId, instanceUuid);

            if (!assignResult.success) {
                console.error('分配实例给用户失败:', assignResult.error);
                // 即使分配失败，实例已创建，继续处理
            } else {
                console.log(`✓ 已将实例 ${instanceUuid} 自动添加到用户 ${username} 的MCSManager账户`);
            }

            // 扣减积分（在实例创建成功后才扣减）
            const deductResult = pointsManager.deductPoints(
                username, 
                plan.points, 
                `创建服务器 (${plan.name}) - 实例ID: ${instanceUuid}`
            );

            if (!deductResult.success) {
                // 积分扣减失败，但实例已创建，记录日志
                console.error('积分扣减失败，但实例已创建:', deductResult.error);
            }

            // 保存本地记录
            const serverRecord = {
                id: instanceUuid,
                daemonId: targetDaemonId,
                userId: username,
                mcsmUserUuid: mcsmUser.user.uuid,
                name: instanceConfig.nickname,
                plan: planId,
                planName: plan.name,
                costPoints: plan.points,
                specs: plan.specs,
                dockerImage: selectedImage,  // 保存使用的Docker镜像
                imageId: imageId || null,    // 保存镜像ID
                status: 'created',
                createdAt: new Date().toISOString(),
                endTime: endTime,
                endTimeFormatted: new Date(endTime).toLocaleString('zh-CN'),
                assignedToUser: assignResult.success
            };

            serversData[instanceUuid] = serverRecord;
            saveServers();

            console.log(`🖥️ MCSManager实例创建成功: ${instanceUuid} (${plan.name}) - 用户: ${username}, 消耗积分: ${plan.points}`);

            // 执行购买后命令（如重启MCSManager服务）
            const afterPurchaseCommand = config.mcsm?.afterPurchaseCommand;
            if (afterPurchaseCommand) {
                const { exec } = require('child_process');
                exec(afterPurchaseCommand, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`⚠️ 执行购买后命令失败: ${error.message}`);
                    } else {
                        console.log(`✓ 购买后命令执行成功: ${afterPurchaseCommand}`);
                        if (stdout) console.log(`   输出: ${stdout}`);
                    }
                });
            }

            return {
                success: true,
                data: {
                    instanceUuid: instanceUuid,
                    daemonId: targetDaemonId,
                    serverName: instanceConfig.nickname,
                    plan: plan.name,
                    pointsDeducted: plan.points,
                    remainingPoints: deductResult.balance || pointsManager.getBalance(username),
                    endTime: endTime,
                    endTimeFormatted: new Date(endTime).toLocaleString('zh-CN'),
                    assignedToUser: assignResult.success
                }
            };

        } catch (error) {
            console.error('创建服务器异常:', error);
            return { success: false, error: '创建服务器失败: ' + error.message };
        }
    },

    // 获取用户的服务器列表（从本地记录）
    getUserServers(username) {
        return Object.values(serversData).filter(s => s.userId === username);
    },

    // 获取单个服务器信息
    getServer(serverId) {
        return serversData[serverId] || null;
    },

    // 获取所有服务器
    getAllServers() {
        return Object.values(serversData);
    },

    // 获取统计信息
    getStats() {
        const servers = this.getAllServers();
        const now = Date.now();
        
        return {
            total: servers.length,
            created: servers.filter(s => s.status === 'created').length,
            expired: servers.filter(s => s.endTime && s.endTime < now).length,
            totalPointsSpent: servers.reduce((sum, s) => sum + (s.costPoints || 0), 0)
        };
    }
};

// ============== 兑换码管理 ==============

const couponManager = {
    // 生成随机兑换码
    generateCode(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // 格式化为 XXXX-XXXX-XXXX 格式
        if (length === 12) {
            code = code.match(/.{1,4}/g).join('-');
        }
        return code;
    },

    // 创建兑换码
    create(options) {
        const {
            code = this.generateCode(),
            type = 'points',  // points: 积分, days: 续费天数
            value = 0,
            maxUses = 1,
            expiresAt = null,
            description = ''
        } = options;

        // 检查兑换码是否已存在
        if (couponsData[code]) {
            return { success: false, error: '兑换码已存在' };
        }

        // 验证参数
        if (!value || value <= 0) {
            return { success: false, error: '兑换值必须大于0' };
        }

        if (!['points', 'days'].includes(type)) {
            return { success: false, error: '无效的兑换码类型' };
        }

        const coupon = {
            code: code,
            type: type,
            value: value,
            maxUses: maxUses,
            usedCount: 0,
            usedBy: [],
            expiresAt: expiresAt,
            description: description,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        couponsData[code] = coupon;
        saveCoupons();

        console.log(`🎫 创建兑换码: ${code} (${type}: ${value}, 最大使用次数: ${maxUses})`);

        return { success: true, coupon: coupon };
    },

    // 批量创建兑换码
    createBatch(options, count = 1) {
        const results = [];
        for (let i = 0; i < count; i++) {
            const result = this.create({
                ...options,
                code: this.generateCode()
            });
            if (result.success) {
                results.push(result.coupon);
            }
        }
        return { success: true, coupons: results, count: results.length };
    },

    // 获取兑换码信息
    get(code) {
        return couponsData[code] || null;
    },

    // 获取所有兑换码
    getAll() {
        return Object.values(couponsData);
    },

    // 检查兑换码是否有效
    validate(code, username) {
        const coupon = this.get(code);
        
        if (!coupon) {
            return { valid: false, error: '兑换码不存在' };
        }

        if (coupon.status !== 'active') {
            return { valid: false, error: '兑换码已禁用' };
        }

        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return { valid: false, error: '兑换码已过期' };
        }

        // maxUses 为 0 或 null 表示无限次使用
        if (coupon.maxUses && coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
            return { valid: false, error: '兑换码已达到使用上限' };
        }

        // 检查用户是否已使用过
        if (coupon.usedBy.includes(username)) {
            return { valid: false, error: '您已使用过此兑换码' };
        }

        return { valid: true, coupon: coupon };
    },

    // 兑换
    redeem(code, username) {
        const validation = this.validate(code, username);
        
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const coupon = validation.coupon;

        // 确保用户积分数据存在
        pointsManager.ensureUser(username);

        let rewardDescription = '';

        // 根据类型发放奖励
        if (coupon.type === 'points') {
            // 增加积分
            const previousPoints = localPoints[username].totalPoints;
            localPoints[username].totalPoints += coupon.value;
            
            // 记录历史
            if (!localPoints[username].deductHistory) {
                localPoints[username].deductHistory = [];
            }
            localPoints[username].deductHistory.push({
                points: -coupon.value,  // 负数表示增加
                reason: `兑换码兑换 (${code})`,
                time: new Date().toISOString(),
                previousPoints: previousPoints,
                afterPoints: localPoints[username].totalPoints,
                type: 'coupon_redeem'
            });
            
            savePoints();
            rewardDescription = `${coupon.value} 积分`;
        } else if (coupon.type === 'days') {
            // 续费天数类型 - 记录到用户数据中，需要用户自己选择实例续费
            rewardDescription = `${coupon.value} 天续费时长`;
        }

        // 更新兑换码使用记录
        couponsData[code].usedCount += 1;
        couponsData[code].usedBy.push(username);
        couponsData[code].lastUsedAt = new Date().toISOString();
        
        // 如果达到使用上限，自动标记为已用完（maxUses 为 0 表示无限次）
        if (couponsData[code].maxUses && couponsData[code].maxUses > 0 && couponsData[code].usedCount >= couponsData[code].maxUses) {
            couponsData[code].status = 'exhausted';
        }
        
        saveCoupons();

        console.log(`🎁 兑换成功: ${username} 使用 ${code} 获得 ${rewardDescription}`);

        return {
            success: true,
            data: {
                code: code,
                type: coupon.type,
                value: coupon.value,
                reward: rewardDescription,
                currentPoints: localPoints[username]?.totalPoints || 0
            }
        };
    },

    // 删除兑换码
    delete(code) {
        if (!couponsData[code]) {
            return { success: false, error: '兑换码不存在' };
        }

        delete couponsData[code];
        saveCoupons();

        console.log(`🗑️ 删除兑换码: ${code}`);
        return { success: true };
    },

    // 禁用/启用兑换码
    setStatus(code, status) {
        if (!couponsData[code]) {
            return { success: false, error: '兑换码不存在' };
        }

        couponsData[code].status = status;
        saveCoupons();

        return { success: true, status: status };
    },

    // 获取统计信息
    getStats() {
        const coupons = this.getAll();
        return {
            total: coupons.length,
            active: coupons.filter(c => c.status === 'active').length,
            exhausted: coupons.filter(c => c.status === 'exhausted').length,
            disabled: coupons.filter(c => c.status === 'disabled').length,
            totalRedeemed: coupons.reduce((sum, c) => sum + c.usedCount, 0)
        };
    }
};

// ============== 签到管理 ==============

const checkinManager = {
    // 获取今天的日期字符串 (YYYY-MM-DD)
    getTodayStr() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    },

    // 获取用户签到信息
    getUserCheckin(username) {
        return checkinData[username] || {
            username: username,
            totalCheckins: 0,
            continuousDays: 0,
            lastCheckinDate: null,
            totalPoints: 0,
            history: []
        };
    },

    // 检查今天是否已签到
    hasCheckedInToday(username) {
        const user = this.getUserCheckin(username);
        return user.lastCheckinDate === this.getTodayStr();
    },

    // 计算连续签到天数
    calculateContinuousDays(username) {
        const user = this.getUserCheckin(username);
        const today = this.getTodayStr();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        if (user.lastCheckinDate === yesterdayStr) {
            return user.continuousDays + 1;
        } else if (user.lastCheckinDate === today) {
            return user.continuousDays;
        } else {
            return 1;
        }
    },

    // 计算签到奖励积分（随机1-12积分）
    calculateRewardPoints(continuousDays) {
        // 随机生成1-12之间的积分
        return Math.floor(Math.random() * 12) + 1;
    },

    // 执行签到
    doCheckin(username) {
        if (this.hasCheckedInToday(username)) {
            return { success: false, error: '今天已经签到过了' };
        }

        const today = this.getTodayStr();
        const continuousDays = this.calculateContinuousDays(username);
        const rewardPoints = this.calculateRewardPoints(continuousDays);

        // 确保用户积分数据存在
        pointsManager.ensureUser(username);

        // 更新签到数据
        if (!checkinData[username]) {
            checkinData[username] = {
                username: username,
                totalCheckins: 0,
                continuousDays: 0,
                lastCheckinDate: null,
                totalPoints: 0,
                history: []
            };
        }

        checkinData[username].totalCheckins += 1;
        checkinData[username].continuousDays = continuousDays;
        checkinData[username].lastCheckinDate = today;
        checkinData[username].totalPoints += rewardPoints;
        checkinData[username].history.push({
            date: today,
            points: rewardPoints,
            continuousDays: continuousDays,
            time: new Date().toISOString()
        });

        // 只保留最近30天的签到记录
        if (checkinData[username].history.length > 30) {
            checkinData[username].history = checkinData[username].history.slice(-30);
        }

        saveCheckin();

        // 增加用户积分
        localPoints[username].totalPoints += rewardPoints;
        localPoints[username].earnedPoints = (localPoints[username].earnedPoints || 0) + rewardPoints;
        
        // 记录到扣减历史（实际是增加）
        if (!localPoints[username].deductHistory) {
            localPoints[username].deductHistory = [];
        }
        localPoints[username].deductHistory.push({
            points: -rewardPoints,  // 负数表示增加
            reason: `每日签到奖励 (连续${continuousDays}天)`,
            time: new Date().toISOString(),
            previousPoints: localPoints[username].totalPoints - rewardPoints,
            afterPoints: localPoints[username].totalPoints
        });
        savePoints();

        console.log(`📅 签到成功: ${username} +${rewardPoints}积分 (连续${continuousDays}天)`);

        return {
            success: true,
            data: {
                username: username,
                rewardPoints: rewardPoints,
                continuousDays: continuousDays,
                totalCheckins: checkinData[username].totalCheckins,
                currentPoints: localPoints[username].totalPoints
            }
        };
    },

    // 获取签到配置
    getConfig() {
        const checkinConfig = config.checkin || { basePoints: 10, continuousBonus: 5, maxContinuousBonus: 50 };
        return {
            enabled: checkinConfig.enabled !== false,
            basePoints: checkinConfig.basePoints || 10,
            continuousBonus: checkinConfig.continuousBonus || 5,
            maxContinuousBonus: checkinConfig.maxContinuousBonus || 50
        };
    }
};

// 保存函数
function saveOrders() {
    return writeJsonFile(ORDERS_PATH, { lastSync: lastSyncTime, orders: localOrders });
}

function saveUsers() {
    return writeJsonFile(USERS_PATH, { lastSync: new Date().toISOString(), users: localUsers });
}

function savePoints() {
    return writeJsonFile(POINTS_PATH, { lastSync: new Date().toISOString(), points: localPoints });
}

function saveProcessedOrders() {
    return writeJsonFile(PROCESSED_ORDERS_PATH, processedOrders);
}

// ============== HTTP 请求工具 ==============

function httpGet(requestUrl, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const client = requestUrl.startsWith('https') ? https : http;
        
        const req = client.get(requestUrl, { rejectUnauthorized: false }, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(new Error('JSON解析失败: ' + e.message));
                }
            });
        });
        
        req.on('error', (e) => {
            reject(new Error('请求失败: ' + e.message));
        });
        
        req.setTimeout(timeout, () => {
            req.destroy();
            reject(new Error('请求超时'));
        });
    });
}

function makeRequest(requestUrl, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(requestUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const lib = isHttps ? https : http;

        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers
            },
            rejectUnauthorized: false
        };

        const req = lib.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

// ============== 积分计算 ==============

const POINTS_RATIO = config.services?.recharge?.pointsRatio || 10;

function calculateAndSavePoints() {
    console.log('🔄 正在计算用户积分...');
    
    const existingDeductHistory = {};
    Object.keys(localPoints).forEach(username => {
        if (localPoints[username].deductHistory && localPoints[username].deductHistory.length > 0) {
            existingDeductHistory[username] = localPoints[username].deductHistory;
        }
    });
    
    const userStats = {};
    
    Object.values(localOrders).forEach(order => {
        if (order.status === 'paid' && order.order_id) {
            const parts = order.order_id.split('_');
            if (parts.length >= 2) {
                const username = parts[0];
                const amount = parseFloat(order.amount) || 0;
                
                if (!userStats[username]) {
                    userStats[username] = {
                        username: username,
                        totalAmount: 0,
                        totalPoints: 0,
                        orderCount: 0,
                        orders: []
                    };
                }
                
                userStats[username].totalAmount += amount;
                userStats[username].orderCount += 1;
                userStats[username].orders.push({
                    order_id: order.order_id,
                    amount: amount,
                    paid_at: order.paid_at
                });
            }
        }
    });
    
    Object.values(userStats).forEach(user => {
        const earnedPoints = Math.floor(user.totalAmount * POINTS_RATIO);
        user.earnedPoints = earnedPoints;
        
        if (existingDeductHistory[user.username]) {
            user.deductHistory = existingDeductHistory[user.username];
            const totalDeducted = user.deductHistory.reduce((sum, record) => sum + record.points, 0);
            user.totalDeducted = totalDeducted;
            user.totalPoints = earnedPoints - totalDeducted;
        } else {
            user.deductHistory = [];
            user.totalDeducted = 0;
            user.totalPoints = earnedPoints;
        }
        
        if (user.totalPoints < 0) {
            user.totalPoints = 0;
        }
    });
    
    Object.keys(existingDeductHistory).forEach(username => {
        if (!userStats[username]) {
            userStats[username] = {
                username: username,
                totalAmount: 0,
                earnedPoints: 0,
                totalPoints: 0,
                totalDeducted: existingDeductHistory[username].reduce((sum, record) => sum + record.points, 0),
                orderCount: 0,
                orders: [],
                deductHistory: existingDeductHistory[username]
            };
        }
    });
    
    localPoints = userStats;
    savePoints();
    
    console.log(`✓ 积分计算完成: ${Object.keys(localPoints).length} 个用户`);
    return userStats;
}

// ============== MCSM API ==============

const mcsmApi = {
    async getOverview() {
        const apiUrl = `${config.mcsm.panelUrl}/api/overview?apikey=${config.mcsm.apiKey}`;
        return await makeRequest(apiUrl);
    },

    async getRemoteServices() {
        const apiUrl = `${config.mcsm.panelUrl}/api/service/remote_services?apikey=${config.mcsm.apiKey}`;
        return await makeRequest(apiUrl);
    },

    async getInstance(daemonId, uuid) {
        const apiUrl = `${config.mcsm.panelUrl}/api/instance?apikey=${config.mcsm.apiKey}&daemonId=${daemonId}&uuid=${uuid}`;
        return await makeRequest(apiUrl);
    },

    async searchUser(userName) {
        const apiUrl = `${config.mcsm.panelUrl}/api/auth/search?apikey=${config.mcsm.apiKey}&userName=${encodeURIComponent(userName)}&page=1&page_size=20`;
        return await makeRequest(apiUrl);
    },

    async getUserInstances(userName) {
        try {
            const userResult = await this.searchUser(userName);
            if (userResult.data.status !== 200) {
                return { success: false, error: '无法搜索用户' };
            }

            const users = userResult.data.data?.data || [];
            const user = users.find(u => u.userName === userName);
            if (!user) {
                return { success: false, error: '未找到该用户' };
            }

            const userInstances = user.instances || [];
            if (userInstances.length === 0) {
                return { success: false, error: '该用户没有任何实例' };
            }

            const instanceDetails = [];
            for (const inst of userInstances) {
                try {
                    const detail = await this.getInstance(inst.daemonId, inst.instanceUuid);
                    if (detail.data.status === 200 && detail.data.data) {
                        const instConfig = detail.data.data.config || {};
                        instanceDetails.push({
                            daemonId: inst.daemonId,
                            uuid: inst.instanceUuid,
                            nickname: instConfig.nickname || '未命名',
                            status: detail.data.data.status,
                            endTime: instConfig.endTime,
                            endTimeFormatted: instConfig.endTime 
                                ? new Date(instConfig.endTime).toLocaleString('zh-CN')
                                : '永久'
                        });
                    }
                } catch (e) {
                    console.error(`获取实例 ${inst.instanceUuid} 详情失败:`, e.message);
                }
            }

            return { success: true, instances: instanceDetails, user: { uuid: user.uuid, userName: user.userName } };
        } catch (error) {
            console.error('获取用户实例失败:', error);
            return { success: false, error: error.message };
        }
    },

    async updateInstance(daemonId, uuid, configData) {
        const apiUrl = `${config.mcsm.panelUrl}/api/instance?apikey=${config.mcsm.apiKey}&daemonId=${daemonId}&uuid=${uuid}`;
        return await makeRequest(apiUrl, { method: 'PUT', body: configData });
    },

    async renewInstance(daemonId, uuid, days) {
        try {
            const instanceResult = await this.getInstance(daemonId, uuid);
            if (instanceResult.data.status !== 200) {
                return { success: false, error: '无法获取实例信息' };
            }

            const instanceConfig = instanceResult.data.data?.config || {};
            const currentEndTime = instanceConfig.endTime || Date.now();
            
            const now = Date.now();
            const baseTime = currentEndTime > now ? currentEndTime : now;
            const newEndTime = baseTime + (days * 24 * 60 * 60 * 1000);

            const updateResult = await this.updateInstance(daemonId, uuid, { endTime: newEndTime });

            if (updateResult.data.status === 200) {
                return {
                    success: true,
                    oldEndTime: new Date(currentEndTime).toISOString(),
                    newEndTime: new Date(newEndTime).toISOString(),
                    addedDays: days
                };
            } else {
                return { success: false, error: '更新实例失败' };
            }
        } catch (error) {
            console.error('续费失败:', error);
            return { success: false, error: error.message };
        }
    }
};

// ============== 用户管理 ==============

const userManager = {
    getAllUsers() {
        return localUsers || [];
    },

    findByUsername(username) {
        return localUsers.find(u => u.username === username);
    },

    findById(id) {
        return localUsers.find(u => u.id === id);
    },

    register(username, password, email = '') {
        if (!username || username.length < 3 || username.length > 20) {
            return { success: false, error: '用户名长度必须在3-20个字符之间' };
        }

        if (!password || password.length < 6) {
            return { success: false, error: '密码长度至少6个字符' };
        }

        if (this.findByUsername(username)) {
            return { success: false, error: '用户名已存在' };
        }

        const newUser = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            username: username,
            password: password,
            email: email || '',
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        localUsers.push(newUser);
        saveUsers();

        const { password: _, ...safeUser } = newUser;
        return { success: true, user: safeUser };
    },

    deleteUser(id) {
        const index = localUsers.findIndex(u => u.id === id);
        if (index === -1) {
            return { success: false, error: '用户不存在' };
        }

        localUsers.splice(index, 1);
        saveUsers();
        return { success: true };
    },

    updateUser(id, updates) {
        const user = this.findById(id);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        if (updates.username && updates.username !== user.username) {
            if (this.findByUsername(updates.username)) {
                return { success: false, error: '用户名已存在' };
            }
        }

        Object.assign(user, updates, { updatedAt: new Date().toISOString() });
        saveUsers();

        const { password: _, ...safeUser } = user;
        return { success: true, user: safeUser };
    }
};

// ============== 积分管理 ==============

const pointsManager = {
    getBalance(username) {
        return localPoints[username]?.totalPoints || 0;
    },

    getUser(username) {
        return localPoints[username] || null;
    },

    ensureUser(username) {
        if (!localPoints[username]) {
            localPoints[username] = {
                username: username,
                totalAmount: 0,
                earnedPoints: 0,
                totalPoints: 0,
                totalDeducted: 0,
                orderCount: 0,
                orders: [],
                deductHistory: []
            };
            savePoints();
        }
        return localPoints[username];
    },

    deductPoints(username, points, reason = '消费') {
        const user = this.getUser(username);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }
        
        if (user.totalPoints < points) {
            return { success: false, error: '积分不足', balance: user.totalPoints, required: points };
        }
        
        const previousPoints = user.totalPoints;
        localPoints[username].totalPoints -= points;
        
        if (!localPoints[username].deductHistory) {
            localPoints[username].deductHistory = [];
        }
        localPoints[username].deductHistory.push({
            points: points,
            reason: reason,
            time: new Date().toISOString(),
            previousPoints: previousPoints,
            afterPoints: localPoints[username].totalPoints
        });
        
        savePoints();
        
        return {
            success: true,
            balance: localPoints[username].totalPoints,
            deducted: points
        };
    },

    getAllUsers() {
        return Object.values(localPoints);
    }
};

// ============== MIME 类型 ==============

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

// ============== 静态文件服务 ==============

function serveStaticFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>404 - 页面未找到</h1>');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>500 - 服务器错误</h1>');
            }
            return;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// ============== 设置响应头 ==============

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
}

function jsonResponse(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data, null, 2));
}

// ============== 解析请求体 ==============

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(new Error('无效的 JSON 数据'));
            }
        });
        req.on('error', reject);
    });
}

// ============== 认证中间件 ==============

// 简单的基于内存的 token 存储
const activeTokens = new Set();

function authenticate(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    const token = authHeader.split(' ')[1];
    return activeTokens.has(token);
}

// ============== 主服务器 ==============

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    setCorsHeaders(res);

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    console.log(`[${new Date().toLocaleString()}] ${req.method} ${pathname}`);

    try {
        // ============== 支付后端 API ==============

        // 新：后端处理支付验证
        if (pathname === '/api/verify_payment' && req.method === 'POST') {
            try {
                const { orderId, verifyAmount, verifyCode, method, verificationStartTimestamp } = await parseBody(req);

                if (!orderId) {
                    jsonResponse(res, 400, { status: 'pending', message: '缺少 order_id' });
                    return;
                }

                // 1. 从支付后端获取数据
                const backendConfig = config.services.payment.backend;
                const backendUrl = `http://${backendConfig.host}:${backendConfig.port}${backendConfig.path}`;
                
                const paymentData = await httpGet(backendUrl).catch(err => {
                    console.error('后端请求失败:', err.message);
                    throw new Error('无法连接到支付检测后端');
                });

                if (paymentData.status !== 'success' || !paymentData.records || paymentData.records.length === 0) {
                    jsonResponse(res, 200, { status: 'pending', message: '暂无支付记录' });
                    return;
                }

                // 2. 在后端执行验证逻辑
                const verificationWindow = 300; // 5分钟
                const endTimestamp = verificationStartTimestamp + verificationWindow;

                const verificationFunctions = {
                    parseRecordTimestamp: (record) => {
                        if (record.payment_time) {
                            try {
                                const dateStr = record.payment_time.replace(/-/g, '/');
                                const timestamp = Math.floor(new Date(dateStr).getTime() / 1000);
                                return isNaN(timestamp) ? 0 : timestamp;
                            } catch (e) { return 0; }
                        }
                        return parseInt(record.timestamp) || 0;
                    }
                };

                let isValid = false;
                if (method === 'decimal') {
                    isValid = paymentData.records.some(record => {
                        const actualAmount = parseFloat(record.actual_amount);
                        const expectedAmount = parseFloat(verifyAmount);
                        if (Math.abs(actualAmount - expectedAmount) >= 0.001) return false;
                        
                        const recordTimestamp = verificationFunctions.parseRecordTimestamp(record);
                        const allowedEarlyTime = verificationStartTimestamp - 30;
                        if (recordTimestamp < allowedEarlyTime || recordTimestamp > endTimestamp) return false;
                        
                        return true;
                    });
                } else { // memo
                    isValid = paymentData.records.some(record => {
                        const userMemo = record.user_memo || '';
                        if (!userMemo.includes(verifyCode)) return false;

                        const recordTimestamp = verificationFunctions.parseRecordTimestamp(record);
                        const allowedEarlyTime = verificationStartTimestamp - 30;
                        if (recordTimestamp < allowedEarlyTime || recordTimestamp > endTimestamp) return false;

                        return true;
                    });
                }

                // 3. 如果验证成功，处理订单和积分
                if (isValid) {
                    // 检查订单是否已处理
                    if (localOrders[orderId] && localOrders[orderId].status === 'paid') {
                        jsonResponse(res, 200, { status: 'success', message: '订单已处理' });
                        return;
                    }
                    
                    // 从 orderId 中解析出原始 amount
                    const urlParams = new URLSearchParams(orderId.split('?')[1] || '');
                    const amount = parseFloat(urlParams.get('amount')) || 0;

                    localOrders[orderId] = {
                        order_id: orderId,
                        amount: amount,
                        status: 'paid',
                        paid_at: new Date().toISOString(),
                        verification_method: method
                    };
                    saveOrders();
                    calculateAndSavePoints();

                    console.log(`✓ 订单支付成功 (后端验证): ${orderId}, 金额: ${amount}`);
                    jsonResponse(res, 200, { status: 'success', message: '支付验证成功！' });
                } else {
                    jsonResponse(res, 200, { status: 'pending', message: '未找到匹配的支付记录' });
                }

            } catch (error) {
                jsonResponse(res, 500, { status: 'error', message: error.message });
            }
            return;
        }
        
        // 代理转发到支付检测后端
        if (pathname === '/api/query_payment' || pathname === '/query_payment') {
            const backendConfig = config.services.payment.backend;
            const backendUrl = `http://${backendConfig.host}:${backendConfig.port}${backendConfig.path}`;
            
            http.get(backendUrl, (backendRes) => {
                let data = '';
                backendRes.on('data', chunk => data += chunk);
                backendRes.on('end', () => {
                    res.writeHead(backendRes.statusCode, { 'Content-Type': 'application/json' });
                    res.end(data);
                });
            }).on('error', (err) => {
                console.error('后端请求失败:', err.message);
                jsonResponse(res, 502, { 
                    status: 'error', 
                    message: `无法连接到支付检测后端`,
                    error: err.message 
                });
            });
            return;
        }

        // 支付成功回调
        if (pathname === '/api/payment_success' || pathname === '/payment_success') {
            const orderId = query.order_id;
            const amount = query.amount;

            if (!orderId) {
                jsonResponse(res, 400, { status: 'error', message: '缺少 order_id' });
                return;
            }

            localOrders[orderId] = {
                order_id: orderId,
                amount: amount,
                status: 'paid',
                paid_at: new Date().toISOString()
            };
            saveOrders();
            calculateAndSavePoints();

            console.log(`✓ 订单支付成功: ${orderId}, 金额: ${amount}`);

            jsonResponse(res, 200, {
                status: 'success',
                message: '订单已标记为已支付',
                order_id: orderId
            });
            return;
        }

        // 支付失败回调
        if (pathname === '/api/payment_failed' || pathname === '/payment_failed') {
            const orderId = query.order_id;
            const amount = query.amount;
            const reason = query.reason || 'unknown';

            if (!orderId) {
                jsonResponse(res, 400, { status: 'error', message: '缺少 order_id' });
                return;
            }

            localOrders[orderId] = {
                order_id: orderId,
                amount: amount,
                status: 'failed',
                reason: reason,
                failed_at: new Date().toISOString()
            };
            saveOrders();

            console.log(`✗ 订单支付失败: ${orderId}, 金额: ${amount}, 原因: ${reason}`);

            jsonResponse(res, 200, {
                status: 'success',
                message: '订单已标记为失败',
                order_id: orderId,
                reason: reason
            });
            return;
        }

        // 查询订单状态
        if (pathname === '/api/check_order' || pathname === '/check_order') {
            const orderId = query.order_id;

            if (!orderId) {
                jsonResponse(res, 400, { status: 'error', message: '缺少 order_id' });
                return;
            }

            const order = localOrders[orderId];

            if (order) {
                jsonResponse(res, 200, { status: 'success', order: order });
            } else {
                jsonResponse(res, 200, { status: 'not_found', message: '订单不存在或未支付' });
            }
            return;
        }

        // 列出所有订单
        if (pathname === '/api/list_orders' || pathname === '/list_orders') {
            jsonResponse(res, 200, { status: 'success', orders: localOrders });
            return;
        }

        // 根据用户名获取订单列表
        if (pathname === '/api/user/orders') {
            const username = query.username;
            if (!username) {
                jsonResponse(res, 400, { status: 'error', error: '缺少 username 参数' });
                return;
            }

            const userOrders = {};
            for (const orderId in localOrders) {
                if (orderId.startsWith(username + '_')) {
                    userOrders[orderId] = localOrders[orderId];
                }
            }

            jsonResponse(res, 200, { status: 'success', orders: userOrders });
            return;
        }

        // ============== 充值前端 API ==============

        // 获取配置信息
        if (pathname === '/api/config') {
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    pointsRatio: POINTS_RATIO,
                    payUrl: `http://${req.headers.host}/payment/`,
                    localMode: true,
                    lastSync: lastSyncTime
                }
            });
            return;
        }

        // 获取所有用户积分
        if (pathname === '/api/users/points') {
            const userList = Object.values(localPoints).sort((a, b) => b.totalPoints - a.totalPoints);
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    total: userList.length,
                    users: userList,
                    source: 'local',
                    lastSync: lastSyncTime
                }
            });
            return;
        }

        // 获取单个用户积分
        if (pathname === '/api/user/points') {
            const username = query.username;
            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                return;
            }
            
            const userPoints = localPoints[username] || {
                username: username,
                totalAmount: 0,
                totalPoints: 0,
                orderCount: 0,
                orders: []
            };
            jsonResponse(res, 200, { code: 0, msg: 'success', data: userPoints });
            return;
        }

        // 验证用户
        if (pathname === '/api/user/validate') {
            const username = query.username;
            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                return;
            }
            
            const exists = localUsers.length === 0 || localUsers.some(user => user.username === username);
            jsonResponse(res, 200, { code: 0, msg: 'success', data: { exists: exists, username: username } });
            return;
        }

        // 获取订单列表
        if (pathname === '/api/orders') {
            jsonResponse(res, 200, {
                status: 'success',
                orders: localOrders,
                source: 'local',
                lastSync: lastSyncTime
            });
            return;
        }

        // 获取用户列表
        if (pathname === '/api/users' || pathname === '/api/users/list') {
            const users = userManager.getAllUsers().map(u => {
                const { password, ...safeUser } = u;
                return safeUser;
            });
            jsonResponse(res, 200, { status: 'success', data: users });
            return;
        }

        // 手动触发同步（重新计算积分）
        if (pathname === '/api/sync') {
            calculateAndSavePoints();
            jsonResponse(res, 200, {
                code: 0,
                msg: '同步完成',
                data: {
                    ordersCount: Object.keys(localOrders).length,
                    usersCount: localUsers.length,
                    pointsUsersCount: Object.keys(localPoints).length,
                    syncTime: new Date().toISOString()
                }
            });
            return;
        }

        // 获取同步状态
        if (pathname === '/api/sync/status') {
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    lastSync: lastSyncTime,
                    ordersCount: Object.keys(localOrders).length,
                    usersCount: localUsers.length,
                    pointsUsersCount: Object.keys(localPoints).length
                }
            });
            return;
        }

        // 设置用户积分（管理员功能）
        if (pathname === '/api/points/set' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username, points, reason } = data;

                if (!username) {
                    jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                    return;
                }

                const newPoints = parseInt(points);
                if (isNaN(newPoints) || newPoints < 0) {
                    jsonResponse(res, 400, { code: -1, msg: '积分必须是非负整数' });
                    return;
                }

                // 确保用户存在
                pointsManager.ensureUser(username);

                const previousPoints = localPoints[username].totalPoints;
                localPoints[username].totalPoints = newPoints;

                // 记录操作历史
                if (!localPoints[username].deductHistory) {
                    localPoints[username].deductHistory = [];
                }
                localPoints[username].deductHistory.push({
                    points: previousPoints - newPoints,
                    reason: reason || '管理员设置积分',
                    time: new Date().toISOString(),
                    previousPoints: previousPoints,
                    afterPoints: newPoints,
                    type: 'admin_set'
                });

                savePoints();

                console.log(`🔧 管理员设置积分: ${username} ${previousPoints} -> ${newPoints} (${reason || '管理员设置'})`);

                jsonResponse(res, 200, {
                    code: 0,
                    msg: '设置成功',
                    data: {
                        username: username,
                        previousPoints: previousPoints,
                        currentPoints: newPoints,
                        reason: reason || '管理员设置积分'
                    }
                });
            } catch (e) {
                jsonResponse(res, 400, { code: -1, msg: '无效的请求数据' });
            }
            return;
        }

        // 增加用户积分（管理员功能）
        if (pathname === '/api/points/add') {
            const username = query.username;
            const points = parseInt(query.points) || 0;
            const reason = query.reason || '管理员增加积分';

            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                return;
            }

            if (!points || points <= 0) {
                jsonResponse(res, 400, { code: -1, msg: '积分必须大于0' });
                return;
            }

            // 确保用户存在
            pointsManager.ensureUser(username);

            const previousPoints = localPoints[username].totalPoints;
            localPoints[username].totalPoints += points;

            // 记录操作历史
            if (!localPoints[username].deductHistory) {
                localPoints[username].deductHistory = [];
            }
            localPoints[username].deductHistory.push({
                points: -points,  // 负数表示增加
                reason: reason,
                time: new Date().toISOString(),
                previousPoints: previousPoints,
                afterPoints: localPoints[username].totalPoints,
                type: 'admin_add'
            });

            savePoints();

            console.log(`💰 管理员增加积分: ${username} +${points} (${reason}), 当前: ${localPoints[username].totalPoints}`);

            jsonResponse(res, 200, {
                code: 0,
                msg: '增加成功',
                data: {
                    username: username,
                    addedPoints: points,
                    previousPoints: previousPoints,
                    currentPoints: localPoints[username].totalPoints,
                    reason: reason
                }
            });
            return;
        }

        // 扣减积分
        if (pathname === '/api/points/deduct') {
            const username = query.username;
            const points = parseInt(query.points) || 0;
            const reason = query.reason || '积分扣减';

            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                return;
            }

            if (!points || points <= 0) {
                jsonResponse(res, 400, { code: -1, msg: '积分必须大于0' });
                return;
            }

            // 确保用户存在
            pointsManager.ensureUser(username);

            const result = pointsManager.deductPoints(username, points, reason);

            if (result.success) {
                console.log(`💰 积分扣减: ${username} -${points} (${reason}), 剩余: ${result.balance}`);
                jsonResponse(res, 200, {
                    code: 0,
                    msg: '扣减成功',
                    data: {
                        username: username,
                        deductedPoints: points,
                        currentPoints: result.balance,
                        reason: reason
                    }
                });
            } else {
                jsonResponse(res, 400, {
                    code: -1,
                    msg: result.error,
                    data: {
                        currentPoints: result.balance,
                        requestedPoints: result.required
                    }
                });
            }
            return;
        }

        // ============== 管理页面 API ==============

        // 新增：服务器状态 API (使用 /api/overview)
        if (pathname === '/api/servers/status') {
            try {
                const overviewResult = await mcsmApi.getOverview();
                if (overviewResult.data.status !== 200) {
                    jsonResponse(res, 500, { status: 'error', error: '无法获取面板概览信息' });
                    return;
                }

                const remotes = overviewResult.data.data?.remote || [];
                const serverStatus = remotes.map(remote => {
                    const system = remote.system || {};
                    return {
                        name: remote.remarks || remote.uuid,
                        node: remote.ip || '未知',
                        online: remote.available,
                        cpu: system.cpuUsage ? (system.cpuUsage * 100) : 0,
                        memory: {
                            current: system.totalmem - system.freemem,
                            total: system.totalmem
                        },
                        instanceCount: remote.instance || { running: 0, total: 0 }
                    };
                });

                jsonResponse(res, 200, { status: 'success', data: serverStatus });
            } catch (e) {
                console.error('获取服务器状态失败:', e);
                jsonResponse(res, 500, { status: 'error', error: '获取服务器状态失败: ' + e.message });
            }
            return;
        }

        // 服务状态
        if (pathname === '/api/status') {
            jsonResponse(res, 200, {
                status: 'success',
                message: '整合服务运行中',
                time: new Date().toISOString(),
                services: {
                    payment: config.services.payment.enabled,
                    recharge: config.services.recharge.enabled,
                    admin: config.services.admin.enabled
                }
            });
            return;
        }

        // 获取单个实例的详细信息
        if (pathname === '/api/instance/detail') {
            const daemonId = query.daemonId;
            const uuid = query.uuid;

            if (!daemonId || !uuid) {
                jsonResponse(res, 400, { status: 'error', error: '缺少 daemonId 或 uuid' });
                return;
            }

            try {
                const result = await mcsmApi.getInstance(daemonId, uuid);
                if (result.data.status === 200 && result.data.data) {
                    jsonResponse(res, 200, { status: 'success', data: result.data.data });
                } else {
                    jsonResponse(res, 404, { status: 'error', error: '找不到实例', details: result.data });
                }
            } catch (e) {
                jsonResponse(res, 500, { status: 'error', error: '获取实例详情失败: ' + e.message });
            }
            return;
        }

        // 获取实例列表（根据实例ID搜索）
        if (pathname === '/api/instances') {
            const instanceId = query.instanceId || query.uuid;
            
            if (!instanceId) {
                jsonResponse(res, 400, { status: 'error', error: '请输入实例ID' });
                return;
            }

            const remoteResult = await mcsmApi.getRemoteServices();
            if (remoteResult.data.status !== 200) {
                jsonResponse(res, 500, { status: 'error', error: '无法获取节点列表' });
                return;
            }

            const matchedInstances = [];
            const remotes = remoteResult.data.data || [];
            const searchTerm = instanceId.toLowerCase();

            for (const remote of remotes) {
                const daemonId = remote.uuid;
                if (!daemonId) continue;

                const instances = remote.instances || [];
                instances.forEach(inst => {
                    const uuid = inst.instanceUuid || '';
                    if (uuid.toLowerCase().includes(searchTerm) || uuid.toLowerCase() === searchTerm) {
                        matchedInstances.push({
                            daemonId: daemonId,
                            uuid: inst.instanceUuid,
                            nickname: inst.config?.nickname || '未命名',
                            status: inst.status,
                            endTime: inst.config?.endTime,
                            endTimeFormatted: inst.config?.endTime 
                                ? new Date(inst.config.endTime).toLocaleString('zh-CN')
                                : '永久'
                        });
                    }
                });
            }

            if (matchedInstances.length === 0) {
                jsonResponse(res, 404, { status: 'error', error: '未找到该实例' });
                return;
            }

            jsonResponse(res, 200, { status: 'success', data: matchedInstances });
            return;
        }

        // 续费实例 (新的原子操作)
        if (pathname === '/api/instance/renew' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username, daemonId, uuid, days } = data;

                if (!username || !daemonId || !uuid || !days) {
                    jsonResponse(res, 400, { code: -1, msg: '缺少必要参数 (username, daemonId, uuid, days)' });
                    return;
                }

                const daysToRenew = parseInt(days);
                if (isNaN(daysToRenew) || daysToRenew <= 0) {
                    jsonResponse(res, 400, { code: -1, msg: '续费天数必须是正整数' });
                    return;
                }

                // 1. 计算所需积分
                const pricePerDay = config.renewal.pricePerDay || 0.33;
                const requiredPoints = Math.ceil(daysToRenew * pricePerDay);

                // 2. 检查并扣除积分
                const deductResult = pointsManager.deductPoints(username, requiredPoints, `续费实例 ${uuid} ${daysToRenew}天`);

                if (!deductResult.success) {
                    jsonResponse(res, 400, {
                        code: -1,
                        msg: '积分不足',
                        data: {
                            required: requiredPoints,
                            current: deductResult.balance
                        }
                    });
                    return;
                }

                // 3. 尝试续费实例
                const renewResult = await mcsmApi.renewInstance(daemonId, uuid, daysToRenew);

                // 4. 处理续费结果
                if (renewResult.success) {
                    // 续费成功
                    console.log(`✓ 实例续费成功: ${uuid} by ${username} for ${daysToRenew} days. Points deducted: ${requiredPoints}`);
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: '续费成功',
                        data: {
                            ...renewResult,
                            pointsDeducted: requiredPoints,
                            currentPoints: pointsManager.getBalance(username)
                        }
                    });
                } else {
                    // 续费失败，回滚积分
                    console.error(`✗ 实例续费失败: ${uuid}. Refunding points for ${username}.`);
                    
                    // 增加等额积分作为补偿
                    const previousPoints = pointsManager.getBalance(username);
                    localPoints[username].totalPoints += requiredPoints;
                    if (!localPoints[username].deductHistory) {
                        localPoints[username].deductHistory = [];
                    }
                    localPoints[username].deductHistory.push({
                        points: -requiredPoints, // 负数表示增加
                        reason: `续费失败退款 (实例: ${uuid})`,
                        time: new Date().toISOString(),
                        previousPoints: previousPoints,
                        afterPoints: localPoints[username].totalPoints,
                        type: 'refund'
                    });
                    savePoints();

                    jsonResponse(res, 500, {
                        code: -1,
                        msg: `续费失败: ${renewResult.error || '未知错误'}。积分已退还。`,
                        data: {
                            error: renewResult.error
                        }
                    });
                }
            } catch (e) {
                jsonResponse(res, 500, { code: -1, msg: '服务器内部错误: ' + e.message });
            }
            return;
        }

        // 更新实例信息
        if (pathname === '/api/instance/update' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { daemonId, uuid, nickname, memory, ports, imageId } = data; // 新增 imageId

                if (!daemonId || !uuid) {
                    jsonResponse(res, 400, { status: 'error', error: '缺少 daemonId 或 uuid' });
                    return;
                }

                // 1. 获取当前实例配置
                const instanceResult = await mcsmApi.getInstance(daemonId, uuid);
                if (instanceResult.data.status !== 200) {
                    jsonResponse(res, 404, { status: 'error', error: '找不到实例或无法获取当前配置' });
                    return;
                }

                const currentConfig = instanceResult.data.data?.config || {};
                const updatePayload = {};

                // --- 新增：积分变动逻辑 ---
                console.log(`[CONFIG_UPDATE] Starting points logic for instance ${uuid}`);
                
                // 查找所有者：首先尝试本地缓存，失败则扫描 MCSM 用户文件
                let ownerUsername = null;
                const serverInfo = serversData[uuid];
                if (serverInfo && serverInfo.userId) {
                    ownerUsername = serverInfo.userId;
                    console.log(`[CONFIG_UPDATE] Found owner in local cache (servers.json): ${ownerUsername}`);
                } else {
                    console.log(`[CONFIG_UPDATE] Owner not in local cache. Searching MCSManager user files...`);
                    ownerUsername = findOwnerByInstanceUuid(uuid);
                }
                
                // 只有在找到所有者时，才处理积分逻辑
                if (ownerUsername) {
                    const username = ownerUsername;
                    console.log(`[CONFIG_UPDATE] Processing points for owner: ${username}`);

                    // 构造用于计算的配置对象
                    const beforeDockerConfig = currentConfig.docker || {};
                    
                    // 计算“之前”的积分
                    const beforeCpuCores = (beforeDockerConfig.cpuUsage || 100) / 100;
                    const beforeDiskGB = beforeDockerConfig.maxSpace ? beforeDockerConfig.maxSpace / 1024 : 10;
                    const beforePorts = [...new Set((beforeDockerConfig.ports || []).map(p => p.split(':')[0]))].join(',');
                    
                    const beforePointsConfig = {
                        memory: beforeDockerConfig.memory || 1024,
                        cpu: beforeCpuCores,
                        disk: beforeDiskGB,
                        ports: beforePorts
                    };
                    const beforePoints = calculateCustomPlanPrice(beforePointsConfig);
                    console.log(`[CONFIG_UPDATE] Before config: ${JSON.stringify(beforePointsConfig)} -> Points: ${beforePoints}`);

                    // 准备“之后”的配置
                    const newMemory = memory ? (parseInt(memory) || beforeDockerConfig.memory) : beforeDockerConfig.memory;
                    const newPorts = (ports && Array.isArray(ports)) ? ports.join(',') : beforePorts;

                    // 计算“之后”的积分
                    const afterPointsConfig = {
                        memory: newMemory,
                        cpu: beforeCpuCores, // CPU 暂不可修改
                        disk: beforeDiskGB,  // 磁盘暂不可修改
                        ports: newPorts
                    };
                    const afterPoints = calculateCustomPlanPrice(afterPointsConfig);
                    console.log(`[CONFIG_UPDATE] After config: ${JSON.stringify(afterPointsConfig)} -> Points: ${afterPoints}`);

                    // 如果积分有变化，处理扣款或退款
                    if (afterPoints.toFixed(2) !== beforePoints.toFixed(2)) {
                        const pointDifference = beforePoints - afterPoints;
                        console.log(`[CONFIG_UPDATE] Point difference detected: ${pointDifference}`);

                        if (pointDifference > 0) { // 降级，退款
                            const refundAmount = Math.floor(pointDifference * 0.9); // 扣除10%税
                            console.log(`[CONFIG_UPDATE] Downgrade detected. Refunding ${refundAmount} points.`);
                            if (refundAmount > 0) {
                                pointsManager.ensureUser(username);
                                const previousPoints = localPoints[username].totalPoints;
                                localPoints[username].totalPoints += refundAmount;
                                
                                if (!localPoints[username].deductHistory) {
                                    localPoints[username].deductHistory = [];
                                }
                                localPoints[username].deductHistory.push({
                                    points: -refundAmount, // 负数表示增加
                                    reason: `降级配置退款 (税率10%)`,
                                    time: new Date().toISOString(),
                                    previousPoints: previousPoints,
                                    afterPoints: localPoints[username].totalPoints,
                                    type: 'config_downgrade'
                                });
                                savePoints();
                                console.log(`💰 配置降级退款: ${username} +${refundAmount} 积分 (实例: ${uuid})`);
                            }
                        } else { // 升级，扣款
                            const cost = Math.ceil(Math.abs(pointDifference)); // 向上取整
                            console.log(`[CONFIG_UPDATE] Upgrade detected. Cost: ${cost} points.`);
                            const deductResult = pointsManager.deductPoints(username, cost, `升级配置`);
                            if (!deductResult.success) {
                                console.log(`[CONFIG_UPDATE] Point deduction failed: ${deductResult.error}`);
                                jsonResponse(res, 400, { status: 'error', error: `积分不足以升级配置。需要 ${cost} 积分，当前拥有 ${deductResult.balance} 积分。` });
                                return; // 终止操作
                            }
                            console.log(`💰 配置升级扣款: ${username} -${cost} 积分 (实例: ${uuid})`);
                        }
                    } else {
                        console.log(`[CONFIG_UPDATE] No point difference detected. Skipping transaction.`);
                    }
                } else {
                    console.warn(`⚠️ 未能确定实例 ${uuid} 的所有者，跳过积分计算。`);
                }
                // --- 积分变动逻辑结束 ---

                // 构建 MCSM API 的更新负载
                if (nickname) {
                    updatePayload.nickname = nickname;
                }
                if (memory) {
                    const memoryNum = parseInt(memory);
                    if (!isNaN(memoryNum) && memoryNum > 0) {
                        if (!updatePayload.docker) updatePayload.docker = {};
                        updatePayload.docker.memory = memoryNum;
                    }
                }
                if (ports && Array.isArray(ports)) {
                    const newApiPorts = [];
                    for (const portStr of ports) {
                        const port = parseInt(portStr);
                        if (!isNaN(port) && port > 0 && port < 65536) {
                            newApiPorts.push(`${port}:${port}/tcp`);
                            newApiPorts.push(`${port}:${port}/udp`);
                        }
                    }
                    if (!updatePayload.docker) updatePayload.docker = {};
                    updatePayload.docker.ports = newApiPorts;
                }
                if (imageId) {
                    const availableImages = serverManager.getAvailableImages();
                    const selectedImage = availableImages.find(img => img.id === imageId);
                    if (selectedImage) {
                        if (!updatePayload.docker) updatePayload.docker = {};
                        updatePayload.docker.image = selectedImage.image;
                    }
                }
                
                if (Object.keys(updatePayload).length === 0) {
                    jsonResponse(res, 400, { status: 'error', error: '没有提供任何要更新的信息' });
                    return;
                }

                // 5. 调用API更新
                const updateResult = await mcsmApi.updateInstance(daemonId, uuid, updatePayload);

                if (updateResult.data.status === 200) {
                    jsonResponse(res, 200, { status: 'success', message: '实例信息更新成功' });
                } else {
                    jsonResponse(res, 500, { status: 'error', error: '更新实例失败', details: updateResult.data });
                }
            } catch (e) {
                jsonResponse(res, 400, { status: 'error', error: '无效的请求数据: ' + e.message });
            }
            return;
        }

        // 新：预计算实例更新的积分变化
        if (pathname === '/api/instance/pre-update' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { daemonId, uuid, memory, ports } = data;

                if (!daemonId || !uuid) {
                    jsonResponse(res, 400, { status: 'error', error: '缺少 daemonId 或 uuid' });
                    return;
                }

                // 1. 获取当前实例配置
                const instanceResult = await mcsmApi.getInstance(daemonId, uuid);
                if (instanceResult.data.status !== 200) {
                    jsonResponse(res, 404, { status: 'error', error: '找不到实例或无法获取当前配置' });
                    return;
                }
                const currentConfig = instanceResult.data.data?.config || {};

                // 2. 查找所有者
                let ownerUsername = null;
                const serverInfo = serversData[uuid];
                if (serverInfo && serverInfo.userId) {
                    ownerUsername = serverInfo.userId;
                } else {
                    ownerUsername = findOwnerByInstanceUuid(uuid);
                }

                if (!ownerUsername) {
                    jsonResponse(res, 404, { status: 'error', error: '未能确定实例所有者，无法计算积分' });
                    return;
                }
                
                const username = ownerUsername;
                const currentUserPoints = pointsManager.getBalance(username);

                // 3. 计算积分变化
                const beforeDockerConfig = currentConfig.docker || {};
                const beforeCpuCores = (beforeDockerConfig.cpuUsage || 100) / 100;
                const beforeDiskGB = beforeDockerConfig.maxSpace ? beforeDockerConfig.maxSpace / 1024 : 10;
                const beforePorts = [...new Set((beforeDockerConfig.ports || []).map(p => p.split(':')[0]))].join(',');
                
                const beforePoints = calculateCustomPlanPrice({
                    memory: beforeDockerConfig.memory || 1024,
                    cpu: beforeCpuCores,
                    disk: beforeDiskGB,
                    ports: beforePorts
                });

                const newMemory = memory ? (parseInt(memory) || beforeDockerConfig.memory) : beforeDockerConfig.memory;
                const newPorts = (ports && Array.isArray(ports)) ? ports.join(',') : beforePorts;

                const afterPoints = calculateCustomPlanPrice({
                    memory: newMemory,
                    cpu: beforeCpuCores,
                    disk: beforeDiskGB,
                    ports: newPorts
                });

                const pointDifference = beforePoints - afterPoints;
                let cost = 0;
                let refund = 0;
                let action = 'none';

                if (pointDifference > 0) { // 降级
                    refund = Math.floor(pointDifference * 0.9); // 90% 退款
                    action = 'downgrade';
                } else if (pointDifference < 0) { // 升级
                    cost = Math.ceil(Math.abs(pointDifference));
                    action = 'upgrade';
                }

                jsonResponse(res, 200, {
                    status: 'success',
                    data: {
                        action: action,
                        cost: cost,
                        refund: refund,
                        pointDifference: pointDifference,
                        currentUserPoints: currentUserPoints,
                        isSufficient: currentUserPoints >= cost,
                        owner: username
                    }
                });

            } catch (e) {
                jsonResponse(res, 500, { status: 'error', error: '预计算失败: ' + e.message });
            }
            return;
        }

        // 更新实例信息
        if (pathname === '/api/instance/update' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { daemonId, uuid, days } = data;

                if (!daemonId || !uuid) {
                    jsonResponse(res, 400, { status: 'error', error: '缺少必要参数' });
                    return;
                }

                const renewDays = days || config.renewal.defaultDays;
                const renewResult = await mcsmApi.renewInstance(daemonId, uuid, renewDays);

                if (renewResult.success) {
                    jsonResponse(res, 200, { status: 'success', data: renewResult });
                } else {
                    jsonResponse(res, 500, { status: 'error', error: renewResult.error });
                }
            } catch (e) {
                jsonResponse(res, 400, { status: 'error', error: '无效的请求数据' });
            }
            return;
        }

        // 获取续费价格
        if (pathname === '/api/points/price') {
            jsonResponse(res, 200, {
                status: 'success',
                data: {
                    pricePerDay: config.renewal.pricePerDay,
                    defaultDays: config.renewal.defaultDays,
                    minAmount: config.renewal.minAmount
                }
            });
            return;
        }

        // 用户登录
        if (pathname === '/api/users/login' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username, password } = data;

                if (!username || !password) {
                    jsonResponse(res, 400, { status: 'error', error: '请输入用户名和密码' });
                    return;
                }

                const authMethod = config.auth?.method || 'local';

                if (authMethod === 'mcsm_bcrypt') {
                    // --- MCSM Bcrypt Authentication with Debug Logging ---
                    console.log(`[AUTH_DEBUG] Attempting bcrypt login for user: ${username}`);
                    const mcsmUserResult = getMcsmUserByUsername(username);

                    if (!mcsmUserResult.directoryExists) {
                        console.error('[AUTH_DEBUG] ✗ MCSM bcrypt login failed: User data directory not found. Check mcsm.userDataPath in config.json');
                        jsonResponse(res, 500, { status: 'error', error: '服务器配置错误：无法找到 MCSM 用户目录。' });
                        return;
                    }
                    console.log(`[AUTH_DEBUG] User directory found. Searching for user...`);

                    if (mcsmUserResult.success) {
                        console.log(`[AUTH_DEBUG] ✓ User file found for ${username}.`);
                        if (mcsmUserResult.user.passwordHash) {
                            console.log(`[AUTH_DEBUG] Password hash found. Comparing with provided password...`);
                            try {
                                // Trim the hash to remove any potential leading/trailing whitespace
                                const passwordHash = mcsmUserResult.user.passwordHash.trim();
                                const match = await bcrypt.compare(password, passwordHash);
                                if (match) {
                                    console.log(`[AUTH_DEBUG] ✓ Password for ${username} matched! Login successful.`);
                                    
                                    // 检查本地用户是否存在，如果不存在则自动注册
                                    let localUser = userManager.findByUsername(username);
                                    if (!localUser) {
                                        console.log(`[AUTH_INFO] User ${username} does not exist locally. Creating a local record.`);
                                        const registrationResult = userManager.register(username, '__mcsm_managed__'); // 使用占位符密码
                                        if (registrationResult.success) {
                                            localUser = registrationResult.user;
                                            console.log(`[AUTH_INFO] ✓ Successfully created local record for ${username}.`);
                                        } else {
                                            console.error(`[AUTH_ERROR] ✗ Failed to create local record for ${username}: ${registrationResult.error}`);
                                            // 即使本地记录创建失败，也允许登录，但记录错误
                                        }
                                    }

                                    // 使用本地用户信息或MCSM信息（如果本地创建失败）
                                    const responseUser = localUser ? {
                                        id: localUser.id,
                                        username: localUser.username,
                                        email: localUser.email,
                                        createdAt: localUser.createdAt,
                                        status: localUser.status
                                    } : {
                                        id: mcsmUserResult.user.uuid,
                                        username: mcsmUserResult.user.userName,
                                        email: '',
                                        createdAt: mcsmUserResult.user.registerTime,
                                        status: 'active'
                                    };

                                    jsonResponse(res, 200, { status: 'success', data: responseUser });
                                    return;
                                } else {
                                    console.log(`[AUTH_DEBUG] ✗ Password for ${username} did not match.`);
                                }
                            } catch (bcryptError) {
                                console.error(`[AUTH_DEBUG] ✗ bcrypt.compare error for user ${username}:`, bcryptError);
                                jsonResponse(res, 500, { status: 'error', error: '密码验证时发生内部错误。' });
                                return;
                            }
                        } else {
                            console.log(`[AUTH_DEBUG] ✗ User file for ${username} found, but 'passWord' field is missing or empty.`);
                        }
                    } else {
                         console.log(`[AUTH_DEBUG] ✗ User file for ${username} not found in MCSM directory.`);
                    }
                    
                    // If any of the above checks fail, we land here.
                    console.log(`[AUTH_DEBUG] ✗ Bcrypt login failed for ${username}.`);
                    jsonResponse(res, 401, { status: 'error', error: '用户名或密码错误' });

                } else {
                    // --- Local Authentication ---
                    const user = userManager.findByUsername(username);
                    if (user && user.password === password) {
                        console.log(`✓ 用户 ${username} 通过本地密码验证成功`);
                        const { password: _, ...safeUser } = user;
                        jsonResponse(res, 200, { status: 'success', data: safeUser });
                        return;
                    }
                    console.log(`✗ 用户 ${username} 本地登录失败`);
                    jsonResponse(res, 401, { status: 'error', error: '用户名或密码错误' });
                }

            } catch (e) {
                console.error('登录异常:', e);
                jsonResponse(res, 500, { status: 'error', error: '登录过程中发生服务器错误: ' + e.message });
            }
            return;
        }

        // MCSManager 用户验证 API
        if (pathname === '/api/mcsm/validate') {
            const username = query.username;
            
            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                return;
            }

            const result = validateMcsmUser(username);
            
            jsonResponse(res, 200, {
                code: result.valid ? 0 : -1,
                msg: result.message,
                data: {
                    valid: result.valid,
                    exists: result.exists,
                    directoryExists: result.directoryExists,
                    user: result.user || null
                }
            });
            return;
        }

        // 获取 MCSManager 用户列表（管理员功能）
        if (pathname === '/api/mcsm/users') {
            const result = getMcsmUsers();
            
            jsonResponse(res, 200, {
                code: result.exists ? 0 : -1,
                msg: result.exists ? 'success' : result.error,
                data: {
                    directoryExists: result.exists,
                    users: result.users,
                    count: result.users.length
                }
            });
            return;
        }

        // 根据用户名获取用户的实例列表（新的续费方式）
        if (pathname === '/api/user/instances') {
            const username = query.username;
            
            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                return;
            }

            try {
                const result = await getUserInstancesByUsername(username);
                
                if (result.success) {
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: 'success',
                        data: {
                            user: result.user,
                            instances: result.instances,
                            total: result.total
                        }
                    });
                } else {
                    jsonResponse(res, 200, {
                        code: -1,
                        msg: result.error || '获取实例列表失败',
                        data: {
                            directoryExists: result.directoryExists,
                            instances: [],
                            total: 0
                        }
                    });
                }
            } catch (e) {
                console.error('获取用户实例失败:', e);
                jsonResponse(res, 500, { code: -1, msg: '服务器错误: ' + e.message });
            }
            return;
        }

        // 用户注册
        if (pathname === '/api/users/register' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username, password, email } = data;

                // 先验证用户名是否存在于 MCSManager
                const mcsmValidation = validateMcsmUser(username);
                
                // 如果 MCSManager 用户目录存在，则必须验证用户
                if (mcsmValidation.directoryExists && !mcsmValidation.valid) {
                    jsonResponse(res, 400, { 
                        status: 'error', 
                        error: mcsmValidation.message || '该用户名未在 MCSManager 中注册，请先在面板注册账号'
                    });
                    return;
                }

                const result = userManager.register(username, password, email);

                if (result.success) {
                    // 注册成功时，记录 MCSManager 用户信息
                    if (mcsmValidation.user) {
                        console.log(`✓ 用户注册成功: ${username} (MCSManager UUID: ${mcsmValidation.user.uuid})`);
                    }
                    jsonResponse(res, 200, { status: 'success', data: result.user });
                } else {
                    jsonResponse(res, 400, { status: 'error', error: result.error });
                }
            } catch (e) {
                jsonResponse(res, 400, { status: 'error', error: '无效的请求数据' });
            }
            return;
        }

        // 删除用户
        if (pathname === '/api/users/delete' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { id } = data;

                if (!id) {
                    jsonResponse(res, 400, { status: 'error', error: '缺少用户ID' });
                    return;
                }

                const result = userManager.deleteUser(id);

                if (result.success) {
                    jsonResponse(res, 200, { status: 'success' });
                } else {
                    jsonResponse(res, 400, { status: 'error', error: result.error });
                }
            } catch (e) {
                jsonResponse(res, 400, { status: 'error', error: '无效的请求数据' });
            }
            return;
        }

        // 已处理订单
        if (pathname === '/api/processed_orders') {
            jsonResponse(res, 200, { status: 'success', data: processedOrders });
            return;
        }

        // ============== 管理员登录 API ==============

        // 管理员登录验证
        if (pathname === '/api/root/login' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { password } = data;

                const rootPassword = config.rootAdmin?.password || 'admin123456';

                if (password === rootPassword) {
                    const token = 'root_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    activeTokens.add(token); // 将 token 加入到活动 token 集合
                    console.log(`✓ 管理员登录成功, Token: ${token}`);
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: '登录成功',
                        data: { token: token }
                    });
                } else {
                    jsonResponse(res, 401, {
                        code: -1,
                        msg: '密码错误'
                    });
                }
            } catch (e) {
                jsonResponse(res, 400, { code: -1, msg: '无效的请求数据' });
            }
            return;
        }

        // ============== 配置管理 API (V2 - 安全) ==============

        // [已弃用] 获取完整配置
        if (pathname === '/api/config/full') {
            jsonResponse(res, 410, { code: -1, msg: '此接口已弃用，请使用新的细分配置接口' });
            return;
        }

        // [已弃用] 保存完整配置
        if (pathname === '/api/config/save' && req.method === 'POST') {
            jsonResponse(res, 410, { code: -1, msg: '此接口已弃用，请使用新的细分配置接口' });
            return;
        }

        // 动态处理获取和保存配置的请求
        const configMatch = pathname.match(/^\/api\/config\/(get|save)\/([a-zA-Z0-9_]+)$/);
        if (configMatch) {
            // 对所有配置接口进行认证
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '未授权的访问' });
                return;
            }

            const action = configMatch[1]; // 'get' or 'save'
            const section = configMatch[2]; // e.g., 'server', 'mcsm', 'docker'

            try {
                // 使用 YAML 安全地读取配置
                let currentConfig;
                if (fs.existsSync(CONFIG_PATH)) {
                    currentConfig = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf-8'));
                } else {
                    currentConfig = DEFAULT_CONFIG;
                }

                // 检查请求的配置节是否存在
                const availableSections = Object.keys(currentConfig);
                if (!availableSections.includes(section) && section !== 'rootAdmin') {
                    jsonResponse(res, 404, { code: -1, msg: `配置节 '${section}' 不存在` });
                    return;
                }

                if (action === 'get' && req.method === 'GET') {
                    // 创建副本以避免修改原始对象
                    let sectionData = JSON.parse(JSON.stringify(currentConfig[section] || {}));

                    // 根据不同的配置节移除敏感信息
                    if (section === 'rootAdmin') {
                        // rootAdmin 不返回任何信息，只用于修改密码
                        sectionData = {};
                    } else if (section === 'mcsm') {
                        // 对 mcsm 的 apiKey 返回占位符
                        if (sectionData.apiKey) {
                            sectionData.apiKey = '********';
                        }
                    }
                    // server 和 rootAdmin 的密码已在 rootAdmin 节处理，此处无需重复

                    jsonResponse(res, 200, { code: 0, msg: 'success', data: sectionData });

                } else if (action === 'save' && req.method === 'POST') {
                    const newData = await parseBody(req);

                    // 特殊处理：安全保存密码和敏感信息
                    if (section === 'rootAdmin') {
                        const newPassword = newData.password;
                        if (newPassword && newPassword.length > 0) {
                            if (!currentConfig.rootAdmin) currentConfig.rootAdmin = {};
                            currentConfig.rootAdmin.password = newPassword;
                        }
                    } else if (section === 'mcsm') {
                        const existingMcsmConfig = currentConfig.mcsm || {};
                        // 如果传入的 apiKey 是占位符，则保留旧的 apiKey
                        if (newData.apiKey === '********') {
                            newData.apiKey = existingMcsmConfig.apiKey;
                        }
                        currentConfig.mcsm = { ...existingMcsmConfig, ...newData };
                    } else {
                        // 对于其他配置节，直接替换
                        currentConfig[section] = newData;
                    }

                    // 使用 YAML 安全地写入配置
                    try {
                        fs.writeFileSync(CONFIG_PATH, yaml.dump(currentConfig));
                        console.log(`⚙️ 配置节 '${section}' 已更新 (YAML)`);
                        jsonResponse(res, 200, { code: 0, msg: `配置 '${section}' 保存成功` });
                    } catch (writeError) {
                        console.error(`❌ 写入 YAML 配置文件失败:`, writeError);
                        jsonResponse(res, 500, { code: -1, msg: '保存配置失败' });
                    }
                } else {
                    res.writeHead(405, { 'Content-Type': 'text/plain' });
                    res.end('Method Not Allowed');
                }
            } catch (e) {
                jsonResponse(res, 500, { code: -1, msg: '处理配置失败: ' + e.message });
            }
            return;
        }

        // ============== 签到 API ==============

        // 执行签到
        if (pathname === '/api/checkin') {
            const username = query.username;
            
            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                return;
            }

            const checkinConfig = checkinManager.getConfig();
            if (!checkinConfig.enabled) {
                jsonResponse(res, 400, { code: -1, msg: '签到功能已关闭' });
                return;
            }

            const result = checkinManager.doCheckin(username);

            if (result.success) {
                jsonResponse(res, 200, {
                    code: 0,
                    msg: '签到成功',
                    data: result.data
                });
            } else {
                jsonResponse(res, 400, {
                    code: -1,
                    msg: result.error
                });
            }
            return;
        }

        // 获取签到状态
        if (pathname === '/api/checkin/status') {
            const username = query.username;
            
            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                return;
            }

            const userCheckin = checkinManager.getUserCheckin(username);
            const hasCheckedIn = checkinManager.hasCheckedInToday(username);
            const checkinConfig = checkinManager.getConfig();

            // 计算今天签到可获得的积分
            let todayReward = 0;
            if (!hasCheckedIn) {
                const continuousDays = checkinManager.calculateContinuousDays(username);
                todayReward = checkinManager.calculateRewardPoints(continuousDays);
            }

            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    username: username,
                    hasCheckedInToday: hasCheckedIn,
                    totalCheckins: userCheckin.totalCheckins,
                    continuousDays: userCheckin.continuousDays,
                    lastCheckinDate: userCheckin.lastCheckinDate,
                    totalCheckinPoints: userCheckin.totalPoints,
                    todayReward: todayReward,
                    history: userCheckin.history.slice(-7),  // 最近7天记录
                    config: checkinConfig
                }
            });
            return;
        }

        // 获取签到配置
        if (pathname === '/api/checkin/config') {
            const checkinConfig = checkinManager.getConfig();
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: checkinConfig
            });
            return;
        }

        // 获取签到排行榜
        if (pathname === '/api/checkin/ranking') {
            const limit = parseInt(query.limit) || 10;
            
            const ranking = Object.values(checkinData)
                .sort((a, b) => {
                    // 先按连续签到天数排序，再按总签到次数排序
                    if (b.continuousDays !== a.continuousDays) {
                        return b.continuousDays - a.continuousDays;
                    }
                    return b.totalCheckins - a.totalCheckins;
                })
                .slice(0, limit)
                .map((user, index) => ({
                    rank: index + 1,
                    username: user.username,
                    continuousDays: user.continuousDays,
                    totalCheckins: user.totalCheckins,
                    totalPoints: user.totalPoints
                }));

            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    total: Object.keys(checkinData).length,
                    ranking: ranking
                }
            });
            return;
        }

        // ============== 兑换码 API ==============

        // 用户兑换码兑换
        if (pathname === '/api/coupon/redeem' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { code, username } = data;

                if (!code) {
                    jsonResponse(res, 400, { code: -1, msg: '请输入兑换码' });
                    return;
                }

                if (!username) {
                    jsonResponse(res, 400, { code: -1, msg: '请输入用户名' });
                    return;
                }

                const result = couponManager.redeem(code.toUpperCase(), username);

                if (result.success) {
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: '兑换成功',
                        data: result.data
                    });
                } else {
                    jsonResponse(res, 400, {
                        code: -1,
                        msg: result.error
                    });
                }
            } catch (e) {
                jsonResponse(res, 400, { code: -1, msg: '无效的请求数据' });
            }
            return;
        }

        // 检查兑换码状态（用户查询）
        if (pathname === '/api/coupon/check') {
            const code = query.code;
            const username = query.username;

            if (!code) {
                jsonResponse(res, 400, { code: -1, msg: '请输入兑换码' });
                return;
            }

            const coupon = couponManager.get(code.toUpperCase());
            
            if (!coupon) {
                jsonResponse(res, 404, { code: -1, msg: '兑换码不存在' });
                return;
            }

            // 返回基本信息（不暴露敏感数据）
            const validation = username ? couponManager.validate(code.toUpperCase(), username) : { valid: true };
            
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    code: coupon.code,
                    type: coupon.type,
                    typeText: coupon.type === 'points' ? '积分' : '续费天数',
                    value: coupon.value,
                    description: coupon.description,
                    status: coupon.status,
                    canRedeem: validation.valid,
                    redeemError: validation.error || null,
                    expiresAt: coupon.expiresAt,
                    maxUses: coupon.maxUses,
                    usedCount: coupon.usedCount,
                    remainingUses: coupon.maxUses ? coupon.maxUses - coupon.usedCount : null
                }
            });
            return;
        }

        // 创建兑换码（管理员）
        if (pathname === '/api/coupon/create' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { code, type, value, maxUses, expiresAt, description } = data;

                const result = couponManager.create({
                    code: code ? code.toUpperCase() : undefined,
                    type: type || 'points',
                    value: parseInt(value) || 0,
                    maxUses: parseInt(maxUses) || 1,
                    expiresAt: expiresAt || null,
                    description: description || ''
                });

                if (result.success) {
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: '创建成功',
                        data: result.coupon
                    });
                } else {
                    jsonResponse(res, 400, {
                        code: -1,
                        msg: result.error
                    });
                }
            } catch (e) {
                jsonResponse(res, 400, { code: -1, msg: '无效的请求数据' });
            }
            return;
        }

        // 批量创建兑换码（管理员）
        if (pathname === '/api/coupon/batch' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { type, value, maxUses, expiresAt, description, count } = data;

                const result = couponManager.createBatch({
                    type: type || 'points',
                    value: parseInt(value) || 0,
                    maxUses: parseInt(maxUses) || 1,
                    expiresAt: expiresAt || null,
                    description: description || ''
                }, parseInt(count) || 1);

                jsonResponse(res, 200, {
                    code: 0,
                    msg: `成功创建 ${result.count} 个兑换码`,
                    data: result.coupons
                });
            } catch (e) {
                jsonResponse(res, 400, { code: -1, msg: '无效的请求数据' });
            }
            return;
        }

        // 获取兑换码列表（管理员）
        if (pathname === '/api/coupon/list') {
            const status = query.status;  // 可选过滤：active, exhausted, disabled
            
            let coupons = couponManager.getAll();
            
            if (status) {
                coupons = coupons.filter(c => c.status === status);
            }

            // 按创建时间倒序排列
            coupons.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    total: coupons.length,
                    coupons: coupons,
                    stats: couponManager.getStats()
                }
            });
            return;
        }

        // 获取单个兑换码详情（管理员）
        if (pathname === '/api/coupon/detail') {
            const code = query.code;

            if (!code) {
                jsonResponse(res, 400, { code: -1, msg: '请输入兑换码' });
                return;
            }

            const coupon = couponManager.get(code.toUpperCase());
            
            if (!coupon) {
                jsonResponse(res, 404, { code: -1, msg: '兑换码不存在' });
                return;
            }

            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: coupon
            });
            return;
        }

        // 删除兑换码（管理员）
        if (pathname === '/api/coupon/delete' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { code } = data;

                if (!code) {
                    jsonResponse(res, 400, { code: -1, msg: '请输入兑换码' });
                    return;
                }

                const result = couponManager.delete(code.toUpperCase());

                if (result.success) {
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: '删除成功'
                    });
                } else {
                    jsonResponse(res, 400, {
                        code: -1,
                        msg: result.error
                    });
                }
            } catch (e) {
                jsonResponse(res, 400, { code: -1, msg: '无效的请求数据' });
            }
            return;
        }

        // 禁用/启用兑换码（管理员）
        if (pathname === '/api/coupon/status' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { code, status } = data;

                if (!code) {
                    jsonResponse(res, 400, { code: -1, msg: '请输入兑换码' });
                    return;
                }

                if (!['active', 'disabled'].includes(status)) {
                    jsonResponse(res, 400, { code: -1, msg: '无效的状态值' });
                    return;
                }

                const result = couponManager.setStatus(code.toUpperCase(), status);

                if (result.success) {
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: status === 'active' ? '已启用' : '已禁用',
                        data: { status: result.status }
                    });
                } else {
                    jsonResponse(res, 400, {
                        code: -1,
                        msg: result.error
                    });
                }
            } catch (e) {
                jsonResponse(res, 400, { code: -1, msg: '无效的请求数据' });
            }
            return;
        }

        // 获取兑换码统计（管理员）
        if (pathname === '/api/coupon/stats') {
            const stats = couponManager.getStats();
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: stats
            });
            return;
        }

        // ============== 服务器创建 API（使用积分调用MCSManager API） ==============

        // 新：计算自定义套餐价格
        if (pathname === '/api/server/calculate-price' && req.method === 'POST') {
            try {
                const customConfig = await parseBody(req);

                if (!customConfig || typeof customConfig !== 'object' || Object.keys(customConfig).length === 0) {
                    jsonResponse(res, 400, { code: -1, msg: '无效的 customConfig 参数' });
                    return;
                }

                const points = calculateCustomPlanPrice(customConfig);

                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: {
                        points: points
                    }
                });

            } catch (e) {
                jsonResponse(res, 500, { code: -1, msg: '计算价格失败: ' + e.message });
            }
            return;
        }

        // 获取服务器套餐列表
        if (pathname === '/api/server/plans') {
            const plans = serverManager.getPlans();
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    plans: plans
                }
            });
            return;
        }

        // 获取自定义套餐配置
        if (pathname === '/api/server/custom-config') {
            const customPlanConfig = config.customPlan || {};
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    enabled: customPlanConfig.enabled !== false,
                    pointsFormula: customPlanConfig.pointsFormula || {
                        memoryPerMB: 0.01,
                        cpuPerPercent: 0.1,
                        diskPerGB: 0.5,
                        perPort: 5
                    },
                    limits: customPlanConfig.limits || {
                        minMemory: 512,
                        maxMemory: 16384,
                        minCpu: 50,
                        maxCpu: 400,
                        minDisk: 5,
                        maxDisk: 100,
                        minPorts: 1,
                        maxPorts: 10
                    },
                    defaultDuration: customPlanConfig.defaultDuration || 30
                }
            });
            return;
        }

        // 获取可用的Docker镜像列表
        if (pathname === '/api/server/images') {
            const images = serverManager.getAvailableImages();
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: { 
                    images: images,
                    defaultImage: config.docker?.defaultImage || 'azul/zulu-openjdk-debian:17-latest'
                }
            });
            return;
        }

        // 获取守护进程节点列表
        if (pathname === '/api/server/daemons') {
            try {
                const result = await serverManager.getDaemons();
                if (result.success) {
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: 'success',
                        data: { daemons: result.daemons }
                    });
                } else {
                    jsonResponse(res, 500, {
                        code: -1,
                        msg: result.error
                    });
                }
            } catch (e) {
                jsonResponse(res, 500, { code: -1, msg: '获取节点列表失败: ' + e.message });
            }
            return;
        }

        // 创建服务器（使用积分）
        if (pathname === '/api/server/create' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username, planId, serverName, daemonId, imageId, customConfig } = data;

                if (!username) {
                    jsonResponse(res, 400, { code: -1, msg: '请输入用户名' });
                    return;
                }

                if (!planId) {
                    jsonResponse(res, 400, { code: -1, msg: '请选择套餐' });
                    return;
                }

                // 如果是自定义套餐，验证自定义配置
                if (planId === 'custom' && !customConfig) {
                    jsonResponse(res, 400, { code: -1, msg: '自定义套餐需要提供配置参数' });
                    return;
                }

                // 验证用户是否存在于MCSManager
                const mcsmValidation = validateMcsmUser(username);
                if (mcsmValidation.directoryExists && !mcsmValidation.valid) {
                    jsonResponse(res, 400, { 
                        code: -1, 
                        msg: mcsmValidation.message || '用户不存在于MCSManager'
                    });
                    return;
                }

                // 调用serverManager创建服务器（传入imageId和customConfig参数）
                const result = await serverManager.createServer(username, planId, serverName, daemonId, imageId, customConfig);

                if (result.success) {
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: '服务器创建成功',
                        data: result.data
                    });
                } else {
                    jsonResponse(res, 400, {
                        code: -1,
                        msg: result.error,
                        data: {
                            required: result.required,
                            current: result.current
                        }
                    });
                }
            } catch (e) {
                console.error('创建服务器失败:', e);
                jsonResponse(res, 500, { code: -1, msg: '创建服务器失败: ' + e.message });
            }
            return;
        }

        // 获取用户的服务器列表（本地记录）
        if (pathname === '/api/server/list') {
            const username = query.username;
            
            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                return;
            }

            const servers = serverManager.getUserServers(username);
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    servers: servers,
                    total: servers.length
                }
            });
            return;
        }

        // 获取服务器详情
        if (pathname === '/api/server/detail') {
            const serverId = query.serverId || query.uuid;
            
            if (!serverId) {
                jsonResponse(res, 400, { code: -1, msg: '缺少serverId参数' });
                return;
            }

            const server = serverManager.getServer(serverId);
            
            if (!server) {
                jsonResponse(res, 404, { code: -1, msg: '服务器不存在' });
                return;
            }

            // 尝试从MCSManager获取实时状态
            try {
                if (server.daemonId) {
                    const instanceDetail = await mcsmApi.getInstance(server.daemonId, serverId);
                    if (instanceDetail.data.status === 200 && instanceDetail.data.data) {
                        const instConfig = instanceDetail.data.data.config || {};
                        server.mcsmStatus = instanceDetail.data.data.status;
                        server.mcsmEndTime = instConfig.endTime;
                        server.mcsmEndTimeFormatted = instConfig.endTime 
                            ? new Date(instConfig.endTime).toLocaleString('zh-CN')
                            : '永久';
                        server.nickname = instConfig.nickname;
                    }
                }
            } catch (e) {
                console.error('获取MCSManager实例状态失败:', e.message);
            }

            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: server
            });
            return;
        }

        // 获取所有服务器（管理员）
        if (pathname === '/api/server/all') {
            const servers = serverManager.getAllServers();
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    servers: servers,
                    total: servers.length,
                    stats: serverManager.getStats()
                }
            });
            return;
        }

        // 获取服务器统计（管理员）
        if (pathname === '/api/server/stats') {
            const stats = serverManager.getStats();
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: stats
            });
            return;
        }

        // ============== 实例管理 API（管理员手动添加/移除实例） ==============

        // 手动将实例添AAAAAAAAAAAAASS加到用户账户
        if (pathname === '/api/mcsm/instance/add' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username, daemonId, instanceUuid } = data;

                if (!username) {
                    jsonResponse(res, 400, { code: -1, msg: '请输入用户名' });
                    return;
                }

                if (!daemonId) {
                    jsonResponse(res, 400, { code: -1, msg: '请输入守护进程ID (daemonId)' });
                    return;
                }

                if (!instanceUuid) {
                    jsonResponse(res, 400, { code: -1, msg: '请输入实例UUID' });
                    return;
                }

                const result = addInstanceToMcsmUser(username, daemonId, instanceUuid);

                if (result.success) {
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: '实例添加成功',
                        data: {
                            username: username,
                            daemonId: daemonId,
                            instanceUuid: instanceUuid,
                            user: result.user,
                            instanceCount: result.instanceCount
                        }
                    });
                } else {
                    jsonResponse(res, 400, {
                        code: -1,
                        msg: result.error,
                        data: { user: result.user || null }
                    });
                }
            } catch (e) {
                jsonResponse(res, 400, { code: -1, msg: '无效的请求数据: ' + e.message });
            }
            return;
        }

        // 从用户账户移除实例
        if (pathname === '/api/mcsm/instance/remove' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username, instanceUuid } = data;

                if (!username) {
                    jsonResponse(res, 400, { code: -1, msg: '请输入用户名' });
                    return;
                }

                if (!instanceUuid) {
                    jsonResponse(res, 400, { code: -1, msg: '请输入实例UUID' });
                    return;
                }

                const result = removeInstanceFromMcsmUser(username, instanceUuid);

                if (result.success) {
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: '实例移除成功',
                        data: {
                            username: username,
                            instanceUuid: instanceUuid,
                            user: result.user,
                            instanceCount: result.instanceCount
                        }
                    });
                } else {
                    jsonResponse(res, 400, {
                        code: -1,
                        msg: result.error
                    });
                }
            } catch (e) {
                jsonResponse(res, 400, { code: -1, msg: '无效的请求数据: ' + e.message });
            }
            return;
        }

        // 获取用户的 MCSManager 详细信息（包括实例列表）
        if (pathname === '/api/mcsm/user/detail') {
            const username = query.username;
            
            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                return;
            }

            const result = getMcsmUserByUsername(username);

            if (result.success) {
                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: result.user
                });
            } else {
                jsonResponse(res, 400, {
                    code: -1,
                    msg: result.error,
                    data: { directoryExists: result.directoryExists }
                });
            }
            return;
        }

        // ============== 公告 API ==============
        if (pathname === '/api/announcement' && req.method === 'GET') {
            const announcement = readJsonFile(ANNOUNCEMENT_PATH, { content: '' });
            jsonResponse(res, 200, { code: 0, msg: 'success', data: announcement });
            return;
        }

        if (pathname === '/api/announcement' && req.method === 'POST') {
            // 假设你有一个认证函数 authenticate(req)
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '未授权的访问' });
                return;
            }
            try {
                const data = await parseBody(req);
                const { content } = data;
                if (typeof content !== 'string') {
                    jsonResponse(res, 400, { code: -1, msg: '内容必须是字符串' });
                    return;
                }
                if (writeJsonFile(ANNOUNCEMENT_PATH, { content })) {
                    console.log('📢 公告已更新');
                    jsonResponse(res, 200, { code: 0, msg: '公告更新成功' });
                } else {
                    jsonResponse(res, 500, { code: -1, msg: '写入公告文件失败' });
                }
            } catch (e) {
                jsonResponse(res, 400, { code: -1, msg: '无效的请求数据' });
            }
            return;
        }

        // ============== 静态文件服务 ==============

        // 支付页面
        if (pathname.startsWith('/payment/') || pathname === '/payment') {
            let filePath = pathname.replace('/payment', '');
            if (filePath === '' || filePath === '/') {
                filePath = '/index.html';
            }
            const fullPath = path.join(__dirname, 'public/payment', filePath);
            serveStaticFile(res, fullPath);
            return;
        }

        // 充值页面
        if (pathname.startsWith('/recharge/') || pathname === '/recharge') {
            let filePath = pathname.replace('/recharge', '');
            if (filePath === '' || filePath === '/') {
                filePath = '/recharge.html';
            }
            const fullPath = path.join(__dirname, 'public/recharge', filePath);
            serveStaticFile(res, fullPath);
            return;
        }

        // 管理页面
        if (pathname.startsWith('/admin/') || pathname === '/admin') {
            let filePath = pathname.replace('/admin', '');
            if (filePath === '' || filePath === '/') {
                filePath = '/index.html';
            }
            const fullPath = path.join(__dirname, 'public/admin', filePath);
            serveStaticFile(res, fullPath);
            return;
        }

        // 管理员页面（隐藏入口，只能通过 /root 访问）
        if (pathname.startsWith('/root/') || pathname === '/root') {
            let filePath = pathname.replace('/root', '');
            if (filePath === '' || filePath === '/') {
                filePath = '/index.html';
            }
            const fullPath = path.join(__dirname, 'public/root', filePath);
            serveStaticFile(res, fullPath);
            return;
        }

        // 新增：提供 node_modules 中的文件
        if (pathname.startsWith('/node_modules/')) {
            const filePath = path.join(__dirname, pathname);
            serveStaticFile(res, filePath);
            return;
        }

        // 默认首页 - 直接重定向到管理页面
        if (pathname === '/' || pathname === '') {
            res.writeHead(302, { 'Location': '/admin/' });
            res.end();
            return;
        }

        // 其他静态文件
        const staticPath = path.join(__dirname, 'public', pathname);
        if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
            serveStaticFile(res, staticPath);
            return;
        }

        // 404
        jsonResponse(res, 404, { status: 'error', message: '接口或页面不存在' });

    } catch (error) {
        console.error('请求处理错误:', error);
        jsonResponse(res, 500, { status: 'error', error: error.message });
    }
});

// ============== 启动服务器 ==============

function startServer() {
    // 加载本地数据
    loadLocalData();

    const PORT = config.server.port;
    const HOST = config.server.host;

    server.listen(PORT, HOST, () => {
        console.log(`
   __  __                    
  |  \\/  | __      __  _ __  
  | |\\/| | \\ \\ /\\ / / | '_ \\ 
  | |  | |  \\ V  V /  | |_) |
  |_|  |_|   \\_/\\_/   | .__/ 
                      |_|    
        `);
        console.log(`🎉 服务已启动! 访问 http://${HOST}:${PORT}`);
    });
}

// 启动
startServer();
