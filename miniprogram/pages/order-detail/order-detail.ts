// order-detail.ts - 统一订单详情（自主停车 + 代停车）
import { formatTime, showLoading, hideLoading, showSuccess, showError } from '../../utils/util'
import { ValetOrder, ValetOrderStatus, SelfParkingOrder, SelfParkingStatus, ParkingSpace } from '../../utils/types'

Page({
  data: {
    detailType: 'valet' as 'valet' | 'selfparking',
    // 代停车
    valetOrder: null as any,
    // 自主停车
    selfOrder: null as any,
    space: null as ParkingSpace | null,
    // 状态
    statusText: '',
    statusColor: '',
    statusIcon: '',
    statusDesc: ''
  },

  onLoad(options: any) {
    const type = options.type || 'valet'
    const id = options.id
    this.setData({ detailType: type })
    if (id) {
      if (type === 'selfparking') {
        this.loadSelfOrder(id)
      } else {
        this.loadValetOrder(id)
      }
    }
  },

  onShow() {
    if (this.data.detailType === 'selfparking' && this.data.selfOrder) {
      this.loadSelfOrder(this.data.selfOrder.id)
    } else if (this.data.valetOrder) {
      this.loadValetOrder(this.data.valetOrder.id)
    }
  },

  // =============== 代停车订单详情 ===============
  loadValetOrder(orderId: string) {
    const orders: ValetOrder[] = wx.getStorageSync('valetOrders') || []
    const order = orders.find((o: ValetOrder) => o.id === orderId)

    if (!order) {
      showError('订单不存在')
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const statusInfo = this.getValetStatusInfo(order.status)
    this.setData({
      valetOrder: {
        ...order,
        createTimeText: formatTime(order.createTime),
        pickTimeText: formatTime(order.pickTime),
        returnTimeText: formatTime(order.returnTime),
        pickArriveTimeText: order.pickArriveTime ? formatTime(order.pickArriveTime) : '',
        returnArriveTimeText: order.returnArriveTime ? formatTime(order.returnArriveTime) : '',
      },
      statusText: statusInfo.text,
      statusColor: statusInfo.color,
      statusIcon: statusInfo.icon,
      statusDesc: statusInfo.desc
    })
  },

  getValetStatusInfo(status: ValetOrderStatus) {
    const map: Record<string, { text: string; color: string; icon: string; desc: string }> = {
      'pending': { text: '待接单', color: '#FF9500', icon: '⏳', desc: '等待附近小哥接单' },
      'accepted': { text: '已接单', color: '#4A90E2', icon: '✅', desc: '小哥已接单，准备前往取车' },
      'picking': { text: '取车中', color: '#4A90E2', icon: '🚗', desc: '小哥正在前往取车位置' },
      'parked': { text: '已停车', color: '#50C878', icon: '🅿️', desc: '车辆已安全停放' },
      'returning': { text: '还车中', color: '#4A90E2', icon: '🚙', desc: '小哥正在将车辆送回' },
      'returned': { text: '待确认', color: '#FF9500', icon: '📋', desc: '小哥已到达还车点，请确认收车' },
      'completed': { text: '已完成', color: '#50C878', icon: '✓', desc: '订单已完成，感谢使用' },
      'cancelled': { text: '已取消', color: '#999999', icon: '✕', desc: '订单已取消' }
    }
    return map[status] || map['pending']
  },

  // =============== 自主停车订单详情 ===============
  loadSelfOrder(orderId: string) {
    const orders: SelfParkingOrder[] = wx.getStorageSync('selfParkingOrders') || []
    const order = orders.find((o: SelfParkingOrder) => o.id === orderId)

    if (!order) {
      showError('停车记录不存在')
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const spaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const space = spaces.find((s: ParkingSpace) => s.id === order.spaceId) || null

    const statusInfo = this.getSelfStatusInfo(order.status)
    this.setData({
      selfOrder: {
        ...order,
        createTimeText: formatTime(order.createTime),
        startTimeText: order.startTime ? formatTime(order.startTime) : '--',
        endTimeText: order.endTime ? formatTime(order.endTime) : '--',
        durationText: order.parkingMinutes
          ? `${Math.floor(order.parkingMinutes / 60)}小时${order.parkingMinutes % 60}分钟`
          : '--',
      },
      space,
      statusText: statusInfo.text,
      statusColor: statusInfo.color,
      statusIcon: statusInfo.icon,
      statusDesc: statusInfo.desc
    })
  },

  getSelfStatusInfo(status: SelfParkingStatus) {
    const map: Record<string, { text: string; color: string; icon: string; desc: string }> = {
      'navigating': { text: '前往中', color: '#4A90E2', icon: '🧭', desc: '正在前往车位' },
      'parking': { text: '停车中', color: '#4A90E2', icon: '🅿️', desc: '车辆正在停放计时中' },
      'pending_pay': { text: '待支付', color: '#FF9500', icon: '💳', desc: '请完成支付' },
      'completed': { text: '已完成', color: '#50C878', icon: '✓', desc: '停车已完成，支付成功' },
      'cancelled': { text: '已取消', color: '#999999', icon: '✕', desc: '已取消' }
    }
    return map[status] || map['navigating']
  },

  // =============== 通用操作 ===============
  openMap(e: any) {
    const type = e.currentTarget.dataset.type // pick, return, space
    let lat = 0, lng = 0, name = '', address = ''

    if (this.data.detailType === 'valet' && this.data.valetOrder) {
      const order = this.data.valetOrder
      if (type === 'pick' && order.pickLocation) {
        lat = order.pickLocation.latitude
        lng = order.pickLocation.longitude
        name = order.pickLocation.name || order.pickLocation.address
        address = order.pickLocation.address
      } else if (type === 'return' && order.returnLocation) {
        lat = order.returnLocation.latitude
        lng = order.returnLocation.longitude
        name = order.returnLocation.name || order.returnLocation.address
        address = order.returnLocation.address
      }
    } else if (this.data.space) {
      lat = this.data.space.location.latitude
      lng = this.data.space.location.longitude
      name = this.data.space.buildingInfo || this.data.space.location.address
      address = this.data.space.location.address
    }

    if (lat && lng) {
      wx.openLocation({ latitude: lat, longitude: lng, name, address, scale: 18 })
    }
  },

  // 取消代停车订单
  cancelValetOrder() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个代停车订单吗？',
      success: (res) => {
        if (res.confirm) {
          showLoading('取消中...')
          const orders: ValetOrder[] = wx.getStorageSync('valetOrders') || []
          const updated = orders.map((o: ValetOrder) => {
            if (o.id === this.data.valetOrder.id) {
              return { ...o, status: ValetOrderStatus.CANCELLED }
            }
            return o
          })
          wx.setStorageSync('valetOrders', updated)
          hideLoading()
          showSuccess('已取消')
          this.loadValetOrder(this.data.valetOrder.id)
        }
      }
    })
  },

  // 确认收车
  confirmReceive() {
    wx.showModal({
      title: '确认收车',
      content: '确认已收到车辆？确认后将进入支付流程。',
      success: (res) => {
        if (res.confirm) {
          const orders: ValetOrder[] = wx.getStorageSync('valetOrders') || []
          const updated = orders.map((o: ValetOrder) => {
            if (o.id === this.data.valetOrder.id) {
              return { ...o, ownerConfirmed: true }
            }
            return o
          })
          wx.setStorageSync('valetOrders', updated)
          showSuccess('已确认收车')
          wx.navigateTo({
            url: `/pages/payment/payment?type=valet&id=${this.data.valetOrder.id}`
          })
        }
      }
    })
  },

  // 跳转支付
  goToPayment() {
    if (this.data.detailType === 'valet') {
      wx.navigateTo({
        url: `/pages/payment/payment?type=valet&id=${this.data.valetOrder.id}`
      })
    } else {
      wx.navigateTo({
        url: `/pages/payment/payment?type=selfparking&id=${this.data.selfOrder.id}`
      })
    }
  },

  // 联系小哥（代停车）
  contactWorker() {
    if (!this.data.valetOrder || !this.data.valetOrder.workerId) {
      showError('小哥信息不可用')
      return
    }
    const workerProfile = wx.getStorageSync('workerProfile')
    if (workerProfile && workerProfile.phone) {
      wx.makePhoneCall({
        phoneNumber: workerProfile.phone,
        fail: () => showError('拨打电话失败')
      })
    } else {
      showError('小哥联系方式不可用')
    }
  },

  // 上报违章
  reportViolation() {
    wx.showModal({
      title: '上报违章',
      content: '如果车辆在代停车期间发生违章，请在30日内上报，小哥将全额赔偿。',
      confirmText: '确认上报',
      success: (res) => {
        if (res.confirm) {
          showSuccess('违章上报成功，请等待处理')
        }
      }
    })
  }
})
