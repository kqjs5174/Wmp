/**
 * 神秘Mwp程序
 * https://github.com/kqjs5174/Wmp
 * 本程序已经在GitHub开源
 */

const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const path = require('path');
const url = require('url');
const bcrypt = require('bcrypt');
const yaml = require('js-yaml');
const toml = require('@iarna/toml');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const captcha = require('svg-captcha');
const Logger = require('./logger');
const WebSocket = require('ws');
const nodemailer = require('nodemailer');

// 尝试加载canvas，如果失败则使用文字模式
let createCanvas = null;
let canvasAvailable = false;

try {
    const canvas = require('canvas');
    createCanvas = canvas.createCanvas;
    canvasAvailable = true;
    // 注意：此时 Logger 还未初始化，暂时使用 console.log
    console.log('Canvas库加载成功，将使用图片模式');
} catch (e) {
    console.log('Canvas库未安装，将使用文字模式');
    console.log('提示:如果要使用图片功能，请安装完整依赖(Canvas)');
}


// ============== 配置文件处理 ==============
const CONFIG_PATH = path.join(__dirname, 'config.yml');
const DATA_DIR = path.join(__dirname, 'data');
const USER_DATA_DIR = path.join(DATA_DIR, 'User');

// 数据文件路径（全局数据）
const PROCESSED_PAYMENTS_PATH = path.join(DATA_DIR, 'processed_payments.json');
const COUPONS_PATH = path.join(DATA_DIR, 'coupons.json');
const ANNOUNCEMENT_PATH = path.join(DATA_DIR, 'announcement.json');
const TEMP_DIR = path.join(__dirname, 'bot', 'temp');

// 带注释的默认配置模板（用于生成 config.yml）
const DEFAULT_CONFIG_WITH_COMMENTS = `# ============== 服务器配置 ==============
server:
  host: 0.0.0.0              # 监听地址，0.0.0.0 表示监听所有网卡
  port: 3000                 # 服务端口
  ssl:
    enabled: false           # 是否启用 HTTPS
    key: ssl/key.pem         # SSL 私钥文件路径
    cert: ssl/cert.pem       # SSL 证书文件路径
  proxy:
    enabled: false           # 是否启用 PROXY Protocol 支持（用于 FRP 等反向代理）
    version: 2               # PROXY Protocol 版本（1 或 2）

# ============== 服务模块配置 ==============
services:
  payment:
    enabled: true            # 是否启用支付功能
    prefix: /payment         # 支付页面路径前缀
    backend:
      url: http://YOU_PAY_IP/query_payment  # 支付查询API地址
      timeout: 10000         # 请求超时时间（毫秒）
  
  recharge:
    enabled: true            # 是否启用充值功能
    prefix: /recharge        # 充值页面路径前缀
    pointsRatio: 4           # 充值比例（1元 = 6积分）
    verificationWindow: 300  # 支付验证时间窗口（秒）
  
  admin:
    enabled: true            # 是否启用管理面板
    prefix: /admin           # 管理面板路径前缀

# ============== MCSManager 面板配置 ==============
mcsm:
  panelUrl: https://panel.example.com:23333  # MCSManager 面板地址（请修改）
  apiKey: YOUR_API_KEY_HERE                  # MCSManager API 密钥（请修改）
  daemonId: ''                               # 默认守护进程 ID（可选）
  userDataPath: ''                           # 用户数据路径（可选）
  daemonDataPath: ''                         # 守护进程数据路径（可选）

# ============== 转账配置 ==============
transfer:
  taxRate: 0                # 转账税率（0=无税，10=10%，5=5%），转出方额外支付 amount * (taxRate/100) 作为手续费

# ============== 续费配置 ==============
renewal:
  pricePerDay: 0.4          # 每天续费价格（积分）
  minAmount: 10             # 最小续费金额
  defaultDays: 30           # 默认续费天数

# ============== 退款配置 ==============
refund:
  rate: 90                  # 退款比例（百分比，90=退还90%，100=全额退还）

# ============== 自动续费配置 ==============
autoRenewal:
  enabled: true             # 是否启用自动续费功能
  checkInterval: 15         # 检查间隔（分钟）
  defaultAdvanceDays: 3     # 默认提前续费天数
  defaultRenewalDays: 30    # 默认续费天数
  minPointsReserve: 50      # 默认最低积分保留
  maxRetries: 3             # 失败重试次数
  notifyOnSuccess: true     # 续费成功是否通知
  notifyOnFailure: true     # 续费失败是否通知

# ============== 认证配置 ==============
auth:
  method: mcsm_bcrypt       # 认证方式：local（本地）或 mcsm_bcrypt（MCSManager）
  jwtSecret:   # JWT 密钥（首次启动会自动生成）
  
  # 自定义套餐积分计算公式
  pointsFormula:
    memoryPerMB: 0.01       # 每 MB 内存的积分
    cpuPerPercent: 0.1      # 每 1% CPU 的积分
    diskPerGB: 0.5          # 每 GB 磁盘的积分
    perPort: 5              # 每个端口的积分
    bandwidthPerMbps: 2     # 每 Mbps 带宽的积分
  
  # 自定义套餐资源限制
  limits:
    minMemory: 512          # 最小内存（MB）
    maxMemory: 16384        # 最大内存（MB）
    minCpu: 50              # 最小 CPU（%）
    maxCpu: 400             # 最大 CPU（%）
    minDisk: 5              # 最小磁盘（GB）- 已废弃，不再使用，储存必须为整数
    maxDisk: 100            # 最大磁盘（GB）
    minPorts: 1             # 最小端口数
    maxPorts: 10            # 最大端口数
    minBandwidth: 1         # 最小带宽（Mbps）
    maxBandwidth: 100       # 最大带宽（Mbps）
  
  defaultDuration: 30       # 默认时长（天）

# ============== 管理员配置 ==============
rootAdmin:
  password:             # 管理员密码哈希（首次访问 /admin 页面设置）
  passwordSet: false        # 密码是否已设置

# ============== CORS 跨域配置 ==============
cors:
  allowedOrigins:
    - '*'                   # 允许的来源，'*' 表示允许所有

# ============== Docker 镜像配置 ==============
docker:
  defaultImage: azul/zulu-openjdk-debian:17-latest  # 默认 Docker 镜像
  
  # 可用的 Docker 镜像列表
  availableImages:
    - id: java21
      name: Java 21 (Zulu OpenJDK)
      image: azul/zulu-openjdk-debian:21-latest
      description: 适用于 Minecraft 1.20.5+ 等需要 Java 21 的服务端
    
    - id: java17
      name: Java 17 (Zulu OpenJDK)
      image: azul/zulu-openjdk-debian:17-latest
      description: 适用于 Minecraft 1.17-1.20.4 等需要 Java 17 的服务端
    
    - id: java8
      name: Java 8 (Zulu OpenJDK)
      image: azul/zulu-openjdk-debian:8-latest
      description: 适用于 Minecraft 1.16 及更早版本等需要 Java 8 的服务端
    
    - id: mcdr
      name: MCDReforged (Python 3.12)
      image: mcdreforged/mcdreforged:dev-py3.12
      description: MCDReforged 服务端管理框架，适用于需要插件管理的服务器
    
    - id: java25
      name: Java 25 (Zulu OpenJDK)
      image: azul/zulu-openjdk-debian:25-latest
      description: 适用于 Minecraft 1.21.5 及更高版本等需要 Java 25 的服务端

# ============== 签到系统配置 ==============
checkin:
  enabled: true             # 是否启用签到功能
  basePoints: 10            # 基础签到积分
  continuousBonus: 5        # 连续签到奖励
  maxContinuousBonus: 50    # 最大连续签到奖励

# ============== 每日消耗配置 ==============
dailyConsumption:
  enabled: false             # 是否启用每日消耗(好像有bug)
  pointsPerServer: 1        # 每个服务器每日消耗积分

# ============== QQ 机器人配置 ==============
onebot:
  enabled: false                         # 是否启用QQ机器人（true=启用, false=禁用）
  ws_url: ws://127.0.0.1:3001           # OneBot WebSocket 地址
  access_token: ''                      # OneBot 访问令牌（如果需要）
  target_group: ''                      # 目标 QQ 群号
  verify_timeout: 120                   # 验证码超时时间（秒）

# ============== 日志配置 ==============
logging:
  enabled: true              # 是否启用日志
  level: info                # 日志级别: debug, info, warn, error
  console: true              # 是否输出到控制台
  file: true                 # 是否输出到文件
  directory: logs            # 日志文件目录
  maxFiles: 7                # 保留最近几天的日志文件
  format: '[{timestamp}] [{level}] {message}'  # 日志格式

# ============== 邮件配置 ==============
email:
  enabled: false             # 是否启用邮件功能
  host: ''                   # SMTP 服务器地址
  port: 25                  # SMTP 端口（25/465/587）
  secure: true               # 是否使用 SSL
  auth:
    user: ''                 # 发件邮箱（如：6767676767@qq.com）
    pass: ''                 # 邮箱密码
  from: ''                   # 发件人显示名称（如：'服务器管理 <your-email@qq.com>'）
  codeExpireMinutes: 10      # 验证码有效期（分钟）
  tls:
    rejectUnauthorized: false # 忽略证书验证

# ============== 高级配置（时间参数） ==============
advanced:
  # --- JWT 令牌过期时间 ---
  jwtExpiresAdmin: 1h             # 管理员 JWT 过期时间（如 1h, 2h, 30m）
  jwtExpiresUser: 1d              # 用户 JWT 过期时间（如 1d, 7d, 12h）
  
  # --- 定时清理间隔 ---
  cleanupIntervalMs: 300000       # 数据清理间隔（毫秒），默认 5分钟(300000)
  
  # --- 图形验证码 ---
  captchaExpireMs: 175000         # 图形验证码过期时间（毫秒），默认 175秒
  captchaSize: 4                  # 验证码字符数量
  captchaIgnoreChars: "0o1i"      # 排除的相似字符
  
  # --- 待支付订单 ---
  pendingOrderExpireMs: 600000    # 待支付订单过期时间（毫秒），默认 10分钟
  paymentHeartbeatTimeoutMs: 20000  # 支付心跳超时（毫秒），默认 20秒
  
  # --- 转账请求 ---
  transferRequestExpireMs: 300000  # 转账请求过期时间（毫秒），默认 5分钟
  
  # --- 邮箱验证码 ---
  emailCodeCooldownMs: 60000      # 邮箱验证码发送冷却（毫秒），默认 60秒
  
  # --- QQ机器人 ---
  qqRenewalSessionTimeoutMs: 120000  # QQ续费会话超时（毫秒），默认 2分钟
  qqHeartbeatIntervalMs: 30000       # QQ机器人心跳间隔（毫秒），默认 30秒
  qqReconnectDelayMs: 5000           # QQ机器人重连延迟（毫秒），默认 5秒
  qqBindCleanupDelayMs: 30000        # QQ绑定验证码留存时间（毫秒），默认 30秒
  qqImageCleanupDelayMs: 5000        # QQ图片清理延迟（毫秒），默认 5秒
  qqVerifyCleanupIntervalMs: 60000   # QQ验证码清理间隔（毫秒），默认 1分钟
  
  # --- MCSM 状态检查 ---
  mcsmStatusCheckTimeoutMs: 5000     # MCSM 面板状态检查超时（毫秒），默认 5秒
  
  # --- 实例创建 ---
  instanceCreateDelayMs: 1000        # 创建实例后配置修改延迟（毫秒），默认 1秒
  
  # --- 速率限制 ---
  rateLimit:
    loginMaxRequests: 5              # 登录速率：时间窗口内最大请求数
    loginWindowMs: 60000             # 登录速率：时间窗口（毫秒）
    adminLoginMaxRequests: 3         # 管理员登录速率：时间窗口内最大请求数
    adminLoginWindowMs: 60000        # 管理员登录速率：时间窗口（毫秒）
    emailCodeMaxRequests: 3          # 邮箱验证码速率：时间窗口内最大请求数
    emailCodeWindowMs: 60000         # 邮箱验证码速率：时间窗口（毫秒）
    registerMaxRequests: 5           # 注册速率：时间窗口内最大请求数
    registerWindowMs: 3600000        # 注册速率：时间窗口（毫秒），默认 1小时
    checkinResetMaxRequests: 5       # 签到重置速率：时间窗口内最大请求数
    checkinResetWindowMs: 60000      # 签到重置速率：时间窗口（毫秒）
    checkinClearMaxRequests: 3       # 签到清空速率：时间窗口内最大请求数
    checkinClearWindowMs: 300000     # 签到清空速率：时间窗口（毫秒）
    pointsQueryMinRequests: 3        # 清空签到数据速率：时间窗口内最大请求数
  
  # --- QQ机器人延迟启动 ---
  qqBotStartDelayMs: 2000            # QQ机器人启动延迟（毫秒），默认 2秒
  autoRenewalStartDelayMs: 3000      # 自动续费启动延迟（毫秒），默认 3秒
  
  # --- 优雅退出 ---
  forceExitTimeoutMs: 5000            # 强制退出超时（毫秒），默认 5秒
  
  # --- MongoDB 操作间隔 ---
  autoRenewalOperationIntervalMs: 1000  # 自动续费操作间隔（毫秒），默认 1秒

`;

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    // 注意：此时 Logger 还未初始化，暂时使用 console.log
    console.log('data不存在,已创建数据目录: data/');
}
if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

// 加载或创建配置
function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        // 使用带注释的模板生成配置文件
        fs.writeFileSync(CONFIG_PATH, DEFAULT_CONFIG_WITH_COMMENTS);
        // 注意：此时 Logger 还未初始化，暂时使用 console.log
        console.log('已生成默认配置文件: config.yml');
        console.log('请根据需要修改配置后重启服务');
        // 解析刚生成的配置文件作为默认配置返回
        const defaultConfig = yaml.load(DEFAULT_CONFIG_WITH_COMMENTS);
        return defaultConfig;
    }
    try {
        const rawConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const config = yaml.load(rawConfig);
        // 注意：此时 Logger 还未初始化，暂时使用 console.log
        console.log('找到配置文件:config.yml');

        // 检查 rootAdmin.passwordSet 状态
        if (!config.rootAdmin) {
            config.rootAdmin = { password: null, passwordSet: false };
        } else if (config.rootAdmin.password === null || config.rootAdmin.password === '') {
            config.rootAdmin.passwordSet = false;
        } else {
            config.rootAdmin.passwordSet = true;
        }
        return config;
    } catch (e) {
        console.error('配置文件解析失败，需要手动干预');
        console.error('错误详情:', e.message);
        // 解析默认配置模板作为后备
        return yaml.load(DEFAULT_CONFIG_WITH_COMMENTS);
    }
}

let config = loadConfig(); // 将 const 改为 let，以便后续更新

// ============== 日志系统初始化 ==============
const logger = new Logger(config.logging || {});
logger.info('========================================');
logger.info('系统启动中...');
logger.info('配置文件加载完成');

// 如果密码未设置，则在启动时提示
if (!config.rootAdmin.passwordSet) {
    logger.warn('管理员密码未设置！请访问 /admin 页面进行初始化设置');
}

// ============== JWT 密钥管理 ==============
let JWT_SECRET = config.auth?.jwtSecret;

// 如果密钥不存在、为空或为默认值，则生成新密钥并保存
if (!JWT_SECRET || JWT_SECRET === 'your-default-super-secret-key-change-it') {
    logger.info('JWT 密钥未配置或为空，正在生成新的安全密钥...');
    const newSecret = crypto.randomBytes(32).toString('hex');
    
    // 确保 auth 对象存在
    if (!config.auth) {
        config.auth = {};
    }
    config.auth.jwtSecret = newSecret;
    
    // 将带有新密钥的配置写回 config.yml，同时保留注释
    try {
        const rawConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const jwtSecretRegex = /jwtSecret:\s*["']?.*["']?/;
        const newJwtLine = `jwtSecret: "${newSecret}"`;
        
        const updatedConfig = rawConfig.replace(jwtSecretRegex, newJwtLine);
        
        fs.writeFileSync(CONFIG_PATH, updatedConfig, 'utf-8');
        
        logger.info('新的 JWT 密钥已成功生成并保存到 config.yml');
        JWT_SECRET = newSecret;
    } catch (e) {
        logger.error('无法将新的 JWT 密钥写入 config.yml:', e.message);
        logger.warn('将使用临时生成的密钥，重启后会失效。请检查文件权限。');
        JWT_SECRET = newSecret; // 即使保存失败，也在当前会话中使用新密钥
    }
} else {
    logger.info('已从 config.yml 加载 JWT 密钥');
}

// ============== 邮件发送器初始化 ==============
let emailTransporter = null;

if (config.email && config.email.enabled) {
    try {
        const emailConfig = {
            host: config.email.host,
            port: config.email.port || 465,
            secure: config.email.secure !== false, // 默认使用 SSL
            auth: {
                user: config.email.auth.user,
                pass: config.email.auth.pass
            }
        };

        // 如果配置了 service，使用预设配置
        if (config.email.service) {
            emailConfig.service = config.email.service;
            delete emailConfig.host; // service 和 host 不能同时使用
            delete emailConfig.port;
        }

        // 如果配置了 tls 选项，添加到配置中
        if (config.email.tls) {
            emailConfig.tls = config.email.tls;
        }

        emailTransporter = nodemailer.createTransport(emailConfig);
        
        // 验证邮件配置
        emailTransporter.verify((error, success) => {
            if (error) {
                logger.error('邮件服务器连接失败:', error.message);
                logger.warn('邮件功能将不可用，请检查 config.yml 中的邮件配置');
                emailTransporter = null;
            } else {
                logger.info('✓ 邮件服务器连接成功');
            }
        });
    } catch (e) {
        logger.error('初始化邮件发送器失败:', e.message);
        emailTransporter = null;
    }
} else {
    logger.warn('邮件功能未启用，注册功能将不可用');
}

// ============== 数据存储 ==============

// 本地数据缓存
let localOrders = {};
let localUsers = [];
let localPoints = {};
let processedOrders = {};
let processedPayments = {}; // 已处理的支付记录 { "金额_时间": { orderId, processedAt } }
let pendingOrders = {}; // 新增：待支付订单 { orderId: { amount, createdAt, expiresAt } }
let checkinData = {};
let couponsData = {};
let serversData = {};
let lastSyncTime = null;

// QQ机器人相关数据
let botData = { bindings: {}, pendingVerify: {}, pendingTransfers: {} };
const userSessions = new Map(); // 用户会话状态（用于续费流程）

// 自动续费数据
let autoRenewalData = {}; // { username: { instanceUuid: { enabled, renewalDays, advanceDays, minPointsReserve, ... } } }
let autoRenewalCheckTimer = null; // 自动续费检查定时器
let userDataSyncTimer = null; // 用户归档同步定时器

// 验证码存储 (生产环境应使用更安全的会话或缓存机制)
const captchaStore = {};

// 邮箱验证码存储 { email: { code, expiresAt, username } }
const emailCodeStore = {};

// 速率限制存储 (IP -> {count, resetTime})
const rateLimitStore = {};

// 定期清理过期的验证码和速率限制记录 (每5分钟清理一次)
setInterval(() => {
    const now = Date.now();
    let cleanedCaptcha = 0;
    let cleanedRateLimit = 0;
    let cleanedEmailCode = 0;
    
    // 清理过期验证码
    for (const captchaId in captchaStore) {
        if (captchaStore[captchaId].expiresAt < now) {
            delete captchaStore[captchaId];
            cleanedCaptcha++;
        }
    }
    
    // 清理过期的邮箱验证码
    for (const email in emailCodeStore) {
        if (emailCodeStore[email].expiresAt < now) {
            delete emailCodeStore[email];
            cleanedEmailCode++;
        }
    }
    
    // 清理过期的速率限制记录
    for (const ip in rateLimitStore) {
        if (rateLimitStore[ip].resetTime < now) {
            delete rateLimitStore[ip];
            cleanedRateLimit++;
        }
    }
    
    // 清理过期的待支付订单
    const cleanedPending = cleanExpiredPendingOrders();
    
    if (cleanedCaptcha > 0 || cleanedRateLimit > 0 || cleanedPending > 0 || cleanedEmailCode > 0) {
        logger.info(`清理了 ${cleanedCaptcha} 个过期验证码, ${cleanedEmailCode} 个邮箱验证码, ${cleanedRateLimit} 个速率限制记录, ${cleanedPending} 个待支付订单`);
    }
}, 5 * 60 * 1000);

/**
 * 速率限制中间件
 * @param {string} ip - 客户端IP
 * @param {number} maxRequests - 时间窗口内最大请求数
 * @param {number} windowMs - 时间窗口(毫秒)
 * @returns {boolean} - 是否允许请求
 */
function checkRateLimit(ip, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    
    if (!rateLimitStore[ip]) {
        rateLimitStore[ip] = {
            count: 1,
            resetTime: now + windowMs
        };
        return true;
    }
    
    const record = rateLimitStore[ip];
    
    // 如果时间窗口已过，重置计数
    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        return true;
    }
    
    // 检查是否超过限制
    if (record.count >= maxRequests) {
        return false;
    }
    
    record.count++;
    return true;
}

/**
 * 解析 PROXY Protocol v1
 * 格式: PROXY TCP4/TCP6 srcIP dstIP srcPort dstPort\r\n
 */
function parseProxyProtocolV1(buffer) {
    const line = buffer.toString('ascii', 0, Math.min(buffer.length, 108));
    const crlfIndex = line.indexOf('\r\n');
    
    if (crlfIndex === -1) {
        return null;
    }
    
    const header = line.substring(0, crlfIndex);
    const parts = header.split(' ');
    
    if (parts[0] !== 'PROXY') {
        return null;
    }
    
    if (parts.length < 6) {
        return null;
    }
    
    return {
        protocol: parts[1], // TCP4 or TCP6
        srcAddress: parts[2],
        dstAddress: parts[3],
        srcPort: parseInt(parts[4]),
        dstPort: parseInt(parts[5]),
        headerLength: crlfIndex + 2
    };
}

/**
 * 解析 PROXY Protocol v2
 * 二进制格式，详见: https://www.haproxy.org/download/1.8/doc/proxy-protocol.txt
 */
function parseProxyProtocolV2(buffer) {
    // PROXY Protocol v2 签名: \x0D\x0A\x0D\x0A\x00\x0D\x0A\x51\x55\x49\x54\x0A
    const signature = Buffer.from([0x0D, 0x0A, 0x0D, 0x0A, 0x00, 0x0D, 0x0A, 0x51, 0x55, 0x49, 0x54, 0x0A]);
    
    if (buffer.length < 16) {
        return null;
    }
    
    // 验证签名
    if (!buffer.slice(0, 12).equals(signature)) {
        return null;
    }
    
    const verCmd = buffer[12];
    const version = (verCmd & 0xF0) >> 4;
    const command = verCmd & 0x0F;
    
    if (version !== 2) {
        return null;
    }

    const addrLen = buffer.readUInt16BE(14);
    const headerLength = 16 + addrLen;

    if (buffer.length < headerLength) {
        return null;
    }
    
    // command: 0 = LOCAL (健康检查), 1 = PROXY
    if (command === 0) {
        // LOCAL 命令，忽略地址信息
        return {
            isLocal: true,
            headerLength
        };
    }
    
    const famProto = buffer[13];
    const family = (famProto & 0xF0) >> 4;
    const protocol = famProto & 0x0F;
    
    let srcAddress, dstAddress, srcPort, dstPort;
    
    // family: 1 = AF_INET (IPv4), 2 = AF_INET6 (IPv6)
    if (family === 1) {
        // IPv4
        srcAddress = `${buffer[16]}.${buffer[17]}.${buffer[18]}.${buffer[19]}`;
        dstAddress = `${buffer[20]}.${buffer[21]}.${buffer[22]}.${buffer[23]}`;
        srcPort = buffer.readUInt16BE(24);
        dstPort = buffer.readUInt16BE(26);
    } else if (family === 2) {
        // IPv6
        const srcParts = [];
        const dstParts = [];
        for (let i = 0; i < 8; i++) {
            srcParts.push(buffer.readUInt16BE(16 + i * 2).toString(16));
            dstParts.push(buffer.readUInt16BE(32 + i * 2).toString(16));
        }
        srcAddress = srcParts.join(':');
        dstAddress = dstParts.join(':');
        srcPort = buffer.readUInt16BE(48);
        dstPort = buffer.readUInt16BE(50);
    } else {
        // 未知地址族
        return {
            headerLength: headerLength
        };
    }
    
    return {
        protocol: family === 1 ? 'TCP4' : 'TCP6',
        srcAddress,
        dstAddress,
        srcPort,
        dstPort,
        headerLength
    };
}

/**
 * 获取客户端IP地址
 */
function getClientIp(req) {
    // 优先使用 PROXY Protocol 解析出的真实 IP
    if (req.proxyProtocol && req.proxyProtocol.srcAddress) {
        return req.proxyProtocol.srcAddress;
    }
    
    // 其次使用 HTTP 头中的代理信息
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
}

// 通用文件读写函数
function readJsonFile(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) {
        return defaultValue;
    }
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(data);
        // 确保返回的是对象，如果解析结果不是对象则返回默认值
        if (typeof parsed !== 'object' || parsed === null) {
            logger.warn(`文件内容格式错误 ${filePath}，使用默认值`);
            return defaultValue;
        }
        return parsed;
    } catch (e) {
        logger.error(`读取文件失败 ${filePath}:`, e.message);
        return defaultValue;
    }
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (e) {
        logger.error(`写入文件失败 ${filePath}:`, e.message);
        return false;
    }
}

function ensureUserDataDirectory() {
    if (!fs.existsSync(USER_DATA_DIR)) {
        fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    }
}

