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

  // Коэффициент масштабирования
  const scale = 2.0

  cloud.points.forEach((p, i) => {
    // Исходные координаты с масштабированием
    positions[i * 3] = p.x * scale      // X
    positions[i * 3 + 1] = p.y * scale  // Y (вертикальная ось)
    positions[i * 3 + 2] = p.z * scale  // Z

    const colorHex = CLASS_COLORS[p.classId] || 0x888888
    const color = new THREE.Color(colorHex)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  })

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.3 * scale,
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

  // Коэффициент масштабирования
  const scale = 2.0

  const matchColor = new THREE.Color(0x67c23a) // Зелёный - совпадает
  const diffColor = new THREE.Color(0xf56c6c) // Красный - различается

  for (let i = 0; i < len; i++) {
    const bp = before.points[i]
    const ap = after.points[i]

    // Проверяем что точки существуют
    if (!bp || !ap) continue

    // Исходные координаты с масштабированием
    positions[i * 3] = bp.x * scale      // X
    positions[i * 3 + 1] = bp.y * scale  // Y (вертикальная ось)
    positions[i * 3 + 2] = bp.z * scale  // Z

    const isMatch = bp.classId === ap.classId
    const color = isMatch ? matchColor : diffColor

    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.3 * scale,
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
    resetCamera()
  }
}

const setView = (mode: 'before' | 'after' | 'diff') => {
  viewMode.value = mode
  updateScene()
}

const resetCamera = () => {
  let cloud: PointCloud | null = null
  
  if (viewMode.value === 'before' && props.beforeCloud) {
    cloud = props.beforeCloud
  } else if (viewMode.value === 'after' && props.afterCloud) {
    cloud = props.afterCloud
  } else if (viewMode.value === 'diff' && props.beforeCloud) {
    cloud = props.beforeCloud
  }
  
  if (cloud) {
    const scale = 2.0
    
    const sizeX = (cloud.bounds.max.x - cloud.bounds.min.x) * scale
    const sizeY = (cloud.bounds.max.y - cloud.bounds.min.y) * scale
    const sizeZ = (cloud.bounds.max.z - cloud.bounds.min.z) * scale
    const size = Math.max(sizeX, sizeY, sizeZ)
    
    // Центр облака
    const center = {
      x: (cloud.bounds.min.x + cloud.bounds.max.x) / 2 * scale,
      y: (cloud.bounds.min.y + cloud.bounds.max.y) / 2 * scale,
      z: (cloud.bounds.min.z + cloud.bounds.max.z) / 2 * scale
    }
    
    const distance = size * 1.5
    camera.position.set(
      center.x + distance, 
      center.y + distance * 0.5, 
      center.z + distance
    )
    camera.lookAt(center.x, center.y, center.z)
    controls.target.set(center.x, center.y, center.z)
    controls.update()
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
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100000)
  camera.position.set(100, 50, 100)

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
  controls.minDistance = 0.01 // Еще меньше
  controls.maxDistance = 100000
  controls.zoomSpeed = 3.0 // Еще быстрее
  controls.target.set(0, 0, 0)
  controls.autoRotate = false

  // Настройки зума
  controls.zoomSpeed = 2.0
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  }

  // Grid
  const gridSize = 1000
  const gridDivisions = 50
  const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0x333333)
  scene.add(grid)

  // Axes - маленькие и полупрозрачные
  const axes = new THREE.AxesHelper(30)
  axes.setColors(
    new THREE.Color(0x8888ff), // X - светло-синий
    new THREE.Color(0x88ff88), // Y - светло-зеленый
    new THREE.Color(0xff8888)  // Z - светло-красный
  )
  axes.children.forEach((line) => {
    line.material.transparent = true
    line.material.opacity = 0.2
  })
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
