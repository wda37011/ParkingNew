// 工具函数

// 格式化时间
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 格式化日期
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化金额
export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`
}

// 获取订单状态文本
export function getOrderStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': '待接单',
    'accepted': '已接单',
    'picking': '取车中',
    'parked': '已停车',
    'returning': '还车中',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status] || status
}

// 获取订单状态颜色
export function getOrderStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'pending': '#FF9500',
    'accepted': '#4A90E2',
    'picking': '#4A90E2',
    'parked': '#50C878',
    'returning': '#4A90E2',
    'completed': '#50C878',
    'cancelled': '#999999'
  }
  return colorMap[status] || '#999999'
}

// 生成订单ID
export function generateOrderId(): string {
  return `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
}

// 计算距离（米）
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

// 显示加载提示
export function showLoading(title: string = '加载中...'): void {
  wx.showLoading({
    title,
    mask: true
  })
}

// 隐藏加载提示
export function hideLoading(): void {
  wx.hideLoading()
}

// 显示成功提示
export function showSuccess(title: string): void {
  wx.showToast({
    title,
    icon: 'success',
    duration: 2000
  })
}

// 显示错误提示
export function showError(title: string): void {
  wx.showToast({
    title,
    icon: 'none',
    duration: 2000
  })
}
