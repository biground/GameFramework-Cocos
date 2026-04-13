import { AudioManager } from '@framework/audio/AudioManager';
import { AudioPlayConfig, IAudioInstance, IAudioPlayer } from '@framework/audio/AudioDefs';

// ─── Mock 工具 ──────────────────────────────────────

/**
 * Mock 音频实例
 * 模拟一个可控的音频播放句柄
 */
class MockAudioInstance implements IAudioInstance {
    public readonly id: string;
    public isPlaying: boolean = false;
    public isPaused: boolean = false;
    public volume: number = 1.0;

    private _onCompleteCallback: (() => void) | null = null;

    constructor(id: string) {
        this.id = id;
    }

    play(): void {
        this.isPlaying = true;
        this.isPaused = false;
    }

    stop(): void {
        this.isPlaying = false;
        this.isPaused = false;
    }

    pause(): void {
        if (this.isPlaying) {
            this.isPlaying = false;
            this.isPaused = true;
        }
    }

    resume(): void {
        if (this.isPaused) {
            this.isPlaying = true;
            this.isPaused = false;
        }
    }

    setVolume(volume: number): void {
        this.volume = volume;
    }

    onComplete(callback: () => void): void {
        this._onCompleteCallback = callback;
    }

    /** 手动触发播放完成（用于测试） */
    simulateComplete(): void {
        this.isPlaying = false;
        this._onCompleteCallback?.();
    }

    /** 手动模拟自然结束（isPlaying 变为 false，不触发回调） */
    simulateEnd(): void {
        this.isPlaying = false;
    }
}

/**
 * Mock 音频播放器
 * 记录所有 play 调用，返回可控的 MockAudioInstance
 */
class MockAudioPlayer implements IAudioPlayer {
    /** 记录所有 play 调用（audioClip, config） */
    readonly playHistory: Array<{ audioClip: unknown; config: AudioPlayConfig }> = [];
    /** 最近一次创建的实例 */
    lastInstance: MockAudioInstance | null = null;
    /** 所有创建过的实例 */
    readonly allInstances: MockAudioInstance[] = [];
    /** stopAll 的调用次数 */
    stopAllCount: number = 0;

    private _instanceCounter: number = 0;

    play(audioClip: unknown, config: AudioPlayConfig): IAudioInstance {
        this.playHistory.push({ audioClip, config });
        const instance = new MockAudioInstance(`instance_${this._instanceCounter++}`);
        instance.volume = config.volume ?? 1.0;
        instance.isPlaying = true;
        this.lastInstance = instance;
        this.allInstances.push(instance);
        return instance;
    }

    stopAll(): void {
        this.stopAllCount++;
        for (const inst of this.allInstances) {
            inst.stop();
        }
    }
}

// ─── 测试用例 ──────────────────────────────────────

