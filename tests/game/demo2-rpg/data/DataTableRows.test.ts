/**
 * Demo 2 RPG — DataTable 行类型单元测试
 */

import { CharacterConfigRow, CHAR_DATA } from '@game/demo2-rpg/data/CharacterConfigRow';
import { SkillConfigRow, SKILL_DATA } from '@game/demo2-rpg/data/SkillConfigRow';
import { MonsterConfigRow, MONSTER_DATA } from '@game/demo2-rpg/data/MonsterConfigRow';
import { StageConfigRow, STAGE_DATA } from '@game/demo2-rpg/data/StageConfigRow';

// ─── CharacterConfigRow ──────────────────────────────────

describe('CharacterConfigRow', () => {
    it('parseRow 正确填充所有字段', () => {
        const row = new CharacterConfigRow();
        row.parseRow(CHAR_DATA[0]);

        expect(row.id).toBe(1);
        expect(row.name).toBe('战士');
        expect(row.hp).toBe(200);
        expect(row.mp).toBe(50);
        expect(row.atk).toBe(30);
        expect(row.def).toBe(20);
        expect(row.spd).toBe(12);
        expect(row.skills).toBe('1,2');
    });

    it('静态数据包含 3 个角色', () => {
        expect(CHAR_DATA).toHaveLength(3);
    });

    it.each([
        [0, 1, '战士', 200, 50, 30, 20, 12, '1,2'],
        [1, 2, '法师', 120, 150, 40, 10, 8, '1,3,4'],
        [2, 3, '牧师', 150, 120, 15, 15, 10, '1,5,6'],
    ])('角色 %# (id=%i) 字段正确', (idx, id, name, hp, mp, atk, def, spd, skills) => {
        const row = new CharacterConfigRow();
        row.parseRow(CHAR_DATA[idx]);

        expect(row.id).toBe(id);
        expect(row.name).toBe(name);
        expect(row.hp).toBe(hp);
        expect(row.mp).toBe(mp);
        expect(row.atk).toBe(atk);
        expect(row.def).toBe(def);
        expect(row.spd).toBe(spd);
        expect(row.skills).toBe(skills);
    });

    it('缺失字段使用默认值', () => {
        const row = new CharacterConfigRow();
        row.parseRow({});

        expect(row.id).toBe(0);
        expect(row.name).toBe('');
        expect(row.hp).toBe(0);
        expect(row.mp).toBe(0);
        expect(row.atk).toBe(0);
        expect(row.def).toBe(0);
        expect(row.spd).toBe(0);
        expect(row.skills).toBe('');
    });
});

// ─── SkillConfigRow ──────────────────────────────────────

describe('SkillConfigRow', () => {
    it('parseRow 正确填充所有字段', () => {
        const row = new SkillConfigRow();
        row.parseRow(SKILL_DATA[0]);

        expect(row.id).toBe(1);
        expect(row.name).toBe('普通攻击');
        expect(row.mpCost).toBe(0);
        expect(row.damageRate).toBe(1.0);
        expect(row.target).toBe('single_enemy');
        expect(row.effect).toBe('none');
        expect(row.effectDuration).toBe(0);
        expect(row.cooldown).toBe(0);
    });

    it('静态数据包含 8 个技能', () => {
        expect(SKILL_DATA).toHaveLength(8);
    });

    it('火球术有冷却', () => {
        const row = new SkillConfigRow();
        row.parseRow(SKILL_DATA[2]);

        expect(row.id).toBe(3);
        expect(row.name).toBe('火球术');
        expect(row.mpCost).toBe(20);
        expect(row.damageRate).toBe(2.0);
        expect(row.cooldown).toBe(2);
    });

    it('暴风雪为全体敌人目标', () => {
        const row = new SkillConfigRow();
        row.parseRow(SKILL_DATA[3]);

        expect(row.target).toBe('all_enemy');
        expect(row.cooldown).toBe(3);
    });

    it('治愈之光为治疗效果', () => {
        const row = new SkillConfigRow();
        row.parseRow(SKILL_DATA[4]);

        expect(row.target).toBe('single_ally');
        expect(row.effect).toBe('heal');
    });

    it('战吼为增益效果并有持续时间', () => {
        const row = new SkillConfigRow();
        row.parseRow(SKILL_DATA[6]);

        expect(row.effect).toBe('buff_atk');
        expect(row.effectDuration).toBe(3);
        expect(row.cooldown).toBe(3);
    });

    it('眩晕打击有眩晕效果', () => {
        const row = new SkillConfigRow();
        row.parseRow(SKILL_DATA[7]);

        expect(row.effect).toBe('stun');
        expect(row.effectDuration).toBe(1);
        expect(row.cooldown).toBe(2);
    });

    it('缺失字段使用默认值', () => {
        const row = new SkillConfigRow();
        row.parseRow({});

        expect(row.id).toBe(0);
        expect(row.name).toBe('');
        expect(row.mpCost).toBe(0);
        expect(row.damageRate).toBe(0);
        expect(row.target).toBe('single_enemy');
        expect(row.effect).toBe('none');
        expect(row.effectDuration).toBe(0);
        expect(row.cooldown).toBe(0);
    });
});

