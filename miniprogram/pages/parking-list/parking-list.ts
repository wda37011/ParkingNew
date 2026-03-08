// parking-list.ts
import { showLoading, hideLoading, showSuccess, showError, calculateDistance, formatTime } from '../../utils/util'
import { ParkingSpace, ParkingBooking, ParkingBookingStatus, Location } from '../../utils/types'

Page({
  data: {
    targetLocation: {} as Location,
    spaces: [] as any[]
  },

  onShow() {
    // 如果已经选择过目的地，自动刷新列表
    if (this.data.targetLocation && this.data.targetLocation.latitude) {
      this.loadSpaces()
    }
  },

  // 选择目的地
  chooseTargetLocation() {
    wx.chooseLocation({
      success: (res) => {
        const target: Location = {
          latitude: Number(res.latitude),
          longitude: Number(res.longitude),
          address: res.address || res.name || '',
          name: res.name
        }
        this.setData({ targetLocation: target })
        this.loadSpaces()
      },
      fail: (err) => {
        console.error('选择目的地失败', err)
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '提示',
            content: '需要获取您的位置信息，请在设置中开启位置权限',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        } else {
          showError('选择目的地失败')
        }
      }
    })
  },

  // 加载附近车位（按距离排序）
  loadSpaces() {
    const { targetLocation } = this.data
    if (!targetLocation || !targetLocation.latitude) {
      return
    }

    const allSpaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const now = Date.now()

    // 只展示已上架的车位
    const activeSpaces = allSpaces
      .filter(space => space.isActive)
      .map(space => {
        const distance = calculateDistance(
          targetLocation.latitude,
          targetLocation.longitude,
          space.location.latitude,
          space.location.longitude
        )
        const distanceText =
          distance < 1000 ? `${distance} 米` : `${(distance / 1000).toFixed(1)} 公里`

        return {
          ...space,
          distance,
          distanceText,
          createTime: formatTime(space.createTime)
        }
      })
      .sort((a, b) => a.distance - b.distance)

    this.setData({ spaces: activeSpaces })
  },

  // 预定车位（保留30分钟）
  reserveSpace(e: any) {
    const spaceId = e.currentTarget.dataset.id as string
    const app = getApp<IAppOption>()
    const userId = app.globalData.openId || wx.getStorageSync('openId') || 'user_' + Date.now().toString()

    const allSpaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const target = allSpaces.find(s => s.id === spaceId)
    if (!target) {
      showError('车位不存在或已下架')
      return
    }

    // 创建预约记录
    const now = new Date()
    const reserveTime = now.toISOString()
    const reserveExpireTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString() // 30分钟后

    const booking: ParkingBooking = {
      id: 'PARK' + Date.now().toString(),
      spaceId: target.id,
      userId,
      ownerId: target.ownerId,
      unitPrice: target.unitPrice,
      status: ParkingBookingStatus.RESERVED,
      reserveTime,
      reserveExpireTime
    }

    const bookings: ParkingBooking[] = wx.getStorageSync('parkingBookings') || []
    bookings.unshift(booking)
    wx.setStorageSync('parkingBookings', bookings)

    const appInstance = getApp<IAppOption>()
    appInstance.globalData.parkingBookings = bookings

    showSuccess('预定成功，车位将为您保留30分钟')

    // 跳转到“我的停车”页面
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/parking-bookings/parking-bookings'
      })
    }, 800)
  }
})


