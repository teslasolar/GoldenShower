# Mat4 - 4x4 Matrix

```javascript
class Mat4 {
  constructor(){this.m=new Float32Array(16);this.identity()}
  identity(){this.m.fill(0);this.m[0]=this.m[5]=this.m[10]=this.m[15]=1;return this}
  perspective(fov,asp,n,f){
    const t=Math.tan(fov/2),r=1/(n-f);
    this.m.fill(0);
    this.m[0]=1/(asp*t);this.m[5]=1/t;
    this.m[10]=(f+n)*r;this.m[11]=-1;
    this.m[14]=2*f*n*r;return this
  }
  lookAt(eye,target,up){
    const z=eye.clone().sub(target).norm();
    const x=up.clone().cross(z).norm();
    const y=z.clone().cross(x);
    this.m[0]=x.x;this.m[1]=y.x;this.m[2]=z.x;this.m[3]=0;
    this.m[4]=x.y;this.m[5]=y.y;this.m[6]=z.y;this.m[7]=0;
    this.m[8]=x.z;this.m[9]=y.z;this.m[10]=z.z;this.m[11]=0;
    this.m[12]=-x.dot(eye);this.m[13]=-y.dot(eye);
    this.m[14]=-z.dot(eye);this.m[15]=1;return this
  }
  translate(v){
    this.m[12]+=v.x;this.m[13]+=v.y;this.m[14]+=v.z;return this
  }
  mul(b){
    const a=this.m,c=new Float32Array(16);
    for(let i=0;i<4;i++)for(let j=0;j<4;j++){
      c[j*4+i]=a[i]*b.m[j*4]+a[i+4]*b.m[j*4+1]+a[i+8]*b.m[j*4+2]+a[i+12]*b.m[j*4+3];
    }
    this.m=c;return this
  }
}
GS.Mat4=Mat4;
```