// ─── MonsterConfigRow ────────────────────────────────────

describe('MonsterConfigRow', () => {
    it('parseRow 正确填充所有字段', () => {
        const row = new MonsterConfigRow();
        row.parseRow(MONSTER_DATA[0]);

        expect(row.id).toBe(1);
        expect(row.name).toBe('史莱姆');
        expect(row.hp).toBe(50);
        expect(row.atk).toBe(8);
        expect(row.def).toBe(3);
        expect(row.spd).toBe(5);
        expect(row.expReward).toBe(10);
        expect(row.goldReward).toBe(5);
    });

    it('静态数据包含 6 种怪物', () => {
        expect(MONSTER_DATA).toHaveLength(6);
    });

    it('骨龙为 BOSS 级怪物', () => {
        const row = new MonsterConfigRow();
        row.parseRow(MONSTER_DATA[5]);

        expect(row.id).toBe(6);
        expect(row.name).toBe('骨龙');
        expect(row.hp).toBe(500);
        expect(row.expReward).toBe(200);
        expect(row.goldReward).toBe(150);
    });

    it('所有怪物 ID 唯一', () => {
        const ids = MONSTER_DATA.map((d) => d['id']);
        expect(new Set(ids).size).toBe(MONSTER_DATA.length);
    });

    it('缺失字段使用默认值', () => {
        const row = new MonsterConfigRow();
        row.parseRow({});

        expect(row.id).toBe(0);
        expect(row.name).toBe('');
        expect(row.hp).toBe(0);
        expect(row.atk).toBe(0);
        expect(row.def).toBe(0);
        expect(row.spd).toBe(0);
        expect(row.expReward).toBe(0);
        expect(row.goldReward).toBe(0);
    });
});

// ─── StageConfigRow ──────────────────────────────────────

describe('StageConfigRow', () => {
    it('parseRow 正确填充所有字段', () => {
        const row = new StageConfigRow();
        row.parseRow(STAGE_DATA[0]);

        expect(row.id).toBe(1);
        expect(row.name).toBe('新手村');
        expect(row.monsters).toBe('1,1,2');
        expect(row.bgm).toBe('bgm_village');
        expect(row.maxRound).toBe(10);
    });

    it('静态数据包含 3 个关卡', () => {
        expect(STAGE_DATA).toHaveLength(3);
    });

    it.each([
        [0, 1, '新手村', '1,1,2', 10],
        [1, 2, '黑暗森林', '2,3,3,4', 15],
        [2, 3, '火山洞穴', '4,5,5,6', 20],
    ])('关卡 %# (id=%i) 字段正确', (idx, id, name, monsters, maxRound) => {
        const row = new StageConfigRow();
        row.parseRow(STAGE_DATA[idx]);

        expect(row.id).toBe(id);
        expect(row.name).toBe(name);
        expect(row.monsters).toBe(monsters);
        expect(row.maxRound).toBe(maxRound);
    });

    it('缺失字段使用默认值', () => {
        const row = new StageConfigRow();
        row.parseRow({});

        expect(row.id).toBe(0);
        expect(row.name).toBe('');
        expect(row.monsters).toBe('');
        expect(row.bgm).toBe('');
        expect(row.maxRound).toBe(0);
    });
});
