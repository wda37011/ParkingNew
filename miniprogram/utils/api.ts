// API 工具函数
import { ValetOrder, ValetOrderStatus } from './types'

const BASE_URL = 'https://your-api-domain.com/api' // 替换为实际的后端API地址

// ========== 支付模式配置 ==========
// true: 使用模拟支付（开发/演示环境，无需后端）
// false: 使用真实微信支付（需要后端配合统一下单）
export const USE_MOCK_PAYMENT = true

// 通用请求函数
function request<T>(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data as T)
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

// 创建代停车订单
export function createValetOrder(order: Partial<ValetOrder>): Promise<ValetOrder> {
  return request<ValetOrder>('/orders/valet', 'POST', order)
}

// 获取代停车订单列表
export function getValetOrders(status?: ValetOrderStatus): Promise<ValetOrder[]> {
  const url = status ? `/orders/valet?status=${status}` : '/orders/valet'
  return request<ValetOrder[]>(url)
}

// 获取订单详情
export function getOrderDetail(orderId: string): Promise<ValetOrder> {
  return request<ValetOrder>(`/orders/${orderId}`)
}

// 取消订单
export function cancelOrder(orderId: string): Promise<void> {
  return request<void>(`/orders/${orderId}/cancel`, 'POST')
}

// 支付订单 —— 调用后端统一下单，获取微信支付参数
export function payOrder(orderId: string, amount: number): Promise<{ paymentParams: any }> {
  return request<{ paymentParams: any }>(`/orders/${orderId}/pay`, 'POST', { amount })
}

// 获取附近的小哥
export function getNearbyWorkers(latitude: number, longitude: number): Promise<any[]> {
  return request<any[]>(`/workers/nearby?latitude=${latitude}&longitude=${longitude}`)
}

// 上报违章
export function reportViolation(orderId: string, violationInfo: any): Promise<void> {
  return request<void>(`/orders/${orderId}/violation`, 'POST', violationInfo)
}

// 获取位置信息（逆地理编码）
export function reverseGeocode(latitude: number, longitude: number): Promise<{ address: string }> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=S6CBZ-EY5L7-5JLXY-HY6QC-UDUIK-MJBCV&get_poi=1`,
      success: (res: any) => {
        if (res.data.status === 0) {
          resolve({
            address: res.data.result.address || res.data.result.formatted_addresses?.recommend || ''
          })
        } else {
          reject(new Error('获取地址失败'))
        }
      },
      fail: reject
    })
  })
}
