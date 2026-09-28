import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBriefing } from '../src/briefing.mjs';
const row={dir:'E',x:14,y:10,terrain:'Coast',land:false,city:false,occupied:true};
const briefing=detail=>`=== TURN 100 | Rome ===
CITIES (0):
UNITS (army 1/40, workers 0, settlers 0):
  Swordsman-1 Swordsman a3/d2/m1 (12,10) moves 1 HP 3/3
      adjacent: N:Grassland E:occupied W:Grassland
${detail}
      actions: move_unit dir N/NE/S | fortify
`;
const parse=value=>parseBriefing(briefing('      adjacent_tiles: '+JSON.stringify(value))).units[0];
test('occupied water retains terrain independently of the legacy adjacency line',()=>{
 const u=parse([row]);assert.deepEqual(u.adjacentTiles,[row]);assert.equal(u.hp,3);assert(u.actions.verbs.has('move_unit'));assert(u.actions.verbs.has('fortify'));
});
test('missing, explicitly empty, and malformed adjacency remain distinct',()=>{
 assert.equal(parseBriefing(briefing('')).units[0].adjacentTiles,null);assert.deepEqual(parse([]).adjacentTiles,[]);
 assert.equal(parseBriefing(briefing('      adjacent_tiles: {broken')).units[0].adjacentTiles,null);
 for(const x of [null,{},[null],[row,row],[{...row,dir:'UP'}],[{...row,x:1.2}],[{...row,y:'10'}],[{...row,land:'false'}],[{...row,occupied:1}],[{...row,city:null}],[{...row,terrain:''}]])assert.equal(parse(x).adjacentTiles,null);
});
test('unknown future fields and terrain names are compatible',()=>{
 assert.deepEqual(parse([{...row,newField:'ignored'}]).adjacentTiles,[row]);assert.equal(parse([{...row,terrain:'Future terrain'}]).adjacentTiles[0].terrain,'Future terrain');
});
test('occupied land and ports are not inferred to be water',()=>{
 const port={...row,terrain:'Grassland',land:true,city:true};assert.deepEqual(parse([port]).adjacentTiles,[port]);
});
test('each unit owns its adjacency and missing directions stay absent',()=>{
 const text=briefing('      adjacent_tiles: '+JSON.stringify([row]))+`  Spearman-2 Spearman a1/d2/m1 (20,10) moves 1 HP 3/3
      adjacent_tiles: []
      actions: fortify
`;
 const [a,b]=parseBriefing(text).units;assert.equal(a.adjacentTiles.length,1);assert.equal(a.adjacentTiles[0].dir,'E');assert.deepEqual(b.adjacentTiles,[]);
});
test('adding adjacency leaves every older parsed unit property unchanged',()=>{
 const old=parseBriefing(briefing('')).units[0],added=parse([row]);delete old.adjacentTiles;delete added.adjacentTiles;assert.deepEqual(added,old);
});
