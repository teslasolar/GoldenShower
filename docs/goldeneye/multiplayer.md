# GoldenEye 007 - Multiplayer System

## Overview

- 2-4 players split-screen
- Added late in development (almost cut)
- Shared single N64 console
- No network play (local only)

## Split Screen Rendering

```c
typedef struct Viewport {
    u16 x, y;
    u16 width, height;
    u8 player_id;
} Viewport;

// 2-player: horizontal split
// 3-player: 2 top, 1 bottom
// 4-player: quadrants

Viewport viewports_2p[] = {
    { 0,   0, 320, 120, 0 },
    { 0, 120, 320, 120, 1 },
};

Viewport viewports_3p[] = {
    { 0,   0, 160, 120, 0 },
    {160,  0, 160, 120, 1 },
    { 80,120, 160, 120, 2 },
};

Viewport viewports_4p[] = {
    { 0,   0, 160, 120, 0 },
    {160,  0, 160, 120, 1 },
    { 0, 120, 160, 120, 2 },
    {160,120, 160, 120, 3 },
};

void render_multiplayer() {
    Viewport* vps = get_viewports(player_count);

    for (int i = 0; i < player_count; i++) {
        set_viewport(vps[i]);
        set_scissor(vps[i]);
        render_player_view(&players[i]);
    }
}
```

## Player Spawn System

```c
typedef struct SpawnPoint {
    Vec3 pos;
    float angle;
    u8 flags;
} SpawnPoint;

#define SPAWN_RESPAWN_DELAY  90  // frames (~3 sec)

SpawnPoint* select_spawn(u8 player_id) {
    SpawnPoint* best = NULL;
    float best_score = -FLT_MAX;

    for (int i = 0; i < spawn_count; i++) {
        SpawnPoint* sp = &spawns[i];

        // Score based on distance from other players
        float min_player_dist = FLT_MAX;
        for (int j = 0; j < player_count; j++) {
            if (j == player_id) continue;
            if (!players[j].alive) continue;

            float d = dist_sq(sp->pos, players[j].pos);
            if (d < min_player_dist) min_player_dist = d;
        }

        // Prefer spawns far from enemies
        float score = min_player_dist;

        // Penalize recently used spawns
        if (sp->last_used_frame > frame_count - 300) {
            score *= 0.5f;
        }

        if (score > best_score) {
            best_score = score;
            best = sp;
        }
    }

    best->last_used_frame = frame_count;
    return best;
}
```

## Game Modes

```c
typedef enum GameMode {
    MODE_NORMAL,          // deathmatch
    MODE_YOU_ONLY_LIVE_TWICE,
    MODE_LICENSE_TO_KILL, // one-shot kills
    MODE_LIVING_DAYLIGHTS,// flag mode
    MODE_MAN_WITH_GOLDEN_GUN,
} GameMode;

typedef struct MatchSettings {
    GameMode mode;
    u8 score_limit;       // kills to win (0=no limit)
    u8 time_limit;        // minutes (0=no limit)
    u8 weapon_set;
    u8 health;            // -4 to +4
    bool auto_aim;
    u8 arena_id;
} MatchSettings;

// Health modifiers
float health_mult[] = {
    0.25f,  // -4
    0.5f,   // -3
    0.75f,  // -2
    0.9f,   // -1
    1.0f,   //  0
    1.5f,   // +1
    2.0f,   // +2
    4.0f,   // +3
    10.0f,  // +4
};
```

## Weapon Sets

```c
typedef struct WeaponSet {
    u8 id;
    char name[20];
    u8 weapons[8];
    u8 weapon_count;
} WeaponSet;

WeaponSet weapon_sets[] = {
    { 0, "Slappers Only",    {WPN_UNARMED}, 1 },
    { 1, "Pistols",          {WPN_PP7, WPN_DD44, WPN_COUGAR}, 3 },
    { 2, "Automatics",       {WPN_KLOBB, WPN_KF7, WPN_ZMG, WPN_D5K}, 4 },
    { 3, "Power Weapons",    {WPN_SHOTGUN, WPN_SNIPER, WPN_ROCKET}, 3 },
    { 4, "Grenades",         {WPN_GRENADE, WPN_GRENADE_LAUNCHER}, 2 },
    { 5, "Rockets",          {WPN_ROCKET}, 1 },
    { 6, "Lasers",           {WPN_MOONRAKER}, 1 },
    { 7, "Golden Gun",       {WPN_GOLDEN_GUN, WPN_PP7}, 2 },
    { 8, "Remote Mines",     {WPN_REMOTE_MINE}, 1 },
    { 9, "Throwing Knives",  {WPN_THROWING_KNIFE}, 1 },
    {10, "All Weapons",      {/* all */}, 0xFF },
};
```

