import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {analyze,countsOf,scores,validDraw,validateModels,windowDraws} from '../src/engine.mjs';
const {draws}=JSON.parse(await readFile(new URL('../data/history.json',import.meta.url),'utf8'));

test('all bundled draws have valid dates, preserve leading zeroes and unique dates',()=>{
  assert.ok(draws.length>450);assert.ok(draws.every(validDraw));assert.equal(new Set(draws.map(d=>d.date)).size,draws.length);
  assert.ok(draws.some(d=>d.first.startsWith('0')));assert.ok(draws.some(d=>d.last2.startsWith('0')));
  assert.equal(validDraw({date:'2026-02-30',first:'012345',last2:'00'}),false);
});
test('heatmap counts total exactly one two-digit prize per filtered draw',()=>{
  const filtered=windowDraws(draws,5,new Date('2026-10-19T12:00:00+07:00'));
  assert.equal(countsOf(filtered).reduce((a,b)=>a+b,0),filtered.length);
  assert.ok(filtered.every(d=>d.date>='2021-10-19'&&d.date<='2026-10-19'));
});
test('all four models normalize probabilities and use fixed deterministic outputs',()=>{
  for(const name of ['frequency','recent','digits','transition']){const p=scores(draws,name);assert.equal(p.length,100);assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-10);assert.ok(p.every(n=>n>0));}
  const a=analyze(draws,draws.at(-1));assert.deepEqual(a,analyze(draws,draws.at(-1)));assert.notEqual(a.candidates[0].number,a.candidates[1].number);assert.match(a.first,/^\d{6}$/);
});
test('historical calculation excludes every future draw',()=>{
  const date=new Date('2018-01-16T12:00:00+07:00');
  const a=windowDraws(draws,5,date),b=windowDraws(draws.map(d=>d.date>'2018-01-16'?{...d,first:'999999',last2:'99'}:d),5,date);
  assert.deepEqual(analyze(a,a.at(-1)),analyze(b,b.at(-1)));
});
test('holdout outcomes cannot change model selection',()=>{
  const split=Math.floor(draws.length*.8);
  const altered=draws.map((d,i)=>i>=split?{...d,last2:'99'}:d);
  const a=validateModels(draws),b=validateModels(altered);
  assert.deepEqual(a.comparisons,b.comparisons);assert.equal(a.chosen,b.chosen);assert.equal(a.total,draws.length-split);
});
test('insufficient data does not produce invented rankings',()=>{
  assert.equal(validateModels(draws.slice(0,20)),null);
  assert.throws(()=>analyze(draws.slice(0,20),draws[19]),/60/);
});
