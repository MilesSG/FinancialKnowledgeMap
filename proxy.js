const express = require('express')
const axios = require('axios')
const http = require('http')
const fs = require('fs')
const path = require('path')
const app = express()

// 全局变量，存储API状态
const apiStatus = {
  isApiHealthy: false,
  lastCheck: null,
  retryCount: 0
}

// 中间件设置
app.use(express.json({ limit: '1mb' }))  // 增加请求体大小限制
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// 记录请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.path}`)
  next()
})

// 提供proxy-port.json文件访问
app.get('/proxy-port.json', (req, res) => {
  if (fs.existsSync('./proxy-port.json')) {
    res.sendFile(path.resolve('./proxy-port.json'))
  } else {
    res.status(404).json({ error: '配置文件不存在' })
  }
})

// 添加根路径响应
app.get('/', (req, res) => {
  res.json({
    message: '星火大模型代理服务器运行中',
    status: 'running',
    endpoints: {
      spark: '/api/spark',
      test: '/api/test',
      health: '/health',
      root: '/'
    },
    time: new Date().toISOString()
  })
})

// 添加健康检查路由
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() })
})

// API代理路由 - 增加多种路径匹配
app.post(['/api/spark', '/spark', '/v2/chat/completions'], async (req, res) => {
  console.log('收到聊天请求:', JSON.stringify(req.body, null, 2).substring(0, 300) + '...')
  
  // 验证请求格式
  if (!req.body || !req.body.messages || !Array.isArray(req.body.messages)) {
    return res.status(400).json({
      error: '请求格式错误',
      message: '缺少必需的messages字段或格式不正确'
    })
  }
  
  try {
    const apiUrl = 'https://spark-api-open.xf-yun.com/v2/chat/completions'
    const headers = {
      'Authorization': 'Bearer wJuciuDpqjMYRDSvaUzi:lYUMNBCrLeajKFBMeaNZ',
      'Content-Type': 'application/json'
    }
    
    console.log('发送到星火API，消息数量:', req.body.messages.length)
    
    // 设置超时和重试策略
    const response = await axios.post(apiUrl, req.body, { 
      headers, 
      timeout: 30000,
      retry: 2,
      retryDelay: 1000
    })
    
    console.log('星火API响应状态:', response.status)
    apiStatus.isApiHealthy = true
    apiStatus.lastCheck = new Date()
    apiStatus.retryCount = 0
    
    res.json(response.data)
  } catch (e) {
    console.error('错误详情:', e.message)
    
    // 打印更详细的错误信息
    if (e.response) {
      // 服务器响应了，但状态码不是2xx
      console.error('服务器响应状态码:', e.response.status)
      console.error('响应头:', JSON.stringify(e.response.headers, null, 2))
      console.error('响应数据:', JSON.stringify(e.response.data, null, 2))
      
      // 如果是授权错误，特别标记
      if (e.response.status === 401) {
        apiStatus.isApiHealthy = false
        console.error('API密钥可能无效，请检查授权信息')
      }
    } else if (e.request) {
      // 请求已发送但没有收到响应
      console.error('没有收到响应，请求超时或网络错误')
      apiStatus.isApiHealthy = false
    } else {
      // 设置请求时发生错误
      console.error('请求配置错误:', e.message)
    }
    
    apiStatus.lastCheck = new Date()
    apiStatus.retryCount++
    
    res.status(500).json({ 
      error: e.toString(), 
      details: e.response?.data || '没有详细错误信息',
      message: '请求星火API失败',
      code: e.response?.status || 500,
      time: new Date().toISOString(),
      suggestion: '请检查网络连接和API密钥是否有效'
    })
  }
})

