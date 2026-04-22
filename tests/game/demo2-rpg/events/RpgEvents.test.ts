import { RpgEvents } from '@game/demo2-rpg/events/RpgEvents';
import { EventKey } from '@framework/event/EventDefs';

describe('RpgEvents', () => {
    const entries = Object.entries(RpgEvents);

    it('所有事件键应为 EventKey 实例', () => {
        for (const [, key] of entries) {
            expect(key).toBeInstanceOf(EventKey);
        }
    });

    it('所有事件键 description 应包含 "rpg:" 前缀', () => {
        for (const [, key] of entries) {
            expect((key as unknown as EventKey).description).toMatch(/^rpg:/);
        }
    });

    it('应包含 13 个事件键', () => {
        expect(entries).toHaveLength(13);
    });

    it.each([
        ['ATTACK', 'rpg:attack'],
        ['CHARACTER_HURT', 'rpg:character_hurt'],
        ['CHARACTER_DEAD', 'rpg:character_dead'],
        ['CHARACTER_HEALED', 'rpg:character_healed'],
        ['ROUND_START', 'rpg:round_start'],
        ['ROUND_END', 'rpg:round_end'],
        ['SKILL_USED', 'rpg:skill_used'],
        ['BUFF_APPLIED', 'rpg:buff_applied'],
        ['BUFF_EXPIRED', 'rpg:buff_expired'],
        ['BATTLE_VICTORY', 'rpg:battle_victory'],
        ['BATTLE_DEFEAT', 'rpg:battle_defeat'],
        ['STAGE_SELECTED', 'rpg:stage_selected'],
        ['PROCEDURE_CHANGED', 'rpg:procedure_changed'],
    ])('%s 的 description 应为 "%s"', (name, expected) => {
        const key = RpgEvents[name as keyof typeof RpgEvents];
        expect(key).toBeDefined();
        expect((key as unknown as EventKey).description).toBe(expected);
    });
});
