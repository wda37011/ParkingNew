// parking-bookings.ts
import { showLoading, hideLoading, showSuccess, showError, formatTime, calculateDistance } from '../../utils/util'
import { ParkingBooking, ParkingBookingStatus, ParkingSpace } from '../../utils/types'

Page({
  data: {
    currentTab: 'all',
    list: [] as any[]
  },

  onShow() {
    this.loadList()
  },

  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    this.loadList()
  },

  // 加载当前用户的停车记录
  loadList() {
    const app = getApp<IAppOption>()
    const userId = app.globalData.openId || wx.getStorageSync('openId') || 'user_' + Date.now().toString()

    const bookings: ParkingBooking[] = wx.getStorageSync('parkingBookings') || []
    const spaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const { currentTab } = this.data

    let list = bookings.filter(b => b.userId === userId)

    if (currentTab !== 'all') {
      list = list.filter(b => b.status === currentTab)
    }

    const now = Date.now()

    const formatted = list.map(b => {
      const space = spaces.find(s => s.id === b.spaceId)
      const statusTextMap: Record<string, string> = {
        reserved: '已预定',
        parking: '停车中',
        completed: '已完成',
        cancelled: '已取消'
      }
      const statusClassMap: Record<string, string> = {
        reserved: 'reserved',
        parking: 'parking',
        completed: 'completed',
        cancelled: 'cancelled'
      }

      return {
        ...b,
        space,
        statusText: statusTextMap[b.status] || b.status,
        statusClass: statusClassMap[b.status] || '',
        reserveTimeText: formatTime(b.reserveTime),
        parkingStartTimeText: b.parkingStartTime ? formatTime(b.parkingStartTime) : '',
        parkingEndTimeText: b.parkingEndTime ? formatTime(b.parkingEndTime) : ''
      }
    })

    this.setData({ list: formatted })

    // 自动检查已过期但未开始的预定（超出30分钟自动取消）
    const updatedBookings = bookings.map(b => {
      if (
        b.status === ParkingBookingStatus.RESERVED &&
        new Date(b.reserveExpireTime).getTime() < now
      ) {
        return { ...b, status: ParkingBookingStatus.CANCELLED }
      }
      return b
    })
    if (updatedBookings !== bookings) {
      wx.setStorageSync('parkingBookings', updatedBookings)
    }
  },

  // 开始停车：从预定状态变为停车中，以当前时间为开始时间
  startParking(e: any) {
    const id = e.currentTarget.dataset.id as string
    const bookings: ParkingBooking[] = wx.getStorageSync('parkingBookings') || []
    const booking = bookings.find(b => b.id === id)
    if (!booking) return

    const now = Date.now()
    const expire = new Date(booking.reserveExpireTime).getTime()
    if (now > expire) {
      showError('预定已过期，请重新预定')
      this.loadList()
      return
    }

    const updated = bookings.map(b => {
      if (b.id === id) {
        return {
          ...b,
          status: ParkingBookingStatus.PARKING,
          parkingStartTime: new Date().toISOString()
        }
      }
      return b
    })

    wx.setStorageSync('parkingBookings', updated)
    showSuccess('已开始计时')
    this.loadList()
  },

  // 结束停车：获取当前位置，仅记录离开时间和位置信息，并计算费用
  endParking(e: any) {
    const id = e.currentTarget.dataset.id as string
    const bookings: ParkingBooking[] = wx.getStorageSync('parkingBookings') || []
    const booking = bookings.find(b => b.id === id)
    if (!booking || booking.status !== ParkingBookingStatus.PARKING) {
      showError('当前状态无法结束停车')
      return
    }

    // 先获取当前定位，与车位位置对比，简单做一个“离开车位范围”的校验
    const spaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const space = spaces.find(s => s.id === booking.spaceId)

    if (!space) {
      // 找不到车位信息时，直接走原来流程
      wx.showModal({
        title: '结束停车',
        content: '确认车辆已离开车位，开始结算停车费用？',
        success: (res) => {
          if (res.confirm) {
            this.finishParking(id)
          }
        }
      })
      return
    }

    wx.getLocation({
      type: 'gcj02',
      success: (loc) => {
        const distance = calculateDistance(
          space.location.latitude,
          space.location.longitude,
          loc.latitude,
          loc.longitude
        )

        // 阈值：例如 150 米内认为还在车位附近
        const nearThreshold = 150
        const content =
          distance <= nearThreshold
            ? `系统检测到您似乎仍在车位附近（约 ${distance} 米），确定要结束停车并结算吗？`
            : '确认车辆已离开车位，开始结算停车费用？'

        wx.showModal({
          title: '结束停车',
          content,
          success: (res) => {
            if (res.confirm) {
              this.finishParking(id)
            }
          }
        })
      },
      fail: (err) => {
        console.error('获取当前位置失败', err)
        // 无法获取定位时，退回到原来简单确认
        wx.showModal({
          title: '结束停车',
          content: '无法获取当前位置，是否仍然结束停车并结算？',
          success: (res) => {
            if (res.confirm) {
              this.finishParking(id)
            }
          }
        })
      }
    })
  },

  // 计算费用并跳转到支付页面
  finishParking(id: string) {
    showLoading('计算费用...')
    try {
      const bookings: ParkingBooking[] = wx.getStorageSync('parkingBookings') || []
      const now = new Date()

      const updated = bookings.map(b => {
        if (b.id !== id) return b

        const start = b.parkingStartTime ? new Date(b.parkingStartTime) : new Date(b.reserveTime)
        const diffMs = now.getTime() - start.getTime()
        const minutes = Math.max(1, Math.ceil(diffMs / (1000 * 60)))

        // 按小时计费，向上取整
        const hours = Math.ceil(minutes / 60)
        const totalFee = Number((hours * b.unitPrice).toFixed(2))
        const platformFee = Number((totalFee * 0.1).toFixed(2)) // 平台抽成10%
        const ownerIncome = Number((totalFee - platformFee).toFixed(2))

        return {
          ...b,
          parkingEndTime: now.toISOString(),
          totalMinutes: minutes,
          totalFee,
          platformFee,
          ownerIncome
        }
      })

      wx.setStorageSync('parkingBookings', updated)
      hideLoading()

      // 跳转到支付页面
      wx.navigateTo({
        url: `/pages/payment/payment?type=parking&id=${id}`
      })
    } catch (error) {
      console.error('计算费用失败', error)
      hideLoading()
      showError('计算费用失败，请重试')
    }
  },

  // 去支付（费用已计算但未支付时使用）
  goToPay(e: any) {
    const id = e.currentTarget.dataset.id as string
    wx.navigateTo({
      url: `/pages/payment/payment?type=parking&id=${id}`
    })
  }
})


