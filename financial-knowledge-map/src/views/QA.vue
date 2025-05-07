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
  <div class="flex flex-col items-center min-h-screen bg-white">
    <div class="w-full max-w-2xl mt-8 px-4">
      <div class="text-2xl font-bold text-center mb-1">金融知识问答</div>
      
      <div class="text-gray-500 text-center mb-4 text-sm flex justify-center items-center gap-2 flex-wrap">
        <span>输入您的金融学问题，系统将为您智能解答</span>
        <span 
          v-if="isProxyConnected" 
          class="text-green-500 inline-flex items-center gap-1"
        >
          <span class="inline-block w-2 h-2 rounded-full bg-green-500"></span>
          已连接
        </span>
        <div v-else class="flex gap-2 items-center">
          <button
            class="text-red-500 inline-flex items-center gap-1 border border-red-500 rounded px-2 py-0.5"
            @click="discoverProxyServer"
            :disabled="discoveryInProgress"
          >
            <span class="inline-block w-2 h-2 rounded-full bg-red-500"></span>
            {{ discoveryInProgress ? '连接中...' : '重试连接' }}
          </button>
          <button
            class="text-blue-500 inline-flex items-center gap-1 border border-blue-500 rounded px-2 py-0.5"
            @click="showManualInput = !showManualInput"
          >
            手动设置
          </button>
        </div>
      </div>
      
      <!-- 手动设置URL -->
      <div v-if="showManualInput" class="mb-4 p-3 bg-gray-50 rounded-lg">
        <div class="text-xs text-gray-500 mb-1">输入代理服务器地址(如 http://localhost:3001)</div>
        <div class="flex items-center gap-2">
          <input
            v-model="manualUrl"
            type="text"
            placeholder="http://localhost:端口号"
            class="border rounded px-2 py-1 flex-1 text-sm"
          />
          <button
            @click="setManualUrl"
            class="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            连接
          </button>
          <button
            @click="showManualInput = false"
            class="px-3 py-1 border rounded text-sm"
          >
            取消
          </button>
        </div>
      </div>
      
      <div
        ref="chatContainer"
        class="bg-white rounded-lg shadow p-4 h-[60vh] overflow-y-auto flex flex-col gap-4"
      >
        <div v-for="(msg, idx) in messages" :key="idx" class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
          <div
            class="flex items-end gap-2"
            :class="msg.role === 'user' ? 'flex-row-reverse' : ''"
          >
            <div
              class="px-4 py-2 rounded-2xl max-w-xs md:max-w-md break-words"
              :class="msg.role === 'user'
                ? 'bg-blue-500 text-white rounded-br-none'
                : 'bg-gray-100 text-gray-800 rounded-bl-none'"
            >
              <div class="text-sm whitespace-pre-wrap">{{ msg.content }}</div>
              <div class="text-xs opacity-60 mt-1 text-right">{{ msg.time }}</div>
            </div>
          </div>
        </div>
        <div v-if="isLoading" class="flex items-center gap-2 text-gray-400 text-sm">
          <span>正在思考...</span>
        </div>
      </div>
      
      <div class="flex mt-4 gap-2">
        <button 
          @click="clearChat" 
          class="px-2 py-1 text-sm border rounded text-gray-600 hover:bg-gray-100"
          :disabled="isLoading"
        >
          清空对话
        </button>
        <input
          v-model="input"
          placeholder="请输入您的金融学问题"
          class="flex-1 border px-4 py-2 rounded"
          @keyup.enter="sendMessage"
          :disabled="isLoading || !isProxyConnected"
        />
        <button
          @click="sendMessage"
          class="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          :disabled="isLoading || !isProxyConnected || !input.trim()"
        >
          发送
        </button>
      </div>
      
      <div class="text-xs text-gray-400 mt-2 text-center">
        本问答系统基于AI大模型，答案仅供学习参考
      </div>
      
      <div v-if="proxyUrl" class="text-xs text-gray-400 mt-1 text-center">
        当前连接: {{ proxyUrl }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 无需额外样式，使用原生HTML和Tailwind CSS */
</style> 