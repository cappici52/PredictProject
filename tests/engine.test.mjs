import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {analyze,countsOf,rank,scores,sixDigits,rankSixDigits,validDraw,validateModels,windowDraws} from '../src/engine.mjs';
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
  const a=analyze(draws,draws.at(-1));assert.deepEqual(a,analyze(draws,draws.at(-1)));assert.notEqual(a.candidates[0].number,a.candidates[1].number);if(a.sixNoRanking)assert.equal(a.first,null);else assert.match(a.first,/^\d{6}$/);
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
test('short periods use frequency rankings without inventing validation results',()=>{
  assert.equal(validateModels(draws.slice(0,20)),null);
  const result=analyze(draws.slice(0,20),draws[19]);
  assert.equal(result.validation,null);assert.equal(result.model,'frequency');assert.equal(result.topTen.length,10);
  assert.deepEqual(result.topTen.map(d=>d.number),rank(scores(draws.slice(0,20),'frequency')).slice(0,10).map(d=>d.number));
  assert.throws(()=>analyze([],draws[19]),/ไม่พบข้อมูล/);
});
test('every yearly window from one to twenty years can calculate with only its own records',()=>{
  const anchor=new Date('2026-10-16T12:00:00+07:00');
  let previousCount=0;
  for(let years=1;years<=20;years++){
    const filtered=windowDraws(draws,years,anchor);
    assert.ok(filtered.length>=previousCount);previousCount=filtered.length;
    assert.ok(filtered.every(d=>d.date>=`${2026-years}-10-16` && d.date<='2026-10-16'));
    const result=analyze(filtered,filtered.at(-1));
    assert.equal(result.trainingCount,filtered.length);assert.equal(result.topTen.length,10);assert.equal(result.sixTopTen.length,result.sixNoRanking?0:10);
  }
});
test('top ten two-digit rankings retain the two primary sets, explanations and fixed ordering',()=>{
  const result=analyze(draws,draws.at(-1));
  assert.deepEqual(result.candidates,result.topTen.slice(0,2));
  assert.equal(new Set(result.topTen.map(d=>d.number)).size,10);
  for(let i=0;i<10;i++){
    assert.match(result.topTen[i].number,/^\d{2}$/);assert.ok(result.topTen[i].reason.length>0);
    if(i)assert.ok(result.topTen[i-1].score>=result.topTen[i].score);
  }
  assert.ok(result.validation.topTenHits>=result.validation.hits);
  assert.ok(result.validation.topTenHits<=result.validation.total);
});
test('six-digit top ten preserves primary prediction, leading zeros and deterministic tie order',()=>{
  const list=rankSixDigits(draws);
  assert.equal(list[0].number,sixDigits(draws));assert.equal(new Set(list.map(d=>d.number)).size,10);
  assert.deepEqual(list,rankSixDigits(draws));
  for(let i=0;i<10;i++){
    assert.match(list[i].number,/^\d{6}$/);assert.ok(list[i].score>0);assert.ok(list[i].reason.length>0);
    if(i)assert.ok(list[i-1].score>=list[i].score);
  }
  // With an empty evidence set all combinations tie, so return 000000 through 000009.
  assert.deepEqual(rankSixDigits([]).map(d=>d.number),Array.from({length:10},(_,i)=>String(i).padStart(6,'0')));
});
