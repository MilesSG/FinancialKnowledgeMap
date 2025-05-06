<script setup lang="ts">
// App.vue - 主应用文件
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- 头部导航 -->
    <header class="sticky top-0 z-50 bg-apple-gray" style="backdrop-filter: blur(8px); background-color: rgba(245, 245, 247, 0.9);">
      <div class="container-apple flex items-center justify-between" style="height: 4rem;">
        <div class="flex items-center">
          <router-link to="/" class="text-apple-dark" style="font-size: 1.5rem; font-weight: 500;">
            金融知识图谱
          </router-link>
        </div>
        <div class="flex items-center" style="gap: 1.5rem;">
          <router-link to="/" class="text-apple-dark" style="font-size: 0.875rem; transition: color 0.2s;">
            首页
          </router-link>
          <router-link to="/graph" class="text-apple-dark" style="font-size: 0.875rem; transition: color 0.2s;">
            知识图谱
          </router-link>
          <router-link to="/search" class="text-apple-dark" style="font-size: 0.875rem; transition: color 0.2s;">
            搜索
          </router-link>
          <router-link to="/qa" class="text-apple-dark" style="font-size: 0.875rem; transition: color 0.2s;">
            问答
          </router-link>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 页脚 -->
    <footer class="bg-apple-gray py-8">
      <div class="container-apple text-center" style="font-size: 0.875rem; color: rgba(29, 29, 31, 0.7);">
        <p>© {{ new Date().getFullYear() }} 金融知识图谱系统 | 数据来源于央行、银保监会等权威部门</p>
      </div>
    </footer>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 暗色模式适配 */
@media (prefers-color-scheme: dark) {
  .bg-white {
    background-color: #1d1d1f;
  }
  
  .bg-apple-gray {
    background-color: black !important;
  }
  
  .text-apple-dark {
    color: white !important;
  }
  
  footer {
    color: rgba(255, 255, 255, 0.7) !important;
  }
}
</style> 