// 测试路由，用于检查代理服务是否正常 - 增加多种路径匹配
app.get(['/api/test', '/test', '/status'], (req, res) => {
  const serverInfo = {
    status: 'ok',
    message: '代理服务正常运行',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    memory: process.memoryUsage(),
    apiEndpoint: '/api/spark',
    apiStatus: {
      isHealthy: apiStatus.isApiHealthy,
      lastCheck: apiStatus.lastCheck,
      retryCount: apiStatus.retryCount 
    },
    serverUptime: process.uptime() + '秒'
  }
  console.log('健康检查请求，响应:', serverInfo)
  res.json(serverInfo)
})

// 处理404错误
app.use((req, res) => {
  console.log(`404未找到: ${req.method} ${req.path}`)
  res.status(404).json({
    error: '未找到请求的资源',
    path: req.path,
    method: req.method,
    availableEndpoints: ['/api/spark', '/api/test', '/health', '/'],
    suggestion: '请检查URL是否正确'
  })
})

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err)
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message
  })
})

// 动态查找可用端口
function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = http.createServer()
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // 当前端口被占用，尝试下一个端口
        console.log(`端口 ${startPort} 已被占用，尝试下一个端口...`)
        findAvailablePort(startPort + 1).then(resolve).catch(reject)
      } else {
        reject(err)
      }
    })
    
    server.listen(startPort, () => {
      const { port } = server.address()
      server.close(() => {
        resolve(port)
      })
    })
  })
}

// 启动服务器
async function startServer() {
  try {
    const port = await findAvailablePort(3001)
    
    const server = app.listen(port, () => {
      console.log('\x1b[32m%s\x1b[0m', `┌─────────────────────────────────────────┐`)
      console.log('\x1b[32m%s\x1b[0m', `│                                         │`)
      console.log('\x1b[32m%s\x1b[0m', `│  星火大模型代理服务器启动成功!              │`)
      console.log('\x1b[32m%s\x1b[0m', `│                                         │`)
      console.log('\x1b[32m%s\x1b[0m', `│  运行地址: http://localhost:${port}        │`)
      console.log('\x1b[32m%s\x1b[0m', `│  API端点: http://localhost:${port}/api/spark │`)
      console.log('\x1b[32m%s\x1b[0m', `│  测试端点: http://localhost:${port}/api/test │`)
      console.log('\x1b[32m%s\x1b[0m', `│                                         │`)
      console.log('\x1b[32m%s\x1b[0m', `│  请确保前端应用的API地址设置正确!           │`)
      console.log('\x1b[32m%s\x1b[0m', `│                                         │`)
      console.log('\x1b[32m%s\x1b[0m', `└─────────────────────────────────────────┘`)
      
      // 保存端口号到文件，便于前端读取
      const portData = JSON.stringify({ 
        port,
        updated: new Date().toISOString()
      }, null, 2)
      
      fs.writeFileSync('proxy-port.json', portData)
      console.log(`端口信息已保存到 proxy-port.json (${port})`)
    })
    
    // 优雅关闭
    process.on('SIGINT', () => {
      console.log('接收到关闭信号，正在关闭服务...')
      server.close(() => {
        console.log('服务器已正常关闭')
        process.exit(0)
      })
    })
  } catch (err) {
    console.error('启动服务器失败:', err)
  }
}

// 定期检查API连接
function checkApiConnection() {
  axios.get('https://spark-api-open.xf-yun.com/v1/api/status', {
    timeout: 5000,
    headers: {
      'Authorization': 'Bearer wJuciuDpqjMYRDSvaUzi:lYUMNBCrLeajKFBMeaNZ'
    }
  }).then(() => {
    console.log('星火API连接正常 -', new Date().toLocaleString())
    apiStatus.isApiHealthy = true
    apiStatus.lastCheck = new Date()
  }).catch(err => {
    console.error('星火API连接异常 -', new Date().toLocaleString(), err.message)
    apiStatus.isApiHealthy = false
    apiStatus.lastCheck = new Date()
  })
}

// 服务启动时检查一次，然后每5分钟检查一次
checkApiConnection()
setInterval(checkApiConnection, 5 * 60 * 1000)

startServer() 