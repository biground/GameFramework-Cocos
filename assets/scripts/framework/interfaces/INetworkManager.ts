import { NetworkChannel } from '../network/NetworkChannel';
import {
    NetworkChannelConfig,
    INetworkSocket,
    IPacketHandler,
    IHeartbeatHandler,
} from '../network/NetworkDefs';

/**
 * 网络管理器接口
 * 定义网络系统的公共契约，业务层应依赖此接口而非 NetworkManager 实现类
 *
 * 核心职责：
 * 1. 管理多个网络通道（Channel）的生命周期
 * 2. 通过 EventManager 分发网络事件（连接/断开/消息/错误/重连）
 * 3. 在主循环中驱动心跳检测和断线重连
 */
export interface INetworkManager {
    /**
     * 创建网络通道
     * @param name 通道名称（唯一标识）
     * @param socket Socket 实现（传输层策略）
     * @param packetHandler 消息包处理器（协议层策略）
     * @param config 通道配置（可选，使用默认配置填充缺省项）
     */
    createChannel(
        name: string,
        socket: INetworkSocket,
        packetHandler: IPacketHandler,
        config?: Partial<NetworkChannelConfig>,
    ): NetworkChannel;

    /**
     * 销毁网络通道
     * 关闭连接并释放资源
     * @param name 通道名称
     */
    destroyChannel(name: string): void;

    /**
     * 获取网络通道
     * @param name 通道名称
     * @returns 通道实例，不存在返回 undefined
     */
    getChannel(name: string): NetworkChannel | undefined;

    /**
     * 查询通道是否存在
     * @param name 通道名称
     */
    hasChannel(name: string): boolean;

    /**
     * 获取当前通道数量
     */
    getChannelCount(): number;

    /**
     * 为指定通道设置心跳处理器
     * @param channelName 通道名称
     * @param handler 心跳处理器实现
     */
    setHeartbeatHandler(channelName: string, handler: IHeartbeatHandler): void;
}
