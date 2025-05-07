<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'

interface Message {
  role: 'user' | 'assistant'
  content: string
  time: string
}

// 不使用固定端口，改用动态发现
const proxyUrl = ref('')
const apiUrl = ref('')
const commonPorts = [3001, 3002, 3003, 3004, 3005] // 常用端口
const connectionInterval = ref<number | null>(null)
const discoveryInProgress = ref(false)

// 消息状态
const messages = ref<Message[]>([
  {
    role: 'assistant',
    content: '欢迎使用金融知识问答系统！请提出您的金融学相关问题。',
    time: new Date().toLocaleTimeString()
  }
])
const input = ref('')
const isLoading = ref(false)
const chatContainer = ref<HTMLDivElement | null>(null)
const isProxyConnected = ref(false)
const manualUrl = ref('')
const showManualInput = ref(false)

// 清空对话
function clearChat() {
  messages.value = [
    {
      role: 'assistant',
      content: '对话已清空。请继续提问金融学相关问题。',
      time: new Date().toLocaleTimeString()
    }
  ]
  scrollToBottom()
}

// 滚动到底部
function scrollToBottom() {
  setTimeout(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  }, 10)
}

// 设置手动URL
function setManualUrl() {
  if (!manualUrl.value || !manualUrl.value.startsWith('http')) {
    ElMessage.warning('请输入有效的URL，以http://开头')
    return
  }
  
  proxyUrl.value = manualUrl.value.trim()
  if (!proxyUrl.value.endsWith('/')) {
    proxyUrl.value += '/'
  }
  
  apiUrl.value = `${proxyUrl.value}api/spark`
  showManualInput.value = false
  
  // 测试连接
  testProxyConnection()
}

// 直接使用客户端来尝试连接不同端口
async function discoverProxyServer() {
  if (discoveryInProgress.value) return
  
  discoveryInProgress.value = true
  isProxyConnected.value = false
  
  console.log('开始自动发现代理服务器...')
  
  // 首先尝试从配置文件获取
  try {
    const response = await fetch('/proxy-port.json?t=' + Date.now(), {
      cache: 'no-cache'
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data && data.port) {
        const port = data.port
        console.log(`从配置文件读取端口: ${port}`)
        
        const url = `http://localhost:${port}`
        const connected = await testUrl(url)
        
        if (connected) {
          console.log(`成功连接到代理服务: ${url}`)
          proxyUrl.value = url.endsWith('/') ? url : url + '/'
          apiUrl.value = `${proxyUrl.value}api/spark`
          isProxyConnected.value = true
          discoveryInProgress.value = false
          return
        }
      }
    }
  } catch (e) {
    console.log('读取配置文件失败，尝试常用端口')
  }
  
  // 然后尝试常用端口
  for (const port of commonPorts) {
    const url = `http://localhost:${port}`
    console.log(`尝试连接到: ${url}`)
    
    const connected = await testUrl(url)
    
    if (connected) {
      console.log(`成功连接到代理服务: ${url}`)
      proxyUrl.value = url.endsWith('/') ? url : url + '/'
      apiUrl.value = `${proxyUrl.value}api/spark`
      isProxyConnected.value = true
      discoveryInProgress.value = false
      return
    }
  }
  
  console.log('未找到可用的代理服务')
  isProxyConnected.value = false
  ElMessage.warning('无法自动发现代理服务，请确保代理服务已启动或手动设置地址')
  discoveryInProgress.value = false
}

// 测试特定URL是否可连接
async function testUrl(url: string): Promise<boolean> {
  try {
    // 先尝试测试端点
    const testUrl = url.endsWith('/') ? `${url}api/test` : `${url}/api/test`
    const response = await fetch(testUrl, { 
      cache: 'no-cache',
      mode: 'cors',
      timeout: 1000 // 使用AbortController代替，因为fetch不直接支持timeout
    })
    
    if (response.ok) {
      return true
    }
    
    // 再尝试根路径
    const rootResponse = await fetch(url, { cache: 'no-cache' })
    return rootResponse.ok
    
  } catch (e) {
    return false
  }
}

// 测试代理连接
async function testProxyConnection() {
  if (!proxyUrl.value) {
    await discoverProxyServer()
    return
  }
  
  try {
    const testEndpoint = `${proxyUrl.value}api/test`.replace('//', '/')
    console.log('测试代理连接:', testEndpoint)
    
    const response = await fetch(testEndpoint)
    
    if (response.ok) {
      isProxyConnected.value = true
      console.log('代理服务连接成功')
      ElMessage.success('已连接到星火大模型代理服务')
      
      // 连接成功，停止自动重连
      if (connectionInterval.value) {
        clearInterval(connectionInterval.value)
        connectionInterval.value = null
      }
    } else {
      console.error('代理服务连接失败, 状态码:', response.status)
      isProxyConnected.value = false
      ElMessage.warning('代理服务未连接，正在尝试重新发现服务')
      discoverProxyServer()
    }
  } catch (e) {
    console.error('代理服务连接异常:', e)
    isProxyConnected.value = false
    ElMessage.warning('无法连接到代理服务，正在尝试重新发现服务')
    discoverProxyServer()
  }
}

