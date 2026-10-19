import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculateFolk,backtestFolk} from '../src/folk-engine.mjs';
import {windowDraws} from '../src/engine.mjs';
const {draws}=JSON.parse(await readFile(new URL('../data/history.json',import.meta.url),'utf8'));
const previous={date:'2026-10-16',first:'011781',last2:'48'};

test('three user formulas use the previous actual prizes and return one digit each',()=>{
  const result=calculateFolk(previous,'2026-11-01',0);
  assert.deepEqual(result.map(row=>row.digit),['9','6','9']);
  assert.equal(result[0].expression,'48 + 781 = 829');
  assert.equal(result[1].expression,'7 × 8 = 56');
  assert.equal(result[2].expression,'1 + 48 + 0 = 49');
});
test('day formula uses actual shifted draw date and the explicit constant only',()=>{
  const a=calculateFolk(previous,'2026-11-16',5),b=calculateFolk(previous,'2026-11-17',5);
  assert.deepEqual(a.slice(0,2),b.slice(0,2));
  assert.equal(a[2].digit,'9');assert.equal(b[2].digit,'0');
  assert.match(b[2].expression,/17 \+ 48 \+ 5 = 70/);
});
test('zeros are preserved as input and valid zero-valued arithmetic outputs',()=>{
  const result=calculateFolk({date:'2026-10-01',first:'000005',last2:'04'},'2026-10-16',0);
  assert.equal(result[0].expression,'04 + 005 = 9');assert.equal(result[1].digit,'0');assert.equal(result[2].digit,'0');
});
test('invalid prizes, invalid dates, non-future target and invalid constants are rejected',()=>{
  assert.throws(()=>calculateFolk({...previous,first:'123'},'2026-11-01',0),/ช่องด้านบน/);
  for(const date of ['','2026-02-30','2026-10-16','2026-10-01'])assert.throws(()=>calculateFolk(previous,date,0),/วันที่งวดเป้าหมาย/);
  for(const constant of [-1,100,0.5,NaN])assert.throws(()=>calculateFolk(previous,'2026-11-01',constant),/เลขคงที่/);
});
test('backtest predicts only from the previous draw and actual target date, counting a double digit once',()=>{
  const records=[{date:'2026-01-01',first:'000000',last2:'00'},{date:'2026-01-17',first:'999999',last2:'00'}];
  const result=backtestFolk(records,0);
  assert.equal(result[0].total,1);assert.equal(result[0].hits,1);assert.equal(result[0].tensHits,1);assert.equal(result[0].unitsHits,1);
  assert.equal(result[1].history[0].digit,'0'); // Target's 999999 must not be used to predict itself.
  assert.equal(result[2].history[0].digit,'7');assert.equal(result[2].hits,0);
  assert.equal(result[0].history[0].previousDate,'2026-01-01');assert.equal(result[0].history[0].date,'2026-01-17');
});
test('year and context date filters exclude future outcomes from historical formula results',()=>{
  for(const years of [1,5,20]){
    const date=new Date('2016-07-16T12:00:00+07:00');
    const original=windowDraws(draws,years,date);
    const changed=windowDraws(draws.map(row=>row.date>'2016-07-16'?{...row,first:'999999',last2:'99'}:row),years,date);
    assert.deepEqual(backtestFolk(original,3),backtestFolk(changed,3));
    assert.equal(backtestFolk(original,3)[0].total,original.length-1);
  }
});
test('short histories do not invent evaluation samples and repeated calculations are deterministic',()=>{
  for(const rows of [[],[previous]])assert.ok(backtestFolk(rows).every(result=>result.total===0&&result.hits===0&&result.history.length===0));
  assert.deepEqual(calculateFolk(previous,'2026-11-01',0),calculateFolk(previous,'2026-11-01',0));
  assert.deepEqual(backtestFolk(draws,9),backtestFolk(draws,9));
});
