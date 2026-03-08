import { showLoading, hideLoading, showSuccess, showError, calculateDistance } from '../../utils/util'
import { reverseGeocode } from '../../utils/api'
import { ValetOrder, ValetOrderStatus, Location } from '../../utils/types'

Page({
  data: {
    carNumber: '',
    phone: '',
    pickLocation: {} as Location,
    returnLocation: {} as Location,
    pickTime: '',
    returnTime: '',
    pickTimeText: '',
    returnTimeText: '',
    pickTimeIndex: [0, 0],
    returnTimeIndex: [0, 0],
    timeRange: [[], []] as any[][],
    remark: '',
    baseFee: 20,
    parkingFee: 0,
    distanceFee: 0,
    estimatedTotal: 20,
    estimatedHours: 0,
    distanceText: '',
    canSubmit: false
  },

  onLoad() {
    this.initTimeRange()
    this.initDefaults()
  },

  initDefaults() {
    const last = wx.getStorageSync('lastCarInfo')
    if (last) this.setData({ carNumber: last.carNumber || '', phone: last.phone || '' })

    // 默认取车时间：向上取整半小时
    const now = new Date()
    const rounded = new Date(now)
    const m = rounded.getMinutes()
    if (m > 0 && m <= 30) rounded.setMinutes(30, 0, 0)
    else if (m > 30) rounded.setHours(rounded.getHours() + 1, 0, 0, 0)

    const dates = this.data.timeRange[0]
    const times = this.data.timeRange[1]
    if (dates.length && times.length) {
      const timeStr = `${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`
      const tIdx = Math.max(0, times.findIndex((t: string) => t === timeStr))
      this.setData({
        pickTimeIndex: [0, tIdx],
        pickTime: rounded.toISOString(),
        pickTimeText: `${dates[0]} ${times[tIdx]}`
      })
    }

    // 默认位置：当前定位
    wx.getLocation({
      type: 'gcj02',
      success: async (res) => {
        let addr = ''
        try { addr = (await reverseGeocode(res.latitude, res.longitude)).address } catch {}
        const loc: Location = { latitude: res.latitude, longitude: res.longitude, address: addr || '当前位置' }
        this.setData({ pickLocation: loc, returnLocation: loc })
        this.calculatePrice()
        this.checkCanSubmit()
      },
      fail: () => {}
    })
  },

  initTimeRange() {
    const dates: string[] = []
    const times: string[] = []
    const now = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i)
      dates.push(`${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`)
    }
    for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 30)
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    this.setData({ timeRange: [dates, times] })
  },

  onCarNumberInput(e: any) { this.setData({ carNumber: e.detail.value.toUpperCase() }); this.checkCanSubmit() },
  onPhoneInput(e: any) { this.setData({ phone: e.detail.value }); this.checkCanSubmit() },
  onRemarkInput(e: any) { this.setData({ remark: e.detail.value }) },

  choosePickLocation() {
    wx.chooseLocation({
      success: async (res) => {
        let addr = res.address || ''
        try { const r = await reverseGeocode(Number(res.latitude), Number(res.longitude)); if (r.address) addr = r.address } catch {}
        this.setData({ pickLocation: { latitude: Number(res.latitude), longitude: Number(res.longitude), address: addr || res.name || '已选择位置', name: res.name } })
        this.calculatePrice(); this.checkCanSubmit()
      },
      fail: () => {}
    })
  },

  chooseReturnLocation() {
    wx.chooseLocation({
      success: async (res) => {
        let addr = res.address || ''
        try { const r = await reverseGeocode(Number(res.latitude), Number(res.longitude)); if (r.address) addr = r.address } catch {}
        this.setData({ returnLocation: { latitude: Number(res.latitude), longitude: Number(res.longitude), address: addr || res.name || '已选择位置', name: res.name } })
        this.calculatePrice(); this.checkCanSubmit()
      },
      fail: () => {}
    })
  },

  onPickTimeChange(e: any) {
    const [di, ti] = e.detail.value
    const dates = this.data.timeRange[0], times = this.data.timeRange[1]
    const d = new Date(); d.setDate(d.getDate() + di)
    const [h, m] = times[ti].split(':')
    d.setHours(parseInt(h), parseInt(m), 0, 0)
    this.setData({ pickTimeIndex: [di, ti], pickTime: d.toISOString(), pickTimeText: `${dates[di]} ${times[ti]}` })
    this.calculatePrice(); this.checkCanSubmit()
  },

  onReturnTimeChange(e: any) {
    const [di, ti] = e.detail.value
    const dates = this.data.timeRange[0], times = this.data.timeRange[1]
    const d = new Date(); d.setDate(d.getDate() + di)
    const [h, m] = times[ti].split(':')
    d.setHours(parseInt(h), parseInt(m), 0, 0)

    if (this.data.pickTime) {
      const diff = d.getTime() - new Date(this.data.pickTime).getTime()
      if (diff < 30 * 60 * 1000) { showError('还车时间需晚于取车时间至少30分钟'); return }
    }
    this.setData({ returnTimeIndex: [di, ti], returnTime: d.toISOString(), returnTimeText: `${dates[di]} ${times[ti]}` })
    this.calculatePrice(); this.checkCanSubmit()
  },

  calculatePrice() {
    const { pickLocation, returnLocation, pickTime, returnTime } = this.data
    if (!pickLocation.latitude || !returnLocation.latitude || !pickTime || !returnTime) return

    const baseFee = 20
    const distance = calculateDistance(pickLocation.latitude, pickLocation.longitude, returnLocation.latitude, returnLocation.longitude)
    const distanceKm = distance / 1000
    const distanceFee = Math.max(1, Math.ceil(distanceKm / 2)) * 10
    const timeDiff = new Date(returnTime).getTime() - new Date(pickTime).getTime()
    const hours = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60)))
    const parkingFee = hours * 6
    const estimatedTotal = baseFee + parkingFee + distanceFee

    this.setData({
      baseFee, parkingFee, distanceFee, estimatedTotal, estimatedHours: hours,
      distanceText: distance < 1000 ? `${distance}米` : `${distanceKm.toFixed(1)}公里`
    })
  },

  checkCanSubmit() {
    const { carNumber, phone, pickLocation, returnLocation, pickTime, returnTime } = this.data
    this.setData({ canSubmit: !!(carNumber && phone && pickLocation.latitude && returnLocation.latitude && pickTime && returnTime) })
  },

  submitOrder() {
    if (!this.data.canSubmit) { showError('请完善订单信息'); return }
    if (!this.data.returnTime) { showError('请选择还车时间'); return }

    const pick = new Date(this.data.pickTime), ret = new Date(this.data.returnTime)
    if (ret.getTime() - pick.getTime() < 30 * 60 * 1000) { showError('还车时间需晚于取车时间至少30分钟'); return }

    showLoading('提交中...')
    try {
      const app = getApp<IAppOption>()
      const userId = app.globalData.openId || wx.getStorageSync('openId') || 'user_' + Date.now()

      const order: ValetOrder = {
        id: 'VL' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase(),
        userId,
        userPhone: this.data.phone,
        carNumber: this.data.carNumber,
        pickLocation: this.data.pickLocation,
        pickTime: this.data.pickTime,
        returnLocation: this.data.returnLocation,
        returnTime: this.data.returnTime,
        remark: this.data.remark,
        baseFee: this.data.baseFee,
        estimatedParkingFee: this.data.parkingFee,
        distanceFee: this.data.distanceFee,
        estimatedTotal: this.data.estimatedTotal,
        status: ValetOrderStatus.PENDING,
        ownerConfirmed: false,
        paid: false,
        createTime: new Date().toISOString()
      }

      const orders: ValetOrder[] = wx.getStorageSync('valetOrders') || []
      orders.unshift(order)
      wx.setStorageSync('valetOrders', orders)
      wx.setStorageSync('lastCarInfo', { carNumber: this.data.carNumber, phone: this.data.phone })

      hideLoading()
      showSuccess('订单已提交')
      setTimeout(() => wx.navigateBack(), 1500)
    } catch {
      hideLoading()
      showError('提交失败，请重试')
    }
  }
})

