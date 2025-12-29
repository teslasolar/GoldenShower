# Vec3 - 3D Vector Math

```javascript
class Vec3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
  scale(s){this.x*=s;this.y*=s;this.z*=s;return this}
  dot(v){return this.x*v.x+this.y*v.y+this.z*v.z}
  cross(v){return new Vec3(
    this.y*v.z-this.z*v.y,
    this.z*v.x-this.x*v.z,
    this.x*v.y-this.y*v.x
  )}
  len(){return Math.sqrt(this.x**2+this.y**2+this.z**2)}
  norm(){const l=this.len();if(l>0){this.x/=l;this.y/=l;this.z/=l}return this}
  clone(){return new Vec3(this.x,this.y,this.z)}
  distTo(v){return Math.sqrt((v.x-this.x)**2+(v.y-this.y)**2+(v.z-this.z)**2)}
  toArray(){return[this.x,this.y,this.z]}
  static from(a){return new Vec3(a[0],a[1],a[2])}
}
GS.Vec3=Vec3;
```
