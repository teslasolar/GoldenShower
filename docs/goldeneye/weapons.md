# GoldenEye 007 - Weapons System

## Weapon Data Structure

```c
typedef struct Weapon {
    u8 id;
    char name[16];
    u8 damage;          // base damage
    u8 fire_rate;       // frames between shots
    u8 reload_frames;
    u8 mag_size;
    u8 max_ammo;
    u8 accuracy;        // 0=perfect, 255=max spread
    u8 range;           // effective range
    u8 pellets;         // 1 for most, 5 for shotgun
    u8 recoil;
    u16 flags;
    u8 model_id;
    u8 fire_anim;
    u8 reload_anim;
    u8 fire_sound;
} Weapon;

// Flags
#define WPN_AUTO       0x0001  // full auto
#define WPN_BURST      0x0002  // burst fire
#define WPN_SILENCED   0x0004
#define WPN_SCOPE      0x0008
#define WPN_DUAL       0x0010  // can dual wield
#define WPN_MELEE      0x0020
#define WPN_EXPLOSIVE  0x0040
#define WPN_THROWN     0x0080
#define WPN_ONE_SHOT   0x0100  // golden gun
```

## Weapon Table (Reconstructed)

```c
Weapon weapons[] = {
    // ID  Name              DMG  ROF  RLD MAG MAX ACC RNG PEL RCL FLAGS
    { 0,  "Unarmed",          3,  15,   0,  0,  0,  0,  50,  1,  0, WPN_MELEE },
    { 1,  "Hunting Knife",   40,  20,   0,  0,  0,  0,  50,  1,  0, WPN_MELEE },
    { 2,  "PP7",             16,   8,  40, 7, 100, 20, 800,  1,  3, WPN_DUAL },
    { 3,  "PP7 Silenced",    16,   8,  40, 7, 100, 20, 800,  1,  3, WPN_SILENCED|WPN_DUAL },
    { 4,  "DD44",            20,  10,  50, 8,  80, 25, 700,  1,  5, WPN_DUAL },
    { 5,  "Klobb",            8,   3,  40,20, 200, 50, 500,  1,  2, WPN_AUTO|WPN_DUAL },
    { 6,  "KF7 Soviet",      16,   4,  60,30, 400, 30, 900,  1,  4, WPN_AUTO|WPN_SCOPE },
    { 7,  "ZMG",             12,   3,  50,32, 400, 35, 600,  1,  3, WPN_AUTO|WPN_DUAL },
    { 8,  "D5K",             14,   4,  45,30, 300, 30, 700,  1,  3, WPN_AUTO|WPN_SILENCED|WPN_DUAL },
    { 9,  "Phantom",         14,   3,  60,50, 500, 40, 600,  1,  4, WPN_AUTO },
    {10,  "AR33",            20,   4,  70,30, 300, 20,1000,  1,  5, WPN_AUTO|WPN_SCOPE },
    {11,  "RC-P90",          12,   2,  60,80, 800, 25, 700,  1,  2, WPN_AUTO },
    {12,  "Shotgun",         30,  40, 100, 5,  50, 60, 400,  5, 15, 0 },
    {13,  "Auto Shotgun",    30,  15, 100, 5,  50, 60, 400,  5, 10, WPN_AUTO },
    {14,  "Sniper Rifle",    50,  60, 100, 8,  50,  5,2000,  1,  8, WPN_SCOPE },
    {15,  "Cougar Magnum",   40,  20,  80, 6,  50, 15,1000,  1, 10, 0 },
    {16,  "Golden Gun",     255,  30,  60, 1,  20,  5,2000,  1,  0, WPN_ONE_SHOT },
    {17,  "Moonraker",       32,   5,   0, 0, 800,  5,1500,  1,  0, WPN_AUTO },
    {18,  "Grenade",         80,  60,   0, 1,  12,  0, 500,  1,  0, WPN_THROWN|WPN_EXPLOSIVE },
    {19,  "Rocket Launcher", 80,  90, 120, 1,  10, 10,2000,  1, 20, WPN_EXPLOSIVE },
    {20,  "Grenade Launcher",60,  60, 100, 6,  30, 15, 800,  1, 12, WPN_EXPLOSIVE },
    {21,  "Taser",           10,  40,   0, 0,   0,  0,  80,  1,  0, 0 },
    {22,  "Watch Laser",     20,  10,   0, 0,   0,  5, 200,  1,  0, 0 },
};
```

## Damage Calculation

