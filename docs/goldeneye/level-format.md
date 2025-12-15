# GoldenEye 007 - Level & Setup Format

## Level Data Structure

```
Level Data
├── Background (BG)     # Static geometry
├── Setup               # Dynamic objects, guards, scripts
├── STAN                # Navigation polygons
├── PAD                 # Navigation points
├── Props               # Breakable/interactive objects
└── Portals             # Room connectivity
```

## Background (BG) Format

```c
typedef struct BGHeader {
    u32 magic;
    u16 room_count;
    u16 vertex_count;
    u32 room_table_offset;
    u32 vertex_offset;
    u32 display_list_offset;
    u32 texture_table_offset;
} BGHeader;

typedef struct BGRoom {
    u8 id;
    Vec3 min, max;           // bounding box
    u32 display_list_offset;
    u32 display_list_size;
    u8 portal_count;
    u8 portals[8];           // connected room IDs
    u8 flags;
} BGRoom;

#define ROOM_OUTDOOR   0x01
#define ROOM_FOGGED    0x02
#define ROOM_WATER     0x04
```

## Setup File Format

```c
typedef struct SetupHeader {
    u32 magic;              // 'SETP'
    u16 version;
    u16 flags;

    // Section counts
    u16 path_count;
    u16 ai_list_count;
    u16 pad_count;
    u16 pad3d_count;
    u16 object_count;
    u16 intro_count;
    u16 block_count;        // action blocks

    // Offsets
    u32 path_offset;
    u32 ai_list_offset;
    u32 pad_offset;
    u32 pad3d_offset;
    u32 object_offset;
    u32 intro_offset;
    u32 block_offset;
} SetupHeader;
```

## Object Types

```c
typedef enum ObjectType {
    OBJ_GUARD           = 0x01,
    OBJ_DOOR            = 0x03,
    OBJ_DOOR_SCALE      = 0x04,
    OBJ_STANDARD_PROP   = 0x05,
    OBJ_KEY             = 0x06,
    OBJ_ALARM           = 0x07,
    OBJ_CCTV            = 0x08,
    OBJ_AMMO_BOX        = 0x09,
    OBJ_WEAPON          = 0x0A,
    OBJ_CHR             = 0x0B,  // character (non-guard)
    OBJ_SINGLE_MONITOR  = 0x0C,
    OBJ_MULTI_MONITOR   = 0x0D,
    OBJ_HANGING_MONITOR = 0x0E,
    OBJ_DRONE_GUN       = 0x0F,
    OBJ_GLASS           = 0x14,
    OBJ_TANK            = 0x17,
    OBJ_TIMED_MINE      = 0x19,
    OBJ_OBJECTIVE       = 0x1A,
    OBJ_END_PROP        = 0x1B,
    OBJ_COLLECTABLE     = 0x1D,
    OBJ_SAFE            = 0x1E,
    OBJ_SAFE_ITEM       = 0x1F,
    OBJ_LOCK            = 0x23,
    OBJ_VEHICLE         = 0x24,
    OBJ_AIRCRAFT        = 0x25,
    OBJ_RENAME          = 0x27,  // rename objective text
    OBJ_BRIEFING        = 0x28,
    OBJ_GASLEAK         = 0x29,
    OBJ_END_INTRO       = 0x2A,
    OBJ_START_INTRO     = 0x2B,
    OBJ_END_OUTRO       = 0x2C,
} ObjectType;
```

## Guard Entry

```c
typedef struct GuardEntry {
    ObjectType type;       // OBJ_GUARD
    Vec3 pos;
    Vec3 rot;

    u8 body_id;            // body model
    u8 head_id;            // head model
    u16 action_block_id;   // AI behavior
    u16 pad_id;            // starting pad

    u8 health;
    u8 reaction_speed;
    u8 accuracy;
    u8 team;

    u16 weapon_id;
    u16 weapon_id_2;       // for dual wield

    u8 flags;
    u8 spawn_flags;        // difficulty-based spawn
    u16 clone_id;          // for respawn
} GuardEntry;

#define SPAWN_AGENT      0x01
#define SPAWN_SECRET     0x02
#define SPAWN_00AGENT    0x04
#define SPAWN_ALL        0x07
```

## Door Entry

```c
typedef struct DoorEntry {
    ObjectType type;       // OBJ_DOOR
    Vec3 pos;
    Vec3 rot;

    u8 model_id;
    u8 state;              // open/closed
    u8 open_speed;
    u8 close_timer;        // auto-close delay

    u16 linked_door;       // double doors
    u8 lock_type;
    u16 key_id;            // required key item

    u8 flags;
    u16 portal_id;         // affects room visibility
} DoorEntry;

#define DOOR_LOCKED      0x01
#define DOOR_STAY_OPEN   0x02
#define DOOR_DESTRUCTIBLE 0x04
#define DOOR_METAL       0x08
```

