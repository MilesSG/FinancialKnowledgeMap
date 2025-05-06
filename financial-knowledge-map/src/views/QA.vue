<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useKnowledgeStore } from '../stores/knowledge'
import { ElLoading } from 'element-plus'

const knowledgeStore = useKnowledgeStore()
const questionInput = ref('')
const chatContainer = ref<HTMLElement | null>(null)

// 定义消息类型
interface Message {
  id: number
  text: string
  isUser: boolean
  timestamp: Date
  relatedNodes?: Array<{id: string, name: string}>
}

const state = reactive({
  messages: [] as Message[],
  isTyping: false,
  messageIdCounter: 0
})

// 滚动到底部
function scrollToBottom() {
  setTimeout(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  }, 100)
}

// 发送问题
async function sendQuestion() {
  if (!questionInput.value.trim()) return
  
  const question = questionInput.value.trim()
  questionInput.value = ''
  
  // 添加用户消息
  state.messages.push({
    id: ++state.messageIdCounter,
    text: question,
    isUser: true,
    timestamp: new Date()
  })
  
  scrollToBottom()
  
  // 显示"正在输入"状态
  state.isTyping = true
  
  try {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 根据问题在知识库中搜索相关内容
    const keywords = question.toLowerCase().split(/\s+/)
    const relevantNodes = knowledgeStore.graphData.nodes.filter(node => {
      // 简单的关键词匹配
      return keywords.some(keyword => 
        node.name.toLowerCase().includes(keyword) || 
        (node.description && node.description.toLowerCase().includes(keyword))
      )
    }).slice(0, 3) // 最多取3个相关节点
    
    // 在实际应用中，这里应该调用后端API进行问答
    const answers = [
      '根据我的理解，',
      '金融领域中，',
      '从经济学角度看，',
      '央行政策指出，',
      '监管规定要求，'
    ]
    
    const randomStart = answers[Math.floor(Math.random() * answers.length)]
    let answer = ''
    
    if (relevantNodes.length > 0) {
      const mainNode = relevantNodes[0]
      answer = `${randomStart}${mainNode.description || mainNode.name}是金融领域的重要概念。`
      
      // 添加系统回复
      state.messages.push({
        id: ++state.messageIdCounter,
        text: answer,
        isUser: false,
        timestamp: new Date(),
        relatedNodes: relevantNodes.map(node => ({
          id: node.id,
          name: node.name
        }))
      })
    } else {
      // 如果没有找到相关信息
      state.messages.push({
        id: ++state.messageIdCounter,
        text: '对不起，我目前没有找到与您问题相关的信息。请尝试使用其他关键词，或者查阅知识图谱获取更多金融知识。',
        isUser: false,
        timestamp: new Date()
      })
    }
  } catch (error) {
    console.error('问答出错:', error)
    
    // 显示错误消息
    state.messages.push({
      id: ++state.messageIdCounter,
      text: '对不起，处理您的问题时发生了错误。请稍后再试。',
      isUser: false,
      timestamp: new Date()
    })
  } finally {
    state.isTyping = false
    scrollToBottom()
  }
}

// 选择知识点
function selectNode(nodeId: string) {
  const node = knowledgeStore.graphData.nodes.find(n => n.id === nodeId)
  if (node) {
    knowledgeStore.selectNode(node)
    // 添加系统消息
    state.messages.push({
      id: ++state.messageIdCounter,
      text: `"${node.name}"是${node.category}类别下的知识点。${node.description || ''}`,
      isUser: false,
      timestamp: new Date()
    })
    scrollToBottom()
  }
}

// 格式化时间
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// 是否有问答历史
const hasMessages = computed(() => state.messages.length > 0)

// 初始化
onMounted(async () => {
  if (!knowledgeStore.graphData.nodes.length) {
    const loading = ElLoading.service({
      target: document.body,
      text: '加载金融知识库...',
      background: 'rgba(255, 255, 255, 0.8)'
    })
    
    try {
      await knowledgeStore.loadGraphData()
    } finally {
      loading.close()
    }
  }
  
  // 添加欢迎消息
  state.messages.push({
    id: ++state.messageIdCounter,
    text: '欢迎使用金融知识问答系统！您可以询问任何关于金融学的问题，我会尽力为您解答。',
    isUser: false,
    timestamp: new Date()
  })
})
</script>

<template>
  <div class="container-apple py-10">
    <h1 class="section-title mb-6">金融知识问答</h1>
    
    <!-- 聊天界面 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-300px)]">
      <!-- 消息历史 -->
      <div 
        ref="chatContainer"
        class="flex-1 p-6 overflow-y-auto" 
      >
        <div v-if="hasMessages" class="space-y-6">
          <div 
            v-for="message in state.messages" 
            :key="message.id"
            :class="[
              message.isUser ? 'flex justify-end' : 'flex justify-start',
            ]"
          >
            <div 
              :class="[
                'max-w-[80%] rounded-lg p-4',
                message.isUser 
                  ? 'bg-apple-blue text-white rounded-br-none' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-none'
              ]"
            >
              <div class="text-sm mb-1">{{ message.isUser ? '您' : '金融助手' }} · {{ formatTime(message.timestamp) }}</div>
              <div>{{ message.text }}</div>
              
              <!-- 相关知识点 -->
              <div 
                v-if="message.relatedNodes && message.relatedNodes.length > 0"
                class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"
              >
                <div class="text-xs text-gray-600 dark:text-gray-300 mb-2">相关知识点:</div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="node in message.relatedNodes"
                    :key="node.id"
                    @click="selectNode(node.id)"
                    class="text-xs px-2 py-1 bg-white dark:bg-gray-600 text-apple-blue dark:text-blue-200 rounded hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                  >
                    {{ node.name }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 正在输入提示 -->
          <div v-if="state.isTyping" class="flex justify-start">
            <div class="bg-gray-100 dark:bg-gray-700 rounded-lg rounded-bl-none p-4 text-gray-800 dark:text-white max-w-[80%]">
              <div class="flex space-x-1">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 输入区域 -->
      <div class="border-t border-gray-200 dark:border-gray-700 p-4">
        <form @submit.prevent="sendQuestion" class="flex gap-2">
          <input
            v-model="questionInput"
            type="text"
            placeholder="输入您的金融问题..."
            class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-apple-blue focus:border-apple-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            class="btn-apple"
            :disabled="!questionInput.trim()"
          >
            发送
          </button>
        </form>
        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          提示: 您可以询问有关金融概念、政策法规、市场趋势等问题
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.typing-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #aaa;
  animation: typingAnimation 1.4s infinite ease-in-out both;
}

.typing-dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingAnimation {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.6;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style> 