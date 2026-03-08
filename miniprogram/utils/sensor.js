wx.startDeviceMotionListening({
  interval: 'ui',
  success: function() {
    wx.onDeviceMotionChange(function(res) {
      // res.alpha, res.beta, res.gamma
      // 计算当前角度，和推荐角度对比，更新提示
    })
  }
})