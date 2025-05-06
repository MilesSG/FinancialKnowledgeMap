import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref } from 'vue'

// 节点类型
export interface KnowledgeNode {
  id: string
  name: string
  category: string
  value?: number
  description?: string
  url?: string
}

// 边/关系类型
export interface KnowledgeLink {
  source: string
  target: string
  value: number
  name?: string
}

// 图谱数据类型
export interface GraphData {
  nodes: KnowledgeNode[]
  links: KnowledgeLink[]
}

// 内置图谱数据，当外部数据加载失败时使用
const fallbackGraphData: GraphData = {
  nodes: [
    { id: "1", name: "货币政策", category: "宏观金融", value: 30, description: "货币政策是由中央银行制定的旨在调控货币供应量和信贷规模的政策，目标包括稳定物价、促进就业和经济增长。" },
    { id: "2", name: "财政政策", category: "宏观金融", value: 28, description: "财政政策是政府通过调整财政收支规模和结构，影响总需求、总供给和国民收入分配的宏观经济政策。" },
    { id: "3", name: "存款准备金率", category: "央行工具", value: 20, description: "存款准备金率是中央银行要求商业银行按照其存款总额的一定比例在中央银行缴纳的准备金占其存款的比率。" },
    { id: "4", name: "公开市场操作", category: "央行工具", value: 18, description: "公开市场操作是中央银行通过在金融市场上买卖国债等有价证券来调节市场流动性的货币政策工具。" },
    { id: "5", name: "再贷款", category: "央行工具", value: 15, description: "再贷款是中央银行向商业银行提供的贷款，是中央银行调节货币供应量的重要手段之一。" },
    { id: "6", name: "中期借贷便利", category: "央行工具", value: 15, description: "中期借贷便利(MLF)是中央银行创设的提供中期基础货币的货币政策工具，对象为符合条件的银行。" },
    { id: "7", name: "外汇储备", category: "国际金融", value: 25, description: "外汇储备是一国政府保有的以外币表示的资产，是国际流动性和国际支付的来源。" },
    { id: "8", name: "人民币汇率", category: "国际金融", value: 26, description: "人民币汇率是人民币与其他货币的兑换比率，是国际贸易和投资的重要参考指标。" },
    { id: "9", name: "国际收支平衡", category: "国际金融", value: 20, description: "国际收支平衡表是记录一国与世界其他国家在一定时期内的全部经济交易的统计报表。" },
    { id: "10", name: "商业银行", category: "金融机构", value: 35, description: "商业银行是指依法接受公众存款、发放贷款、办理结算等业务的金融机构。" },
    { id: "11", name: "证券公司", category: "金融机构", value: 28, description: "证券公司是指从事证券经纪、证券投资咨询、证券自营、证券承销与保荐等业务的金融机构。" },
    { id: "12", name: "保险公司", category: "金融机构", value: 26, description: "保险公司是指经营保险业务，包括接受投保人的投保申请、收取保险费、承担保险责任的金融机构。" },
    { id: "13", name: "基金管理公司", category: "金融机构", value: 22, description: "基金管理公司是指依法设立，从事公募或私募基金的发行、管理和资产配置的金融机构。" },
    { id: "14", name: "信托公司", category: "金融机构", value: 20, description: "信托公司是指以信托为主要业务形式，专门从事资金信托、动产信托和不动产信托等业务的金融机构。" },
    { id: "15", name: "股票市场", category: "金融市场", value: 32, description: "股票市场是企业通过发行股票筹集资金、投资者通过买卖股票获取收益的场所。" },
    { id: "16", name: "债券市场", category: "金融市场", value: 30, description: "债券市场是发行人通过发行债券筹集资金、投资者通过投资债券获取利息收入的市场。" },
    { id: "17", name: "外汇市场", category: "金融市场", value: 28, description: "外汇市场是进行不同国家货币交换的市场，是世界上规模最大、最活跃的金融市场。" },
    { id: "18", name: "货币市场", category: "金融市场", value: 28, description: "货币市场是短期资金借贷的市场，包括同业拆借市场、商业票据市场、短期国债市场等。" },
    { id: "19", name: "金融衍生品市场", category: "金融市场", value: 24, description: "金融衍生品市场是交易期货、期权、互换等衍生金融工具的市场，主要用于风险对冲和投机。" },
    { id: "20", name: "互联网金融", category: "金融科技", value: 25, description: "互联网金融是传统金融机构与互联网企业利用互联网技术和信息通信技术实现资金融通、支付结算等业务的新型金融业务模式。" },
    { id: "21", name: "区块链金融", category: "金融科技", value: 23, description: "区块链金融是利用区块链技术处理金融交易和数据的新型金融服务，具有去中心化、不可篡改等特点。" },
    { id: "22", name: "人工智能金融", category: "金融科技", value: 22, description: "人工智能金融是将人工智能技术应用于金融领域，包括智能投顾、智能风控、智能客服等。" },
    { id: "23", name: "大数据金融", category: "金融科技", value: 24, description: "大数据金融是利用大数据技术挖掘金融数据价值，应用于精准营销、风险控制、信用评估等金融场景。" },
    { id: "24", name: "云计算金融", category: "金融科技", value: 20, description: "云计算金融是利用云计算技术提供金融服务，具有资源共享、按需服务、可扩展性强等特点。" },
    { id: "25", name: "信用风险", category: "金融风险", value: 26, description: "信用风险是指因交易对手不履行合约而造成的风险，是金融机构面临的主要风险之一。" },
    { id: "26", name: "市场风险", category: "金融风险", value: 25, description: "市场风险是指因市场价格波动导致金融资产价值变动而产生的风险，包括利率风险、汇率风险、股价风险等。" },
    { id: "27", name: "流动性风险", category: "金融风险", value: 24, description: "流动性风险是指金融机构无法获得充足资金以满足资产增长或到期债务支付需要的风险。" },
    { id: "28", name: "操作风险", category: "金融风险", value: 22, description: "操作风险是指由不完善的内部程序、人员、系统或外部事件导致的直接或间接损失的风险。" },
    { id: "29", name: "系统性风险", category: "金融风险", value: 28, description: "系统性风险是指整个金融体系或市场崩溃的风险，会影响金融市场的整体稳定性。" },
    { id: "30", name: "银行理财产品", category: "金融产品", value: 24, description: "银行理财产品是由商业银行自行设计并发行的非保本理财产品，具有期限灵活、收益稳定等特点。" },
    { id: "31", name: "基金", category: "金融产品", value: 28, description: "基金是指通过发行基金份额，集中投资者的资金，由基金管理人管理、基金托管人托管，以投资组合方式进行投资的一种间接投资工具。" },
    { id: "32", name: "保险", category: "金融产品", value: 26, description: "保险是投保人根据合同约定，向保险人支付保险费，保险人对于合同约定的可能发生的事故因其发生所造成的财产损失承担赔偿保险金责任的商业行为。" },
    { id: "33", name: "信托产品", category: "金融产品", value: 22, description: "信托产品是信托公司接受委托人的委托，按照委托人的意愿以受托人的名义管理、运用、处分信托财产的行为。" },
    { id: "34", name: "债券", category: "金融产品", value: 25, description: "债券是政府、企业等机构发行的有价证券，债券持有人按约定条件获取利息并到期收回本金。" },
    { id: "35", name: "巴塞尔协议", category: "金融监管", value: 24, description: "巴塞尔协议是国际清算银行下属的巴塞尔银行监管委员会制定的银行业全球监管标准，旨在加强银行监管和风险管理。" },
    { id: "36", name: "反洗钱", category: "金融监管", value: 20, description: "反洗钱是指通过法律和行政手段，预防和阻止洗钱犯罪活动，维护金融秩序和金融安全的制度。" },
    { id: "37", name: "资本充足率监管", category: "金融监管", value: 22, description: "资本充足率监管是对银行等金融机构的资本与风险加权资产之比进行监管，确保金融机构有足够资本应对风险。" },
    { id: "38", name: "穿透式监管", category: "金融监管", value: 18, description: "穿透式监管是指监管机构对金融产品和服务的全链条、全过程进行监管，识别最终投资者和底层资产。" },
    { id: "39", name: "普惠金融", category: "金融理念", value: 20, description: "普惠金融是指以可负担的成本为有金融服务需求的社会各阶层和群体提供适当、有效的金融服务。" },
    { id: "40", name: "绿色金融", category: "金融理念", value: 22, description: "绿色金融是指为支持环境改善、应对气候变化和资源节约高效利用的经济活动提供的金融服务。" }
  ],
  links: [
    { source: "1", target: "3", value: 8 },
    { source: "1", target: "4", value: 8 },
    { source: "1", target: "5", value: 7 },
    { source: "1", target: "6", value: 7 },
    { source: "2", target: "1", value: 9 },
    { source: "3", target: "10", value: 7 },
    { source: "4", target: "10", value: 6 },
    { source: "5", target: "10", value: 8 },
    { source: "6", target: "10", value: 8 },
    { source: "7", target: "8", value: 9 },
    { source: "8", target: "9", value: 7 },
    { source: "1", target: "10", value: 6 },
    { source: "1", target: "18", value: 7 },
    { source: "2", target: "16", value: 8 },
    { source: "10", target: "11", value: 5 },
    { source: "10", target: "12", value: 5 },
    { source: "10", target: "13", value: 4 },
    { source: "10", target: "30", value: 8 },
    { source: "11", target: "15", value: 9 },
    { source: "12", target: "32", value: 9 },
    { source: "13", target: "31", value: 9 },
    { source: "14", target: "33", value: 9 },
    { source: "15", target: "16", value: 6 },
    { source: "15", target: "19", value: 7 },
    { source: "16", target: "34", value: 9 },
    { source: "17", target: "7", value: 8 },
    { source: "17", target: "8", value: 8 },
    { source: "18", target: "4", value: 7 },
    { source: "19", target: "26", value: 8 },
    { source: "20", target: "10", value: 7 },
    { source: "20", target: "23", value: 8 },
    { source: "21", target: "20", value: 6 },
    { source: "22", target: "23", value: 7 },
    { source: "23", target: "24", value: 6 },
    { source: "23", target: "25", value: 7 },
    { source: "24", target: "22", value: 5 },
    { source: "25", target: "27", value: 7 },
    { source: "25", target: "29", value: 8 },
    { source: "26", target: "29", value: 8 },
    { source: "27", target: "29", value: 7 },
    { source: "28", target: "29", value: 6 },
    { source: "30", target: "31", value: 5 },
    { source: "31", target: "15", value: 8 },
    { source: "31", target: "16", value: 7 },
    { source: "32", target: "25", value: 6 },
    { source: "33", target: "14", value: 8 },
    { source: "34", target: "16", value: 9 },
    { source: "35", target: "37", value: 8 },
    { source: "36", target: "10", value: 6 },
    { source: "37", target: "10", value: 7 },
    { source: "38", target: "35", value: 6 },
    { source: "39", target: "20", value: 7 },
    { source: "40", target: "39", value: 5 }
  ]
};

