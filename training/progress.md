# 📊 培训总进度

## 基本信息

- 开始日期：2026-03-23
- 当前日期：2026-04-13
- 当前周次：Week 4 / 8
- 总完成度：55%

## 模块开发进度

| 模块                                        | 状态      | 完成日期   | Review 评分 | 备注                                                                                                           |
| ------------------------------------------- | --------- | ---------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| Core（GameEntry / ModuleBase / GameModule） | ✅ 已完成 | 2026-03-23 | 92          | Week 1 Day 1                                                                                                   |
| EventManager（事件管理器）                  | ✅ 已完成 | 2026-03-30 | 93          | Week 2 Day 1；含 EventKey<T> 类型安全增强                                                                      |
| ObjectPool + ReferencePool（对象池）        | ✅ 已完成 | 2026-03-31 | 91          | Week 2 Day 2；含 ObjectPool<T> + ReferencePool 模块                                                            |
| IoC Container（依赖注入容器）               | ✅ 已完成 | 2026-04-03 | 95          | Week 2 Day 3；Container + 装饰器 + 自动注入集成，30 个测试                                                     |
| FSM（有限状态机）                           | ✅ 已完成 | 2026-04-04 | 93          | Week 2 Day 4；FsmDefs + FsmState + Fsm + FsmManager，52 个测试                                                 |
| ProcedureManager（流程管理器）              | ✅ 已完成 | 2026-04-07 | 94          | Week 3 Day 1；ProcedureBase + ProcedureManager，13 个测试                                                      |
| Cocos 适配层（CocosEntry）                  | ⬜ 未开始 | -          | -           | Week 2 Day 3-4                                                                                                 |
| ResourceManager（资源管理器）               | ✅ 已完成 | 2026-04-07 | 95          | Week 3 Day 2；ResourceDefs + IResourceManager + ResourceManager，26 个测试；补 ReadonlyAssetInfo 修复          |
| UIManager（UI管理器）                       | ✅ 已完成 | 2026-04-08 | 92          | Week 3 Day 3；UIDefs + UIFormBase + IUIManager + UIManager，33 个测试（含 allowMultiple bug 修复）             |
| EntityManager（实体管理器）                 | ✅ 已完成 | 2026-04-08 | 95          | Week 3 Day 4；EntityDefs + EntityBase + EntityGroup + EntityManager，31 个测试；\_entityGroupMap O(1) 反查设计 |
| NetworkManager（网络管理器）                | ✅ 已完成 | 2026-04-10 | -           | Week 4 Day 1；NetworkDefs + NetworkChannel + NetworkManager，41 个测试；双策略注入 + 指数退避重连 |
| AudioManager（音频管理器）                  | ✅ 已完成 | 2026-04-13 | 88          | Week 4 Day 2；音量乘法链 + IAudioPlayer 策略注入，27 个测试                                                    |
| SceneManager（场景管理器）                  | ⬜ 未开始 | -          | -           | Week 4 Day 5                                                                                                   |
| TimerManager（定时器管理器）                | ⬜ 未开始 | -          | -           | Week 6                                                                                                         |
| DataTable（数据表）                         | ⬜ 未开始 | -          | -           | Week 6                                                                                                         |
| LocalizationManager（多语言管理器）         | ⬜ 未开始 | -          | -           | Week 6                                                                                                         |
| Logger + DebugPanel（日志与调试面板）       | ⬜ 未开始 | -          | -           | Week 5-6                                                                                                       |
| CI/CD Pipeline（持续集成流水线）            | ⬜ 未开始 | -          | -           | Week 6                                                                                                         |
| 综合 Demo 项目                              | ⬜ 未开始 | -          | -           | Week 7                                                                                                         |
| 面试冲刺                                    | ⬜ 未开始 | -          | -           | Week 8                                                                                                         |

## 能力成长追踪

