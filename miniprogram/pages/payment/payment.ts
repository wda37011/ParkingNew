// payment.ts - 统一支付（自主停车 + 代停车）
import { showLoading, hideLoading, showSuccess, showError, calculateDistance } from '../../utils/util'
import { SelfParkingOrder, SelfParkingStatus, ValetOrder, ValetOrderStatus, ParkingSpace, Wallet, Transaction } from '../../utils/types'
import { USE_MOCK_PAYMENT, payOrder } from '../../utils/api'

Page({
  data: {
    payType: 'valet' as 'valet' | 'selfparking',
    // ===== 代停车订单 =====
    valetOrder: null as ValetOrder | null,
    baseFee: 0,
    distanceFee: 0,
    parkingFee: 0,
    distanceText: '',
    durationHours: 0,
    // ===== 自主停车订单 =====
    selfOrder: null as SelfParkingOrder | null,
    space: null as ParkingSpace | null,
    parkingMinutes: 0,
    parkingHoursText: '',
    spaceFee: 0,
    communityTotalFee: 0,
    platformFee: 0,
    ownerIncome: 0,
    // ===== 通用 =====
    amount: 0,
    amountText: '0.00',
    paymentMethod: 'wechat',
    loading: false
  },

  onLoad(options: any) {
    const payType = options.type || 'valet'
    const id = options.id
    if (!id) {
      showError('缺少订单信息')
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ payType })
    if (payType === 'selfparking') {
      this.loadSelfParkingOrder(id)
    } else {
      this.loadValetOrder(id)
    }
  },

  // ===================== 代停车订单 =====================
  loadValetOrder(orderId: string) {
    const orders: ValetOrder[] = wx.getStorageSync('valetOrders') || []
    const order = orders.find((o: ValetOrder) => o.id === orderId)

    if (!order) {
      showError('订单不存在')
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const baseFee = order.baseFee || 20
    let distanceFee = order.distanceFee || 0
    let distanceText = ''
    let parkingFee = order.estimatedParkingFee || 0
    let durationHours = 0

    if (order.pickLocation && order.returnLocation &&
        order.pickLocation.latitude && order.returnLocation.latitude) {
      const distance = calculateDistance(
        order.pickLocation.latitude,
        order.pickLocation.longitude,
        order.returnLocation.latitude,
        order.returnLocation.longitude
      )
      const distanceKm = distance / 1000
      distanceText = distance < 1000 ? `${distance}米` : `${distanceKm.toFixed(1)}公里`
    }

    if (order.pickTime && order.returnTime) {
      const timeDiff = new Date(order.returnTime).getTime() - new Date(order.pickTime).getTime()
      durationHours = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60)))
    }

    const amount = order.actualTotal || order.estimatedTotal

    this.setData({
      valetOrder: order,
      baseFee,
      distanceFee,
      parkingFee,
      distanceText,
      durationHours,
      amount,
      amountText: amount.toFixed(2)
    })
  },

  // ===================== 自主停车订单 =====================
  loadSelfParkingOrder(orderId: string) {
    const orders: SelfParkingOrder[] = wx.getStorageSync('selfParkingOrders') || []
    const order = orders.find((o: SelfParkingOrder) => o.id === orderId)

    if (!order) {
      showError('停车记录不存在')
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const spaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const space = spaces.find((s: ParkingSpace) => s.id === order.spaceId) || null
    const amount = order.totalFee || 0

    const minutes = order.parkingMinutes || 0
    const hours = Math.ceil(minutes / 60)

    this.setData({
      selfOrder: order,
      space,
      parkingMinutes: minutes,
      parkingHoursText: `${hours}小时${minutes % 60 > 0 ? (minutes % 60) + '分钟' : ''}`,
      spaceFee: order.spaceFee || 0,
      communityTotalFee: order.communityTotalFee || 0,
      platformFee: order.platformFee || 0,
      ownerIncome: order.spaceFee ? Number((order.spaceFee * 0.8).toFixed(2)) : 0,
      amount,
      amountText: amount.toFixed(2)
    })
  },

  // 选择支付方式
  selectPaymentMethod(e: any) {
    this.setData({ paymentMethod: e.currentTarget.dataset.method })
  },

  // ===================== 支付入口 =====================
  async confirmPayment() {
    if (this.data.loading) return

    if (this.data.amount <= 0) {
      showError('支付金额异常')
      return
    }

    this.setData({ loading: true })

    try {
      if (USE_MOCK_PAYMENT) {
        await this.mockPayment()
      } else {
        showLoading('正在发起支付...')
        const payId = this.data.payType === 'valet'
          ? this.data.valetOrder!.id
          : this.data.selfOrder!.id
        const { paymentParams } = await payOrder(payId, this.data.amount)
        hideLoading()
        await this.requestWechatPay(paymentParams)
      }

      // 支付成功 → 更新本地数据
      showLoading('处理中...')
      if (this.data.payType === 'valet') {
        this.completeValetPayment()
      } else {
        this.completeSelfParkingPayment()
      }
      hideLoading()
      showSuccess('支付成功')

      setTimeout(() => {
        if (this.data.payType === 'valet') {
          wx.redirectTo({
            url: `/pages/order-detail/order-detail?type=valet&id=${this.data.valetOrder!.id}`
          })
        } else {
          wx.redirectTo({
            url: `/pages/order-detail/order-detail?type=selfparking&id=${this.data.selfOrder!.id}`
          })
        }
      }, 1500)
    } catch (error: any) {
      hideLoading()
      if (error && error.message === '用户取消支付') {
        // 用户主动取消，不报错
      } else {
        showError('支付失败，请重试')
        console.error('支付失败:', error)
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  // ===================== 模拟支付 =====================
  mockPayment(): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.showModal({
        title: '确认支付',
        content: `将支付 ¥${this.data.amountText}（开发模式-模拟支付）`,
        confirmText: '确认支付',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            resolve()
          } else {
            reject(new Error('用户取消支付'))
          }
        },
        fail: () => reject(new Error('支付弹框异常'))
      })
    })
  },

  // ===================== 真实微信支付 =====================
  requestWechatPay(params: any): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType || 'MD5',
        paySign: params.paySign,
        success: () => resolve(),
        fail: (err) => {
          console.error('wx.requestPayment fail', err)
          reject(err)
        }
      })
    })
  },

  // ===================== 代停车订单支付完成 =====================
  completeValetPayment() {
    const order = this.data.valetOrder
    if (!order) return

    const app = getApp<IAppOption>()
    const userId = app.globalData.openId || wx.getStorageSync('openId')

    const orders: ValetOrder[] = wx.getStorageSync('valetOrders') || []
    const updatedOrders = orders.map((o: ValetOrder) => {
      if (o.id === order.id) {
        return { ...o, paid: true, status: ValetOrderStatus.COMPLETED }
      }
      return o
    })
    wx.setStorageSync('valetOrders', updatedOrders)

    // 记录用户支付交易
    this.recordTransaction(userId, 'expense', 'user', this.data.amount, `支付代停车订单 ${order.id}`, order.id)

    // 小哥收入 = estimatedTotal（扣除实际停车费后由平台结算给小哥）
    if (order.workerId) {
      const workerIncome = Math.max(0, this.data.amount - (order.actualParkingFee || 0))
      if (workerIncome > 0) {
        this.addToWallet(order.workerId, workerIncome)
        this.recordTransaction(order.workerId, 'income', 'worker', workerIncome, `代停车订单收入 ${order.id}`, order.id)
      }
      // 返还小哥垫付的停车费
      if (order.actualParkingFee && order.actualParkingFee > 0) {
        this.addToWallet(order.workerId, order.actualParkingFee)
        this.recordTransaction(order.workerId, 'income', 'worker', order.actualParkingFee, `停车费返还 ${order.id}`, order.id)
      }
    }
  },

  // ===================== 自主停车订单支付完成 =====================
  completeSelfParkingPayment() {
    const order = this.data.selfOrder
    if (!order) return

    const app = getApp<IAppOption>()
    const userId = app.globalData.openId || wx.getStorageSync('openId')

    const orders: SelfParkingOrder[] = wx.getStorageSync('selfParkingOrders') || []
    const updated = orders.map((o: SelfParkingOrder) => {
      if (o.id === order.id) {
        return { ...o, status: SelfParkingStatus.COMPLETED, paid: true }
      }
      return o
    })
    wx.setStorageSync('selfParkingOrders', updated)

    // 记录用户支付交易
    this.recordTransaction(userId, 'expense', 'user', this.data.amount, `支付自助停车 ${order.id}`, order.id)

    // 业主收入 = 总费用 - 平台手续费(20%)
    if (order.ownerId) {
      const platformFeeRate = 0.2
      const ownerIncome = Number((this.data.amount * (1 - platformFeeRate)).toFixed(2))
      if (ownerIncome > 0) {
        this.addToWallet(order.ownerId, ownerIncome)
        this.recordTransaction(order.ownerId, 'income', 'owner', ownerIncome, `车位出租收入 ${order.id}`, order.id)
      }
    }
  },

  // ===================== 工具方法 =====================
  addToWallet(userId: string, amount: number) {
    let wallet: Wallet = wx.getStorageSync('wallet_' + userId) || {
      openId: userId,
      balance: 0,
      transactions: []
    }
    wallet.balance = Number((wallet.balance + amount).toFixed(2))
    wx.setStorageSync('wallet_' + userId, wallet)
  },

  recordTransaction(userId: string, type: 'income' | 'expense' | 'withdraw', role: string, amount: number, description: string, orderId?: string) {
    let wallet: Wallet = wx.getStorageSync('wallet_' + userId) || {
      openId: userId,
      balance: 0,
      transactions: []
    }
    const tx: Transaction = {
      id: 'TX' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: type,
      role: role as any,
      amount: amount,
      description: description,
      relatedOrderId: orderId,
      createTime: new Date().toISOString()
    }
    wallet.transactions = wallet.transactions || []
    wallet.transactions.unshift(tx)
    wx.setStorageSync('wallet_' + userId, wallet)
  }
})
