# 🌐 金融知识图谱可视化系统

## 📝 项目介绍

这是一个基于Vue 3和ECharts的金融学知识图谱可视化系统，旨在直观展示金融领域的知识点及其关联关系。系统采用现代化的苹果风格UI设计，提供交互式图谱浏览、搜索和问答功能。问答功能集成了讯飞星火大模型API，提供专业的金融学问答服务。

## ✨ 核心特性

- 🔍 **交互式知识图谱**：支持缩放、拖拽和节点点击，直观展示金融概念之间的关系
- 🏷️ **类别筛选**：根据不同的金融类别筛选知识点，便于专注探索特定领域
- 🔎 **智能搜索**：快速查找特定金融知识点，支持关键词和类别组合搜索
- 💬 **智能问答**：集成讯飞星火大模型API，提供专业的金融知识问答服务
- 🌓 **明暗主题**：支持自动根据系统设置切换明暗主题，提供舒适的浏览体验
- 📱 **响应式设计**：适配各种屏幕尺寸，包括桌面端和移动端设备

## 🔧 技术栈

- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **状态管理**：Pinia
- **路由管理**：Vue Router
- **图表库**：ECharts
- **UI组件**：Element Plus + Tailwind CSS
- **工具库**：VueUse
- **AI模型**：讯飞星火大模型X1 API
- **后端代理**：Express.js + Axios

## 📦 安装与运行

### 前提条件

- Node.js 16+
- npm 8+
- 讯飞星火API账号（用于问答功能）

### 安装步骤

1. 克隆项目仓库

```bash
git clone https://github.com/yourusername/financial-knowledge-map.git
```

2. 安装依赖

```bash
# 安装根目录依赖（用于代理服务）
cd FinancialKnowledgeMap
npm init -y
npm install express axios

# 安装前端依赖
cd financial-knowledge-map
npm install
```

3. 配置API密钥（可选，已内置默认密钥）
   编辑项目根目录的`proxy.js`文件，星火API密钥部分默认已配置：

```js
const headers = {
  'Authorization': 'Bearer wJuciuDpqjMYRDSvaUzi:lYUMNBCrLeajKFBMeaNZ',
  'Content-Type': 'application/json'
}
```

### 启动系统（详细步骤）

**重要：必须先启动代理服务，再启动前端应用**

1. **第一步：启动代理服务**

   - 打开一个终端窗口
   - 确保位于项目根目录 `D:\Thesis_Revision\Projects_Code\FinancialKnowledgeMap`
   - **注意**：proxy.js文件应位于项目根目录，不是financial-knowledge-map子目录
   - 运行以下命令启动代理服务：

   ```bash
   # 在Windows PowerShell中
   node ./proxy.js
   ```

   - 成功启动后将看到以下输出：

   ```
   ┌─────────────────────────────────────────┐
   │                                         │
   │  星火大模型代理服务器启动成功!              │
   │                                         │
   │  运行地址: http://localhost:3001        │
   │  API端点: http://localhost:3001/api/spark │
   │                                         │
   │  请确保前端应用的API地址设置正确!           │
   │                                         │
   └─────────────────────────────────────────┘
   ```

   - 服务会自动选择可用端口，如果3001被占用，将使用3002或更高端口
   - **重要**：保持此终端窗口打开，关闭会导致代理服务停止

2. **第二步：启动前端应用**

   - 打开另一个新的终端窗口
   - 进入金融知识图谱目录
   - 运行以下命令启动前端服务：

   ```bash
   # 在Windows PowerShell中 (注意：PowerShell不支持&&操作符)
   cd financial-knowledge-map ; npm run dev
   ```

   - 启动成功后会显示如下信息：

   ```
   > financial-knowledge-map@0.1.0 dev
   > vite --port 3002
     VITE v6.3.5  ready in 282 ms     
     ➜  Local:   http://localhost:3002/
     ➜  Network: use --host to expose 
     ➜  press h + enter to show help  
   ```

3. **第三步：访问系统**

   - 打开浏览器
   - 访问：http://localhost:3002
   - 此时系统已完全启动，可以开始使用

**Windows PowerShell特别注意事项**：

