import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SIX_MODELS,sixDistributions,sixPrimary,sixRanked,rankSixPositions,validateSixModels} from '../src/six-engine.mjs';
import {analyze,windowDraws} from '../src/engine.mjs';
const {draws}=JSON.parse(await readFile(new URL('../data/history.json',import.meta.url),'utf8'));

test('all nine candidate distributions are positive and normalized, including unseen transitions',()=>{
  assert.equal(SIX_MODELS.length,9);
  for(const {id} of SIX_MODELS)for(const evidence of [[],draws.slice(0,20),draws]){
    const positions=sixDistributions(evidence,id,{first:'000000'});
    assert.equal(positions.length,6);
    for(const weights of positions){assert.equal(weights.length,10);assert.ok(weights.every(p=>p>0));assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-12);}
  }
});
test('legacy formula remains exactly the original count plus 0.25 transition evidence',()=>{
  const previous=draws.at(-1);
  const expected=Array.from({length:6},(_,p)=>{
    const counts=Array(10).fill(1);
    draws.forEach(d=>counts[Number(d.first[p])]++);
    for(let i=1;i<draws.length;i++)if(draws[i-1].first[p]===previous.first[p])counts[Number(draws[i].first[p])]+=0.25;
    const total=counts.reduce((a,b)=>a+b,0);
    return counts.map(count=>count/total);
  });
  assert.deepEqual(sixDistributions(draws,'legacy',previous),expected);
  assert.equal(sixPrimary(draws,'legacy'),expected.map(weights=>weights.indexOf(Math.max(...weights))).join(''));
});
test('final holdout first prizes cannot influence six-digit formula selection or parameters',()=>{
  const split=Math.floor(draws.length*.8);
  const altered=draws.map((d,i)=>i>=split?{...d,first:'999999'}:d);
  const original=validateSixModels(draws),changed=validateSixModels(altered);
  assert.deepEqual(original.comparisons,changed.comparisons);assert.equal(original.chosen,changed.chosen);
  assert.equal(original.statisticalChosen,changed.statisticalChosen);
  assert.equal(original.selected.model,original.chosen);assert.equal(original.total,draws.length-split);
  assert.notEqual(original.uniform.digitHits,changed.uniform.digitHits);
});
test('holdout scores and hit counts match an independent chronological replay',()=>{
  const result=validateSixModels(draws.slice(-80));
  const evidence=draws.slice(-80),start=Math.floor(evidence.length*.8);
  let loss=0,exact=0,topTen=0,digits=0;
  const positions=Array(6).fill(0);
  for(let i=start;i<evidence.length;i++){
    const train=evidence.slice(0,i);
    const weights=sixDistributions(train,result.chosen);
    const ranked=sixRanked(train,train.at(-1),result.chosen);
    for(let p=0;p<6;p++){
      loss-=Math.log(weights[p][Number(evidence[i].first[p])])/6;
      if(ranked[0].number[p]===evidence[i].first[p]){digits++;positions[p]++;}
    }
    if(ranked[0].number===evidence[i].first)exact++;
    if(ranked.some(item=>item.number===evidence[i].first))topTen++;
  }
  assert.ok(Math.abs(result.selected.loss-loss/result.total)<1e-12);
  assert.equal(result.selected.exactHits,exact);assert.equal(result.selected.topTenHits,topTen);
  assert.equal(result.selected.digitHits,digits);assert.deepEqual(result.selected.positionHits,positions);
  assert.ok(Math.abs(result.uniform.loss-Math.log(10))<1e-12);
});
test('top ten factorized search matches exhaustive enumeration on a controlled six-position distribution',()=>{
  const weights=Array.from({length:6},()=>[0.75,0.25,...Array(8).fill(0)]);
  const all=Array.from({length:64},(_,i)=>{
    const number=i.toString(2).padStart(6,'0');
    return {number,score:[...number].reduce((score,digit,p)=>score*weights[p][Number(digit)],1)};
  }).sort((a,b)=>b.score-a.score || a.number.localeCompare(b.number)).slice(0,10);
  assert.deepEqual(rankSixPositions(weights),all);
});
test('short windows use smoothed frequency with no fabricated selection or holdout',()=>{
  assert.equal(validateSixModels(draws.slice(-24)),null);
  const records=draws.slice(-24),result=analyze(records,records.at(-1));
  assert.equal(result.sixValidation,null);assert.equal(result.sixModel,'smoothed');
  assert.deepEqual(result.sixTopTen,sixRanked(records,records.at(-1),'smoothed'));
});
test('all formulas retain deterministic top ten scores, unique six-digit strings and per-position reasons',()=>{
  for(const {id} of SIX_MODELS){
    const a=sixRanked(draws,draws.at(-1),id);
    assert.deepEqual(a,sixRanked(draws,draws.at(-1),id));assert.equal(a.length,10);assert.equal(new Set(a.map(d=>d.number)).size,10);
    assert.equal(a[0].number,sixPrimary(draws,id));
    for(let i=0;i<a.length;i++){assert.match(a[i].number,/^\d{6}$/);assert.ok(a[i].reason.length>0);if(i)assert.ok(a[i-1].score>=a[i].score);}
  }
  assert.deepEqual(sixRanked(draws,draws.at(-1),'uniform').map(d=>d.number),Array.from({length:10},(_,i)=>String(i).padStart(6,'0')));
});
test('historical six-digit evaluation never reads draws after the chosen context date',()=>{
  const date=new Date('2016-07-16T12:00:00+07:00');
  const original=windowDraws(draws,5,date);
  const changed=windowDraws(draws.map(d=>d.date>'2016-07-16'?{...d,first:'000000'}:d),5,date);
  assert.deepEqual(validateSixModels(original),validateSixModels(changed));
});
test('uniform selection exposes no misleading primary number or top ten and keeps experimental rankings separate',()=>{
  const result=analyze(draws,draws.at(-1));
  assert.equal(result.sixModel,'uniform');assert.equal(result.sixNoRanking,true);assert.equal(result.first,null);assert.deepEqual(result.sixTopTen,[]);
  assert.ok(result.sixAlternative);assert.notEqual(result.sixAlternative.model,'uniform');assert.equal(result.sixAlternative.topTen.length,10);
  assert.equal(result.sixAlternative.model,result.sixValidation.comparisons.find(item=>item.model!=='uniform').model);
  assert.equal(result.sixAlternative.evaluation.model,result.sixAlternative.model);
  assert.deepEqual(result.sixAlternative.topTen,sixRanked(draws,draws.at(-1),result.sixAlternative.model));
});
test('even a non-uniform model name cannot produce a ranked list from fully tied evidence',()=>{
  const records=Array.from({length:10},(_,digit)=>({date:`2026-01-${String(digit+1).padStart(2,'0')}`,first:String(digit).repeat(6),last2:String(digit).repeat(2)}));
  const result=analyze(records,records.at(-1));
  assert.equal(result.sixModel,'smoothed');assert.equal(result.sixNoRanking,true);assert.equal(result.first,null);assert.deepEqual(result.sixTopTen,[]);
});