## Score Tracking

```c
typedef struct PlayerScore {
    u8 kills;
    u8 deaths;
    u8 suicides;
    u8 headshots;
    u8 accuracy_shots;
    u8 accuracy_hits;
    u16 damage_dealt;
    u16 damage_taken;
} PlayerScore;

PlayerScore scores[4];

void record_kill(u8 killer, u8 victim, BodyPart part) {
    if (killer == victim) {
        scores[killer].suicides++;
        scores[killer].kills--;  // penalty
    } else {
        scores[killer].kills++;
        if (part == PART_HEAD) {
            scores[killer].headshots++;
        }
    }
    scores[victim].deaths++;

    // Check win condition
    if (match.score_limit > 0 && scores[killer].kills >= match.score_limit) {
        end_match(killer);
    }
}
```

## Character Select

```c
typedef struct Character {
    u8 id;
    char name[16];
    u8 model_id;
    u8 head_id;
    float height_scale;
    float hitbox_scale;
} Character;

Character characters[] = {
    { 0, "James Bond",    CHR_BOND,     0, 1.0f, 1.0f },
    { 1, "Natalya",       CHR_NATALYA,  0, 0.9f, 0.9f },
    { 2, "Trevelyan",     CHR_TREVELYAN,0, 1.0f, 1.0f },
    { 3, "Xenia",         CHR_XENIA,    0, 0.95f,0.95f},
    { 4, "Oddjob",        CHR_ODDJOB,   0, 0.75f,0.75f}, // controversial!
    { 5, "Jaws",          CHR_JAWS,     0, 1.2f, 1.2f },
    { 6, "Baron Samedi",  CHR_SAMEDI,   0, 1.0f, 1.0f },
    { 7, "Mayday",        CHR_MAYDAY,   0, 1.0f, 1.0f },
    // ...
};
```

## Arena Layout

```c
typedef struct Arena {
    u8 id;
    char name[20];
    u8 level_id;         // reuse single-player level
    SpawnPoint spawns[16];
    u8 spawn_count;
    WeaponSpawn weapons[32];
    u8 weapon_spawn_count;
    AmmoSpawn ammo[32];
    u8 ammo_spawn_count;
    ArmorSpawn armor[8];
    u8 armor_spawn_count;
} Arena;

// Weapon respawn
typedef struct WeaponSpawn {
    Vec3 pos;
    u8 weapon_id;
    u16 respawn_time;    // frames
    u16 respawn_timer;
} WeaponSpawn;

void update_weapon_spawns() {
    for (int i = 0; i < arena->weapon_spawn_count; i++) {
        WeaponSpawn* ws = &arena->weapons[i];

        if (ws->respawn_timer > 0) {
            ws->respawn_timer--;
            if (ws->respawn_timer == 0) {
                spawn_pickup(ws->pos, PICKUP_WEAPON, ws->weapon_id);
            }
        }
    }
}
```

## Modern Split-Screen

```c
// Using modern rendering
void render_splitscreen() {
    // Each player gets own render target
    for (int i = 0; i < player_count; i++) {
        bind_framebuffer(player_fbo[i]);
        glViewport(0, 0, PLAYER_RT_WIDTH, PLAYER_RT_HEIGHT);

        Camera cam = make_player_camera(&players[i]);
        render_scene(&cam);
        render_weapon_viewmodel(&players[i]);
        render_hud(&players[i]);
    }

    // Composite to screen
    bind_framebuffer(0);
    glViewport(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    for (int i = 0; i < player_count; i++) {
        Viewport vp = viewports[player_count-2][i];
        draw_textured_quad(
            vp.x, vp.y, vp.width, vp.height,
            player_fbo_texture[i]
        );
    }
}
```
