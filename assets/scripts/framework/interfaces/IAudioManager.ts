import { AudioPlayConfig, IAudioPlayer } from '../audio/AudioDefs';

/**
 * 音频管理器接口
 * 定义音频系统的公共契约，业务层应依赖此接口而非 AudioManager 实现类
 *
 * 核心职责：
 * 1. 背景音乐的播放/暂停/切换（同时只有一首）
 * 2. 音效的播放/停止（可叠加多个）
 * 3. 主音量、音乐音量、音效音量的分层控制
 * 4. 全局静音切换
 * 5. 通过 IAudioPlayer 策略注入，Framework 层不依赖引擎 API
 */
export interface IAudioManager {
    /**
     * 设置音频播放器（策略注入）
     * 必须在播放音频之前调用
     * @param player 音频播放器实现
     */
    setAudioPlayer(player: IAudioPlayer): void;

    // ─── 音乐控制 ──────────────────────────────────────

    /**
     * 播放背景音乐
     * 如果当前正在播放不同的音乐，会先停止旧的再播放新的
     * 如果播放的是同一首音乐，则不做任何操作
     * @param musicId 音乐资源标识
     * @param config 播放配置（可选）
     */
    playMusic(musicId: string, config?: AudioPlayConfig): void;

    /**
     * 停止当前背景音乐
     */
    stopMusic(): void;

    /**
     * 暂停当前背景音乐
     */
    pauseMusic(): void;

    /**
     * 恢复当前背景音乐
     */
    resumeMusic(): void;

    // ─── 音效控制 ──────────────────────────────────────

    /**
     * 播放音效
     * 同一 soundId 可以叠加播放多个实例
     * @param soundId 音效资源标识
     * @param config 播放配置（可选）
     */
    playSound(soundId: string, config?: AudioPlayConfig): void;

    /**
     * 停止指定音效的所有实例
     * @param soundId 音效资源标识
     */
    stopSound(soundId: string): void;

    /**
     * 停止所有音效
     */
    stopAllSounds(): void;

    // ─── 音量控制 ──────────────────────────────────────

    /**
     * 设置主音量
     * 实际播放音量 = masterVolume × categoryVolume
     * @param volume 音量值（0~1），超出范围会被 clamp
     */
    setMasterVolume(volume: number): void;

    /**
     * 设置音乐音量
     * @param volume 音量值（0~1），超出范围会被 clamp
     */
    setMusicVolume(volume: number): void;

    /**
     * 设置音效音量
     * @param volume 音量值（0~1），超出范围会被 clamp
     */
    setSoundVolume(volume: number): void;

    /**
     * 获取主音量
     * @returns 当前主音量（0~1）
     */
    getMasterVolume(): number;

    /**
     * 获取音乐音量
     * @returns 当前音乐音量（0~1）
     */
    getMusicVolume(): number;

    /**
     * 获取音效音量
     * @returns 当前音效音量（0~1）
     */
    getSoundVolume(): number;

    // ─── 静音控制 ──────────────────────────────────────

    /**
     * 设置全局静音状态
     * 静音不修改各音量属性值，只使实际播放音量为 0
     * @param muted 是否静音
     */
    setMuted(muted: boolean): void;

    /**
     * 获取当前静音状态
     * @returns 是否静音
     */
    isMuted(): boolean;

    // ─── 只读属性 ──────────────────────────────────────

    /**
     * 当前正在播放的音乐 ID
     * 没有播放时返回 null
     */
    readonly currentMusicId: string | null;
}
