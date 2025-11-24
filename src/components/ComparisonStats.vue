<template>
  <transition name="fade-slide">
    <div class="stats-container" v-if="comparison">
      <!-- Общая статистика -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-value">{{ comparison.totalPoints.toLocaleString() }}</div>
          <div class="stat-label">Всего точек</div>
        </div>

        <div class="stat-card" :class="matchClass">
          <div class="stat-icon">{{ matchIcon }}</div>
          <div class="stat-value">{{ comparison.matchingPercent.toFixed(2) }}%</div>
          <div class="stat-label">Совпадение меток</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">🏷️</div>
          <div class="stat-value">
            {{ comparison.matchingLabels.toLocaleString() }} /
            {{ comparison.totalPoints.toLocaleString() }}
          </div>
          <div class="stat-label">Совпавших точек</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">📁</div>
          <div class="stat-value">{{ comparison.uniqueClassesBefore }}</div>
          <div class="stat-label">Уникальных классов</div>
        </div>
      </div>

      <!-- Таблица по классам -->
      <div class="class-table-container">
        <h3 class="table-title">
          <el-icon><PieChart /></el-icon>
          Статистика по классам
        </h3>
        <el-table :data="comparison.classStats" stripe style="width: 100%" class="class-table">
          <el-table-column prop="className" label="Класс" width="150">
            <template #default="{ row }">
              <div class="class-cell">
                <span class="class-dot" :style="{ background: getClassColor(row.classId) }"></span>
                {{ row.className }}
              </div>
            </template>
          </el-table-column>

          <el-table-column label="До обработки" width="180">
            <template #default="{ row }">
              <div class="count-cell">
                {{ row.beforeCount.toLocaleString() }}
                <span class="percent"
                  >({{ ((row.beforeCount / comparison.totalPoints) * 100).toFixed(2) }}%)</span
                >
              </div>
            </template>
          </el-table-column>

          <el-table-column label="После обработки" width="180">
            <template #default="{ row }">
              <div class="count-cell">
                {{ row.afterCount.toLocaleString() }}
                <span class="percent"
                  >({{ ((row.afterCount / comparison.totalPoints) * 100).toFixed(2) }}%)</span
                >
              </div>
            </template>
          </el-table-column>

          <el-table-column label="Разница" width="180">
            <template #default="{ row }">
              <div class="diff-cell" :class="getDiffClass(row.difference)">
                <span v-if="row.difference > 0">+</span>{{ row.difference.toLocaleString() }}
                <span class="percent"
                  >({{ row.difference >= 0 ? '+' : '' }}{{ row.percentChange.toFixed(2) }}%)</span
                >
              </div>
            </template>
          </el-table-column>

          <el-table-column label="Визуализация">
            <template #default="{ row }">
              <div class="bar-container">
                <div
                  class="bar before-bar"
                  :style="{
                    width: getBarWidth(row.beforeCount) + '%',
                  }"
                ></div>
                <div
                  class="bar after-bar"
                  :style="{
                    width: getBarWidth(row.afterCount) + '%',
                  }"
                ></div>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PieChart } from '@element-plus/icons-vue'
import type { ComparisonResult } from '../types'
import { CLASS_COLORS } from '../types'

const props = defineProps<{
  comparison: ComparisonResult | null
}>()

const matchClass = computed(() => {
  if (!props.comparison) return ''
  const percent = props.comparison.matchingPercent
  if (percent >= 95) return 'excellent'
  if (percent >= 80) return 'good'
  if (percent >= 60) return 'warning'
  return 'bad'
})

const matchIcon = computed(() => {
  if (!props.comparison) return '📊'
  const percent = props.comparison.matchingPercent
  if (percent >= 95) return '✅'
  if (percent >= 80) return '👍'
  if (percent >= 60) return '⚠️'
  return '❌'
})

const getClassColor = (classId: number): string => {
  const color = CLASS_COLORS[classId] || 0x888888
  return '#' + color.toString(16).padStart(6, '0')
}

const getDiffClass = (diff: number): string => {
  if (diff > 0) return 'positive'
  if (diff < 0) return 'negative'
  return 'neutral'
}

const getBarWidth = (count: number): number => {
  if (!props.comparison) return 0
  const maxCount = Math.max(
    ...props.comparison.classStats.map((s) => Math.max(s.beforeCount, s.afterCount)),
  )
  return maxCount > 0 ? (count / maxCount) * 100 : 0
}
</script>

<style scoped>
.stats-container {
  margin-top: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.15);
}

.stat-card.excellent {
  background: linear-gradient(135deg, #67c23a15 0%, #95d47515 100%);
  border-color: #67c23a40;
}

.stat-card.good {
  background: linear-gradient(135deg, #409eff15 0%, #79bbff15 100%);
  border-color: #409eff40;
}

.stat-card.warning {
  background: linear-gradient(135deg, #e6a23c15 0%, #f3d19e15 100%);
  border-color: #e6a23c40;
}

.stat-card.bad {
  background: linear-gradient(135deg, #f56c6c15 0%, #f8a5a515 100%);
  border-color: #f56c6c40;
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

/* Таблица */
.class-table-container {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.class-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.class-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.count-cell {
  display: flex;
  flex-direction: column;
}

.percent {
  font-size: 12px;
  color: #909399;
}

.diff-cell {
  font-weight: 600;
}

.diff-cell.positive {
  color: #67c23a;
}

.diff-cell.negative {
  color: #f56c6c;
}

.diff-cell.neutral {
  color: #909399;
}

/* Визуализация баров */
.bar-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.bar {
  height: 8px;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.before-bar {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.after-bar {
  background: linear-gradient(90deg, #67c23a 0%, #95d475 100%);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
</style>