## PAD (Navigation Point)

```c
typedef struct PadEntry {
    u16 id;
    Vec3 pos;
    Vec3 up;              // floor normal
    Vec3 look;            // facing direction

    u8 room_id;
    u8 flags;

    u8 neighbor_count;
    u16 neighbors[8];     // linked pads

    u8 cover_dir;         // for AI cover
    u8 visibility;        // for line-of-sight
} PadEntry;

#define PAD_WAYPOINT   0x01
#define PAD_COVER      0x02
#define PAD_SNIPER     0x04
#define PAD_ALARM      0x08
```

## Action Block Entry

```c
typedef struct ActionBlockEntry {
    u16 id;
    u16 length;
    u8 bytecode[256];     // variable length
} ActionBlockEntry;

// Common blocks
// 0x0000 - Do nothing
// 0x0001 - Stand still
// 0x0002 - Standard guard patrol
// 0x0003 - Run to alarm
// 0x0004 - Scientist behavior
// 0x0005 - Hostage
```

## Path Entry

```c
typedef struct PathEntry {
    u16 id;
    u8 pad_count;
    u8 flags;
    u16 pads[32];         // variable length
} PathEntry;

#define PATH_LOOP       0x01  // loop back to start
#define PATH_PINGPONG   0x02  // reverse at end
#define PATH_ONESHOT    0x04  // stop at end
```

## Objective Entry

```c
typedef struct ObjectiveEntry {
    u8 id;
    u8 type;
    u8 difficulty_mask;   // which difficulties
    u16 text_id;          // objective description
    u16 target_id;        // object to interact with
    u8 flags;
} ObjectiveEntry;

typedef enum ObjectiveType {
    OBJ_TYPE_DESTROY,      // destroy target
    OBJ_TYPE_COLLECT,      // pick up item
    OBJ_TYPE_PHOTOGRAPH,   // use camera
    OBJ_TYPE_PROTECT,      // keep NPC alive
    OBJ_TYPE_MEET,         // reach location
    OBJ_TYPE_THROW,        // throw item at target
    OBJ_TYPE_ENTER,        // enter vehicle
    OBJ_TYPE_ESCAPE,       // reach exit
} ObjectiveType;
```

## Modern JSON Equivalent

```json
{
  "level": {
    "id": "facility",
    "name": "Facility",
    "bg_file": "facility_bg.bin",
    "music": "facility_ambient",
    "music_action": "facility_action"
  },

  "rooms": [
    {
      "id": 0,
      "bounds": {"min": [0,0,0], "max": [100,50,100]},
      "portals": [1, 2],
      "flags": ["indoor"]
    }
  ],

  "guards": [
    {
      "pos": [50, 0, 30],
      "rot": [0, 180, 0],
      "body": "guard_russian",
      "head": "random",
      "action_block": 2,
      "pad": 15,
      "health": 100,
      "weapon": "kf7",
      "spawn": ["agent", "secret", "00agent"]
    }
  ],

  "doors": [
    {
      "pos": [25, 0, 50],
      "model": "door_metal",
      "locked": true,
      "key": "keycard_a",
      "portal": 1
    }
  ],

  "pads": [
    {
      "id": 0,
      "pos": [10, 0, 10],
      "room": 0,
      "neighbors": [1, 5, 12],
      "flags": ["waypoint"]
    }
  ],

  "objectives": [
    {
      "id": "a",
      "type": "collect",
      "text": "Obtain keycard",
      "target": "keycard_a",
      "difficulty": ["agent", "secret", "00agent"]
    },
    {
      "id": "b",
      "type": "destroy",
      "text": "Destroy mainframe",
      "target": "mainframe_001",
      "difficulty": ["secret", "00agent"]
    }
  ]
}
```

## Level Loading

```c
void load_level(const char* name) {
    // Load BG (static geometry)
    BGHeader* bg = load_bg(name);
    build_room_display_lists(bg);
    build_collision_mesh(bg);

    // Load setup (dynamic)
    SetupHeader* setup = load_setup(name);

    // Spawn guards
    for (int i = 0; i < setup->guard_count; i++) {
        GuardEntry* ge = &setup->guards[i];
        if (!(ge->spawn_flags & difficulty_mask)) continue;
        spawn_guard(ge);
    }

    // Initialize doors
    for (int i = 0; i < setup->door_count; i++) {
        spawn_door(&setup->doors[i]);
    }

    // Build nav graph
    for (int i = 0; i < setup->pad_count; i++) {
        register_pad(&setup->pads[i]);
    }

    // Setup objectives
    for (int i = 0; i < setup->objective_count; i++) {
        if (setup->objectives[i].difficulty_mask & difficulty_mask) {
            add_objective(&setup->objectives[i]);
        }
    }
}
```