| 维度        | Week 0 基线 | 当前 | 目标 |
| ----------- | ----------- | ---- | ---- |
| 框架设计    | C+          | B    | B+   |
| 引擎底层    | B           | B    | A-   |
| 架构知识面  | C+          | B+   | B+   |
| CI/CD       | C+          | C+   | B    |
| Code Review | D           | C-   | B    |
| 面试表现    | C           | C+   | A-   |

## 薄弱点追踪

- [ ] 🔴 框架设计能力：从 0 到 1 设计完整框架
- [ ] 🔴 引擎底层原理：资源管理、构建流程、渲染管线
- [ ] 🟡 架构知识面：消息总线、DI、ECS 等模式
- [ ] 🟡 Code Review 经验
- [ ] 🟡 CI/CD 流程独立搭建
- [x] ✅ 脏标记模式：理解正确，能说出 priority 运行时改变导致失效的场景
- [x] ✅ 发布-订阅模式：EventManager 实现完成，理解 emit 遍历安全
- [x] ✅ EventKey<T> 类型安全事件系统：掌握条件 rest params + phantom type
- [x] ✅ 对象池模式：ObjectPool<T> 栈模式 + ReferencePool 多类型管理
- [x] ✅ 插件化架构思维：提出 gfc-fast-pool 热拔插方案
- [x] ✅ DI/IoC 模式：Container + ServiceKey<T> phantom type + 装饰器元数据 + 循环依赖检测
- [x] ✅ TypeScript 装饰器：ClassDecorator / ParameterDecorator / Reflect.defineMetadata / getOwnMetadata
- [x] ✅ 类型体操：never[] vs unknown[] 逆变规则，构造函数类型约束
- [x] ✅ FSM 模式：状态生命周期、Constructor 类型映射、反递归保护、Blackboard 数据共享
- [x] ✅ 流程管理模式：Procedure = FsmState 的业务语义封装，薄封装复用底层模块
- [x] ✅ 资源管理模式：引用计数（owner 粒度去重）、加载去重、IResourceLoader 策略注入
- [x] ✅ 深层只读类型：Readonly<T> 浅只读 vs ReadonlySet/显式 ReadonlyAssetInfo 接口
- [x] ✅ UI 分层管理：UILayer 分组 + 栈管理 + Cover/Reveal 生命周期通知
- [x] ✅ IUIFormFactory 策略注入：与 IResourceLoader 一致的模式复用
- [x] ✅ allowMultiple 多实例管理：Map<string, UIFormBase[]> + LIFO 关闭顺序
- [x] ✅ 实体管理模式：EntityGroup 双池（活跃/等待）+ EntityManager O(1) 反查表 + IEntityFactory 策略注入
- [x] ✅ 对象复用进阶：hide 不销毁回等待池，show 优先复用，从 ObjectPool 到 EntityGroup 的思维迁移
- [x] ✅ 网络层架构：多通道管理 + 双策略注入（INetworkSocket + IPacketHandler）+ 主循环驱动心跳
- [x] ✅ 指数退避重连：baseDelay * 2^(n-1)，避免雷鸣群效应
- [x] ✅ 网络协议原理：TCP 队头阻塞 / 粘包拆包 / WebSocket 帧边界 / Protobuf vs JSON
- [x] ✅ 帧同步 vs 状态同步：理解两种架构的适用场景和优缺点
- [x] ✅ 音频管理模式：Music 单实例 + Sound 多实例叠加 + 三级音量乘法链 + 静音不改属性
- [x] ✅ IAudioPlayer 策略注入：与 IResourceLoader / IUIFormFactory 一致的 Framework→Runtime 解耦模式

## 面试题积累

详见 training/interview-qa.md

## 上次会话断点

- 最后操作：Week 4 Day 2 — AudioManager 模块实现完成，27 个测试全绿，Review 88 分
- 下次继续：Week 4 Day 3 — SceneManager 教学与实现
- 未完成事项：无
- 额外成就：三级音量乘法链设计 + IAudioPlayer 策略注入 + onUpdate 零 GC 清理
- 更新日期：2026-04-13