describe('AudioManager', () => {
    let manager: AudioManager;
    let mockPlayer: MockAudioPlayer;

    beforeEach(() => {
        manager = new AudioManager();
        mockPlayer = new MockAudioPlayer();
        manager.onInit();
        manager.setAudioPlayer(mockPlayer);
    });

    afterEach(() => {
        manager.onShutdown();
    });

    // ─── 初始化 ────────────────────────────────────

    describe('初始化', () => {
        test('默认音量均为 1.0', () => {
            const fresh = new AudioManager();
            fresh.onInit();
            expect(fresh.getMasterVolume()).toBe(1.0);
            expect(fresh.getMusicVolume()).toBe(1.0);
            expect(fresh.getSoundVolume()).toBe(1.0);
        });

        test('默认未静音', () => {
            const fresh = new AudioManager();
            fresh.onInit();
            expect(fresh.isMuted()).toBe(false);
        });

        test('初始无音乐播放', () => {
            const fresh = new AudioManager();
            fresh.onInit();
            expect(fresh.currentMusicId).toBeNull();
        });
    });

    // ─── 音乐播放 ──────────────────────────────────

    describe('音乐播放', () => {
        test('playMusic 调用 IAudioPlayer.play', () => {
            manager.playMusic('bgm_main');
            expect(mockPlayer.playHistory.length).toBe(1);
            expect(mockPlayer.playHistory[0].audioClip).toBe('bgm_main');
        });

        test('playMusic 重复播放同一首不重新创建', () => {
            manager.playMusic('bgm_main');
            const firstInstance = mockPlayer.lastInstance;
            manager.playMusic('bgm_main');
            // 不应再创建新实例
            expect(mockPlayer.playHistory.length).toBe(1);
            expect(mockPlayer.lastInstance).toBe(firstInstance);
        });

        test('playMusic 切换新曲时停止旧曲', () => {
            manager.playMusic('bgm_main');
            const oldInstance = mockPlayer.lastInstance!;
            manager.playMusic('bgm_battle');
            // 旧实例应被停止
            expect(oldInstance.isPlaying).toBe(false);
            // 新实例正在播放
            expect(mockPlayer.lastInstance!.isPlaying).toBe(true);
            expect(mockPlayer.playHistory.length).toBe(2);
        });

        test('stopMusic 停止当前音乐', () => {
            manager.playMusic('bgm_main');
            const instance = mockPlayer.lastInstance!;
            manager.stopMusic();
            expect(instance.isPlaying).toBe(false);
            expect(manager.currentMusicId).toBeNull();
        });

        test('pauseMusic / resumeMusic', () => {
            manager.playMusic('bgm_main');
            const instance = mockPlayer.lastInstance!;

            manager.pauseMusic();
            expect(instance.isPaused).toBe(true);
            expect(instance.isPlaying).toBe(false);

            manager.resumeMusic();
            expect(instance.isPaused).toBe(false);
            expect(instance.isPlaying).toBe(true);
        });

        test('currentMusicId 正确返回', () => {
            expect(manager.currentMusicId).toBeNull();
            manager.playMusic('bgm_main');
            expect(manager.currentMusicId).toBe('bgm_main');
            manager.playMusic('bgm_battle');
            expect(manager.currentMusicId).toBe('bgm_battle');
            manager.stopMusic();
            expect(manager.currentMusicId).toBeNull();
        });
    });

    // ─── 音效播放 ──────────────────────────────────

    describe('音效播放', () => {
        test('playSound 调用 IAudioPlayer.play', () => {
            manager.playSound('sfx_click');
            expect(mockPlayer.playHistory.length).toBe(1);
            expect(mockPlayer.playHistory[0].audioClip).toBe('sfx_click');
        });

        test('同一音效可叠加多个实例', () => {
            manager.playSound('sfx_click');
            manager.playSound('sfx_click');
            manager.playSound('sfx_click');
            expect(mockPlayer.playHistory.length).toBe(3);
            // 三个不同实例
            const ids = mockPlayer.allInstances.map((i) => i.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(3);
        });

        test('stopSound 停止指定音效所有实例', () => {
            manager.playSound('sfx_click');
            manager.playSound('sfx_click');
            manager.playSound('sfx_boom');

            const clickInstances = mockPlayer.allInstances.slice(0, 2);
            const boomInstance = mockPlayer.allInstances[2];

            manager.stopSound('sfx_click');

            // click 的实例全部停止
            for (const inst of clickInstances) {
                expect(inst.isPlaying).toBe(false);
            }
            // boom 不受影响
            expect(boomInstance.isPlaying).toBe(true);
        });

        test('stopAllSounds 停止所有音效', () => {
            manager.playSound('sfx_click');
            manager.playSound('sfx_boom');
            manager.playSound('sfx_hit');

            manager.stopAllSounds();

            for (const inst of mockPlayer.allInstances) {
                expect(inst.isPlaying).toBe(false);
            }
        });
    });

    // ─── 音量控制 ──────────────────────────────────

    describe('音量控制', () => {
        test('setMasterVolume 更新主音量', () => {
            manager.setMasterVolume(0.5);
            expect(manager.getMasterVolume()).toBe(0.5);
        });

        test('setMusicVolume 更新音乐音量', () => {
            manager.setMusicVolume(0.8);
            expect(manager.getMusicVolume()).toBe(0.8);
        });

        test('setSoundVolume 更新音效音量', () => {
            manager.setSoundVolume(0.3);
            expect(manager.getSoundVolume()).toBe(0.3);
        });

        test('音量乘法链：实际音量 = master × category', () => {
            manager.setMasterVolume(0.5);
            manager.setMusicVolume(0.8);
            manager.playMusic('bgm_main');
            // 实际音量应为 0.5 * 0.8 = 0.4
            expect(mockPlayer.lastInstance!.volume).toBeCloseTo(0.4);
        });

        test('音量范围 clamp 到 [0, 1]', () => {
            manager.setMasterVolume(1.5);
            expect(manager.getMasterVolume()).toBe(1.0);

            manager.setMasterVolume(-0.5);
            expect(manager.getMasterVolume()).toBe(0);

            manager.setMusicVolume(2.0);
            expect(manager.getMusicVolume()).toBe(1.0);

            manager.setSoundVolume(-1);
            expect(manager.getSoundVolume()).toBe(0);
        });

        test('设置音量后立即更新正在播放的实例', () => {
            manager.playMusic('bgm_main');
            manager.playSound('sfx_click');

            const musicInstance = mockPlayer.allInstances[0];
            const soundInstance = mockPlayer.allInstances[1];

            // 修改主音量
            manager.setMasterVolume(0.5);
            // 音乐实际音量 = 0.5 * 1.0 = 0.5
            expect(musicInstance.volume).toBeCloseTo(0.5);
            // 音效实际音量 = 0.5 * 1.0 = 0.5
            expect(soundInstance.volume).toBeCloseTo(0.5);

            // 修改音乐音量
            manager.setMusicVolume(0.6);
            // 音乐实际音量 = 0.5 * 0.6 = 0.3
            expect(musicInstance.volume).toBeCloseTo(0.3);
            // 音效不受影响，仍为 0.5
            expect(soundInstance.volume).toBeCloseTo(0.5);
        });
    });

    // ─── 静音 ──────────────────────────────────────

    describe('静音', () => {
        test('setMuted(true) 使所有声音音量为 0', () => {
            manager.playMusic('bgm_main');
            manager.playSound('sfx_click');

            manager.setMuted(true);

            expect(manager.isMuted()).toBe(true);
            // 所有实例的实际音量应为 0
            for (const inst of mockPlayer.allInstances) {
                expect(inst.volume).toBe(0);
            }
        });

        test('setMuted(false) 恢复原音量', () => {
            manager.setMasterVolume(0.8);
            manager.setMusicVolume(0.5);
            manager.setSoundVolume(0.6);

            manager.playMusic('bgm_main');
            manager.playSound('sfx_click');

            manager.setMuted(true);
            manager.setMuted(false);

            const musicInstance = mockPlayer.allInstances[0];
            const soundInstance = mockPlayer.allInstances[1];

            // 音乐实际音量 = 0.8 * 0.5 = 0.4
            expect(musicInstance.volume).toBeCloseTo(0.4);
            // 音效实际音量 = 0.8 * 0.6 = 0.48
            expect(soundInstance.volume).toBeCloseTo(0.48);
        });

        test('静音不修改 volume 属性值', () => {
            manager.setMasterVolume(0.8);
            manager.setMusicVolume(0.5);
            manager.setSoundVolume(0.6);

            manager.setMuted(true);

            // 音量属性不变
            expect(manager.getMasterVolume()).toBe(0.8);
            expect(manager.getMusicVolume()).toBe(0.5);
            expect(manager.getSoundVolume()).toBe(0.6);
        });
    });

    // ─── onUpdate 清理 ─────────────────────────────

    describe('onUpdate 清理', () => {
        test('清理已结束的音效实例', () => {
            manager.playSound('sfx_click');
            manager.playSound('sfx_click');

            const instance0 = mockPlayer.allInstances[0];
            const instance1 = mockPlayer.allInstances[1];

            // 模拟第一个实例播放结束
            instance0.simulateEnd();

            // 触发 update 清理
            manager.onUpdate(0.016);

            // 再播放一个新的
            manager.playSound('sfx_click');

            // 停止 sfx_click 的所有实例
            manager.stopSound('sfx_click');

            // 已结束的实例不应被重复 stop（不会出错即可）
            // 仍在播放的实例应被停止
            expect(instance1.isPlaying).toBe(false);
        });

        test('音乐结束后 currentMusicId 重置', () => {
            manager.playMusic('bgm_main');
            expect(manager.currentMusicId).toBe('bgm_main');

            // 模拟音乐自然结束
            const musicInstance = mockPlayer.lastInstance as MockAudioInstance;
            musicInstance.simulateEnd();

            // 触发 update
            manager.onUpdate(0.016);

            expect(manager.currentMusicId).toBeNull();
        });
    });

    // ─── 生命周期 ──────────────────────────────────

    describe('生命周期', () => {
        test('onShutdown 停止所有播放', () => {
            manager.playMusic('bgm_main');
            manager.playSound('sfx_click');
            manager.playSound('sfx_boom');

            manager.onShutdown();

            // 所有实例应停止
            for (const inst of mockPlayer.allInstances) {
                expect(inst.isPlaying).toBe(false);
            }
            // 状态应重置
            expect(manager.currentMusicId).toBeNull();
        });

        test('未设置 audioPlayer 时播放应抛错', () => {
            const freshManager = new AudioManager();
            freshManager.onInit();
            // 未调用 setAudioPlayer

            expect(() => freshManager.playMusic('bgm_main')).toThrow('[AudioManager]');
            expect(() => freshManager.playSound('sfx_click')).toThrow('[AudioManager]');
        });
    });

    // ─── setAudioPlayer 边界 ───────────────────────

    describe('setAudioPlayer', () => {
        test('传入 null 应抛错', () => {
            expect(() => manager.setAudioPlayer(null as unknown as IAudioPlayer)).toThrow(
                '[AudioManager] player 不能为空',
            );
        });
    });
});