function safeFileName(value) {
    return String(value || 'unknown').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

function getUserUuid(username) {
    const user = localUsers.find(u => u.username === username);
    return user?.id || username;
}

function getUsernameFromOrderId(orderId) {
    if (!orderId || typeof orderId !== 'string') return null;
    const parts = orderId.split('_');
    return parts.length > 1 ? parts[0] : null;
}

function getKnownUsernames() {
    const usernames = new Set();

    localUsers.forEach(user => {
        if (user?.username) usernames.add(user.username);
    });

    Object.keys(localPoints || {}).forEach(username => usernames.add(username));
    Object.keys(checkinData || {}).forEach(username => usernames.add(username));
    Object.keys(autoRenewalData || {}).forEach(username => usernames.add(username));
    Object.keys(botData?.bindings || {}).forEach(username => usernames.add(username));
    Object.keys(localOrders || {}).forEach(orderId => {
        const username = getUsernameFromOrderId(orderId);
        if (username) usernames.add(username);
    });
    Object.keys(pendingOrders || {}).forEach(orderId => {
        const username = getUsernameFromOrderId(orderId);
        if (username) usernames.add(username);
    });

    Object.values(serversData || {}).forEach(server => {
        if (server?.userId) usernames.add(server.userId);
    });

    Object.values(couponsData || {}).forEach(coupon => {
        (coupon?.usedBy || []).forEach(username => usernames.add(username));
    });

    Object.values(botData?.pendingVerify || {}).forEach(verify => {
        if (verify?.username) usernames.add(verify.username);
    });

    Object.values(botData?.pendingTransfers || {}).forEach(transfer => {
        if (transfer?.fromUsername) usernames.add(transfer.fromUsername);
        if (transfer?.toUsername) usernames.add(transfer.toUsername);
    });

    return Array.from(usernames).filter(Boolean).sort();
}

function buildUserData(username) {
    const user = localUsers.find(u => u.username === username) || null;
    const uuid = getUserUuid(username);
    const orders = {};
    Object.entries(localOrders || {}).forEach(([orderId, order]) => {
        if (getUsernameFromOrderId(orderId) === username) {
            orders[orderId] = order;
        }
    });
    const pending = {};
    Object.entries(pendingOrders || {}).forEach(([orderId, order]) => {
        if (getUsernameFromOrderId(orderId) === username) {
            pending[orderId] = order;
        }
    });
    const processed = {};
    Object.entries(processedOrders || {}).forEach(([orderId, order]) => {
        if (getUsernameFromOrderId(orderId) === username) {
            processed[orderId] = order;
        }
    });
    const userServers = Object.values(serversData || {}).filter(server =>
        server?.userId === username || (user?.id && server?.mcsmUserUuid === user.id)
    );
    const usedCoupons = Object.values(couponsData || {}).filter(coupon =>
        Array.isArray(coupon?.usedBy) && coupon.usedBy.includes(username)
    ).map(coupon => ({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        lastUsedAt: coupon.lastUsedAt || null,
        status: coupon.status
    }));

    const pendingTransfers = {};
    Object.entries(botData?.pendingTransfers || {}).forEach(([transferId, transfer]) => {
        if (transfer?.fromUsername === username || transfer?.toUsername === username) {
            pendingTransfers[transferId] = transfer;
        }
    });

    const pendingVerify = {};
    Object.entries(botData?.pendingVerify || {}).forEach(([code, verify]) => {
        if (verify?.username === username) {
            pendingVerify[code] = verify;
        }
    });

    return {
        schemaVersion: 1,
        uuid,
        username,
        updatedAt: new Date().toISOString(),
        user,
        orders: {
            paid: orders,
            processed,
            pending
        },
        points: localPoints[username] || null,
        checkin: checkinData[username] || null,
        autoRenewal: autoRenewalData[username] || {},
        qq: {
            binding: botData?.bindings?.[username] || null,
            pendingVerify,
            pendingTransfers
        },
        servers: userServers,
        coupons: {
            used: usedCoupons
        }
    };
}

function saveUserDataFile(username) {
    if (!username) return false;
    try {
        ensureUserDataDirectory();
        const uuid = getUserUuid(username);
        const filePath = path.join(USER_DATA_DIR, `${safeFileName(uuid)}.json`);
        return writeJsonFile(filePath, buildUserData(username));
    } catch (e) {
        logger.warn(`保存用户归档失败 (${username}):`, e.message);
        return false;
    }
}

function getUserDataFilePathByUser(user) {
    if (!user) return null;
    return path.join(USER_DATA_DIR, `${safeFileName(user.id || user.uuid || user.username)}.json`);
}

function deleteUserDataFile(user) {
    try {
        const filePath = getUserDataFilePathByUser(user);
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (e) {
        logger.warn(`删除用户数据文件失败 (${user?.username || 'unknown'}):`, e.message);
    }
}

function saveAllUserDataFiles() {
    const usernames = getKnownUsernames();
    let saved = 0;

    usernames.forEach(username => {
        if (saveUserDataFile(username)) {
            saved++;
        }
    });

    logger.info(`已同步用户归档: ${saved}/${usernames.length} 个`);
    return saved;
}

function queueUserDataSync() {
    if (userDataSyncTimer) {
        clearTimeout(userDataSyncTimer);
    }

    userDataSyncTimer = setTimeout(() => {
        userDataSyncTimer = null;
        saveAllUserDataFiles();
    }, 100);
}

function readUserDataFiles() {
    ensureUserDataDirectory();
    return fs.readdirSync(USER_DATA_DIR)
        .filter(file => file.toLowerCase().endsWith('.json'))
        .map(file => {
            const filePath = path.join(USER_DATA_DIR, file);
            return { file, filePath, data: readJsonFile(filePath, null) };
        })
        .filter(item => item.data && typeof item.data === 'object');
}

function loadFromUserDataFiles() {
    const userFiles = readUserDataFiles();
    if (userFiles.length === 0) {
        return false;
    }

    localUsers = [];
    localPoints = {};
    localOrders = {};
    processedOrders = {};
    pendingOrders = {};
    checkinData = {};
    serversData = {};
    autoRenewalData = {};
    botData = { bindings: {}, pendingVerify: {}, pendingTransfers: {} };

    userFiles.forEach(({ file, data }) => {
        const username = data.username || data.user?.username || path.basename(file, '.json');
        const uuid = data.uuid || data.user?.id || data.user?.uuid || username;
        const user = data.user || data.profile || null;

        if (user) {
            localUsers.push({
                ...user,
                id: user.id || uuid,
                username: user.username || username
            });
        } else {
            localUsers.push({
                id: uuid,
                username,
                password: '',
                email: '',
                createdAt: data.createdAt || data.updatedAt || new Date().toISOString(),
                status: 'active'
            });
        }

        if (data.points) {
            localPoints[username] = data.points;
        }

        if (data.checkin) {
            checkinData[username] = data.checkin;
        }

        if (data.autoRenewal) {
            autoRenewalData[username] = data.autoRenewal;
        }

        if (data.qq?.binding) {
            botData.bindings[username] = data.qq.binding;
        }
        Object.assign(botData.pendingVerify, data.qq?.pendingVerify || {});
        Object.assign(botData.pendingTransfers, data.qq?.pendingTransfers || {});

        (data.servers || []).forEach(server => {
            if (server?.id) {
                serversData[server.id] = server;
            }
        });

        Object.assign(localOrders, data.orders?.paid || {});
        Object.assign(processedOrders, data.orders?.processed || {});
        Object.assign(pendingOrders, data.orders?.pending || {});
    });

    logger.info(`已从 data/User 加载用户数据: ${userFiles.length} 个文件`);
    return true;
}

// Helper function for precise rounding
function round(value, decimals = 2) {
    if (typeof value !== 'number' || isNaN(value)) {
        return 0;
    }
    // Fix for floating point precision issues
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

// 加载所有本地数据
function loadLocalData() {
    // 从 data/User 目录加载用户数据
    const loadedUserFiles = loadFromUserDataFiles();
    if (!loadedUserFiles) {
        logger.warn('data/User 目录为空，没有找到用户数据文件');
        // 初始化空数据结构
        localUsers = [];
        localPoints = {};
        localOrders = {};
        processedOrders = {};
        pendingOrders = {};
        checkinData = {};
        serversData = {};
        autoRenewalData = {};
        botData = { bindings: {}, pendingVerify: {}, pendingTransfers: {} };
        lastSyncTime = null;
    } else {
        logger.info(`当前用户数据: 用户 ${localUsers.length} 个, 积分 ${Object.keys(localPoints).length} 个, 服务器 ${Object.keys(serversData).length} 个`);
    }

    // 加载全局数据文件
    processedPayments = readJsonFile(PROCESSED_PAYMENTS_PATH, {});
    logger.info(`已加载已处理支付记录: ${Object.keys(processedPayments).length} 条`);

    couponsData = readJsonFile(COUPONS_PATH, {});
    logger.info(`已加载兑换码数据: ${Object.keys(couponsData).length} 个`);

    // 清理过期的待支付订单
    const cleanedPending = cleanExpiredPendingOrders();
    if (cleanedPending > 0) {
        logger.info(`已清理 ${cleanedPending} 个过期的待支付订单`);
    }
    logger.info(`当前待支付订单: ${Object.keys(pendingOrders).length} 个`);

    // 初始化保存，确保全局数据文件存在
    if (!fs.existsSync(PROCESSED_PAYMENTS_PATH)) {
        writeJsonFile(PROCESSED_PAYMENTS_PATH, {});
        logger.info('已创建初始文件: processed_payments.json');
    }
    if (!fs.existsSync(COUPONS_PATH)) {
        writeJsonFile(COUPONS_PATH, {});
        logger.info('已创建初始文件: coupons.json');
    }
    if (!fs.existsSync(ANNOUNCEMENT_PATH)) {
        writeJsonFile(ANNOUNCEMENT_PATH, { content: '' });
        logger.info('已创建初始文件: announcement.json');
    }
    
    // 确保数据结构完整
    if (!botData.bindings) botData.bindings = {};
    if (!botData.pendingVerify) botData.pendingVerify = {};
    if (!botData.pendingTransfers) botData.pendingTransfers = {};
    
    logger.info(`已加载QQ机器人数据: ${Object.keys(botData.bindings || {}).length} 个绑定`);
    
    // 确保临时目录存在
    if (canvasAvailable && !fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
}

// ============== MCSManager 用户验证 ==============

/**
 * 检查用户名是否存在于 MCSManager (已更新为使用 API)
 * @param {string} username 用户名
 * @returns {Promise<Object>} 验证结果
 */
async function validateMcsmUser(username) {
    try {
        const searchResult = await mcsmApi.searchUser(username);
        if (searchResult.data.status !== 200) {
            return {
                valid: false,
                exists: false,
                error: 'API_ERROR',
                message: '调用用户验证 API 失败'
            };
        }

        const users = searchResult.data.data?.data || [];
        const user = users.find(u => u.userName === username);

        if (user) {
            return {
                valid: true,
                exists: true,
                user: { userName: user.userName, uuid: user.uuid },
                message: '用户验证通过'
            };
        } else {
            return {
                valid: false,
                exists: false,
                error: 'NOT_FOUND',
                message: '该用户名未在 MCSManager 中注册，请先在面板注册账号'
            };
        }
    } catch (error) {
        logger.error('验证 MCSM 用户时出错:', error);
        return {
            valid: false,
            exists: false,
            error: 'EXCEPTION',
            message: '验证用户时发生异常'
        };
    }
}

/**
 * 通过 API 更新用户在 MCSM 面板上的实例列表
 * @param {string} username 用户名
 * @param {string} instanceUuid 实例UUID
 * @param {'add' | 'remove'} action 操作类型
 * @param {string} [daemonId=null] 守护进程ID (仅在添加时需要)
 * @returns {Promise<Object>} 操作结果
 */
async function updateUserInstanceAssignment(username, instanceUuid, action, daemonId = null) {
    try {
        // 1. 获取完整的用户信息
        const userSearchResult = await mcsmApi.searchUser(username);
        if (userSearchResult.data.status !== 200) {
            return { success: false, error: 'API 搜索用户失败' };
        }
        const users = userSearchResult.data.data?.data || [];
        const user = users.find(u => u.userName === username);

        if (!user) {
            return { success: false, error: 'API 未找到该用户' };
        }

        let currentInstances = user.instances || [];
        const userUuid = user.uuid;

        // 2. 根据操作修改实例列表
        if (action === 'add') {
            if (!daemonId) {
                return { success: false, error: '添加实例时需要 daemonId' };
            }
            const existing = currentInstances.find(inst => inst.instanceUuid === instanceUuid);
            if (existing) {
                return { success: false, error: '该实例已存在于用户账户中' };
            }
            currentInstances.push({ instanceUuid, daemonId });
        } else if (action === 'remove') {
            const originalLength = currentInstances.length;
            currentInstances = currentInstances.filter(inst => inst.instanceUuid !== instanceUuid);
            if (currentInstances.length === originalLength) {
                return { success: false, error: '该实例不在用户账户中' };
            }
        } else {
            return { success: false, error: '无效的操作类型' };
        }

        // 3. 准备更新负载 (API 要求一个 config 对象，其中包含要更新的字段)
        const updatePayload = {
            ...user, // 传递完整的用户对象
            instances: currentInstances // 使用更新后的实例列表
        };
        
        // 4. 调用 API 更新用户
        const updateResult = await mcsmApi.updateUser(userUuid, updatePayload);

        if (updateResult.data.status === 200) {
            logger.info(`✓ 已通过 API 更新用户 ${username} 的实例列表 (Action: ${action})`);
            return {
                success: true,
                user: { uuid: userUuid, userName: username },
                instanceCount: currentInstances.length
            };
        } else {
            logger.error(`通过 API 更新用户 ${username} 失败:`, updateResult.data);
            return { success: false, error: 'API 更新用户失败', details: updateResult.data.data };
        }

    } catch (e) {
        logger.error('更新用户实例分配时发生异常:', e.message);
        return { success: false, error: e.message };
    }
}

/**
 * 根据实例 UUID 通过 API 查找所有者
 * @param {string} instanceUuid 实例UUID
 * @returns {Promise<string|null>} 用户名或 null
 */
async function findOwnerByInstanceUuid(instanceUuid) {
    try {
        // 调用 searchUser 时不传递用户名，以获取所有用户
        const userSearchResult = await mcsmApi.searchUser('');
        if (userSearchResult.data.status !== 200) {
            logger.error(`[OWNER_LOOKUP_API] API search failed.`);
            return null;
        }

        const users = userSearchResult.data.data?.data || [];
        
        for (const user of users) {
            if (user.instances && user.instances.some(inst => inst.instanceUuid === instanceUuid)) {
                logger.debug(`[OWNER_LOOKUP_API] Found owner for ${instanceUuid}: ${user.userName}`);
                return user.userName;
            }
        }

        logger.debug(`[OWNER_LOOKUP_API] Could not find owner for ${instanceUuid}.`);
        return null;
    } catch (error) {
        logger.error(`[OWNER_LOOKUP_API] Error during owner lookup:`, error.message);
        return null;
    }
}

/**
 * 根据用户名获取 MCSManager 用户的完整信息 (已更新为使用 API)
 * @param {string} username 用户名
 * @returns {Promise<Object>} 用户信息
 */
async function getMcsmUserByUsername(username) {
    try {
        const searchResult = await mcsmApi.searchUser(username);
        if (searchResult.data.status !== 200) {
            return { success: false, error: '通过 API 搜索用户失败' };
        }

        const users = searchResult.data.data?.data || [];
        const user = users.find(u => u.userName === username);

        if (user) {
            return {
                success: true,
                user: {
                    uuid: user.uuid,
                    userName: user.userName,
                    passwordHash: user.passWord, // API 返回此字段
                    registerTime: user.registerTime,
                    instances: user.instances || []
                }
            };
        } else {
            return { success: false, error: '用户不存在' };
        }
    } catch (error) {
        logger.error('通过 API 获取 MCSM 用户时出错:', error);
        return { success: false, error: '获取用户时发生异常' };
    }
}

/**
 * 根据用户名获取用户的所有实例详情 (已更新为完全使用 API)
 * @param {string} username 用户名
 * @returns {Object} 实例列表
 */
async function getUserInstancesByUsername(username) {
    try {
        // 1. 使用 API 搜索用户以获取其基础信息和实例 UUID 列表
        const userSearchResult = await mcsmApi.searchUser(username);
        if (userSearchResult.data.status !== 200) {
            return { success: false, error: '通过 API 搜索用户失败', apiError: userSearchResult.data.data };
        }
        const users = userSearchResult.data.data?.data || [];
        const user = users.find(u => u.userName === username);

        if (!user) {
            return { success: false, error: 'API 未找到该用户' };
        }

        const instances = user.instances || [];

        if (instances.length === 0) {
            return { success: true, instances: [], total: 0, stats: { total: 0, expired: 0, expiring: 0 }, message: '该用户没有任何实例' };
        }

        // 2. 使用 Promise.all 并行获取所有实例的详细信息，以提高效率
        const now = Date.now();
        const instancePromises = instances.map(async (inst) => {
            try {
                const detail = await mcsmApi.getInstance(inst.daemonId, inst.instanceUuid);
                if (detail.data.status === 200 && detail.data.data) {
                    const instConfig = detail.data.data.config || {};
                    const endTime = instConfig.endTime;
                    const isExpired = endTime ? endTime < now : false;
                    const diffDays = endTime ? (endTime - now) / (1000 * 60 * 60 * 24) : Infinity;
                    const isExpiringSoon = !isExpired && diffDays <= 7;

                    return {
                        daemonId: inst.daemonId,
                        uuid: inst.instanceUuid,
                        nickname: instConfig.nickname || '未命名',
                        status: detail.data.data.status,
                        endTime: endTime,
                        endTimeFormatted: endTime
                            ? new Date(endTime).toLocaleString('zh-CN')
                            : '永久',
                        isExpired: isExpired,
                        isExpiringSoon: isExpiringSoon
                    };
                } else {
                    // API 获取失败
                    return {
                        daemonId: inst.daemonId,
                        uuid: inst.instanceUuid,
                        nickname: '获取失败',
                        status: -1,
                        endTime: null,
                        endTimeFormatted: '未知',
                        error: '无法获取实例详情',
                        isExpired: false,
                        isExpiringSoon: false
                    };
                }
            } catch (e) {
                logger.error(`获取实例 ${inst.instanceUuid} 详情失败:`, e.message);
                return {
                    daemonId: inst.daemonId,
                    uuid: inst.instanceUuid,
                    nickname: '获取失败',
                    status: -1,
                    endTime: null,
                    endTimeFormatted: '未知',
                    error: e.message,
                    isExpired: false,
                    isExpiringSoon: false
                };
            }
        });

        const resolvedInstances = await Promise.all(instancePromises);

        // 3. 计算统计数据
        const total = resolvedInstances.length;
        const expired = resolvedInstances.filter(i => i.isExpired).length;
        const expiring = resolvedInstances.filter(i => i.isExpiringSoon).length;

        return {
            success: true,
            user: {
                uuid: user.uuid,
                userName: user.userName
            },
            instances: resolvedInstances,
            total: total,
            stats: {
                total: total,
                expired: expired,
                expiring: expiring
            }
        };
    } catch (error) {
        logger.error('获取用户实例列表时发生顶层错误:', error);
        return { success: false, error: error.message };
    }
}

// 保存签到数据
function saveCheckin() {
    queueUserDataSync();
    return true;
}

// 保存兑换码数据
function saveCoupons() {
    const saved = writeJsonFile(COUPONS_PATH, couponsData);
    if (saved) queueUserDataSync();
    return saved;
}

// 保存服务器数据
function saveServers() {
    queueUserDataSync();
    return true;
}

// ============== 价格计算辅助函数 ==============

/**
 * 根据自定义配置计算积分价格
 * @param {object} customConfig - { memory (GB), cpu (cores), disk (GB), ports, duration (days) }
 * @returns {number} - 计算出的积分
 */
function calculateCustomPlanPrice(customConfig) {
    logger.debug('[calculateCustomPlanPrice] 收到的 customConfig:', JSON.stringify(customConfig, null, 2));
    
    // 优先使用 config.customPlan，如果不存在则使用 config.auth（向后兼容）
    const customPlanConfig = config.customPlan || config.auth || {};
    const limits = customPlanConfig.limits || {};
    const formula = customPlanConfig.pointsFormula || {};
    const renewalConfig = config.renewal || {};
    
    logger.debug('[calculateCustomPlanPrice] 使用的 formula:', JSON.stringify(formula, null, 2));
    logger.debug('[calculateCustomPlanPrice] 使用的 limits:', JSON.stringify(limits, null, 2));

    // memory 统一按 GB 处理，转换为 MB 用于计算
    let memoryGB = parseFloat(customConfig.memory) || 1;
    let memoryMB = memoryGB * 1024;
    
    let cpuCores = parseFloat(customConfig.cpu) || 1; // 核心数
    let diskGB = parseFloat(customConfig.disk);
    
    // 获取天数参数，默认为 30 天
    let duration = parseInt(customConfig.duration);
    if (isNaN(duration) || duration < 0) {
        duration = customPlanConfig.defaultDuration || 30;
    }
    
    // 如果 disk 为 null、undefined 或 NaN，使用默认值
    if (isNaN(diskGB) || diskGB === null || diskGB === undefined) {
        diskGB = 1;
    }
    
    // 验证储存必须是整数（使用更宽松的检查，允许浮点数表示的整数）
    // 使用 Math.round 来处理浮点数精度问题
    if (Math.abs(diskGB - Math.round(diskGB)) > 0.0001) {
        throw new Error('储存容量必须是整数（GB）');
    }
    
    // 确保使用整数值
    diskGB = Math.round(diskGB);
    let diskMB = diskGB * 1024; // Convert GB to MB
    
    let portsInput = customConfig.ports;
    let portsCount = 0;

    if (typeof portsInput === 'string') {
        const portStrings = portsInput.split(',').map(p => p.trim()).filter(Boolean);
        portsCount = portStrings.length;
    } else if (typeof portsInput === 'number') {
        portsCount = portsInput;
    }

    // 应用配置中的限制 (移除 memoryMB 和 cpuCores 的最大值限制)
    memoryMB = Math.max((limits.minMemory || 512), memoryMB); // 只保留最小值限制
    cpuCores = Math.max(limits.minCpuCores || 0.5, cpuCores); // 只保留最小值限制
    // diskMB: 只保留最大值限制，不使用配置文件的 minDisk
    diskMB = Math.min((limits.maxDisk || 100) * 1024, diskMB);
    portsCount = Math.max(limits.minPorts || 1, Math.min(limits.maxPorts || 10, portsCount));

    // 从配置读取公式参数
    const memoryPerMB = formula.memoryPerMB || 0.01;
    // 支持两种 CPU 计价方式：按核心或按百分比
    const cpuPerCore = formula.cpuPerCore || (formula.cpuPerPercent ? formula.cpuPerPercent * 100 : 10);
    const diskPerMB = (formula.diskPerGB || 0.5) / 1024; // Convert per-GB to per-MB
    const perPort = formula.perPort || 5;
    const pricePerDay = renewalConfig.pricePerDay || 0.4; // 每天续费价格

    // 计算基础配置价格（不含天数）
    const basePoints = memoryMB * memoryPerMB +
                       cpuCores * cpuPerCore +
                       diskMB * diskPerMB +
                       portsCount * perPort;
    
    // 计算天数费用
    const durationPoints = duration > 0 ? duration * pricePerDay : 0;
    
    // 总价格 = 基础配置价格 + 天数费用
    const points = basePoints + durationPoints;

    logger.debug('[calculateCustomPlanPrice] 计算详情:');
    logger.debug(`  - memoryMB (${memoryMB}) * memoryPerMB (${memoryPerMB}) = ${memoryMB * memoryPerMB}`);
    logger.debug(`  - cpuCores (${cpuCores}) * cpuPerCore (${cpuPerCore}) = ${cpuCores * cpuPerCore}`);
    logger.debug(`  - diskMB (${diskMB}) * diskPerMB (${diskPerMB}) = ${diskMB * diskPerMB}`);
    logger.debug(`  - portsCount (${portsCount}) * perPort (${perPort}) = ${portsCount * perPort}`);
    logger.debug(`  - 基础配置小计: ${basePoints}`);
    logger.debug(`  - duration (${duration}天) * pricePerDay (${pricePerDay}) = ${durationPoints}`);
    logger.debug(`  - 总计: ${points}`);

    // 返回四舍五入到两位小数的结果
    const result = parseFloat(points.toFixed(2));
    logger.debug('[calculateCustomPlanPrice] 最终返回:', result);
    return result;
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
                const nodeMappings = config.nodeMappings || {};
                return {
                    success: true,
                    daemons: (result.data.data || []).map(d => {
                        const ip = d.ip;
                        const mappedName = nodeMappings[ip];
                        return {
                            uuid: d.uuid,
                            remarks: mappedName || d.remarks || '未命名节点',
                            ip: d.ip,
                            port: d.port,
                            available: d.available !== false
                        };
                    })
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
        logger.debug('========== 创建服务器 DEBUG 开始 ==========');
        logger.debug('[DEBUG] 收到的参数:');
        logger.debug('  - username:', username);
        logger.debug('  - planId:', planId);
        logger.debug('  - customConfig:', JSON.stringify(customConfig, null, 2));
        
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
            const customPlanConfig = config.customPlan || config.auth || {};
            if (customPlanConfig.enabled === false) {
                return { success: false, error: '自定义套餐功能已禁用' };
            }
            
            // 获取配置中的限制和公式参数
            const limits = customPlanConfig.limits || {};
            const formula = customPlanConfig.pointsFormula || {};
            
                // 解析自定义配置 - 用户输入的是 GB，转换为 MB 用于内部计算
                let memoryGB = parseFloat(customConfig.memory) || 1;
                let memoryMB = memoryGB * 1024;
                // 用户输入的是核心数 (e.g., 1, 2)，转换为 API 需要的百分比
                const cpuCores = parseInt(customConfig.cpu) || 1;
                
                // 验证CPU核心数范围（1-100）
                if (isNaN(cpuCores) || cpuCores <= 0 || cpuCores > 100) {
                    return { success: false, error: 'CPU核心数无效，必须是 1-100 之间的数字' };
                }
                
                cpuPercent = cpuCores * 100; // 赋值，而不是声明
                let diskGB = parseFloat(customConfig.disk) || 10;
                
                // 验证磁盘空间范围（1-100 GB）
                if (isNaN(diskGB) || diskGB <= 0 || diskGB > 100 || !Number.isInteger(diskGB)) {
                    return { success: false, error: '磁盘空间无效，必须是 1-100 GB 之间的整数' };
                }
                
                let diskMB = diskGB * 1024;
            
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
            
            // 应用限制（仅保留最小值限制，移除最大值限制）
            memoryMB = Math.max(limits.minMemory || 512, memoryMB);
            cpuPercent = Math.max(limits.minCpu || 50, cpuPercent);
            diskGB = Math.max(limits.minDisk || 5, diskGB);
            portsCount = Math.max(limits.minPorts || 1, portsCount);
            
            // 调用新的辅助函数在后端计算价格
            const customPoints = calculateCustomPlanPrice({
                memory: memoryGB,  // 传递 GB
                cpu: cpuCores,     // 传递核心数
                disk: diskGB,      // 传递 GB
                ports: portsInput, // 传递端口字符串
                duration: customConfig.duration // 传递天数
            });
            
            // 获取用户指定的天数，如果没有则使用默认值
            const userDuration = parseInt(customConfig.duration);
            const finalDuration = !isNaN(userDuration) && userDuration >= 0 ? userDuration : (customPlanConfig.defaultDuration || 30);
            
            plan = {
                name: '自定义配置',
                points: customPoints,
                description: `${memoryMB}MB内存, ${cpuPercent}%CPU, ${diskGB}GB存储, ${portsCount}个端口`,
                specs: {
                    cpu: Math.ceil(cpuPercent / 100),
                    memory: memoryMB,
                    storage: `${diskGB}G`,
                    duration: finalDuration,
                    portsCount: portsCount,
                    ports: portsList  // 用户指定的端口映射列表
                }
            };
            isCustomPlan = true;
            
            logger.debug('[DEBUG] 自定义套餐解析结果:');
            logger.debug('  - portsInput:', portsInput, '(类型:', typeof portsInput, ')');
            logger.debug('  - portsList:', JSON.stringify(portsList));
            logger.debug('  - plan.specs.ports:', JSON.stringify(plan.specs.ports));
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
        const mcsmUser = await getMcsmUserByUsername(username);
        if (!mcsmUser.success) {
            return { success: false, error: mcsmUser.error || 'MCSManager用户不存在，请先在面板注册' };
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
        // 如果 duration 为 0，则不设置到期时间（永久）
        const endTime = plan.specs.duration > 0 ? now + (plan.specs.duration * 24 * 60 * 60 * 1000) : -1;

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
        
        logger.debug('[DEBUG] 最终端口配置:');
        logger.debug('  - plan.specs.ports:', JSON.stringify(plan.specs.ports));
        logger.debug('  - plan.specs.ports 长度:', plan.specs.ports ? plan.specs.ports.length : 0);
        logger.debug('  - dockerConfig.ports:', JSON.stringify(dockerConfig.ports));
        logger.debug('  - 最终使用的 finalPorts:', JSON.stringify(finalPorts));
        
        const instanceConfig = {
            nickname: serverName || `${username}的${plan.name}服务器`,
            startCommand: dockerConfig.startCommand || '',
            stopCommand: "stop",
            cwd: "",
            ie: 'utf-8',
            oe: 'utf-8',
            type: 'minecraft/java',
            tag: [`plan:${planId}`, `user:${username}`, 'docker:true'],
            endTime: endTime > 0 ? endTime : -1, // -1 表示永久
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
                memory: typeof plan.specs.memory === 'number' ? (plan.specs.memory / 1024) : 1,
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
        
        logger.debug('[DEBUG] 完整的 instanceConfig.docker:', JSON.stringify(instanceConfig.docker, null, 2));
        logger.debug('========== 创建服务器 DEBUG 结束 ==========');

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
                    logger.debug(`[DEBUG] 准备修改实例配置文件: ${instanceConfigPath}`);

                    // 稍微延迟以确保文件已创建
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    if (fs.existsSync(instanceConfigPath)) {
                        const instanceConfigData = readJsonFile(instanceConfigPath, null);
                        if (instanceConfigData && instanceConfigData.docker) {
                            logger.debug(`[DEBUG] 读取到实例原 workingDir: "${instanceConfigData.docker.workingDir}"`);
                            instanceConfigData.docker.workingDir = '/data';
                            if (writeJsonFile(instanceConfigPath, instanceConfigData)) {
                                logger.info(`✓ 成功将实例 ${instanceUuid} 的 workingDir 修改为 /data`);
                            } else {
                                logger.error(`❌ 写入实例 ${instanceUuid} 的配置文件失败`);
                            }
                        } else {
                            logger.error(`❌ 读取或解析实例 ${instanceUuid} 的配置文件失败，或缺少 docker 属性`);
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

            // 将实例分配给用户（通过 API）
            const assignResult = await updateUserInstanceAssignment(username, instanceUuid, 'add', targetDaemonId);

            if (!assignResult.success) {
                console.error('分配实例给用户失败:', assignResult.error);
                // 即使分配失败，实例已创建，继续处理
            } else {
                logger.info(`✓ 已将实例 ${instanceUuid} 自动添加到用户 ${username} 的MCSManager账户`);
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
                endTime: endTime > 0 ? endTime : -1,
                endTimeFormatted: endTime > 0 ? new Date(endTime).toLocaleString('zh-CN') : '永久',
                assignedToUser: assignResult.success
            };

            serversData[instanceUuid] = serverRecord;
            saveServers();

            logger.info(`✓ 实例创建成功: ${instanceUuid} (${plan.name}) - 用户: ${username}, 消耗积分: ${plan.points}`);

            // 执行购买后命令（如重启MCSManager服务）
            const afterPurchaseCommand = config.mcsm?.afterPurchaseCommand;
            if (afterPurchaseCommand) {
                const { exec } = require('child_process');
                exec(afterPurchaseCommand, (error, stdout, stderr) => {
                    if (error) {
                        logger.error(`执行购买后命令失败: ${error.message}`);
                    } else {
                        logger.info(`✓ 购买后命令执行成功: ${afterPurchaseCommand}`);
                        if (stdout) logger.debug(`   输出: ${stdout}`);
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
                    endTime: endTime > 0 ? endTime : -1,
                    endTimeFormatted: endTime > 0 ? new Date(endTime).toLocaleString('zh-CN') : '永久',
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

        logger.info(`🎫 创建兑换码: ${code} (${type}: ${value}, 最大使用次数: ${maxUses})`);

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
            localPoints[username].totalPoints = round(localPoints[username].totalPoints + coupon.value);
            
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

        logger.info(`🎁 兑换成功: ${username} 使用 ${code} 获得 ${rewardDescription}`);

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

        logger.info(`🗑️ 删除兑换码: ${code}`);
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
        const previousPoints = localPoints[username].totalPoints;
        localPoints[username].totalPoints = round(localPoints[username].totalPoints + rewardPoints);
        
        // ⚠️ 重要：签到积分不应该加到 earnedPoints（那是订单积分）
        // 签到积分属于"其他来源积分"，会在 calculateAndSavePoints 中自动计算
        
        // 记录到扣减历史（使用负数表示增加积分）
        if (!localPoints[username].deductHistory) {
            localPoints[username].deductHistory = [];
        }
        localPoints[username].deductHistory.push({
            points: -rewardPoints,  // 负数表示增加
            reason: `每日签到奖励 (连续${continuousDays}天)`,
            time: new Date().toISOString(),
            previousPoints: previousPoints,
            afterPoints: localPoints[username].totalPoints
        });
        savePoints();

        logger.info(`📅 签到成功: ${username} +${rewardPoints}积分 (连续${continuousDays}天)`);

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

// ============== 自动续费管理 ==============

// 保存自动续费数据
function saveAutoRenewal() {
    queueUserDataSync();
    return true;
}

const autoRenewalManager = {
    // 获取用户的自动续费配置
    getConfig(username, instanceUuid) {
        if (!autoRenewalData[username]) {
            return null;
        }
        return autoRenewalData[username][instanceUuid] || null;
    },

    // 获取用户的所有自动续费配置
    getUserConfigs(username) {
        return autoRenewalData[username] || {};
    },

    // 设置自动续费配置
    setConfig(username, instanceUuid, configData) {
        if (!autoRenewalData[username]) {
            autoRenewalData[username] = {};
        }

        const autoRenewalConfig = config.autoRenewal || {};
        
        autoRenewalData[username][instanceUuid] = {
            enabled: configData.enabled !== undefined ? configData.enabled : false,
            renewalDays: parseInt(configData.renewalDays) || autoRenewalConfig.defaultRenewalDays || 30,
            advanceDays: parseInt(configData.advanceDays) || autoRenewalConfig.defaultAdvanceDays || 3,
            minPointsReserve: parseInt(configData.minPointsReserve) || autoRenewalConfig.minPointsReserve || 50,
            lastRenewalTime: configData.lastRenewalTime || null,
            lastCheckTime: configData.lastCheckTime || null,
            failedAttempts: configData.failedAttempts || 0,
            lastFailReason: configData.lastFailReason || null,
            createdAt: configData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        saveAutoRenewal();
        logger.info(`✓ 设置自动续费: ${username}/${instanceUuid}, 启用: ${autoRenewalData[username][instanceUuid].enabled}`);

        return {
            success: true,
            config: autoRenewalData[username][instanceUuid]
        };
    },

    // 删除自动续费配置
    deleteConfig(username, instanceUuid) {
        if (autoRenewalData[username] && autoRenewalData[username][instanceUuid]) {
            delete autoRenewalData[username][instanceUuid];
            
            // 如果用户没有任何配置了，删除用户节点
            if (Object.keys(autoRenewalData[username]).length === 0) {
                delete autoRenewalData[username];
            }
            
            saveAutoRenewal();
            logger.info(`✓ 删除自动续费配置: ${username}/${instanceUuid}`);
            return { success: true };
        }
        return { success: false, error: '配置不存在' };
    },

    // 获取所有启用自动续费的配置
    getAllEnabledConfigs() {
        const enabled = [];
        for (const [username, instances] of Object.entries(autoRenewalData)) {
            for (const [instanceUuid, cfg] of Object.entries(instances)) {
                if (cfg.enabled) {
                    enabled.push({
                        username,
                        instanceUuid,
                        config: cfg
                    });
                }
            }
        }
        return enabled;
    },

    // 执行单个实例的自动续费
    async executeRenewal(username, instanceUuid, renewalConfig) {
        try {
            logger.info(`开始自动续费: ${username}/${instanceUuid}`);

            // 获取实例信息
            const result = await getUserInstancesByUsername(username);
            if (!result.success || !result.instances) {
                throw new Error('无法获取用户实例列表');
            }

            const instance = result.instances.find(inst => inst.uuid === instanceUuid);
            if (!instance) {
                throw new Error('实例不存在');
            }

            // 检查实例是否有到期时间
            if (!instance.endTime) {
                logger.info(`⏭️ 跳过永久实例: ${username}/${instanceUuid}`);
                return { success: false, error: '永久实例无需续费', skip: true };
            }

            // 计算是否需要续费
            const now = Date.now();
            const advanceMs = renewalConfig.advanceDays * 24 * 60 * 60 * 1000;
            const triggerTime = instance.endTime - advanceMs;

            if (now < triggerTime) {
                logger.debug(`未到续费时间: ${username}/${instanceUuid}, 还需 ${Math.ceil((triggerTime - now) / (1000 * 60 * 60 * 24))} 天`);
                return { success: false, error: '未到续费时间', skip: true };
            }

            // 计算续费费用
            const pricePerDay = config.renewal?.pricePerDay || 0.4;
            const totalCost = renewalConfig.renewalDays * pricePerDay;

            // 确保用户积分数据存在
            pointsManager.ensureUser(username);

            // 检查积分是否足够（包含最低保留积分）
            const userPoints = pointsManager.getBalance(username);
            const requiredPoints = totalCost + renewalConfig.minPointsReserve;

            if (userPoints < requiredPoints) {
                const error = `积分不足 (需要: ${requiredPoints}, 当前: ${userPoints})`;
                logger.warn(`自动续费失败: ${username}/${instanceUuid} - ${error}`);
                
                // 更新失败记录
                renewalConfig.failedAttempts = (renewalConfig.failedAttempts || 0) + 1;
                renewalConfig.lastFailReason = error;
                renewalConfig.lastCheckTime = new Date().toISOString();
                this.setConfig(username, instanceUuid, renewalConfig);

                // 发送通知（如果启用）
                if (config.autoRenewal?.notifyOnFailure) {
                    await this.sendNotification(username, instanceUuid, instance.nickname, false, error);
                }

                return { success: false, error: error };
            }

            // 执行续费
            const currentEndTime = instance.endTime;
            const newEndTime = currentEndTime + (renewalConfig.renewalDays * 24 * 60 * 60 * 1000);

            // 更新实例配置
            const updateResult = await mcsmApi.updateInstance(instance.daemonId, instanceUuid, {
                endTime: newEndTime
            });

            if (updateResult.data.status !== 200) {
                throw new Error('更新实例失败');
            }

            // 扣减积分
            const deductResult = pointsManager.deductPoints(
                username,
                totalCost,
                `自动续费实例 ${instance.nickname} ${renewalConfig.renewalDays}天`
            );

            if (!deductResult.success) {
                throw new Error('扣减积分失败: ' + deductResult.error);
            }

            // 更新续费记录
            renewalConfig.lastRenewalTime = new Date().toISOString();
            renewalConfig.lastCheckTime = new Date().toISOString();
            renewalConfig.failedAttempts = 0;
            renewalConfig.lastFailReason = null;
            this.setConfig(username, instanceUuid, renewalConfig);

            logger.info(`自动续费成功: ${username}/${instanceUuid}, 续费${renewalConfig.renewalDays}天, 消耗${totalCost}积分`);

            // 发送通知（如果启用）
            if (config.autoRenewal?.notifyOnSuccess) {
                await this.sendNotification(username, instanceUuid, instance.nickname, true, null, {
                    days: renewalConfig.renewalDays,
                    cost: totalCost,
                    newEndTime: new Date(newEndTime).toLocaleString('zh-CN'),
                    remainingPoints: deductResult.balance
                });
            }

            return {
                success: true,
                data: {
                    instanceUuid,
                    instanceName: instance.nickname,
                    renewalDays: renewalConfig.renewalDays,
                    cost: totalCost,
                    newEndTime: newEndTime,
                    remainingPoints: deductResult.balance
                }
            };

        } catch (error) {
            logger.error(`自动续费异常: ${username}/${instanceUuid} -`, error.message);
            
            // 更新失败记录
            renewalConfig.failedAttempts = (renewalConfig.failedAttempts || 0) + 1;
            renewalConfig.lastFailReason = error.message;
            renewalConfig.lastCheckTime = new Date().toISOString();
            this.setConfig(username, instanceUuid, renewalConfig);

            // 发送通知（如果启用）
            if (config.autoRenewal?.notifyOnFailure) {
                await this.sendNotification(username, instanceUuid, instanceUuid, false, error.message);
            }

            return { success: false, error: error.message };
        }
    },

    // 发送通知（QQ机器人）
    async sendNotification(username, instanceUuid, instanceName, success, error, data = {}) {
        try {
            // 检查用户是否绑定了QQ
            if (!botData.bindings || !botData.bindings[username]) {
                return;
            }

            const qqNumber = botData.bindings[username].qqNumber;
            const targetGroup = config.onebot?.target_group;

            if (!qqNumber || !targetGroup) {
                return;
            }

            let message = '';
            if (success) {
                message = `自动续费成功\n` +
                         `━━━━━━━━━━━━━━\n` +
                         `实例: ${instanceName}\n` +
                         `续费天数: ${data.days}天\n` +
                         `消耗积分: ${data.cost}\n` +
                         `新到期时间: ${data.newEndTime}\n` +
                         `剩余积分: ${data.remainingPoints}`;
            } else {
                message = `自动续费失败\n` +
                         `━━━━━━━━━━━━━━\n` +
                         `实例: ${instanceName}\n` +
                         `失败原因: ${error}\n` +
                         `\n` +
                         `请及时充值或手动续费`;
            }

            // 这里需要调用QQ机器人的发送消息功能
            // 由于sendGroupMessage需要在QQ机器人连接后才能使用
            // 这里只是记录日志，实际发送需要在QQ机器人模块中实现
            logger.info(`自动续费通知: ${username} (QQ: ${qqNumber})`);

        } catch (error) {
            logger.error('发送自动续费通知失败:', error.message);
        }
    },

    // 获取自动续费历史记录
    getHistory(username, instanceUuid, limit = 50) {
        // 从积分扣减历史中筛选自动续费记录
        const user = pointsManager.getUser(username);
        if (!user || !user.deductHistory) {
            return [];
        }

        return user.deductHistory
            .filter(record => record.reason && record.reason.includes('自动续费') && record.reason.includes(instanceUuid))
            .slice(-limit)
            .reverse();
    }
};

// 启动自动续费监控
function startAutoRenewalMonitor() {
    const autoRenewalConfig = config.autoRenewal || {};
    
    if (autoRenewalConfig.enabled === false) {
        logger.info('自动续费功能已禁用');
        return;
    }

    const checkInterval = (autoRenewalConfig.checkInterval || 15) * 60 * 1000; // 默认15分钟
    
    logger.info(`启动自动续费监控，检查间隔: ${autoRenewalConfig.checkInterval || 15}分钟`);

    // 立即执行一次检查
    checkAndRenewInstances();

    // 设置定时检查
    autoRenewalCheckTimer = setInterval(async () => {
        await checkAndRenewInstances();
    }, checkInterval);
}

// 停止自动续费监控
function stopAutoRenewalMonitor() {
    if (autoRenewalCheckTimer) {
        clearInterval(autoRenewalCheckTimer);
        autoRenewalCheckTimer = null;
        logger.info('已停止自动续费监控');
    }
}

// 检查并执行自动续费
async function checkAndRenewInstances() {
    try {
        logger.debug('开始检查自动续费...');

        const enabledConfigs = autoRenewalManager.getAllEnabledConfigs();
        
        if (enabledConfigs.length === 0) {
            logger.debug('没有启用自动续费的实例');
            return;
        }

        logger.info(`检查 ${enabledConfigs.length} 个启用自动续费的实例`);

        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;

        for (const { username, instanceUuid, config: renewalConfig } of enabledConfigs) {
            const result = await autoRenewalManager.executeRenewal(username, instanceUuid, renewalConfig);
            
            if (result.success) {
                successCount++;
            } else if (result.skip) {
                skipCount++;
            } else {
                failCount++;
            }

            // 避免并发过多，每个续费操作间隔1秒
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        logger.info(`✓ 自动续费检查完成: 成功 ${successCount}, 失败 ${failCount}, 跳过 ${skipCount}`);

    } catch (error) {
        logger.error('自动续费检查异常:', error.message);
    }
}

// ============== QQ机器人管理 ==============

// 读取bot数据（已废弃，数据现在存储在用户归档中）
function readBotData() {
    // 数据已经从用户归档中加载，直接返回空结构
    return { bindings: {}, pendingVerify: {}, pendingTransfers: {} };
}

// 写入bot数据
function writeBotData(data) {
    try {
        queueUserDataSync();
        return true;
    } catch (e) {
        logger.error('写入QQ用户数据失败:', e.message);
        return false;
    }
}

function getActiveQQVerifyCode(username) {
    if (!username || !botData.pendingVerify) {
        return null;
    }

    const now = Date.now();
    for (const [code, verify] of Object.entries(botData.pendingVerify)) {
        if (verify?.username === username && verify.expireTime > now && !verify.verified) {
            return { code, verify };
        }
    }

    return null;
}

function clearUserQQVerifyCodes(username) {
    if (!username || !botData.pendingVerify) {
        return 0;
    }

    let cleared = 0;
    for (const [code, verify] of Object.entries(botData.pendingVerify)) {
        if (verify?.username === username) {
            delete botData.pendingVerify[code];
            cleared++;
        }
    }
    return cleared;
}

// 清理过期验证码和转账请求
function cleanExpiredVerify() {
    const now = Date.now();
    let cleanedVerify = 0;
    let cleanedTransfers = 0;

    // 确保数据结构存在
    if (!botData.pendingVerify) {
        botData.pendingVerify = {};
    }
    if (!botData.pendingTransfers) {
        botData.pendingTransfers = {};
    }

    // 清理过期验证码
    for (const code in botData.pendingVerify) {
        if (botData.pendingVerify[code].expireTime < now) {
            delete botData.pendingVerify[code];
            cleanedVerify++;
        }
    }

    // 清理过期转账请求
    for (const transferId in botData.pendingTransfers) {
        if (botData.pendingTransfers[transferId].expiresAt < now) {
            delete botData.pendingTransfers[transferId];
            cleanedTransfers++;
        }
    }

    if (cleanedVerify > 0 || cleanedTransfers > 0) {
        writeBotData(botData);
        if (cleanedVerify > 0) {
            logger.info(`清理了 ${cleanedVerify} 个过期验证码`);
        }
        if (cleanedTransfers > 0) {
            logger.info(`清理了 ${cleanedTransfers} 个过期转账请求`);
        }
    }
}

// 生成实例列表图片
async function generateInstanceImage(instances, username) {
    if (!canvasAvailable) {
        return null;
    }

    try {
        const width = 800;
        const headerHeight = 100;
        const itemHeight = 120;
        const padding = 20;
        const height = headerHeight + (instances.length * itemHeight) + padding * 2;

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // 背景
        ctx.fillStyle = '#f5f7fa';
        ctx.fillRect(0, 0, width, height);

        // 标题背景
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, headerHeight);

        // 标题文字
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${username} 的实例列表`, width / 2, 50);

        ctx.font = '18px sans-serif';
        ctx.fillText(`共 ${instances.length} 个实例`, width / 2, 80);

        // 绘制实例卡片
        const now = Date.now();
        instances.forEach((instance, index) => {
            const y = headerHeight + padding + (index * itemHeight);
            
            // 卡片背景
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            roundRect(ctx, padding, y, width - padding * 2, itemHeight - 10, 10);
            ctx.fill();
            ctx.shadowBlur = 0;

            // 序号
            ctx.fillStyle = '#667eea';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${index + 1}`, padding + 20, y + 50);

            // 实例名称
            ctx.fillStyle = '#2d3748';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText(instance.nickname || '未命名', padding + 80, y + 35);

            // 状态
            const statusText = instance.status === 3 ? '运行中' : 
                             instance.status === 0 ? '已停止' : '未知';
            const statusColor = instance.status === 3 ? '#10b981' : '#6b7280';
            ctx.fillStyle = statusColor;
            ctx.font = '18px sans-serif';
            ctx.fillText(`● ${statusText}`, padding + 80, y + 65);

            // 到期时间
            const endTime = instance.endTime;
            let timeText = '永久';
            let timeColor = '#10b981';
            
            if (endTime) {
                const diffDays = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                    timeText = '已过期';
                    timeColor = '#ef4444';
                } else if (diffDays === 0) {
                    timeText = '今天到期';
                    timeColor = '#f59e0b';
                } else if (diffDays <= 3) {
                    timeText = `${diffDays}天后到期`;
                    timeColor = '#f59e0b';
                } else {
                    timeText = `${diffDays}天后到期`;
                    timeColor = '#10b981';
                }
            }

            ctx.fillStyle = timeColor;
            ctx.font = '20px sans-serif';
            ctx.fillText(`⏰ ${timeText}`, padding + 80, y + 95);
        });

        // 保存图片
        const filename = `instances_${username}_${Date.now()}.png`;
        const filepath = path.join(TEMP_DIR, filename);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(filepath, buffer);

        return filepath;
    } catch (error) {
        logger.error('❌ 生成图片失败:', error.message);
        return null;
    }
}

// 绘制圆角矩形
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// QQ机器人WebSocket连接管理
let ws = null;
let reconnectTimer = null;
let heartbeatTimer = null;

// 发送群消息函数（全局作用域）
function sendGroupMessage(groupId, message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const payload = {
            action: 'send_group_msg',
            params: {
                group_id: parseInt(groupId),
                message: message
            }
        };
        ws.send(JSON.stringify(payload));
    } else {
        logger.error(`❌ WebSocket未连接，无法发送消息`);
    }
}

function startQQBot() {
    const onebotConfig = config.onebot;

    // 检查是否启用QQ机器人
    if (!onebotConfig || onebotConfig.enabled === false) {
        logger.info('QQ机器人已禁用（config.yml中onebot.enabled=false）');
        logger.info('如需启用，请修改配置文件后重启服务');
        return;
    }

    if (!onebotConfig.ws_url) {
        logger.warn('未配置QQ机器人WebSocket地址，跳过启动');
        logger.warn('请在config.yml中配置onebot.ws_url');
        return;
    }

    const wsUrl = onebotConfig.ws_url;
    const accessToken = onebotConfig.access_token || '';
    const targetGroup = onebotConfig.target_group;

    logger.info('====================================');
    logger.info('OneBot QQ机器人启动中...');
    logger.info('配置信息:');
    logger.info(`   连接地址: ${wsUrl}`);
    logger.info(`   访问令牌: ${accessToken ? '已配置 (' + accessToken.substring(0, 4) + '****)' : '未配置'}`);
    logger.info(`   监听群聊: ${targetGroup}`);
    logger.info(`   验证超时: ${onebotConfig.verify_timeout || 120}秒`);

    // 连接WebSocket
    function connect() {
        try {
            // 如果配置了access_token，添加到URL参数中
            let connectUrl = wsUrl;
            if (accessToken) {
                const separator = wsUrl.includes('?') ? '&' : '?';
                connectUrl = `${wsUrl}${separator}access_token=${encodeURIComponent(accessToken)}`;
            }

            ws = new WebSocket(connectUrl);

            ws.on('open', () => {
                logger.info('WebSocket连接成功');
                logger.info(` 连接URL: ${wsUrl}`);
                logger.info(` 目标群号: ${targetGroup}`);
                logger.info('机器人已就绪，等待消息...');
                logger.info('提示: 在群 ' + targetGroup + ' 中发送验证码即可完成绑定');
                
                // 启动心跳
                heartbeatTimer = setInterval(() => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            action: 'get_status'
                        }));
                    }
                }, 30000);
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    handleBotMessage(message);
                } catch (e) {
                    logger.error('解析消息失败:', e.message);
                    logger.debug('原始消息:', data.toString());
                }
            });

            ws.on('error', (error) => {
                logger.error('WebSocket错误:', error.message);
                logger.debug('错误详情:', error);
            });

            ws.on('close', (code, reason) => {
                logger.warn(`WebSocket连接断开`);
                logger.info(`   关闭代码: ${code}`);
                logger.info(`   关闭原因: ${reason || '无'}`);
                logger.info(`   5秒后重连...`);
                
                // 清理心跳
                if (heartbeatTimer) {
                    clearInterval(heartbeatTimer);
                    heartbeatTimer = null;
                }

                // 重连
                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                }
                reconnectTimer = setTimeout(() => {
                    logger.info('尝试重新连接...');
                    connect();
                }, 5000);
            });

        } catch (e) {
            logger.error('连接失败:', e.message);
            logger.debug('错误详情:', e);
            reconnectTimer = setTimeout(() => {
                logger.info('尝试重新连接...');
                connect();
            }, 5000);
        }
    }

    // 处理消息
    function handleBotMessage(message) {
        // 只处理群消息
        if (message.post_type === 'message' && message.message_type === 'group') {
            const groupId = message.group_id.toString();
            const userId = message.user_id.toString();
            const messageText = message.raw_message || message.message;

            // 检查是否是目标群
            if (groupId !== targetGroup) {
                return;
            }

            logger.debug(`[${groupId}] ${userId}: ${messageText}`);

            const trimmedText = messageText.trim();

            // 1. 处理签到命令
            if (trimmedText === '签到' || trimmedText === '打卡' || trimmedText === 'qd') {
                handleCheckin(groupId, userId);
                return;
            }

            // 2. 处理积分查询命令
            if (trimmedText === '积分' || trimmedText === '查询' || trimmedText === 'jf' || trimmedText === '余额') {
                handlePointsQuery(groupId, userId);
                return;
            }

            // 3. 处理帮助命令
            if (trimmedText === '帮助' || trimmedText === '菜单' || trimmedText === 'help' || trimmedText === 'menu') {
                handleHelp(groupId);
                return;
            }

            // 4. 处理取消命令
            if (trimmedText === '取消' || trimmedText === 'qx' || trimmedText === '退出') {
                const session = userSessions.get(userId);
                if (session && (session.action === 'renewal' || session.action === 'renewal_confirm')) {
                    userSessions.delete(userId);
                    sendGroupMessage(groupId, `已取消续费操作`);
                    return;
                }
            }

            // 5. 处理续费命令
            if (trimmedText === '续费' || trimmedText === 'xf' || trimmedText === '实例') {
                handleRenewal(groupId, userId);
                return;
            }

            // 6. 处理续费选择（数字）
            if (/^\d+$/.test(trimmedText)) {
                const session = userSessions.get(userId);
                if (session && session.action === 'renewal' && Date.now() < session.expireTime) {
                    handleRenewalSelect(groupId, userId, parseInt(trimmedText), session);
                    return;
                }
                // 如果是在续费确认阶段，直接发送数字表示续费天数
                if (session && session.action === 'renewal_confirm' && Date.now() < session.expireTime) {
                    const days = parseInt(trimmedText);
                    handleRenewalConfirm(groupId, userId, days, session);
                    return;
                }
            }

            // 7. 处理续费天数确认（保留原有的"续费 x 天"格式）
            if (trimmedText.startsWith('续费') && trimmedText.includes('天')) {
                const match = trimmedText.match(/续费\s*(\d+)\s*天/);
                if (match) {
                    const days = parseInt(match[1]);
                    const session = userSessions.get(userId);
                    if (session && session.action === 'renewal_confirm' && Date.now() < session.expireTime) {
                        handleRenewalConfirm(groupId, userId, days, session);
                        return;
                    }
                }
            }

            // 8. 处理转账命令 - 格式: "转账 用户名 金额 [备注]"
            if (trimmedText.startsWith('转账') || trimmedText.startsWith('zz')) {
                handleTransfer(groupId, userId, trimmedText);
                return;
            }

            // 9. 处理转账确认 - 格式: "同意 编号" 或 "拒绝 编号"
            if (trimmedText.startsWith('同意') || trimmedText.startsWith('ty')) {
                const match = trimmedText.match(/(?:同意|ty)\s+(\d+)/);
                if (match) {
                    const transferId = match[1];
                    handleTransferConfirm(groupId, userId, 'agree', transferId);
                    return;
                }
            }

            if (trimmedText.startsWith('拒绝') || trimmedText.startsWith('jj')) {
                const match = trimmedText.match(/(?:拒绝|jj)\s+(\d+)/);
                if (match) {
                    const transferId = match[1];
                    handleTransferConfirm(groupId, userId, 'reject', transferId);
                    return;
                }
            }

            // 10. 处理验证码（原有功能）
            const code = trimmedText.toUpperCase();

            if (botData.pendingVerify[code]) {
                handleVerifyCode(groupId, userId, code);
            }
        }
    }

    // 处理签到
    function handleCheckin(groupId, userId) {
        // 查找绑定的用户名
        let username = null;
        for (const [user, binding] of Object.entries(botData.bindings)) {
            if (binding.qqNumber === userId) {
                username = user;
                break;
            }
        }

        if (!username) {
            sendGroupMessage(groupId, `❌ 请先绑定账号\n在网页点击"绑定QQ"按钮完成绑定`);
            return;
        }

        // 调用签到功能
        const result = checkinManager.doCheckin(username);
        
        if (result.success) {
            const { rewardPoints, continuousDays, totalCheckins, currentPoints } = result.data;
            const msg = `✅ 签到成功！\n` +
                      `🎁 获得积分: +${rewardPoints}\n` +
                      `🔥 连续签到: ${continuousDays}天\n` +
                      `📅 累计签到: ${totalCheckins}次\n` +
                      `💰 当前积分: ${currentPoints}`;
            sendGroupMessage(groupId, msg);
            logger.info(`✅ ${username} 签到成功 +${rewardPoints}积分`);
        } else {
            sendGroupMessage(groupId, `❌ ${result.error || '签到失败'}`);
        }
    }

    // 处理积分查询
    function handlePointsQuery(groupId, userId) {
        // 查找绑定的用户名
        let username = null;
        for (const [user, binding] of Object.entries(botData.bindings)) {
            if (binding.qqNumber === userId) {
                username = user;
                break;
            }
        }

        if (!username) {
            sendGroupMessage(groupId, `❌ 请先绑定账号\n在网页点击"绑定QQ"按钮完成绑定`);
            return;
        }

        // 确保用户积分数据存在
        pointsManager.ensureUser(username);
        const points = pointsManager.getBalance(username);
        
        const msg = `💰 积分查询\n` +
                  `用户: ${username}\n` +
                  `当前积分: ${points}\n` +
                  `━━━━━━━━━━━━━━\n` +
                  `💡 发送"签到"可获取积分`;
        sendGroupMessage(groupId, msg);
        logger.info(`💰 ${username} 查询积分: ${points}`);
    }

    // 处理帮助命令
    function handleHelp(groupId) {
        const helpMsg = `📖 QQ机器人命令菜单\n` +
                       `━━━━━━━━━━━━━━\n` +
                       `🎯 基础功能:\n` +
                       `  签到/打卡 - 每日签到获取积分\n` +
                       `  积分/查询 - 查看当前积分\n` +
                       `  续费/实例 - 查看实例并续费\n` +
                       `  转账 用户名 金额 [备注] - 转账给其他用户\n` +
                       `  同意 编号 - 同意接收转账\n` +
                       `  拒绝 编号 - 拒绝接收转账\n` +
                       `  取消/退出 - 取消当前操作\n` +
                       `  帮助/菜单 - 显示此帮助\n` +
                       `\n` +
                       `🔗 账号绑定:\n` +
                       `  在网页点击"绑定QQ"按钮\n` +
                       `  获取验证码后在群里发送\n` +
                       `\n` +
                       `💸 转账说明:\n` +
                       `  • 转账示例: 转账 张三 100\n` +
                       `  • 带备注: 转账 李四 50 感谢帮助\n` +
                       `  • 如果接收方绑定了QQ，需要对方确认\n` +
                       `  • 接收方回复: 同意 编号\n` +
                       `  • 转账请求5分钟内有效\n` +
                       `\n` +
                       `💡 提示:\n` +
                       `  每日签到可获得随机积分\n` +
                       `  连续签到有额外奖励`;
        sendGroupMessage(groupId, helpMsg);
    }

    // 处理续费命令
    async function handleRenewal(groupId, userId) {
        // 查找绑定的用户名
        let username = null;
        for (const [user, binding] of Object.entries(botData.bindings)) {
            if (binding.qqNumber === userId) {
                username = user;
                break;
            }
        }

        if (!username) {
            sendGroupMessage(groupId, `❌ 请先绑定账号\n在网页点击"绑定QQ"按钮完成绑定`);
            return;
        }

        // 获取用户实例列表
        const result = await getUserInstancesByUsername(username);
        
        if (result.success && result.instances && result.instances.length > 0) {
            // 尝试生成图片
            const imagePath = await generateInstanceImage(result.instances, username);
            
            if (imagePath && fs.existsSync(imagePath)) {
                sendGroupImage(groupId, imagePath);
            } else {
                // 使用文字列表
                let textList = `📋 您的实例列表\n━━━━━━━━━━━━━━\n`;
                result.instances.forEach((inst, idx) => {
                    const now = Date.now();
                    let timeText = '永久';
                    if (inst.endTime) {
                        const diffDays = Math.ceil((inst.endTime - now) / (1000 * 60 * 60 * 24));
                        if (diffDays < 0) timeText = '已过期';
                        else if (diffDays === 0) timeText = '今天到期';
                        else timeText = `${diffDays}天后到期`;
                    }
                    textList += `\n${idx + 1}. ${inst.nickname || '未命名'}\n`;
                    textList += `   状态: ${inst.status === 3 ? '🟢运行中' : '⚫已停止'}\n`;
                    textList += `   到期: ${timeText}\n`;
                });
                sendGroupMessage(groupId, textList);
            }
            
            // 保存会话状态
            userSessions.set(userId, {
                action: 'renewal',
                username: username,
                instances: result.instances,
                expireTime: Date.now() + 120000
            });

            // 发送提示消息
            setTimeout(() => {
                sendGroupMessage(groupId, `请回复实例序号进行续费\n例如: 1\n\n💡 发送"取消"可退出\n⏱️ 有效期2分钟`);
            }, 1000);
        } else {
            sendGroupMessage(groupId, `❌ 您还没有任何实例\n请先在网页创建服务器`);
        }
    }

    // 处理续费选择
    function handleRenewalSelect(groupId, userId, selectedIndex, session) {
        const { instances, username } = session;
        
        if (selectedIndex < 1 || selectedIndex > instances.length) {
            sendGroupMessage(groupId, `❌ 无效的序号，请输入 1-${instances.length}`);
            return;
        }

        const instance = instances[selectedIndex - 1];
        
        // 更新会话状态
        userSessions.set(userId, {
            action: 'renewal_confirm',
            username: username,
            instance: instance,
            selectedIndex: selectedIndex,
            expireTime: Date.now() + 120000
        });

        const msg = `📋 续费信息\n` +
                   `━━━━━━━━━━━━━━\n` +
                   `实例: ${instance.nickname}\n` +
                   `当前到期: ${instance.endTimeFormatted || '永久'}\n` +
                   `\n` +
                   `💰 续费价格: ${config.renewal?.pricePerDay || 0.4} 积分/天\n` +
                   `\n` +
                   `请回复续费天数，支持以下格式:\n` +
                   `• 直接发送数字: 30\n` +
                   `• 完整格式: 续费 30 天\n` +
                   `\n` +
                   `💡 发送"取消"可退出\n` +
                   `⏱️ 有效期2分钟`;
        
        sendGroupMessage(groupId, msg);
    }

    // 处理续费确认
    async function handleRenewalConfirm(groupId, userId, days, session) {
        const { instance, username } = session;
        
        if (days < 1 || days > 365) {
            sendGroupMessage(groupId, `❌ 续费天数必须在 1-365 之间`);
            return;
        }

        const pricePerDay = config.renewal?.pricePerDay || 0.4;
        const totalCost = days * pricePerDay;

        try {
            // 确保用户积分数据存在
            pointsManager.ensureUser(username);
            
            // 检查积分是否足够
            const userPoints = pointsManager.getBalance(username);
            if (userPoints < totalCost) {
                sendGroupMessage(groupId, `❌ 积分不足\n需要: ${totalCost} 积分\n当前: ${userPoints} 积分`);
                return;
            }

            // 获取实例详情
            const instanceDetail = await mcsmApi.getInstance(instance.daemonId, instance.uuid);
            if (instanceDetail.data.status !== 200) {
                sendGroupMessage(groupId, `❌ 获取实例信息失败`);
                return;
            }

            const instConfig = instanceDetail.data.data.config;
            const currentEndTime = instConfig.endTime || Date.now();
            const newEndTime = currentEndTime + (days * 24 * 60 * 60 * 1000);

            // 更新实例配置
            const updateResult = await mcsmApi.updateInstance(instance.daemonId, instance.uuid, {
                endTime: newEndTime
            });

            if (updateResult.data.status !== 200) {
                sendGroupMessage(groupId, `❌ 更新实例失败`);
                return;
            }

            // 扣减积分
            const deductResult = pointsManager.deductPoints(
                username,
                totalCost,
                `续费实例 ${instance.nickname} ${days}天`
            );

            if (!deductResult.success) {
                sendGroupMessage(groupId, `❌ 扣减积分失败: ${deductResult.error}`);
                return;
            }

            const msg = `✅ 续费成功！\n` +
                      `━━━━━━━━━━━━━━\n` +
                      `实例: ${instance.nickname}\n` +
                      `续费天数: ${days}天\n` +
                      `消耗积分: ${totalCost}\n` +
                      `新到期时间: ${new Date(newEndTime).toLocaleString('zh-CN')}\n` +
                      `剩余积分: ${deductResult.balance}`;
            sendGroupMessage(groupId, msg);
            logger.info(`✅ ${username} 续费成功: ${instance.nickname} +${days}天`);
            
            // 清除会话
            userSessions.delete(userId);
        } catch (error) {
            logger.error('续费失败:', error);
            sendGroupMessage(groupId, `❌ 续费失败: ${error.message}`);
        }
    }

    // 处理转账命令
    async function handleTransfer(groupId, userId, messageText) {
        // 查找绑定的用户名
        let fromUsername = null;
        for (const [user, binding] of Object.entries(botData.bindings)) {
            if (binding.qqNumber === userId) {
                fromUsername = user;
                break;
            }
        }

        if (!fromUsername) {
            sendGroupMessage(groupId, `❌ 请先绑定账号\n在网页点击"绑定QQ"按钮完成绑定`);
            return;
        }

        // 解析转账命令 - 格式: "转账 用户名 金额 [备注]"
        const parts = messageText.trim().split(/\s+/);
        
        if (parts.length < 3) {
            sendGroupMessage(groupId, `❌ 格式错误\n正确格式:\n转账 用户名 金额 [备注]\n\n示例:\n转账 张三 100\n转账 李四 50 感谢帮助`);
            return;
        }

        const toUsername = parts[1];
        const amount = parseFloat(parts[2]);
        const note = parts.slice(3).join(' ') || '';

        // 验证金额
        if (isNaN(amount) || amount <= 0) {
            sendGroupMessage(groupId, `❌ 转账金额必须大于0`);
            return;
        }

        // 检查是否给自己转账
        if (fromUsername === toUsername) {
            sendGroupMessage(groupId, `❌ 不能给自己转账`);
            return;
        }

        try {
            // 检查接收用户是否存在
            const toUserValidation = await validateMcsmUser(toUsername);
            if (!toUserValidation.valid || !toUserValidation.exists) {
                sendGroupMessage(groupId, `❌ 用户 "${toUsername}" 不存在\n请确认用户名是否正确`);
                return;
            }

            // 检查转出用户积分是否充足
            pointsManager.ensureUser(fromUsername);
            const fromUserPoints = pointsManager.getBalance(fromUsername);
            if (fromUserPoints < amount) {
                sendGroupMessage(groupId, `❌ 积分不足\n需要: ${amount} 积分\n当前: ${fromUserPoints} 积分`);
                return;
            }

            // 检查接收用户是否绑定了QQ
            let toUserQQ = null;
            for (const [user, binding] of Object.entries(botData.bindings)) {
                if (user === toUsername) {
                    toUserQQ = binding.qqNumber;
                    break;
                }
            }

            if (toUserQQ) {
                // 接收用户已绑定QQ，需要确认
                // 生成转账编号（6位随机数字）
                const transferId = Math.floor(100000 + Math.random() * 900000).toString();
                
                // 确保 pendingTransfers 对象存在
                if (!botData.pendingTransfers) {
                    botData.pendingTransfers = {};
                }
                
                // 保存待确认转账
                botData.pendingTransfers[transferId] = {
                    fromUsername: fromUsername,
                    fromQQ: userId,
                    toUsername: toUsername,
                    toQQ: toUserQQ,
                    amount: amount,
                    note: note,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 5 * 60 * 1000 // 5分钟过期
                };
                writeBotData(botData);

                // 通知转出用户
                sendGroupMessage(groupId, `💰 转账请求已发送\n` +
                                         `━━━━━━━━━━━━━━\n` +
                                         `接收用户: ${toUsername}\n` +
                                         `转账金额: ${amount} 积分\n` +
                                         (note ? `备注: ${note}\n` : '') +
                                         `转账编号: ${transferId}\n` +
                                         `━━━━━━━━━━━━━━\n` +
                                         `⏳ 等待对方确认（5分钟内有效）`);

                // @接收用户并通知
                const atMsg = `[CQ:at,qq=${toUserQQ}] 💰 收到转账请求\n` +
                             `━━━━━━━━━━━━━━\n` +
                             `转出用户: ${fromUsername}\n` +
                             `转账金额: ${amount} 积分\n` +
                             (note ? `备注: ${note}\n` : '') +
                             `转账编号: ${transferId}\n` +
                             `━━━━━━━━━━━━━━\n` +
                             `✅ 同意请回复: 同意 ${transferId}\n` +
                             `❌ 拒绝请回复: 拒绝 ${transferId}\n` +
                             `⏱️ 5分钟内有效`;
                sendGroupMessage(groupId, atMsg);

                logger.info(`💸 转账请求创建: ${fromUsername} -> ${toUsername}, 金额: ${amount}积分, 编号: ${transferId}`);
            } else {
                // 接收用户未绑定QQ，直接转账
                const result = pointsManager.transfer(fromUsername, toUsername, amount, note);

                if (result.success) {
                        const taxInfo = result.data.taxAmount > 0 
                            ? `手续费(${(result.data.taxRate * 100).toFixed(0)}%): ${result.data.taxAmount} 积分\n实际扣除: ${result.data.totalCost} 积分\n`
                            : '';
                        const msg = `✅ 转账成功！\n` +
                                  `━━━━━━━━━━━━━━\n` +
                                  `转出: ${fromUsername}\n` +
                                  `接收: ${toUsername}\n` +
                                  `金额: ${amount} 积分\n` +
                                  taxInfo +
                                  (note ? `备注: ${note}\n` : '') +
                                  `━━━━━━━━━━━━━━\n` +
                                  `您的余额: ${result.data.fromBalance} 积分\n` +
                                  `💡 接收用户未绑定QQ，已直接转账`;
                    sendGroupMessage(groupId, msg);
                    logger.info(`💸 QQ转账成功（直接）: ${fromUsername} -> ${toUsername}, 金额: ${amount}积分`);
                } else {
                    sendGroupMessage(groupId, `❌ 转账失败: ${result.error}`);
                }
            }
        } catch (error) {
            logger.error('QQ转账处理异常:', error);
            sendGroupMessage(groupId, `❌ 转账失败: ${error.message}`);
        }
    }

    // 处理转账确认（同意/拒绝）
    function handleTransferConfirm(groupId, userId, action, transferId) {
        // 确保 pendingTransfers 对象存在
        if (!botData.pendingTransfers) {
            botData.pendingTransfers = {};
        }
        
        const transfer = botData.pendingTransfers[transferId];
        
        if (!transfer) {
            sendGroupMessage(groupId, `❌ 转账编号 ${transferId} 不存在或已过期`);
            return;
        }

        // 检查是否是接收用户
        if (transfer.toQQ !== userId) {
            sendGroupMessage(groupId, `❌ 只有接收用户才能确认此转账`);
            return;
        }

        // 检查是否过期
        if (Date.now() > transfer.expiresAt) {
            sendGroupMessage(groupId, `❌ 转账编号 ${transferId} 已过期`);
            delete botData.pendingTransfers[transferId];
            writeBotData(botData);
            return;
        }

        if (action === 'agree') {
            // 同意转账
            // 再次检查转出用户积分是否充足（防止期间积分被使用）
            pointsManager.ensureUser(transfer.fromUsername);
            const fromUserPoints = pointsManager.getBalance(transfer.fromUsername);
            
            if (fromUserPoints < transfer.amount) {
                sendGroupMessage(groupId, `❌ 转账失败：转出用户积分不足\n` +
                                         `需要: ${transfer.amount} 积分\n` +
                                         `当前: ${fromUserPoints} 积分`);
                
                // 通知转出用户
                const notifyMsg = `[CQ:at,qq=${transfer.fromQQ}] ❌ 转账失败\n` +
                                 `━━━━━━━━━━━━━━\n` +
                                 `转账编号: ${transferId}\n` +
                                 `失败原因: 积分不足`;
                sendGroupMessage(groupId, notifyMsg);
                
                delete botData.pendingTransfers[transferId];
                writeBotData(botData);
                return;
            }

            // 执行转账
            const result = pointsManager.transfer(
                transfer.fromUsername, 
                transfer.toUsername, 
                transfer.amount, 
                transfer.note
            );

            if (result.success) {
                // 通知接收用户
                const toMsg = `[CQ:at,qq=${userId}] ✅ 转账已到账！\n` +
                             `━━━━━━━━━━━━━━\n` +
                             `转出用户: ${transfer.fromUsername}\n` +
                             `转账金额: ${transfer.amount} 积分\n` +
                             (transfer.note ? `备注: ${transfer.note}\n` : '') +
                             `━━━━━━━━━━━━━━\n` +
                             `您的余额: ${result.data.toBalance} 积分`;
                sendGroupMessage(groupId, toMsg);

                // 通知转出用户
                const taxInfo_confirm = result.data.taxAmount > 0 
                    ? `手续费(${(result.data.taxRate * 100).toFixed(0)}%): ${result.data.taxAmount} 积分\n实际扣除: ${result.data.totalCost} 积分\n`
                    : '';
                const fromMsg = `[CQ:at,qq=${transfer.fromQQ}] ✅ 转账成功！\n` +
                               `━━━━━━━━━━━━━━\n` +
                               `接收用户: ${transfer.toUsername}\n` +
                               `转账金额: ${transfer.amount} 积分\n` +
                               taxInfo_confirm +
                               (transfer.note ? `备注: ${transfer.note}\n` : '') +
                               `━━━━━━━━━━━━━━\n` +
                               `您的余额: ${result.data.fromBalance} 积分`;
                sendGroupMessage(groupId, fromMsg);

                logger.info(`💸 QQ转账成功（确认）: ${transfer.fromUsername} -> ${transfer.toUsername}, 金额: ${transfer.amount}积分, 编号: ${transferId}`);
            } else {
                sendGroupMessage(groupId, `❌ 转账失败: ${result.error}`);
            }

            // 删除待确认转账
            delete botData.pendingTransfers[transferId];
            writeBotData(botData);

        } else if (action === 'reject') {
            // 拒绝转账
            const toMsg = `[CQ:at,qq=${userId}] ❌ 已拒绝转账\n` +
                         `━━━━━━━━━━━━━━\n` +
                         `转账编号: ${transferId}\n` +
                         `转出用户: ${transfer.fromUsername}\n` +
                         `转账金额: ${transfer.amount} 积分`;
            sendGroupMessage(groupId, toMsg);

            // 通知转出用户
            const fromMsg = `[CQ:at,qq=${transfer.fromQQ}] ❌ 转账被拒绝\n` +
                           `━━━━━━━━━━━━━━\n` +
                           `转账编号: ${transferId}\n` +
                           `接收用户: ${transfer.toUsername}\n` +
                           `转账金额: ${transfer.amount} 积分`;
            sendGroupMessage(groupId, fromMsg);

            logger.info(`💸 QQ转账被拒绝: ${transfer.fromUsername} -> ${transfer.toUsername}, 金额: ${transfer.amount}积分, 编号: ${transferId}`);

            // 删除待确认转账
            delete botData.pendingTransfers[transferId];
            writeBotData(botData);
        }
    }

    // 处理验证码验证（原有功能）
    function handleVerifyCode(groupId, userId, code) {
        const verify = botData.pendingVerify[code];
        const now = Date.now();

        // 检查是否过期
        if (now > verify.expireTime) {
            sendGroupMessage(groupId, `验证码 ${code} 已过期，请重新获取`);
            delete botData.pendingVerify[code];
            writeBotData(botData);
            return;
        }

        // 检查是否已验证
        if (verify.verified) {
            sendGroupMessage(groupId, `验证码 ${code} 已被使用`);
            return;
        }

        // 🔒 检查该QQ号是否已被其他账户绑定
        for (const [existingUsername, binding] of Object.entries(botData.bindings)) {
            if (binding.qqNumber === userId && existingUsername !== verify.username) {
                sendGroupMessage(groupId, `❌ 绑定失败！\n该QQ号已被账户 ${existingUsername} 绑定\n一个QQ号只能绑定一个账户`);
                logger.warn(`⚠️ QQ ${userId} 尝试绑定 ${verify.username}，但已被 ${existingUsername} 绑定`);
                // 删除验证码
                delete botData.pendingVerify[code];
                writeBotData(botData);
                return;
            }
        }

        // 验证成功
        verify.verified = true;
        verify.qqNumber = userId;
        verify.verifyTime = new Date().toISOString();

        // 保存绑定关系
        botData.bindings[verify.username] = {
            qqNumber: userId,
            bindTime: new Date().toISOString(),
            username: verify.username
        };

        // 不立即删除验证码，保留30秒让前端检测到验证成功状态
        // 30秒后自动清理
        setTimeout(() => {
            if (botData.pendingVerify[code]) {
                delete botData.pendingVerify[code];
                writeBotData(botData);
                logger.debug(`清理已验证的验证码: ${code}`);
            }
        }, 30000);
        
        // 立即保存数据（包含 verified 标记）
        writeBotData(botData);

        logger.info(`✅ ${verify.username} 绑定QQ: ${userId}`);
        sendGroupMessage(groupId, `✅ 绑定成功！\n用户名: ${verify.username}\nQQ号: ${userId}\n\n💡 现在可以使用"签到"命令获取积分了`);
    }

    // 发送群图片（针对NapCat优化）
    function sendGroupImage(groupId, imagePath) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                // NapCat推荐使用base64格式
                const imageBuffer = fs.readFileSync(imagePath);
                const base64Data = imageBuffer.toString('base64');
                
                // NapCat的消息格式
                const payload = {
                    action: 'send_group_msg',
                    params: {
                        group_id: parseInt(groupId),
                        message: [
                            {
                                type: 'image',
                                data: {
                                    file: `base64://${base64Data}`
                                }
                            }
                        ]
                    }
                };
                
                ws.send(JSON.stringify(payload));
                
                // 清理临时文件（延迟删除，确保发送完成）
                setTimeout(() => {
                    try {
                        if (fs.existsSync(imagePath)) {
                            fs.unlinkSync(imagePath);
                        }
                    } catch (e) {
                        logger.error(`❌ 清理临时文件失败:`, e.message);
                    }
                }, 5000);
                
            } catch (e) {
                logger.error(`❌ 发送图片失败:`, e.message);
            }
        } else {
            logger.error(`❌ WebSocket未连接`);
        }
    }

    // 启动连接
    connect();

    // 定期清理过期验证码（每分钟）
    setInterval(() => {
        cleanExpiredVerify();
    }, 60000);
}

