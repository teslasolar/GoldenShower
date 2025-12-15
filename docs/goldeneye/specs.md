# GoldenEye 007 N64 - Technical Specs

## Game Size
- **Cartridge**: 96 Mbit (12 MB)
- **ROM**: ~10.3 MB
- **Budget**: $2M USD
- **Dev time**: 2.5 years (Jan 1995 - Aug 1997)
- **Team**: <10 people

## N64 Hardware

### CPU (VR4300)
- MIPS R4300i derivative, 64-bit
- 93.75 MHz
- 125 MIPS, 93.75 MFLOPS
- 24 KB L1 cache
- 250 MB/s bus (bottleneck)

### RCP (Reality Coprocessor) @ 62.5 MHz

**RSP (Reality Signal Processor)**
- 128-bit SIMD vector processor
- 32x 128-bit vector registers (8x 16-bit lanes)
- 4 KB IMEM + 4 KB DMEM
- Handles: transforms, clipping, lighting, audio
- Programmable via microcode

**RDP (Reality Display Processor)**
- Fixed-function rasterizer
- 4 KB texture cache (major limitation)
- Features: perspective-correct texturing, Z-buffer, bilinear/trilinear filtering, Gouraud shading, 8-bit alpha

### Memory
- 4 MB RDRAM (8 MB w/ Expansion Pak)
- 562.5 MB/s bandwidth
- ~640ns latency
- Unified RAM (system + video)