```c
// Body part multipliers
float damage_mult[] = {
    [PART_HEAD]     = 4.0f,
    [PART_NECK_BACK]= 8.0f,   // slapper only
    [PART_CHEST]    = 1.0f,
    [PART_GUT]      = 0.5f,
    [PART_ARM]      = 0.3f,
    [PART_HAND]     = 0.2f,
    [PART_LEG]      = 0.4f,
    [PART_FOOT]     = 0.2f,
};

u8 calc_damage(Weapon* wpn, BodyPart part, float dist) {
    float base = wpn->damage;

    // Body part mult
    base *= damage_mult[part];

    // Range falloff (optional)
    if (dist > wpn->range) {
        float falloff = 1.0f - (dist - wpn->range) / wpn->range;
        if (falloff < 0.25f) falloff = 0.25f;
        base *= falloff;
    }

    // Shotgun: per-pellet
    // (each pellet does wpn->damage / wpn->pellets)

    return (u8)base;
}
```

## Hit Detection

```c
typedef struct Hitbox {
    Vec3 offset;     // relative to skeleton bone
    float radius;    // sphere radius
    u8 bone_id;
    BodyPart part;
} Hitbox;

// Per-character hitbox setup
Hitbox guard_hitboxes[] = {
    { {0, 0.9f, 0},  0.12f, BONE_HEAD,      PART_HEAD },
    { {0, 0.6f, 0},  0.18f, BONE_SPINE2,    PART_CHEST },
    { {0, 0.35f,0},  0.15f, BONE_SPINE,     PART_GUT },
    { {0.1f,0,0},    0.08f, BONE_UPPER_ARM_L, PART_ARM },
    { {0.1f,0,0},    0.08f, BONE_UPPER_ARM_R, PART_ARM },
    // ... etc
};

HitResult check_hit(Vec3 ray_start, Vec3 ray_dir, Guard* g) {
    HitResult best = { .hit = false, .dist = FLT_MAX };

    for (int i = 0; i < HITBOX_COUNT; i++) {
        Hitbox* hb = &guard_hitboxes[i];

        // Transform hitbox to world space
        Vec3 world_pos = transform_point(
            &g->bone_matrices[hb->bone_id],
            hb->offset
        );

        // Ray-sphere intersection
        float t;
        if (ray_sphere_intersect(ray_start, ray_dir, world_pos, hb->radius, &t)) {
            if (t < best.dist) {
                best.hit = true;
                best.dist = t;
                best.part = hb->part;
                best.pos = vec3_add(ray_start, vec3_scale(ray_dir, t));
            }
        }
    }

    return best;
}
```

## Fire Weapon

```c
void fire_weapon(Entity* shooter, Weapon* wpn) {
    if (wpn->mag_current == 0) {
        start_reload(shooter, wpn);
        return;
    }

    wpn->mag_current--;

    // Spawn pellets (1 for most, 5 for shotgun)
    for (int i = 0; i < wpn->pellets; i++) {
        Vec3 dir = shooter->aim_dir;

        // Apply spread
        if (wpn->accuracy > 0) {
            float spread = wpn->accuracy / 255.0f * 0.1f;
            dir.x += random_range(-spread, spread);
            dir.y += random_range(-spread, spread);
            dir = vec3_normalize(dir);
        }

        // Hitscan
        HitResult hit = raycast_entities(shooter->muzzle_pos, dir, wpn->range);

        if (hit.entity) {
            u8 dmg = calc_damage(wpn, hit.part, hit.dist);
            apply_damage(hit.entity, dmg, hit.part, hit.pos);
        }

        // Tracer effect
        spawn_tracer(shooter->muzzle_pos, hit.pos);
    }

    // Sound
    if (!(wpn->flags & WPN_SILENCED)) {
        emit_sound(shooter->pos, wpn->fire_sound, LOUD_GUNSHOT);
    } else {
        emit_sound(shooter->pos, wpn->fire_sound, QUIET_SILENCED);
    }

    // Recoil
    apply_recoil(shooter, wpn->recoil);

    // Fire rate delay
    shooter->next_fire_frame = frame_count + wpn->fire_rate;
}
```

## Dual Wielding

```c
typedef struct DualWield {
    Weapon* left;
    Weapon* right;
    bool alt_fire;  // alternates each shot
} DualWield;

void fire_dual(Player* p, DualWield* dw) {
    Weapon* wpn = dw->alt_fire ? dw->left : dw->right;
    dw->alt_fire = !dw->alt_fire;

    fire_weapon(&p->entity, wpn);

    // Stagger timing slightly
    p->entity.next_fire_frame += wpn->fire_rate / 2;
}
```

## Reload System

```c
void start_reload(Entity* e, Weapon* wpn) {
    if (e->ammo[wpn->ammo_type] == 0) return;
    if (e->reload_timer > 0) return;

    e->reload_timer = wpn->reload_frames;
    play_anim(e, wpn->reload_anim);
}

void update_reload(Entity* e, Weapon* wpn) {
    if (e->reload_timer > 0) {
        e->reload_timer--;

        if (e->reload_timer == 0) {
            u8 need = wpn->mag_size - wpn->mag_current;
            u8 have = e->ammo[wpn->ammo_type];
            u8 load = (need < have) ? need : have;

            wpn->mag_current += load;
            e->ammo[wpn->ammo_type] -= load;
        }
    }
}
```