// 保存函数
function saveOrders() {
    queueUserDataSync();
    return true;
}

function saveUsers() {
    queueUserDataSync();
    return true;
}

function savePoints() {
    queueUserDataSync();
    return true;
}

function saveProcessedOrders() {
    queueUserDataSync();
    return true;
}

// 保存已处理的支付记录
function saveProcessedPayments() {
    const saved = writeJsonFile(PROCESSED_PAYMENTS_PATH, processedPayments);
    if (saved) queueUserDataSync();
    return saved;
}

// 保存待支付订单
function savePendingOrders() {
    queueUserDataSync();
    return true;
}

// 生成支付记录的唯一标识
function getPaymentRecordId(record) {
    // 使用金额+时间作为唯一标识
    const amount = parseFloat(record.amount).toFixed(2);
    const time = record.time || '';
    return `${amount}_${time}`;
}

// 清理过期的待支付订单
function cleanExpiredPendingOrders() {
    const now = Date.now();
    const heartbeatTimeout = 20 * 1000; // 20秒无心跳视为离线
    let cleaned = 0;
    
    Object.keys(pendingOrders).forEach(orderId => {
        const order = pendingOrders[orderId];
        const timeSinceHeartbeat = now - (order.lastHeartbeat || order.createdAt);
        
        // 如果订单过期或超过20秒无心跳，则清理
        if (order.expiresAt < now || timeSinceHeartbeat > heartbeatTimeout) {
            delete pendingOrders[orderId];
            cleaned++;
            logger.debug(`清理待支付订单: ${orderId} (${order.expiresAt < now ? '已过期' : '无心跳'})`);
        }
    });
    
    if (cleaned > 0) {
        savePendingOrders();
    }
    return cleaned;
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

        const bodyData = options.body ? JSON.stringify(options.body) : null;

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

        // 如果有 body，添加 Content-Length 头
        if (bodyData) {
            requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyData);
        }

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

        if (bodyData) {
            req.write(bodyData);
        }

        req.end();
    });
}

