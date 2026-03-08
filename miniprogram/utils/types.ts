// ===================== 通用类型 =====================

export interface Location {
  latitude: number
  longitude: number
  address: string
  name?: string
}

export type UserRole = 'user' | 'worker' | 'owner'

// ===================== 代停车小哥注册信息 =====================

export interface WorkerProfile {
  openId: string
  name: string
  phone: string
  idNumber: string              // 身份证号
  driverLicensePhoto: string    // 驾驶证照片路径
  verified: boolean
  rating: number
  completedOrders: number
  createTime: string
}

// ===================== 车位（业主出租）=====================

export interface ParkingSpace {
  id: string
  ownerId: string
  location: Location
  buildingInfo: string          // 具体到小区楼号单元
  spaceCode: string             // 车位编码
  photos: string[]              // 车位照片（含周围参照物）
  phone: string                 // 联系电话
  availableFrom: string         // 出租开始时间 ISO
  availableTo: string           // 出租结束时间 ISO
  hourlyPrice: number           // 每小时价格（元）
  dailyMaxPrice?: number        // 每日封顶价格（元，可选）
  communityFee: number          // 小区社会车辆收费（元/小时）
  communityFeeDesc?: string     // 小区收费说明
  isActive: boolean
  isOccupied: boolean           // 是否被占用
  createTime: string
}

// ===================== 自主停车订单 =====================

export enum SelfParkingStatus {
  NAVIGATING = 'navigating',    // 导航前往中
  PARKING = 'parking',          // 停车中（计时中）
  PENDING_PAY = 'pending_pay',  // 待支付
  COMPLETED = 'completed',      // 已完成
  CANCELLED = 'cancelled'
}

export interface SelfParkingOrder {
  id: string
  userId: string
  spaceId: string
  ownerId: string
  carNumber: string
  phone: string
  spaceTitle: string
  spaceAddress: string
  startTime?: string            // 到达开始计时
  endTime?: string              // 驶离结束计时
  parkingMinutes?: number
  hourlyPrice: number           // 车位单价
  communityFeePerHour: number   // 小区收费
  spaceFee?: number             // 车位费用
  communityTotalFee?: number    // 小区停车总费用
  platformFee?: number          // 平台服务费（加价20%）
  totalFee?: number             // 总费用 = (spaceFee + communityTotalFee) * 1.2
  status: SelfParkingStatus
  paid: boolean
  createTime: string
}

// ===================== 代停车订单 =====================

export enum ValetOrderStatus {
  PENDING = 'pending',          // 待接单
  ACCEPTED = 'accepted',        // 已接单
  PICKING = 'picking',          // 取车中
  PARKED = 'parked',            // 已停车
  RETURNING = 'returning',      // 还车中
  RETURNED = 'returned',        // 已还车待确认
  COMPLETED = 'completed',      // 已完成
  CANCELLED = 'cancelled'       // 已取消
}

export interface ValetOrder {
  id: string
  userId: string
  userPhone: string
  workerId?: string
  carNumber: string
  pickLocation: Location
  pickTime: string
  returnLocation: Location
  returnTime: string
  remark?: string
  // 费用
  baseFee: number               // 基础服务费 20
  estimatedParkingFee: number   // 预估停车费 6元/小时
  distanceFee: number           // 距离费用
  estimatedTotal: number        // 预估总费用
  actualTotal?: number          // 实际总费用
  // 停车相关
  parkSpaceId?: string
  parkingStartTime?: string
  parkingEndTime?: string
  actualParkingFee?: number
  // 状态
  status: ValetOrderStatus
  ownerConfirmed: boolean
  paid: boolean
  createTime: string
  pickArriveTime?: string
  returnArriveTime?: string
}

// ===================== 钱包与交易 =====================

export interface Transaction {
  id: string
  type: 'income' | 'expense' | 'withdraw'
  role: UserRole
  amount: number
  description: string
  relatedOrderId?: string
  createTime: string
}

export interface Wallet {
  openId: string
  balance: number
  transactions: Transaction[]
}
