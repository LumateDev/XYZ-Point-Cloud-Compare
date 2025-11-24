<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title"><span class="gradient-text">Point Cloud</span> Compare</h1>
        <p class="app-subtitle">Сравнение облаков точек до и после обработки</p>
      </div>
    </header>

    <main class="app-main">
      <div class="upload-section">
        <div class="upload-grid">
          <div class="upload-card">
            <h3 class="section-title before-title">
              <el-icon><Clock /></el-icon>
              До обработки (исходный)
            </h3>
            <FileUploader
              label="Загрузить исходный файл"
              :cloud="beforeCloud"
              @upload="(f) => loadFile(f, 'before')"
            />
          </div>

          <div class="upload-card">
            <h3 class="section-title after-title">
              <el-icon><Check /></el-icon>
              После обработки (предсказание)
            </h3>
            <FileUploader
              label="Загрузить результат"
              :cloud="afterCloud"
              @upload="(f) => loadFile(f, 'after')"
            />
          </div>
        </div>

        <div class="actions" v-if="beforeCloud || afterCloud">
          <el-button @click="clearAll" type="danger" plain :icon="Delete"> Очистить всё </el-button>
        </div>
      </div>

      <transition name="fade">
        <div class="viewer-section" v-if="beforeCloud || afterCloud">
          <h3 class="section-title">
            <el-icon><View /></el-icon>
            3D Визуализация
          </h3>
          <PointCloudViewer :beforeCloud="beforeCloud" :afterCloud="afterCloud" />
        </div>
      </transition>

      <ComparisonStats :comparison="comparison" />

      <div class="tips" v-if="!beforeCloud && !afterCloud">
        <el-alert title="Начните работу" type="info" :closable="false" show-icon>
          <template #default>
            <p>Загрузите два файла .xyz для сравнения облаков точек.</p>
            <p>Формат файла: <code>Класс X Y Z</code></p>
            <p>Пример: <code>2 11.966067 4.107317 97.575714</code></p>
          </template>
        </el-alert>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Clock, Check, View, Delete } from '@element-plus/icons-vue'
import FileUploader from './components/FileUploader.vue'
import PointCloudViewer from './components/PointCloudViewer.vue'
import ComparisonStats from './components/ComparisonStats.vue'
import { usePointCloud } from './composables/usePointCloud'

const { beforeCloud, afterCloud, loadFile, comparison, clearAll } = usePointCloud()
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
}

.app-header {
  padding: 40px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  text-align: center;
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
}

.app-title {
  font-size: 36px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px 0;
}

.gradient-text {
  background: linear-gradient(90deg, #fff 0%, #e0e7ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  margin: 0;
}

.app-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 20px;
}

.upload-section {
  margin-bottom: 32px;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.upload-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}

.before-title {
  color: #667eea;
}

.after-title {
  color: #67c23a;
}

.actions {
  margin-top: 24px;
  text-align: center;
}

.viewer-section {
  margin-bottom: 32px;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.viewer-section .section-title {
  color: #303133;
}

.tips {
  margin-top: 32px;
}

.tips p {
  margin: 4px 0;
}

.tips code {
  background: #f0f2f5;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
}

/* Анимации */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
