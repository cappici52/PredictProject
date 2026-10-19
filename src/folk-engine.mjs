import {validDraw} from './engine.mjs';

export const FOLK_FORMULAS=[
  {id:'sum',name:'บวกเลขบน–ล่าง',description:'เลขท้าย 2 ตัวงวดก่อน + สามหลักท้ายรางวัลที่หนึ่ง แล้วใช้หลักหน่วยของผลรวม'},
  {id:'product',name:'คูณหลักร้อย × หลักสิบ',description:'หลักร้อยของรางวัลที่หนึ่งงวดก่อน × หลักสิบ แล้วใช้หลักหน่วยของผลคูณ'},
  {id:'drawDate',name:'วันที่งวดเป้าหมาย + เลขล่าง',description:'เลขวันที่ของงวดเป้าหมาย + เลขท้าย 2 ตัวงวดก่อน + เลขคงที่ แล้วใช้หลักหน่วย'},
];

export function calculateFolk(context,targetDate,constant=0){
  if(!validDraw(context))throw new Error('กรอกผลรางวัลที่หนึ่ง 6 หลัก เลขท้าย 2 ตัว และวันที่งวดก่อนหน้าในช่องด้านบนให้ครบ');
  if(!validDraw({date:targetDate,first:'000000',last2:'00'}) || targetDate<=context.date)throw new Error('เลือกวันที่งวดเป้าหมายให้เป็นวันที่หลังงวดก่อนหน้า');
  if(!Number.isInteger(constant)||constant<0||constant>99)throw new Error('เลขคงที่ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 99');
  const lower=Number(context.last2),upper=Number(context.first.slice(-3));
  const hundreds=Number(context.first[3]),tens=Number(context.first[4]);
  const day=Number(targetDate.slice(-2));
  const rows=[
    {id:'sum',value:lower+upper,expression:`${context.last2} + ${context.first.slice(-3)} = ${lower+upper}`},
    {id:'product',value:hundreds*tens,expression:`${hundreds} × ${tens} = ${hundreds*tens}`},
    {id:'drawDate',value:day+lower+constant,expression:`${day} + ${context.last2} + ${constant} = ${day+lower+constant}`},
  ];
  return rows.map(row=>({...FOLK_FORMULAS.find(formula=>formula.id===row.id),...row,digit:String(row.value%10)}));
}

export function backtestFolk(draws,constant=0){
  const ordered=[...draws].sort((a,b)=>a.date.localeCompare(b.date));
  const results=FOLK_FORMULAS.map(formula=>({...formula,hits:0,tensHits:0,unitsHits:0,total:Math.max(0,ordered.length-1),history:[]}));
  for(let i=1;i<ordered.length;i++){
    const previous=ordered[i-1],actual=ordered[i];
    for(const prediction of calculateFolk(previous,actual.date,constant)){
      const entry=results.find(result=>result.id===prediction.id);
      const tens=actual.last2[0]===prediction.digit,units=actual.last2[1]===prediction.digit;
      if(tens||units)entry.hits++;
      if(tens)entry.tensHits++;
      if(units)entry.unitsHits++;
      entry.history.push({previousDate:previous.date,date:actual.date,digit:prediction.digit,last2:actual.last2,hit:tens||units,expression:prediction.expression});
    }
  }
  return results;
}
