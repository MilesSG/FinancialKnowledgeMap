<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKnowledgeStore } from '../stores/knowledge'

const router = useRouter()
const knowledgeStore = useKnowledgeStore()

onMounted(() => {
  knowledgeStore.loadGraphData()
})

function navigateToGraph() {
  router.push('/graph')
}

function navigateToSearch() {
  router.push('/search')
}

function navigateToQA() {
  router.push('/qa')
}
</script>

<template>
  <div>
    <!-- 英雄区 -->
    <section class="hero-section">
      <div class="hero-bg"></div>
      <div class="container-apple relative">
        <div class="hero-content">
          <h1 class="hero-title animate-fade-in">
            金融学知识图谱
          </h1>
          <p class="hero-description animate-fade-in-delay">
            探索金融领域的数百个知识点及其关联关系，基于央行、银保监会等权威部门数据构建
          </p>
          <div class="hero-buttons animate-fade-in-delay-2">
            <button @click="navigateToGraph" class="btn-apple">
              探索知识图谱
            </button>
            <button @click="navigateToSearch" class="btn-secondary">
              搜索知识点
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 功能介绍 -->
    <section class="features-section">
      <div class="container-apple">
        <h2 class="section-title text-center mb-16">主要功能</h2>
        
        <div class="features-grid">
          <!-- 知识图谱 -->
          <div class="feature-card" @click="navigateToGraph">
            <div class="feature-content">
              <div class="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" class="feature-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 class="feature-title">知识图谱可视化</h3>
              <p class="feature-desc">
                直观展示金融领域知识点及其关联关系，点击节点查看详细信息和相关知识点
              </p>
            </div>
          </div>
          
          <!-- 搜索功能 -->
          <div class="feature-card" @click="navigateToSearch">
            <div class="feature-content">
              <div class="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" class="feature-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 class="feature-title">智能搜索</h3>
              <p class="feature-desc">
                快速查找金融知识点，支持关键词搜索和类别筛选，精确定位您需要的信息
              </p>
            </div>
          </div>
          
          <!-- 问答交互 -->
          <div class="feature-card" @click="navigateToQA">
            <div class="feature-content">
              <div class="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" class="feature-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 class="feature-title">问答交互</h3>
              <p class="feature-desc">
                提问金融相关问题，系统基于知识图谱给出准确回答，辅助学习和研究
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 数据来源 -->
    <section class="sources-section">
      <div class="container-apple">
        <h2 class="section-title text-center mb-12">数据来源</h2>
        <p class="sources-description">
          本系统的知识图谱基于以下权威机构的官方文件、政策法规和研究报告构建：
        </p>
        
        <div class="sources-grid">
          <div class="source-item">
            <div class="source-icon">
              <span class="source-label">央行</span>
            </div>
            <span class="source-desc">中国人民银行</span>
          </div>
          
          <div class="source-item">
            <div class="source-icon">
              <span class="source-label">银保监会</span>
            </div>
            <span class="source-desc">中国银行保险监督管理委员会</span>
          </div>
          
          <div class="source-item">
            <div class="source-icon">
              <span class="source-label">证监会</span>
            </div>
            <span class="source-desc">中国证券监督管理委员会</span>
          </div>
          
          <div class="source-item">
            <div class="source-icon">
              <span class="source-label">财政部</span>
            </div>
            <span class="source-desc">中华人民共和国财政部</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero-section {
  position: relative;
  padding: 6rem 0;
  overflow: hidden;
}

@media (min-width: 768px) {
  .hero-section {
    padding: 9rem 0;
  }
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, #f0f7ff, #e6f0fb);
  z-index: -10;
}

.hero-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hero-title {
  font-size: 3rem;
  font-weight: bold;
  color: var(--apple-dark);
  margin-bottom: 1.5rem;
}

@media (min-width: 768px) {
  .hero-title {
    font-size: 4.5rem;
  }
}

.hero-description {
  font-size: 1.25rem;
  color: #4b5563;
  max-width: 48rem;
  margin: 0 auto 3rem;
}

@media (min-width: 768px) {
  .hero-description {
    font-size: 1.5rem;
  }
}

.hero-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 640px) {
  .hero-buttons {
    flex-direction: row;
  }
}

.btn-secondary {
  background-color: white;
  color: var(--apple-dark);
  border: 1px solid #d1d5db;
  border-radius: 9999px;
  padding: 0.5rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background-color: #f9fafb;
}

.features-section {
  padding: 5rem 0;
  background-color: white;
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 768px) {
  .features-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 3rem;
  }
}

.feature-card {
  background-color: var(--apple-gray);
  border-radius: 1rem;
  padding: 2rem;
  transition: transform 0.3s;
  cursor: pointer;
}

.feature-card:hover {
  transform: scale(1.05);
}

.feature-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.feature-icon {
  width: 4rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--apple-blue);
  border-radius: 9999px;
  margin-bottom: 1.5rem;
}

.feature-svg {
  height: 2rem;
  width: 2rem;
  color: white;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--apple-dark);
}

.feature-desc {
  color: #4b5563;
}

.sources-section {
  padding: 5rem 0;
  background-color: var(--apple-gray);
}

.sources-description {
  text-align: center;
  color: #4b5563;
  max-width: 48rem;
  margin: 0 auto 3rem;
}

.sources-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

@media (min-width: 768px) {
  .sources-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.source-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.source-icon {
  width: 6rem;
  height: 6rem;
  background-color: white;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.source-label {
  color: var(--apple-dark);
  font-size: 1.125rem;
  font-weight: 600;
}

.source-desc {
  font-size: 0.875rem;
  color: #6b7280;
}

/* 暗色模式适配 */
@media (prefers-color-scheme: dark) {
  .hero-bg {
    background: linear-gradient(to right, #1a202c, #111827);
  }
  
  .hero-title {
    color: white;
  }
  
  .hero-description {
    color: #d1d5db;
  }
  
  .btn-secondary {
    background-color: #1f2937;
    color: white;
    border-color: #374151;
  }
  
  .btn-secondary:hover {
    background-color: #374151;
  }
  
  .features-section {
    background-color: #1d1d1f;
  }
  
  .feature-card {
    background-color: #1f2937;
  }
  
  .feature-title {
    color: white;
  }
  
  .feature-desc {
    color: #d1d5db;
  }
  
  .sources-section {
    background-color: #111827;
  }
  
  .sources-description {
    color: #d1d5db;
  }
  
  .source-icon {
    background-color: #1f2937;
  }
  
  .source-label {
    color: white;
  }
  
  .source-desc {
    color: #9ca3af;
  }
}
</style> 