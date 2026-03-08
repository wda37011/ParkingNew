// violation-report.ts
import { formatTime, showLoading, hideLoading, showSuccess, showError } from '../../utils/util'
import { Order, ViolationInfo } from '../../utils/types'

Page({
  data: {
    orderId: '',
    order: {} as Order,
    violationTime: '',
    violationType: '',
    violationTypeIndex: 0,
    fine: '',
    evidence: [] as string[],
    violationTypes: [
      '违停',
      '超速',
      '闯红灯',
      '不按规定车道行驶',
      '违反禁令标志',
      '其他'
    ]
  },

  onLoad(options: any) {
    const orderId = options.orderId
    if (orderId) {
      this.setData({ orderId })
      this.loadOrder(orderId)
    }
  },

  // 加载订单信息
  loadOrder(orderId: string) {
    const orders = wx.getStorageSync('orders') || []
    const order = orders.find((o: Order) => o.id === orderId)
    
    if (order) {
      this.setData({ order })
    } else {
      showError('订单不存在')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 选择违章时间
  onViolationTimeChange(e: any) {
    this.setData({
      violationTime: e.detail.value
    })
  },

  // 选择违章类型
  onViolationTypeChange(e: any) {
    const index = e.detail.value
    this.setData({
      violationTypeIndex: index,
      violationType: this.data.violationTypes[index]
    })
  },

  // 输入罚款金额
  onFineInput(e: any) {
    this.setData({
      fine: e.detail.value
    })
  },

  // 上传证据图片
  uploadEvidence() {
    wx.chooseImage({
      count: 3,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths
        showLoading('上传中...')
        
        // 模拟上传（实际应该调用上传接口）
        setTimeout(() => {
          const evidence = [...this.data.evidence, ...tempFilePaths]
          this.setData({ evidence })
          hideLoading()
          showSuccess('上传成功')
        }, 1000)
      },
      fail: () => {
        showError('选择图片失败')
      }
    })
  },

  // 删除证据图片
  deleteEvidence(e: any) {
    const index = e.currentTarget.dataset.index
    const evidence = this.data.evidence.filter((_, i) => i !== index)
    this.setData({ evidence })
  },

  // 预览证据图片
  previewEvidence(e: any) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.evidence[index],
      urls: this.data.evidence
    })
  },

  // 提交违章上报
  submitViolation() {
    const { violationTime, violationType, fine, evidence } = this.data

    // 验证
    if (!violationTime) {
      showError('请选择违章时间')
      return
    }

    if (!violationType) {
      showError('请选择违章类型')
      return
    }

    if (!fine || parseFloat(fine) <= 0) {
      showError('请输入正确的罚款金额')
      return
    }

    if (evidence.length === 0) {
      showError('请上传违章证据')
      return
    }

    // 检查是否在30日内
    const violationDate = new Date(violationTime)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - violationDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff > 30) {
      wx.showModal({
        title: '提示',
        content: '违章时间超过30天，无法上报。',
        showCancel: false
      })
      return
    }

    showLoading('提交中...')

    try {
      // 创建违章信息
      const violationInfo: ViolationInfo = {
        id: 'VIO' + Date.now(),
        orderId: this.data.orderId,
        violationTime: violationTime,
        violationType: violationType,
        fine: parseFloat(fine),
        status: 'pending',
        evidence: evidence
      }

      // 更新订单
      const orders = wx.getStorageSync('orders') || []
      const updatedOrders = orders.map((order: Order) => {
        if (order.id === this.data.orderId) {
          return {
            ...order,
            violationInfo
          }
        }
        return order
      })

      wx.setStorageSync('orders', updatedOrders)
      
      const app = getApp<IAppOption>()
      app.globalData.orders = updatedOrders

      hideLoading()
      showSuccess('上报成功，小哥将在30日内赔偿')

      // 跳转到订单详情
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/order-detail/order-detail?id=${this.data.orderId}`
        })
      }, 1500)
    } catch (error) {
      hideLoading()
      showError('提交失败，请重试')
      console.error('提交违章上报失败:', error)
    }
  }
})

