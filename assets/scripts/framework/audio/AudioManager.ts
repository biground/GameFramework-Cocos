import { ModuleBase } from '../core/ModuleBase';
import { IAudioManager } from './IAudioManager';
import { AudioPlayConfig, IAudioInstance, IAudioPlayer } from './AudioDefs';

/**
 * 音频管理器
 * 统一管理游戏音频的播放、暂停、音量和静音控制
 *
 * 设计要点：
 * - 音乐同时只播放一首，切换时自动停止旧曲
 * - 音效可叠加多个实例，按 soundId 分组管理
 * - 三级音量乘法链：实际音量 = masterVolume × categoryVolume
 * - 静音不修改音量属性，只令实际播放音量为 0
 * - 通过 IAudioPlayer 策略注入，Framework 层不依赖引擎 API
 */
export class AudioManager extends ModuleBase implements IAudioManager {
    public get moduleName(): string {
        return 'AudioManager';
    }

    public get priority(): number {
        return 210;
    }

    // ─── 内部状态 ──────────────────────────────────────

    /** 音频播放器（由 Runtime 层注入） */
    private _audioPlayer: IAudioPlayer | null = null;

    /** 当前背景音乐实例 */
    private _currentMusic: IAudioInstance | null = null;

    /** 当前背景音乐 ID */
    private _currentMusicId: string | null = null;

    /** 音效实例映射：soundId → 实例数组（支持同一音效叠加） */
    private _sounds: Map<string, IAudioInstance[]> = new Map();

    /** 主音量（0~1） */
    private _masterVolume: number = 1.0;

    /** 音乐音量（0~1） */
    private _musicVolume: number = 1.0;

    /** 音效音量（0~1） */
    private _soundVolume: number = 1.0;

    /** 是否静音 */
    private _muted: boolean = false;

    // ─── 只读属性 ──────────────────────────────────────

    /** 当前正在播放的音乐 ID */
    public get currentMusicId(): string | null {
        return this._currentMusicId;
    }

    // ─── 生命周期 ──────────────────────────────────────

    public onInit(): void {
        // 初始化无特殊操作
    }

    public onUpdate(_deltaTime: number): void {
        // 遍历 _sounds，清理已结束的音效实例（原地逆序 splice，零分配）
        for (const [soundId, instances] of this._sounds) {
            for (let i = instances.length - 1; i >= 0; i--) {
                if (!instances[i].isPlaying) {
                    instances.splice(i, 1);
                }
            }
            if (instances.length === 0) {
                this._sounds.delete(soundId);
            }
        }

        // 检查音乐实例是否已自然结束
        if (this._currentMusic && !this._currentMusic.isPlaying && !this._currentMusic.isPaused) {
            this._currentMusic = null;
            this._currentMusicId = null;
        }
    }

    public onShutdown(): void {
        if (this._audioPlayer) {
            this._audioPlayer.stopAll();
        }
        this._currentMusic = null;
        this._currentMusicId = null;
        this._sounds.clear();
    }

    // ─── IAudioManager 实现 ────────────────────────────

    /**
     * 设置音频播放器
     */
    public setAudioPlayer(player: IAudioPlayer): void {
        if (!player) {
            throw new Error('[AudioManager] player 不能为空');
        }
        this._audioPlayer = player;
    }

    // ─── 音乐控制 ──────────────────────────────────────

    /**
     * 播放背景音乐
     */
    public playMusic(musicId: string, config?: AudioPlayConfig): void {
        if (!this._audioPlayer) {
            throw new Error('[AudioManager] 未设置 audioPlayer');
        }
        if (musicId === this._currentMusicId) {
            return;
        }
        if (this._currentMusic) {
            this._currentMusic.stop();
        }
        const finalConfig: AudioPlayConfig = { loop: true, ...config };
        const instance = this._audioPlayer.play(musicId, finalConfig);
        instance.setVolume(this._calculateMusicVolume());
        this._currentMusic = instance;
        this._currentMusicId = musicId;
    }

    /**
     * 停止当前背景音乐
     */
    public stopMusic(): void {
        if (this._currentMusic) {
            this._currentMusic.stop();
            this._currentMusic = null;
            this._currentMusicId = null;
        }
    }

