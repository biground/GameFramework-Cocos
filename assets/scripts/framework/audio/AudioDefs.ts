import { EventKey } from '../event/EventDefs';

// ─── 枚举 ──────────────────────────────────────────────

/**
 * 音频类型枚举
 */
export enum AudioType {
    /** 背景音乐（同时只播放一首） */
    Music = 0,
    /** 音效（可叠加多个） */
    Sound = 1,
}

// ─── 数据结构 ──────────────────────────────────────────

/**
 * 音频基础信息
 * 描述一个音频资源的静态属性
 */
export interface IAudioInfo {
    /** 音频唯一标识 */
    readonly id: string;
    /** 音频资源引用（Framework 层不关心具体类型） */
    readonly audioClip: unknown;
    /** 是否循环播放 */
    readonly loop: boolean;
    /** 默认音量（0~1） */
    readonly volume: number;
}

/**
 * 正在播放的音频实例接口
 * 代表一个活跃的音频播放句柄，由 IAudioPlayer 创建
 */
export interface IAudioInstance {
    /** 实例唯一标识 */
    readonly id: string;
    /** 是否正在播放 */
    readonly isPlaying: boolean;
    /** 是否已暂停 */
    readonly isPaused: boolean;
    /** 当前音量 */
    volume: number;

    /** 开始播放 */
    play(): void;
    /** 停止播放 */
    stop(): void;
    /** 暂停播放 */
    pause(): void;
    /** 恢复播放 */
    resume(): void;
    /**
     * 设置音量
     * @param volume 音量值（0~1）
     */
    setVolume(volume: number): void;
    /**
     * 播放完成回调
     * @param callback 完成时调用的回调函数
     */
    onComplete(callback: () => void): void;
}

/**
 * 音频播放配置
 * 控制单次播放行为的参数
 */
export interface AudioPlayConfig {
    /** 是否循环播放，默认 false */
    loop?: boolean;
    /** 播放音量（0~1），默认 1.0 */
    volume?: number;
    /** 淡入时长（秒），默认 0（无淡入） */
    fadeIn?: number;
}

// ─── 策略接口 ──────────────────────────────────────────

/**
 * 音频播放器接口（策略模式）
 * Framework 层定义契约，Runtime 层提供实际实现
 *
 * @example
 * ```typescript
 * // Runtime 层实现
 * class CocosAudioPlayer implements IAudioPlayer {
 *     play(audioClip: unknown, config: AudioPlayConfig): IAudioInstance {
 *         // 使用 cc.AudioSource 播放
 *         return new CocosAudioInstance(audioClip, config);
 *     }
 *     stopAll(): void {
 *         cc.AudioSource.stopAll();
 *     }
 * }
 * ```
 */
export interface IAudioPlayer {
    /**
     * 播放音频
     * @param audioClip 音频资源
     * @param config 播放配置
     * @returns 音频实例句柄
     */
    play(audioClip: unknown, config: AudioPlayConfig): IAudioInstance;

    /**
     * 停止所有音频播放
     */
    stopAll(): void;
}

// ─── 事件键 ────────────────────────────────────────────

/**
 * 音量变更事件数据
 */
export interface VolumeChangedData {
    /** 音频类型（Music/Sound/Master） */
    readonly type: 'master' | 'music' | 'sound';
    /** 变更后的音量值 */
    readonly volume: number;
}

/**
 * 静音状态变更事件数据
 */
export interface MuteChangedData {
    /** 是否静音 */
    readonly muted: boolean;
}

/**
 * 音频事件键（用于 EventManager 通知）
 * @todo Runtime 层集成 EventManager 后启用事件通知
 */
export const AudioEvents = {
    /** 背景音乐切换 */
    MUSIC_CHANGED: new EventKey<string | null>('Audio.MusicChanged'),
    /** 音效播放 */
    SOUND_PLAYED: new EventKey<string>('Audio.SoundPlayed'),
    /** 音量变更 */
    VOLUME_CHANGED: new EventKey<VolumeChangedData>('Audio.VolumeChanged'),
    /** 静音状态变更 */
    MUTE_CHANGED: new EventKey<MuteChangedData>('Audio.MuteChanged'),
} as const;
