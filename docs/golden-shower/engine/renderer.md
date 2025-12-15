# WebGL Renderer

```javascript
class Renderer {
  constructor(canvas){
    this.gl=canvas.getContext('webgl2');
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.clearColor(0.1,0.1,0.15,1);
    this._initShaders();
  }
  _initShaders(){
    const gl=this.gl;
    const vs=`#version 300 es
      in vec3 aPos;in vec3 aNorm;in vec3 aCol;
      uniform mat4 uProj,uView,uModel;
      out vec3 vNorm,vCol;
      void main(){
        gl_Position=uProj*uView*uModel*vec4(aPos,1.0);
        vNorm=mat3(uModel)*aNorm;vCol=aCol;
      }`;
    const fs=`#version 300 es
      precision mediump float;
      in vec3 vNorm,vCol;out vec4 col;
      void main(){
        float l=max(dot(normalize(vNorm),vec3(0.5,1.0,0.3)),0.2);
        col=vec4(vCol*l,1.0);
      }`;
    this.prog=this._compile(vs,fs);
  }
  _compile(vs,fs){
    const gl=this.gl;
    const v=gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(v,vs);gl.compileShader(v);
    const f=gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(f,fs);gl.compileShader(f);
    const p=gl.createProgram();
    gl.attachShader(p,v);gl.attachShader(p,f);
    gl.linkProgram(p);return p;
  }
  resize(){
    const c=this.gl.canvas;
    c.width=window.innerWidth;c.height=window.innerHeight;
    this.gl.viewport(0,0,c.width,c.height);
  }
  clear(){this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT)}
}
GS.Renderer=Renderer;
```