    /**
     * 暂停当前背景音乐
     */
    public pauseMusic(): void {
        if (this._currentMusic) {
            this._currentMusic.pause();
        }
    }

    /**
     * 恢复当前背景音乐
     */
    public resumeMusic(): void {
        if (this._currentMusic) {
            this._currentMusic.resume();
        }
    }

    // ─── 音效控制 ──────────────────────────────────────

    /**
     * 播放音效
     */
    public playSound(soundId: string, config?: AudioPlayConfig): void {
        if (!this._audioPlayer) {
            throw new Error('[AudioManager] 未设置 audioPlayer');
        }
        const instance = this._audioPlayer.play(soundId, config ?? {});
        instance.setVolume(this._calculateSoundVolume());
        const list = this._sounds.get(soundId) ?? [];
        list.push(instance);
        this._sounds.set(soundId, list);
    }

    /**
     * 停止指定音效的所有实例
     */
    public stopSound(soundId: string): void {
        const instances = this._sounds.get(soundId);
        if (instances) {
            for (const inst of instances) {
                inst.stop();
            }
            this._sounds.delete(soundId);
        }
    }

    /**
     * 停止所有音效
     */
    public stopAllSounds(): void {
        for (const [, instances] of this._sounds) {
            for (const inst of instances) {
                inst.stop();
            }
        }
        this._sounds.clear();
    }

    // ─── 音量控制 ──────────────────────────────────────

    /**
     * 设置主音量
     */
    public setMasterVolume(volume: number): void {
        this._masterVolume = this._clampVolume(volume);
        this._updateAllVolumes();
    }

    /**
     * 设置音乐音量
     */
    public setMusicVolume(volume: number): void {
        this._musicVolume = this._clampVolume(volume);
        if (this._currentMusic) {
            this._currentMusic.setVolume(this._calculateMusicVolume());
        }
    }

    /**
     * 设置音效音量
     */
    public setSoundVolume(volume: number): void {
        this._soundVolume = this._clampVolume(volume);
        this._updateSoundVolumes();
    }

    /**
     * 获取主音量
     */
    public getMasterVolume(): number {
        return this._masterVolume;
    }

    /**
     * 获取音乐音量
     */
    public getMusicVolume(): number {
        return this._musicVolume;
    }

    /**
     * 获取音效音量
     */
    public getSoundVolume(): number {
        return this._soundVolume;
    }

    // ─── 静音控制 ──────────────────────────────────────

    /**
     * 设置全局静音状态
     */
    public setMuted(muted: boolean): void {
        this._muted = muted;
        this._updateAllVolumes();
    }

    /**
     * 获取当前静音状态
     */
    public isMuted(): boolean {
        return this._muted;
    }

    // ─── 内部方法 ──────────────────────────────────────

    /**
     * 更新所有正在播放的实例音量
     */
    private _updateAllVolumes(): void {
        if (this._currentMusic) {
            this._currentMusic.setVolume(this._calculateMusicVolume());
        }
        this._updateSoundVolumes();
    }

    /**
     * 更新所有音效实例音量
     */
    private _updateSoundVolumes(): void {
        const vol = this._calculateSoundVolume();
        for (const [, instances] of this._sounds) {
            for (const inst of instances) {
                inst.setVolume(vol);
            }
        }
    }

    /**
     * 计算音乐实际音量
     * 静音时返回 0，否则返回主音量 × 音乐音量
     * @returns 音乐实际播放音量
     */
    private _calculateMusicVolume(): number {
        return this._muted ? 0 : this._masterVolume * this._musicVolume;
    }

    /**
     * 计算音效实际音量
     * 静音时返回 0，否则返回主音量 × 音效音量
     * @returns 音效实际播放音量
     */
    private _calculateSoundVolume(): number {
        return this._muted ? 0 : this._masterVolume * this._soundVolume;
    }

    /**
     * 对音量值进行 clamp，确保在 [0, 1] 范围内
     * @param volume 输入音量值
     * @returns clamp 后的音量值
     */
    private _clampVolume(volume: number): number {
        return Math.max(0, Math.min(1, volume));
    }
}
