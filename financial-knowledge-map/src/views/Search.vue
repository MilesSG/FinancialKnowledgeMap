<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useKnowledgeStore } from '../stores/knowledge'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const knowledgeStore = useKnowledgeStore()
const router = useRouter()
const searchInput = ref('')
const selectedCategory = ref('')
const sortBy = ref('relevance')
const showDescription = ref(true)

// 根据关键词和类别进行搜索
const searchResults = computed(() => {
  if (!searchInput.value && !selectedCategory.value) return []
  
  let results = knowledgeStore.graphData.nodes
  
  // 按关键词筛选
  if (searchInput.value) {
    const keyword = searchInput.value.toLowerCase()
    results = results.filter(node => 
      node.name.toLowerCase().includes(keyword) || 
      (node.description && node.description.toLowerCase().includes(keyword))
    )
  }
  
  // 按类别筛选
  if (selectedCategory.value) {
    results = results.filter(node => node.category === selectedCategory.value)
  }
  
  // 排序
  if (sortBy.value === 'name') {
    results = [...results].sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortBy.value === 'category') {
    results = [...results].sort((a, b) => a.category.localeCompare(b.category))
  } else if (sortBy.value === 'relevance' && searchInput.value) {
    // 按相关性排序（以名称包含关键词的优先）
    const keyword = searchInput.value.toLowerCase()
    results = [...results].sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().includes(keyword)
      const bNameMatch = b.name.toLowerCase().includes(keyword)
      
      if (aNameMatch && !bNameMatch) return -1
      if (!aNameMatch && bNameMatch) return 1
      return 0
    })
  }
  
  return results
})

// 搜索结果数量
const resultCount = computed(() => searchResults.value.length)

// 清空搜索
function clearSearch() {
  searchInput.value = ''
  selectedCategory.value = ''
}

// 查看知识点详情
function viewNodeDetail(nodeId: string) {
  const node = knowledgeStore.graphData.nodes.find(n => n.id === nodeId)
  if (node) {
    knowledgeStore.selectNode(node)
    router.push('/graph')
  } else {
    ElMessage.error('未找到该知识点')
  }
}

// 当搜索条件变化时，自动滚动到顶部
watch([searchInput, selectedCategory, sortBy], () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

onMounted(async () => {
  if (!knowledgeStore.graphData.nodes.length) {
    await knowledgeStore.loadGraphData()
  }
})
</script>

<template>
  <div class="container-apple py-10">
    <h1 class="section-title mb-6">搜索金融知识</h1>
    
    <!-- 搜索表单 -->
    <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm mb-8">
      <div class="flex flex-col md:flex-row gap-4">
        <!-- 搜索输入框 -->
        <div class="flex-1">
          <label for="search" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">关键词搜索</label>
          <div class="relative">
            <input
              id="search"
              v-model="searchInput"
              type="text"
              placeholder="输入关键词搜索金融知识点..."
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-apple-blue focus:border-apple-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              v-if="searchInput"
              @click="searchInput = ''"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- 类别筛选 -->
        <div class="w-full md:w-64">
          <label for="category" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">按类别筛选</label>
          <select
            id="category"
            v-model="selectedCategory"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-apple-blue focus:border-apple-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">所有类别</option>
            <option v-for="category in knowledgeStore.categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        
        <!-- 排序方式 -->
        <div class="w-full md:w-48">
          <label for="sort" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">排序方式</label>
          <select
            id="sort"
            v-model="sortBy"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-apple-blue focus:border-apple-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="relevance">相关性</option>
            <option value="name">名称</option>
            <option value="category">类别</option>
          </select>
        </div>
      </div>
      
      <!-- 搜索控制项 -->
      <div class="flex items-center justify-between mt-4">
        <!-- 显示描述切换 -->
        <div class="flex items-center">
          <input
            id="showDesc"
            v-model="showDescription"
            type="checkbox"
            class="h-4 w-4 text-apple-blue focus:ring-apple-blue border-gray-300 rounded"
          />
          <label for="showDesc" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            显示知识点描述
          </label>
        </div>
        
        <!-- 清空按钮 -->
        <button
          v-if="searchInput || selectedCategory"
          @click="clearSearch"
          class="text-sm text-gray-600 dark:text-gray-400 hover:text-apple-blue dark:hover:text-apple-blue"
        >
          清空搜索
        </button>
      </div>
    </div>
    
    <!-- 搜索结果 -->
    <div>
      <!-- 结果计数 -->
      <div v-if="searchInput || selectedCategory" class="mb-4 text-sm text-gray-600 dark:text-gray-400">
        找到 {{ resultCount }} 个相关知识点
      </div>
      
      <!-- 结果列表 -->
      <div v-if="resultCount > 0" class="grid grid-cols-1 gap-4">
        <div
          v-for="node in searchResults"
          :key="node.id"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
        >
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-lg font-medium text-apple-dark dark:text-white mb-1">{{ node.name }}</h3>
              <div class="flex items-center mb-2">
                <span
                  class="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs mr-2"
                >
                  {{ node.category }}
                </span>
              </div>
              <p v-if="showDescription && node.description" class="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {{ node.description }}
              </p>
            </div>
            
            <!-- 查看详情按钮 -->
            <button
              @click="viewNodeDetail(node.id)"
              class="btn-apple !py-1 !px-3 text-xs whitespace-nowrap"
            >
              查看详情
            </button>
          </div>
          
          <!-- 相关链接 -->
          <div v-if="node.url" class="mt-2">
            <a
              :href="node.url"
              target="_blank"
              class="text-apple-blue text-sm hover:underline inline-flex items-center"
            >
              <span>相关链接</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      
      <!-- 无搜索条件提示 -->
      <div
        v-else-if="!searchInput && !selectedCategory"
        class="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-12 w-12 text-gray-400 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h3 class="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">输入关键词或选择类别开始搜索</h3>
        <p class="text-gray-500 dark:text-gray-400">您可以搜索金融学各领域的知识点</p>
      </div>
      
      <!-- 无结果提示 -->
      <div
        v-else
        class="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-12 w-12 text-gray-400 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 class="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">未找到匹配的知识点</h3>
        <p class="text-gray-500 dark:text-gray-400">请尝试其他搜索关键词或类别</p>
      </div>
    </div>
  </div>
</template> 