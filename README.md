# Wmp - Minecraft 服务器管理与支付系统

<div align="center">

**一个集成支付、充值、服务器管理的 Minecraft 服务器商业化解决方案**

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-开发中-yellow.svg)](https://github.com/yourusername/wmp)

</div>

---

## 📖 项目简介

Wmp 是一个专为 Minecraft 服务器运营设计的综合管理系统，提供完整的商业化运营解决方案。系统深度集成 **MCSManager 面板**，实现服务器自动化管理、在线支付、积分充值、自动续费等核心功能。

### ✨ 核心特性

- 🎮 **服务器管理** - 与 MCSManager 深度集成，支持服务器创建、续费、配置管理
- 💰 **支付系统** - 集成微信支付监控，支持在线充值和订单管理
- 🎁 **积分系统** - 灵活的积分充值、消费、签到奖励机制
- 🤖 **QQ 机器人** - 基于 OneBot 协议的 QQ 群管理和通知功能
- 🔄 **自动续费** - 智能的服务器自动续费系统，避免服务器过期
- 🎫 **兑换码** - 支持生成和使用兑换码进行积分充值
- 📊 **管理面板** - 功能完善的 Web 管理后台
- 🔐 **安全认证** - JWT 令牌认证、bcrypt 密码加密、验证码保护

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 16.x
- **MCSManager** 面板（必需）
- **Python 3.x**（可选，用于支付监控功能）

### 安装步骤

1. **下载最新构建**
```
https://github.com/kqjs5174/Wmp/releases

```

2. **安装依赖**
```bash
npm install
```

3. **配置系统**

首次运行会自动生成 `config.yml` 配置文件，请根据实际情况修改：

```yaml
# 关键配置项
mcsm:
  panelUrl: https://your-panel.com:23333  # MCSManager 面板地址
  apiKey: YOUR_API_KEY_HERE               # MCSManager API 密钥

services:
  payment:
    backend:
      url: http://YOUR_PAY_IP/query_payment  # 支付查询 API 地址
```

4. **启动服务**
```bash
npm start
# 或
node server.js
```

5. **初始化管理员**

访问 `http://localhost:3000/admin` 设置管理员密码

---

## 📁 项目结构

```
wmp/
├── server.js              # 主服务器文件
├── logger.js              # 日志系统
├── config.yml             # 配置文件
├── package.json           # 项目依赖
├── data/                  # 数据存储目录
│   ├── users.json         # 用户数据
│   ├── orders.json        # 订单数据
│   ├── points.json        # 积分数据
│   ├── servers.json       # 服务器数据
│   ├── checkin.json       # 签到数据
│   ├── coupons.json       # 兑换码数据
│   └── bot.json           # QQ 机器人数据
├── public/                # 静态资源
│   ├── admin/             # 管理面板
│   ├── payment/           # 支付页面
│   ├── recharge/          # 充值页面
│   └── root/              # 根管理面板
└── logs/                  # 日志文件
```

---

## 🔧 功能模块

### 1. 支付与充值系统

- **在线充值**：支持微信支付监控，实时到账
- **订单管理**：完整的订单创建、查询、处理流程
- **积分比例**：可配置的充值积分比例（默认 1元 = 6积分）
- **支付验证**：防重复处理，支付时间窗口验证

### 2. 服务器管理

- **创建服务器**：自定义配置（内存、CPU、磁盘、端口）
- **续费管理**：手动续费和自动续费
- **Docker 镜像**：支持多种 Java 版本和 MCDReforged
- **资源限制**：可配置的资源上下限和价格公式

### 3. 积分系统

- **签到奖励**：每日签到获取积分，连续签到额外奖励
- **兑换码**：支持生成一次性或多次使用的兑换码
- **消费记录**：完整的积分消费和充值记录
- **每日消耗**：可配置的服务器每日积分消耗

### 4. QQ 机器人（OneBot）

- **账号绑定**：QQ 号与系统账号绑定
- **消息通知**：服务器状态、续费提醒等通知
- **群管理**：支持群内命令交互
- **验证码**：图片或文字验证码支持

### 5. 管理面板

- **用户管理**：查看、编辑用户信息和积分
- **订单管理**：订单查询和处理
- **服务器管理**：查看所有服务器状态
- **系统配置**：在线修改系统配置
- **公告管理**：发布系统公告

---

## ⚙️ 配置说明

### 核心配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `server.port` | 服务端口 | 3000 |
| `mcsm.panelUrl` | MCSManager 面板地址 | - |
| `mcsm.apiKey` | MCSManager API 密钥 | - |
| `renewal.pricePerDay` | 每天续费价格（积分） | 0.4 |
| `auth.method` | 认证方式 | mcsm_bcrypt |
| `checkin.basePoints` | 基础签到积分 | 10 |
| `autoRenewal.enabled` | 是否启用自动续费 | true |

### 自定义套餐价格公式

```yaml
auth:
  pointsFormula:
    memoryPerMB: 0.01      # 每 MB 内存的积分
    cpuPerPercent: 0.1     # 每 1% CPU 的积分
    diskPerGB: 0.5         # 每 GB 磁盘的积分
    perPort: 5             # 每个端口的积分
```

---

## 🤝 依赖项目

本项目依赖以下项目：

- **[MCSManager](https://github.com/MCSManager/MCSManager)** - Minecraft 服务器管理面板（必需）
- **[Dty](https://github.com/kqjs5174/Dty)** - 支付监控 Python 程序（可选）
- **[OneBot](https://github.com/botuniverse/onebot)** - QQ 机器人协议（可选）

---

## 📝 开发状态

> ⚠️ **注意**：本项目目前处于开发阶段，可能存在 Bug 和不稳定因素。

- ✅ 基础功能已完成
- ✅ 支付系统已完成
- ✅ 服务器管理已完成
- ✅ QQ 机器人集成已完成
- 🚧 Wiki 文档编写中

---

## 🛠️ 技术栈

- **后端**：Node.js + HTTP/HTTPS Server
- **数据存储**：JSON 文件存储
- **认证**：JWT + bcrypt
- **WebSocket**：ws 库
- **配置管理**：YAML
- **日志系统**：自定义 Logger
- **图形验证码**：svg-captcha + canvas

---

## 📄 许可证

本项目采用 ISC 许可证。详见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

- 感谢 MCSManager 团队提供优秀的面板系统
- 本项目在开发过程中使用了 AI 辅助工具
- 感谢所有贡献者和使用者的支持

---

## 📮 联系方式

- **Issues**：[GitHub Issues](https://github.com/kqjs5174/Wmp/issues)
- **开发者QQ** :3043711132

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！**

</div>
