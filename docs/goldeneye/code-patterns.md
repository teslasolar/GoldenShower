# GoldenEye 007 - Code Patterns & Reconstruction

## Source Structure (from decompilation)

```
src/
├── game/           # Core game code (0x7f000000 range)
├── inflate/        # Decompression routines
├── libultra/       # Nintendo SDK
└── libultrarare/   # Rare's modified SDK

assets/obseg/
├── bg/      # Level backgrounds
├── chr/     # Character models
├── gun/     # Weapon models
├── prop/    # Props
├── setup/   # Level setup/scripts
├── stan/    # Navigation data
└── text/    # Strings

rsp/         # RSP microcode (assembly)
```

## Language: C (95.5%)
- Compiled with IDO 5.3 (SGI compiler)
- Fixed-point math (no FPU reliance)
- Manual memory management
- Inline assembly for critical paths

---

## Core Systems

### 1. Display List (GBI)

N64 rendering via command lists sent to RSP:

```c
// Modern equivalent: Command buffer pattern
typedef struct {
    u64 commands[MAX_CMDS];
    u32 count;
} DisplayList;

// GBI macros expand to 64-bit constants
// gSPVertex, gSP2Triangles, gDPSetTileSize, etc.
```

**Modern**: Vulkan/Metal command buffers, or retained-mode scene graph

### 2. STAN System (Navigation)

Pre-navmesh solution:

```c
typedef struct Stan {
    Vec3 vertices[MAX_VERTS];
    u16 flags;           // walkable, stairs, etc.
    u8 room_id;
} Stan;

typedef struct Pad {
    Vec3 position;
    u16 linked_pads[8];  // navigation graph edges
    u8 stan_id;
} Pad;
```

**Modern**: Unity NavMesh, Recast/Detour, or A* on polygon soup

### 3. Room-Based Culling

```c
typedef struct Room {
    u8 id;
    BoundingBox bbox;
    u8 visible_rooms[16];  // PVS - potentially visible set
    Stan* stans;
    u16 stan_count;
} Room;

void render_frame(Camera* cam) {
    for (room in rooms) {
        if (frustum_cull(cam, room->bbox)) continue;
        if (!in_pvs(current_room, room->id)) continue;
        render_room(room);
    }
}
```

**Modern**: Occlusion culling, BSP, portals, or GPU occlusion queries

---

## AI System

### Action Block VM

Bytecode interpreter for behaviors:

```c
#define MAX_ACTIONS 256

typedef struct ActionBlock {
    u8 opcodes[64];
    u8 pc;              // program counter
    u8 loop_labels[8];
    void* owner;        // guard or object
} ActionBlock;

// Example opcodes
enum ActionOp {
    OP_IF_ALERT = 0x01,
    OP_GOTO_LOOP = 0x02,
    OP_FIRE_AT_PLAYER = 0x03,
    OP_PATROL_TO_PAD = 0x04,
    OP_PLAY_ANIM = 0x05,
    OP_WAIT_FRAMES = 0x06,
    OP_IF_SHOT = 0x07,
    OP_SURRENDER = 0x08,
    // ... 256 total
};

void tick_action_block(ActionBlock* ab) {
    while (ab->pc < ab->length) {
        u8 op = ab->opcodes[ab->pc++];
        if (!execute_op(ab, op)) break; // yield
    }
}
```

**Modern**: Behavior trees, GOAP, or Lua/visual scripting

### Guard FSM

```c
typedef enum GuardState {
    STATE_IDLE,
    STATE_PATROL,
    STATE_ALERT,
    STATE_ATTACK,
    STATE_FLEE,
    STATE_SURRENDER,
    STATE_DEAD
} GuardState;

typedef struct Guard {
    GuardState state;
    Vec3 pos;
    u8 health;
    u8 alert_level;
    u16 current_pad;
    u16 target_pad;
    ActionBlock* behavior;
    u8 flags;
} Guard;

// Sensory flags
#define SENSE_SEE_PLAYER   0x01
#define SENSE_HEAR_GUNSHOT 0x02
#define SENSE_TOOK_DAMAGE  0x04
#define SENSE_SEE_CORPSE   0x08
```

### Perception System

```c
bool can_see_player(Guard* g, Player* p) {
    // Distance check
    if (dist_sq(g->pos, p->pos) > VIEW_DIST_SQ) return false;

    // FOV check
    Vec3 to_player = normalize(sub(p->pos, g->pos));
    if (dot(g->forward, to_player) < COS_FOV) return false;

    // Raycast occlusion
    return !raycast_blocked(g->pos, p->pos);
}

bool can_hear(Guard* g, Vec3 sound_pos, u8 loudness) {
    float dist = dist_sq(g->pos, sound_pos);
    return dist < (loudness * SOUND_RANGE_MULT);
}
```

