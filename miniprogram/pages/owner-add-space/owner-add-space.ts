import { showLoading, hideLoading, showSuccess, showError } from '../../utils/util'
import { reverseGeocode } from '../../utils/api'
import { ParkingSpace, Location } from '../../utils/types'

Page({
  data: {
    editId: '',
    buildingInfo: '',
    spaceCode: '',
    phone: '',
    location: {} as Location,
    photos: [] as string[],
    hourlyPrice: '',
    dailyMaxPrice: '',
    communityFee: '',
    communityFeeDesc: '',
    availableFrom: '',
    availableTo: '',
    availableFromText: '',
    availableToText: ''
  },

  onLoad(options: any) {
    if (options.id) {
      this.setData({ editId: options.id })
      this.loadSpace(options.id)
    }
  },

  loadSpace(id: string) {
    const all: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []
    const space = all.find(s => s.id === id)
    if (!space) return
    this.setData({
      buildingInfo: space.buildingInfo,
      spaceCode: space.spaceCode,
      phone: space.phone,
      location: space.location,
      photos: space.photos,
      hourlyPrice: String(space.hourlyPrice),
      dailyMaxPrice: space.dailyMaxPrice ? String(space.dailyMaxPrice) : '',
      communityFee: String(space.communityFee),
      communityFeeDesc: space.communityFeeDesc || '',
      availableFrom: space.availableFrom,
      availableTo: space.availableTo,
      availableFromText: this.formatDateTime(space.availableFrom),
      availableToText: this.formatDateTime(space.availableTo)
    })
    wx.setNavigationBarTitle({ title: '编辑车位' })
  },

  formatDateTime(iso: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  onBuildingInput(e: any) { this.setData({ buildingInfo: e.detail.value }) },
  onSpaceCodeInput(e: any) { this.setData({ spaceCode: e.detail.value }) },
  onPhoneInput(e: any) { this.setData({ phone: e.detail.value }) },
  onHourlyPriceInput(e: any) { this.setData({ hourlyPrice: e.detail.value }) },
  onDailyMaxInput(e: any) { this.setData({ dailyMaxPrice: e.detail.value }) },
  onCommunityFeeInput(e: any) { this.setData({ communityFee: e.detail.value }) },
  onCommunityDescInput(e: any) { this.setData({ communityFeeDesc: e.detail.value }) },

  chooseLocation() {
    wx.chooseLocation({
      success: async (res) => {
        let addr = res.address || ''
        try { const r = await reverseGeocode(Number(res.latitude), Number(res.longitude)); if (r.address) addr = r.address } catch {}
        this.setData({
          location: { latitude: Number(res.latitude), longitude: Number(res.longitude), address: addr || res.name || '已选择位置', name: res.name }
        })
      },
      fail: () => {}
    })
  },

  choosePhotos() {
    const remaining = 5 - this.data.photos.length
    if (remaining <= 0) { showError('最多上传5张照片'); return }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ photos: [...this.data.photos, ...paths] })
      }
    })
  },

  removePhoto(e: any) {
    const idx = e.currentTarget.dataset.idx
    const photos = [...this.data.photos]
    photos.splice(idx, 1)
    this.setData({ photos })
  },

  onFromDateChange(e: any) {
    const dateStr = e.detail.value
    this.setData({ availableFrom: new Date(dateStr).toISOString(), availableFromText: dateStr })
  },

  onToDateChange(e: any) {
    const dateStr = e.detail.value
    this.setData({ availableTo: new Date(dateStr).toISOString(), availableToText: dateStr })
  },

  submit() {
    const { buildingInfo, spaceCode, phone, location, photos, hourlyPrice, communityFee, availableFrom, availableTo } = this.data

    if (!buildingInfo.trim()) { showError('请输入楼号单元信息'); return }
    if (!location.latitude) { showError('请选择车位位置'); return }
    if (!phone) { showError('请输入联系电话'); return }
    if (photos.length === 0) { showError('请上传至少一张车位照片'); return }
    if (!Number(hourlyPrice) || Number(hourlyPrice) <= 0) { showError('请输入正确的小时价格'); return }
    if (!Number(communityFee) && Number(communityFee) !== 0) { showError('请输入小区收费标准'); return }
    if (!availableFrom || !availableTo) { showError('请选择出租时间段'); return }
    if (new Date(availableTo).getTime() <= new Date(availableFrom).getTime()) { showError('结束时间必须晚于开始时间'); return }

    showLoading('保存中...')
    try {
      const app = getApp<IAppOption>()
      const ownerId = app.globalData.openId || wx.getStorageSync('openId') || 'user_' + Date.now()
      const all: ParkingSpace[] = wx.getStorageSync('parkingSpaces') || []

      if (this.data.editId) {
        const updated = all.map(s => {
          if (s.id !== this.data.editId) return s
          return {
            ...s,
            buildingInfo: buildingInfo.trim(),
            spaceCode: spaceCode.trim(),
            phone,
            location,
            photos,
            hourlyPrice: Number(hourlyPrice),
            dailyMaxPrice: this.data.dailyMaxPrice ? Number(this.data.dailyMaxPrice) : undefined,
            communityFee: Number(communityFee),
            communityFeeDesc: this.data.communityFeeDesc,
            availableFrom,
            availableTo
          }
        })
        wx.setStorageSync('parkingSpaces', updated)
      } else {
        const newSpace: ParkingSpace = {
          id: 'SPACE' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase(),
          ownerId,
          location,
          buildingInfo: buildingInfo.trim(),
          spaceCode: spaceCode.trim(),
          photos,
          phone,
          availableFrom,
          availableTo,
          hourlyPrice: Number(hourlyPrice),
          dailyMaxPrice: this.data.dailyMaxPrice ? Number(this.data.dailyMaxPrice) : undefined,
          communityFee: Number(communityFee),
          communityFeeDesc: this.data.communityFeeDesc,
          isActive: true,
          isOccupied: false,
          createTime: new Date().toISOString()
        }
        all.unshift(newSpace)
        wx.setStorageSync('parkingSpaces', all)
      }

      hideLoading()
      showSuccess('保存成功')
      setTimeout(() => wx.navigateBack(), 1500)
    } catch {
      hideLoading()
      showError('保存失败')
    }
  }
})

