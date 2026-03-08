# 编译说明

如果遇到 "未找到 create-order.js 文件" 的错误，请按以下步骤操作：

## 方法一：启用 TypeScript 编译（推荐）

1. 在微信开发者工具中，点击菜单栏 **项目** -> **设置**
2. 在 **本地设置** 标签页中，勾选以下选项：
   - ✅ **使用 npm 模块**
   - ✅ **增强编译**
3. 点击 **保存**
4. 重新编译项目

## 方法二：检查项目配置

确保 `project.config.json` 中有以下配置：

```json
{
  "setting": {
    "enhance": true,
    "useCompilerPlugins": ["typescript"]
  }
}
```

## 方法三：手动编译 TypeScript

如果上述方法无效，可以手动编译 TypeScript 文件：

1. 在项目根目录运行：
   ```bash
   tsc
   ```

2. 或者安装 TypeScript 并编译：
   ```bash
   npm install -g typescript
   tsc
   ```

## 注意事项

- 确保微信开发者工具版本是最新的（建议 1.06.0 及以上）
- TypeScript 文件会自动编译为 JavaScript，无需手动创建 .js 文件
- 如果项目中有旧的 .js 文件，可以删除，只保留 .ts 文件即可

