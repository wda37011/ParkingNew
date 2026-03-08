/// <reference path="./types/index.d.ts" />

type Location = import('../miniprogram/utils/types').Location
type UserRole = import('../miniprogram/utils/types').UserRole
type WorkerProfile = import('../miniprogram/utils/types').WorkerProfile
type ParkingSpace = import('../miniprogram/utils/types').ParkingSpace
type SelfParkingOrder = import('../miniprogram/utils/types').SelfParkingOrder
type ValetOrder = import('../miniprogram/utils/types').ValetOrder
type Wallet = import('../miniprogram/utils/types').Wallet
type Transaction = import('../miniprogram/utils/types').Transaction

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
    openId?: string,
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}
