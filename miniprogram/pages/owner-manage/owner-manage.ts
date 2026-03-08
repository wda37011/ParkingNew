import { showSuccess, showError } from '../../utils/util'
import { ParkingSpace, Wallet } from '../../utils/types'

Page({
  data: {
    spaces: [] as ParkingSpace[],
    totalIncome: 0
  },

  onLoad() { this.loadData() },
  onShow() { this.loadData() },

  loadData() {
    const app = getApp<IAppOption>()
    const ownerId = app.globalData.openId || wx.getStorageSync('openId') || ''
    const all: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const mine = all.filter(s => s.ownerId === ownerId)
    this.setData({ spaces: mine })

    // 加载收入
    const wallet: Wallet = wx.getStorageSync('wallet_' + ownerId) || { openId: ownerId, balance: 0, transactions: [] }
    const income = wallet.transactions
      .filter(t => t.role === 'owner' && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    this.setData({ totalIncome: Number(income.toFixed(2)) })
  },

  addSpace() {
    if (this.data.spaces.length >= 10) {
      showError('最多只能添加10个车位')
      return
    }
    wx.navigateTo({ url: '/pages/owner-add-space/owner-add-space' })
  },

  editSpace(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/owner-add-space/owner-add-space?id=${id}` })
  },

  toggleSpace(e: any) {
    const id = e.currentTarget.dataset.id
    const all: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const space = all.find(s => s.id === id)
    if (!space) return
    const updated = all.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s)
    wx.setStorageSync('parkingSpaces', updated)
    this.loadData()
    showSuccess(space.isActive ? '已下架' : '已上架')
  },

  deleteSpace(e: any) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: (res) => {
        if (res.confirm) {
          const all: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
          wx.setStorageSync('parkingSpaces', all.filter(s => s.id !== id))
          this.loadData()
          showSuccess('已删除')
        }
      }
    })
  },

  goWallet() {
    wx.navigateTo({ url: '/pages/wallet/wallet' })
  }
})

