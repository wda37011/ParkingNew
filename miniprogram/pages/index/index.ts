Page({
  data: {},

  // 我要停车
  goUserParking() {
    wx.navigateTo({ url: '/pages/user-parking/user-parking' })
  },

  // 我是代停车小哥
  goWorkerHome() {
    const workerProfile = wx.getStorageSync('workerProfile')
    if (!workerProfile) {
      wx.navigateTo({ url: '/pages/worker-register/worker-register' })
    } else {
      wx.navigateTo({ url: '/pages/worker-home/worker-home' })
    }
  },

  // 我要出租车位
  goOwnerManage() {
    wx.navigateTo({ url: '/pages/owner-manage/owner-manage' })
  }
})