// 启动自动重连
function startAutoReconnect() {
  // 如果已经有定时器，先清除
  if (connectionInterval.value) {
    clearInterval(connectionInterval.value)
  }
  
  // 设置新的定时器，每5秒尝试重连一次
  connectionInterval.value = setInterval(() => {
    if (!isProxyConnected.value && !discoveryInProgress.value) {
      console.log('自动重连中...')
      discoverProxyServer()
    }
  }, 5000) as unknown as number
}

// 发送消息
async function sendMessage() {
  if (!input.value.trim()) return
  
  // 检查代理服务是否连接
  if (!isProxyConnected.value) {
    await testProxyConnection()
    if (!isProxyConnected.value) {
      ElMessage.error('未连接到代理服务，无法发送消息')
      return
    }
  }
  
  const userMsg: Message = {
    role: 'user',
    content: input.value,
    time: new Date().toLocaleTimeString()
  }
  messages.value.push(userMsg)
  input.value = ''
  isLoading.value = true
  scrollToBottom()

  try {
    console.log('发送请求到:', apiUrl.value)
    
    // 只使用最近5条消息，避免上下文过长
    const recentMessages = messages.value.slice(-5)
    
    const data = {
      model: 'x1',
      messages: [
        { role: 'system', content: '你是知识渊博的金融学助理，请用简明中文回答金融学相关问题。' },
        ...recentMessages.map(m => ({ role: m.role, content: m.content }))
      ],
      stream: false,
      temperature: 0.7,
      max_tokens: 800
    }
    
    const header = {
      'Content-Type': 'application/json'
    }
    
    const loading = ElLoading.service({
      lock: true,
      text: '正在思考中...',
      background: 'rgba(255, 255, 255, 0.7)'
    })
    
    // 30秒超时
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 30000)
    
    const res = await fetch(apiUrl.value, {
      method: 'POST',
      headers: header,
      body: JSON.stringify(data),
      signal: abortController.signal
    })
    
    clearTimeout(timeoutId)
    loading.close()
    
    if (!res.ok) {
      throw new Error(`请求错误: ${res.status}`)
    }
    
    const result = await res.json()
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('API返回格式错误')
    }
    
    const aiContent = result.choices[0].message.content.trim() || '很抱歉，暂时无法回答您的问题。'
    messages.value.push({
      role: 'assistant',
      content: aiContent,
      time: new Date().toLocaleTimeString()
    })
  } catch (e) {
    console.error('API调用错误:', e)
    
    if (e.name === 'AbortError') {
      ElMessage.error('请求超时，请稍后再试')
    } else {
      ElMessage.error('请求失败，请稍后再试')
    }
    
    messages.value.push({
      role: 'assistant',
      content: '很抱歉，无法获取回答。请检查网络连接或稍后再试。',
      time: new Date().toLocaleTimeString()
    })
    
    // 请求失败，可能是代理服务出问题，标记为未连接并尝试重新发现
    isProxyConnected.value = false
    startAutoReconnect()
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// 组件挂载时自动发现代理服务
onMounted(() => {
  discoverProxyServer()
  startAutoReconnect()
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (connectionInterval.value) {
    clearInterval(connectionInterval.value)
  }
})
</script>

<template>
  <div class="qa-container">
    <!-- 页面标题区 -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">金融知识问答</h1>
        <p class="hero-subtitle">使用人工智能解答您的金融疑问</p>
      </div>
    </section>

    <!-- 主要内容区 -->
    <section class="chat-section">
      <!-- 状态指示器 -->
      <div class="connection-status" :class="{ 'is-connected': isProxyConnected }">
        <span v-if="isProxyConnected" class="status-indicator">
          <span class="status-dot"></span>已连接
        </span>
        <div v-else class="connection-actions">
          <button
            @click="discoverProxyServer"
            :disabled="discoveryInProgress"
            class="action-button reconnect-button"
          >
            {{ discoveryInProgress ? '连接中...' : '重试连接' }}
          </button>
          <button
            @click="showManualInput = !showManualInput"
            class="action-button configure-button"
          >
            手动设置
          </button>
        </div>
      </div>

      <!-- 手动设置URL浮层 -->
      <div v-if="showManualInput" class="manual-input-panel">
        <div class="panel-title">输入代理服务器地址</div>
        <div class="panel-form">
          <input
            v-model="manualUrl"
            type="text"
            placeholder="http://localhost:3001"
            class="url-input"
          />
          <div class="panel-actions">
            <button @click="setManualUrl" class="action-button confirm-button">连接</button>
            <button @click="showManualInput = false" class="action-button cancel-button">取消</button>
          </div>
        </div>
      </div>

      <!-- 聊天界面 -->
      <div class="chat-interface">
        <!-- 消息列表 -->
        <div ref="chatContainer" class="message-list">
          <div
            v-for="(msg, idx) in messages"
            :key="idx"
            class="message-item"
            :class="{ 'user-message': msg.role === 'user', 'ai-message': msg.role === 'assistant' }"
          >
            <div class="message-avatar" :class="msg.role">
              <span>{{ msg.role === 'user' ? '您' : 'AI' }}</span>
            </div>
            <div class="message-bubble">
              <div class="message-content">{{ msg.content }}</div>
              <div class="message-time">{{ msg.time }}</div>
            </div>
          </div>
          
          <!-- 加载状态 -->
          <div v-if="isLoading" class="loading-indicator">
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span class="loading-text">正在思考...</span>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <button
            @click="clearChat"
            class="clear-button"
            :disabled="isLoading"
          >
            清空对话
          </button>
          <div class="message-input-wrapper">
            <input
              v-model="input"
              placeholder="请输入您的金融学问题..."
              class="message-input"
              @keyup.enter="sendMessage"
              :disabled="isLoading || !isProxyConnected"
            />
            <button
              @click="sendMessage"
              class="send-button"
              :disabled="isLoading || !isProxyConnected || !input.trim()"
            >
              发送
            </button>
          </div>
        </div>

        <!-- 底部信息 -->
        <div class="info-footer">
          <p>本问答系统基于AI大模型，答案仅供学习参考</p>
          <p v-if="proxyUrl">当前连接: {{ proxyUrl }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 全局样式 */
.qa-container {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: #1d1d1f;
  width: 100%;
  min-height: calc(100vh - 12rem);
  background-color: #fff;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 英雄区域 */
.hero-section {
  background: linear-gradient(160deg, #f5f5f7 0%, #ffffff 100%);
  padding: 3rem 0;
  text-align: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.hero-content {
  max-width: 700px;
  margin: 0 auto;
  padding: 0 2rem;
}

.hero-title {
  font-size: 3rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 0 0 0.5rem;
  color: #1d1d1f;
  background: linear-gradient(90deg, #1d1d1f, #434344);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.25rem;
  font-weight: 400;
  color: #86868b;
  letter-spacing: -0.01em;
  margin: 0;
  max-width: 600px;
  margin: 0 auto;
}

/* 聊天区域 */
.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 0 2rem;
  position: relative;
}

.connection-status {
  position: absolute;
  top: -1.5rem;
  right: 2rem;
  background-color: rgba(245, 245, 247, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 1.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #0071e3;
  font-weight: 500;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: #0071e3;
  display: inline-block;
}

.connection-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  border-radius: 1.5rem;
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  background: transparent;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.reconnect-button {
  color: #fff;
  background-color: #ff3b30;
  border-color: #ff3b30;
}

.reconnect-button:hover:not(:disabled) {
  background-color: #e73229;
}

.configure-button {
  color: #86868b;
  border-color: #86868b;
}

.configure-button:hover {
  color: #1d1d1f;
  border-color: #1d1d1f;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 手动设置面板 */
.manual-input-panel {
  position: absolute;
  top: 1.5rem;
  right: 2rem;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 1rem;
  padding: 1rem;
  width: 20rem;
  z-index: 20;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.05);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { transform: translateY(-0.5rem); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
  color: #1d1d1f;
}

.panel-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.url-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid #d2d2d7;
  background-color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s ease;
}

.url-input:focus {
  border-color: #0071e3;
  box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.15);
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.confirm-button {
  background-color: #0071e3;
  color: white;
  border-color: #0071e3;
}

.confirm-button:hover {
  background-color: #0077ed;
}

.cancel-button {
  color: #86868b;
  border-color: #d2d2d7;
}

.cancel-button:hover {
  color: #1d1d1f;
  border-color: #1d1d1f;
}

/* 聊天界面 */
.chat-interface {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 2rem;
  gap: 1.5rem;
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
}

.message-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background-color: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  overflow-y: auto;
  min-height: 55vh;
  max-height: 55vh;
}

.message-item {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  max-width: 80%;
}

.user-message {
  margin-left: auto;
  flex-direction: row-reverse;
}

.ai-message {
  margin-right: auto;
}

.message-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: 600;
  font-size: 0.875rem;
}

.message-avatar.user {
  background-color: #f5f5f7;
  color: #1d1d1f;
}

.message-avatar.assistant {
  background: linear-gradient(135deg, #0071e3, #42a1ec);
  color: white;
}

.message-bubble {
  border-radius: 1.25rem;
  padding: 1rem 1.25rem;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  max-width: calc(100% - 3.25rem);
}

.user-message .message-bubble {
  background: linear-gradient(135deg, #0071e3, #42a1ec);
  color: white;
  border-top-right-radius: 0;
}

.ai-message .message-bubble {
  background-color: #f5f5f7;
  color: #1d1d1f;
  border-top-left-radius: 0;
}

.message-content {
  font-size: 0.9375rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  letter-spacing: -0.01em;
}

.message-time {
  font-size: 0.75rem;
  text-align: right;
  margin-top: 0.5rem;
}

.user-message .message-time {
  opacity: 0.8;
}

.ai-message .message-time {
  color: #86868b;
}

/* 加载指示器 */
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  align-self: flex-start;
  padding: 0.75rem 1.25rem;
  background-color: #f5f5f7;
  border-radius: 2rem;
  margin: 0.5rem 0;
}

.loading-dots {
  display: flex;
  gap: 0.25rem;
}

.loading-dots span {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: #0071e3;
  display: inline-block;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% { 
    transform: scale(0);
  } 
  40% { 
    transform: scale(1);
  }
}

.loading-text {
  font-size: 0.875rem;
  color: #86868b;
}

/* 输入区域 */
.input-area {
  display: flex;
  gap: 1rem;
  margin: 0.5rem 0 1.5rem;
  align-items: center;
}

.clear-button {
  background-color: transparent;
  color: #86868b;
  border: 1px solid #d2d2d7;
  border-radius: 2rem;
  padding: 0.75rem 1.25rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.clear-button:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.03);
  color: #1d1d1f;
}

.clear-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.message-input-wrapper {
  flex: 1;
  position: relative;
}

.message-input {
  width: 100%;
  padding: 0.875rem 6rem 0.875rem 1.5rem;
  border-radius: 2rem;
  border: 1px solid #d2d2d7;
  background-color: rgba(255, 255, 255, 0.8);
  font-size: 0.9375rem;
  outline: none;
  transition: all 0.2s ease;
}

.message-input:focus {
  border-color: #0071e3;
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.15);
}

.message-input:disabled {
  background-color: rgba(0, 0, 0, 0.03);
  cursor: not-allowed;
}

.send-button {
  position: absolute;
  right: 0.3125rem;
  top: 0.3125rem;
  background: linear-gradient(135deg, #0071e3, #42a1ec);
  color: white;
  border: none;
  border-radius: 1.75rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 113, 227, 0.2);
}

.send-button:active:not(:disabled) {
  transform: translateY(0);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 底部信息 */
.info-footer {
  text-align: center;
  color: #86868b;
  font-size: 0.75rem;
  padding: 0 1rem;
  line-height: 1.5;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-subtitle {
    font-size: 1rem;
  }
  
  .chat-section {
    padding: 0 1rem;
  }
  
  .message-item {
    max-width: 90%;
  }
  
  .connection-status {
    right: 1rem;
  }
  
  .manual-input-panel {
    width: calc(100% - 2rem);
    right: 1rem;
  }
  
  .input-area {
    flex-direction: column;
  }
  
  .clear-button {
    width: 100%;
  }
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  .qa-container {
    background-color: #000;
    color: #f5f5f7;
  }
  
  .hero-section {
    background: linear-gradient(160deg, #1d1d1f 0%, #000 100%);
  }
  
  .hero-title {
    background: linear-gradient(90deg, #f5f5f7, #a1a1a6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .message-list {
    background-color: rgba(0, 0, 0, 0.5);
    border-color: rgba(255, 255, 255, 0.08);
  }
  
  .ai-message .message-bubble {
    background-color: #1d1d1f;
    color: #f5f5f7;
  }
  
  .message-avatar.user {
    background-color: #1d1d1f;
    color: #f5f5f7;
  }
  
  .connection-status,
  .manual-input-panel,
  .loading-indicator {
    background-color: rgba(29, 29, 31, 0.8);
    color: #f5f5f7;
  }
  
  .url-input,
  .message-input {
    background-color: rgba(0, 0, 0, 0.5);
    border-color: rgba(255, 255, 255, 0.2);
    color: #f5f5f7;
  }
  
  .url-input::placeholder,
  .message-input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  
  .clear-button {
    color: #a1a1a6;
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .clear-button:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.05);
    color: #f5f5f7;
  }
  
  .panel-title {
    color: #f5f5f7;
  }
  
  .cancel-button {
    color: #a1a1a6;
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .cancel-button:hover {
    color: #f5f5f7;
  }
  
  .info-footer {
    color: #a1a1a6;
  }
}
</style> 