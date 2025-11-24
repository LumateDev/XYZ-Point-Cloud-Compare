<template>
  <div class="viewer-container" ref="containerRef">
    <canvas ref="canvasRef"></canvas>

    <div class="viewer-controls">
      <el-button-group>
        <el-button
          @click="setView('before')"
          :type="viewMode === 'before' ? 'primary' : 'default'"
          size="small"
        >
          До
        </el-button>
        <el-button
          @click="setView('after')"
          :type="viewMode === 'after' ? 'primary' : 'default'"
          size="small"
        >
          После
        </el-button>
        <el-button
          @click="setView('diff')"
          :type="viewMode === 'diff' ? 'primary' : 'default'"
          size="small"
        >
          Различия
        </el-button>
      </el-button-group>

      <el-button @click="resetCamera" size="small" :icon="Refresh" circle />
    </div>

    <div class="legend">
      <template v-if="viewMode === 'diff'">
        <div class="legend-item">
          <span class="dot" style="background: #67c23a"></span> Совпадает
        </div>
        <div class="legend-item">
          <span class="dot" style="background: #f56c6c"></span> Различается
        </div>
      </template>
      <template v-else>
        <div class="legend-item" v-for="(color, classId) in visibleClasses" :key="classId">
          <span class="dot" :style="{ background: color }"></span>
          {{ getClassName(Number(classId)) }}
        </div>
      </template>
    </div>

    <div class="info-panel">
      <div>Точек: {{ currentPointCount.toLocaleString() }}</div>
      <div>Зажмите ЛКМ - вращение | Колёсико - зум</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Refresh } from '@element-plus/icons-vue'
import type { PointCloud } from '../types'
import { CLASS_COLORS, CLASS_NAMES } from '../types'

const props = defineProps<{
  beforeCloud: PointCloud | null
  afterCloud: PointCloud | null
}>()

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const viewMode = ref<'before' | 'after' | 'diff'>('before')

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let currentPoints: THREE.Points | null = null
let animationId: number

const currentPointCount = computed(() => {
  if (viewMode.value === 'before') return props.beforeCloud?.points.length || 0
  if (viewMode.value === 'after') return props.afterCloud?.points.length || 0
  return props.beforeCloud?.points.length || 0
})

const visibleClasses = computed(() => {
  const cloud = viewMode.value === 'after' ? props.afterCloud : props.beforeCloud
  if (!cloud) return {}

  const classes: Record<number, string> = {}
  const seen = new Set<number>()

  cloud.points.forEach((p) => {
    if (!seen.has(p.classId)) {
      seen.add(p.classId)
      const color = CLASS_COLORS[p.classId] || 0x888888
      classes[p.classId] = '#' + color.toString(16).padStart(6, '0')
    }
  })

  return classes
})

const getClassName = (classId: number): string => {
  return CLASS_NAMES[classId] || `class_${classId}`
}

const createPointCloudByClass = (cloud: PointCloud): THREE.Points => {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(cloud.points.length * 3)
  const colors = new Float32Array(cloud.points.length * 3)

  cloud.points.forEach((p, i) => {
    positions[i * 3] = p.x - cloud.center.x
    positions[i * 3 + 1] = p.z - cloud.center.z // Z вверх
    positions[i * 3 + 2] = p.y - cloud.center.y

    const colorHex = CLASS_COLORS[p.classId] || 0x888888
    const color = new THREE.Color(colorHex)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  })

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  })

  return new THREE.Points(geometry, material)
}

