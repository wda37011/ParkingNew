Page({
  data: {
    angleTip: '请将手机保持水平',
    photoSrc: ''
  },
  onLoad() {
    this.listenDeviceMotion();
  },
  listenDeviceMotion() {
    wx.startDeviceMotionListening({
      interval: 'ui',
      success: () => {
        wx.onDeviceMotionChange((res) => {
          // res.beta: -180~180, res.gamma: -90~90
          let tip = '';
          if (Math.abs(res.beta) > 10) {
            tip = res.beta > 0 ? '请向下倾斜手机' : '请向上倾斜手机';
          } else if (Math.abs(res.gamma) > 10) {
            tip = res.gamma > 0 ? '请向右倾斜手机' : '请向左倾斜手机';
          } else {
            tip = '角度合适，可以拍照';
          }
          this.setData({ angleTip: tip });
        });
      }
    });
  },
  takePhoto() {
    const ctx = wx.createCameraContext();
    ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        this.setData({
          photoSrc: res.tempImagePath
        });
      }
    });
  },
  onCameraError(e) {
    wx.showToast({
      title: '摄像头异常',
      icon: 'none'
    });
  }
});