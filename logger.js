/**
 * 日志工具模块
 * 支持控制台和文件输出，可通过配置文件控制
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor(config = {}) {
        this.enabled = config.enabled !== false;
        this.level = config.level || 'info';
        this.console = config.console !== false;
        this.file = config.file !== false;
        this.directory = config.directory || 'logs';
        this.maxFiles = config.maxFiles || 7;
        this.format = config.format || '[{timestamp}] [{level}] {message}';
        
        // ANSI 颜色代码
        this.colors = {
            reset: '\x1b[0m',
            white: '\x1b[37m',
            yellow: '\x1b[33m',
            red: '\x1b[31m',
            cyan: '\x1b[36m',
            gray: '\x1b[90m'
        };
        
        // 生成启动时间戳（精确到秒）
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        this.sessionLogFile = `${year}-${month}-${day}_${hour}-${minute}-${second}.log`;
        
        // 日志级别优先级
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }
    
    /**
     * 确保日志目录存在
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.directory)) {
            try {
                fs.mkdirSync(this.directory, { recursive: true });
                console.log(`✓ 已创建日志目录: ${this.directory}/`);
            } catch (e) {
                console.error(`✗ 创建日志目录失败: ${e.message}`);
            }
        }
    }
    
    /**
     * 清理旧日志文件
     */
    cleanOldLogs() {
        try {
            const files = fs.readdirSync(this.directory)
                .filter(f => f.endsWith('.log'))
                .map(f => ({
                    name: f,
                    path: path.join(this.directory, f),
                    time: fs.statSync(path.join(this.directory, f)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);
            
            // 删除超过保留数量的日志文件
            if (files.length > this.maxFiles) {
                files.slice(this.maxFiles).forEach(file => {
                    fs.unlinkSync(file.path);
                });
            }
        } catch (e) {
            // 忽略清理错误
        }
    }
    
    /**
     * 获取当前日志文件路径
     */
    getLogFilePath() {
        return path.join(this.directory, this.sessionLogFile);
    }
    
    /**
     * 格式化日志消息
     */
    formatMessage(level, message, colored = false) {
        const timestamp = new Date().toISOString();
        const formattedLevel = level.toUpperCase();
        
        const plainMessage = this.format
            .replace('{timestamp}', timestamp)
            .replace('{level}', formattedLevel)
            .replace('{message}', message);
        
        // 如果需要彩色输出（控制台），给整行添加颜色
        if (colored) {
            let color = this.colors.white; // 默认白色
            switch(level) {
                case 'error':
                    color = this.colors.red;
                    break;
                case 'warn':
                    color = this.colors.yellow;
                    break;
                case 'info':
                    color = this.colors.white;
                    break;
                case 'debug':
                    color = this.colors.gray;
                    break;
            }
            return `${color}${plainMessage}${this.colors.reset}`;
        }
        
        return plainMessage;
    }
    
    /**
     * 写入日志
     */
    log(level, message, ...args) {
        if (!this.enabled) return;
        
        // 检查日志级别
        if (this.levels[level] < this.levels[this.level]) {
            return;
        }
        
        // 处理多个参数
        const fullMessage = args.length > 0 
            ? `${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`
            : message;
        
        // 输出到控制台（带颜色）
        if (this.console) {
            const coloredMessage = this.formatMessage(level, fullMessage, true);
            const consoleMethod = level === 'error' ? console.error : 
                                 level === 'warn' ? console.warn : 
                                 console.log;
            consoleMethod(coloredMessage);
        }
        
        // 输出到文件（不带颜色）
        if (this.file) {
            try {
                // 确保日志目录存在
                this.ensureLogDirectory();
                
                const logFilePath = this.getLogFilePath();
                const isNewFile = !fs.existsSync(logFilePath);
                
                const plainMessage = this.formatMessage(level, fullMessage, false);
                fs.appendFileSync(logFilePath, plainMessage + '\n', 'utf-8');
                
                // 如果是新文件，执行清理旧日志
                if (isNewFile) {
                    this.cleanOldLogs();
                }
            } catch (e) {
                // 如果写入失败，至少输出到控制台
                console.error('写入日志文件失败:', e.message);
            }
        }
    }
    
    /**
     * Debug 级别日志
     */
    debug(message, ...args) {
        this.log('debug', message, ...args);
    }
    
    /**
     * Info 级别日志
     */
    info(message, ...args) {
        this.log('info', message, ...args);
    }
    
    /**
     * Warn 级别日志
     */
    warn(message, ...args) {
        this.log('warn', message, ...args);
    }
    
    /**
     * Error 级别日志
     */
    error(message, ...args) {
        this.log('error', message, ...args);
    }
}

module.exports = Logger;