- PowerShell不支持 `&&` 运算符来连接命令，会出现 `标记"&&"不是此版本中的有效语句分隔符` 错误

- 在PowerShell中，请使用分号 `;` 来分隔命令，例如：`cd financial-knowledge-map ; npm run dev`

- 或者执行两条单独的命令：

  ```powershell
  cd financial-knowledge-map
  npm run dev
  ```

**故障排查**：

- 如果前端页面显示 `代理服务未连接`：
  1. 确认代理服务终端窗口是否显示了成功启动信息
  2. 检查代理服务使用的端口（启动信息中会显示）
  3. 在前端问答页面点击 `(代理服务未连接 - 点击重试)` 重新尝试连接
  4. 如果仍然无法连接，重启代理服务和前端应用

- 如果问答功能无法正常工作：
  1. 检查网络连接是否正常
  2. 确认代理服务终端窗口中是否有错误信息
  3. 验证API密钥是否有效（在proxy.js中检查）

## 🧩 项目结构

```
D:\Thesis_Revision\Projects_Code\FinancialKnowledgeMap\  <-- 项目根目录
├── proxy.js                               <-- 代理服务器文件
├── package.json                           <-- 根目录npm配置
└── financial-knowledge-map\               <-- 前端项目子目录
    ├── public/                  # 静态资源
    │   └── data/                # 知识图谱数据
    │       └── knowledge-graph.json
    ├── src/                     # 源代码
    │   ├── assets/              # 资源文件
    │   ├── router/              # Vue Router配置
    │   ├── stores/              # Pinia状态管理
    │   │   └── knowledge.ts     # 知识图谱数据存储
    │   ├── views/               # 页面组件
    │   │   ├── Home.vue         # 首页
    │   │   ├── Graph.vue        # 知识图谱页面
    │   │   ├── Search.vue       # 搜索页面
    │   │   └── QA.vue           # 问答页面（星火大模型集成）
    │   ├── App.vue              # 主应用组件
    │   └── main.ts              # 应用入口
    └── package.json             # 前端项目配置文件
```

## 🎮 使用说明

### 知识图谱浏览

- 点击界面上的"知识图谱"导航按钮进入图谱页面
- 使用鼠标滚轮或触控板缩放图谱
- 拖拽图谱背景可移动视图
- 点击节点查看知识点详情
- 使用类别筛选器聚焦于特定类别的知识点
- 点击"全屏显示"按钮进入全屏模式

### 搜索功能

- 点击界面上的"搜索"导航按钮进入搜索页面
- 在搜索框中输入关键词
- 使用类别筛选和排序选项优化搜索结果
- 点击搜索结果中的"查看详情"进入图谱视图，定位到相关节点

### 智能问答（集成星火大模型）

- 点击界面上的"问答"导航按钮进入问答页面
- 在输入框中提问金融相关问题
- 系统将调用讯飞星火X1大模型进行回答
- 支持连续对话，可持续提问相关问题深入了解
- 回答内容基于最新的金融知识和数据

## 🔌 API代理说明

本系统使用Node.js代理解决跨域问题，处理前端到讯飞星火API的请求转发：

- 代理运行于本地3001端口（或自动选择的其他可用端口）
- 前端请求发送到 `http://localhost:3001/api/spark`
- 代理将请求转发到 `https://spark-api-open.xf-yun.com/v2/chat/completions`
- 代理自动处理跨域和授权问题

## 📄 数据来源

本系统的知识图谱数据基于以下权威机构的官方文件、政策法规和研究报告构建：

- 中国人民银行
- 中国银行保险监督管理委员会
- 中国证券监督管理委员会
- 中华人民共和国财政部

智能问答功能基于讯飞星火X1大模型，可提供实时专业的金融知识解答。

## 📱 兼容性

- 主流现代浏览器（Chrome, Firefox, Safari, Edge等）
- 移动设备（iOS, Android）

## 🔒 隐私声明

本应用在本地处理知识图谱数据。问答功能需要将用户问题发送至讯飞星火API进行处理，请避免在问题中包含敏感个人信息。

## 📝 许可证

MIT 
