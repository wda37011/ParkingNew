// worker-orders.ts
import { formatTime, showLoading, hideLoading, showSuccess, showError, getOrderStatusText, getOrderStatusColor } from '../../utils/util'
import { Order, OrderStatus } from '../../utils/types'

Page({
  data: {
    currentTab: 'available', // available: 可接单, my: 我的订单
    availableOrders: [] as any[],
    myOrders: [] as any[],
    refreshing: false
  },

  onLoad() {
    this.loadOrders()
  },

  onShow() {
    this.loadOrders()
  },

  // 加载订单
  loadOrders() {
    const orders = wx.getStorageSync('orders') || []
    const userId = wx.getStorageSync('openId') || 'worker_' + Date.now()
    
    // 可接单列表（待接单状态）
    const availableOrders = orders
      .filter((order: Order) => order.status === OrderStatus.PENDING)
      .map((order: Order) => ({
        ...order,
        statusText: getOrderStatusText(order.status),
        statusColor: getOrderStatusColor(order.status),
        createTime: formatTime(order.createTime),
        pickTime: formatTime(order.pickTime),
        returnTime: formatTime(order.returnTime)
      }))

    // 我的订单（已接单的订单）
    const myOrders = orders
      .filter((order: Order) => order.workerId === userId)
      .map((order: Order) => ({
        ...order,
        statusText: getOrderStatusText(order.status),
        statusColor: getOrderStatusColor(order.status),
        createTime: formatTime(order.createTime),
        pickTime: formatTime(order.pickTime),
        returnTime: formatTime(order.returnTime)
      }))

    this.setData({
      availableOrders,
      myOrders
    })
  },

  // 切换标签
  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  // 接单
  acceptOrder(e: any) {
    const orderId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认接单',
      content: '确定要接这个订单吗？',
      success: (res) => {
        if (res.confirm) {
          this.handleAcceptOrder(orderId)
        }
      }
    })
  },

  // 处理接单
  handleAcceptOrder(orderId: string) {
    showLoading('接单中...')
    
    try {
      const orders = wx.getStorageSync('orders') || []
      const userId = wx.getStorageSync('openId') || 'worker_' + Date.now()
      
      // 模拟小哥信息
      const workerInfo = {
        id: userId,
        name: '张师傅',
        avatar: 'https://via.placeholder.com/100',
        phone: '13800138000',
        rating: 4.8,
        completedOrders: 156
      }

      const updatedOrders = orders.map((order: Order) => {
        if (order.id === orderId) {
          return {
            ...order,
            status: OrderStatus.ACCEPTED,
            workerId: userId,
            workerInfo
          }
        }
        return order
      })

      wx.setStorageSync('orders', updatedOrders)
      
      const app = getApp<IAppOption>()
      app.globalData.orders = updatedOrders

      hideLoading()
      showSuccess('接单成功')
      this.loadOrders()
    } catch (error) {
      hideLoading()
      showError('接单失败，请重试')
    }
  },

  // 更新订单状态（取车、停车、还车）
  updateOrderStatus(e: any) {
    const { orderId, status } = e.currentTarget.dataset
    
    let title = ''
    let content = ''
    
    switch (status) {
      case 'picking':
        title = '确认取车'
        content = '确认已到达取车位置并开始取车？'
        break
      case 'parked':
        title = '确认停车'
        content = '确认已将车辆停放到指定位置？'
        break
      case 'returning':
        title = '确认还车'
        content = '确认已开始将车辆送回？'
        break
      default:
        return
    }

    wx.showModal({
      title,
      content,
      success: (res) => {
        if (res.confirm) {
          this.handleUpdateStatus(orderId, status)
        }
      }
    })
  },

  // 处理状态更新
  handleUpdateStatus(orderId: string, status: OrderStatus, extra?: { onSuccess?: () => void }) {
    showLoading('更新中...')
    
    try {
      const orders = wx.getStorageSync('orders') || []
      
      const updatedOrders = orders.map((order: Order) => {
        if (order.id === orderId) {
          const updatedOrder = { ...order, status }
          
          // 如果是停车状态，添加停车位置
          if (status === OrderStatus.PARKED && !order.parkLocation) {
            // 这里应该获取实际停车位置
            updatedOrder.parkLocation = {
              latitude: order.pickLocation.latitude + 0.01,
              longitude: order.pickLocation.longitude + 0.01,
              address: '附近停车场',
              name: '停车场'
            }
          }
          
          return updatedOrder
        }
        return order
      })

      wx.setStorageSync('orders', updatedOrders)
      
      const app = getApp<IAppOption>()
      app.globalData.orders = updatedOrders

      hideLoading()
      showSuccess('更新成功')
      this.loadOrders()
      extra && extra.onSuccess && extra.onSuccess()
    } catch (error) {
      hideLoading()
      showError('更新失败，请重试')
    }
  },

  // 查看订单详情
  viewOrderDetail(e: any) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${orderId}`
    })
  },

  // 下拉刷新
  onRefresh() {
    this.setData({ refreshing: true })
    setTimeout(() => {
      this.loadOrders()
      this.setData({ refreshing: false })
      showSuccess('刷新成功')
    }, 1000)
  },

  // 小哥开始取车：更新状态为取车中，并打开导航到取车点
  startPick(e: any) {
    const orderId = e.currentTarget.dataset.id as string
    wx.showModal({
      title: '开始取车',
      content: '是否开始前往取车位置并打开导航？',
      success: (res) => {
        if (res.confirm) {
          this.handleUpdateStatus(orderId, OrderStatus.PICKING, {
            onSuccess: () => this.openNavigation(orderId, 'pick')
          })
        }
      }
    })
  },

  // 小哥到达取车点：记录到达时间，并“通知车主”（本地标记，可用于详情页展示或后端推送）
  arrivePick(e: any) {
    const orderId = e.currentTarget.dataset.id as string
    try {
      const orders: Order[] = wx.getStorageSync('orders') || []
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            pickArriveTime: new Date().toISOString()
          }
        }
        return order
      })
      wx.setStorageSync('orders', updatedOrders)
      const app = getApp<IAppOption>()
      app.globalData.orders = updatedOrders
      showSuccess('已到达取车点，车主将看到最新状态')
      this.loadOrders()
    } catch (error) {
      showError('操作失败，请重试')
    }
  },

  // 小哥开始还车：更新状态为还车中，并打开导航到还车点
  startReturn(e: any) {
    const orderId = e.currentTarget.dataset.id as string
    wx.showModal({
      title: '开始还车',
      content: '是否开始前往还车位置并打开导航？',
      success: (res) => {
        if (res.confirm) {
          this.handleUpdateStatus(orderId, OrderStatus.RETURNING, {
            onSuccess: () => this.openNavigation(orderId, 'return')
          })
        }
      }
    })
  },

  // 小哥到达还车点：记录到达时间
  arriveReturn(e: any) {
    const orderId = e.currentTarget.dataset.id as string
    try {
      const orders: Order[] = wx.getStorageSync('orders') || []
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            returnArriveTime: new Date().toISOString()
          }
        }
        return order
      })
      wx.setStorageSync('orders', updatedOrders)
      const app = getApp<IAppOption>()
      app.globalData.orders = updatedOrders
      showSuccess('已到达还车点，车主将看到最新状态')
      this.loadOrders()
    } catch (error) {
      showError('操作失败，请重试')
    }
  },

  // 打开导航到取车点或还车点
  openNavigation(orderId: string, type: 'pick' | 'return') {
    const orders: Order[] = wx.getStorageSync('orders') || []
    const order = orders.find(o => o.id === orderId)
    if (!order) {
      showError('订单不存在')
      return
    }

    const location = type === 'pick' ? order.pickLocation : order.returnLocation
    if (!location || !location.latitude) {
      showError('位置信息异常')
      return
    }

    wx.openLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name || (type === 'pick' ? '取车位置' : '还车位置'),
      address: location.address,
      scale: 18
    })
  }
})

