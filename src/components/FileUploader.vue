<template>
  <div class="uploader-container">
    <el-upload
      class="upload-zone"
      :class="{ 'has-file': hasFile }"
      drag
      :auto-upload="false"
      :show-file-list="false"
      accept=".xyz"
      @change="handleChange"
    >
      <div class="upload-content">
        <el-icon class="upload-icon" :class="{ 'animate-bounce': !hasFile }">
          <Upload v-if="!hasFile" />
          <Document v-else />
        </el-icon>
        <div class="upload-text">
          <span v-if="!hasFile">{{ label }}</span>
          <span v-else class="file-name">{{ fileName }}</span>
        </div>
        <div class="upload-hint" v-if="!hasFile">Перетащите .xyz файл сюда</div>
        <div class="point-count" v-else>{{ pointCount.toLocaleString() }} точек</div>
      </div>
    </el-upload>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Upload, Document } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'
import type { PointCloud } from '../types'

const props = defineProps<{
  label: string
  cloud: PointCloud | null
}>()

const emit = defineEmits<{
  upload: [file: File]
}>()

const hasFile = computed(() => !!props.cloud)
const fileName = computed(() => props.cloud?.name || '')
const pointCount = computed(() => props.cloud?.points.length || 0)

const handleChange = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    emit('upload', uploadFile.raw)
  }
}
</script>

<style scoped>
.uploader-container {
  width: 100%;
}

.upload-zone {
  width: 100%;
  transition: all 0.3s ease;
}

.upload-zone :deep(.el-upload-dragger) {
  width: 100%;
  height: 180px;
  border-radius: 16px;
  border: 2px dashed var(--el-border-color);
  background: linear-gradient(135deg, #667eea08 0%, #764ba208 100%);
  transition: all 0.3s ease;
}

.upload-zone :deep(.el-upload-dragger:hover) {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
}

.upload-zone.has-file :deep(.el-upload-dragger) {
  border-color: #67c23a;
  border-style: solid;
  background: linear-gradient(135deg, #67c23a10 0%, #95d47510 100%);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
}

.upload-icon {
  font-size: 48px;
  color: #667eea;
  transition: all 0.3s ease;
}

.has-file .upload-icon {
  color: #67c23a;
}

.animate-bounce {
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.upload-text {
  font-size: 16px;
  color: #606266;
}

.file-name {
  font-weight: 600;
  color: #67c23a;
}

.upload-hint {
  font-size: 12px;
  color: #909399;
}

.point-count {
  font-size: 14px;
  color: #67c23a;
  font-weight: 500;
}
</style>
