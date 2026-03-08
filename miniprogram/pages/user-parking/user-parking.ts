import { showLoading, hideLoading, showSuccess, showError, calculateDistance } from '../../utils/util'
import { reverseGeocode } from '../../utils/api'
import { ParkingSpace, SelfParkingOrder, SelfParkingStatus, Location } from '../../utils/types'

Page({
  data: {
    carNumber: '',
    phone: '',
    latitude: 39.9,
    longitude: 116.4,
    currentAddress: '',
    markers: [] as any[],
    scale: 15,
    spaces: [] as ParkingSpace[],
    selectedSpace: null as ParkingSpace | null,
    showSpaceDetail: false,
    // 停车状态: idle | navigating | parking | pendingPay
    parkingState: 'idle',
    currentOrder: null as SelfParkingOrder | null,
    timerText: '00:00:00',
    _timerInterval: 0 as any
  },

  onLoad() {
    this.loadSavedInfo()
    this.getCurrentLocation()
  },

  onShow() {
    this.loadSpaces()
    this.checkActiveOrder()
  },

  onUnload() {
    if (this.data._timerInterval) clearInterval(this.data._timerInterval)
  },

  loadSavedInfo() {
    const last = wx.getStorageSync('lastCarInfo')
    if (last) {
      this.setData({ carNumber: last.carNumber || '', phone: last.phone || '' })
    }
  },

  getCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: async (res) => {
        let address = ''
        try { address = (await reverseGeocode(res.latitude, res.longitude)).address } catch {}
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          currentAddress: address || '当前位置'
        })
        this.loadSpaces()
      },
      fail: () => showError('获取位置失败，请允许位置权限')
    })
  },

  loadSpaces() {
    const allSpaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const now = new Date().toISOString()
    const available = allSpaces.filter(s =>
      s.isActive && !s.isOccupied &&
      s.availableFrom <= now && s.availableTo >= now
    )
    this.setData({ spaces: available })
    this.generateMarkers(available)
  },

  generateMarkers(spaces: ParkingSpace[]) {
    const markers = spaces.map((s, i) => ({
      id: i,
      latitude: s.location.latitude,
      longitude: s.location.longitude,
      width: 30, height: 30,
      iconPath: '',
      callout: {
        content: `${s.buildingInfo}\n¥${s.hourlyPrice}/时`,
        display: 'ALWAYS',
        fontSize: 11,
        borderRadius: 6,
        padding: 5,
        bgColor: '#FFFFFF',
        color: '#333'
      }
    }))
    this.setData({ markers })
  },

  onMarkerTap(e: any) {
    const id = e.detail.markerId !== undefined ? e.detail.markerId : e.markerId
    const space = this.data.spaces[id]
    if (space) this.setData({ selectedSpace: space, showSpaceDetail: true })
  },

  closeSpaceDetail() { this.setData({ showSpaceDetail: false }) },

  navigateToSpace() {
    const space = this.data.selectedSpace
    if (!space) return
    if (!this.data.carNumber) { showError('请先填写车牌号'); return }
    if (!this.data.phone) { showError('请先填写联系电话'); return }

    wx.setStorageSync('lastCarInfo', { carNumber: this.data.carNumber, phone: this.data.phone })

    const app = getApp<IAppOption>()
    const userId = app.globalData.openId || wx.getStorageSync('openId') || 'user_' + Date.now()

    const order: SelfParkingOrder = {
      id: 'SP' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase(),
      userId,
      spaceId: space.id,
      ownerId: space.ownerId,
      carNumber: this.data.carNumber,
      phone: this.data.phone,
      spaceTitle: space.buildingInfo + (space.spaceCode ? ' ' + space.spaceCode : ''),
      spaceAddress: space.location.address,
      hourlyPrice: space.hourlyPrice,
      communityFeePerHour: space.communityFee,
      status: SelfParkingStatus.NAVIGATING,
      paid: false,
      createTime: new Date().toISOString()
    }

    const orders: SelfParkingOrder[] = wx.getStorageSync('selfParkingOrders') || []
    orders.unshift(order)
    wx.setStorageSync('selfParkingOrders', orders)

    this.setData({ currentOrder: order, parkingState: 'navigating', showSpaceDetail: false })

    wx.openLocation({
      latitude: space.location.latitude,
      longitude: space.location.longitude,
      name: order.spaceTitle,
      address: space.location.address,
      scale: 18
    })
  },

  checkActiveOrder() {
    const orders: SelfParkingOrder[] = wx.getStorageSync('selfParkingOrders') || []
    const active = orders.find(o =>
      o.status === SelfParkingStatus.NAVIGATING ||
      o.status === SelfParkingStatus.PARKING ||
      o.status === SelfParkingStatus.PENDING_PAY
    )
    if (active) {
      const state = active.status === SelfParkingStatus.NAVIGATING ? 'navigating'
        : active.status === SelfParkingStatus.PARKING ? 'parking' : 'pendingPay'
      this.setData({ currentOrder: active, parkingState: state, carNumber: active.carNumber, phone: active.phone })
      if (active.status === SelfParkingStatus.PARKING) this.startTimer()
    }
  },

  arriveAndStart() {
    const order = this.data.currentOrder
    if (!order) return
    const now = new Date().toISOString()
    this.updateOrder(order.id, { status: SelfParkingStatus.PARKING, startTime: now })
    this.updateSpaceOccupied(order.spaceId, true)
    this.setData({
      parkingState: 'parking',
      currentOrder: { ...order, status: SelfParkingStatus.PARKING, startTime: now }
    })
    this.startTimer()
    showSuccess('已到达，开始计时')
  },

  startTimer() {
    if (this.data._timerInterval) clearInterval(this.data._timerInterval)
    const order = this.data.currentOrder
    if (!order || !order.startTime) return
    const startMs = new Date(order.startTime).getTime()
    const tick = () => {
      const diff = Math.floor((Date.now() - startMs) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      this.setData({
        timerText: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      })
    }
    tick()
    this.setData({ _timerInterval: setInterval(tick, 1000) })
  },

  endParking() {
    wx.showModal({
      title: '结束计费',
      content: '确认车辆已驶离车位？',
      success: (res) => { if (res.confirm) this.calculateAndFinish() }
    })
  },

  calculateAndFinish() {
    if (this.data._timerInterval) clearInterval(this.data._timerInterval)
    const order = this.data.currentOrder
    if (!order || !order.startTime) return

    const now = new Date()
    const diffMs = now.getTime() - new Date(order.startTime).getTime()
    const minutes = Math.max(1, Math.ceil(diffMs / (1000 * 60)))
    const hours = Math.ceil(minutes / 60)

    let spaceFee = Number((hours * order.hourlyPrice).toFixed(2))
    // 检查每日封顶
    const spaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const space = spaces.find(s => s.id === order.spaceId)
    if (space && space.dailyMaxPrice) {
      const days = Math.max(1, Math.ceil(hours / 24))
      spaceFee = Math.min(spaceFee, days * space.dailyMaxPrice)
    }

    const communityTotalFee = Number((hours * order.communityFeePerHour).toFixed(2))
    const subtotal = spaceFee + communityTotalFee
    const totalFee = Number((subtotal * 1.2).toFixed(2))
    const platformFee = Number((totalFee - subtotal).toFixed(2))

    const updates = {
      status: SelfParkingStatus.PENDING_PAY as SelfParkingStatus,
      endTime: now.toISOString(),
      parkingMinutes: minutes,
      spaceFee,
      communityTotalFee,
      platformFee,
      totalFee
    }
    this.updateOrder(order.id, updates)
    this.updateSpaceOccupied(order.spaceId, false)
    this.setData({ parkingState: 'pendingPay', currentOrder: { ...order, ...updates } })
  },

  goToPay() {
    const order = this.data.currentOrder
    if (!order) return
    wx.navigateTo({ url: `/pages/payment/payment?type=selfparking&id=${order.id}` })
  },

  goToValetOrder() {
    if (this.data.carNumber || this.data.phone) {
      wx.setStorageSync('lastCarInfo', { carNumber: this.data.carNumber, phone: this.data.phone })
    }
    wx.navigateTo({ url: '/pages/valet-order/valet-order' })
  },

  chooseDestination() {
    wx.chooseLocation({
      success: async (res) => {
        let address = res.address || ''
        try {
          const r = await reverseGeocode(Number(res.latitude), Number(res.longitude))
          if (r.address) address = r.address
        } catch {}
        this.setData({
          latitude: Number(res.latitude),
          longitude: Number(res.longitude),
          currentAddress: address || res.name || '已选择位置'
        })
        this.loadSpaces()
      },
      fail: () => {}
    })
  },

  updateOrder(id: string, updates: Partial<SelfParkingOrder>) {
    const orders: SelfParkingOrder[] = wx.getStorageSync('selfParkingOrders') || []
    wx.setStorageSync('selfParkingOrders', orders.map(o => o.id === id ? { ...o, ...updates } : o))
  },

  updateSpaceOccupied(spaceId: string, occupied: boolean) {
    const spaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    wx.setStorageSync('parkingSpaces', spaces.map(s => s.id === spaceId ? { ...s, isOccupied: occupied } : s))
  },

  onCarNumberInput(e: any) { this.setData({ carNumber: e.detail.value.toUpperCase() }) },
  onPhoneInput(e: any) { this.setData({ phone: e.detail.value }) }
})

