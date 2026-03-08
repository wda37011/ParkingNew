// app.ts
App<IAppOption>({
  globalData: {
    userInfo: null,
    openId: '',
    orders: [] as Order[]
  },
  onLaunch() {
    // 登录
    wx.login({
      success: res => {
        console.log('登录成功', res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        // 这里应该调用后端接口
        this.globalData.openId = res.code
      },
    })

    // 检查更新
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: (res) => {
                if (res.confirm) {
                  updateManager.applyUpdate()
                }
              }
            })
          })
        }
      })
    }
  },
})