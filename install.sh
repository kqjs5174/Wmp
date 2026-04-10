#!/bin/bash

# Wmp 自动安装脚本
# 用法: ./install.sh [GitHub仓库URL]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认配置
GITHUB_REPO="${1:-kqjs5174/Wmp}"
INSTALL_DIR="/opt/wmp"
TEMP_DIR="/tmp/wmp_temp"

echo -e "${GREEN}=== Wmp 自动安装脚本 ===${NC}"
echo ""

# 检查是否有 root 权限
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}错误: 请使用 root 权限运行此脚本${NC}"
    echo "使用: sudo $0 $@"
    exit 1
fi

# 检查必要的命令
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}错误: 未找到 $1 命令，请先安装${NC}"
        exit 1
    fi
}

echo "检查依赖..."
check_command curl
check_command unzip
check_command node
check_command npm

# 获取最新 release 下载链接
echo -e "${YELLOW}正在获取最新版本...${NC}"
LATEST_RELEASE=$(curl -s "https://api.github.com/repos/${GITHUB_REPO}/releases/latest")
DOWNLOAD_URL=$(echo "$LATEST_RELEASE" | grep "zipball_url" | cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
    echo -e "${RED}错误: 无法获取最新版本，请检查仓库地址${NC}"
    exit 1
fi

VERSION=$(echo "$LATEST_RELEASE" | grep '"tag_name"' | cut -d '"' -f 4)
echo -e "${GREEN}找到最新版本: ${VERSION}${NC}"

# 清理旧的临时文件
if [ -d "$TEMP_DIR" ]; then
    echo "清理临时文件..."
    rm -rf "$TEMP_DIR"
fi

# 下载最新版本
echo -e "${YELLOW}正在下载...${NC}"
mkdir -p "$TEMP_DIR"
curl -L "$DOWNLOAD_URL" -o "$TEMP_DIR/wmp.zip"

# 解压
echo -e "${YELLOW}正在解压...${NC}"
unzip -q "$TEMP_DIR/wmp.zip" -d "$TEMP_DIR"

# 查找解压后的目录
EXTRACTED_DIR=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)

# 备份旧版本（如果存在）
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}备份旧版本...${NC}"
    BACKUP_DIR="${INSTALL_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    mv "$INSTALL_DIR" "$BACKUP_DIR"
    echo -e "${GREEN}旧版本已备份到: ${BACKUP_DIR}${NC}"
fi

# 创建 /opt 目录（如果不存在）
mkdir -p /opt

# 移动到安装目录
echo -e "${YELLOW}安装到 ${INSTALL_DIR}...${NC}"
mv "$EXTRACTED_DIR" "$INSTALL_DIR"

# 设置目录权限
chown -R root:root "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"

# 清理临时文件
rm -rf "$TEMP_DIR"

# 进入安装目录
cd "$INSTALL_DIR"

# 安装主项目依赖
echo -e "${YELLOW}安装主项目依赖...${NC}"
npm install --production

# 安装 bot 依赖
if [ -d "bot" ]; then
    echo -e "${YELLOW}安装 bot 依赖...${NC}"
    cd bot
    npm install --production
    cd ..
fi

# 创建必要的目录
mkdir -p data logs bot/logs bot/temp

echo ""
echo -e "${GREEN}=== 安装完成！ ===${NC}"
echo ""
echo "下一步操作："
echo "1. 编辑配置文件: nano $INSTALL_DIR/config.yml"
echo "2. 启动主服务: cd $INSTALL_DIR && npm start"
echo "3. 启动 bot: cd $INSTALL_DIR/bot && npm start"
echo ""
echo -e "${YELLOW}提示: 你可以使用 pm2 或 systemd 来管理服务${NC}"
echo ""
echo "安装位置: $INSTALL_DIR"
