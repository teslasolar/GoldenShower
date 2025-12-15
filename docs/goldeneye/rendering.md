# GoldenEye 007 - Rendering System

## N64 Graphics Pipeline

```
CPU -> Display List (GBI) -> RSP -> RDP -> Framebuffer
         (commands)        (geometry)  (rasterize)
```

## Display List Pattern

```c
// N64: Array of 64-bit GBI commands
Gfx display_list[4096];
Gfx* dl_ptr = display_list;

// Macro-based command emission
gSPMatrix(dl_ptr++, &model_matrix, G_MTX_MODELVIEW);
gSPVertex(dl_ptr++, vertices, 32, 0);
gSP2Triangles(dl_ptr++, 0,1,2, 0, 3,4,5, 0);
gDPSetPrimColor(dl_ptr++, 0, 0, 255, 255, 255, 255);
gSPEndDisplayList(dl_ptr++);

// Execute
osSpTaskLoad(&gfx_task);
osSpTaskStartGo(&gfx_task);
```

**Modern equivalent:**
```c
// Vulkan-style command buffer
vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, pipeline);
vkCmdBindVertexBuffers(cmd, 0, 1, &vbo, offsets);
vkCmdDrawIndexed(cmd, index_count, 1, 0, 0, 0);
```

## Texture Optimization

### Grayscale Trick
```c
// RGB texture: 16-bit per pixel (5551)
// Grayscale:   8-bit per pixel (I8)
// Result: 2x resolution in same memory

typedef struct Texture {
    u8* data;
    u16 width, height;
    u8 format;  // G_IM_FMT_RGBA, G_IM_FMT_I, G_IM_FMT_IA
    u8 depth;   // 4, 8, 16, 32 bit
} Texture;

// Apply color via vertex
void set_vertex_color(Vtx* v, u8 r, u8 g, u8 b) {
    v->cn[0] = r;
    v->cn[1] = g;
    v->cn[2] = b;
    v->cn[3] = 255;
}
```

### 4KB TMEM Constraint
```c
#define TMEM_SIZE 4096

// Tile textures to fit TMEM
// Max ~64x64 @ 16bpp or 64x32 @ 32bpp

void load_texture_tile(Texture* t, u16 tile_x, u16 tile_y) {
    u32 offset = (tile_y * 64 * t->width + tile_x * 64) * t->bpp;
    gDPLoadBlock(dl++, G_TX_LOADTILE, 0, 0, 64*64-1, 0);
}
```

## Room-Based Rendering

```c
typedef struct RoomGfx {
    u8 room_id;
    Gfx* display_list;
    u32 dl_size;
    Vtx* vertices;
    u16 vertex_count;
    Texture* textures[8];
} RoomGfx;

void render_visible_rooms(Camera* cam) {
    u8 current = get_player_room();

    for (u8 i = 0; i < room_count; i++) {
        // PVS check
        if (!pvs_visible(current, i)) continue;

        // Frustum cull
        if (!frustum_test(cam, &rooms[i].bounds)) continue;

        // Distance sort for transparency
        rooms[i].sort_key = dist_sq(cam->pos, rooms[i].center);
    }

    // Sort back-to-front for alpha
    qsort(visible_rooms, count, sizeof(Room*), cmp_dist);

    // Render
    for (int i = 0; i < visible_count; i++) {
        gSPDisplayList(dl++, visible_rooms[i]->display_list);
    }
}
```

## Character Rendering

```c
typedef struct CharModel {
    u8 id;
    Vtx* base_verts;
    u16 vert_count;
    AnimData* anims;
    u8 anim_count;
    Texture* skin;
    Texture* clothes;
} CharModel;

typedef struct CharInstance {
    CharModel* model;
    Mat4 transform;
    u8 current_anim;
    u8 anim_frame;
    Vtx* deformed_verts;  // CPU skinning result
} CharInstance;

// CPU vertex skinning (no GPU skinning on N64)
void skin_character(CharInstance* c) {
    AnimFrame* frame = &c->model->anims[c->current_anim].frames[c->anim_frame];

    for (u16 i = 0; i < c->model->vert_count; i++) {
        Vtx* src = &c->model->base_verts[i];
        Vtx* dst = &c->deformed_verts[i];

        u8 bone = src->bone_idx;
        Mat4* bone_mat = &frame->bone_matrices[bone];

        transform_point(bone_mat, &src->pos, &dst->pos);
        transform_normal(bone_mat, &src->normal, &dst->normal);
    }
}
```

## Modern Reconstruction

```c
// Shader-based approach
// vertex.glsl
layout(location=0) in vec3 a_pos;
layout(location=1) in vec3 a_normal;
layout(location=2) in vec2 a_uv;
layout(location=3) in vec4 a_color;  // vertex coloring

uniform mat4 u_mvp;

out vec2 v_uv;
out vec4 v_color;

void main() {
    gl_Position = u_mvp * vec4(a_pos, 1.0);
    v_uv = a_uv;
    v_color = a_color;
}

// fragment.glsl
in vec2 v_uv;
in vec4 v_color;

uniform sampler2D u_texture;
uniform bool u_grayscale_tint;

out vec4 frag_color;

void main() {
    vec4 tex = texture(u_texture, v_uv);

    if (u_grayscale_tint) {
        // Emulate GE's grayscale + vertex color trick
        frag_color = vec4(v_color.rgb * tex.r, tex.a);
    } else {
        frag_color = tex * v_color;
    }
}
```

## LOD System (Simplified)

```c
typedef struct ModelLOD {
    Gfx* lod_high;    // < 500 units
    Gfx* lod_med;     // 500-1500 units
    Gfx* lod_low;     // > 1500 units
} ModelLOD;

Gfx* select_lod(ModelLOD* m, float dist_sq) {
    if (dist_sq < 250000) return m->lod_high;
    if (dist_sq < 2250000) return m->lod_med;
    return m->lod_low;
}
```

## Frame Budget (30fps target)

```
Total: 33.3ms per frame

RSP geometry:     ~10ms
RDP rasterize:    ~15ms
CPU game logic:   ~5ms
CPU AI:           ~2ms
Audio:            ~1ms
```
