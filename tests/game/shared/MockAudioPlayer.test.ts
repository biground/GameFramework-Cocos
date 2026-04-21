import { MockAudioInstance, MockAudioPlayer } from '@game/shared/MockAudioPlayer';
import { AudioPlayConfig } from '@framework/audio/AudioDefs';

describe('MockAudioInstance', () => {
    let instance: MockAudioInstance;

    beforeEach(() => {
        instance = new MockAudioInstance('test_audio_1');
    });

    it('初始状态：未播放、未暂停、音量 1.0', () => {
        expect(instance.id).toBe('test_audio_1');
        expect(instance.isPlaying).toBe(false);
        expect(instance.isPaused).toBe(false);
        expect(instance.volume).toBe(1.0);
        expect(instance.calls).toEqual([]);
    });

    it('play() 设置 isPlaying=true 并记录调用', () => {
        instance.play();
        expect(instance.isPlaying).toBe(true);
        expect(instance.isPaused).toBe(false);
        expect(instance.calls).toEqual(['play']);
    });

    it('pause() 设置 isPaused=true 并记录调用', () => {
        instance.play();
        instance.pause();
        expect(instance.isPaused).toBe(true);
        expect(instance.calls).toEqual(['play', 'pause']);
    });

    it('resume() 恢复播放状态并记录调用', () => {
        instance.play();
        instance.pause();
        instance.resume();
        expect(instance.isPlaying).toBe(true);
        expect(instance.isPaused).toBe(false);
        expect(instance.calls).toEqual(['play', 'pause', 'resume']);
    });

    it('stop() 停止播放并记录调用', () => {
        instance.play();
        instance.stop();
        expect(instance.isPlaying).toBe(false);
        expect(instance.isPaused).toBe(false);
        expect(instance.calls).toEqual(['play', 'stop']);
    });

    it('setVolume() 设置音量并记录调用', () => {
        instance.setVolume(0.5);
        expect(instance.volume).toBe(0.5);
        expect(instance.calls).toEqual(['setVolume']);
    });

    it('volume 属性可直接赋值', () => {
        instance.volume = 0.3;
        expect(instance.volume).toBe(0.3);
    });

    it('onComplete + simulateComplete 触发回调并停止播放', () => {
        const callback = jest.fn();
        instance.onComplete(callback);
        instance.play();
        instance.simulateComplete();

        expect(callback).toHaveBeenCalledTimes(1);
        expect(instance.isPlaying).toBe(false);
    });

    it('simulateComplete 无回调时不报错', () => {
        instance.play();
        expect(() => instance.simulateComplete()).not.toThrow();
        expect(instance.isPlaying).toBe(false);
    });

    it('完整生命周期：play → pause → resume → stop 调用记录正确', () => {
        instance.play();
        instance.pause();
        instance.resume();
        instance.stop();
        expect(instance.calls).toEqual(['play', 'pause', 'resume', 'stop']);
    });
});

describe('MockAudioPlayer', () => {
    let player: MockAudioPlayer;

    beforeEach(() => {
        player = new MockAudioPlayer();
    });

    it('play() 返回音频实例并记录播放历史', () => {
        const config: AudioPlayConfig = { volume: 0.8, loop: false };
        const instance = player.play('bgm.mp3', config);

        expect(instance).toBeDefined();
        expect(instance.isPlaying).toBe(true);
        expect(instance.volume).toBe(0.8);
        expect(player.playHistory).toHaveLength(1);
        expect(player.playHistory[0].clip).toBe('bgm.mp3');
        expect(player.playHistory[0].config).toBe(config);
        expect(player.playHistory[0].timestamp).toBeGreaterThan(0);
    });

    it('play() 使用默认音量 1.0（config 不指定 volume）', () => {
        const instance = player.play('sfx.mp3', {});
        expect(instance.volume).toBe(1.0);
    });

    it('play() 多次调用生成不同 id 的实例', () => {
        const i1 = player.play('a.mp3', {});
        const i2 = player.play('b.mp3', {});
        expect(i1.id).not.toBe(i2.id);
        expect(player.activeInstances).toHaveLength(2);
        expect(player.playHistory).toHaveLength(2);
    });

    it('stopAll() 停止所有实例并清空 activeInstances', () => {
        const i1 = player.play('a.mp3', {});
        const i2 = player.play('b.mp3', {});
        player.stopAll();

        expect(i1.isPlaying).toBe(false);
        expect(i2.isPlaying).toBe(false);
        expect(player.activeInstances).toHaveLength(0);
    });

    it('stopAll() 无活跃实例时不报错', () => {
        expect(() => player.stopAll()).not.toThrow();
        expect(player.activeInstances).toHaveLength(0);
    });

    it('createInstance() 创建命名实例并加入 activeInstances', () => {
        const instance = player.createInstance({ id: 'custom_bgm', type: 'music' });
        expect(instance.id).toBe('custom_bgm');
        expect(player.activeInstances).toHaveLength(1);
    });
});
