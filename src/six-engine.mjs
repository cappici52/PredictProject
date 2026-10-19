// The candidate grid is fixed before seeing validation/holdout results.
export const SIX_MODELS = [
  {id:'uniform',name:'โอกาสเท่ากันทุกเลข',kind:'uniform'},
  {id:'frequency',name:'ความถี่รายหลัก · ปรับเรียบ 1',alpha:1},
  {id:'smoothed',name:'ความถี่รายหลัก · ปรับเรียบ 10',alpha:10},
  {id:'recent24',name:'ให้น้ำหนักงวดใหม่ · ครึ่งชีวิต 24 งวด',alpha:5,halfLife:24},
  {id:'recent48',name:'ให้น้ำหนักงวดใหม่ · ครึ่งชีวิต 48 งวด',alpha:5,halfLife:48},
  {id:'transition01',name:'ความสัมพันธ์งวดก่อน · น้ำหนัก 0.1',alpha:5,transition:0.1},
  {id:'legacy',name:'สูตรเดิม · น้ำหนัก 0.25',alpha:1,transition:0.25},
  {id:'transition1',name:'ความสัมพันธ์งวดก่อน · น้ำหนัก 1',alpha:5,transition:1},
  {id:'ensemble',name:'ผสมความถี่ + งวดใหม่ + ความสัมพันธ์',kind:'ensemble'},
];
export const SIX_MODEL_NAMES=Object.fromEntries(SIX_MODELS.map(model=>[model.id,model.name]));
export const SIX_MODEL_DESCRIPTIONS={
  uniform:'ทุกหลักให้เลข 0–9 มีน้ำหนัก 10% เท่ากัน ทุกชุด 6 ตัวจึงเสมอกัน ไม่สามารถจัดอันดับเลขเด่นหรือเลือกชุดหลักได้',
  frequency:'นับรางวัลที่หนึ่งแยก 6 ตำแหน่ง บวกคะแนนตั้งต้น 1 ให้ทุกเลข แล้วปรับผลรวมแต่ละหลักเป็น 100%',
  smoothed:'นับรางวัลที่หนึ่งแยก 6 ตำแหน่ง บวกคะแนนตั้งต้น 10 ให้ทุกเลข เพื่อลดผลจากความต่างเล็กน้อยในตัวอย่าง',
  recent24:'นับแยกรายหลัก บวกคะแนนตั้งต้น 5 และลดน้ำหนักข้อมูลครึ่งหนึ่งทุก 24 งวด',
  recent48:'นับแยกรายหลัก บวกคะแนนตั้งต้น 5 และลดน้ำหนักข้อมูลครึ่งหนึ่งทุก 48 งวด',
  transition01:'ความถี่รายหลักบวกคะแนนตั้งต้น 5 เพิ่ม 0.1 ให้เลขที่เคยตามหลังหลักเดียวกันของงวดก่อน',
  legacy:'สูตรเดิม: ความถี่รายหลักบวกคะแนนตั้งต้น 1 เพิ่ม 0.25 ให้เลขที่เคยตามหลังหลักเดียวกันของงวดก่อน',
  transition1:'ความถี่รายหลักบวกคะแนนตั้งต้น 5 เพิ่ม 1 ให้เลขที่เคยตามหลังหลักเดียวกันของงวดก่อน',
  ensemble:'ผสมการกระจายรายหลักจากความถี่ปรับเรียบ 10 สัดส่วน 50%, งวดใหม่ 48 งวด 25% และความสัมพันธ์น้ำหนัก 0.1 อีก 25%',
};

export function sixDistributions(draws,modelId='legacy',previous=draws.at(-1)) {
  const model=SIX_MODELS.find(item=>item.id===modelId);
  if(!model) throw new Error('ไม่พบสูตรรางวัลที่หนึ่ง');
  if(model.kind==='uniform') return Array.from({length:6},()=>Array(10).fill(0.1));
  if(model.kind==='ensemble') {
    const frequency=sixDistributions(draws,'smoothed',previous);
    const recent=sixDistributions(draws,'recent48',previous);
    const transition=sixDistributions(draws,'transition01',previous);
    return frequency.map((position,p)=>position.map((weight,d)=>weight*0.5+recent[p][d]*0.25+transition[p][d]*0.25));
  }
  return Array.from({length:6},(_,position)=>{
    const counts=Array(10).fill(model.alpha);
    for(let i=0;i<draws.length;i++) counts[Number(draws[i].first[position])]+=model.halfLife?2**(-(draws.length-1-i)/model.halfLife):1;
    if(model.transition) for(let i=1;i<draws.length;i++) {
      if(draws[i-1].first[position]===previous?.first?.[position]) counts[Number(draws[i].first[position])]+=model.transition;
    }
    const total=counts.reduce((a,b)=>a+b,0);
    return counts.map(count=>count/total);
  });
}

