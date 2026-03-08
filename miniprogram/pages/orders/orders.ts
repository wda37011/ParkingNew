// orders.ts - 统一订单列表（自主停车 + 代停车）
import { showSuccess, showError } from '../../utils/util'
import { SelfParkingOrder, SelfParkingStatus, ValetOrder, ValetOrderStatus } from '../../utils/types'

Page({
  data: {
    currentTab: 'self' as 'self' | 'valet',
    selfOrders: [] as any[],
    valetOrders: [] as any[]
  },

  onLoad() { this.loadAll() },
  onShow() { this.loadAll() },

  loadAll() {
    this.loadSelfOrders()
    this.loadValetOrders()
  },

  loadSelfOrders() {
    const app = getApp<IAppOption>()
    const myId = app.globalData.openId || wx.getStorageSync('openId') || ''
    const all: SelfParkingOrder[] = wx.getStorageSync('selfParkingOrders') || []
    const mine = all.filter(o => o.userId === myId || !myId)
    const formatted = mine.map(o => ({
      ...o,
      statusText: this.getSelfStatus(o.status),
      statusColor: o.status === 'completed' ? '#50C878' : o.status === 'cancelled' ? '#999' : '#4A90E2',
      feeText: o.totalFee ? `¥${o.totalFee}` : '--'
    }))
    this.setData({ selfOrders: formatted })
  },

  loadValetOrders() {
    const app = getApp<IAppOption>()
    const myId = app.globalData.openId || wx.getStorageSync('openId') || ''
    const all: ValetOrder[] = wx.getStorageSync('valetOrders') || []
    const mine = all.filter(o => o.userId === myId || !myId)
    const formatted = mine.map(o => ({
      ...o,
      statusText: this.getValetStatus(o.status),
      statusColor: o.status === 'completed' ? '#50C878' : o.status === 'cancelled' ? '#999' : o.status === 'pending' ? '#FF9500' : '#4A90E2',
      feeText: `¥${o.estimatedTotal}`
    }))
    this.setData({ valetOrders: formatted })
  },

  getSelfStatus(s: string): string {
    const m: Record<string, string> = {
      navigating: '前往中', parking: '停车中', pending_pay: '待支付', completed: '已完成', cancelled: '已取消'
    }
    return m[s] || s
  },

  getValetStatus(s: string): string {
    const m: Record<string, string> = {
      pending: '待接单', accepted: '已接单', picking: '取车中', parked: '已停车',
      returning: '还车中', returned: '待确认', completed: '已完成', cancelled: '已取消'
    }
    return m[s] || s
  },

  switchTab(e: any) {
    this.setData({ currentTab: e.currentTarget.dataset.tab })
  },

  goToSelfDetail(e: any) {
    const id = e.currentTarget.dataset.id
    // 如果是待支付，直接去支付
    const orders: SelfParkingOrder[] = wx.getStorageSync('selfParkingOrders') || []
    const order = orders.find(o => o.id === id)
    if (order && order.status === SelfParkingStatus.PENDING_PAY) {
      wx.navigateTo({ url: `/pages/payment/payment?type=selfparking&id=${id}` })
    } else if (order && (order.status === SelfParkingStatus.NAVIGATING || order.status === SelfParkingStatus.PARKING)) {
      wx.navigateTo({ url: '/pages/user-parking/user-parking' })
    }
  },

  goToValetDetail(e: any) {
    const id = e.currentTarget.dataset.id
    const order = (wx.getStorageSync('valetOrders') || []).find((o: ValetOrder) => o.id === id)
    if (order && order.status === ValetOrderStatus.RETURNED && !order.paid) {
      wx.navigateTo({ url: `/pages/payment/payment?type=valet&id=${id}` })
    }
  },

  // 确认收车（车主确认）
  confirmReceive(e: any) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认收车',
      content: '确认已收到车辆？确认后将进入支付流程。',
      success: (res) => {
        if (res.confirm) {
          const orders: ValetOrder[] = wx.getStorageSync('valetOrders') || []
          const updated = orders.map(o => o.id === id ? { ...o, ownerConfirmed: true } : o)
          wx.setStorageSync('valetOrders', updated)
          showSuccess('已确认收车')
          // 跳转支付
          wx.navigateTo({ url: `/pages/payment/payment?type=valet&id=${id}` })
        }
      }
    })
  },

  cancelValetOrder(e: any) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消订单',
      content: '确定取消此代停车订单？',
      success: (res) => {
        if (res.confirm) {
          const orders: ValetOrder[] = wx.getStorageSync('valetOrders') || []
          wx.setStorageSync('valetOrders', orders.map(o => o.id === id ? { ...o, status: ValetOrderStatus.CANCELLED } : o))
          showSuccess('已取消')
          this.loadAll()
        }
      }
    })
  },

  goCreateOrder() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