---

## Damage System

### Hitbox Zones

```c
typedef enum BodyPart {
    PART_HEAD,
    PART_CHEST,
    PART_GUT,
    PART_UPPER_ARM_L,
    PART_UPPER_ARM_R,
    PART_LOWER_ARM_L,
    PART_LOWER_ARM_R,
    PART_HAND_L,
    PART_HAND_R,
    PART_THIGH_L,
    PART_THIGH_R,
    PART_LOWER_LEG_L,
    PART_LOWER_LEG_R,
    PART_FOOT_L,
    PART_FOOT_R,
    PART_HAT,
    PART_GUN
} BodyPart;

// Damage multipliers
float DAMAGE_MULT[] = {
    [PART_HEAD] = 4.0f,
    [PART_CHEST] = 1.0f,
    [PART_GUT] = 0.5f,
    [PART_UPPER_ARM_L] = 0.3f,
    // ...
};
```

### Weapon Data

```c
typedef struct Weapon {
    u8 id;
    u8 damage;
    u8 fire_rate;      // frames between shots
    u8 reload_time;
    u8 mag_size;
    u8 accuracy;       // spread
    u8 range;
    u8 pellets;        // shotgun = 5
    u16 flags;
} Weapon;

#define WPN_AUTO      0x0001
#define WPN_SILENCED  0x0002
#define WPN_SCOPE     0x0004
#define WPN_DUAL      0x0008
```

---

## Memory Patterns

### Object Pools

```c
#define MAX_GUARDS 32
#define MAX_PROPS 128

Guard guard_pool[MAX_GUARDS];
u32 guard_active_mask;

Guard* alloc_guard() {
    u32 slot = ctz(~guard_active_mask); // count trailing zeros
    if (slot >= MAX_GUARDS) return NULL;
    guard_active_mask |= (1 << slot);
    return &guard_pool[slot];
}

void free_guard(Guard* g) {
    u32 slot = g - guard_pool;
    guard_active_mask &= ~(1 << slot);
}
```

### Fixed-Point Math

```c
typedef s32 fixed16;  // 16.16 format

#define FP_SHIFT 16
#define FP_ONE   (1 << FP_SHIFT)

fixed16 fp_mul(fixed16 a, fixed16 b) {
    return (fixed16)(((s64)a * b) >> FP_SHIFT);
}

fixed16 fp_div(fixed16 a, fixed16 b) {
    return (fixed16)(((s64)a << FP_SHIFT) / b);
}

// Avoid sqrt - use squared distances
s32 dist_sq(Vec3 a, Vec3 b) {
    s32 dx = a.x - b.x;
    s32 dy = a.y - b.y;
    s32 dz = a.z - b.z;
    return dx*dx + dy*dy + dz*dz;
}
```

---

## Setup File Format

Level configuration:

```c
typedef struct SetupHeader {
    u32 magic;
    u16 guard_count;
    u16 prop_count;
    u16 pad_count;
    u16 action_block_count;
    u32 offsets[8];
} SetupHeader;

// Spawns
typedef struct GuardSpawn {
    Vec3 pos;
    u16 angle;
    u8 chr_id;           // character model
    u8 action_block_id;
    u8 health;
    u8 flags;
} GuardSpawn;
```

---

## Modern Reconstruction Stack

| Original | Modern Equivalent |
|----------|------------------|
| C + IDO | C/C++/Rust |
| libultra GBI | OpenGL/Vulkan/WebGPU |
| RSP microcode | Compute shaders |
| STAN/PAD | Recast/Detour NavMesh |
| Action Blocks | Behavior Trees / Lua |
| Fixed-point | Float (or SIMD int) |
| Object pools | ECS (EnTT, Flecs) |
| Room culling | Occlusion queries / GPU culling |
| Setup files | JSON/YAML + binary |

## Key Libraries for Remake

```
Rendering:    SDL2/GLFW + bgfx/sokol/wgpu
Physics:      Bullet/Jolt (simple) or custom
AI Nav:       Recast/Detour
AI Logic:     BehaviorTree.CPP or custom FSM
Audio:        miniaudio/FMOD
Math:         glm/cglm/HandmadeMath
Serialization: flatbuffers/msgpack
```