const createDiffCloud = (before: PointCloud, after: PointCloud): THREE.Points => {
  const geometry = new THREE.BufferGeometry()
  const len = Math.min(before.points.length, after.points.length)
  const positions = new Float32Array(len * 3)
  const colors = new Float32Array(len * 3)

  const matchColor = new THREE.Color(0x67c23a) // Зелёный - совпадает
  const diffColor = new THREE.Color(0xf56c6c) // Красный - различается

  for (let i = 0; i < len; i++) {
    const bp = before.points[i]
    const ap = after.points[i]

    // Проверяем что точки существуют
    if (!bp || !ap) continue

    positions[i * 3] = bp.x - before.center.x
    positions[i * 3 + 1] = bp.z - before.center.z
    positions[i * 3 + 2] = bp.y - before.center.y

    const isMatch = bp.classId === ap.classId
    const color = isMatch ? matchColor : diffColor

    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  })

  return new THREE.Points(geometry, material)
}

const updateScene = () => {
  if (!scene) return

  // Удаляем старое облако
  if (currentPoints) {
    scene.remove(currentPoints)
    currentPoints.geometry.dispose()
    ;(currentPoints.material as THREE.Material).dispose()
    currentPoints = null
  }

  let cloud: PointCloud | null = null

  if (viewMode.value === 'before' && props.beforeCloud) {
    cloud = props.beforeCloud
    currentPoints = createPointCloudByClass(cloud)
  } else if (viewMode.value === 'after' && props.afterCloud) {
    cloud = props.afterCloud
    currentPoints = createPointCloudByClass(cloud)
  } else if (viewMode.value === 'diff' && props.beforeCloud && props.afterCloud) {
    cloud = props.beforeCloud
    currentPoints = createDiffCloud(props.beforeCloud, props.afterCloud)
  }

  if (currentPoints) {
    scene.add(currentPoints)
  }

  // Настраиваем камеру
  if (cloud) {
    const size = Math.max(
      cloud.bounds.max.x - cloud.bounds.min.x,
      cloud.bounds.max.y - cloud.bounds.min.y,
      cloud.bounds.max.z - cloud.bounds.min.z,
    )
    camera.position.set(size, size, size)
    camera.lookAt(0, 0, 0)
    controls.update()
  }
}

const setView = (mode: 'before' | 'after' | 'diff') => {
  viewMode.value = mode
  updateScene()
}

const resetCamera = () => {
  const cloud = props.beforeCloud || props.afterCloud
  if (cloud) {
    const size = Math.max(
      cloud.bounds.max.x - cloud.bounds.min.x,
      cloud.bounds.max.y - cloud.bounds.min.y,
      cloud.bounds.max.z - cloud.bounds.min.z,
    )
    camera.position.set(size, size, size)
    camera.lookAt(0, 0, 0)
    controls.reset()
  }
}

const initThree = () => {
  if (!containerRef.value || !canvasRef.value) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  // Camera
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000)
  camera.position.set(100, 100, 100)

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 1
  controls.maxDistance = 5000

  // Grid
  const grid = new THREE.GridHelper(200, 50, 0x444444, 0x333333)
  scene.add(grid)

  // Axes
  const axes = new THREE.AxesHelper(50)
  scene.add(axes)

  // Animation loop
  const animate = () => {
    animationId = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  // Resize
  const handleResize = () => {
    if (!containerRef.value) return
    const w = containerRef.value.clientWidth
    const h = containerRef.value.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', handleResize)
}

watch([() => props.beforeCloud, () => props.afterCloud], () => {
  if (scene) {
    // Автоматически выбираем вид
    if (props.beforeCloud && !props.afterCloud) {
      viewMode.value = 'before'
    } else if (!props.beforeCloud && props.afterCloud) {
      viewMode.value = 'after'
    }
    updateScene()
  }
})

onMounted(() => {
  initThree()
  updateScene()
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  renderer?.dispose()
})
</script>

<style scoped>
.viewer-container {
  position: relative;
  width: 100%;
  height: 500px;
  border-radius: 16px;
  overflow: hidden;
  background: #1a1a2e;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.viewer-controls {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  gap: 12px;
  align-items: center;
}

.legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: rgba(0, 0, 0, 0.7);
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  max-width: 300px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: white;
  font-size: 12px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.info-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
