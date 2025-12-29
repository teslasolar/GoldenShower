# Maps Index

Loads all map param files.

```javascript
GS.Maps={
  temple:{id:'temple',name:'Temple',size:[30,10,30],spawns:[[5,0,5],[-5,0,5],[5,0,-5],[-5,0,-5]]},
  complex:{id:'complex',name:'Complex',size:[40,15,40],spawns:[[15,0,15],[-15,0,15],[15,0,-15],[-15,0,-15]]},
  facility:{id:'facility',name:'Facility',size:[35,12,35],spawns:[[10,0,10],[-10,0,10],[10,0,-10],[-10,0,-10]]},
  bunker:{id:'bunker',name:'Bunker',size:[25,8,25],spawns:[[8,0,8],[-8,0,8],[8,0,-8],[-8,0,-8]]},
  library:{id:'library',name:'Library',size:[20,10,20],spawns:[[6,0,6],[-6,0,6],[6,0,-6],[-6,0,-6]]},
  stack:{id:'stack',name:'Stack',size:[30,20,30],spawns:[[10,0,10],[-10,0,10],[10,10,-10],[-10,10,-10]]}
};
GS.Arenas=Object.values(GS.Maps);
```
