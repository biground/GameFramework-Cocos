# ✅ Code Review 检查清单

## 架构层面
- [ ] framework/ 层是否引用了 cc 命名空间？
- [ ] 是否通过 EventManager 通信而非直接引用？
- [ ] 是否使用了对象池处理频繁创建销毁的对象？
- [ ] 模块是否正确继承 ModuleBase 并注册到 GameModule？

## TypeScript 质量
- [ ] 是否使用了 any 类型？（应该禁止）
- [ ] 泛型使用是否合理？
- [ ] 是否有类型断言滥用？
- [ ] 接口定义是否清晰？

## 性能
- [ ] update 循环中是否有不必要的对象创建？
- [ ] 是否有未移除的事件监听器？（内存泄漏风险）
- [ ] 是否有未清理的定时器？
- [ ] 数据结构选择是否合理？（Map vs Object, Array vs Set）

## 代码风格
- [ ] 所有 public API 是否有 JSDoc 注释？
- [ ] 命名是否符合规范？（PascalCase/camelCase）
- [ ] 是否有魔法数字？应该用常量替代
- [ ] 错误处理是否完善？

## 测试
- [ ] 是否有对应的单元测试？
- [ ] 边界情况是否覆盖？（null、empty、concurrent）
- [ ] 测试命名是否清晰描述预期行为？
