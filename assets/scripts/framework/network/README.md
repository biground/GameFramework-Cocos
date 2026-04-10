# NetworkManager（网络管理器）

## 职责
统一管理多个网络通道（Channel）的生命周期、消息收发、心跳检测和断线重连。**不负责**消息路由（按 cmd 分发到业务 Handler）、RPC 请求-响应配对、消息队列削峰。

## 对外 API

```typescript
// ─── NetworkManager（ModuleBase，priority = 110）───
setEventManager(eventManager: IEventManager): void
createChannel(name: string, socket: INetworkSocket, packetHandler: IPacketHandler, config?: Partial<NetworkChannelConfig>): NetworkChannel
destroyChannel(name: string): void
getChannel(name: string): NetworkChannel | undefined
hasChannel(name: string): boolean
getChannelCount(): number
setHeartbeatHandler(channelName: string, handler: IHeartbeatHandler): void

// ─── NetworkChannel ───
connect(url: string): void
send(packet: NetworkPacket): void
close(): void
setHeartbeatHandler(handler: IHeartbeatHandler): void
readonly name: string
readonly state: NetworkState
readonly isConnected: boolean
readonly config: Readonly<NetworkChannelConfig>

// ─── 策略接口 ───
INetworkSocket    → 传输层抽象（connect / send / close + 4 个回调）
IPacketHandler    → 协议层抽象（encode / decode）
IHeartbeatHandler → 心跳抽象（createHeartbeatPacket / isHeartbeatResponse）

// ─── 事件键 ───
NETWORK_CONNECTED     → NetworkConnectedEventData
NETWORK_CLOSED        → NetworkClosedEventData
NETWORK_ERROR         → NetworkErrorEventData
NETWORK_MESSAGE       → NetworkMessageEventData
NETWORK_RECONNECTING  → NetworkReconnectingEventData
```

## 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 多通道 vs 单连接 | 多通道（Map<name, Channel>） | 游戏服/聊天服/推送服各自独立，故障隔离 |
| 传输 & 协议分离 | INetworkSocket + IPacketHandler 双策略 | 单一职责，避免笛卡尔积爆炸（2+3 vs 2×3） |
| 心跳驱动方式 | ModuleBase.onUpdate() 累加 dt | 跟随游戏主循环，暂停时自动暂停，避免 setInterval 失控 |
| 重连策略 | 指数退避（base * 2^(n-1)） | 避免雷鸣群效应（所有断线玩家同时重连冲垮服务器） |
| 事件分发 | 通过 EventManager emit | 遵循架构规范：跨模块通信必须走 EventManager |
| Channel → Manager 通信 | NetworkChannelCallbacks 接口 | Channel 不直接依赖 EventManager，解耦更干净 |
| 用户主动关闭 | _userClosed 标记 | 区分主动关闭和异常断线，主动关闭不触发自动重连 |

## 依赖
- **EventManager** — 网络事件分发（CONNECTED / CLOSED / MESSAGE / ERROR / RECONNECTING）

## 被谁依赖
- 业务层通过 EventManager 监听网络事件

## 已知限制
- 同步消息分发（收到即 emit），高频消息场景可能压帧 → 后续可加消息队列 + 帧预算
- 无断线消息缓存重发 → 重连后需业务层自行处理数据同步
- 无 RPC 层（request/response 配对） → 后续可封装 requestId + Promise
- 心跳只有客户端主动发 ping，未处理服务端主动 ping → 可按需扩展 IHeartbeatHandler

## 关联测试
- 测试文件路径：`tests/network/network-manager.test.ts`
- 测试覆盖：41 个用例，涵盖生命周期、通道管理、连接断开、消息收发、心跳检测、自动重连、事件集成
