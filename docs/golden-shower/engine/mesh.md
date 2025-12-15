# Mesh Builder

```javascript
class Mesh {
  constructor(gl){this.gl=gl;this.vao=null;this.count=0}
  static box(gl,w,h,d,col){
    const m=new Mesh(gl);
    const p=w/2,q=h/2,r=d/2;
    const v=[
      -p,-q,r, p,-q,r, p,q,r, -p,q,r,
      p,-q,-r, -p,-q,-r, -p,q,-r, p,q,-r,
      -p,-q,-r, -p,-q,r, -p,q,r, -p,q,-r,
      p,-q,r, p,-q,-r, p,q,-r, p,q,r,
      -p,q,r, p,q,r, p,q,-r, -p,q,-r,
      -p,-q,-r, p,-q,-r, p,-q,r, -p,-q,r
    ];
    const n=[
      0,0,1,0,0,1,0,0,1,0,0,1,
      0,0,-1,0,0,-1,0,0,-1,0,0,-1,
      -1,0,0,-1,0,0,-1,0,0,-1,0,0,
      1,0,0,1,0,0,1,0,0,1,0,0,
      0,1,0,0,1,0,0,1,0,0,1,0,
      0,-1,0,0,-1,0,0,-1,0,0,-1,0
    ];
    const c=[];for(let i=0;i<24;i++)c.push(...col);
    const idx=[];
    for(let i=0;i<6;i++){
      const o=i*4;idx.push(o,o+1,o+2,o,o+2,o+3);
    }
    m._build(v,n,c,idx);return m;
  }
  _build(v,n,c,idx){
    const gl=this.gl;
    this.vao=gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this._attrib(v,0,3);this._attrib(n,1,3);this._attrib(c,2,3);
    const ebo=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
    this.count=idx.length;
  }
  _attrib(d,l,s){
    const gl=this.gl,b=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,b);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(d),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l,s,gl.FLOAT,false,0,0);
  }
  draw(){this.gl.bindVertexArray(this.vao);this.gl.drawElements(this.gl.TRIANGLES,this.count,this.gl.UNSIGNED_SHORT,0)}
}
GS.Mesh=Mesh;
```
