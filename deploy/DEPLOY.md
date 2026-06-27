# 优势星测 · 部署手册

## 前置条件
- 腾讯云 2核4G6M 轻量应用服务器（已购买）
- 域名 xingsujiaclub.cn（已备案，DNS 指向服务器 IP）

---

## 第一步：服务器环境安装

```bash
# 1. 更新系统
apt update && apt upgrade -y

# 2. 安装 Node.js v20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v  # 确认 v20.x

# 3. 安装 PM2
npm install -g pm2

# 4. 安装 Nginx
apt install -y nginx

# 5. 安装 certbot（SSL 证书）
apt install -y certbot python3-certbot-nginx
```

## 第二步：上传代码

```bash
# 在服务器上创建目录
mkdir -p /var/www/star-mom-astrology

# 方式一：从本地 scp 上传
# 在你本地电脑执行：
scp -r /path/to/star-mom-astrology/* root@服务器IP:/var/www/star-mom-astrology/

# 方式二：（推荐）用 git
# 先在服务器上配好 git，然后：
cd /var/www/star-mom-astrology
git init
git remote add origin git@github.com:你的仓库地址.git
git pull origin master
```

## 第三步：安装依赖 + 构建

```bash
cd /var/www/star-mom-astrology

# 安装依赖
npm install

# 配置环境变量（复制 .env.example 填入 Key）
cp .env.example .env
# 编辑 .env：填入 DEEPSEEK_API_KEY=sk-your-key

# 构建前端
npm run build
# 确认 dist/ 目录生成成功
ls dist/  # 应有 index.html + assets/ + admin.html
```

## 第四步：配置 Nginx

```bash
# 复制 Nginx 配置
cp deploy/nginx.conf /etc/nginx/sites-available/star-mom-astrology

# 启用站点
ln -s /etc/nginx/sites-available/star-mom-astrology /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 申请 SSL 证书
certbot --nginx -d xingsujiaclub.cn

# 重载 Nginx
systemctl reload nginx
```

## 第五步：启动 API 服务

```bash
cd /var/www/star-mom-astrology

# 用 PM2 启动（使用 ecosystem 配置，自动加载 .env）
pm2 start deploy/ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save

# 确认运行
pm2 list
pm2 logs star-mom-api --lines 20
```

## 第六步：微信支付配置

在商户平台完成以下配置，否则 JSAPI 支付会失败：

1. **公众号配置（mp.weixin.qq.com）**
   - 开发 → 基本配置 → 获取 AppSecret
   - 设置 → 公众号设置 → 功能设置 → 网页授权域名 → 添加 `xingsujiaclub.cn`

2. **商户平台配置（pay.weixin.qq.com）**
   - 产品中心 → JSAPI支付 → 已开通（确认）
   - 产品中心 → 开发配置 → 支付配置 → 公众号支付 → 设置 `xingsujiaclub.cn`

3. **`.env` 文件（服务器上）**
   ```
   WECHAT_APPID=wxcb5d7e842424ad5b
   WECHAT_APPSECRET=你的公众号AppSecret
   WECHAT_MCHID=1659121573
   WECHAT_API_KEY=你的APIv2密钥
   WECHAT_NOTIFY_URL=https://xingsujiaclub.cn/api/payment/notify
   ```

---

## 第七步：验证上线

在浏览器访问 https://xingsujiaclub.cn 确认：
- [ ] 首页正常加载
- [ ] 生成报告正常（星盘计算 + DeepSeek 调用）
- [ ] 评论可以提交
- [ ] 管理后台 https://xingsujiaclub.cn/admin.html 登录正常
- [ ] 推广链接带 ?distributor=CODE 正常
- [ ] 埋点数据能查到

## 后续迭代命令

```bash
# 修改前端后
npm run build && cp admin.html dist/

# 修改后端后
pm2 restart star-mom-api

# 查看日志
pm2 logs star-mom-api

# 查看状态
pm2 status
```
