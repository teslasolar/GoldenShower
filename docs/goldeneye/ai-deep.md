# GoldenEye 007 - AI Deep Dive

## Action Block System

Bytecode VM for guard/object behaviors:

```c
// 256 precompiled actions (opcodes)
// Procedural execution top-to-bottom
// Loop control via hex labels

typedef struct ActionBlock {
    u8 id;
    u8 bytecode[128];
    u8 length;
} ActionBlock;

typedef struct ActionState {
    ActionBlock* block;
    u8 pc;                    // program counter
    u8 wait_timer;            // frames to wait
    u8 loop_stack[4];         // nested loop return points
    u8 loop_sp;
    void* owner;              // Guard* or Prop*
} ActionState;
```

### Core Opcodes

```c
enum ActionOpcode {
    // Flow control
    OP_END              = 0x00,
    OP_LABEL            = 0x01,  // param: label_id
    OP_GOTO             = 0x02,  // param: label_id
    OP_WAIT_FRAMES      = 0x03,  // param: frame_count
    OP_WAIT_RANDOM      = 0x04,  // param: min, max

    // Conditions
    OP_IF_ALERT         = 0x10,  // goto label if alerted
    OP_IF_SHOT          = 0x11,
    OP_IF_SEE_PLAYER    = 0x12,
    OP_IF_HEAR_NOISE    = 0x13,
    OP_IF_HEALTH_LOW    = 0x14,
    OP_IF_PLAYER_AIMING = 0x15,
    OP_IF_PLAYER_DIST   = 0x16,  // param: distance, label

    // Actions
    OP_PATROL_TO_PAD    = 0x20,  // param: pad_id
    OP_RUN_TO_PAD       = 0x21,
    OP_FACE_PLAYER      = 0x22,
    OP_FIRE_AT_PLAYER   = 0x23,
    OP_FIRE_STANDING    = 0x24,
    OP_FIRE_KNEELING    = 0x25,
    OP_FIRE_ROLLING     = 0x26,
    OP_THROW_GRENADE    = 0x27,
    OP_MELEE_ATTACK     = 0x28,
    OP_SURRENDER        = 0x29,
    OP_PLAY_ANIM        = 0x2A,  // param: anim_id
    OP_SAY_LINE         = 0x2B,  // param: audio_id

    // Special
    OP_OPEN_DOOR        = 0x30,
    OP_ACTIVATE_ALARM   = 0x31,
    OP_CALL_BACKUP      = 0x32,
    OP_DROP_WEAPON      = 0x33,
    OP_PICK_UP_WEAPON   = 0x34,
    OP_SET_FLAG         = 0x35,
    OP_CHECK_FLAG       = 0x36,
};
```

### Example: Standard Guard (Block 0x0002)

```c
// Pseudo-assembly
LABEL 0x00              // main loop
  IF_SHOT GOTO 0x10     // react to damage
  IF_SEE_PLAYER GOTO 0x20
  IF_HEAR_NOISE GOTO 0x30
  PATROL_TO_PAD next    // continue patrol
  WAIT_FRAMES 30
  GOTO 0x00

LABEL 0x10              // shot reaction
  PLAY_ANIM hit_react
  FACE_PLAYER
  IF_HEALTH_LOW GOTO 0x40
  FIRE_AT_PLAYER
  GOTO 0x00

LABEL 0x20              // see player
  FACE_PLAYER
  IF_PLAYER_DIST 200 0x21
  FIRE_STANDING
  GOTO 0x00
LABEL 0x21              // close range
  FIRE_ROLLING
  GOTO 0x00

LABEL 0x30              // heard noise
  RUN_TO_PAD noise_source
  WAIT_FRAMES 60
  GOTO 0x00

LABEL 0x40              // low health
  IF_PLAYER_AIMING GOTO 0x41
  CALL_BACKUP
  GOTO 0x00
LABEL 0x41              // surrender
  SURRENDER
  END
```

### VM Execution

```c
bool execute_action(ActionState* state) {
    u8 op = state->block->bytecode[state->pc++];

    switch (op) {
    case OP_END:
        return false;  // block complete

    case OP_LABEL:
        state->pc++;   // skip label id
        return true;

    case OP_GOTO: {
        u8 target = state->block->bytecode[state->pc++];
        state->pc = find_label(state->block, target);
        return true;
    }

    case OP_WAIT_FRAMES:
        state->wait_timer = state->block->bytecode[state->pc++];
        return false;  // yield

    case OP_IF_SEE_PLAYER: {
        u8 label = state->block->bytecode[state->pc++];
        Guard* g = (Guard*)state->owner;
        if (can_see_player(g)) {
            state->pc = find_label(state->block, label);
        }
        return true;
    }

    case OP_FIRE_AT_PLAYER: {
        Guard* g = (Guard*)state->owner;
        fire_weapon(g, &player.pos);
        return true;
    }
    // ... etc
    }
}

void tick_guard_ai(Guard* g) {
    if (g->action.wait_timer > 0) {
        g->action.wait_timer--;
        return;
    }

    // Execute until yield or end
    while (execute_action(&g->action)) {
        if (g->action.pc >= g->action.block->length) break;
    }
}
```

