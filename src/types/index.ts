export interface Point3D {
  classId: number
  className: string
  x: number
  y: number
  z: number
}

export interface PointCloud {
  name: string
  points: Point3D[]
  bounds: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
  center: { x: number; y: number; z: number }
}

export interface ClassStats {
  className: string
  classId: number
  beforeCount: number
  afterCount: number
  difference: number
  percentChange: number
}

export interface ComparisonResult {
  totalPoints: number
  matchingLabels: number
  matchingPercent: number
  classStats: ClassStats[]
  uniqueClassesBefore: number
  uniqueClassesAfter: number
}

// Маппинг классов (расширенный)
export const CLASS_NAMES: Record<number, string> = {
  1: 'default',
  2: 'ground',
  3: 'low_green',
  4: 'mid_green',
  5: 'high_green',
  6: 'roofs',
  7: 'false_point',
  8: 'service_A_points',
}

// Цвета для классов
export const CLASS_COLORS: Record<number, number> = {
  1: 0x9e9e9e, // default - серый
  2: 0x8b4513, // ground - коричневый
  3: 0x90ee90, // low_green - светло-зелёный
  4: 0x32cd32, // mid_green - зелёный
  5: 0x228b22, // high_green - тёмно-зелёный
  6: 0xff6347, // roofs - красный
  7: 0x808080, // false_point - тёмно-серый
  8: 0x00bfff, // service_A_points - голубой
}
