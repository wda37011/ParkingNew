// parking-manage.ts
import { showLoading, hideLoading, showSuccess, showError, formatTime } from '../../utils/util'
import { ParkingSpace, Location } from '../../utils/types'

Page({
  data: {
    spaces: [] as ParkingSpace[],
    showForm: false,
    editingSpace: null as ParkingSpace | null,
    form: {
      title: '',
      description: '',
      unitPrice: '',
      location: {} as Location
    }
  },

  onShow() {
    this.loadSpaces()
  },

  // 加载当前用户的车位
  loadSpaces() {
    const app = getApp<IAppOption>()
    const allSpaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const ownerId = app.globalData.openId || wx.getStorageSync('openId') || 'user_' + Date.now().toString()

    const mySpaces = allSpaces
      .filter(space => space.ownerId === ownerId)
      .map(space => ({
        ...space,
        createTime: formatTime(space.createTime)
      }))

    this.setData({ spaces: mySpaces })
  },

  // 打开新增表单
  onAddSpace() {
    this.setData({
      showForm: true,
      editingSpace: null,
      form: {
        title: '',
        description: '',
        unitPrice: '',
        location: {} as Location
      }
    })
  },

  closeForm() {
    this.setData({ showForm: false })
  },

  noop() {},

  onTitleInput(e: any) {
    this.setData({
      'form.title': e.detail.value
    })
  },

  onPriceInput(e: any) {
    this.setData({
      'form.unitPrice': e.detail.value
    })
  },

  onDescInput(e: any) {
    this.setData({
      'form.description': e.detail.value
    })
  },

  // 选择车位位置
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'form.location': {
            latitude: Number(res.latitude),
            longitude: Number(res.longitude),
            address: res.address || res.name || '',
            name: res.name
          }
        })
      },
      fail: (err) => {
        console.error('选择车位位置失败', err)
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
          showError('选择位置失败')
        }
      }
    })
  },

  // 保存车位
  saveSpace() {
    const { title, unitPrice, location, description } = this.data.form

    if (!title.trim()) {
      showError('请输入车位标题')
      return
    }
    if (!location || !location.latitude) {
      showError('请选择车位位置')
      return
    }
    const priceNum = Number(unitPrice)
    if (!priceNum || priceNum <= 0) {
      showError('请输入正确的价格（元/小时）')
      return
    }

    showLoading('保存中...')

    try {
      const app = getApp<IAppOption>()
      const ownerId = app.globalData.openId || wx.getStorageSync('openId') || 'user_' + Date.now().toString()
      const allSpaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []

      if (this.data.editingSpace) {
        // 编辑
        const updatedSpaces = allSpaces.map(space => {
          if (space.id === this.data.editingSpace!.id) {
            return {
              ...space,
              title: title.trim(),
              description: description?.trim(),
              unitPrice: priceNum,
              location
            }
          }
          return space
        })
        wx.setStorageSync('parkingSpaces', updatedSpaces)
      } else {
        // 新建
        const newSpace: ParkingSpace = {
          id: 'SPACE' + Date.now().toString(),
          ownerId,
          title: title.trim(),
          description: description?.trim(),
          location,
          unitPrice: priceNum,
          isActive: true,
          createTime: new Date().toISOString()
        }
        allSpaces.unshift(newSpace)
        wx.setStorageSync('parkingSpaces', allSpaces)
      }

      hideLoading()
      showSuccess('保存成功')
      this.setData({ showForm: false })
      this.loadSpaces()
    } catch (error) {
      console.error('保存车位失败', error)
      hideLoading()
      showError('保存失败，请重试')
    }
  },

  // 编辑车位
  editSpace(e: any) {
    const id = e.currentTarget.dataset.id as string
    const allSpaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const target = allSpaces.find(s => s.id === id)
    if (!target) return

    this.setData({
      showForm: true,
      editingSpace: target,
      form: {
        title: target.title,
        description: target.description || '',
        unitPrice: String(target.unitPrice),
        location: target.location
      }
    })
  },

  // 上下架
  toggleActive(e: any) {
    const id = e.currentTarget.dataset.id as string
    const allSpaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const updatedSpaces = allSpaces.map(space => {
      if (space.id === id) {
        return { ...space, isActive: !space.isActive }
      }
      return space
    })
    wx.setStorageSync('parkingSpaces', updatedSpaces)
    this.loadSpaces()
  },

  // 删除车位
  deleteSpace(e: any) {
    const id = e.currentTarget.dataset.id as string
    wx.showModal({
      title: '删除车位',
      content: '确定要删除这个车位吗？',
      success: (res) => {
        if (res.confirm) {
          const allSpaces: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
          const updatedSpaces = allSpaces.filter(space => space.id !== id)
          wx.setStorageSync('parkingSpaces', updatedSpaces)
          showSuccess('已删除')
          this.loadSpaces()
        }
      }
    })
  }
})


