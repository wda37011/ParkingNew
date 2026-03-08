// profile.ts - 个人中心
import { showLoading, hideLoading, showSuccess, showError } from '../../utils/util'
import { Wallet } from '../../utils/types'

Page({
  data: {
    userInfo: null as any,
    balance: 0,
    isWorker: false,
    isOwner: false
  },

  onLoad() { this.loadData() },
  onShow() { this.loadData() },

  loadData() {
    const userInfo = wx.getStorageSync('userInfo')
    const workerProfile = wx.getStorageSync('workerProfile')
    const app = getApp<IAppOption>()
    const openId = app.globalData.openId || wx.getStorageSync('openId') || ''

    // 检查是否是车位业主
    const spaces = wx.getStorageSync('parkingSpaces') || []
    const isOwner = spaces.some((s: any) => s.ownerId === openId)

    // 加载钱包
    const wallet: Wallet = wx.getStorageSync('wallet_' + openId) || { openId, balance: 0, transactions: [] }

    this.setData({
      userInfo,
      balance: wallet.balance,
      isWorker: !!workerProfile,
      isOwner
    })
  },

  handleLogin() {
    showLoading('登录中...')
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = {
          ...res.userInfo,
          openId: wx.getStorageSync('openId') || 'user_' + Date.now()
        }
        wx.setStorageSync('userInfo', userInfo)
        wx.setStorageSync('openId', userInfo.openId)
        const app = getApp<IAppOption>()
        app.globalData.openId = userInfo.openId
        app.globalData.userInfo = res.userInfo
        this.setData({ userInfo })
        hideLoading()
        showSuccess('登录成功')
      },
      fail: () => { hideLoading(); showError('登录失败') }
    })
  },

  goWallet() { wx.navigateTo({ url: '/pages/wallet/wallet' }) },
  goOrders() { wx.switchTab({ url: '/pages/orders/orders' }) },
  goWorkerHome() {
    const wp = wx.getStorageSync('workerProfile')
    wx.navigateTo({ url: wp ? '/pages/worker-home/worker-home' : '/pages/worker-register/worker-register' })
  },
  goOwnerManage() { wx.navigateTo({ url: '/pages/owner-manage/owner-manage' }) },

  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-123-4567',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) wx.makePhoneCall({ phoneNumber: '400-123-4567', fail: () => showError('拨打失败') })
      }
    })
  },

  aboutUs() {
    wx.showModal({
      title: '关于代易停',
      content: '代易停 - 景区智慧停车服务平台\n\n解决景区停车难题，提供自助停车、代停车、车位出租一站式服务。',
      showCancel: false
    })
  }
})
