import { ref, computed } from 'vue'
import type { Point3D, PointCloud, ComparisonResult, ClassStats } from '../types'
import { CLASS_NAMES } from '../types'

export function usePointCloud() {
  const beforeCloud = ref<PointCloud | null>(null)
  const afterCloud = ref<PointCloud | null>(null)
  const isLoading = ref(false)

  const parseXYZ = (content: string, name: string): PointCloud => {
    const lines = content.trim().split('\n')
    const points: Point3D[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const parts = trimmed.split(/\s+/)
      if (parts.length >= 4) {
        const classId = parseInt(parts[0] ?? '0', 10)
        points.push({
          classId,
          className: CLASS_NAMES[classId] || `class_${classId}`,
          x: parseFloat(parts[1] ?? '0'),
          y: parseFloat(parts[2] ?? '0'),
          z: parseFloat(parts[3] ?? '0'),
        })
      }
    }

    // Вычисляем границы
    const bounds = {
      min: { x: Infinity, y: Infinity, z: Infinity },
      max: { x: -Infinity, y: -Infinity, z: -Infinity },
    }

    points.forEach((p) => {
      bounds.min.x = Math.min(bounds.min.x, p.x)
      bounds.min.y = Math.min(bounds.min.y, p.y)
      bounds.min.z = Math.min(bounds.min.z, p.z)
      bounds.max.x = Math.max(bounds.max.x, p.x)
      bounds.max.y = Math.max(bounds.max.y, p.y)
      bounds.max.z = Math.max(bounds.max.z, p.z)
    })

    // Если нет точек, устанавливаем дефолтные значения
    if (points.length === 0) {
      bounds.min = { x: 0, y: 0, z: 0 }
      bounds.max = { x: 1, y: 1, z: 1 }
    }

    const center = {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
      z: (bounds.min.z + bounds.max.z) / 2,
    }

    return { name, points, bounds, center }
  }

  const loadFile = async (file: File, type: 'before' | 'after') => {
    isLoading.value = true
    try {
      const content = await file.text()
      const cloud = parseXYZ(content, file.name)

      if (type === 'before') {
        beforeCloud.value = cloud
      } else {
        afterCloud.value = cloud
      }
    } finally {
      isLoading.value = false
    }
  }

  const comparison = computed<ComparisonResult | null>(() => {
    if (!beforeCloud.value || !afterCloud.value) return null

    const before = beforeCloud.value.points
    const after = afterCloud.value.points

    // Проверяем что точки соответствуют по координатам
    const totalPoints = before.length

    // Считаем совпадения меток
    let matchingLabels = 0
    const minLength = Math.min(before.length, after.length)

    for (let i = 0; i < minLength; i++) {
      const beforePoint = before[i]
      const afterPoint = after[i]
      if (beforePoint && afterPoint && beforePoint.classId === afterPoint.classId) {
        matchingLabels++
      }
    }

    // Статистика по классам
    const beforeClassCount = new Map<number, number>()
    const afterClassCount = new Map<number, number>()

    before.forEach((p) => {
      beforeClassCount.set(p.classId, (beforeClassCount.get(p.classId) || 0) + 1)
    })

    after.forEach((p) => {
      afterClassCount.set(p.classId, (afterClassCount.get(p.classId) || 0) + 1)
    })

    // Собираем все уникальные классы
    const allClasses = new Set([...beforeClassCount.keys(), ...afterClassCount.keys()])

    const classStats: ClassStats[] = Array.from(allClasses)
      .sort((a, b) => a - b)
      .map((classId) => {
        const beforeCount = beforeClassCount.get(classId) || 0
        const afterCount = afterClassCount.get(classId) || 0
        const difference = afterCount - beforeCount
        const percentChange =
          beforeCount > 0 ? (difference / beforeCount) * 100 : afterCount > 0 ? 100 : 0

        return {
          classId,
          className: CLASS_NAMES[classId] || `class_${classId}`,
          beforeCount,
          afterCount,
          difference,
          percentChange,
        }
      })

    return {
      totalPoints,
      matchingLabels,
      matchingPercent: totalPoints > 0 ? (matchingLabels / totalPoints) * 100 : 0,
      classStats,
      uniqueClassesBefore: beforeClassCount.size,
      uniqueClassesAfter: afterClassCount.size,
    }
  })

  const clearAll = () => {
    beforeCloud.value = null
    afterCloud.value = null
  }

  return {
    beforeCloud,
    afterCloud,
    isLoading,
    loadFile,
    comparison,
    clearAll,
  }
}
