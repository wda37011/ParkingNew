import { showSuccess, showError } from '../../utils/util'
import { Wallet, Transaction, UserRole } from '../../utils/types'

Page({
  data: {
    balance: 0,
    transactions: [] as (Transaction & { roleText: string; typeText: string; sign: string })[],
    filterRole: 'all' as 'all' | UserRole
  },

  onLoad() { this.loadWallet() },
  onShow() { this.loadWallet() },

  loadWallet() {
    const app = getApp<IAppOption>()
    const openId = app.globalData.openId || wx.getStorageSync('openId') || ''
    const wallet: Wallet = wx.getStorageSync('wallet_' + openId) || { openId, balance: 0, transactions: [] }

    let txList = wallet.transactions
    if (this.data.filterRole !== 'all') {
      txList = txList.filter(t => t.role === this.data.filterRole)
    }

    const formatted = txList.map(t => ({
      ...t,
      roleText: t.role === 'user' ? '停车用户' : t.role === 'worker' ? '代停小哥' : '车位业主',
      typeText: t.type === 'income' ? '收入' : t.type === 'expense' ? '支出' : '提现',
      sign: t.type === 'income' ? '+' : '-',
      timeShort: this.formatTime(t.createTime)
    }))

    this.setData({ balance: wallet.balance, transactions: formatted })
  },

  formatTime(iso: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  switchFilter(e: any) {
    this.setData({ filterRole: e.currentTarget.dataset.role })
    this.loadWallet()
  },

  withdraw() {
    if (this.data.balance <= 0) {
      showError('余额不足')
      return
    }

    wx.showModal({
      title: '提现到微信余额',
      content: `确认提现 ¥${this.data.balance} 到微信零钱？`,
      success: (res) => {
        if (res.confirm) {
          const app = getApp<IAppOption>()
          const openId = app.globalData.openId || wx.getStorageSync('openId') || ''
          const key = 'wallet_' + openId
          const wallet: Wallet = wx.getStorageSync(key) || { openId, balance: 0, transactions: [] }

          const tx: Transaction = {
            id: 'TX' + Date.now() + Math.random().toString(36).substr(2, 4),
            type: 'withdraw',
            role: 'user',
            amount: wallet.balance,
            description: `提现 ¥${wallet.balance} 到微信零钱`,
            createTime: new Date().toISOString()
          }
          wallet.transactions.unshift(tx)
          wallet.balance = 0
          wx.setStorageSync(key, wallet)

          showSuccess('提现申请已提交')
          this.loadWallet()
        }
      }
    })
  }
})

