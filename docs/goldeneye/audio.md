# GoldenEye 007 - Audio System

## N64 Audio Architecture

```
CPU -> Audio Commands -> RSP (audio ucode) -> AI (Audio Interface) -> DAC
                           |
                        4KB DMEM
```

- Sample rate: 22050 Hz (typical)
- Channels: Stereo
- RSP processes audio in parallel with CPU

## Sound Structure

```c
typedef struct Sound {
    u16 id;
    u8* sample_data;
    u32 sample_len;
    u16 sample_rate;
    u8 loop;
    u8 priority;
} Sound;

typedef struct SoundInstance {
    Sound* sound;
    Vec3 pos;           // 3D position
    u32 sample_offset;
    float volume;
    float pan;          // -1 left, +1 right
    u8 flags;
    u8 loudness;        // for AI hearing
} SoundInstance;

#define SND_3D        0x01
#define SND_LOOP      0x02
#define SND_MUSIC     0x04
```

## 3D Audio

```c
#define MAX_SOUND_DIST  3000.0f
#define FALLOFF_START   500.0f

void update_sound_3d(SoundInstance* snd, Vec3 listener_pos, Vec3 listener_fwd) {
    if (!(snd->flags & SND_3D)) return;

    Vec3 to_sound = vec3_sub(snd->pos, listener_pos);
    float dist = vec3_len(to_sound);

    // Volume falloff
    if (dist < FALLOFF_START) {
        snd->volume = 1.0f;
    } else if (dist < MAX_SOUND_DIST) {
        snd->volume = 1.0f - (dist - FALLOFF_START) / (MAX_SOUND_DIST - FALLOFF_START);
    } else {
        snd->volume = 0.0f;
    }

    // Stereo pan
    if (dist > 0.1f) {
        Vec3 dir = vec3_scale(to_sound, 1.0f / dist);
        Vec3 right = vec3_cross(listener_fwd, (Vec3){0,1,0});
        snd->pan = vec3_dot(dir, right);  // -1 to +1
    }
}
```

## Sound Event System

```c
typedef enum SoundEvent {
    SND_GUNSHOT_LOUD,
    SND_GUNSHOT_SILENCED,
    SND_FOOTSTEP,
    SND_DOOR_OPEN,
    SND_GLASS_BREAK,
    SND_EXPLOSION,
    SND_GUARD_ALERT,
    SND_GUARD_DEATH,
    SND_RELOAD,
    SND_EMPTY_CLIP,
    // ...
} SoundEvent;

// Loudness for AI hearing
u8 sound_loudness[] = {
    [SND_GUNSHOT_LOUD]     = 255,
    [SND_GUNSHOT_SILENCED] = 30,
    [SND_FOOTSTEP]         = 50,
    [SND_DOOR_OPEN]        = 80,
    [SND_GLASS_BREAK]      = 150,
    [SND_EXPLOSION]        = 255,
    // ...
};

void emit_sound(Vec3 pos, SoundEvent event, u8 loudness_override) {
    Sound* snd = &sounds[event];

    // Play audio
    SoundInstance* inst = alloc_sound_instance();
    inst->sound = snd;
    inst->pos = pos;
    inst->loudness = loudness_override ? loudness_override : sound_loudness[event];

    // Register for AI hearing system
    if (inst->loudness > 0) {
        register_noise(pos, inst->loudness);
    }
}
```

## AI Hearing Integration

```c
#define MAX_RECENT_SOUNDS 16

typedef struct NoiseEvent {
    Vec3 pos;
    u8 loudness;
    u16 frame;
} NoiseEvent;

NoiseEvent recent_noises[MAX_RECENT_SOUNDS];
u8 noise_count;

void register_noise(Vec3 pos, u8 loudness) {
    if (noise_count < MAX_RECENT_SOUNDS) {
        recent_noises[noise_count++] = (NoiseEvent){
            .pos = pos,
            .loudness = loudness,
            .frame = frame_count
        };
    }
}

void cleanup_old_noises() {
    // Remove noises older than ~2 seconds
    u8 write = 0;
    for (u8 i = 0; i < noise_count; i++) {
        if (frame_count - recent_noises[i].frame < 60) {
            recent_noises[write++] = recent_noises[i];
        }
    }
    noise_count = write;
}
```

## Music System

```c
typedef struct MusicTrack {
    u8 id;
    u8* sequence_data;  // MIDI-like
    u8 tempo;
    u8 loop_point;
} MusicTrack;

typedef enum MusicState {
    MUSIC_AMBIENT,
    MUSIC_ACTION,
    MUSIC_STEALTH,
    MUSIC_MISSION_COMPLETE,
    MUSIC_GAME_OVER
} MusicState;

MusicState current_music_state;
float music_intensity;  // 0-1, for crossfade

void update_music() {
    // Track combat/stealth state
    bool in_combat = any_guard_alert();
    bool player_detected = player_is_detected();

    if (in_combat) {
        target_state = MUSIC_ACTION;
        music_intensity = 1.0f;
    } else if (player_detected) {
        target_state = MUSIC_STEALTH;
        music_intensity = 0.7f;
    } else {
        target_state = MUSIC_AMBIENT;
        music_intensity = lerp(music_intensity, 0.3f, 0.01f);
    }

    if (target_state != current_music_state) {
        crossfade_to(target_state, 60);  // 60 frame crossfade
    }
}
```

## Modern Implementation

```c
// Using miniaudio

#include "miniaudio.h"

ma_engine engine;
ma_sound_group sfx_group;
ma_sound_group music_group;

void init_audio() {
    ma_engine_init(NULL, &engine);
    ma_sound_group_init(&engine, 0, NULL, &sfx_group);
    ma_sound_group_init(&engine, 0, NULL, &music_group);
}

void play_sound_3d(const char* path, Vec3 pos, float loudness) {
    ma_sound* sound = alloc_sound();
    ma_sound_init_from_file(&engine, path, 0, &sfx_group, NULL, sound);

    ma_sound_set_position(sound, pos.x, pos.y, pos.z);
    ma_sound_set_min_distance(sound, 1.0f);
    ma_sound_set_max_distance(sound, MAX_SOUND_DIST);
    ma_sound_set_rolloff(sound, 1.0f);

    ma_sound_start(sound);

    // AI hearing
    register_noise(pos, loudness * 255);
}

void set_listener(Vec3 pos, Vec3 fwd, Vec3 up) {
    ma_engine_listener_set_position(&engine, 0, pos.x, pos.y, pos.z);
    ma_engine_listener_set_direction(&engine, 0, fwd.x, fwd.y, fwd.z);
    ma_engine_listener_set_world_up(&engine, 0, up.x, up.y, up.z);
}
```
