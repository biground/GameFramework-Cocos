import { IAudioPlayer, IAudioInstance, AudioPlayConfig } from '@framework/audio/AudioDefs';
import { Logger } from '@framework/debug/Logger';

/**
 * 模拟音频实例
 * 用于测试的音频实例实现，支持调用追踪
 */
export class MockAudioInstance implements IAudioInstance {
    private static readonly TAG = 'MockAudioInstance';

    private _id: string;
    private _isPlaying: boolean = false;
    private _isPaused: boolean = false;
    private _volume: number = 1.0;
    private _onCompleteCallback: (() => void) | null = null;

    /** 方法调用历史记录（用于测试断言） */
    public readonly calls: string[] = [];

    constructor(id: string) {
        this._id = id;
    }

    public get id(): string {
        return this._id;
    }

    public get isPlaying(): boolean {
        return this._isPlaying;
    }

    public get isPaused(): boolean {
        return this._isPaused;
    }

    public get volume(): number {
        return this._volume;
    }

    public set volume(value: number) {
        this._volume = value;
    }

    /**
     * 开始播放
     */
    public play(): void {
        this._isPlaying = true;
        this._isPaused = false;
        this.calls.push('play');
        Logger.debug(MockAudioInstance.TAG, `[${this._id}] play`);
    }

    /**
     * 停止播放
     */
    public stop(): void {
        this._isPlaying = false;
        this._isPaused = false;
        this.calls.push('stop');
        Logger.debug(MockAudioInstance.TAG, `[${this._id}] stop`);
    }

    /**
     * 暂停播放
     */
    public pause(): void {
        this._isPaused = true;
        this.calls.push('pause');
        Logger.debug(MockAudioInstance.TAG, `[${this._id}] pause`);
    }

    /**
     * 恢复播放
     */
    public resume(): void {
        this._isPaused = false;
        this._isPlaying = true;
        this.calls.push('resume');
        Logger.debug(MockAudioInstance.TAG, `[${this._id}] resume`);
    }

    /**
     * 设置音量
     * @param volume 音量值（0~1）
     */
    public setVolume(volume: number): void {
        this._volume = volume;
        this.calls.push('setVolume');
        Logger.debug(MockAudioInstance.TAG, `[${this._id}] setVolume: ${volume}`);
    }

    /**
     * 注册播放完成回调
     * @param callback 完成时调用的回调函数
     */
    public onComplete(callback: () => void): void {
        this._onCompleteCallback = callback;
    }

    /**
     * 手动触发播放完成（用于测试）
     * 停止播放并调用 onComplete 回调
     */
    public simulateComplete(): void {
        this._isPlaying = false;
        this._onCompleteCallback?.();
        Logger.debug(MockAudioInstance.TAG, `[${this._id}] simulateComplete`);
    }
}

/**
 * 模拟音频播放器
 * 用于 Demo 和测试环境的音频播放模拟
 *
 * @description
 * 实现 IAudioPlayer 接口，在不依赖 CocosCreator 引擎的情况下
 * 模拟音频播放行为，用于单元测试和 Demo 演示。
 */
export class MockAudioPlayer implements IAudioPlayer {
    private static readonly TAG = 'MockAudioPlayer';

    /** 播放历史记录 */
    public readonly playHistory: Array<{
        clip: unknown;
        config: AudioPlayConfig;
        timestamp: number;
    }> = [];

    /** 当前活跃的音频实例列表 */
    public readonly activeInstances: IAudioInstance[] = [];

    /** 实例计数器 */
    private _instanceCounter: number = 0;

    /**
     * 播放音频（模拟）
     * @param audioClip 音频资源
     * @param config 播放配置
     * @returns 音频实例句柄
     */
    public play(audioClip: unknown, config: AudioPlayConfig): IAudioInstance {
        const instanceId = `mock_audio_${++this._instanceCounter}`;
        const instance = new MockAudioInstance(instanceId);
        instance.volume = config.volume ?? 1.0;
        instance.play();

        this.playHistory.push({
            clip: audioClip,
            config,
            timestamp: Date.now(),
        });
        this.activeInstances.push(instance);

        Logger.debug(MockAudioPlayer.TAG, `play: ${instanceId}, volume: ${instance.volume}`);
        return instance;
    }

    /**
     * 停止所有音频播放
     */
    public stopAll(): void {
        Logger.debug(MockAudioPlayer.TAG, `stopAll: ${this.activeInstances.length} instances`);
        for (const instance of this.activeInstances) {
            instance.stop();
        }
        this.activeInstances.length = 0;
    }

    /**
     * 创建命名音频实例（辅助方法，非 IAudioPlayer 接口要求）
     * @param info 实例信息
     * @returns 音频实例
     */
    public createInstance(info: { id: string; type: 'music' | 'sound' }): IAudioInstance {
        const instance = new MockAudioInstance(info.id);
        this.activeInstances.push(instance);
        Logger.debug(MockAudioPlayer.TAG, `createInstance: ${info.id} (${info.type})`);
        return instance;
    }
}
