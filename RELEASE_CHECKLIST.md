# LocusMQ 发布检查清单

## 发布前检查

### 1. 代码质量
- [ ] 所有测试通过 (`npm test`)
- [ ] 代码覆盖率 > 80% (`npm run test:coverage`)
- [ ] ESLint检查通过 (`npm run lint`)
- [ ] 代码格式化 (`npm run format`)
- [ ] 类型检查通过 (`npm run build`)

### 2. 功能测试
- [ ] 基本消息发送/接收功能
- [ ] 延迟消息功能
- [ ] 优先级消息功能
- [ ] 死信队列功能
- [ ] 批量消息处理
- [ ] 并发消费者测试
- [ ] 消息去重功能

### 3. 性能测试
- [ ] 高并发场景测试
- [ ] 大数据量测试
- [ ] 内存泄漏检查
- [ ] CPU使用率监控

### 4. 文档更新
- [ ] README.md 更新
- [ ] API文档更新
- [ ] CHANGELOG.md 更新
- [ ] 示例代码更新

### 5. 版本管理
- [ ] package.json 版本号更新
- [ ] 创建git tag (`git tag v1.x.x`)
- [ ] 推送tag (`git push origin v1.x.x`)

### 6. 发布步骤
1. 运行完整测试套件
2. 更新版本号
3. 创建发布分支
4. 合并到main分支
5. 创建GitHub Release
6. 发布到npm

## 发布后验证
- [ ] npm包下载正常
- [ ] 文档网站更新
- [ ] GitHub Release正常
- [ ] 示例项目测试通过