// ============== 积分计算 ==============

const POINTS_RATIO = config.services?.recharge?.pointsRatio || 6;
const REFUND_RATE = ((config.refund?.rate ?? 90) / 100);

function calculateAndSavePoints() {
    logger.info('🔄 正在计算用户积分...');
    
    // 保存现有的所有积分数据（包括非订单来源的积分）
    const existingPoints = JSON.parse(JSON.stringify(localPoints)); // 深拷贝
    
    const userStats = {};
    
    // 第一步：从订单计算充值获得的积分
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
                        earnedPointsFromOrders: 0, // 从订单获得的积分
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
    
    // 第二步：计算每个用户从订单获得的积分
    Object.values(userStats).forEach(user => {
        user.earnedPointsFromOrders = Math.floor(user.totalAmount * POINTS_RATIO);
    });
    
    // 第三步：合并现有积分数据，保留非订单来源的积分
    Object.keys(existingPoints).forEach(username => {
        const existing = existingPoints[username];
        
        if (!userStats[username]) {
            // 该用户没有订单，但可能有其他来源的积分（签到、兑换码等）
            userStats[username] = {
                username: username,
                totalAmount: 0,
                earnedPointsFromOrders: 0,
                orderCount: 0,
                orders: []
            };
        }
        
        // 保留扣除历史
        if (existing.deductHistory && existing.deductHistory.length > 0) {
            userStats[username].deductHistory = existing.deductHistory;
        } else {
            userStats[username].deductHistory = [];
        }
        
        // 保留其他来源的积分（签到、兑换码、管理员赠送等）
        // 计算方式：现有总积分 - 订单积分 + 扣除积分 = 其他来源积分
        const existingEarnedFromOrders = existing.earnedPoints || 0;
        const existingTotalDeducted = existing.totalDeducted || 0;
        const existingTotalPoints = existing.totalPoints || 0;
        
        // 其他来源积分 = 现有总积分 - (订单积分 - 扣除积分)
        const otherSourcePoints = existingTotalPoints - (existingEarnedFromOrders - existingTotalDeducted);
        
        userStats[username].otherSourcePoints = Math.max(0, otherSourcePoints);
    });
    
    // 第四步：计算最终积分
    Object.values(userStats).forEach(user => {
        const earnedFromOrders = user.earnedPointsFromOrders || 0;
        const otherPoints = user.otherSourcePoints || 0;
        const totalDeducted = user.deductHistory.reduce((sum, record) => sum + record.points, 0);
        
        user.earnedPoints = earnedFromOrders; // 保留此字段用于兼容
        user.totalDeducted = totalDeducted;
        user.totalPoints = round(earnedFromOrders + otherPoints - totalDeducted);
        
        if (user.totalPoints < 0) {
            user.totalPoints = 0;
        }
    });
    
    localPoints = userStats;
    savePoints();
    
    logger.info(`✓ 积分计算完成: ${Object.keys(localPoints).length} 个用户`);
    return userStats;
}

// ============== MCSM API ==============

/**
 * 检查 MCSM 服务器是否可用
 * @param {string} panelUrl MCSM 面板的 URL
 * @param {number} timeout 请求超时时间（毫秒）
 * @returns {Promise<boolean>} 如果服务器可用则返回 true，否则返回 false
 */