export const useKnowledgeStore = defineStore('knowledge', () => {
  const graphData: Ref<GraphData> = ref({
    nodes: [],
    links: []
  })
  
  const selectedNode: Ref<KnowledgeNode | null> = ref(null)
  const isLoading: Ref<boolean> = ref(false)
  const searchKeyword: Ref<string> = ref('')
  const loadError: Ref<string | null> = ref(null)
  
  // 获取所有类别
  const categories = computed(() => {
    const categorySet = new Set<string>()
    graphData.value.nodes.forEach(node => {
      if (node.category) {
        categorySet.add(node.category)
      }
    })
    return Array.from(categorySet)
  })
  
  // 根据关键词搜索节点
  const searchNodes = computed(() => {
    if (!searchKeyword.value) return []
    
    const keyword = searchKeyword.value.toLowerCase()
    return graphData.value.nodes.filter(node => 
      node.name.toLowerCase().includes(keyword) || 
      (node.description && node.description.toLowerCase().includes(keyword))
    )
  })
  
  // 获取与选中节点相关的所有节点
  const relatedNodes = computed(() => {
    if (!selectedNode.value) return []
    
    const nodeId = selectedNode.value.id
    const relatedNodeIds = new Set<string>()
    
    graphData.value.links.forEach(link => {
      if (link.source === nodeId) {
        relatedNodeIds.add(link.target)
      } else if (link.target === nodeId) {
        relatedNodeIds.add(link.source)
      }
    })
    
    return graphData.value.nodes.filter(node => relatedNodeIds.has(node.id))
  })
  
  // 获取与选中节点相关的所有关系
  const relatedLinks = computed(() => {
    if (!selectedNode.value) return []
    
    const nodeId = selectedNode.value.id
    return graphData.value.links.filter(link => 
      link.source === nodeId || link.target === nodeId
    )
  })
  
  // 加载知识图谱数据
  async function loadGraphData() {
    console.log('开始加载知识图谱数据')
    isLoading.value = true
    loadError.value = null
    
    try {
      // 尝试不同的路径
      let response;
      try {
        // 尝试相对路径
        response = await fetch('/data/knowledge-graph.json')
        if (!response.ok) throw new Error(`HTTP错误，状态码: ${response.status}`)
      } catch (err) {
        console.warn('使用相对路径加载失败，尝试绝对路径', err)
        try {
          // 尝试绝对路径
          response = await fetch(`${window.location.origin}/data/knowledge-graph.json`)
          if (!response.ok) throw new Error(`HTTP错误，状态码: ${response.status}`)
        } catch (err2) {
          console.warn('使用绝对路径加载失败，使用内置数据', err2)
          // 所有加载方式都失败，使用内置数据
          graphData.value = fallbackGraphData
          console.log(`使用内置数据: ${fallbackGraphData.nodes.length} 个节点和 ${fallbackGraphData.links.length} 个关系`)
          return
        }
      }
      
      const data = await response.json()
      console.log('成功加载数据:', data)
      
      // 验证数据结构
      if (!data.nodes || !Array.isArray(data.nodes) || !data.links || !Array.isArray(data.links)) {
        throw new Error('数据格式不正确，缺少nodes或links数组')
      }
      
      graphData.value = data
      console.log(`加载了 ${data.nodes.length} 个节点和 ${data.links.length} 个关系`)
    } catch (error) {
      console.error('加载知识图谱数据失败:', error)
      loadError.value = error instanceof Error ? error.message : '未知错误'
      // 如果加载失败，使用内置的备用数据
      graphData.value = fallbackGraphData
      console.log(`使用内置数据: ${fallbackGraphData.nodes.length} 个节点和 ${fallbackGraphData.links.length} 个关系`)
    } finally {
      isLoading.value = false
    }
  }
  
  // 选择节点
  function selectNode(node: KnowledgeNode | null) {
    selectedNode.value = node
  }
  
  // 设置搜索关键词
  function setSearchKeyword(keyword: string) {
    searchKeyword.value = keyword
  }
  
  return {
    graphData,
    selectedNode,
    isLoading,
    searchKeyword,
    loadError,
    categories,
    searchNodes,
    relatedNodes,
    relatedLinks,
    loadGraphData,
    selectNode,
    setSearchKeyword
  }
}) 