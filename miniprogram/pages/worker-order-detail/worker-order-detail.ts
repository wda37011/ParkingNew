import { showLoading, hideLoading, showSuccess, showError, calculateDistance } from '../../utils/util'
import { ValetOrder, ValetOrderStatus, ParkingSpace, Transaction, Wallet } from '../../utils/types'

Page({
  data: {
    order: null as ValetOrder | null,
    nearbySpaces: [] as ParkingSpace[],
    isMine: false
  },

  onLoad(options: any) {
    if (options.id) this.loadOrder(options.id)
  },

  onShow() {
    if (this.data.order) this.loadOrder(this.data.order.id)
  },

  loadOrder(id: string) {
    const orders: ValetOrder[] = wx.getStorageSync('valetOrders') || []
    const order = orders.find(o => o.id === id)
    if (!order) { showError('订单不存在'); return }

    const app = getApp<IAppOption>()
    const myId = app.globalData.openId || wx.getStorageSync('openId') || ''
    this.setData({ order, isMine: order.workerId === myId })

    // 加载附近车位
    if (order.pickLocation.latitude) this.loadNearbySpaces(order.pickLocation)
  },

  loadNearbySpaces(loc: any) {
    const all: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const now = new Date().toISOString()
    const available = all.filter(s => s.isActive && !s.isOccupied && s.availableFrom <= now && s.availableTo >= now)
      .map(s => ({
        ...s,
        distance: calculateDistance(loc.latitude, loc.longitude, s.location.latitude, s.location.longitude)
      }))
      .sort((a, b) => (a as any).distance - (b as any).distance)
      .slice(0, 10)
    this.setData({ nearbySpaces: available })
  },

  // 接单
  acceptOrder() {
    const order = this.data.order
    if (!order) return
    wx.showModal({
      title: '确认接单',
      content: `接受此代停车订单？预计收入 ¥${order.estimatedTotal}`,
      success: (res) => {
        if (res.confirm) {
          const app = getApp<IAppOption>()
          const myId = app.globalData.openId || wx.getStorageSync('openId') || ''
          this.updateOrderField(order.id, { status: ValetOrderStatus.ACCEPTED, workerId: myId })
          showSuccess('接单成功')
        }
      }
    })
  },

  // 开始取车并导航
  startPick() {
    const order = this.data.order
    if (!order) return
    this.updateOrderField(order.id, { status: ValetOrderStatus.PICKING })
    wx.openLocation({
      latitude: order.pickLocation.latitude,
      longitude: order.pickLocation.longitude,
      name: order.pickLocation.name || '取车位置',
      address: order.pickLocation.address,
      scale: 18
    })
  },

  // 到达取车点
  arrivePick() {
    const order = this.data.order
    if (!order) return
    this.updateOrderField(order.id, { pickArriveTime: new Date().toISOString() })
    showSuccess('已到达取车点，车主将收到通知')
  },

  // 选择车位前往停车
  goToSpace(e: any) {
    const idx = e.currentTarget.dataset.idx
    const space = this.data.nearbySpaces[idx]
    if (!space) return
    const order = this.data.order
    if (!order) return

    this.updateOrderField(order.id, { parkSpaceId: space.id, parkingStartTime: new Date().toISOString(), status: ValetOrderStatus.PARKED })
    // 标记车位占用
    const spaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    wx.setStorageSync('parkingSpaces', spaces.map(s => s.id === space.id ? { ...s, isOccupied: true } : s))

    wx.openLocation({
      latitude: space.location.latitude,
      longitude: space.location.longitude,
      name: space.buildingInfo + ' ' + space.spaceCode,
      address: space.location.address,
      scale: 18
    })
  },

  // 自行选择车位停车（不从列表选）
  selfPark() {
    const order = this.data.order
    if (!order) return
    this.updateOrderField(order.id, { parkingStartTime: new Date().toISOString(), status: ValetOrderStatus.PARKED })
    showSuccess('已标记为停车中')
  },

  // 开始还车并导航
  startReturn() {
    const order = this.data.order
    if (!order) return

    // 小哥需要先支付停车费（如果有选择车位）
    if (order.parkSpaceId) {
      // 计算停车费
      const now = new Date()
      const start = new Date(order.parkingStartTime || now.toISOString())
      const hours = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60)))
      const spaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
      const space = spaces.find(s => s.id === order.parkSpaceId)
      let parkingFee = 0
      if (space) {
        const sFee = hours * space.hourlyPrice
        const cFee = hours * space.communityFee
        parkingFee = Number(((sFee + cFee) * 1.2).toFixed(2))
        // 释放车位
        wx.setStorageSync('parkingSpaces', spaces.map(s => s.id === space.id ? { ...s, isOccupied: false } : s))
        // 给车位业主添加收入
        this.addOwnerIncome(space.ownerId, sFee, order.id)
      }

      this.updateOrderField(order.id, {
        status: ValetOrderStatus.RETURNING,
        parkingEndTime: now.toISOString(),
        actualParkingFee: parkingFee
      })

      wx.showModal({
        title: '停车费用',
        content: `停车 ${hours} 小时，费用 ¥${parkingFee}。确认后导航前往还车点。`,
        showCancel: false,
        success: () => {
          wx.openLocation({
            latitude: order.returnLocation.latitude,
            longitude: order.returnLocation.longitude,
            name: order.returnLocation.name || '还车位置',
            address: order.returnLocation.address,
            scale: 18
          })
        }
      })
    } else {
      this.updateOrderField(order.id, { status: ValetOrderStatus.RETURNING, parkingEndTime: new Date().toISOString() })
      wx.openLocation({
        latitude: order.returnLocation.latitude,
        longitude: order.returnLocation.longitude,
        name: order.returnLocation.name || '还车位置',
        address: order.returnLocation.address,
        scale: 18
      })
    }
  },

  // 到达还车点
  arriveReturn() {
    const order = this.data.order
    if (!order) return
    this.updateOrderField(order.id, { returnArriveTime: new Date().toISOString(), status: ValetOrderStatus.RETURNED })
    showSuccess('已到达还车点，等待车主确认收车')
  },

  // 给车位业主添加收入
  addOwnerIncome(ownerId: string, amount: number, orderId: string) {
    const key = 'wallet_' + ownerId
    const wallet: Wallet = wx.getStorageSync(key) || { openId: ownerId, balance: 0, transactions: [] }
    const tx: Transaction = {
      id: 'TX' + Date.now() + Math.random().toString(36).substr(2, 4),
      type: 'income',
      role: 'owner',
      amount: Number(amount.toFixed(2)),
      description: '车位出租收入',
      relatedOrderId: orderId,
      createTime: new Date().toISOString()
    }
    wallet.transactions.unshift(tx)
    wallet.balance = Number((wallet.balance + amount).toFixed(2))
    wx.setStorageSync(key, wallet)
  },

  updateOrderField(id: string, updates: Partial<ValetOrder>) {
    const orders: ValetOrder[] = wx.getStorageSync('valetOrders') || []
    const updated = orders.map(o => o.id === id ? { ...o, ...updates } : o)
    wx.setStorageSync('valetOrders', updated)
    const order = updated.find(o => o.id === id)
    if (order) this.setData({ order })
  }
})

