<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, watch, computed, nextTick } from 'vue'
import { useKnowledgeStore } from '../stores/knowledge'
import type { KnowledgeNode } from '../stores/knowledge'
import * as echarts from 'echarts'
import { ElLoading, ElMessage } from 'element-plus'

const knowledgeStore = useKnowledgeStore()
const chartContainer = ref<HTMLElement | null>(null)
const detailPanel = ref<HTMLElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)
const isFullscreen = ref(false)
const selectedCategories = ref<string[]>([])
const isDebug = ref(true) // 添加调试标志
const showLabels = ref(true) // 控制是否显示标签

const state = reactive({
  isDetailVisible: false,
  isLoading: false
})

// 计算是否所有类别都被选中
const isAllCategoriesSelected = computed(() => {
  return knowledgeStore.categories.length > 0 && 
         selectedCategories.value.length === knowledgeStore.categories.length;
})

// 根据选中的类别过滤节点
const filteredNodes = computed(() => {
  if (selectedCategories.value.length === 0) {
    return knowledgeStore.graphData.nodes
  }
  return knowledgeStore.graphData.nodes.filter(node => 
    selectedCategories.value.includes(node.category)
  )
})

// 根据过滤后的节点获取链接
const filteredLinks = computed(() => {
  const nodeIds = new Set(filteredNodes.value.map(node => node.id))
  return knowledgeStore.graphData.links.filter(link => 
    nodeIds.has(link.source) && nodeIds.has(link.target)
  )
})

// 为类别标签生成固定的颜色
const categoryColors = ref<Record<string, string>>({})

