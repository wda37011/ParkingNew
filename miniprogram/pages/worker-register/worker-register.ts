import { showLoading, hideLoading, showSuccess, showError } from '../../utils/util'
import { WorkerProfile } from '../../utils/types'

Page({
  data: {
    name: '',
    phone: '',
    idNumber: '',
    driverLicensePhoto: ''
  },

  onNameInput(e: any) { this.setData({ name: e.detail.value }) },
  onPhoneInput(e: any) { this.setData({ phone: e.detail.value }) },
  onIdInput(e: any) { this.setData({ idNumber: e.detail.value }) },

  chooseLicense() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        this.setData({ driverLicensePhoto: path })
      }
    })
  },

  submit() {
    const { name, phone, idNumber, driverLicensePhoto } = this.data
    if (!name.trim()) { showError('请输入姓名'); return }
    if (!phone || phone.length < 11) { showError('请输入正确的手机号'); return }
    if (!idNumber) { showError('请输入身份证号'); return }
    if (!driverLicensePhoto) { showError('请上传驾驶证照片'); return }

    showLoading('注册中...')
    try {
      const app = getApp<IAppOption>()
      const openId = app.globalData.openId || wx.getStorageSync('openId') || 'user_' + Date.now()

      const profile: WorkerProfile = {
        openId,
        name: name.trim(),
        phone,
        idNumber,
        driverLicensePhoto,
        verified: true,
        rating: 5.0,
        completedOrders: 0,
        createTime: new Date().toISOString()
      }

      wx.setStorageSync('workerProfile', profile)
      hideLoading()
      showSuccess('注册成功')
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/worker-home/worker-home' })
      }, 1500)
    } catch {
      hideLoading()
      showError('注册失败')
    }
  }
})

