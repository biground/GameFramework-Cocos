# AudioManager（音频管理器）

## 职责

统一管理游戏音频的播放、暂停、音量和静音控制。**不负责**音频资源的加载/卸载（由 ResourceManager 处理）、音频解码（由引擎处理）、3D 空间音效。

## 核心概念

### Music 单实例 + Sound 多实例

- **Music**：背景音乐，同时只播放一首。切换时自动停止旧曲，播放同一首时不做操作。
- **Sound**：音效，可叠加多个实例。按 `soundId` 分组管理，支持整组停止。

### 三级音量乘法链

```
实际播放音量 = masterVolume × categoryVolume × instanceVolume
```

- `masterVolume`：主音量，全局生效
- `musicVolume` / `soundVolume`：分类音量，分别控制音乐和音效
- `instanceVolume`：单个实例音量（通过 `AudioPlayConfig.volume` 设置）

所有音量值范围 `0~1`，超出会被 clamp。

### 静音开关

`setMuted(true)` 令实际播放音量为 0，但**不修改**各级音量属性值。取消静音后恢复原音量。

### IAudioPlayer 策略注入

Framework 层通过 `IAudioPlayer` 接口定义音频播放契约，Runtime 层注入引擎实现（如 `CocosAudioPlayer`），实现框架与引擎解耦。

```typescript
// Runtime 层注入
const audioMgr = GameEntry.getModule<IAudioManager>('AudioManager');
audioMgr.setAudioPlayer(new CocosAudioPlayer());
```

## 对外 API

```typescript
interface IAudioManager {
    // 策略注入
    setAudioPlayer(player: IAudioPlayer): void;

    // 音乐控制
    playMusic(musicId: string, config?: AudioPlayConfig): void;
    stopMusic(): void;
    pauseMusic(): void;
    resumeMusic(): void;

    // 音效控制
    playSound(soundId: string, config?: AudioPlayConfig): void;
    stopSound(soundId: string): void;
    stopAllSounds(): void;

    // 音量控制
    setMasterVolume(volume: number): void;
    setMusicVolume(volume: number): void;
    setSoundVolume(volume: number): void;
    getMasterVolume(): number;
    getMusicVolume(): number;
    getSoundVolume(): number;

    // 静音控制
    setMuted(muted: boolean): void;
    isMuted(): boolean;

    // 只读属性
    readonly currentMusicId: string | null;
}
```

## 设计决策

| 决策                            | 选择                            | 原因                                               |
| ------------------------------- | ------------------------------- | -------------------------------------------------- |
| music 同时只一首                | 切换时先 stop 旧曲              | 绝大多数游戏场景只需一首 BGM                       |
| sound 按 ID 分组                | `Map<string, IAudioInstance[]>` | 支持同一音效叠加，且可按 ID 整组停止               |
| 三级音量乘法                    | `master × category`             | 匹配主流游戏引擎的音量分层模型                     |
| 静音不改属性值                  | flag 控制，取消恢复             | 用户调节的音量不会因静音而丢失                     |
| IAudioPlayer 策略注入           | 接口 + setter                   | 与 ResourceManager 一致的模式，Framework 不依赖 cc |
| priority = 210                  | 业务框架范围 200-299            | 依赖 ResourceManager(150)，在其之后初始化          |
| onUpdate 清理已结束实例         | 每帧遍历 \_sounds               | 避免 Map 无限增长；零 GC（复用数组 index 遍历）    |
| AudioPlayConfig.loop 默认 false | 显式默认值                      | 音效通常不循环；音乐循环由调用方按需传入           |

## 依赖

- **ResourceManager**：音频资源的加载/卸载（通过 IAudioPlayer 间接依赖）

## 被谁依赖

- 业务层 Game 模块（通过 `IAudioManager` 接口）

## 已知限制

- 无音频优先级淘汰机制（大量音效同时播放时无法自动淘汰低优先级）
- 无 fadeIn/fadeOut 平滑过渡（`AudioPlayConfig.fadeIn` 字段已预留但未实现）
- 无 3D 空间音效支持
- `AudioEvents` 事件键已定义但未启用发布（待 Runtime 层集成 EventManager 后开启）
- 无音频预加载 / 缓存池

## 后续拓展方向

1. **fadeIn/fadeOut**：音乐切换的平滑过渡，在 `onUpdate` 中按帧插值
2. **音频优先级淘汰**：限制同时播放的音效数量，自动淘汰低优先级
3. **3D 空间音效**：结合 Entity 位置信息计算衰减
4. **AudioEvents 启用**：Runtime 层集成后，emit 音量变更、静音变更等事件
5. **音频预加载池**：常用音效预加载 + LRU 缓存，减少加载延迟

## 关联测试

- 测试文件路径：`tests/audio/audio-manager.test.ts`
- 测试数量：27 个
- 覆盖场景：音乐播放/切换/暂停/恢复、音效叠加/停止、三级音量控制、静音切换、onUpdate 清理、onShutdown 全量停止
