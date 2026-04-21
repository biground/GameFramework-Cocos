import {
    IAudioPlayer,
    IAudioInstance,
    AudioPlayConfig,
} from '@framework/audio/AudioDefs';

/**
 * 模拟音频实例
 * 用于测试的音频实例实现
 */
class MockAudioInstance implements IAudioInstance {
    private _id: string;
    private _isPlaying: boolean = false;
    private _isPaused: boolean = false;
    private _volume: number = 1.0;
    private _onCompleteCallback: (() => void) | null = null;

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

    public play(): void {
        this._isPlaying = true;
        this._isPaused = false;
    }

    public stop(): void {
        this._isPlaying = false;
        this._isPaused = false;
    }

    public pause(): void {
        this._isPaused = true;
    }

    public resume(): void {
        this._isPaused = false;
        this._isPlaying = true;
    }

    public setVolume(volume: number): void {
        this._volume = volume;
    }

    public onComplete(callback: () => void): void {
        this._onCompleteCallback = callback;
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

    /** 当前播放的音频实例列表 */
    private _playingInstances: Map<string, MockAudioInstance> = new Map();

    /** 实例计数器 */
    private _instanceCounter: number = 0;

    // Constructor
    constructor() {
        // TODO: 初始化音频播放器配置
    }

    /**
     * 播放音频（模拟）
     * @param audioClip 音频资源
     * @param config 播放配置
     * @returns 音频实例句柄
     */
    public play(audioClip: unknown, config: AudioPlayConfig): IAudioInstance {
        // TODO: 实现模拟播放逻辑
        const instanceId = `mock_audio_${++this._instanceCounter}`;
        const instance = new MockAudioInstance(instanceId);
        instance.volume = config.volume ?? 1.0;
        instance.play();
        this._playingInstances.set(instanceId, instance);
        return instance;
    }

    /**
     * 停止所有音频播放
     */
    public stopAll(): void {
        // TODO: 实现停止所有音频的逻辑
        this._playingInstances.forEach((instance) => {
            instance.stop();
        });
        this._playingInstances.clear();
    }
}
