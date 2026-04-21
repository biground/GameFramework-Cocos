/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { MockAudioPlayer, MockAudioInstance } from '@game/shared/MockAudioPlayer';
import { AudioPlayConfig } from '@framework/audio/AudioDefs';

describe('MockAudioInstance', () => {
    test('初始状态：未播放、未暂停、音量为 1', () => {
        const instance = new MockAudioInstance('test_instance_1');
        expect(instance.id).toBe('test_instance_1');
        expect(instance.isPlaying).toBe(false);
        expect(instance.isPaused).toBe(false);
        expect(instance.volume).toBe(1.0);
        expect(instance.calls).toEqual([]);
    });

    test('play() 更新状态并记录调用', () => {
        const instance = new MockAudioInstance('test_instance_1');
        instance.play();
        expect(instance.isPlaying).toBe(true);
        expect(instance.isPaused).toBe(false);
        expect(instance.calls).toContain('play');
    });

    test('pause() 更新状态并记录调用', () => {
        const instance = new MockAudioInstance('test_instance_1');
        instance.play();
        instance.pause();
        expect(instance.isPaused).toBe(true);
        expect(instance.calls).toContain('pause');
    });

    test('resume() 恢复播放并记录调用', () => {
        const instance = new MockAudioInstance('test_instance_1');
        instance.play();
        instance.pause();
        instance.resume();
        expect(instance.isPlaying).toBe(true);
        expect(instance.isPaused).toBe(false);
        expect(instance.calls).toContain('resume');
    });

    test('stop() 停止播放并记录调用', () => {
        const instance = new MockAudioInstance('test_instance_1');
        instance.play();
        instance.stop();
        expect(instance.isPlaying).toBe(false);
        expect(instance.isPaused).toBe(false);
        expect(instance.calls).toContain('stop');
    });

    test('setVolume() 更新音量并记录调用', () => {
        const instance = new MockAudioInstance('test_instance_1');
        instance.setVolume(0.5);
        expect(instance.volume).toBe(0.5);
        expect(instance.calls).toContain('setVolume');
    });

    test('onComplete() 注册回调并在 simulateComplete 时触发', () => {
        const instance = new MockAudioInstance('test_instance_1');
        const callback = jest.fn();
        instance.onComplete(callback);
        expect(callback).not.toHaveBeenCalled();

        instance.simulateComplete();
        expect(callback).toHaveBeenCalledTimes(1);
        expect(instance.isPlaying).toBe(false);
    });
});

describe('MockAudioPlayer', () => {
    let player: MockAudioPlayer;

    beforeEach(() => {
        player = new MockAudioPlayer();
    });

    test('play() 创建实例并记录到 playHistory', () => {
        const clip = { name: 'bgm' };
        const config: AudioPlayConfig = { loop: true, volume: 0.8 };

        const instance = player.play(clip, config);

        expect(instance).toBeDefined();
        expect(instance.isPlaying).toBe(true);
        expect(player.playHistory.length).toBe(1);
        expect(player.playHistory[0].clip).toBe(clip);
        expect(player.playHistory[0].config).toBe(config);
        expect(player.playHistory[0].timestamp).toBeGreaterThan(0);
    });

    test('play() 使用默认音量 1.0', () => {
        const instance = player.play({}, {});
        expect(instance.volume).toBe(1.0);
    });

    test('play() 多次调用累积历史记录', () => {
        player.play({ id: 1 }, { volume: 0.5 });
        player.play({ id: 2 }, { loop: true });
        player.play({ id: 3 }, {});

        expect(player.playHistory.length).toBe(3);
        expect(player.activeInstances.length).toBe(3);
    });

    test('stopAll() 停止所有实例并清空活跃列表', () => {
        const inst1 = player.play({}, {});
        const inst2 = player.play({}, {});

        player.stopAll();

        expect(inst1.isPlaying).toBe(false);
        expect(inst2.isPlaying).toBe(false);
        expect(player.activeInstances.length).toBe(0);
    });

    test('createInstance() 创建命名实例', () => {
        const instance = player.createInstance({ id: 'music_001', type: 'music' });

        expect(instance).toBeDefined();
        expect(instance.id).toBe('music_001');
        expect(player.activeInstances).toContain(instance);
    });

    test('createInstance() 支持 sound 类型', () => {
        const instance = player.createInstance({ id: 'sfx_click', type: 'sound' });

        expect(instance.id).toBe('sfx_click');
    });

    test('activeInstances 跟踪当前活跃实例', () => {
        const inst1 = player.play({}, {});
        player.play({}, {});

        expect(player.activeInstances.length).toBe(2);

        inst1.stop();
        // stop 后实例仍在 activeInstances 中（由 stopAll 清理）
        expect(player.activeInstances.length).toBe(2);

        player.stopAll();
        expect(player.activeInstances.length).toBe(0);
    });

    test('实例方法调用可追踪', () => {
        const instance = player.play({}, {});
        const mockInst = instance as MockAudioInstance;

        mockInst.pause();
        mockInst.resume();
        mockInst.setVolume(0.3);
        mockInst.stop();

        expect(mockInst.calls).toEqual(['play', 'pause', 'resume', 'setVolume', 'stop']);
    });
});