export function rankSixPositions(positions) {
  let ranked=[{number:'',score:1}];
  for(const weights of positions) {
    // Factorized model: retaining the best ten prefixes preserves the best ten full numbers.
    ranked=ranked.flatMap(prefix=>weights.map((weight,digit)=>({number:prefix.number+digit,score:prefix.score*weight})))
      .sort((a,b)=>b.score-a.score || a.number.localeCompare(b.number)).slice(0,10);
  }
  return ranked;
}
export function sixPrimary(draws,modelId='legacy',previous=draws.at(-1)) {
  return sixDistributions(draws,modelId,previous).map(weights=>weights.indexOf(Math.max(...weights))).join('');
}
export function sixRanked(draws,previous=draws.at(-1),modelId='legacy') {
  const positions=sixDistributions(draws,modelId,previous);
  return rankSixPositions(positions).map(item=>({...item,reason:modelId==='uniform'?SIX_MODEL_DESCRIPTIONS.uniform:
    [...item.number].map((digit,position)=>`หลักที่ ${position+1}: ${digit} เคยออก ${draws.filter(row=>row.first[position]===digit).length} ครั้ง · น้ำหนักโมเดล ${(positions[position][Number(digit)]*100).toFixed(2)}%`).join(' · ')}));
}
function digitLoss(positions,actual) {
  return [...actual].reduce((sum,digit,p)=>sum-Math.log(positions[p][Number(digit)]),0)/6;
}
function evaluate(draws,start,modelId) {
  let loss=0,exactHits=0,topTenHits=0,digitHits=0;
  const positionHits=Array(6).fill(0);
  for(let i=start;i<draws.length;i++) {
    const positions=sixDistributions(draws.slice(0,i),modelId);
    const ranked=rankSixPositions(positions);
    const actual=draws[i].first;
    loss+=digitLoss(positions,actual);
    if(ranked[0].number===actual) exactHits++;
    if(ranked.some(item=>item.number===actual)) topTenHits++;
    for(let p=0;p<6;p++) if(ranked[0].number[p]===actual[p]) {digitHits++;positionHits[p]++;}
  }
  const total=draws.length-start;
  return {model:modelId,loss:loss/total,exactHits,topTenHits,digitHits,positionHits,total};
}
export function validateSixModels(draws) {
  if(draws.length<60) return null;
  const selectionStart=Math.max(30,Math.floor(draws.length*0.5));
  const holdoutStart=Math.floor(draws.length*0.8);
  const comparisons=SIX_MODELS.map((model,order)=>{
    let loss=0;
    for(let i=selectionStart;i<holdoutStart;i++) loss+=digitLoss(sixDistributions(draws.slice(0,i),model.id),draws[i].first);
    return {model:model.id,loss:loss/(holdoutStart-selectionStart),total:holdoutStart-selectionStart,order};
  }).sort((a,b)=>a.loss-b.loss || a.order-b.order);
  const chosen=comparisons[0].model;
  const statisticalChosen=comparisons.find(item=>item.model!=='uniform').model;
  // Freeze the selected formula before evaluating any final holdout outcome.
  const evaluated=new Map([...new Set([chosen,statisticalChosen,'legacy','uniform'])].map(id=>[id,evaluate(draws,holdoutStart,id)]));
  return {chosen,statisticalChosen,comparisons,selected:evaluated.get(chosen),statistical:evaluated.get(statisticalChosen),legacy:evaluated.get('legacy'),uniform:evaluated.get('uniform'),
    selectionFrom:draws[selectionStart].date,selectionTo:draws[holdoutStart-1].date,
    holdoutFrom:draws[holdoutStart].date,holdoutTo:draws.at(-1).date,total:draws.length-holdoutStart};
}
