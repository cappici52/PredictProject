export const MODEL_NAMES = { frequency: 'ความถี่สะสม', recent: 'ความถี่ถ่วงน้ำหนัก 48 งวด', digits: 'ความถี่รายหลัก', transition: 'ความสัมพันธ์กับงวดก่อน' };
export const MODELS = Object.keys(MODEL_NAMES);
export function validDraw(row) {
  if (!row || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !/^\d{6}$/.test(row.first) || !/^\d{2}$/.test(row.last2)) return false;
  const d = new Date(row.date + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === row.date;
}
export function windowDraws(draws, years, now = new Date()) {
  const end = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const parts = end.split('-');
  const start = `${Number(parts[0]) - years}-${parts[1]}-${parts[2]}`;
  return draws.filter(d => d.date >= start && d.date <= end).sort((a,b) => a.date.localeCompare(b.date));
}
export function countsOf(draws) {
  const counts = Array(100).fill(0);
  for (const row of draws) counts[Number(row.last2)]++;
  return counts;
}
export function scores(draws, model, previous = draws.at(-1)) {
  const weights = Array(100).fill(1);
  if (model === 'digits') {
    const tens = Array(10).fill(1), units = Array(10).fill(1);
    for (const row of draws) { tens[Number(row.last2[0])]++; units[Number(row.last2[1])]++; }
    for (let i=0; i<100; i++) weights[i] = tens[Math.floor(i/10)] * units[i%10];
  } else if (model === 'transition') {
    // Smoothed backoff prevents a tiny conditional sample from dominating.
    const base = scores(draws, 'frequency');
    for (let i=0; i<100; i++) weights[i] = 100 * base[i];
    for (let i=1; i<draws.length; i++) {
      const before = draws[i-1];
      if (before.last2 === previous?.last2) weights[Number(draws[i].last2)] += 1;
      if (before.first.slice(-2) === previous?.first?.slice(-2)) weights[Number(draws[i].last2)] += 0.5;
    }
  } else {
    draws.forEach((row,i) => { weights[Number(row.last2)] += model === 'recent' ? 2 ** (-(draws.length-1-i)/48) : 1; });
  }
  const total = weights.reduce((a,b) => a+b,0);
  return weights.map(value => value/total);
}
export function rank(probabilities) {
  return probabilities.map((score,number) => ({number: String(number).padStart(2,'0'),score})).sort((a,b) => b.score-a.score || a.number.localeCompare(b.number));
}
export function sixDigits(draws, previous = draws.at(-1)) {
  return Array.from({length:6},(_,position) => {
    const counts=Array(10).fill(1);
    for (const row of draws) counts[Number(row.first[position])]++;
    // Fixed deterministic tie-breaking. Previous result contributes only where transitions exist.
    for (let i=1;i<draws.length;i++) if(draws[i-1].first[position] === previous?.first?.[position]) counts[Number(draws[i].first[position])] += 0.25;
    return counts.indexOf(Math.max(...counts));
  }).join('');
}
export function validateModels(draws) {
  if (draws.length < 60) return null;
  const selectionStart = Math.max(30,Math.floor(draws.length*0.5));
  const holdoutStart = Math.floor(draws.length*0.8);
  const comparisons = MODELS.map(model => {
    let hits=0, loss=0;
    for(let i=selectionStart;i<holdoutStart;i++) {
      const p = scores(draws.slice(0,i),model);
      if(rank(p).slice(0,2).some(x=>x.number===draws[i].last2)) hits++;
      loss -= Math.log(p[Number(draws[i].last2)]);
    }
    return {model,hits,total:holdoutStart-selectionStart,loss:loss/(holdoutStart-selectionStart)};
  }).sort((a,b)=>a.loss-b.loss || MODELS.indexOf(a.model)-MODELS.indexOf(b.model));
  const chosen = comparisons[0].model;
  let hits=0, sixHits=0;
  for(let i=holdoutStart;i<draws.length;i++) {
    const train=draws.slice(0,i);
    if(rank(scores(train,chosen)).slice(0,2).some(x=>x.number===draws[i].last2)) hits++;
    if(sixDigits(train)===draws[i].first) sixHits++;
  }
  return {chosen,comparisons,hits,sixHits,total:draws.length-holdoutStart,holdoutFrom:draws[holdoutStart].date,holdoutTo:draws.at(-1).date};
}
export function analyze(draws, context, validation = validateModels(draws)) {
  if(draws.length<60) throw new Error('ต้องมีข้อมูลอย่างน้อย 60 งวดเพื่อเปรียบเทียบสูตร');
  const model=validation.chosen;
  const counts=countsOf(draws);
  const candidates=rank(scores(draws,model,context)).slice(0,2).map(item=>{
    const count=counts[Number(item.number)];
    let reason;
    if(model==='digits') {
      const tens=draws.filter(d=>d.last2[0]===item.number[0]).length;
      const units=draws.filter(d=>d.last2[1]===item.number[1]).length;
      reason=`หลักสิบ ${item.number[0]} พบ ${tens} ครั้ง · หลักหน่วย ${item.number[1]} พบ ${units} ครั้ง นำความถี่ที่ปรับเรียบมาคูณกัน`;
    } else if(model==='recent') {
      const weight=draws.reduce((sum,d,i)=>sum+(d.last2===item.number?2**(-(draws.length-1-i)/48):0),0);
      reason=`ผลรวมถ่วงน้ำหนัก ${weight.toFixed(2)} โดยลดน้ำหนักครึ่งหนึ่งทุก 48 งวด และบวกค่าปรับเรียบ 1`;
    } else if(model==='transition') {
      const matches=draws.slice(1).filter((d,i)=>draws[i].last2===context.last2&&d.last2===item.number).length;
      reason=`เคยตามหลังเลข ${context.last2} จำนวน ${matches} ครั้ง ผสมความถี่สะสมที่ปรับเรียบ ไม่ใช้ความสัมพันธ์เพียงอย่างเดียว`;
    } else reason=`ความถี่ ${count} ครั้ง บวกค่าปรับเรียบ 1 หารด้วย ${draws.length+100} เพื่อไม่ให้เลขที่ยังไม่เคยออกมีน้ำหนักเป็นศูนย์`;
    return {...item,count,reason,latest:draws.findLast(row=>row.last2===item.number)?.date || null};
  });
  const transitionSamples = draws.slice(0,-1).filter(d=>d.last2===context.last2).length;
  return {model,candidates,first:sixDigits(draws,context),validation,transitionSamples,trainingCount:draws.length,asOf:draws.at(-1).date,context};
}