## Perception System

```c
typedef struct Perception {
    u8 flags;
    u8 alert_level;      // 0-255, decays over time
    Vec3 last_known_pos; // player's last seen position
    u16 last_seen_frame;
    u8 heard_shots;      // recent gunshot count
} Perception;

#define PERC_CAN_SEE      0x01
#define PERC_CAN_HEAR     0x02
#define PERC_TOOK_DAMAGE  0x04
#define PERC_SAW_CORPSE   0x08
#define PERC_SAW_ALLY_HIT 0x10

void update_perception(Guard* g) {
    g->perception.flags = 0;

    // Vision
    if (can_see_player(g, &player)) {
        g->perception.flags |= PERC_CAN_SEE;
        g->perception.last_known_pos = player.pos;
        g->perception.last_seen_frame = frame_count;
        g->perception.alert_level = 255;
    }

    // Hearing
    for (int i = 0; i < recent_sound_count; i++) {
        Sound* s = &recent_sounds[i];
        float dist = dist_sq(g->pos, s->pos);
        float range = s->loudness * SOUND_MULT;
        if (dist < range * range) {
            g->perception.flags |= PERC_CAN_HEAR;
            g->perception.heard_shots++;
            if (g->perception.alert_level < 128)
                g->perception.alert_level = 128;
        }
    }

    // Decay alert
    if (!(g->perception.flags & PERC_CAN_SEE)) {
        if (g->perception.alert_level > 0)
            g->perception.alert_level--;
    }
}
```

## Vision Check

```c
#define VIEW_DIST     2000
#define VIEW_DIST_SQ  (VIEW_DIST * VIEW_DIST)
#define FOV_COS       0.7f  // ~45 degrees half-angle

bool can_see_player(Guard* g, Player* p) {
    // 1. Distance
    Vec3 delta = vec3_sub(p->pos, g->pos);
    float dist_sq = vec3_len_sq(delta);
    if (dist_sq > VIEW_DIST_SQ) return false;

    // 2. FOV cone
    Vec3 dir = vec3_normalize(delta);
    float dot = vec3_dot(g->forward, dir);
    if (dot < FOV_COS) return false;

    // 3. Occlusion (raycast through rooms)
    return !raycast_hits_geometry(g->eye_pos, p->pos);
}
```

## Pathfinding (PAD Navigation)

```c
typedef struct Pad {
    u16 id;
    Vec3 pos;
    u16 neighbors[8];
    u8 neighbor_count;
    u8 room_id;
    u8 flags;
} Pad;

#define PAD_BLOCKED  0x01
#define PAD_DOOR     0x02
#define PAD_COVER    0x04

// Simple BFS pathfinding (no A* - too expensive)
bool find_path(u16 start_pad, u16 end_pad, u16* path, u8* path_len) {
    u16 queue[64];
    u16 came_from[MAX_PADS];
    bool visited[MAX_PADS] = {0};

    u8 head = 0, tail = 0;
    queue[tail++] = start_pad;
    visited[start_pad] = true;
    came_from[start_pad] = 0xFFFF;

    while (head < tail) {
        u16 current = queue[head++];

        if (current == end_pad) {
            // Reconstruct path
            *path_len = 0;
            u16 p = end_pad;
            while (p != 0xFFFF) {
                path[(*path_len)++] = p;
                p = came_from[p];
            }
            reverse_path(path, *path_len);
            return true;
        }

        Pad* pad = &pads[current];
        for (u8 i = 0; i < pad->neighbor_count; i++) {
            u16 next = pad->neighbors[i];
            if (!visited[next] && !(pads[next].flags & PAD_BLOCKED)) {
                visited[next] = true;
                came_from[next] = current;
                queue[tail++] = next;
            }
        }
    }
    return false;
}
```

## Modern Equivalent

```c
// Using Behavior Tree (BehaviorTree.CPP style)

BT::Tree guard_tree = BT::buildTree({
    Selector({
        // High priority: react to damage
        Sequence({
            Condition("TookDamage"),
            Action("PlayHitReaction"),
            Action("FacePlayer"),
            Selector({
                Sequence({
                    Condition("HealthLow"),
                    Condition("PlayerAiming"),
                    Action("Surrender")
                }),
                Action("ReturnFire")
            })
        }),

        // See player
        Sequence({
            Condition("CanSeePlayer"),
            Action("FacePlayer"),
            Selector({
                Sequence({
                    Condition("PlayerClose"),
                    Action("FireRolling")
                }),
                Action("FireStanding")
            })
        }),

        // Hear noise
        Sequence({
            Condition("HeardNoise"),
            Action("InvestigateNoise")
        }),

        // Default: patrol
        Action("Patrol")
    })
});
```