function getCategoryColor(category: string): { backgroundColor: string } {
  if (!categoryColors.value[category]) {
    // 根据类别名称生成确定性的颜色
    const colorMap: Record<string, string> = {
      '宏观金融': '#3498db',
      '央行工具': '#e74c3c',
      '国际金融': '#2ecc71',
      '金融机构': '#9b59b6',
      '金融市场': '#f39c12',
      '金融产品': '#1abc9c',
      '金融风险': '#e67e22',
      '金融监管': '#34495e',
      '金融科技': '#8e44ad',
      '金融理念': '#d35400',
      '金融创新': '#16a085',
      '投资策略': '#c0392b'
    };
    
    if (colorMap[category]) {
      categoryColors.value[category] = colorMap[category];
    } else {
      // 生成一个基于类别名称的伪随机颜色
      let hash = 0;
      for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
      }
      const color = `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
      categoryColors.value[category] = color;
    }
  }
  
  return {
    backgroundColor: categoryColors.value[category]
  };
}

// 切换类别选择状态
function toggleCategory(category: string) {
  if (selectedCategories.value.includes(category)) {
    selectedCategories.value = selectedCategories.value.filter(c => c !== category);
  } else {
    selectedCategories.value.push(category);
  }
}

// 选择或取消选择所有类别
function selectAllCategories() {
  if (isAllCategoriesSelected.value) {
    selectedCategories.value = [];
  } else {
    selectedCategories.value = [...knowledgeStore.categories];
  }
}

// 控制缩放级别
function zoomIn() {
  if (!chart.value) return
  const option = chart.value.getOption()
  const series = option.series as any[]
  const currentZoom = series[0]?.zoom as number || 1
  chart.value.setOption({
    series: [{
      zoom: currentZoom * 1.2
    }]
  })
}

function zoomOut() {
  if (!chart.value) return
  const option = chart.value.getOption()
  const series = option.series as any[]
  const currentZoom = series[0]?.zoom as number || 1
  chart.value.setOption({
    series: [{
      zoom: currentZoom / 1.2
    }]
  })
}

function resetZoom() {
  if (!chart.value) return
  chart.value.setOption({
    series: [{
      zoom: 1.2,
      center: [0, 0]
    }]
  })
}

// 切换标签显示
function toggleLabels() {
  showLabels.value = !showLabels.value
  updateChart()
}

// 初始化图表
function initChart() {
  if (!chartContainer.value) {
    console.error('图表容器元素不存在')
    return
  }
  
  if (isDebug.value) console.log('图表容器大小:', chartContainer.value.offsetWidth, chartContainer.value.offsetHeight)
  
  // 先销毁旧的实例
  if (chart.value) {
    chart.value.dispose()
  }
  
  chart.value = echarts.init(chartContainer.value)
  
  // 窗口大小改变时，重设图表大小
  const resizeHandler = () => {
    if (isDebug.value) console.log('窗口大小改变')
    chart.value?.resize()
    // 窗口大小改变时，重新居中图谱
    setTimeout(() => centerGraph(), 100)
  }
  
  window.addEventListener('resize', resizeHandler)
  
  // 组件卸载时清除事件监听
  onUnmounted(() => {
    window.removeEventListener('resize', resizeHandler)
    if (chart.value) {
      chart.value.dispose()
      chart.value = null
    }
  })
  
  // 设置图表点击事件
  chart.value.on('click', (params: any) => {
    if (params.dataType === 'node') {
      const node = knowledgeStore.graphData.nodes.find(n => n.id === params.data.id)
      if (node) {
        knowledgeStore.selectNode(node)
        state.isDetailVisible = true
      }
    }
  })
  
  // 更新图表数据
  updateChart()
}

// 更新图表数据
function updateChart() {
  if (!chart.value) {
    console.error('图表实例不存在')
    return
  }
  
  if (isDebug.value) {
    console.log('正在更新图表数据')
    console.log('过滤节点数量:', filteredNodes.value.length)
    console.log('过滤链接数量:', filteredLinks.value.length)
    
    // 添加更多调试信息
    if (filteredNodes.value.length > 0) {
      console.log('示例节点:', JSON.stringify(filteredNodes.value[0]))
    }
    if (filteredLinks.value.length > 0) {
      console.log('示例链接:', JSON.stringify(filteredLinks.value[0]))
    }
  }
  
  const loading = ElLoading.service({
    target: chartContainer.value!,
    text: '加载知识图谱...',
    background: 'rgba(255, 255, 255, 0.8)'
  })
  
  state.isLoading = true
  
  try {
    // 准备图表所需的数据
    const nodes = filteredNodes.value.map(node => ({
      id: node.id,
      name: node.name,
      value: node.value || 1,
      category: node.category,
      symbolSize: node.value ? Math.sqrt(node.value) * 5 + 10 : 15,
      symbol: 'circle',
      itemStyle: {
        color: getCategoryColorValue(node.category),
        borderColor: '#fff',
        borderWidth: 2,
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowBlur: 5
      },
      label: {
        show: showLabels.value,
        position: 'right' as const,
        formatter: '{b}',
        fontSize: 12,
        color: '#333',
        backgroundColor: 'rgba(255,255,255,0.7)',
        padding: [3, 5],
        borderRadius: 3,
        distance: 5
      }
    }));
    
    const links = filteredLinks.value.map(link => ({
      source: link.source,
      target: link.target,
      value: link.value,
      lineStyle: {
        width: link.value ? Math.log(link.value) * 2 : 1,
        opacity: 0.6,
        curveness: 0.2,
        color: 'rgba(115, 115, 115, 0.5)',
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowBlur: 3
      }
    }));
    
    if (isDebug.value) {
      console.log(`处理后的节点数量: ${nodes.length}`);
      console.log(`处理后的链接数量: ${links.length}`);
    }
  
    // 准备图表所需的数据
    const option: echarts.EChartsOption = {
      title: {
        text: '金融学知识图谱',
        subtext: '点击节点查看详情',
        left: 'center',
        top: 20
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}',
        backgroundColor: 'rgba(50,50,50,0.7)',
        borderColor: '#333',
        textStyle: {
          color: '#fff'
        }
      },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 10,
        top: 20,
        bottom: 20,
        data: knowledgeStore.categories,
        textStyle: {
          fontSize: 12
        },
        selectedMode: 'multiple'
      },
      animationDuration: 1500,
      animationEasingUpdate: 'quinticOut',
      series: [
        {
          name: '金融知识点',
          type: 'graph',
          layout: 'force',
          data: nodes,
          links: links,
          categories: knowledgeStore.categories.map(name => ({
            name,
            itemStyle: {
              color: getCategoryColorValue(name)
            }
          })),
          roam: true,
          draggable: true,
          // 调整初始缩放比例
          zoom: 1.0,
          // 将图表初始位置设置为中心
          center: ['50%', '50%'],
          force: {
            // 增加排斥力，防止节点重叠
            repulsion: isFullscreen.value ? 500 : 400,
            // 减小向心引力，让节点分布更开
            gravity: isFullscreen.value ? 0.05 : 0.03,
            // 设置边长度范围，影响节点之间的距离
            edgeLength: isFullscreen.value ? [100, 200] : [80, 160],
            // 减小摩擦系数，让布局更稳定
            friction: 0.1,
            layoutAnimation: true,
            // 设置初始布局为环形，确保节点均匀分布
            initLayout: 'circular',
          },
          // 高亮相关节点
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 6
            },
            label: {
              fontSize: 14
            }
          },
          // 确保图表占满整个容器
          left: 0,
          right: 0,
          top: 50,
          bottom: 0
        }
      ]
    };
    
    // 先清除所有动画和渲染
    chart.value.clear();
    
    // 设置新的选项
    chart.value.setOption(option);
    
    // 初始调整后立即进行一次居中
    setTimeout(() => {
      centerGraph();
    }, 100);
    
    // 动画结束后再次居中，确保布局稳定后视图正确
    setTimeout(() => {
      centerGraph();
    }, 1800);
    
    if (isDebug.value) console.log('图表选项已设置')
  } catch(error) {
    console.error('设置图表选项时出错:', error)
    ElMessage.error('图表渲染失败，请刷新页面重试')
  }
  
  setTimeout(() => {
    loading.close()
    state.isLoading = false
    if (isDebug.value) console.log('图表加载完成')
  }, 500)
}

// 强制居中图谱
function centerGraph() {
  try {
    if (chart.value) {
      // 使用图表API自动居中并适应所有内容
      chart.value.dispatchAction({
        type: 'graphRoam',
        zoom: 0.8,
        originX: 0.5,
        originY: 0.5
      });
    }
  } catch (e) {
    console.error('自动居中失败:', e);
  }
}

// 切换全屏模式
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  
  // 使用nextTick确保DOM已更新
  nextTick(() => {
    if (chart.value) {
      // 延迟一点执行resize，确保容器尺寸已经变化
      setTimeout(() => {
        if (isDebug.value) console.log('重新调整图表大小，全屏状态:', isFullscreen.value)
        // 确保chart.value非空
        if (!chart.value) return
        
        chart.value.resize()
        
        // 全屏模式下调整图表布局参数
        if (isFullscreen.value) {
          chart.value.setOption({
            series: [{
              center: ['50%', '50%'],
              zoom: 1.0,
              force: {
                repulsion: 500,  // 增加节点间斥力
                gravity: 0.05,   // 调整向心引力
                edgeLength: [100, 200]  // 增加边长度
              }
            }]
          });
        } else {
          // 非全屏模式下使用不同参数
          chart.value.setOption({
            series: [{
              center: ['50%', '50%'],
              zoom: 1.0,
              force: {
                repulsion: 400,
                gravity: 0.03,
                edgeLength: [80, 160]
              }
            }]
          });
        }
        
        // 强制重新居中
        setTimeout(() => centerGraph(), 300);
      }, 300);
    }
  })
}

// 关闭详情面板
function closeDetail() {
  state.isDetailVisible = false
  knowledgeStore.selectNode(null)
}

// 重新加载数据
async function reloadData() {
  await knowledgeStore.loadGraphData()
  if (!knowledgeStore.loadError && knowledgeStore.graphData.nodes.length > 0) {
    // 重新初始化图表
    nextTick(() => {
      initChart()
      // 默认选择所有类别
      selectedCategories.value = [...knowledgeStore.categories]
    })
  }
}

// 当选中类别变化时更新图表
watch(selectedCategories, () => {
  updateChart()
})

// 组件加载完成后初始化
onMounted(async () => {
  if (isDebug.value) console.log('Graph组件已挂载')
  
  if (!knowledgeStore.graphData.nodes.length) {
    if (isDebug.value) console.log('开始加载图谱数据')
    await knowledgeStore.loadGraphData()
    if (isDebug.value) {
      console.log('图谱数据加载完成:')
      console.log('节点数量:', knowledgeStore.graphData.nodes.length)
      console.log('链接数量:', knowledgeStore.graphData.links.length)
      console.log('数据内容:', JSON.stringify(knowledgeStore.graphData).slice(0, 200) + '...')
    }
  }
  
  // 默认选择所有类别
  selectedCategories.value = [...knowledgeStore.categories]
  
  // 确保DOM已更新
  nextTick(() => {
    if (isDebug.value) console.log('DOM已更新，准备初始化图表')
    if (!knowledgeStore.loadError && knowledgeStore.graphData.nodes.length > 0) {
      // 延迟初始化，确保DOM完全渲染
      setTimeout(() => {
        if (isDebug.value) console.log('开始初始化图表')
        initChart()
      }, 300)
    } else {
      console.error('无法初始化图表：没有数据或加载出错')
    }
  })
})

// 为模板提供安全的获取颜色方法
function getCategoryColorValue(category: string): string {
  return categoryColors.value[category] || '#5470c6';
}
</script>

<template>
  <div class="graph-container" :class="{ 'fullscreen': isFullscreen }">
    <!-- 工具栏 -->
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-4">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-apple-dark dark:text-white mb-2 md:mb-0">金融知识图谱可视化</h2>
        
        <!-- 控制按钮 -->
        <div class="flex items-center gap-2">
          <button 
            @click="toggleFullscreen" 
            class="btn-apple !py-1.5 !px-4 flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" v-if="!isFullscreen">
              <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L17 12.586V11a1 1 0 011-1z" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" v-else>
              <path d="M5 8V6a1 1 0 011-1h1.586a1 1 0 010 2H6.414l1.293 1.293a1 1 0 01-1.414 1.414L5 8.414V10a1 1 0 11-2 0V6a1 1 0 011-1h1zm7 0V6a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 5H12zm-7 7a1 1 0 10-2 0v4a1 1 0 001 1h4a1 1 0 100-2H6.414l1.293-1.293a1 1 0 00-1.414-1.414L5 16.586V15zm7 0a1 1 0 011-1h1.586l-1.293-1.293a1 1 0 011.414-1.414L17 12.586V11a1 1 0 112 0v4a1 1 0 01-1 1h-4a1 1 0 010-2z" />
            </svg>
            <span>{{ isFullscreen ? '退出全屏' : '全屏显示' }}</span>
          </button>
        </div>
      </div>
      
      <!-- 类别筛选 -->
      <div>
        <div class="flex justify-between items-center mb-3">
          <span class="text-sm font-medium text-gray-600 dark:text-gray-300">按类别筛选</span>
          <button 
            @click="selectAllCategories" 
            class="text-sm text-apple-blue hover:underline transition-colors"
          >
            {{ isAllCategoriesSelected ? '取消全选' : '全部显示' }}
          </button>
        </div>
        
        <div class="category-filter-container">
          <div 
            v-for="category in knowledgeStore.categories" 
            :key="category"
            class="category-tag"
            :class="{
              'category-tag-selected': selectedCategories.includes(category),
              'category-tag-unselected': !selectedCategories.includes(category)
            }"
            @click="toggleCategory(category)"
          >
            <span class="category-tag-indicator" :style="getCategoryColor(category)"></span>
            <span class="category-tag-text">{{ category }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 图表容器 -->
    <div 
      ref="chartContainer" 
      class="chart-wrapper bg-white dark:bg-gray-900 rounded-lg shadow-sm transition-all duration-300"
      :class="{ 
        'fullscreen-chart': isFullscreen, 
        'normal-chart': !isFullscreen 
      }"
    >
      <!-- 图表控制工具栏 -->
      <div class="chart-controls">
        <button @click="zoomIn" class="chart-control-btn" title="放大">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        <button @click="zoomOut" class="chart-control-btn" title="缩小">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6" />
          </svg>
        </button>
        <button @click="resetZoom" class="chart-control-btn" title="重置视图">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button @click="toggleLabels" class="chart-control-btn" :class="{'active': showLabels}" title="显示/隐藏标签">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </button>
      </div>
      
      <!-- 加载错误提示 -->
      <div v-if="knowledgeStore.loadError" class="error-message">
        <div class="error-icon">!</div>
        <h3>加载知识图谱失败</h3>
        <p>{{ knowledgeStore.loadError }}</p>
        <button @click="reloadData" class="btn-apple mt-4">重新加载</button>
      </div>
      
      <!-- 空数据提示 -->
      <div v-else-if="!knowledgeStore.isLoading && (!knowledgeStore.graphData.nodes || knowledgeStore.graphData.nodes.length === 0)" class="empty-message">
        <div class="empty-icon">?</div>
        <h3>暂无图谱数据</h3>
        <p>知识图谱数据为空，请检查数据源</p>
      </div>
    </div>
    
    <!-- 详情面板 -->
    <div 
      v-if="state.isDetailVisible && knowledgeStore.selectedNode" 
      ref="detailPanel"
      class="fixed right-8 top-24 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-h-[80vh] transition-all duration-300 z-20 detail-panel"
    >
      <div class="p-4 bg-apple-blue text-white flex justify-between items-center">
        <h3 class="text-lg font-medium">知识点详情</h3>
        <button @click="closeDetail" class="text-white hover:text-gray-200 focus:outline-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div class="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
        <h4 class="text-lg font-semibold text-apple-dark dark:text-white mb-1">
          {{ knowledgeStore.selectedNode.name }}
        </h4>
        <div class="mb-3">
          <span 
            class="inline-block px-2.5 py-1 rounded-full text-xs"
            :style="{
              backgroundColor: getCategoryColorValue(knowledgeStore.selectedNode.category) + '33',
              color: getCategoryColorValue(knowledgeStore.selectedNode.category)
            }"
          >
            {{ knowledgeStore.selectedNode.category }}
          </span>
        </div>
        
        <p v-if="knowledgeStore.selectedNode.description" class="text-gray-700 dark:text-gray-300 mb-4 text-sm leading-relaxed">
          {{ knowledgeStore.selectedNode.description }}
        </p>
        
        <a 
          v-if="knowledgeStore.selectedNode.url" 
          :href="knowledgeStore.selectedNode.url" 
          target="_blank" 
          class="text-apple-blue hover:underline text-sm inline-flex items-center mb-4 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          查看详细资料
        </a>
        
        <!-- 相关知识点 -->
        <div v-if="knowledgeStore.relatedNodes.length > 0" class="mt-2">
          <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            相关知识点
          </h5>
          <div class="grid grid-cols-1 gap-2">
            <div 
              v-for="node in knowledgeStore.relatedNodes" 
              :key="node.id"
              class="p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors related-node-item"
              @click="knowledgeStore.selectNode(node)"
            >
              <div class="font-medium text-apple-dark dark:text-white">{{ node.name }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <span 
                  class="w-2 h-2 rounded-full mr-1"
                  :style="{ backgroundColor: getCategoryColorValue(node.category) }"
                ></span>
                {{ node.category }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.graph-container {
  position: relative;
  padding: 1rem;
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}

.fullscreen {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 50;
  background: white;
  padding: 1rem;
  height: 100vh;
}

.dark .fullscreen {
  background: #1d1d1f;
}

.chart-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  overflow: hidden; /* 防止内容溢出 */
  border: 1px solid #eaeaea;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.normal-chart {
  min-height: 600px;
  max-height: calc(100vh - 300px);
}

.fullscreen-chart {
  height: calc(100vh - 170px);
  border: none;
  box-shadow: none;
}

.dark .chart-wrapper {
  border-color: #333;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.dark .fullscreen-chart {
  border: none;
  box-shadow: none;
}

.category-filter-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.category-tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  animation: fadeIn 0.3s ease-out;
}

.category-tag-selected {
  background-color: rgba(0, 113, 227, 0.1);
  border-color: rgba(0, 113, 227, 0.3);
}

.category-tag-unselected {
  background-color: #f5f5f7;
  opacity: 0.8;
}

.dark .category-tag-unselected {
  background-color: rgba(55, 65, 81, 0.5);
}

.category-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.category-tag-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
}

.category-tag-text {
  font-size: 13px;
  font-weight: 500;
  color: #1d1d1f;
}

.dark .category-tag-text {
  color: #f5f5f7;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-message, .empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 2rem;
  text-align: center;
}

.error-icon, .empty-icon {
  width: 4rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f56565;
  color: white;
  border-radius: 50%;
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.empty-icon {
  background-color: #a0aec0;
}

.error-message h3, .empty-message h3 {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #1d1d1f;
}

.dark .error-message h3, .dark .empty-message h3 {
  color: white;
}

.error-message p, .empty-message p {
  color: #4a5568;
  margin-bottom: 1rem;
}

.dark .error-message p, .dark .empty-message p {
  color: #a0aec0;
}

.chart-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: rgba(255, 255, 255, 0.7);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark .chart-controls {
  background-color: rgba(31, 41, 55, 0.7);
}

.chart-control-btn {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background-color: white;
  color: #333;
  border: 1px solid #eaeaea;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.chart-control-btn:hover {
  background-color: #f5f5f7;
  transform: translateY(-1px);
}

.chart-control-btn.active {
  background-color: var(--apple-blue);
  color: white;
  border-color: var(--apple-blue);
}

.dark .chart-control-btn {
  background-color: #374151;
  color: #f5f5f7;
  border-color: #4b5563;
}

.dark .chart-control-btn:hover {
  background-color: #4b5563;
}

.dark .chart-control-btn.active {
  background-color: var(--apple-blue);
  border-color: var(--apple-blue);
}

.detail-panel {
  animation: slideIn 0.3s ease-out;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1),
              0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.related-node-item {
  position: relative;
  overflow: hidden;
}

.related-node-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--apple-blue);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.related-node-item:hover::before {
  opacity: 1;
}
</style> 