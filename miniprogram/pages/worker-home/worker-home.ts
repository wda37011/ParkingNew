import { showSuccess, showError, calculateDistance } from '../../utils/util'
import { ValetOrder, ValetOrderStatus } from '../../utils/types'

Page({
  data: {
    sortBy: 'distance' as 'distance' | 'time',
    orders: [] as any[],
    myLat: 0,
    myLng: 0,
    workerProfile: null as any
  },

  onLoad() {
    const wp = wx.getStorageSync('workerProfile')
    if (!wp) {
      wx.redirectTo({ url: '/pages/worker-register/worker-register' })
      return
    }
    this.setData({ workerProfile: wp })
    this.getMyLocation()
  },

  onShow() {
    this.loadOrders()
  },

  getMyLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({ myLat: res.latitude, myLng: res.longitude })
        this.loadOrders()
      },
      fail: () => this.loadOrders()
    })
  },

  loadOrders() {
    const allOrders: ValetOrder[] = wx.getStorageSync('valetOrders') || []
    const app = getApp<IAppOption>()
    const myId = app.globalData.openId || wx.getStorageSync('openId') || ''

    // 待接单 + 自己已接的进行中订单
    const list = allOrders.filter(o =>
      o.status === ValetOrderStatus.PENDING ||
      (o.workerId === myId && ['accepted', 'picking', 'parked', 'returning', 'returned'].indexOf(o.status) >= 0)
    )

    const { myLat, myLng } = this.data
    const formatted = list.map(o => {
      let distance = 0
      let distanceText = ''
      if (myLat && myLng && o.pickLocation.latitude) {
        distance = calculateDistance(myLat, myLng, o.pickLocation.latitude, o.pickLocation.longitude)
        distanceText = distance < 1000 ? distance + '米' : (distance / 1000).toFixed(1) + '公里'
      }
      return {
        ...o,
        distance,
        distanceText,
        statusText: this.getStatusText(o.status),
        pickTimeShort: this.formatShort(o.pickTime),
        isMine: o.workerId === myId
      }
    })

    // 排序
    if (this.data.sortBy === 'distance') {
      formatted.sort((a, b) => a.distance - b.distance)
    } else {
      formatted.sort((a, b) => new Date(a.pickTime).getTime() - new Date(b.pickTime).getTime())
    }

    this.setData({ orders: formatted })
  },

  getStatusText(status: string): string {
    const map: Record<string, string> = {
      pending: '待接单', accepted: '已接单', picking: '取车中',
      parked: '已停车', returning: '还车中', returned: '待确认', completed: '已完成', cancelled: '已取消'
    }
    return map[status] || status
  },

  formatShort(iso: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    return `${(d.getMonth() + 1)}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  switchSort(e: any) {
    this.setData({ sortBy: e.currentTarget.dataset.sort })
    this.loadOrders()
  },

  viewDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/worker-order-detail/worker-order-detail?id=${id}` })
  },

  goWallet() {
    wx.navigateTo({ url: '/pages/wallet/wallet' })
  }
})