async function checkMcsmServerStatus(panelUrl, timeout = 5000) {
    try {
        const parsedUrl = new URL(panelUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const lib = isHttps ? https : http;

        return new Promise((resolve) => {
            const req = lib.get(panelUrl, { rejectUnauthorized: false, timeout: timeout }, (res) => {
                // 只需要检查状态码，不需要读取响应体
                if (res.statusCode === 200) {
                    resolve(true);
                } else {
                    resolve(false);
                }
                res.resume(); // 消耗响应数据以释放内存
            });

            req.on('error', (e) => {
                console.error(`[MCSM Status Check] 请求 MCSM 面板失败 (${panelUrl}): ${e.message}`);
                resolve(false);
            });

            req.on('timeout', () => {
                req.destroy();
                console.error(`[MCSM Status Check] 请求 MCSM 面板超时 (${panelUrl})`);
                resolve(false);
            });
        });
    } catch (e) {
        console.error(`[MCSM Status Check] 检查 MCSM 面板状态时发生异常 (${panelUrl}): ${e.message}`);
        return false;
    }
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

    async createUser(username, password) {
        const apiUrl = `${config.mcsm.panelUrl}/api/auth?apikey=${config.mcsm.apiKey}`;
        return await makeRequest(apiUrl, {
            method: 'POST',
            body: {
                username: username,
                password: password,
                permission: 1 // 1=普通用户
            }
        });
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

    async updateUser(uuid, userConfig) {
        const apiUrl = `${config.mcsm.panelUrl}/api/auth?apikey=${config.mcsm.apiKey}`;
        return await makeRequest(apiUrl, { method: 'PUT', body: { uuid: uuid, config: userConfig } });
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
    },

    async controlInstance(daemonId, uuid, command) {
        // 根据用户反馈，'restart' 命令使用不同的 API 端点和方法
        if (command === 'restart') {
            const apiUrl = `${config.mcsm.panelUrl}/api/protected_instance/restart?apikey=${config.mcsm.apiKey}&uuid=${uuid}&daemonId=${daemonId}`;
            logger.debug(`[CONTROL_INSTANCE] Sending command 'restart' to ${uuid} on ${daemonId} via GET`);
            return await makeRequest(apiUrl, { method: 'GET' });
        }

        // 保留旧的命令方式用于其他命令 (如 start, stop, kill)
        const apiUrl = `${config.mcsm.panelUrl}/api/protected_instance/command?apikey=${config.mcsm.apiKey}`;
        const body = {
            remote_uuid: daemonId,
            instance_uuid: uuid,
            command: command
        };
        logger.debug(`[CONTROL_INSTANCE] Sending command '${command}' to ${uuid} on ${daemonId} via POST`);
        return await makeRequest(apiUrl, { method: 'POST', body: body });
    },

    async deleteInstance(daemonId, uuids, deleteFile = false) {
        const apiUrl = `${config.mcsm.panelUrl}/api/instance?apikey=${config.mcsm.apiKey}&daemonId=${daemonId}`;
        const body = {
            uuids: uuids,
            deleteFile: deleteFile
        };
        console.log(`[DELETE_INSTANCE] 请求 URL: ${apiUrl}`);
        console.log(`[DELETE_INSTANCE] 请求 Body:`, JSON.stringify(body));
        console.log(`[DELETE_INSTANCE] Deleting instances on ${daemonId}:`, uuids, `deleteFile: ${deleteFile}`);
        return await makeRequest(apiUrl, { method: 'DELETE', body: body });
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

    async register(username, password, email = '') {
        if (!username || username.length < 3 || username.length > 20) {
            return { success: false, error: '用户名长度必须在3-20个字符之间' };
        }

        if (!password || password.length < 6) {
            return { success: false, error: '密码长度至少6个字符' };
        }

        if (this.findByUsername(username)) {
            return { success: false, error: '用户名已存在' };
        }

        // 使用 bcrypt 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            username: username,
            password: hashedPassword,  // 存储加密后的密码
            email: email || '',
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        localUsers.push(newUser);
        saveUsers();

        const { password: _, ...safeUser } = newUser;
        return { success: true, user: safeUser };
    },

    async verifyPassword(username, password) {
        const user = this.findByUsername(username);
        if (!user || !user.password) {
            return false;
        }

        try {
            // 使用 bcrypt 比对密码
            return await bcrypt.compare(password, user.password);
        } catch (e) {
            logger.error(`密码验证失败 (${username}):`, e.message);
            return false;
        }
    },

    async updatePassword(username, newPassword) {
        const user = this.findByUsername(username);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        if (!newPassword || newPassword.length < 6) {
            return { success: false, error: '密码长度至少6个字符' };
        }

        try {
            // 使用 bcrypt 加密新密码
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            user.passwordUpdatedAt = new Date().toISOString();
            saveUsers();

            return { success: true };
        } catch (e) {
            logger.error(`更新密码失败 (${username}):`, e.message);
            return { success: false, error: '密码更新失败' };
        }
    },

    deleteUser(id) {
        const index = localUsers.findIndex(u => u.id === id);
        if (index === -1) {
            return { success: false, error: '用户不存在' };
        }

        const user = localUsers[index];
        localUsers.splice(index, 1);
        delete localPoints[user.username];
        delete checkinData[user.username];
        delete autoRenewalData[user.username];
        delete botData.bindings?.[user.username];
        Object.keys(serversData).forEach(serverId => {
            if (serversData[serverId]?.userId === user.username || serversData[serverId]?.mcsmUserUuid === user.id) {
                delete serversData[serverId];
            }
        });
        deleteUserDataFile(user);
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
    },

    banUser(username) {
        const user = this.findByUsername(username);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        if (user.status === 'banned') {
            return { success: false, error: '用户已被封禁' };
        }

        user.status = 'banned';
        user.bannedAt = new Date().toISOString();
        saveUsers();

        const { password: _, ...safeUser } = user;
        return { success: true, user: safeUser };
    },

    unbanUser(username) {
        const user = this.findByUsername(username);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        if (user.status !== 'banned') {
            return { success: false, error: '用户未被封禁' };
        }

        user.status = 'active';
        user.unbannedAt = new Date().toISOString();
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
        localPoints[username].totalPoints = round(user.totalPoints - points);
        
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
    },

    /**
     * 转账功能 - 从一个用户转积分给另一个用户
     * @param {string} fromUsername - 转出用户
     * @param {string} toUsername - 接收用户
     * @param {number} points - 转账积分数量
     * @param {string} note - 转账备注
     * @returns {Object} 转账结果
     */
    transfer(fromUsername, toUsername, points, note = '') {
        // 验证参数
        if (!fromUsername || !toUsername) {
            return { success: false, error: '用户名不能为空' };
        }

        if (fromUsername === toUsername) {
            return { success: false, error: '不能给自己转账' };
        }

        if (!points || points <= 0) {
            return { success: false, error: '转账金额必须大于0' };
        }

        // 读取转账税率配置（默认0 = 无税，整数百分比：10=10%）
        const taxRatePercent = config.transfer?.taxRate || 0;
        const taxRate = taxRatePercent / 100;
        const taxAmount = round(points * taxRate);
        const totalCost = round(points + taxAmount); // 转出方实际扣除的总积分

        // 确保两个用户都存在
        this.ensureUser(fromUsername);
        this.ensureUser(toUsername);

        const fromUser = this.getUser(fromUsername);
        const toUser = this.getUser(toUsername);

        // 检查转出用户积分是否足够（含税）
        if (fromUser.totalPoints < totalCost) {
            return { 
                success: false, 
                error: '积分不足' + (taxAmount > 0 ? `（含${taxRatePercent}%手续费）` : ''), 
                balance: fromUser.totalPoints, 
                required: totalCost,
                transferAmount: points,
                taxAmount: taxAmount,
                taxRate: taxRate
            };
        }

        // 执行转账
        const previousFromPoints = fromUser.totalPoints;
        const previousToPoints = toUser.totalPoints;

        // 扣除转出用户的积分（含税）
        localPoints[fromUsername].totalPoints = round(fromUser.totalPoints - totalCost);
        
        // 增加接收用户的积分（仅收到转账金额，不含税）
        localPoints[toUsername].totalPoints = round(toUser.totalPoints + points);

        // 记录转出历史
        if (!localPoints[fromUsername].deductHistory) {
            localPoints[fromUsername].deductHistory = [];
        }
        localPoints[fromUsername].deductHistory.push({
            points: totalCost,  // 记录含税总额
            reason: `转账给 ${toUsername}${note ? ': ' + note : ''}${taxAmount > 0 ? ` (含${(taxRate * 100).toFixed(0)}%手续费` + taxAmount + ')' : ''}`,
            time: new Date().toISOString(),
            previousPoints: previousFromPoints,
            afterPoints: localPoints[fromUsername].totalPoints,
            type: 'transfer_out',
            relatedUser: toUsername
        });

        // 记录接收历史
        if (!localPoints[toUsername].deductHistory) {
            localPoints[toUsername].deductHistory = [];
        }
        localPoints[toUsername].deductHistory.push({
            points: -points,  // 负数表示增加
            reason: `收到 ${fromUsername} 的转账${note ? ': ' + note : ''}`,
            time: new Date().toISOString(),
            previousPoints: previousToPoints,
            afterPoints: localPoints[toUsername].totalPoints,
            type: 'transfer_in',
            relatedUser: fromUsername
        });

        // 保存数据
        savePoints();

        logger.info(`💸 转账成功: ${fromUsername} -> ${toUsername}, 金额: ${points}积分${note ? ', 备注: ' + note : ''}`);

        return {
            success: true,
            data: {
                fromUser: fromUsername,
                toUser: toUsername,
                amount: points,
                note: note,
                fromBalance: localPoints[fromUsername].totalPoints,
                toBalance: localPoints[toUsername].totalPoints,
                taxRate: taxRate,
                taxAmount: taxAmount,
                totalCost: totalCost,
                timestamp: new Date().toISOString()
            }
        };
    },

    /**
     * 获取用户的转账历史
     * @param {string} username - 用户名
     * @param {number} limit - 返回记录数量限制
     * @returns {Array} 转账历史记录
     */
    getTransferHistory(username, limit = 50) {
        const user = this.getUser(username);
        if (!user || !user.deductHistory) {
            return [];
        }

        return user.deductHistory
            .filter(record => record.type === 'transfer_in' || record.type === 'transfer_out')
            .slice(-limit)
            .reverse();
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

function serveStaticFile(res, filePath, extraHeaders = {}) {
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
        
        const headers = { 'Content-Type': contentType, ...extraHeaders };
        res.writeHead(200, headers);
        res.end(data);
    });
}

// ============== 设置响应头 ==============

function setCorsHeaders(res) {
    // 更安全的CORS配置 - 可以在config.yml中配置允许的源
    const allowedOrigins = config.cors?.allowedOrigins || ['*'];
    
    if (allowedOrigins.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
        // 如果配置了具体的源，这里可以根据请求的Origin进行验证
        res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24小时
}

function setSecurityHeaders(res) {
    // 添加安全响应头
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // CSP - 根据需要调整
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' *; img-src 'self' data: *;");
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

/**
 * Express-style middleware for authenticating user tokens.
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {Function} next
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return jsonResponse(res, 401, { code: -1, msg: '未提供认证令牌' });
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return jsonResponse(res, 403, { code: -1, msg: '令牌无效或已过期' });
        }
        req.user = user;
        next();
    });
}

// 用于 root 接口的认证函数
function authenticate(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.debug('认证失败：缺少或无效的 Authorization header');
        return false;
    }
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        logger.debug(`Token 解码成功，role: ${decoded?.role}`);
        // 检查是否是管理员
        const isAdmin = decoded && decoded.role === 'admin';
        if (!isAdmin) {
            logger.debug('认证失败：用户角色不是 admin');
        }
        return isAdmin;
    } catch (err) {
        logger.debug(`Token 验证失败: ${err.message}`);
        return false;
    }
}

// ============== 主服务器 ==============

let server;
const requestHandler = async (req, res) => {
    // 使用新的 WHATWG URL API 替代已弃用的 url.parse()
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = parsedUrl.pathname;
    const query = Object.fromEntries(parsedUrl.searchParams);

    setCorsHeaders(res);
    setSecurityHeaders(res); // 添加安全响应头

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 记录请求日志，包含客户端 IP
    const clientIp = getClientIp(req);
    logger.info(`[${clientIp}] ${req.method} ${pathname}`);

    try {
        // ============== 支付后端 API ==============

        // 获取验证码
        if (pathname === '/api/captcha' && req.method === 'GET') {
            const captchaId = query.id || crypto.randomBytes(16).toString('hex'); // 生成唯一的验证码ID
            const cap = captcha.create({
                size: 4, // 验证码长度
                ignoreChars: '0o1i', // 排除字符
                noise: 2, // 干扰线数量
                color: false, // 字体颜色 (false 表示随机颜色，确保与背景对比度)
                background: '#FFFFFF' // 背景颜色改为白色
            });

            const expirationTime = 175 * 1000; // 175秒
            captchaStore[captchaId] = {
                text: cap.text.toLowerCase(), // 存储验证码文本，转为小写以便不区分大小写验证
                expiresAt: Date.now() + expirationTime // 存储过期时间戳
            };
            
            // 设置验证码过期定时清理
            setTimeout(() => {
                delete captchaStore[captchaId];
            }, expirationTime);

            res.writeHead(200, {
                'X-Captcha-Expires-In': expirationTime / 1000, // 返回过期时间（秒）给前端
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Captcha-Id': captchaId // 将验证码ID返回给前端
            });
            res.end(cap.data);
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

        // ============== 支付验证接口 ==============

        // 支付验证接口（新版本 - 基于 query_payment API）
        if (pathname === '/api/verify_payment' && req.method === 'POST') {
            try {
                const { orderId, amount, verifyCode, method } = await parseBody(req);

                if (!orderId || !amount) {
                    jsonResponse(res, 400, { status: 'error', message: '缺少必要参数' });
                    return;
                }

                // 检查订单是否已处理
                if (localOrders[orderId] && localOrders[orderId].status === 'paid') {
                    jsonResponse(res, 200, { status: 'success', message: '订单已处理' });
                    return;
                }

                // 从配置获取支付API地址
                const paymentApiUrl = config.services?.payment?.backend?.url || 'http://YOU_PAY_IP/query_payment';
                const timeout = config.services?.payment?.backend?.timeout || 10000;

                // 请求支付API
                const paymentData = await httpGet(paymentApiUrl, timeout).catch(err => {
                    logger.error('支付API请求失败:', err.message);
                    throw new Error('无法连接到支付服务');
                });

                if (paymentData.status !== 'success' || !paymentData.records || paymentData.records.length === 0) {
                    jsonResponse(res, 200, { status: 'pending', message: '暂无支付记录' });
                    return;
                }

                // 验证逻辑
                const baseAmount = parseFloat(amount);
                let matchedRecord = null;

                if (method === 'amount') {
                    // 金额匹配模式：检查基础金额及递增金额（10, 10.1, 10.2...）
                    // 最多检查到 +1.0 的范围
                    for (let increment = 0; increment <= 1.0; increment += 0.1) {
                        const checkAmount = baseAmount + increment;
                        const found = paymentData.records.find(record => {
                            const recordAmount = parseFloat(record.amount);
                            if (Math.abs(recordAmount - checkAmount) >= 0.01) return false;
                            
                            // 检查该支付记录是否已被使用
                            const recordId = getPaymentRecordId(record);
                            if (processedPayments[recordId]) {
                                logger.debug(`支付记录已被使用: ${recordId}, 订单: ${processedPayments[recordId].orderId}`);
                                return false;
                            }
                            
                            return true;
                        });
                        
                        if (found) {
                            matchedRecord = found;
                            matchedRecord.actualAmount = checkAmount; // 记录实际匹配的金额
                            break;
                        }
                    }
                } else if (method === 'memo' && verifyCode) {
                    // 备注匹配模式：固定金额 + 备注验证码
                    matchedRecord = paymentData.records.find(record => {
                        const memo = record.memo || '';
                        const recordAmount = parseFloat(record.amount);
                        if (!memo.includes(verifyCode) || Math.abs(recordAmount - baseAmount) >= 0.01) {
                            return false;
                        }
                        
                        // 检查该支付记录是否已被使用
                        const recordId = getPaymentRecordId(record);
                        if (processedPayments[recordId]) {
                            logger.debug(`支付记录已被使用: ${recordId}, 订单: ${processedPayments[recordId].orderId}`);
                            return false;
                        }
                        
                        return true;
                    });
                }

                if (matchedRecord) {
                    // 生成支付记录ID
                    const paymentRecordId = getPaymentRecordId(matchedRecord);
                    
                    // 验证成功，创建订单
                    localOrders[orderId] = {
                        order_id: orderId,
                        amount: baseAmount, // 保存原始订单金额
                        actual_amount: matchedRecord.actualAmount || baseAmount, // 实际支付金额
                        status: 'paid',
                        paid_at: new Date().toISOString(),
                        verification_method: method,
                        payment_time: matchedRecord.time,
                        payment_memo: matchedRecord.memo,
                        payment_record_id: paymentRecordId // 记录支付记录ID
                    };
                    
                    // 标记支付记录为已使用
                    processedPayments[paymentRecordId] = {
                        orderId: orderId,
                        processedAt: new Date().toISOString(),
                        amount: matchedRecord.actualAmount || baseAmount,
                        method: method
                    };
                    
                    // 清理待支付订单
                    if (pendingOrders[orderId]) {
                        delete pendingOrders[orderId];
                        savePendingOrders();
                    }
                    
                    saveOrders();
                    saveProcessedPayments();
                    calculateAndSavePoints();

                    logger.info(`✓ 订单支付成功: ${orderId}, 订单金额: ${baseAmount}, 实际支付: ${matchedRecord.actualAmount || baseAmount}, 方式: ${method}, 支付记录ID: ${paymentRecordId}`);
                    jsonResponse(res, 200, { 
                        status: 'success', 
                        message: '支付验证成功！',
                        order: localOrders[orderId]
                    });
                } else {
                    jsonResponse(res, 200, { status: 'pending', message: '未找到匹配的支付记录' });
                }

            } catch (error) {
                logger.error('支付验证异常:', error.message);
                jsonResponse(res, 500, { status: 'error', message: error.message });
            }
            return;
        }

        // 获取下一个可用的支付金额（用于金额匹配模式）
        if (pathname === '/api/get_next_amount') {
            try {
                const baseAmount = parseFloat(query.amount);
                const orderId = query.order_id; // 获取订单号
                
                if (!baseAmount || isNaN(baseAmount)) {
                    jsonResponse(res, 400, { status: 'error', message: '缺少有效的金额参数' });
                    return;
                }

                // 清理过期的待支付订单
                cleanExpiredPendingOrders();

                // 从配置获取支付API地址
                const paymentApiUrl = config.services?.payment?.backend?.url || 'http://YOU_PAY_IP/query_payment';
                const timeout = config.services?.payment?.backend?.timeout || 10000;

                // 请求支付API获取已有支付记录
                const paymentData = await httpGet(paymentApiUrl, timeout).catch(err => {
                    // 如果获取失败，返回基础金额
                    logger.warn('获取支付记录失败，使用基础金额:', err.message);
                    return { status: 'success', records: [] };
                });

                // 查找第一个未被占用的金额
                let nextAmount = baseAmount;
                const records = paymentData.records || [];
                
                for (let increment = 0; increment <= 1.0; increment += 0.1) {
                    const checkAmount = baseAmount + increment;
                    
                    // 检查1：是否有未使用的支付记录
                    const hasUnusedPayment = records.some(record => {
                        const recordAmount = parseFloat(record.amount);
                        if (Math.abs(recordAmount - checkAmount) >= 0.01) return false;
                        
                        // 检查该支付记录是否已被使用
                        const recordId = getPaymentRecordId(record);
                        const isUsed = processedPayments[recordId];
                        
                        // 只有存在且未被使用的记录才算冲突
                        return !isUsed;
                    });
                    
                    // 检查2：是否有其他待支付订单占用该金额
                    const hasPendingOrder = Object.values(pendingOrders).some(order => {
                        return Math.abs(order.amount - checkAmount) < 0.01 && order.orderId !== orderId;
                    });
                    
                    if (!hasUnusedPayment && !hasPendingOrder) {
                        // 该金额没有未使用的支付记录，也没有其他待支付订单，可以使用
                        nextAmount = checkAmount;
                        break;
                    }
                }

                // 注册当前订单为待支付订单（10分钟有效期）
                if (orderId) {
                    const now = Date.now();
                    pendingOrders[orderId] = {
                        orderId: orderId,
                        amount: nextAmount,
                        createdAt: now,
                        lastHeartbeat: now, // 新增：最后心跳时间
                        expiresAt: now + 10 * 60 * 1000 // 10分钟后过期
                    };
                    savePendingOrders();
                    logger.debug(`注册待支付订单: ${orderId}, 金额: ${nextAmount}`);
                }

                jsonResponse(res, 200, { 
                    status: 'success', 
                    baseAmount: baseAmount,
                    nextAmount: parseFloat(nextAmount.toFixed(2)),
                    increment: parseFloat((nextAmount - baseAmount).toFixed(2))
                });

            } catch (error) {
                logger.error('获取下一个金额失败:', error.message);
                jsonResponse(res, 500, { status: 'error', message: error.message });
            }
            return;
        }

        // 心跳接口（保持待支付订单活跃）
        if (pathname === '/api/payment_heartbeat') {
            try {
                const orderId = query.order_id;
                
                if (!orderId) {
                    jsonResponse(res, 400, { status: 'error', message: '缺少订单号' });
                    return;
                }

                // 更新心跳时间
                if (pendingOrders[orderId]) {
                    pendingOrders[orderId].lastHeartbeat = Date.now();
                    savePendingOrders();
                    
                    jsonResponse(res, 200, { 
                        status: 'success', 
                        message: '心跳更新成功',
                        expiresIn: Math.floor((pendingOrders[orderId].expiresAt - Date.now()) / 1000)
                    });
                } else {
                    jsonResponse(res, 200, { 
                        status: 'not_found', 
                        message: '订单不存在或已过期' 
                    });
                }

            } catch (error) {
                logger.error('心跳更新失败:', error.message);
                jsonResponse(res, 500, { status: 'error', message: error.message });
            }
            return;
        }

        // 查询支付记录（代理接口）
        if (pathname === '/api/query_payment') {
            try {
                const paymentApiUrl = config.services?.payment?.backend?.url || 'http://YOU_PAY_IP/query_payment';
                const timeout = config.services?.payment?.backend?.timeout || 10000;

                const paymentData = await httpGet(paymentApiUrl, timeout);
                jsonResponse(res, 200, paymentData);
            } catch (error) {
                logger.error('查询支付记录失败:', error.message);
                jsonResponse(res, 502, { 
                    status: 'error', 
                    message: '无法连接到支付服务',
                    error: error.message 
                });
            }
            return;
        }

        // ============== 充值前端 API ==============

        // 获取配置信息
        if (pathname === '/api/config') {
            // 根据请求协议动态生成 payUrl
            const protocol = req.connection.encrypted || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    pointsRatio: POINTS_RATIO,
                    payUrl: `${protocol}://${req.headers.host}/payment/`,
                    localMode: true,
                    lastSync: lastSyncTime
                }
            });
            return;
        }

        // 获取用户积分 (支持单个用户或所有用户)
        if (pathname === '/api/users/points') {
            const username = query.username;

            // 如果提供了用户名，返回单个用户的数据
            if (username) {
                const userPoints = localPoints[username] || {
                    username: username,
                    totalAmount: 0,
                    earnedPoints: 0,
                    totalPoints: 0,
                    totalDeducted: 0,
                    orderCount: 0,
                    orders: [],
                    deductHistory: []
                };
                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: userPoints
                });
                return;
            }

            // 否则，返回所有用户的列表（包含状态信息）
            const userList = Object.values(localPoints).map(pointsUser => {
                // 查找对应的用户信息以获取状态
                const userInfo = userManager.findByUsername(pointsUser.username);
                return {
                    ...pointsUser,
                    status: userInfo?.status || 'active',
                    createdAt: userInfo?.createdAt || null,
                    id: userInfo?.id || null,
                    authMethod: userInfo?.authMethod || 'local'
                };
            }).sort((a, b) => b.totalPoints - a.totalPoints);
            
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
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

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
                localPoints[username].totalPoints = round(newPoints);

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
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

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
            localPoints[username].totalPoints = round(localPoints[username].totalPoints + points);

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
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

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

        // 转账功能 - 用户之间转移积分
        if (pathname === '/api/points/transfer' && req.method === 'POST') {
            try {
                // 验证用户登录
                const token = req.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    jsonResponse(res, 401, { code: -1, msg: '未登录' });
                    return;
                }

                let decoded;
                try {
                    decoded = jwt.verify(token, JWT_SECRET);
                } catch (e) {
                    jsonResponse(res, 401, { code: -1, msg: '登录已过期，请重新登录' });
                    return;
                }

                const fromUsername = decoded.username;
                const data = await parseBody(req);
                const { toUsername, points, note } = data;

                // 验证参数
                if (!toUsername) {
                    jsonResponse(res, 400, { code: -1, msg: '请输入接收用户名' });
                    return;
                }

                const transferPoints = parseFloat(points);
                if (isNaN(transferPoints) || transferPoints <= 0) {
                    jsonResponse(res, 400, { code: -1, msg: '转账金额必须大于0' });
                    return;
                }

                // 检查接收用户是否存在（在MCSManager中）
                const toUserValidation = await validateMcsmUser(toUsername);
                if (!toUserValidation.valid || !toUserValidation.exists) {
                    jsonResponse(res, 400, { 
                        code: -1, 
                        msg: '接收用户不存在，请确认用户名是否正确' 
                    });
                    return;
                }

                // 检查接收用户是否绑定了QQ
                const toUserBinding = botData.bindings && botData.bindings[toUsername];
                const targetGroup = config.onebot?.target_group;

                if (toUserBinding && toUserBinding.qqNumber && targetGroup) {
                    // 接收用户绑定了QQ，创建待确认转账
                    const transferId = Date.now().toString();
                    const expiresAt = Date.now() + 5 * 60 * 1000; // 5分钟后过期

                    if (!botData.pendingTransfers) {
                        botData.pendingTransfers = {};
                    }

                    botData.pendingTransfers[transferId] = {
                        fromUsername: fromUsername,
                        toUsername: toUsername,
                        toQQ: toUserBinding.qqNumber,
                        amount: transferPoints,
                        note: note || '',
                        createdAt: Date.now(),
                        expiresAt: expiresAt
                    };

                    writeBotData(botData);

                    // 发送QQ通知给接收用户
                    const atMsg = `[CQ:at,qq=${toUserBinding.qqNumber}] 💰 收到转账请求\n` +
                                 `━━━━━━━━━━━━━━\n` +
                                 `转出用户: ${fromUsername}\n` +
                                 `转账金额: ${transferPoints} 积分\n` +
                                 (note ? `备注: ${note}\n` : '') +
                                 `转账编号: ${transferId}\n` +
                                 `━━━━━━━━━━━━━━\n` +
                                 `✅ 同意请回复: 同意 ${transferId}\n` +
                                 `❌ 拒绝请回复: 拒绝 ${transferId}\n` +
                                 `💡 也可在网页"充值中心"确认\n` +
                                 `⏱️ 5分钟内有效`;
                    
                    logger.info(`📢 发送QQ通知给 ${toUsername} (QQ: ${toUserBinding.qqNumber})`);
                    sendGroupMessage(targetGroup, atMsg);

                    logger.info(`💸 网页转账请求创建: ${fromUsername} -> ${toUsername}, 金额: ${transferPoints}积分, 编号: ${transferId}`);

                    jsonResponse(res, 200, {
                        code: 0,
                        msg: '转账请求已发送，等待对方确认',
                        data: {
                            transferId: transferId,
                            fromUsername: fromUsername,
                            toUsername: toUsername,
                            amount: transferPoints,
                            note: note || '',
                            needConfirm: true,
                            expiresAt: expiresAt
                        }
                    });
                } else {
                    // 接收用户未绑定QQ，直接转账
                    const result = pointsManager.transfer(fromUsername, toUsername, transferPoints, note || '');

                    if (result.success) {
                        logger.info(`💸 网页转账成功（直接）: ${fromUsername} -> ${toUsername}, 金额: ${transferPoints}积分`);
                        jsonResponse(res, 200, {
                            code: 0,
                            msg: '转账成功',
                            data: result.data
                        });
                    } else {
                        jsonResponse(res, 400, {
                            code: -1,
                            msg: result.error,
                            data: {
                                currentBalance: result.balance,
                                required: result.required
                            }
                        });
                    }
                }
            } catch (e) {
                logger.error('转账处理异常:', e.message);
                jsonResponse(res, 500, { code: -1, msg: '转账失败: ' + e.message });
            }
            return;
        }

        // 获取转账历史
        if (pathname === '/api/points/transfer/history' && req.method === 'GET') {
            try {
                // 验证用户登录
                const token = req.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    jsonResponse(res, 401, { code: -1, msg: '未登录' });
                    return;
                }

                let decoded;
                try {
                    decoded = jwt.verify(token, JWT_SECRET);
                } catch (e) {
                    jsonResponse(res, 401, { code: -1, msg: '登录已过期，请重新登录' });
                    return;
                }

                const username = decoded.username;
                const limit = parseInt(query.limit) || 50;

                const history = pointsManager.getTransferHistory(username, limit);

                jsonResponse(res, 200, {
                    code: 0,
                    msg: '获取成功',
                    data: {
                        username: username,
                        history: history,
                        total: history.length
                    }
                });
            } catch (e) {
                logger.error('获取转账历史异常:', e.message);
                jsonResponse(res, 500, { code: -1, msg: '获取失败: ' + e.message });
            }
            return;
        }

        // 获取待确认的转账（接收方）
        if (pathname === '/api/points/transfer/pending' && req.method === 'GET') {
            try {
                // 验证用户登录
                const token = req.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    jsonResponse(res, 401, { code: -1, msg: '未登录' });
                    return;
                }

                let decoded;
                try {
                    decoded = jwt.verify(token, JWT_SECRET);
                } catch (e) {
                    jsonResponse(res, 401, { code: -1, msg: '登录已过期，请重新登录' });
                    return;
                }

                const username = decoded.username;
                
                // 确保 pendingTransfers 存在
                if (!botData.pendingTransfers) {
                    botData.pendingTransfers = {};
                }

                // 查找该用户待确认的转账
                const pendingList = [];
                const now = Date.now();

                for (const [transferId, transfer] of Object.entries(botData.pendingTransfers)) {
                    // 检查是否是该用户接收的转账
                    if (transfer.toUsername === username) {
                        // 检查是否过期
                        if (transfer.expiresAt > now) {
                            pendingList.push({
                                transferId: transferId,
                                fromUsername: transfer.fromUsername,
                                amount: transfer.amount,
                                note: transfer.note,
                                createdAt: transfer.createdAt,
                                expiresAt: transfer.expiresAt,
                                remainingSeconds: Math.floor((transfer.expiresAt - now) / 1000)
                            });
                        }
                    }
                }

                jsonResponse(res, 200, {
                    code: 0,
                    msg: '获取成功',
                    data: {
                        username: username,
                        pending: pendingList,
                        total: pendingList.length
                    }
                });
            } catch (e) {
                logger.error('获取待确认转账异常:', e.message);
                jsonResponse(res, 500, { code: -1, msg: '获取失败: ' + e.message });
            }
            return;
        }

        // 确认或拒绝转账（网页版）
        if (pathname === '/api/points/transfer/confirm' && req.method === 'POST') {
            try {
                // 验证用户登录
                const token = req.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    jsonResponse(res, 401, { code: -1, msg: '未登录' });
                    return;
                }

                let decoded;
                try {
                    decoded = jwt.verify(token, JWT_SECRET);
                } catch (e) {
                    jsonResponse(res, 401, { code: -1, msg: '登录已过期，请重新登录' });
                    return;
                }

                const username = decoded.username;
                const data = await parseBody(req);
                const { transferId, action } = data; // action: 'agree' 或 'reject'

                // 验证参数
                if (!transferId) {
                    jsonResponse(res, 400, { code: -1, msg: '缺少转账编号' });
                    return;
                }

                if (!action || !['agree', 'reject'].includes(action)) {
                    jsonResponse(res, 400, { code: -1, msg: '无效的操作类型' });
                    return;
                }

                // 确保 pendingTransfers 存在
                if (!botData.pendingTransfers) {
                    botData.pendingTransfers = {};
                }

                const transfer = botData.pendingTransfers[transferId];

                if (!transfer) {
                    jsonResponse(res, 400, { code: -1, msg: '转账编号不存在或已过期' });
                    return;
                }

                // 检查是否是接收用户
                if (transfer.toUsername !== username) {
                    jsonResponse(res, 403, { code: -1, msg: '只有接收用户才能确认此转账' });
                    return;
                }

                // 检查是否过期
                if (Date.now() > transfer.expiresAt) {
                    delete botData.pendingTransfers[transferId];
                    writeBotData(botData);
                    jsonResponse(res, 400, { code: -1, msg: '转账已过期' });
                    return;
                }

                if (action === 'agree') {
                    // 同意转账
                    // 再次检查转出用户积分是否充足
                    pointsManager.ensureUser(transfer.fromUsername);
                    const fromUserPoints = pointsManager.getBalance(transfer.fromUsername);

                    if (fromUserPoints < transfer.amount) {
                        delete botData.pendingTransfers[transferId];
                        writeBotData(botData);
                        jsonResponse(res, 400, {
                            code: -1,
                            msg: '转出用户积分不足',
                            data: {
                                required: transfer.amount,
                                available: fromUserPoints
                            }
                        });
                        return;
                    }

                    // 执行转账
                    const result = pointsManager.transfer(
                        transfer.fromUsername,
                        transfer.toUsername,
                        transfer.amount,
                        transfer.note
                    );

                    if (result.success) {
                        // 删除待确认转账
                        delete botData.pendingTransfers[transferId];
                        writeBotData(botData);

                        logger.info(`💸 网页转账确认成功: ${transfer.fromUsername} -> ${transfer.toUsername}, 金额: ${transfer.amount}积分, 编号: ${transferId}`);

                        // 如果转出用户绑定了QQ，发送通知
                        const fromUserBinding = botData.bindings && botData.bindings[transfer.fromUsername];
                        const targetGroup = config.onebot?.target_group;
                        
                        if (fromUserBinding && fromUserBinding.qqNumber && targetGroup) {
                            const fromMsg = `[CQ:at,qq=${fromUserBinding.qqNumber}] ✅ 转账成功！\n` +
                                          `━━━━━━━━━━━━━━\n` +
                                          `接收用户: ${transfer.toUsername}\n` +
                                          `转账金额: ${transfer.amount} 积分\n` +
                                          (transfer.note ? `备注: ${transfer.note}\n` : '') +
                                          `━━━━━━━━━━━━━━\n` +
                                          `您的余额: ${result.data.fromBalance} 积分`;
                            logger.info(`📢 发送QQ通知给 ${transfer.fromUsername} (QQ: ${fromUserBinding.qqNumber})`);
                            sendGroupMessage(targetGroup, fromMsg);
                        }

                        jsonResponse(res, 200, {
                            code: 0,
                            msg: '转账成功',
                            data: result.data
                        });
                    } else {
                        jsonResponse(res, 400, {
                            code: -1,
                            msg: result.error
                        });
                    }
                } else if (action === 'reject') {
                    // 拒绝转账
                    delete botData.pendingTransfers[transferId];
                    writeBotData(botData);

                    logger.info(`💸 网页转账被拒绝: ${transfer.fromUsername} -> ${transfer.toUsername}, 金额: ${transfer.amount}积分, 编号: ${transferId}`);

                    // 如果转出用户绑定了QQ，发送通知
                    const fromUserBinding = botData.bindings && botData.bindings[transfer.fromUsername];
                    const targetGroup = config.onebot?.target_group;
                    
                    if (fromUserBinding && fromUserBinding.qqNumber && targetGroup) {
                        const fromMsg = `[CQ:at,qq=${fromUserBinding.qqNumber}] ❌ 转账被拒绝\n` +
                                      `━━━━━━━━━━━━━━\n` +
                                      `接收用户: ${transfer.toUsername}\n` +
                                      `转账金额: ${transfer.amount} 积分`;
                        logger.info(`📢 发送QQ通知给 ${transfer.fromUsername} (QQ: ${fromUserBinding.qqNumber})`);
                        sendGroupMessage(targetGroup, fromMsg);
                    }

                    jsonResponse(res, 200, {
                        code: 0,
                        msg: '已拒绝转账',
                        data: {
                            transferId: transferId,
                            fromUsername: transfer.fromUsername,
                            amount: transfer.amount
                        }
                    });
                }
            } catch (e) {
                logger.error('确认转账异常:', e.message);
                jsonResponse(res, 500, { code: -1, msg: '操作失败: ' + e.message });
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
                const nodeMappings = config.nodeMappings || {};

                const serverStatus = remotes.map(remote => {
                    const system = remote.system || {};
                    const ip = remote.ip || '未知';
                    const mappedName = nodeMappings[ip];

                    return {
                        name: mappedName || remote.remarks || remote.uuid,
                        node: ip,
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
                    localPoints[username].totalPoints = round(localPoints[username].totalPoints + requiredPoints);
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

        // 删除实例预览（计算预计退款，不包含续费天数）
        if (pathname === '/api/instance/delete-preview' && req.method === 'GET') {
            const daemonId = query.daemonId;
            const uuid = query.uuid;

            if (!daemonId || !uuid) {
                jsonResponse(res, 400, { status: 'error', error: '缺少 daemonId 或 uuid 参数' });
                return;
            }

            try {
                // 1. 获取实例配置
                const instanceResult = await mcsmApi.getInstance(daemonId, uuid);
                
                if (instanceResult.data.status !== 200) {
                    jsonResponse(res, 404, { status: 'error', error: '实例未找到' });
                    return;
                }

                const instanceConfig = instanceResult.data.data?.config || {};
                const dockerConfig = instanceConfig.docker || {};
                
                // 2. 计算实例配置的价值（不包含续费天数，duration设为0）
                const configValue = {
                    memory: (dockerConfig.memory || 1024) / 1024, // MB → GB
                    cpu: (dockerConfig.cpuUsage || 100) / 100, // 百分比 → 核心数
                    disk: dockerConfig.maxSpace || 10, // GB
                    ports: [...new Set((dockerConfig.ports || []).map(p => p.split(':')[0]))].join(','),
                    duration: 0 // 不包含续费天数
                };
                
                const configPrice = calculateCustomPlanPrice(configValue);
                
                // 3. 计算退款金额（扣除10%手续费）
                const refundAmount = round(configPrice * REFUND_RATE);
                
                jsonResponse(res, 200, {
                    status: 'success',
                    data: {
                        configPrice: configPrice,
                        refundAmount: refundAmount,
                        feeRate: round(1 - REFUND_RATE),
                        instanceName: instanceConfig.nickname || '未命名'
                    }
                });
            } catch (e) {
                logger.error('获取删除预览失败:', e);
                jsonResponse(res, 500, { status: 'error', error: '获取删除预览失败: ' + e.message });
            }
            return;
        }

        // 删除实例
        if (pathname === '/api/instance' && req.method === 'DELETE') {
            const daemonId = query.daemonId;

            if (!daemonId) {
                jsonResponse(res, 400, { status: 'error', error: '缺少 daemonId 参数' });
                return;
            }

            try {
                const data = await parseBody(req);
                const { uuids } = data;

                if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
                    jsonResponse(res, 400, { status: 'error', error: '缺少 uuids 参数或格式错误' });
                    return;
                }

                console.log(`[DELETE_INSTANCE] 开始删除实例:`, { daemonId, uuids });

                // 在删除前，先获取实例配置并计算退款
                let totalRefund = 0;
                let refundDetails = [];
                
                for (const uuid of uuids) {
                    try {
                        // 1. 获取实例配置
                        const instanceResult = await mcsmApi.getInstance(daemonId, uuid);
                        if (instanceResult.data.status === 200) {
                            const instanceConfig = instanceResult.data.data?.config || {};
                            const dockerConfig = instanceConfig.docker || {};
                            
                            // 2. 查找实例所有者
                            const ownerUsername = await findOwnerByInstanceUuid(uuid);
                            
                            if (ownerUsername) {
                                // 3. 计算实例配置的价值（不包含续费天数）
                                const configValue = {
                                    memory: (dockerConfig.memory || 1024) / 1024, // MB → GB
                                    cpu: (dockerConfig.cpuUsage || 100) / 100, // 百分比 → 核心数
                                    disk: dockerConfig.maxSpace || 10, // GB
                                    ports: [...new Set((dockerConfig.ports || []).map(p => p.split(':')[0]))].join(','),
                                    duration: 0 // 不包含续费天数
                                };
                                
                                const configPrice = calculateCustomPlanPrice(configValue);
                                
                                // 4. 计算退款金额（扣除10%手续费）
                                const refundAmount = round(configPrice * REFUND_RATE);
                                
                                if (refundAmount > 0) {
                                    // 5. 返还积分
                                    pointsManager.ensureUser(ownerUsername);
                                    const previousPoints = pointsManager.getBalance(ownerUsername);
                                    localPoints[ownerUsername].totalPoints = round(previousPoints + refundAmount);
                                    
                                    if (!localPoints[ownerUsername].deductHistory) {
                                        localPoints[ownerUsername].deductHistory = [];
                                    }
                                    localPoints[ownerUsername].deductHistory.push({
                                        points: -refundAmount, // 负数表示增加
                                        reason: `删除实例退款 (10%手续费) ${uuid.substring(0, 8)}`,
                                        time: new Date().toISOString(),
                                        previousPoints: previousPoints,
                                        afterPoints: localPoints[ownerUsername].totalPoints,
                                        type: 'instance_delete_refund'
                                    });
                                    
                                    totalRefund += refundAmount;
                                    refundDetails.push({
                                        uuid: uuid,
                                        owner: ownerUsername,
                                        configPrice: configPrice,
                                        refundAmount: refundAmount
                                    });
                                    
                                    logger.info(`✓ 删除实例 ${uuid.substring(0, 8)}，返还 ${refundAmount} 积分给用户 ${ownerUsername}`);
                                }
                            } else {
                                logger.warn(`⚠️ 无法找到实例 ${uuid} 的所有者，跳过退款`);
                            }
                        }
                    } catch (error) {
                        logger.error(`计算实例 ${uuid} 退款时出错:`, error.message);
                        // 继续处理其他实例
                    }
                }
                
                // 保存积分数据
                if (totalRefund > 0) {
                    savePoints();
                }

                // 调用 MCSManager API 删除实例（强制删除文件）
                const result = await mcsmApi.deleteInstance(daemonId, uuids, true);

                console.log(`[DELETE_INSTANCE] API 响应:`, JSON.stringify(result, null, 2));

                // 检查响应结构
                if (result && result.data) {
                    if (result.data.status === 200) {
                        console.log(`✓ 成功删除实例:`, uuids);
                        jsonResponse(res, 200, {
                            status: 200,
                            data: result.data.data || uuids,
                            refund: {
                                total: totalRefund,
                                details: refundDetails
                            },
                            time: Date.now()
                        });
                    } else {
                        console.error('删除实例失败 - API 返回非 200 状态:', result.data);
                        
                        // 删除失败，回滚积分
                        if (totalRefund > 0) {
                            for (const detail of refundDetails) {
                                pointsManager.ensureUser(detail.owner);
                                const previousPoints = pointsManager.getBalance(detail.owner);
                                localPoints[detail.owner].totalPoints = round(previousPoints - detail.refundAmount);
                                
                                if (!localPoints[detail.owner].deductHistory) {
                                    localPoints[detail.owner].deductHistory = [];
                                }
                                localPoints[detail.owner].deductHistory.push({
                                    points: detail.refundAmount, // 正数表示扣除
                                    reason: `删除实例失败回滚 ${detail.uuid.substring(0, 8)}`,
                                    time: new Date().toISOString(),
                                    previousPoints: previousPoints,
                                    afterPoints: localPoints[detail.owner].totalPoints,
                                    type: 'refund_rollback'
                                });
                            }
                            savePoints();
                            logger.warn('删除实例失败，已回滚积分');
                        }
                        
                        jsonResponse(res, 500, {
                            status: 'error',
                            error: '删除实例失败',
                            details: result.data.data || result.data.message || '未知错误'
                        });
                    }
                } else {
                    console.error('删除实例失败 - 响应格式异常:', result);
                    
                    // 删除失败，回滚积分
                    if (totalRefund > 0) {
                        for (const detail of refundDetails) {
                            pointsManager.ensureUser(detail.owner);
                            const previousPoints = pointsManager.getBalance(detail.owner);
                            localPoints[detail.owner].totalPoints = round(previousPoints - detail.refundAmount);
                            
                            if (!localPoints[detail.owner].deductHistory) {
                                localPoints[detail.owner].deductHistory = [];
                            }
                            localPoints[detail.owner].deductHistory.push({
                                points: detail.refundAmount,
                                reason: `删除实例失败回滚 ${detail.uuid.substring(0, 8)}`,
                                time: new Date().toISOString(),
                                previousPoints: previousPoints,
                                afterPoints: localPoints[detail.owner].totalPoints,
                                type: 'refund_rollback'
                            });
                        }
                        savePoints();
                        logger.warn('删除实例失败，已回滚积分');
                    }
                    
                    jsonResponse(res, 500, {
                        status: 'error',
                        error: '删除实例失败',
                        details: '服务器响应格式异常'
                    });
                }
            } catch (e) {
                console.error('删除实例异常:', e);
                jsonResponse(res, 500, { status: 'error', error: '删除实例失败: ' + e.message });
            }
            return;
        }

        // 新：计算实例配置价格
        if (pathname === '/api/instance/calculate-price' && req.method === 'POST') {
            try {
                const customConfig = await parseBody(req);

                if (!customConfig || typeof customConfig !== 'object' || Object.keys(customConfig).length === 0) {
                    jsonResponse(res, 400, { status: 'error', error: '无效的配置数据' });
                    return;
                }

                // 调用现有的价格计算函数
                const price = calculateCustomPlanPrice(customConfig);

                jsonResponse(res, 200, {
                    status: 'success',
                    data: {
                        price: price
                    }
                });

            } catch (e) {
                jsonResponse(res, 500, { status: 'error', error: '计算价格失败: ' + e.message });
            }
            return;
        }

        // 新：预计算实例更新的积分变化
        if (pathname === '/api/instance/pre-update' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { daemonId, uuid, memory, cpu, disk, ports } = data;
                console.log(`[预更新] 收到实例 ${uuid} 的请求数据:`, data);

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

                // 2. 查找所有者 (强制通过 API 查找，以确保数据最新)
                const ownerUsername = await findOwnerByInstanceUuid(uuid);

                if (!ownerUsername) {
                    jsonResponse(res, 404, { status: 'error', error: '未能确定实例所有者，无法计算积分' });
                    return;
                }
                
                const username = ownerUsername;
                const currentUserPoints = pointsManager.getBalance(username);

                // 3. 计算积分变化
                const beforeDockerConfig = currentConfig.docker || {};
                const beforeCpuCores = (beforeDockerConfig.cpuUsage || 100) / 100;
                const beforeDiskGB = beforeDockerConfig.maxSpace || 10; // API returns GB，不需要除以1024
                const beforePorts = [...new Set((beforeDockerConfig.ports || []).map(p => p.split(':')[0]))].join(',');
                
                const beforeConfigForCalc = {
                    memory: (beforeDockerConfig.memory || 1024) / 1024, // API returns MB, 转换为 GB
                    cpu: beforeCpuCores,
                    disk: beforeDiskGB,
                    ports: beforePorts
                };
                console.log('[预更新] 正在计算“更新前”积分，配置为:', beforeConfigForCalc);
                const beforePoints = calculateCustomPlanPrice(beforeConfigForCalc);

                const newMemory = memory ? memory / 1024 : (beforeDockerConfig.memory || 1024) / 1024; // 前端传入MB，转换为GB
                const newCpu = cpu || beforeCpuCores;
                const newDisk = disk || beforeDiskGB;
                const newPorts = ports || beforePorts;

                const afterConfigForCalc = {
                    memory: newMemory,
                    cpu: newCpu,
                    disk: newDisk,
                    ports: newPorts
                };
                console.log('[预更新] 正在计算“更新后”积分，配置为:', afterConfigForCalc);
                const afterPoints = calculateCustomPlanPrice(afterConfigForCalc);

                const priceDifference = round(afterPoints - beforePoints);
                console.log(`[预更新] 计算结果: 更新前积分=${beforePoints}, 更新后积分=${afterPoints}, 积分差异=${priceDifference}`);
                let cost = 0;
                let refund = 0;
                let action = 'none';

                if (priceDifference > 0) { // 升级
                    cost = priceDifference;
                    action = 'upgrade';
                } else if (priceDifference < 0) { // 降级
                    refund = round(Math.abs(priceDifference) * REFUND_RATE);
                    action = 'downgrade';
                }

                const responseData = {
                    code: 0,
                    msg: 'success',
                    data: {
                        action: action,
                        cost: cost,
                        refund: refund,
                        pointDifference: priceDifference, // 原始价格差异
                        currentUserPoints: currentUserPoints,
                        isSufficient: currentUserPoints >= cost,
                        owner: username,
                        oldPrice: beforePoints,
                        newPrice: afterPoints
                    }
                };
                console.log('[预更新] 发送响应数据:', responseData.data);
                jsonResponse(res, 200, responseData);
                return; // 确保请求在此处终止

            } catch (e) {
                jsonResponse(res, 500, { code: -1, msg: '预计算失败: ' + e.message });
                return; // 确保请求在此处终止
            }
        }

        // 新：原子化更新实例配置并处理积分 (V2 - 一次性收费)
        if (pathname === '/api/instance/configure' && req.method === 'POST') {
            try {
                const { daemonId, uuid, username, memory, cpu, disk, ports } = await parseBody(req);

                let processedPorts = ports;
                if (typeof ports === 'string') {
                    processedPorts = ports.split(',').map(p => p.trim()).filter(Boolean);
                }

                // 1. 验证输入
                if (!daemonId || !uuid || !username) {
                    return jsonResponse(res, 400, { code: -1, msg: '缺少必要参数: daemonId, uuid, username' });
                }
                
                // 验证CPU核心数范围（1-100）
                if (cpu !== undefined && cpu !== null) {
                    const cpuNum = parseFloat(cpu);
                    if (isNaN(cpuNum) || cpuNum <= 0 || cpuNum > 100) {
                        return jsonResponse(res, 400, { code: -1, msg: 'CPU核心数无效，必须是 1-100 之间的数字' });
                    }
                }
                
                // 验证内存范围
                if (memory !== undefined && memory !== null) {
                    const memoryNum = parseInt(memory);
                    if (isNaN(memoryNum) || memoryNum < 512) {
                        return jsonResponse(res, 400, { code: -1, msg: '内存大小无效，必须是大于等于 512 MB 的数字' });
                    }
                }
                
                // 验证磁盘空间
                if (disk !== undefined && disk !== null) {
                    const diskNum = parseFloat(disk);
                    if (isNaN(diskNum) || diskNum <= 0 || diskNum > 100 || !Number.isInteger(diskNum)) {
                        return jsonResponse(res, 400, { code: -1, msg: '磁盘空间无效，必须是 1-100 GB 之间的整数' });
                    }
                }

                // 2. 获取当前实例详情
                const instanceResult = await mcsmApi.getInstance(daemonId, uuid);
                if (instanceResult.data.status !== 200) {
                    return jsonResponse(res, 404, { code: -1, msg: '实例未找到或无法获取当前配置' });
                }
                const currentDockerConfig = instanceResult.data.data?.config?.docker || {};

                // 3. 计算旧配置的“价值”
                const oldConfig = {
                    memory: (currentDockerConfig.memory || 1024) / 1024, // API returns MB, 转换为 GB
                    cpu: (currentDockerConfig.cpuUsage || 100) / 100, // 转换为核心数
                    disk: currentDockerConfig.maxSpace || 10, // API returns GB
                    ports: [...new Set((currentDockerConfig.ports || []).map(p => p.split(':')[0]))].join(',')
                };
                const oldPrice = calculateCustomPlanPrice(oldConfig);

                // 4. 计算新配置的“价值”
                const newConfigForCalc = {
                    memory: memory ? memory / 1024 : oldConfig.memory, // 前端传入的是 MB，转换为 GB
                    cpu: cpu || oldConfig.cpu,
                    disk: disk || oldConfig.disk, // 直接使用 GB 值
                    ports: processedPorts ? processedPorts.join(',') : oldConfig.ports
                };
                const newPrice = calculateCustomPlanPrice(newConfigForCalc);

                // 5. 计算价格差异并处理积分
                const priceDifference = round(newPrice - oldPrice);
                let pointsChange = 0; // 记录实际的积分变动 (正数表示扣除，负数表示增加)

                // 只有当价格有实际变化时才进行积分操作
                if (priceDifference !== 0) {
                    if (priceDifference > 0) { // 升级
                        const cost = priceDifference;
                        pointsChange = cost; // 扣除 cost 积分
                        const deductResult = pointsManager.deductPoints(username, cost, `升级实例配置 ${uuid.substring(0, 8)}`);
                        if (!deductResult.success) {
                            return jsonResponse(res, 400, { code: -1, msg: '积分不足以升级', data: { required: cost, balance: deductResult.balance } });
                        }
                    } else if (priceDifference < 0) { // 降级
                        const refundAmount = round(Math.abs(priceDifference) * REFUND_RATE);
                        pointsChange = -refundAmount; // 增加 refundAmount 积分
                        pointsManager.ensureUser(username);
                        const previousPoints = pointsManager.getBalance(username);
                        localPoints[username].totalPoints = round(previousPoints + refundAmount);
                        if (!localPoints[username].deductHistory) localPoints[username].deductHistory = [];
                        localPoints[username].deductHistory.push({
                            points: -refundAmount, // 负数表示增加
                            reason: `降级实例配置退款 (10%手续费) ${uuid.substring(0, 8)}`,
                            time: new Date().toISOString(),
                            previousPoints: previousPoints,
                            afterPoints: localPoints[username].totalPoints,
                            type: 'config_downgrade'
                        });
                        savePoints();
                    }
                }

                // 6. 准备 MCSManager API 的更新负载
                const updatePayload = { docker: {} };
                if (memory) updatePayload.docker.memory = memory; // Send MB to API
                if (cpu) updatePayload.docker.cpuUsage = cpu * 100; // 核心数转百分比
                if (disk) updatePayload.docker.maxSpace = disk; // Send GB to API
                if (processedPorts && Array.isArray(processedPorts)) {
                    const newApiPorts = [];
                    for (const portStr of processedPorts) {
                        const port = parseInt(portStr);
                        if (!isNaN(port) && port > 0 && port < 65536) {
                            newApiPorts.push(`${port}:${port}/tcp`);
                            newApiPorts.push(`${port}:${port}/udp`);
                        }
                    }
                    updatePayload.docker.ports = newApiPorts;
                }

                // 7. 调用 MCSManager 更新实例
                const updateResult = await mcsmApi.updateInstance(daemonId, uuid, updatePayload);

                // 8. 处理更新结果
                if (updateResult.data.status === 200) {
                    // 更新成功
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: '配置更新成功',
                        data: {
                            pointsChange: pointsChange, // 返回实际的积分变动
                            newBalance: pointsManager.getBalance(username)
                        }
                    });
                } else {
                    // 更新失败，回滚积分
                    if (pointsChange !== 0) {
                        pointsManager.ensureUser(username);
                        const previousPoints = pointsManager.getBalance(username);
                        // 回滚操作与原操作相反
                        localPoints[username].totalPoints = round(previousPoints + pointsChange); // 如果是扣除，则加回来；如果是增加，则减回去
                        if (!localPoints[username].deductHistory) localPoints[username].deductHistory = [];
                        localPoints[username].deductHistory.push({
                            points: -pointsChange, // 记录回滚操作
                            reason: `配置更新失败回滚 (实例: ${uuid.substring(0, 8)})`,
                            time: new Date().toISOString(),
                            previousPoints: previousPoints,
                            afterPoints: localPoints[username].totalPoints,
                            type: 'refund_rollback'
                        });
                        savePoints();
                        console.error(`[CRITICAL] MCSManager 更新失败，已为用户 ${username} 回滚积分变动 ${pointsChange}。`);
                    }
                    
                    jsonResponse(res, 500, {
                        code: -1,
                        msg: '实例配置更新失败，积分已回滚',
                        details: updateResult.data
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

                // --- 积分变动逻辑 (V2 - 增强日志和健壮性) ---
                console.log(`[CONFIG_UPDATE_V2] Initiating points logic for instance ${uuid}.`);
                
                // 步骤 1: 强制通过 API 查找所有者，杜绝缓存问题
                console.log(`[CONFIG_UPDATE_V2] Step 1: Forcing owner lookup via API for instance ${uuid}.`);
                const ownerUsername = await findOwnerByInstanceUuid(uuid);
                
                if (!ownerUsername) {
                    // 如果找不到所有者，记录警告并跳过积分逻辑，但允许配置更改继续
                    console.warn(`[CONFIG_UPDATE_V2] ⚠️ CRITICAL: Could not determine owner for instance ${uuid}. Skipping all point calculations. The configuration update will still proceed.`);
                } else {
                    const username = ownerUsername;
                    console.log(`[CONFIG_UPDATE_V2] Step 2: Owner identified as "${username}". All subsequent point operations will target this user.`);
                    
                    // 步骤 3: 计算当前配置和新配置的积分
                    const beforeDockerConfig = currentConfig.docker || {};
                    const beforeCpuCores = (beforeDockerConfig.cpuUsage || 100) / 100;
                    const beforeDiskGB = beforeDockerConfig.maxSpace || 10; // API returns GB
                    const beforePorts = [...new Set((beforeDockerConfig.ports || []).map(p => p.split(':')[0]))].join(',');
                    
                    const beforePointsConfig = { memory: beforeDockerConfig.memory || 1024, cpu: beforeCpuCores, disk: beforeDiskGB, ports: beforePorts }; // API returns MB for memory
                    const beforePoints = calculateCustomPlanPrice(beforePointsConfig);
                    console.log(`[CONFIG_UPDATE_V2] Step 3a: "Before" config points calculated: ${beforePoints}. Details: ${JSON.stringify(beforePointsConfig)}`);

                    const newMemory = memory ? (parseInt(memory) || beforeDockerConfig.memory) : beforeDockerConfig.memory; // MB
                    const newPorts = (ports && Array.isArray(ports)) ? ports.join(',') : beforePorts;

                    const afterPointsConfig = { memory: newMemory, cpu: beforeCpuCores, disk: beforeDiskGB, ports: newPorts }; // MB for memory, GB for disk
                    const afterPoints = calculateCustomPlanPrice(afterPointsConfig);
                    console.log(`[CONFIG_UPDATE_V2] Step 3b: "After" config points calculated: ${afterPoints}. Details: ${JSON.stringify(afterPointsConfig)}`);

                    // 步骤 4: 如果积分有变化，处理扣款或退款
                    if (afterPoints.toFixed(2) !== beforePoints.toFixed(2)) {
                        const pointDifference = round(beforePoints - afterPoints);
                        console.log(`[CONFIG_UPDATE_V2] Step 4: Point difference is ${pointDifference}.`);

                        if (pointDifference > 0) { // 降级，退款
                            const refundAmount = Math.floor(pointDifference * REFUND_RATE);
                            console.log(`[CONFIG_UPDATE_V2] Action: Downgrade. Attempting to refund ${refundAmount} points to user "${username}".`);
                            if (refundAmount > 0) {
                                pointsManager.ensureUser(username);
                                const previousPoints = pointsManager.getBalance(username);
                                localPoints[username].totalPoints = round(previousPoints + refundAmount);
                                
                                if (!localPoints[username].deductHistory) localPoints[username].deductHistory = [];
                                localPoints[username].deductHistory.push({
                                    points: -refundAmount,
                                    reason: `降级配置退款 (实例: ${uuid.substring(0, 8)})`,
                                    time: new Date().toISOString(),
                                    previousPoints: previousPoints,
                                    afterPoints: localPoints[username].totalPoints,
                                    type: 'config_downgrade'
                                });
                                savePoints();
                                console.log(`[CONFIG_UPDATE_V2] ✅ SUCCESS: Refunded ${refundAmount} points to "${username}". New balance: ${localPoints[username].totalPoints}.`);
                            }
                        } else { // 升级，扣款
                            const cost = Math.ceil(Math.abs(pointDifference));
                            console.log(`[CONFIG_UPDATE_V2] Action: Upgrade. Attempting to deduct ${cost} points from user "${username}".`);
                            const deductResult = pointsManager.deductPoints(username, cost, `升级配置 (实例: ${uuid.substring(0, 8)})`);
                            if (!deductResult.success) {
                                console.error(`[CONFIG_UPDATE_V2] ❌ FAILURE: Point deduction failed for "${username}". Reason: ${deductResult.error}. Halting operation.`);
                                jsonResponse(res, 400, { status: 'error', error: `积分不足以升级配置。需要 ${cost} 积分，当前拥有 ${deductResult.balance} 积分。` });
                                return; // 终止操作
                            }
                            console.log(`[CONFIG_UPDATE_V2] ✅ SUCCESS: Deducted ${cost} points from "${username}". New balance: ${deductResult.balance}.`);
                        }
                    } else {
                        console.log(`[CONFIG_UPDATE_V2] Step 4: No point difference detected. No transaction needed.`);
                    }
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
            // 速率限制：每分钟最多5次登录尝试
            const clientIp = getClientIp(req);
            if (!checkRateLimit(clientIp, 5, 60000)) {
                jsonResponse(res, 429, { status: 'error', error: '登录尝试过于频繁，请稍后再试' });
                return;
            }

            try {
                const data = await parseBody(req);
                const { username, password, captchaText, captchaId } = data; // 添加 captchaText 和 captchaId

                if (!username || !password || !captchaText || !captchaId) {
                    jsonResponse(res, 400, { status: 'error', error: '请输入用户名、密码和验证码' });
                    return;
                }

                // 验证码校验
                const storedCaptcha = captchaStore[captchaId];
                if (!storedCaptcha) {
                    jsonResponse(res, 400, { status: 'error', error: '验证码已过期或不存在' });
                    return;
                }

                // 检查验证码是否过期
                if (Date.now() > storedCaptcha.expiresAt) {
                    delete captchaStore[captchaId];
                    jsonResponse(res, 400, { status: 'error', error: '验证码已过期' });
                    return;
                }

                // 比较验证码文本 (不区分大小写)
                if (storedCaptcha.text !== captchaText.toLowerCase()) {
                    delete captchaStore[captchaId]; // 无论成功失败都删除，防止重放
                    jsonResponse(res, 400, { status: 'error', error: '验证码不正确' });
                    return;
                }
                
                delete captchaStore[captchaId]; // 验证成功后删除

                if (!username || !password) {
                    jsonResponse(res, 400, { status: 'error', error: '请输入用户名和密码' });
                    return;
                }

                const authMethod = config.auth?.method || 'local';
                let loginSuccess = false;
                let userForToken = null;

                if (authMethod === 'mcsm_bcrypt') {
                    // --- MCSM Bcrypt Authentication from local files ---
                    console.log(`[Auth] Attempting login for user "${username}" via local mcsm_bcrypt.`);
                    const userDataPath = config.mcsm?.userDataPath;

                    if (!userDataPath || !fs.existsSync(userDataPath)) {
                        console.error(`[Auth] mcsm.userDataPath is not configured or does not exist: ${userDataPath}`);
                    } else {
                        try {
                            const userFiles = fs.readdirSync(userDataPath).filter(file => file.endsWith('.json'));
                            let foundUser = null;

                            for (const userFile of userFiles) {
                                try {
                                    const filePath = path.join(userDataPath, userFile);
                                    const userData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                                    if (userData.userName === username) {
                                        foundUser = userData;
                                        break;
                                    }
                                } catch (e) {
                                    // Ignore files that can't be parsed
                                }
                            }

                            if (foundUser && foundUser.passWord) {
                                console.log(`[Auth] Found user "${username}" in local MCSM files.`);
                                const passwordHash = foundUser.passWord.trim();
                                const match = await bcrypt.compare(password, passwordHash);

                                if (match) {
                                    console.log(`[Auth] Password for "${username}" matches.`);
                                    loginSuccess = true;
                                    userForToken = {
                                        id: foundUser.uuid,
                                        username: foundUser.userName,
                                        role: 'user'
                                    };
                                } else {
                                    console.log(`[Auth] Password mismatch for user "${username}".`);
                                }
                            } else {
                                console.log(`[Auth] User "${username}" not found or has no password in local MCSM files.`);
                            }
                        } catch (e) {
                            console.error(`[Auth] Error reading MCSM user directory:`, e.message);
                        }
                    }
                } else {
                    // --- Local Authentication ---
                    const user = userManager.findByUsername(username);
                    if (user) {
                        // 使用 bcrypt 验证密码
                        const passwordMatch = await userManager.verifyPassword(username, password);
                        if (passwordMatch) {
                            loginSuccess = true;
                            userForToken = {
                                id: user.id,
                                username: user.username,
                                role: 'user'
                            };
                        } else {
                            logger.debug(`[Auth] 本地用户 "${username}" 密码不匹配`);
                        }
                    } else {
                        logger.debug(`[Auth] 本地用户 "${username}" 不存在`);
                    }
                }

                if (loginSuccess) {
                    // 检查用户是否被封禁
                    let existingUser = userManager.findByUsername(username);
                    if (existingUser && existingUser.status === 'banned') {
                        console.log(`✗ 用户 ${username} 已被封禁，拒绝登录`);
                        jsonResponse(res, 403, { status: 'error', error: '该账号已被封禁，无法登录' });
                        return;
                    }
                    
                    // 登录成功，生成并返回 JWT
                    const payload = {
                        id: userForToken.id,
                        username: userForToken.username,
                        role: userForToken.role
                    };
                    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
                    
                    console.log(`✓ 用户 ${username} 登录成功`);

                    // 如果是 mcsm_bcrypt 模式，确保用户在本地系统中有记录
                    if (authMethod === 'mcsm_bcrypt') {
                        // 确保该用户在积分系统中有记录
                        pointsManager.ensureUser(username);
                        
                        // 确保该用户在用户管理系统中有记录
                        let localUser = userManager.findByUsername(username);
                        if (!localUser) {
                            console.log(`[Auth] 首次登录，为用户 "${username}" 创建本地记录`);
                            // 创建用户记录，密码字段留空（因为使用 MCSM 验证）
                            const newUser = {
                                id: userForToken.id, // 使用 MCSM 的 UUID
                                username: username,
                                password: '', // MCSM 模式下密码由 MCSM 管理
                                email: '',
                                createdAt: new Date().toISOString(),
                                status: 'active',
                                authMethod: 'mcsm_bcrypt' // 标记认证方式
                            };
                            localUsers.push(newUser);
                            saveUsers();
                            console.log(`✓ 用户 "${username}" 的本地记录已创建`);
                        }
                        
                        jsonResponse(res, 200, {
                            status: 'success',
                            data: {
                                id: userForToken.id,
                                username: userForToken.username,
                                token: token
                            }
                        });
                        return;
                    }

                    // 对于 'local' 模式，保留原有逻辑
                    let localUser = userManager.findByUsername(username);
                    if (!localUser) {
                        // This case should ideally not happen for 'local' auth, but as a fallback
                        userManager.register(username, '__should_not_happen__');
                        localUser = userManager.findByUsername(username);
                    }
                    
                    const { password: _, ...safeUser } = localUser;
                    safeUser.token = token; // 将 token 添加到返回数据中

                    jsonResponse(res, 200, { status: 'success', data: safeUser });
                    return;
                }
                
                // 如果登录失败
                console.log(`✗ 用户 ${username} 登录失败`);
                jsonResponse(res, 401, { status: 'error', error: '用户名或密码错误' });

            } catch (e) {
                console.error('登录异常:', e);
                jsonResponse(res, 500, { status: 'error', error: '登录过程中发生服务器错误: ' + e.message });
            }
            return;
        }

        // 发送邮箱验证码
        if (pathname === '/api/users/send-email-code' && req.method === 'POST') {
            const clientIp = getClientIp(req);
            
            // 速率限制：每分钟最多3次
            if (!checkRateLimit(clientIp, 3, 60000)) {
                jsonResponse(res, 429, { status: 'error', error: '请求过于频繁，请稍后再试' });
                return;
            }

            try {
                const data = await parseBody(req);
                const { email, username } = data;

                if (!email || !username) {
                    jsonResponse(res, 400, { status: 'error', error: '请提供邮箱和用户名' });
                    return;
                }

                // 验证邮箱格式
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    jsonResponse(res, 400, { status: 'error', error: '邮箱格式不正确' });
                    return;
                }

                // 验证用户名格式
                if (username.length < 3 || username.length > 8 || !/^[a-zA-Z0-9]+$/.test(username)) {
                    jsonResponse(res, 400, { status: 'error', error: '用户名格式不正确' });
                    return;
                }

                // 检查用户名是否已存在
                const existingUser = userManager.findByUsername(username);
                if (existingUser) {
                    jsonResponse(res, 400, { status: 'error', error: '用户名已被注册' });
                    return;
                }

                // 检查邮箱是否已被使用
                const existingEmail = localUsers.find(u => u.email === email);
                if (existingEmail) {
                    jsonResponse(res, 400, { status: 'error', error: '该邮箱已被注册' });
                    return;
                }

                // 检查邮件功能是否可用
                if (!emailTransporter) {
                    jsonResponse(res, 503, { status: 'error', error: '邮件服务暂时不可用，请联系管理员' });
                    return;
                }

                // 检查该邮箱是否在60秒内已发送过验证码
                const existingCode = emailCodeStore[email];
                if (existingCode) {
                    const timeSinceLastSend = Date.now() - (existingCode.expiresAt - (config.email?.codeExpireMinutes || 10) * 60 * 1000);
                    const cooldownTime = 60000; // 60秒冷却时间
                    
                    if (timeSinceLastSend < cooldownTime) {
                        const remainingSeconds = Math.ceil((cooldownTime - timeSinceLastSend) / 1000);
                        jsonResponse(res, 429, { 
                            status: 'error', 
                            error: `请等待 ${remainingSeconds} 秒后再试`,
                            remainingSeconds: remainingSeconds
                        });
                        return;
                    }
                }

                // 生成6位数字验证码
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const expireMinutes = config.email?.codeExpireMinutes || 10;
                const expiresAt = Date.now() + expireMinutes * 60 * 1000;

                // 存储验证码
                emailCodeStore[email] = {
                    code,
                    expiresAt,
                    username,
                    sentAt: Date.now() // 记录发送时间
                };

                // 发送邮件
                const mailOptions = {
                    from: config.email.from || config.email.auth.user,
                    to: email,
                    subject: '注册验证码',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                            <h2 style="color: #667eea; text-align: center;">欢迎注册</h2>
                            <p>您好，</p>
                            <p>您正在注册账号 <strong>${username}</strong>，您的验证码是：</p>
                            <div style="background-color: #f5f7fa; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
                                ${code}
                            </div>
                            <p style="color: #666;">验证码有效期为 <strong>${expireMinutes} 分钟</strong>，请尽快完成注册。</p>
                            <p style="color: #999; font-size: 12px; margin-top: 30px;">如果这不是您的操作，请忽略此邮件。</p>
                        </div>
                    `
                };

                await emailTransporter.sendMail(mailOptions);
                
                logger.info(`✓ 已向 ${email} 发送注册验证码`);
                jsonResponse(res, 200, { status: 'success', message: '验证码已发送' });

            } catch (e) {
                logger.error('发送邮箱验证码失败:', e);
                jsonResponse(res, 500, { status: 'error', error: '发送验证码失败: ' + e.message });
            }
            return;
        }

        // 用户注册
        if (pathname === '/api/users/register' && req.method === 'POST') {
            const clientIp = getClientIp(req);
            
            // 速率限制：每小时最多5次注册尝试
            if (!checkRateLimit(clientIp, 5, 3600000)) {
                jsonResponse(res, 429, { status: 'error', error: '注册尝试过于频繁，请稍后再试' });
                return;
            }

            try {
                const data = await parseBody(req);
                const { username, email, emailCode, password, captchaText, captchaId } = data;

                // 验证必填字段
                if (!username || !email || !emailCode || !password || !captchaText || !captchaId) {
                    jsonResponse(res, 400, { status: 'error', error: '请填写所有必填字段' });
                    return;
                }

                // 验证图形验证码
                const storedCaptcha = captchaStore[captchaId];
                if (!storedCaptcha) {
                    jsonResponse(res, 400, { status: 'error', error: '图形验证码已过期或不存在' });
                    return;
                }

                if (Date.now() > storedCaptcha.expiresAt) {
                    delete captchaStore[captchaId];
                    jsonResponse(res, 400, { status: 'error', error: '图形验证码已过期' });
                    return;
                }

                if (storedCaptcha.text !== captchaText.toLowerCase()) {
                    delete captchaStore[captchaId];
                    jsonResponse(res, 400, { status: 'error', error: '图形验证码不正确' });
                    return;
                }
                
                delete captchaStore[captchaId];

                // 验证用户名格式
                if (username.length < 3 || username.length > 8) {
                    jsonResponse(res, 400, { status: 'error', error: '用户名长度必须在3-8个字符之间' });
                    return;
                }

                if (!/^[a-zA-Z0-9]+$/.test(username)) {
                    jsonResponse(res, 400, { status: 'error', error: '用户名只能包含字母和数字' });
                    return;
                }

                // 验证密码强度
                if (password.length < 6) {
                    jsonResponse(res, 400, { status: 'error', error: '密码长度至少6个字符' });
                    return;
                }

                if (!/[A-Z]/.test(password)) {
                    jsonResponse(res, 400, { status: 'error', error: '密码必须包含至少一个大写字母' });
                    return;
                }

                if (!/[0-9]/.test(password)) {
                    jsonResponse(res, 400, { status: 'error', error: '密码必须包含至少一个数字' });
                    return;
                }

                // 验证邮箱格式
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    jsonResponse(res, 400, { status: 'error', error: '邮箱格式不正确' });
                    return;
                }

                // 检查用户名是否已存在
                const existingUser = userManager.findByUsername(username);
                if (existingUser) {
                    jsonResponse(res, 400, { status: 'error', error: '用户名已被注册' });
                    return;
                }

                // 检查邮箱是否已被使用
                const existingEmail = localUsers.find(u => u.email === email);
                if (existingEmail) {
                    jsonResponse(res, 400, { status: 'error', error: '该邮箱已被注册' });
                    return;
                }

                // 验证邮箱验证码
                const storedEmailCode = emailCodeStore[email];
                if (!storedEmailCode) {
                    jsonResponse(res, 400, { status: 'error', error: '邮箱验证码已过期或不存在' });
                    return;
                }

                if (Date.now() > storedEmailCode.expiresAt) {
                    delete emailCodeStore[email];
                    jsonResponse(res, 400, { status: 'error', error: '邮箱验证码已过期' });
                    return;
                }

                if (storedEmailCode.code !== emailCode) {
                    jsonResponse(res, 400, { status: 'error', error: '邮箱验证码不正确' });
                    return;
                }

                if (storedEmailCode.username !== username) {
                    jsonResponse(res, 400, { status: 'error', error: '用户名与验证码不匹配' });
                    return;
                }

                delete emailCodeStore[email];

                // 检查是否需要在 MCSManager 中创建用户
                const authMethod = config.auth?.method || 'local';
                
                if (authMethod === 'mcsm_bcrypt') {
                    // 在 MCSManager 中创建用户
                    try {
                        const createUserResponse = await mcsmApi.createUser(username, password);
                        
                        if (createUserResponse.data.status !== 200) {
                            logger.error('在 MCSManager 中创建用户失败:', createUserResponse.data);
                            jsonResponse(res, 500, { status: 'error', error: '创建用户失败，请联系管理员' });
                            return;
                        }

                        const mcsmUser = createUserResponse.data.data;
                        
                        // 在本地系统中创建用户记录
                        const newUser = {
                            id: mcsmUser.uuid,
                            username: username,
                            password: '', // MCSM 模式下密码由 MCSM 管理
                            email: email,
                            createdAt: new Date().toISOString(),
                            status: 'active',
                            authMethod: 'mcsm_bcrypt'
                        };
                        
                        localUsers.push(newUser);
                        saveUsers();
                        
                        // 初始化积分
                        pointsManager.ensureUser(username);
                        
                        logger.info(`✓ 用户 ${username} 注册成功（MCSM 模式）`);
                        jsonResponse(res, 200, { status: 'success', message: '注册成功' });
                        
                    } catch (e) {
                        logger.error('在 MCSManager 中创建用户异常:', e);
                        jsonResponse(res, 500, { status: 'error', error: '创建用户失败: ' + e.message });
                    }
                } else {
                    // 本地模式：直接创建用户
                    try {
                        // 使用 bcrypt 加密密码
                        const hashedPassword = await bcrypt.hash(password, 10);
                        
                        const newUser = {
                            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            username: username,
                            password: hashedPassword, // 存储加密后的密码
                            email: email,
                            createdAt: new Date().toISOString(),
                            status: 'active',
                            authMethod: 'local'
                        };
                        
                        localUsers.push(newUser);
                        saveUsers();
                        
                        // 初始化积分
                        pointsManager.ensureUser(username);
                        
                        logger.info(`✓ 用户 ${username} 注册成功（本地模式）`);
                        jsonResponse(res, 200, { status: 'success', message: '注册成功' });
                        
                    } catch (e) {
                        logger.error('本地模式创建用户异常:', e);
                        jsonResponse(res, 500, { status: 'error', error: '创建用户失败: ' + e.message });
                    }
                }

            } catch (e) {
                logger.error('注册异常:', e);
                jsonResponse(res, 500, { status: 'error', error: '注册过程中发生服务器错误: ' + e.message });
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

            const result = await validateMcsmUser(username);
            
            jsonResponse(res, 200, {
                code: result.valid ? 0 : -1,
                msg: result.message,
                data: {
                    valid: result.valid,
                    exists: result.exists,
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
            // 使用 authenticateToken 中间件来确保用户已登录
            return authenticateToken(req, res, async () => {
                // 强制使用已认证的用户名，忽略任何查询参数，防止数据泄露
                const username = req.user.username;

                if (!username) {
                    jsonResponse(res, 401, { code: -1, msg: '无法从令牌中识别用户' });
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
                                total: result.total,
                                stats: result.stats // 返回后端计算好的统计数据
                            }
                        });
                    } else {
                        jsonResponse(res, 200, {
                            code: -1,
                            msg: result.error || '获取实例列表失败',
                            data: {
                                directoryExists: result.directoryExists,
                                instances: [],
                                total: 0,
                                stats: { total: 0, expired: 0, expiring: 0 }
                            }
                        });
                    }
                } catch (e) {
                    console.error('获取用户实例失败:', e);
                    jsonResponse(res, 500, { code: -1, msg: '服务器错误: ' + e.message });
                }
            });
        }

        // 用户注册
        if (pathname === '/api/users/register' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username, password, email } = data;

                // 先验证用户名是否存在于 MCSManager
                const mcsmValidation = await validateMcsmUser(username);
                
                // 如果用户不存在，则不允许注册
                if (!mcsmValidation.valid) {
                    jsonResponse(res, 400, { 
                        status: 'error', 
                        error: mcsmValidation.message || '该用户名未在 MCSManager 中注册，请先在面板注册账号'
                    });
                    return;
                }

                // userManager.register 现在是异步的
                const result = await userManager.register(username, password, email);

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
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { status: 'error', error: '需要管理员权限' });
                return;
            }

            try {
                const data = await parseBody(req);
                console.log('[DELETE USER] 收到删除请求，数据:', data);
                const { id } = data;

                if (!id) {
                    console.log('[DELETE USER] 错误：缺少用户ID');
                    jsonResponse(res, 400, { status: 'error', error: '缺少用户ID' });
                    return;
                }

                console.log('[DELETE USER] 尝试删除用户，ID:', id);
                const result = userManager.deleteUser(id);

                if (result.success) {
                    console.log('[DELETE USER] 删除成功');
                    jsonResponse(res, 200, { status: 'success' });
                } else {
                    console.log('[DELETE USER] 删除失败:', result.error);
                    jsonResponse(res, 400, { status: 'error', error: result.error });
                }
            } catch (e) {
                console.error('[DELETE USER] 异常:', e);
                jsonResponse(res, 400, { status: 'error', error: '无效的请求数据: ' + e.message });
            }
            return;
        }

        // 封禁用户
        if (pathname === '/api/users/ban' && req.method === 'POST') {
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

            try {
                const data = await parseBody(req);
                const { username } = data;

                if (!username) {
                    jsonResponse(res, 400, { code: -1, msg: '缺少用户名' });
                    return;
                }

                const result = userManager.banUser(username);

                if (result.success) {
                    jsonResponse(res, 200, { code: 0, msg: '用户已封禁', data: result.user });
                } else {
                    jsonResponse(res, 400, { code: -1, msg: result.error });
                }
            } catch (e) {
                jsonResponse(res, 400, { code: -1, msg: '无效的请求数据' });
            }
            return;
        }

        // 管理员创建本地用户
        if (pathname === '/api/admin/users/create' && req.method === 'POST') {
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

            try {
                const data = await parseBody(req);
                const { username, password, email, initialPoints } = data;

                // 验证必填字段
                if (!username || !password) {
                    jsonResponse(res, 400, { code: -1, msg: '用户名和密码不能为空' });
                    return;
                }

                // 验证用户名格式
                if (username.length < 3 || username.length > 20) {
                    jsonResponse(res, 400, { code: -1, msg: '用户名长度必须在3-20个字符之间' });
                    return;
                }

                if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                    jsonResponse(res, 400, { code: -1, msg: '用户名只能包含字母、数字和下划线' });
                    return;
                }

                // 验证密码强度
                if (password.length < 6) {
                    jsonResponse(res, 400, { code: -1, msg: '密码长度至少6个字符' });
                    return;
                }

                // 验证邮箱格式（如果提供）
                if (email) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email)) {
                        jsonResponse(res, 400, { code: -1, msg: '邮箱格式不正确' });
                        return;
                    }
                }

                // 创建用户
                const result = await userManager.register(username, password, email || '');

                if (result.success) {
                    // 如果设置了初始积分，添加积分
                    if (initialPoints && initialPoints > 0) {
                        pointsManager.ensureUser(username);
                        pointsManager.addPoints(username, initialPoints, '管理员创建用户时赠送');
                    } else {
                        // 确保用户有积分记录
                        pointsManager.ensureUser(username);
                    }

                    logger.info(`✓ 管理员创建用户成功: ${username}${initialPoints ? ` (初始积分: ${initialPoints})` : ''}`);
                    
                    jsonResponse(res, 200, { 
                        code: 0, 
                        msg: '用户创建成功', 
                        data: { 
                            user: result.user,
                            initialPoints: initialPoints || 0
                        } 
                    });
                } else {
                    jsonResponse(res, 400, { code: -1, msg: result.error });
                }
            } catch (e) {
                logger.error('管理员创建用户失败:', e);
                jsonResponse(res, 500, { code: -1, msg: '创建用户失败: ' + e.message });
            }
            return;
        }

        // 获取 MCSM 用户列表
        if (pathname === '/api/admin/mcsm/users' && req.method === 'GET') {
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

            try {
                const userDataPath = config.mcsm?.userDataPath;

                if (!userDataPath || !fs.existsSync(userDataPath)) {
                    jsonResponse(res, 400, { 
                        code: -1, 
                        msg: 'MCSM 用户数据路径未配置或不存在',
                        data: { 
                            configured: !!userDataPath,
                            exists: userDataPath ? fs.existsSync(userDataPath) : false,
                            path: userDataPath || null
                        }
                    });
                    return;
                }

                const userFiles = fs.readdirSync(userDataPath).filter(file => file.endsWith('.json'));
                const mcsmUsers = [];
                const existingUsernames = localUsers.map(u => u.username);

                for (const userFile of userFiles) {
                    try {
                        const filePath = path.join(userDataPath, userFile);
                        const userData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                        
                        if (userData.userName && userData.uuid) {
                            mcsmUsers.push({
                                uuid: userData.uuid,
                                username: userData.userName,
                                email: userData.email || '',
                                registerTime: userData.registerTime || null,
                                loginTime: userData.loginTime || null,
                                permission: userData.permission || 1,
                                hasPassword: !!userData.passWord,
                                alreadyImported: existingUsernames.includes(userData.userName)
                            });
                        }
                    } catch (e) {
                        logger.warn(`无法解析 MCSM 用户文件 ${userFile}:`, e.message);
                    }
                }

                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: {
                        users: mcsmUsers,
                        total: mcsmUsers.length,
                        notImported: mcsmUsers.filter(u => !u.alreadyImported).length,
                        path: userDataPath
                    }
                });
            } catch (e) {
                logger.error('获取 MCSM 用户列表失败:', e);
                jsonResponse(res, 500, { code: -1, msg: '获取用户列表失败: ' + e.message });
            }
            return;
        }

        // 从 MCSM 导入用户
        if (pathname === '/api/admin/mcsm/import-user' && req.method === 'POST') {
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

            try {
                const data = await parseBody(req);
                const { uuid, initialPoints } = data;

                if (!uuid) {
                    jsonResponse(res, 400, { code: -1, msg: '缺少用户 UUID' });
                    return;
                }

                const userDataPath = config.mcsm?.userDataPath;

                if (!userDataPath || !fs.existsSync(userDataPath)) {
                    jsonResponse(res, 400, { code: -1, msg: 'MCSM 用户数据路径未配置或不存在' });
                    return;
                }

                // 查找 MCSM 用户
                const userFiles = fs.readdirSync(userDataPath).filter(file => file.endsWith('.json'));
                let mcsmUser = null;

                for (const userFile of userFiles) {
                    try {
                        const filePath = path.join(userDataPath, userFile);
                        const userData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                        if (userData.uuid === uuid) {
                            mcsmUser = userData;
                            break;
                        }
                    } catch (e) {
                        // 忽略无法解析的文件
                    }
                }

                if (!mcsmUser) {
                    jsonResponse(res, 404, { code: -1, msg: '未找到该 MCSM 用户' });
                    return;
                }

                if (!mcsmUser.userName) {
                    jsonResponse(res, 400, { code: -1, msg: 'MCSM 用户数据不完整（缺少用户名）' });
                    return;
                }

                // 检查用户名是否已存在
                const existingUser = userManager.findByUsername(mcsmUser.userName);
                if (existingUser) {
                    jsonResponse(res, 400, { code: -1, msg: `用户名 "${mcsmUser.userName}" 已存在，无法导入` });
                    return;
                }

                // 创建本地用户记录
                const newUser = {
                    id: mcsmUser.uuid,
                    username: mcsmUser.userName,
                    password: mcsmUser.passWord || '', // 保留 MCSM 的 bcrypt 密码哈希
                    email: mcsmUser.email || '',
                    createdAt: mcsmUser.registerTime || new Date().toISOString(),
                    status: 'active',
                    authMethod: 'mcsm_bcrypt',
                    importedAt: new Date().toISOString()
                };

                localUsers.push(newUser);
                saveUsers();

                // 初始化积分
                pointsManager.ensureUser(mcsmUser.userName);
                if (initialPoints && initialPoints > 0) {
                    pointsManager.addPoints(mcsmUser.userName, initialPoints, '从 MCSM 导入用户时赠送');
                }

                logger.info(`✓ 从 MCSM 导入用户成功: ${mcsmUser.userName} (UUID: ${uuid})${initialPoints ? ` (初始积分: ${initialPoints})` : ''}`);

                const { password: _, ...safeUser } = newUser;
                jsonResponse(res, 200, {
                    code: 0,
                    msg: '用户导入成功',
                    data: {
                        user: safeUser,
                        initialPoints: initialPoints || 0
                    }
                });
            } catch (e) {
                logger.error('从 MCSM 导入用户失败:', e);
                jsonResponse(res, 500, { code: -1, msg: '导入用户失败: ' + e.message });
            }
            return;
        }

        // 解封用户
        if (pathname === '/api/users/unban' && req.method === 'POST') {
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

            try {
                const data = await parseBody(req);
                const { username } = data;

                if (!username) {
                    jsonResponse(res, 400, { code: -1, msg: '缺少用户名' });
                    return;
                }

                const result = userManager.unbanUser(username);

                if (result.success) {
                    jsonResponse(res, 200, { code: 0, msg: '用户已解封', data: result.user });
                } else {
                    jsonResponse(res, 400, { code: -1, msg: result.error });
                }
            } catch (e) {
                jsonResponse(res, 400, { code: -1, msg: '无效的请求数据' });
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
        if (pathname === '/api/admin/login' && req.method === 'POST') {
            // 速率限制：每分钟最多3次管理员登录尝试
            const clientIp = getClientIp(req);
            if (!checkRateLimit(clientIp + ':admin', 3, 60000)) {
                jsonResponse(res, 429, { code: -1, msg: '登录尝试过于频繁，请稍后再试' });
                return;
            }

            try {
                const data = await parseBody(req);
                const { password, isSetup } = data; // isSetup 用于区分是设置密码还是登录

                if (isSetup && !config.rootAdmin.passwordSet) {
                    // 第一次设置密码
                    if (!password || password.length < 6) {
                        jsonResponse(res, 400, { code: -1, msg: '密码长度至少6位' });
                        return;
                    }
                    const hashedPassword = await bcrypt.hash(password, 10);
                    config.rootAdmin.password = hashedPassword;
                    config.rootAdmin.passwordSet = true;
                    
                    // 保存到 config.yml（保留注释）
                    try {
                        const rawConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
                        
                        // 使用正则替换密码和 passwordSet 字段，保留注释
                        let updatedConfig = rawConfig.replace(
                            /password:\s*["']?.*["']?(\s*#.*)?$/m,
                            `password: "${hashedPassword}"$1`
                        );
                        updatedConfig = updatedConfig.replace(
                            /passwordSet:\s*(true|false)(\s*#.*)?$/m,
                            `passwordSet: true$2`
                        );
                        
                        fs.writeFileSync(CONFIG_PATH, updatedConfig, 'utf-8');
                        console.log('✓ 管理员密码首次设置成功并已保存到 config.yml');
                        // 重新加载配置，确保内存中的 config 变量是最新的
                        config = loadConfig();
                    } catch (writeError) {
                        console.error('❌ 写入 config.yml 失败:', writeError);
                        jsonResponse(res, 500, { code: -1, msg: '保存密码失败' });
                        return;
                    }

                    const payload = { username: 'root', role: 'admin' };
                    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' }); // 延长到24小时

                    jsonResponse(res, 200, {
                        code: 0,
                        msg: '密码设置成功，已自动登录',
                        data: { token: token }
                    });
                    return;

                } else if (config.rootAdmin.passwordSet) {
                    // 正常登录流程
                    if (!password) {
                        jsonResponse(res, 400, { code: -1, msg: '请输入密码' });
                        return;
                    }

                    const storedHash = config.rootAdmin.password;
                    const match = await bcrypt.compare(password, storedHash);

                    if (match) {
                        const payload = { username: 'root', role: 'admin' };
                        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });


                        console.log(`✓ 管理员登录成功`);
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
                    return;
                } else {
                    // 密码未设置，但不是设置请求
                    jsonResponse(res, 400, { code: -1, msg: '管理员密码未设置，请先设置密码' });
                    return;
                }
            } catch (e) {
                console.error('管理员登录/设置密码异常:', e);
                jsonResponse(res, 500, { code: -1, msg: '处理请求时发生服务器错误: ' + e.message });
            }
            return;
        }

        // 验证管理员令牌
        if (pathname === '/api/admin/verify' && req.method === 'GET') {
            if (authenticate(req)) {
                jsonResponse(res, 200, {
                    code: 0,
                    msg: '令牌有效',
                    data: { valid: true }
                });
            } else {
                jsonResponse(res, 401, {
                    code: -1,
                    msg: '令牌无效或已过期',
                    data: { valid: false }
                });
            }
            return;
        }

        // ============== 功能开关 API ==============

        // 获取功能配置
        if (pathname === '/api/config/features' && req.method === 'GET') {
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, {
                    code: -1,
                    msg: '未授权：需要管理员权限'
                });
                return;
            }

            try {
                jsonResponse(res, 200, {
                    code: 0,
                    msg: '获取配置成功',
                    data: config
                });
            } catch (error) {
                logger.error('获取配置失败:', error);
                jsonResponse(res, 500, {
                    code: -1,
                    msg: '获取配置失败: ' + error.message
                });
            }
            return;
        }

        // 切换功能开关
        if (pathname === '/api/config/toggle' && req.method === 'POST') {
            // 验证管理员权限
            const authHeader = req.headers['authorization'];
            logger.info(`收到功能开关请求，Authorization header: ${authHeader ? authHeader.substring(0, 30) + '...' : 'null'}`);
            
            if (!authenticate(req)) {
                logger.warn('功能开关请求被拒绝：未授权');
                jsonResponse(res, 401, {
                    code: -1,
                    msg: '未授权：需要管理员权限'
                });
                return;
            }

            try {
                const { path, enabled } = await parseBody(req);

                if (!path || typeof enabled !== 'boolean') {
                    jsonResponse(res, 400, {
                        code: -1,
                        msg: '参数错误：需要 path 和 enabled 参数'
                    });
                    return;
                }

                // 读取当前配置文件内容
                const rawConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
                
                // 构建正则表达式来匹配配置项
                // 例如: checkin.enabled -> checkin:\n  enabled: true
                const pathParts = path.split('.');
                
                // 构建匹配模式，保留注释
                let pattern;
                if (pathParts.length === 2) {
                    // 两级配置，如 checkin.enabled
                    const section = pathParts[0];
                    const key = pathParts[1];
                    // 匹配格式: enabled: true/false，保留前面的空格和后面的注释
                    pattern = new RegExp(
                        `(${section}:[\\s\\S]*?\\n)(\\s+${key}:\\s*)(true|false)(\\s*(?:#.*)?)`,
                        'i'
                    );
                } else if (pathParts.length === 3) {
                    // 三级配置，如 services.payment.enabled
                    const section = pathParts[0];
                    const subsection = pathParts[1];
                    const key = pathParts[2];
                    pattern = new RegExp(
                        `(${section}:[\\s\\S]*?${subsection}:[\\s\\S]*?\\n)(\\s+${key}:\\s*)(true|false)(\\s*(?:#.*)?)`,
                        'i'
                    );
                } else if (pathParts.length === 4) {
                    // 四级配置，如 server.ssl.enabled
                    const section = pathParts[0];
                    const subsection = pathParts[1];
                    const subsubsection = pathParts[2];
                    const key = pathParts[3];
                    pattern = new RegExp(
                        `(${section}:[\\s\\S]*?${subsection}:[\\s\\S]*?${subsubsection}:[\\s\\S]*?\\n)(\\s+${key}:\\s*)(true|false)(\\s*(?:#.*)?)`,
                        'i'
                    );
                } else {
                    jsonResponse(res, 400, {
                        code: -1,
                        msg: '不支持的配置路径格式'
                    });
                    return;
                }

                // 检查是否匹配
                if (!pattern.test(rawConfig)) {
                    jsonResponse(res, 400, {
                        code: -1,
                        msg: `配置项 ${path} 未找到或格式不正确`
                    });
                    return;
                }

                // 替换配置值，保留注释
                const newConfig = rawConfig.replace(pattern, `$1$2${enabled}$4`);

                // 写回配置文件
                fs.writeFileSync(CONFIG_PATH, newConfig, 'utf-8');

                // 重新加载配置到内存
                config = loadConfig();

                logger.info(`管理员修改配置: ${path} = ${enabled}`);

                jsonResponse(res, 200, {
                    code: 0,
                    msg: '配置已更新',
                    data: { path, enabled }
                });
            } catch (error) {
                logger.error('更新配置失败:', error);
                jsonResponse(res, 500, {
                    code: -1,
                    msg: '更新配置失败: ' + error.message
                });
            }
            return;
        }

        // ============== 签到 API ==============

        // 执行签到
        if (pathname === '/api/checkin') {
            let username;

            if (req.method === 'POST') {
                try {
                    const body = await parseBody(req);
                    username = body.username;
                } catch (e) {
                    jsonResponse(res, 400, { code: -1, msg: '无效的请求数据' });
                    return;
                }
            } else { // 默认为 GET
                username = query.username;
            }
            
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
                data: { ranking: ranking }
            });
            return;
        }

        // ============== 签到管理 API（管理员专用） ==============

        // 获取所有用户签到统计
        if (pathname === '/api/admin/checkin/stats' && req.method === 'GET') {
            // 认证检查
            if (!authenticate(req)) {
                logger.warn(`未授权访问签到统计 - IP: ${getClientIp(req)}`);
                jsonResponse(res, 401, { code: -1, msg: '未授权：需要管理员权限' });
                return;
            }

            try {
                const totalUsers = Object.keys(checkinData).length;
                const today = checkinManager.getTodayStr();
                const todayCheckins = Object.values(checkinData).filter(u => u.lastCheckinDate === today).length;
                const totalCheckins = Object.values(checkinData).reduce((sum, u) => sum + u.totalCheckins, 0);
                const totalPoints = Object.values(checkinData).reduce((sum, u) => sum + u.totalPoints, 0);

                logger.info(`管理员查看签到统计 - IP: ${getClientIp(req)}`);

                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: {
                        totalUsers,
                        todayCheckins,
                        totalCheckins,
                        totalPoints
                    }
                });
            } catch (e) {
                logger.error('获取签到统计失败:', e);
                jsonResponse(res, 500, { code: -1, msg: '服务器错误' });
            }
            return;
        }

        // 获取所有用户签到列表
        if (pathname === '/api/admin/checkin/list' && req.method === 'GET') {
            // 认证检查
            if (!authenticate(req)) {
                logger.warn(`未授权访问签到列表 - IP: ${getClientIp(req)}`);
                jsonResponse(res, 401, { code: -1, msg: '未授权：需要管理员权限' });
                return;
            }

            try {
                const today = checkinManager.getTodayStr();
                const users = Object.values(checkinData).map(user => ({
                    username: user.username,
                    totalCheckins: user.totalCheckins,
                    continuousDays: user.continuousDays,
                    lastCheckinDate: user.lastCheckinDate,
                    totalPoints: user.totalPoints,
                    hasCheckedInToday: user.lastCheckinDate === today,
                    historyCount: user.history ? user.history.length : 0
                }));

                // 按总签到次数排序
                users.sort((a, b) => b.totalCheckins - a.totalCheckins);

                logger.info(`管理员查看签到列表 (${users.length}个用户) - IP: ${getClientIp(req)}`);

                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: { users }
                });
            } catch (e) {
                logger.error('获取签到列表失败:', e);
                jsonResponse(res, 500, { code: -1, msg: '服务器错误' });
            }
            return;
        }

        // 获取用户签到历史
        if (pathname === '/api/admin/checkin/history' && req.method === 'GET') {
            // 认证检查
            if (!authenticate(req)) {
                logger.warn(`未授权访问签到历史 - IP: ${getClientIp(req)}`);
                jsonResponse(res, 401, { code: -1, msg: '未授权：需要管理员权限' });
                return;
            }

            const username = query.username;
            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                return;
            }

            // 验证用户名格式（防止注入攻击）
            if (!/^[a-zA-Z0-9_-]{1,50}$/.test(username)) {
                logger.warn(`无效的用户名格式: ${username} - IP: ${getClientIp(req)}`);
                jsonResponse(res, 400, { code: -1, msg: '无效的用户名格式' });
                return;
            }

            try {
                const userCheckin = checkinData[username];
                if (!userCheckin) {
                    jsonResponse(res, 404, { code: -1, msg: '用户未签到过' });
                    return;
                }

                logger.info(`管理员查看用户签到历史: ${username} - IP: ${getClientIp(req)}`);

                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: {
                        username: userCheckin.username,
                        totalCheckins: userCheckin.totalCheckins,
                        continuousDays: userCheckin.continuousDays,
                        lastCheckinDate: userCheckin.lastCheckinDate,
                        totalPoints: userCheckin.totalPoints,
                        history: userCheckin.history || []
                    }
                });
            } catch (e) {
                logger.error(`获取用户签到历史失败 (${username}):`, e);
                jsonResponse(res, 500, { code: -1, msg: '服务器错误' });
            }
            return;
        }

        // 重置所有用户签到状态（保留历史数据）
        if (pathname === '/api/admin/checkin/reset' && req.method === 'POST') {
            // 认证检查
            if (!authenticate(req)) {
                logger.warn(`未授权尝试重置签到状态 - IP: ${getClientIp(req)}`);
                jsonResponse(res, 401, { code: -1, msg: '未授权：需要管理员权限' });
                return;
            }

            // 速率限制检查（防止频繁操作）
            const clientIp = getClientIp(req);
            if (!checkRateLimit(clientIp, 5, 60000)) { // 1分钟内最多5次
                logger.warn(`重置签到状态请求过于频繁 - IP: ${clientIp}`);
                jsonResponse(res, 429, { code: -1, msg: '操作过于频繁，请稍后再试' });
                return;
            }

            try {
                const affectedUsers = Object.keys(checkinData).length;

                // 重置所有用户的签到状态，但保留历史记录
                Object.keys(checkinData).forEach(username => {
                    checkinData[username].lastCheckinDate = null;
                    checkinData[username].continuousDays = 0;
                    // 保留 totalCheckins, totalPoints, history
                });

                saveCheckin();
                logger.warn(`⚠️ 管理员重置了所有用户的签到状态 (${affectedUsers}个用户) - IP: ${clientIp}`);

                jsonResponse(res, 200, {
                    code: 0,
                    msg: '重置成功，用户可以重新签到',
                    data: {
                        affectedUsers: affectedUsers
                    }
                });
            } catch (e) {
                logger.error('重置签到状态失败:', e);
                jsonResponse(res, 500, { code: -1, msg: '重置失败: ' + e.message });
            }
            return;
        }

        // 清空所有签到历史数据
        if (pathname === '/api/admin/checkin/clear' && req.method === 'POST') {
            // 认证检查
            if (!authenticate(req)) {
                logger.warn(`未授权尝试清空签到数据 - IP: ${getClientIp(req)}`);
                jsonResponse(res, 401, { code: -1, msg: '未授权：需要管理员权限' });
                return;
            }

            // 速率限制检查（防止频繁操作）
            const clientIp = getClientIp(req);
            if (!checkRateLimit(clientIp, 3, 300000)) { // 5分钟内最多3次
                logger.warn(`清空签到数据请求过于频繁 - IP: ${clientIp}`);
                jsonResponse(res, 429, { code: -1, msg: '操作过于频繁，请稍后再试' });
                return;
            }

            try {
                const body = await parseBody(req);
                const confirmText = body.confirm;

                // 验证确认文本
                if (confirmText !== 'CLEAR_ALL_CHECKIN_DATA') {
                    logger.warn(`清空签到数据确认文本错误 - IP: ${clientIp}`);
                    jsonResponse(res, 400, { code: -1, msg: '确认文本不正确' });
                    return;
                }

                // 备份当前数据
                const backupPath = path.join(DATA_DIR, `checkin_backup_${Date.now()}.json`);
                const backupSuccess = writeJsonFile(backupPath, checkinData);
                
                if (!backupSuccess) {
                    logger.error('备份签到数据失败，操作已取消');
                    jsonResponse(res, 500, { code: -1, msg: '备份失败，操作已取消' });
                    return;
                }

                logger.info(`签到数据已备份到: ${backupPath}`);

                // 清空所有数据
                const affectedUsers = Object.keys(checkinData).length;
                checkinData = {};
                saveCheckin();

                logger.warn(`⚠️⚠️⚠️ 管理员清空了所有签到历史数据 (${affectedUsers}个用户) - IP: ${clientIp}`);

                jsonResponse(res, 200, {
                    code: 0,
                    msg: '所有签到数据已清空',
                    data: {
                        affectedUsers,
                        backupPath
                    }
                });
            } catch (e) {
                logger.error('清空签到数据失败:', e);
                jsonResponse(res, 500, { code: -1, msg: '清空失败: ' + e.message });
            }
            return;
        }

        // ============== 积分查询 API（用于QQ机器人） ==============
        
        // 查询用户积分
        if (pathname === '/api/points' && req.method === 'GET') {
            const username = query.username;
            
            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                return;
            }

            // 确保用户积分数据存在
            pointsManager.ensureUser(username);
            
            const points = pointsManager.getBalance(username);
            
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    username: username,
                    points: points
                }
            });
            return;
        }

        // 续费实例（用于QQ机器人，简化版）
        if (pathname === '/api/mcsm/instance/renew' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username, instanceUuid, days } = data;

                if (!username || !instanceUuid || !days) {
                    jsonResponse(res, 400, { success: false, error: '缺少必要参数' });
                    return;
                }

                const daysToRenew = parseInt(days);
                if (isNaN(daysToRenew) || daysToRenew <= 0 || daysToRenew > 365) {
                    jsonResponse(res, 400, { success: false, error: '续费天数必须在1-365之间' });
                    return;
                }

                // 获取用户实例列表，找到对应的daemonId
                const instancesResult = await getUserInstancesByUsername(username);
                if (!instancesResult.success) {
                    jsonResponse(res, 400, { success: false, error: '获取实例列表失败' });
                    return;
                }

                const instance = instancesResult.instances.find(inst => inst.uuid === instanceUuid);
                if (!instance) {
                    jsonResponse(res, 404, { success: false, error: '实例不存在或不属于该用户' });
                    return;
                }

                const daemonId = instance.daemonId;

                // 计算所需积分
                const pricePerDay = config.renewal?.pricePerDay || 0.4;
                const requiredPoints = daysToRenew * pricePerDay;

                // 检查并扣除积分
                const deductResult = pointsManager.deductPoints(
                    username, 
                    requiredPoints, 
                    `QQ群续费实例 ${instance.nickname || instanceUuid} ${daysToRenew}天`
                );

                if (!deductResult.success) {
                    jsonResponse(res, 400, {
                        success: false,
                        error: '积分不足',
                        required: requiredPoints,
                        current: deductResult.balance
                    });
                    return;
                }

                // 续费实例
                const renewResult = await mcsmApi.renewInstance(daemonId, instanceUuid, daysToRenew);

                if (renewResult.success) {
                    console.log(`✓ QQ群续费成功: ${instanceUuid} by ${username} for ${daysToRenew} days`);
                    
                    jsonResponse(res, 200, {
                        success: true,
                        message: '续费成功',
                        pointsDeducted: requiredPoints,
                        remainingPoints: pointsManager.getBalance(username),
                        newEndTime: renewResult.newEndTime
                    });
                } else {
                    // 续费失败，退还积分
                    console.error(`✗ QQ群续费失败: ${instanceUuid}. Refunding points.`);
                    
                    const previousPoints = pointsManager.getBalance(username);
                    localPoints[username].totalPoints = round(localPoints[username].totalPoints + requiredPoints);
                    if (!localPoints[username].deductHistory) {
                        localPoints[username].deductHistory = [];
                    }
                    localPoints[username].deductHistory.push({
                        points: -requiredPoints,
                        reason: `QQ群续费失败退款 (实例: ${instance.nickname || instanceUuid})`,
                        time: new Date().toISOString(),
                        previousPoints: previousPoints,
                        afterPoints: localPoints[username].totalPoints,
                        type: 'refund'
                    });
                    savePoints();

                    jsonResponse(res, 500, {
                        success: false,
                        error: `续费失败: ${renewResult.error || '未知错误'}。积分已退还。`
                    });
                }
            } catch (e) {
                console.error('QQ群续费异常:', e);
                jsonResponse(res, 500, { success: false, error: '服务器错误: ' + e.message });
            }
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
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

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
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

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
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

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
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

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
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

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
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

            const stats = couponManager.getStats();
            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: stats
            });
            return;
        }

        // 获取用户兑换记录
        if (pathname === '/api/coupon/user-history') {
            const username = query.username;

            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '请提供用户名' });
                return;
            }

            // 遍历所有兑换码，找出该用户使用过的
            const userRedeems = [];
            const allCoupons = Object.values(couponsData);
            
            for (const coupon of allCoupons) {
                if (coupon.usedBy && coupon.usedBy.includes(username)) {
                    userRedeems.push({
                        code: coupon.code,
                        type: coupon.type,
                        typeText: coupon.type === 'points' ? '积分' : '续费天数',
                        value: coupon.value,
                        description: coupon.description,
                        redeemedAt: coupon.lastUsedAt || coupon.createdAt // 使用最后使用时间，如果没有则用创建时间
                    });
                }
            }

            // 按兑换时间降序排序（最新的在前）
            userRedeems.sort((a, b) => {
                const dateA = new Date(a.redeemedAt || 0);
                const dateB = new Date(b.redeemedAt || 0);
                return dateB - dateA;
            });

            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    username: username,
                    total: userRedeems.length,
                    redeems: userRedeems
                }
            });
            return;
        }

        // ============== QQ绑定 API ==============
        
        // 生成QQ绑定验证码
        if (pathname === '/api/qq/generate-code' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username } = data;

                if (!username) {
                    jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                    return;
                }

                // 直接使用全局 botData 变量
                // 确保数据结构完整
                if (!botData.bindings) botData.bindings = {};
                if (!botData.pendingVerify) botData.pendingVerify = {};

                const activeVerify = getActiveQQVerifyCode(username);
                if (activeVerify) {
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: 'success',
                        data: {
                            verifyCode: activeVerify.code,
                            expireTime: activeVerify.verify.expireTime,
                            expireSeconds: Math.max(0, Math.ceil((activeVerify.verify.expireTime - Date.now()) / 1000)),
                            reused: true
                        }
                    });
                    return;
                }
                
                // 🔒 如果该用户已有绑定，先解绑（允许重新绑定）
                if (botData.bindings[username]) {
                    const oldQQ = botData.bindings[username].qqNumber;
                    delete botData.bindings[username];
                    logger.info(`🔄 用户 ${username} 重新绑定，已解绑旧QQ: ${oldQQ}`);
                }

                clearUserQQVerifyCodes(username);

                // 生成6位随机验证码
                const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                const expireTime = Date.now() + (config.onebot?.verify_timeout || 120) * 1000;
                
                // 保存验证码
                botData.pendingVerify[code] = {
                    username: username,
                    code: code,
                    expireTime: expireTime,
                    createdAt: new Date().toISOString()
                };

                // 写入文件
                writeBotData(botData);

                logger.info(`🔐 生成QQ绑定验证码: ${code} (用户: ${username})`);

                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: {
                        verifyCode: code,
                        expireTime: expireTime,
                        expireSeconds: config.onebot?.verify_timeout || 120,
                        reused: false
                    }
                });
            } catch (e) {
                logger.error('生成验证码失败:', e);
                jsonResponse(res, 500, { code: -1, msg: '生成验证码失败: ' + e.message });
            }
            return;
        }

        // 检查QQ绑定状态
        if (pathname === '/api/qq/check-binding') {
            const username = query.username;

            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                return;
            }

            // 直接使用全局 botData 变量
            // 确保数据结构完整
            if (!botData.bindings) botData.bindings = {};
            
            const binding = botData.bindings[username];

            if (binding) {
                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: {
                        bound: true,
                        qqNumber: binding.qqNumber,
                        bindTime: binding.bindTime
                    }
                });
            } else {
                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: {
                        bound: false
                    }
                });
            }
            return;
        }

        // 检查验证码状态
        if (pathname === '/api/qq/verify-status') {
            const code = query.code;

            if (!code) {
                jsonResponse(res, 400, { code: -1, msg: '缺少code参数' });
                return;
            }

            // 直接使用全局 botData 变量
            // 确保数据结构完整
            if (!botData.pendingVerify) botData.pendingVerify = {};
            
            const verify = botData.pendingVerify[code];

            if (!verify) {
                // 检查是否已经绑定成功（验证码被删除但绑定已建立）
                // 这种情况说明验证已完成
                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: {
                        status: 'not_found'
                    }
                });
                return;
            }

            // 检查是否过期
            if (Date.now() > verify.expireTime) {
                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: {
                        status: 'expired'
                    }
                });
                return;
            }

            // 检查是否已验证
            if (verify.verified) {
                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: {
                        status: 'verified',
                        qqNumber: verify.qqNumber
                    }
                });
            } else {
                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: {
                        status: 'pending'
                    }
                });
            }
            return;
        }

        // 解绑QQ
        if (pathname === '/api/qq/unbind' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username } = data;

                if (!username) {
                    jsonResponse(res, 400, { code: -1, msg: '缺少username参数' });
                    return;
                }

                // 直接使用全局 botData 变量，而不是重新读取文件
                // 确保数据结构完整
                if (!botData.bindings) botData.bindings = {};
                
                if (botData.bindings[username]) {
                    const qqNumber = botData.bindings[username].qqNumber;
                    delete botData.bindings[username];
                    // 写入文件并更新全局变量
                    writeBotData(botData);
                    
                    logger.info(`🔓 QQ解绑成功: ${username} (QQ: ${qqNumber})`);
                    
                    jsonResponse(res, 200, {
                        code: 0,
                        msg: '解绑成功'
                    });
                } else {
                    jsonResponse(res, 400, {
                        code: -1,
                        msg: '未绑定QQ'
                    });
                }
            } catch (e) {
                logger.error('解绑QQ失败:', e);
                jsonResponse(res, 500, { code: -1, msg: '解绑失败: ' + e.message });
            }
            return;
        }

        // ============== 自动续费 API ==============

        // 获取自动续费配置
        if (pathname === '/api/auto-renewal/config' && req.method === 'GET') {
            const username = query.username;
            const instanceUuid = query.instanceUuid;

            if (!username) {
                jsonResponse(res, 400, { code: -1, msg: '缺少 username 参数' });
                return;
            }

            if (instanceUuid) {
                // 获取单个实例的配置
                const cfg = autoRenewalManager.getConfig(username, instanceUuid);
                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: cfg
                });
            } else {
                // 获取用户所有实例的配置
                const configs = autoRenewalManager.getUserConfigs(username);
                jsonResponse(res, 200, {
                    code: 0,
                    msg: 'success',
                    data: configs
                });
            }
            return;
        }

        // 设置自动续费配置
        if (pathname === '/api/auto-renewal/config' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username, instanceUuid, enabled, renewalDays, advanceDays, minPointsReserve } = data;

                if (!username || !instanceUuid) {
                    jsonResponse(res, 400, { code: -1, msg: '缺少 username 或 instanceUuid 参数' });
                    return;
                }

                // 验证参数
                if (renewalDays !== undefined) {
                    const days = parseInt(renewalDays);
                    if (isNaN(days) || days < 1 || days > 365) {
                        jsonResponse(res, 400, { code: -1, msg: '续费天数必须在 1-365 之间' });
                        return;
                    }
                }

                if (advanceDays !== undefined) {
                    const days = parseInt(advanceDays);
                    if (isNaN(days) || days < 1 || days > 30) {
                        jsonResponse(res, 400, { code: -1, msg: '提前天数必须在 1-30 之间' });
                        return;
                    }
                }

                if (minPointsReserve !== undefined) {
                    const points = parseInt(minPointsReserve);
                    if (isNaN(points) || points < 0) {
                        jsonResponse(res, 400, { code: -1, msg: '最低积分保留必须大于等于0' });
                        return;
                    }
                }

                const result = autoRenewalManager.setConfig(username, instanceUuid, {
                    enabled,
                    renewalDays,
                    advanceDays,
                    minPointsReserve
                });

                jsonResponse(res, 200, {
                    code: 0,
                    msg: '设置成功',
                    data: result.config
                });

            } catch (e) {
                jsonResponse(res, 500, { code: -1, msg: '设置失败: ' + e.message });
            }
            return;
        }

        // 删除自动续费配置
        if (pathname === '/api/auto-renewal/config' && req.method === 'DELETE') {
            const username = query.username;
            const instanceUuid = query.instanceUuid;

            if (!username || !instanceUuid) {
                jsonResponse(res, 400, { code: -1, msg: '缺少 username 或 instanceUuid 参数' });
                return;
            }

            const result = autoRenewalManager.deleteConfig(username, instanceUuid);

            if (result.success) {
                jsonResponse(res, 200, {
                    code: 0,
                    msg: '删除成功'
                });
            } else {
                jsonResponse(res, 404, {
                    code: -1,
                    msg: result.error
                });
            }
            return;
        }

        // 获取自动续费历史记录
        if (pathname === '/api/auto-renewal/history' && req.method === 'GET') {
            const username = query.username;
            const instanceUuid = query.instanceUuid;
            const limit = parseInt(query.limit) || 50;

            if (!username || !instanceUuid) {
                jsonResponse(res, 400, { code: -1, msg: '缺少 username 或 instanceUuid 参数' });
                return;
            }

            const history = autoRenewalManager.getHistory(username, instanceUuid, limit);

            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    history: history,
                    total: history.length
                }
            });
            return;
        }

        // 手动触发自动续费检查（管理员功能）
        if (pathname === '/api/auto-renewal/check' && req.method === 'POST') {
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

            // 异步执行检查，立即返回
            checkAndRenewInstances().catch(err => {
                logger.error('手动触发自动续费检查失败:', err);
            });

            jsonResponse(res, 200, {
                code: 0,
                msg: '已触发自动续费检查'
            });
            return;
        }

        // 获取自动续费统计信息（管理员功能）
        if (pathname === '/api/auto-renewal/stats' && req.method === 'GET') {
            // 验证管理员权限
            if (!authenticate(req)) {
                jsonResponse(res, 401, { code: -1, msg: '需要管理员权限' });
                return;
            }

            const enabledConfigs = autoRenewalManager.getAllEnabledConfigs();
            const totalUsers = Object.keys(autoRenewalData).length;
            const totalConfigs = Object.values(autoRenewalData).reduce((sum, userConfigs) => {
                return sum + Object.keys(userConfigs).length;
            }, 0);

            jsonResponse(res, 200, {
                code: 0,
                msg: 'success',
                data: {
                    totalUsers: totalUsers,
                    totalConfigs: totalConfigs,
                    enabledConfigs: enabledConfigs.length,
                    checkInterval: config.autoRenewal?.checkInterval || 15
                }
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

        // 手动将实例添加到用户账户 (已更新为使用 API)
        if (pathname === '/api/mcsm/instance/add' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username, daemonId, instanceUuid } = data;

                if (!username || !daemonId || !instanceUuid) {
                    jsonResponse(res, 400, { code: -1, msg: '缺少 username, daemonId 或 instanceUuid 参数' });
                    return;
                }

                const result = await updateUserInstanceAssignment(username, instanceUuid, 'add', daemonId);

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

        // 从用户账户移除实例 (已更新为使用 API)
        if (pathname === '/api/mcsm/instance/remove' && req.method === 'POST') {
            try {
                const data = await parseBody(req);
                const { username, instanceUuid } = data;

                if (!username || !instanceUuid) {
                    jsonResponse(res, 400, { code: -1, msg: '缺少 username 或 instanceUuid 参数' });
                    return;
                }

                const result = await updateUserInstanceAssignment(username, instanceUuid, 'remove');

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

            const result = await getMcsmUserByUsername(username);

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
                    data: {}
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
                    console.log('公告更新');
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

        // 超级管理员页面（隐藏入口，只能通过 /admin 访问）
        if (pathname.startsWith('/admin/') || pathname === '/admin') {
            let filePath = pathname.replace('/admin', '');
            if (filePath === '' || filePath === '/') {
                filePath = '/index.html';
            }
            
            // 安全检查：管理页面的HTML和资源文件允许访问，但前端会进行令牌验证
            // 真正的安全保护在API层面和前端令牌验证
            // 公开文件列表（登录页面和管理页面的静态资源）
            const publicFiles = [
                '/index.html', 
                '/style.css', 
                '/js/app.js',
                '/admin_panel.html',  // 允许访问HTML，但前端会验证令牌
                '/admin_panel.css',
                '/admin_panel.js',
                '/user_management_new.js',
                '/feature_toggle.html',  // 功能开关页面
                '/feature_toggle.js',    // 功能开关脚本
                '/js/marked.min.js'  // Markdown 解析库，用于公告预览
            ];
            // Source map 文件（.map）也应该被允许访问，它们只是用于调试
            const isPublicFile = publicFiles.includes(filePath) || filePath.endsWith('.map');
            
            // 对于非公开文件，需要验证管理员权限
            if (!isPublicFile) {
                // 检查是否有有效的管理员认证
                if (!authenticate(req)) {
                    logger.warn(`🚫 未授权访问尝试: ${pathname} (IP: ${getClientIp(req)})`);
                    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ 
                        code: -1, 
                        msg: '需要管理员权限才能访问此页面',
                        redirect: '/admin'
                    }));
                    return;
                }
            }
            
            const fullPath = path.join(__dirname, 'public/root', filePath);
            
            // 如果是 index.html，并且密码未设置，则添加一个标志
            if (filePath === '/index.html') {
                fs.readFile(fullPath, 'utf-8', (err, data) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end('<h1>500 - 服务器错误</h1>');
                        return;
                    }
                    // 在 HTML 中注入一个全局变量来指示密码是否已设置
                    const modifiedData = data.replace('</body>', `<script>window.rootAdminPasswordSet = ${config.rootAdmin.passwordSet};</script></body>`);
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(modifiedData);
                });
            } else {
                serveStaticFile(res, fullPath);
            }
            return;
        }

        // 新增：提供 node_modules 中的文件
        if (pathname.startsWith('/node_modules/')) {
            const filePath = path.join(__dirname, pathname);
            serveStaticFile(res, filePath);
            return;
        }

        // 默认首页 - 用户管理面板
        if (pathname === '/' || pathname === '') {
            const fullPath = path.join(__dirname, 'public/admin/index.html');
            let headers = {
                'Content-Security-Policy': "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
            };
            serveStaticFile(res, fullPath, headers);
            return;
        }

        // 用户管理面板的静态资源（CSS、JS等）
        if (pathname.startsWith('/css/') || pathname.startsWith('/js/')) {
            const fullPath = path.join(__dirname, 'public/admin', pathname);
            serveStaticFile(res, fullPath);
            return;
        }

        // favicon.ico 处理 - 根据 Referer 判断来源页面
        if (pathname === '/favicon.ico') {
            const referer = req.headers.referer || req.headers.referrer || '';
            let faviconPath = null;
            
            // 根据 Referer 判断应该返回哪个目录下的 favicon
            if (referer.includes('/payment')) {
                faviconPath = path.join(__dirname, 'public/payment/favicon.ico');
            } else if (referer.includes('/admin')) {
                faviconPath = path.join(__dirname, 'public/root/favicon.ico');
            } else {
                // 默认使用 admin 目录的 favicon（用户管理面板）
                faviconPath = path.join(__dirname, 'public/admin/favicon.ico');
            }
            
            if (fs.existsSync(faviconPath)) {
                serveStaticFile(res, faviconPath);
            } else {
                // 如果 favicon.ico 不存在，返回 204 No Content 而不是 404 错误
                res.writeHead(204, { 'Content-Length': '0' });
                res.end();
            }
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
};

/**
 * 设置 PROXY Protocol 支持
 * @param {http.Server|https.Server} server - HTTP/HTTPS 服务器实例
 * @param {number} version - PROXY Protocol 版本 (1 或 2)
 */
function setupProxyProtocol(server, version = 1) {
    logger.info(`启用 PROXY Protocol v${version} 支持`);
    
    server.on('connection', (socket) => {
        let buffer = Buffer.alloc(0);
        let proxyParsed = false;
        
        const onData = (chunk) => {
            if (proxyParsed) {
                return;
            }
            
            buffer = Buffer.concat([buffer, chunk]);
            
            let proxyInfo = null;
            
            // 尝试解析 PROXY Protocol
            if (version === 1) {
                proxyInfo = parseProxyProtocolV1(buffer);
            } else if (version === 2) {
                proxyInfo = parseProxyProtocolV2(buffer);
            }
            
            if (proxyInfo) {
                proxyParsed = true;
                
                // 移除 PROXY Protocol 头部
                const remainingData = buffer.slice(proxyInfo.headerLength);
                
                // 将解析出的信息附加到 socket 对象
                socket.proxyProtocol = proxyInfo;
                
                // 记录真实 IP
                if (proxyInfo.srcAddress) {
                    logger.debug(`PROXY Protocol: 真实IP=${proxyInfo.srcAddress}:${proxyInfo.srcPort}, 目标=${proxyInfo.dstAddress}:${proxyInfo.dstPort}`);
                }
                
                // 移除此监听器
                socket.removeListener('data', onData);
                
                // 如果有剩余数据，重新触发 data 事件
                if (remainingData.length > 0) {
                    socket.unshift(remainingData);
                }
            } else if (buffer.length > 512) {
                // 如果缓冲区过大仍未解析成功，可能不是 PROXY Protocol
                logger.debug('PROXY Protocol 解析失败，可能不是有效的 PROXY Protocol 头部');
                proxyParsed = true;
                socket.removeListener('data', onData);
                
                // 将缓冲区数据放回
                socket.unshift(buffer);
            }
        };
        
        socket.on('data', onData);
        
        // 为每个请求附加 proxyProtocol 信息
        socket.on('secureConnection', () => {
            if (socket.proxyProtocol) {
                socket._httpMessage.proxyProtocol = socket.proxyProtocol;
            }
        });
    });
    
    // 拦截请求，将 socket 的 proxyProtocol 信息传递给 req
    const originalEmit = server.emit.bind(server);
    server.emit = function(event, req, res) {
        if (event === 'request' && req.socket && req.socket.proxyProtocol) {
            req.proxyProtocol = req.socket.proxyProtocol;
        }
        return originalEmit(event, req, res);
    };
}

function getProxyProtocolState(buffer, version = 1) {
    if (version === 1) {
        if (buffer.length >= 5 && buffer.toString('ascii', 0, 5) !== 'PROXY') {
            return { status: 'invalid' };
        }

        const proxyInfo = parseProxyProtocolV1(buffer);
        if (proxyInfo) {
            return { status: 'complete', proxyInfo };
        }

        return buffer.length > 108 ? { status: 'invalid' } : { status: 'pending' };
    }

    if (version === 2) {
        const signature = Buffer.from([0x0D, 0x0A, 0x0D, 0x0A, 0x00, 0x0D, 0x0A, 0x51, 0x55, 0x49, 0x54, 0x0A]);

        if (buffer.length >= signature.length && !buffer.slice(0, signature.length).equals(signature)) {
            return { status: 'invalid' };
        }

        const proxyInfo = parseProxyProtocolV2(buffer);
        if (proxyInfo) {
            return { status: 'complete', proxyInfo };
        }

        if (buffer.length >= 16) {
            const headerLength = 16 + buffer.readUInt16BE(14);
            if (buffer.length > headerLength) {
                return { status: 'invalid' };
            }
        }

        return { status: 'pending' };
    }

    return { status: 'invalid' };
}

function formatProxyProtocolPreview(buffer) {
    const preview = buffer.slice(0, 32);
    const hex = preview.toString('hex').match(/.{1,2}/g)?.join(' ') || '';
    const ascii = preview.toString('latin1').replace(/[^\x20-\x7E]/g, '.');
    return `len=${buffer.length}, hex="${hex}", ascii="${ascii}"`;
}

function getSocketProxyProtocol(socket) {
    return socket?.proxyProtocol ||
           socket?._parent?.proxyProtocol ||
           socket?.socket?.proxyProtocol ||
           null;
}

function createProxyProtocolServer(server, version = 1) {
    logger.info(`启用 PROXY Protocol v${version} 支持`);

    const proxyServer = net.createServer((socket) => {
        let buffer = Buffer.alloc(0);
        const maxHeaderLength = version === 1 ? 108 : 65551;
        const peer = `${socket.remoteAddress || 'unknown'}:${socket.remotePort || 'unknown'}`;
        logger.debug(`PROXY Protocol: 新连接 ${peer}，期望 v${version}`);
        const timeout = setTimeout(() => {
            logger.warn(`PROXY Protocol 头部读取超时，关闭连接: peer=${peer}, ${formatProxyProtocolPreview(buffer)}`);
            socket.destroy();
        }, 5000);

        const cleanup = () => {
            clearTimeout(timeout);
            socket.removeListener('data', onData);
            socket.removeListener('error', cleanup);
        };

        const passToHttpServer = (proxyInfo, remainingData) => {
            cleanup();

            if (proxyInfo) {
                socket.proxyProtocol = proxyInfo;

                if (proxyInfo.srcAddress) {
                    logger.debug(`PROXY Protocol v${version} 解析成功: peer=${peer}, 真实IP=${proxyInfo.srcAddress}:${proxyInfo.srcPort}, 目标=${proxyInfo.dstAddress}:${proxyInfo.dstPort}`);
                } else {
                    logger.debug(`PROXY Protocol v${version} 解析成功: peer=${peer}, 未携带源地址, headerLength=${proxyInfo.headerLength}`);
                }
            }

            if (remainingData.length > 0) {
                socket.unshift(remainingData);
            }

            server.emit('connection', socket);
            socket.resume();
        };

        const onData = (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);

            if (buffer.length > maxHeaderLength) {
                cleanup();
                logger.warn(`PROXY Protocol 头部过大，关闭连接: peer=${peer}, max=${maxHeaderLength}, ${formatProxyProtocolPreview(buffer)}`);
                socket.destroy();
                return;
            }

            const state = getProxyProtocolState(buffer, version);

            if (state.status === 'complete') {
                passToHttpServer(state.proxyInfo, buffer.slice(state.proxyInfo.headerLength));
            } else if (state.status === 'invalid') {
                logger.debug(`PROXY Protocol 解析失败，按普通连接处理: peer=${peer}, expected=v${version}, ${formatProxyProtocolPreview(buffer)}`);
                passToHttpServer(null, buffer);
            }
        };

        socket.pause();
        socket.on('data', onData);
        socket.on('error', cleanup);
        socket.resume();
    });

    proxyServer.on('error', (error) => {
        server.emit('error', error);
    });

    const originalEmit = server.emit.bind(server);
    server.emit = function(event, req, res) {
        if (event === 'secureConnection') {
            const proxyInfo = getSocketProxyProtocol(req);
            if (proxyInfo) {
                req.proxyProtocol = proxyInfo;
            }
        } else if (event === 'request' && req.socket) {
            const proxyInfo = getSocketProxyProtocol(req.socket);
            if (proxyInfo) {
                req.proxyProtocol = proxyInfo;
                req.socket.proxyProtocol = proxyInfo;
            }
        }
        return originalEmit(event, req, res);
    };

    return proxyServer;
}

// ============== 启动服务器 ==============

function startServer() {
    // 加载本地数据
    loadLocalData();

    const PORT = config.server.port;
    const HOST = config.server.host;
    const sslConfig = config.server.ssl;
    const proxyConfig = config.server.proxy;

    // 创建请求处理器包装函数（支持 PROXY Protocol）
    const wrappedRequestHandler = (req, res) => {
        requestHandler(req, res);
    };

    // 验证 MCSM 服务器状态
    if (config.mcsm && config.mcsm.panelUrl) {
        checkMcsmServerStatus(config.mcsm.panelUrl)
            .then(isAvailable => {
                if (isAvailable) {
                    logger.info('MCSM 面板Api状态: 可用');
                } else {
                    logger.error('MCSM 面板Api状态: 不可用或连接失败，请检查 config.yml 中的 panelUrl 和网络连接');
                }
            })
            .catch(e => {
                logger.error('检查 MCSM 面板Api状态时发生错误:', e.message);
            });
    } else {
        logger.warn('config.yml 中未配置 MCSM 面板 URL，跳过 MCSM 服务器状态检查');
    }

    // 创建服务器
    if (sslConfig && sslConfig.enabled) {
        try {
            // 修正：直接使用配置文件中的路径，不再拼接 __dirname
            const options = {
                key: fs.readFileSync(sslConfig.key),
                cert: fs.readFileSync(sslConfig.cert)
            };
            server = https.createServer(options, wrappedRequestHandler);
            
            // 如果启用了 PROXY Protocol，添加连接监听器
            if (proxyConfig && proxyConfig.enabled) {
                server = createProxyProtocolServer(server, proxyConfig.version || 1);
            }
            
            server.listen(PORT, HOST, () => {
                logger.info(`
  ______                          _____          _   _ 
 |  ____|                        / ____|        | | | |
 | |__      __ _   ___   _   _  | (___     ___  | | | |
 |  __|    / _\` | / __| | | | |  \\___ \\   / _ \\ | | | |
 | |____  | (_| | \\__ \\ | |_| |  ____) | |  __/ | | | |
 |______|  \\__,_| |___/  \\__, | |_____/   \\___| |_| |_|
                          __/ |                        
                         |___/                         
                `);
                logger.info(`服务已启动(HTTPS)在${HOST}:${PORT}`);
            });
        } catch (e) {
            // 增强：打印完整的错误对象以方便调试
            logger.error('启动 HTTPS 服务器失败:', e);
            logger.warn('请确保 config.yml 中的 SSL 证书和密钥文件路径正确且可访问。');
            logger.warn('将回退到 HTTP 模式启动...');
            server = http.createServer(wrappedRequestHandler);
            
            // 如果启用了 PROXY Protocol，添加连接监听器
            if (proxyConfig && proxyConfig.enabled) {
                server = createProxyProtocolServer(server, proxyConfig.version || 1);
            }
            
            server.listen(PORT, HOST, () => {
                logger.info(`
  ______                          _____          _   _ 
 |  ____|                        / ____|        | | | |
 | |__      __ _   ___   _   _  | (___     ___  | | | |
 |  __|    / _\` | / __| | | | |  \\___ \\   / _ \\ | | | |
 | |____  | (_| | \\__ \\ | |_| |  ____) | |  __/ | | | |
 |______|  \\__,_| |___/  \\__, | |_____/   \\___| |_| |_|
                          __/ |                        
                         |___/                         
                `);
                logger.info(`服务已启动(HTTP)在${HOST}:${PORT}`);
            });
        }
    } else {
        server = http.createServer(wrappedRequestHandler);
        
        // 如果启用了 PROXY Protocol，添加连接监听器
        if (proxyConfig && proxyConfig.enabled) {
            server = createProxyProtocolServer(server, proxyConfig.version || 1);
        }
        
        server.listen(PORT, HOST, () => {
            logger.info(`
  ______                          _____          _   _ 
 |  ____|                        / ____|        | | | |
 | |__      __ _   ___   _   _  | (___     ___  | | | |
 |  __|    / _\` | / __| | | | |  \\___ \\   / _ \\ | | | |
 | |____  | (_| | \\__ \\ | |_| |  ____) | |  __/ | | | |
 |______|  \\__,_| |___/  \\__, | |_____/   \\___| |_| |_|
                          __/ |                        
                         |___/                         
            `);
            logger.info(`服务已启动(HTTP)在${HOST}:${PORT}`);
        });
    }
}

// 启动
startServer();

// 延迟启动QQ机器人，确保主服务器先启动
setTimeout(() => {
    startQQBot();
}, 2000);

// 延迟启动自动续费监控，确保主服务器和数据加载完成
setTimeout(() => {
    startAutoRenewalMonitor();
}, 3000);

// 优雅退出
process.on('SIGINT', () => {
    logger.info('\n正在关闭服务...');
    
    // 设置5秒强制退出定时器
    const forceExitTimer = setTimeout(() => {
        logger.warn('5秒内未能正常关闭，强制退出程序');
        process.exit(1);
    }, 5000);
    
    // 停止自动续费监控
    stopAutoRenewalMonitor();
    
    // 关闭QQ机器人WebSocket连接
    if (ws) {
        logger.info('正在关闭QQ机器人...');
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
        }
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }
        ws.close();
    }
    
    if (server) {
        server.close(() => {
            clearTimeout(forceExitTimer); // 正常关闭时清除强制退出定时器
            logger.info('服务已关闭');
            process.exit(0);
        });
    } else {
        clearTimeout(forceExitTimer); // 正常关闭时清除强制退出定时器
        process.exit(0);
    }
});

process.on('SIGTERM', () => {
    // 停止自动续费监控
    stopAutoRenewalMonitor();
    
    if (ws) {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
        }
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }
        ws.close();
    }
    if (server) {
        server.close();
    }
    process.exit(0);
});
