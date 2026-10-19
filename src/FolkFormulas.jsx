import React,{useMemo,useRef,useState} from 'react';
import {windowDraws} from './engine.mjs';
import {FOLK_FORMULAS,calculateFolk,backtestFolk} from './folk-engine.mjs';

const formatter=new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'});
const dateLabel=value=>formatter.format(new Date(value+'T12:00:00+07:00'));

export default function FolkFormulas({draws,years,context}){
  const [targetDate,setTargetDate]=useState(()=>draws.find(row=>row.date>context.date)?.date || '');
  const [constant,setConstant]=useState('0');
  const [submitted,setSubmitted]=useState(null),[error,setError]=useState('');
  const dateRef=useRef(null),constantRef=useRef(null);
  const result=useMemo(()=>{
    if(!submitted)return null;
    const history=windowDraws(draws,years,new Date(context.date+'T12:00:00+07:00'));
    return {predictions:calculateFolk(context,submitted.targetDate,submitted.constant),backtest:backtestFolk(history,submitted.constant),historyCount:history.length};
  },[submitted,draws,years,context.date,context.first,context.last2]);
  function clear(){setSubmitted(null);setError('');}
  function submit(event){
    event.preventDefault();
    const number=constant.trim()===''?NaN:Number(constant);
    try{
      calculateFolk(context,targetDate,number);
      setSubmitted({targetDate,constant:number});setError('');
    }catch(cause){setSubmitted(null);setError(cause.message);if(!Number.isInteger(number)||number<0||number>99)constantRef.current?.focus();else dateRef.current?.focus();}
  }
  const invalidConstant=!!error&&(!/^\d{1,2}$/.test(constant));
  return <section className="panel folk-formulas" id="folk-formulas" aria-label="สูตรเลขเด่นทดลอง">
    <div className="panel-heading"><div><h2>สูตรเลขเด่นทดลอง</h2><p>เพิ่มจากสูตรที่คุณให้มา คำนวณแยกจากแบบจำลองสถิติด้านบน</p></div><span className="formula-label">เลขเด่น 1 หลัก</span></div>
    <p className="folk-context">ใช้ผลจากช่องด้านบน: รางวัลที่หนึ่ง <b>{context.first || '—'}</b> · เลขท้าย 2 ตัว <b>{context.last2 || '—'}</b> · งวดก่อนหน้า {context.date?dateLabel(context.date):'—'}</p>
    <p className="honesty-note">“3 ตัวบน” ในหมวดนี้หมายถึงสามหลักท้ายของรางวัลที่หนึ่ง สูตรวันที่ใช้เลขวันที่จริงของงวดเป้าหมาย ไม่มีเลขมงคลหรือเลขคงที่ซ่อนไว้</p>
    <form onSubmit={submit} noValidate>
      <div className="folk-inputs"><div className="field"><label htmlFor="folk-target-date">วันที่งวดเป้าหมาย</label><input id="folk-target-date" ref={dateRef} type="date" value={targetDate} min={context.date || undefined} aria-invalid={!!error&&!invalidConstant} aria-describedby="folk-error folk-date-help" onChange={event=>{setTargetDate(event.target.value);clear();}}/><small id="folk-date-help">ระบุวันออกรางวัลจริง รวมงวดที่เลื่อนวัน</small></div>
      <div className="field"><label htmlFor="folk-constant">เลขคงที่สำหรับสูตรวันที่ (0–99)</label><input id="folk-constant" ref={constantRef} inputMode="numeric" maxLength={2} value={constant} aria-invalid={invalidConstant} aria-describedby="folk-error folk-constant-help" onChange={event=>{setConstant(event.target.value);clear();}}/><small id="folk-constant-help">ใส่ 0 เมื่อต้องการไม่เพิ่มเลขคงที่</small></div>
      <button className="calculate-button" type="submit" disabled={!draws.length}>คำนวณสูตรทดลอง</button></div>
      <p id="folk-error" className="field-error" role="status" aria-live="polite">{error}</p>
    </form>
    {result?<div className="folk-results"><p className="folk-result-context">เลขเด่นสำหรับวันที่ {dateLabel(submitted.targetDate)} · ใช้ข้อมูลย้อนหลัง {years} ปีถึงงวดก่อนหน้าเท่านั้น</p><div className="folk-cards">
      {result.predictions.map(prediction=>{const test=result.backtest.find(row=>row.id===prediction.id);return <article className="result-card folk-card" key={prediction.id} aria-label={prediction.name}>
        <h3>{prediction.name}</h3><p>{prediction.description}</p><strong className="folk-digit">{prediction.digit}</strong><p className="folk-expression">{prediction.expression} → หลักหน่วย {prediction.digit}</p>
        <div className="folk-test"><span>พบเลขเด่นในเลขท้าย 2 ตัว</span><strong>{test.hits}<small> / {test.total} งวด</small></strong><p>{test.total?`${(test.hits/test.total*100).toFixed(2)}% · ตรงหลักสิบ ${test.tensHits} งวด · ตรงหลักหน่วย ${test.unitsHits} งวด`:'ต้องมีประวัติอย่างน้อย 2 งวดเพื่อดูผลย้อนหลัง'}</p></div>
        {test.total?<details className="comparison folk-history"><summary>ดูประวัติการคำนวณ {test.total} งวด</summary><div className="folk-history-scroll" tabIndex="0" aria-label={`ประวัติสูตร${prediction.name}`}><table><thead><tr><th scope="col">งวดเป้าหมาย</th><th scope="col">เลขเด่น</th><th scope="col">ผล 2 ตัว</th><th scope="col">ผลเทียบ</th></tr></thead><tbody>{[...test.history].reverse().map(row=><tr key={row.date}><td>{dateLabel(row.date)}</td><td>{row.digit}</td><td>{row.last2}</td><td>{row.hit?'พบเลขเด่น':'ไม่พบ'}</td></tr>)}</tbody></table></div></details>:null}
      </article>;})}
    </div><p className="honesty-note">ผลย้อนหลังนี้วัดว่าเลขเด่น 1 หลักปรากฏในหลักสิบหรือหลักหน่วยของรางวัลเลขท้าย 2 ตัวหรือไม่ นับหนึ่งครั้งต่องวด แม้ปรากฏทั้งสองหลัก ไม่ใช่อัตราถูกเลข 2 ตัวตรงหรือรางวัลที่หนึ่ง และไม่ใช่ชุดทดสอบที่กันไว้ต่างหาก การลองเปลี่ยนเลขคงที่หลังดูผลไม่ได้พิสูจน์ว่าสูตรแม่นขึ้น</p></div>:<div className="folk-ready">{FOLK_FORMULAS.map(formula=><div key={formula.id}><strong>{formula.name}</strong><p>{formula.description}</p></div>)}<p>ระบุวันที่งวดเป้าหมาย แล้วกดคำนวณเพื่อดูวิธีคิดและผลย้อนหลัง</p></div>}
  </section>;
}
