import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { countsOf, windowDraws, MODEL_NAMES } from './engine.mjs';
import { SIX_MODEL_NAMES, SIX_MODEL_DESCRIPTIONS } from './six-engine.mjs';
import FolkFormulas from './FolkFormulas.jsx';
import './styles.css';

const dateFormat=new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'});
const timeFormat=new Intl.DateTimeFormat('th-TH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'});
const dateLabel=value=>value ? dateFormat.format(new Date(value.length===10 ? value+'T12:00:00+07:00' : value)) : '—';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const two=value=>String(value).padStart(2,'0');
const HEAT=['#c8e7b5','#acd39b','#83b47e','#5b9366','#36704f','#204c3b'];
function Icon({type='spark',...props}) {
  const paths={chart:'M3 20h18M6 16V9h3v7m4 0V4h3v12m4 0v-5',refresh:'M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3',calendar:'M4 5h16v16H4zM8 2v6m8-6v6M4 10h16',arrow:'M5 12h14m-5-5 5 5-5 5',spark:'m12 3 2 6 6 3-6 2-2 7-2-7-7-2 7-3z',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',clock:'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',trophy:'M8 3h8v8a4 4 0 0 1-8 0zM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 3v5m-4 1h8',search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',calc:'M5 2h14v20H5zM8 6h8M8 11h1m3 0h1m3 0h1M8 15h1m3 0h1m3 0h1M8 19h1m3 0h1m3 0h1'};
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" aria-hidden="true" {...props}><path d={paths[type] || paths.spark}/></svg>;
}
function Clover(){return <svg className="clover" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M6 2h8v4h4V2h8v4h4v8h-6v4h6v8h-4v4h-8v-6h-4v6H6v-4H2v-8h6v-4H2V6h4z"/><path d="M16 12v18" stroke="#547a51" strokeWidth="3"/></svg>;}
function Panel({children,className='',...props}){return <section className={`panel ${className}`} {...props}>{children}</section>;}
function App(){
  const params=new URLSearchParams(location.search);
  const [years,setYears]=useState(Number.isInteger(Number(params.get('years'))) && Number(params.get('years'))>=1 && Number(params.get('years'))<=20 ? Number(params.get('years')) : 5);
  const [selected,setSelected]=useState(/^\d{2}$/.test(params.get('number') || '') ? params.get('number') : '00');
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[networkError,setNetworkError]=useState(''),[refreshing,setRefreshing]=useState(false);
  const [first,setFirst]=useState(''),[last2,setLast2]=useState(''),[asOf,setAsOf]=useState('');
  const [errors,setErrors]=useState({}),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[calcError,setCalcError]=useState('');
  const initialized=useRef(false),worker=useRef(null),firstRef=useRef(null),lastRef=useRef(null),dateRef=useRef(null);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;let controller=new AbortController();
    const load=async()=>{try {const response=await fetch('/api/data',{signal:controller.signal});if(!response.ok)throw new Error();const next=await response.json();if(mounted.current){setData(next);setNetworkError('');}}catch(error){if(error.name!=='AbortError' && mounted.current)setNetworkError('โหลดข้อมูลไม่สำเร็จ ตรวจการเชื่อมต่อแล้วลองใหม่');}finally{if(mounted.current)setLoading(false);}};
    void load();const timer=setInterval(()=>void load(),15000);
    return()=>{mounted.current=false;controller.abort();clearInterval(timer);worker.current?.terminate();};
  },[]);
  const draws=data?.draws || [];
  const latest=draws.at(-1);
  useEffect(()=>{if(latest && !initialized.current){initialized.current=true;setFirst(latest.first);setLast2(latest.last2);setAsOf(latest.date);setSelected(current=>params.has('number') ? current : latest.last2);}},[latest?.date]);
  useEffect(()=>{const url=new URL(location.href);url.searchParams.set('years',years);url.searchParams.set('number',selected);history.replaceState(null,'',url);},[years,selected]);
  const filtered=useMemo(()=>windowDraws(draws,years),[draws,years]);
  const counts=useMemo(()=>countsOf(filtered),[filtered]);
  const maximum=Math.max(...counts,1);
  const selectedRows=filtered.filter(d=>d.last2===selected).reverse();
  const leaders=counts.map((count,number)=>({count,number})).sort((a,b)=>b.count-a.count || a.number-b.number).slice(0,3);
  const latestIsOld=latest && (new Date(today())-new Date(latest.date))/86400000>18;
  function invalidate(){setResult(null);setCalcError('');worker.current?.terminate();setBusy(false);}
  async function refresh(){if(refreshing)return;setRefreshing(true);setNetworkError('');try{const response=await fetch('/api/refresh',{method:'POST',signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error();setData(await response.json());}catch{setNetworkError('อัปเดตไม่สำเร็จ ข้อมูลเดิมยังใช้งานได้ ลองใหม่อีกครั้ง');}finally{setRefreshing(false);}}
  function changeYears(value){setYears(value);invalidate();}
  function calculate(event){event.preventDefault();const next={};if(!/^\d{6}$/.test(first))next.first='กรอกตัวเลข 6 หลัก เช่น 011781';if(!/^\d{2}$/.test(last2))next.last2='กรอกตัวเลข 2 หลัก เช่น 04';if(!asOf || asOf>today())next.asOf='เลือกวันที่งวดก่อนหน้า ไม่เกินวันนี้';setErrors(next);if(Object.keys(next).length){({first:firstRef,last2:lastRef,asOf:dateRef}[Object.keys(next)[0]]).current?.focus();return;}
    invalidate();setBusy(true);
    const training=windowDraws(draws,years,new Date(asOf+'T12:00:00+07:00'));
    const current=new Worker(new URL('./analysis.worker.js',import.meta.url),{type:'module'});worker.current=current;
    current.onmessage=({data:message})=>{setBusy(false);if(message.error)setCalcError(message.error);else setResult({...message.result,manual:!draws.some(d=>d.date===asOf && d.first===first && d.last2===last2)});current.terminate();};
    current.onerror=()=>{setBusy(false);setCalcError('คำนวณไม่สำเร็จ กรุณาลองอีกครั้ง');current.terminate();};
    current.postMessage({draws:training,context:{date:asOf,first,last2}});
  }
  function useLatest(){if(!latest)return;invalidate();setFirst(latest.first);setLast2(latest.last2);setAsOf(latest.date);setErrors({});}
  function exportCsv(){const csv='\uFEFFวันที่,รางวัลที่หนึ่ง,เลขท้ายสองตัว,แหล่งข้อมูล\n'+filtered.map(d=>`${d.date},="${d.first}",="${d.last2}",${d.source==='glo'?'GLO':'คลังข้อมูลเสริม'}`).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`lucky-pixel-${years}years.csv`;link.click();URL.revokeObjectURL(url);}
  const selectedCount=counts[Number(selected)];
  return <><a className="skip" href="#statistics">ข้ามไปตารางสถิติ</a><header className="topbar"><div className="nav-wrap"><a className="brand" href="#statistics"><Clover/><span>LUCKY<span className="brand-dot">PIXEL</span></span></a><nav aria-label="เมนูหลัก"><a className="nav-link active" href="#statistics"><Icon type="chart"/>สถิติเลขท้าย 2 ตัว</a><a className="nav-link" href="#calculate"><Icon type="calc"/>วิเคราะห์เลข</a></nav><div className="personal"><span className="tiny-pixel"/> พื้นที่ส่วนตัว</div></div></header>
  <main><div className="intro"><div><h1>เรื่องของเลข <span>ให้สถิติเล่า</span><span className="pixel-spark" aria-hidden="true">✦</span></h1><p>สำรวจผลสลากย้อนหลัง มองเห็นความถี่ แล้วเลือกด้วยข้อมูล</p></div><div className="landscape" aria-hidden="true"><span className="star s1">✦</span><span className="star s2">+</span><span className="moon"/><span className="tree t1"/><span className="tree t2"/><span className="tree t3"/><div className="ground"/></div></div>
  <div className="status-strip" role="status" aria-live="polite"><div><span className={`status-dot ${data?.error || networkError || latestIsOld ? 'warn' : ''}`}/><span>{loading?'กำลังโหลดคลังผลสลาก…':networkError || data?.error || (data?.syncing?'กำลังตรวจสอบผลล่าสุดจาก GLO…':latestIsOld?'ข้อมูลอาจยังไม่เป็นงวดล่าสุด กรุณาอัปเดต':'คลังผลสลากพร้อมใช้งาน')}</span></div><button className="text-button" onClick={refresh} disabled={refreshing || data?.syncing}><Icon type="refresh"/>{refreshing?'กำลังตรวจสอบ…':'อัปเดตข้อมูล'}</button></div>
  <div className="workspace"><div className="main-column"><Panel id="statistics" className="heat-panel"><div className="panel-heading"><div><h2><Icon type="chart"/>สถิติเลขท้าย 2 ตัว</h2><p>ทุกเลขมีเรื่องราว แตะเพื่อดูวันที่เคยออก</p></div><div className="year-picker"><label htmlFor="history-years">ย้อนหลัง</label><select id="history-years" value={years} onChange={event=>changeYears(Number(event.target.value))}>{Array.from({length:20},(_,index)=>index+1).map(value=><option key={value} value={value}>{value} ปี</option>)}</select></div></div><div className="heat-meta"><span><Icon type="calendar"/>{filtered.length?`${dateLabel(filtered[0].date)} – ${dateLabel(filtered.at(-1).date)}`:'ยังไม่มีข้อมูลในช่วงที่เลือก'}</span><strong>{filtered.length.toLocaleString('th-TH')} <span>งวด</span></strong></div>
  <div className="heatmap" aria-label={`ความถี่เลขท้ายสองตัวย้อนหลัง ${years} ปี`}>{counts.map((count,i)=>{const level=count ? Math.min(5,Math.ceil(count/maximum*5)) : 0;return <button key={i} className={`heat-cell ${selected===two(i)?'selected':''}`} style={{background:HEAT[level],color:level>=3?'#f5f3df':'#163425'}} aria-label={`เลข ${two(i)} ออก ${count} ครั้ง`} aria-pressed={selected===two(i)} onClick={()=>setSelected(two(i))}><span className="cell-number">{two(i)}</span><span className="cell-count">{count} ครั้ง</span></button>;})}</div>
  <div className="legend"><span>ความถี่ที่ออก</span><div><span>น้อย</span><div className="swatches">{HEAT.map(color=><i key={color} style={{background:color}}/>)}</div><span>มาก</span></div><span className="legend-hint">สีเข้ม = ออกบ่อย</span></div>
  <div className="frequency-summary"><span>ออกบ่อยในช่วงนี้</span>{leaders.map((item,index)=><button key={item.number} onClick={()=>setSelected(two(item.number))}><small>#{index+1}</small><strong>{two(item.number)}</strong><span>{item.count} ครั้ง</span></button>)}</div>
  <div className="coverage"><Icon type="clock"/><span>เลือกย้อนหลัง {years} ปี · แสดงเฉพาะงวดที่มีข้อมูลจริง ไม่เติมงวดที่ขาด</span><button className="icon-button" onClick={exportCsv} aria-label="ดาวน์โหลดข้อมูลช่วงที่เลือกเป็น CSV" disabled={!filtered.length}><Icon type="download"/></button></div></Panel>
  </div><aside className="side-column"><Panel className="latest-panel"><div className="panel-heading"><h2><Icon type="trophy"/>ผลสลากล่าสุดในคลัง</h2><span className="source-tag">{latest?.source==='glo'?'GLO':'ข้อมูลเสริม'}</span></div><p className="draw-date">งวดวันที่ {dateLabel(latest?.date)}</p><div className="prizes"><div><span>รางวัลที่ 1</span><strong className="first-prize">{latest?.first || '------'}</strong></div><div><span>เลขท้าย 2 ตัว</span><strong className="last-prize">{latest?.last2 || '--'}</strong></div></div><div className="source-foot"><span className="status-dot"/>แหล่งทางการ: สำนักงานสลากกินแบ่งรัฐบาล</div><p className="last-checked">ตรวจสำเร็จ {dateLabel(data?.lastSuccess)} {data?.lastSuccess?timeFormat.format(new Date(data.lastSuccess)):''} น. · ตรวจทุก 2 นาทีขณะเซิร์ฟเวอร์เปิด</p></Panel>
  <Panel className="history-panel" aria-label={`ประวัติเลข ${selected}`}><h2><Icon type="search"/>เจาะดูเลขที่คุณเลือก</h2><div className="selection-info"><strong className="selected-number">{selected}</strong><div><span>เคยออก <b>{selectedCount} ครั้ง</b></span><span>จากทั้งหมด {filtered.length} งวด</span><strong>{filtered.length?(selectedCount/filtered.length*100).toFixed(2):'0.00'}% <small>ของงวดในช่วงนี้</small></strong></div></div><div className="history-heading"><h3>วันที่เคยออก</h3><span>ย้อนหลัง {years} ปี</span></div><div className="history-list" tabIndex="0" aria-label="รายการวันที่เคยออก เลื่อนเพื่อดูเพิ่มเติม">{selectedRows.length ? selectedRows.map((row,index)=><div className="history-row" key={row.date}><span className="history-index">{two(index+1)}</span><time dateTime={row.date}>{dateLabel(row.date)}</time><a href={row.sourceUrl} target="_blank" rel="noreferrer" title="เปิดแหล่งข้อมูล">{row.source==='glo'?'GLO ↗':'ข้อมูลเสริม ↗'}</a></div>) : <p className="empty">ยังไม่พบเลขนี้ในข้อมูลช่วงที่เลือก<br/><span>ลองเลือก 10 ปี หรือ 20 ปี</span></p>}</div><p className="history-note">ความถี่ในอดีตไม่ใช่โอกาสถูกรางวัลในงวดหน้า</p></Panel></aside></div>
  <Panel id="calculate" className="calculation"><div className="panel-heading"><div><h2><Icon type="calc"/>คำนวณจากสถิติ</h2><p>ใช้สูตรคำนวณที่ให้ผลซ้ำได้ พร้อมเหตุผลและผลทดสอบย้อนหลัง</p></div><span className="formula-label">ไม่มีการสุ่มเลข <span aria-hidden="true">✦</span></span></div><form onSubmit={calculate} noValidate><div className="form-intro"><span>เริ่มจากผลของงวดก่อนหน้า</span><button type="button" className="text-button" onClick={useLatest} disabled={!latest}>ใช้ผลล่าสุด <Icon type="arrow"/></button></div><div className="form-grid"><div className="field"><label htmlFor="previous-first">รางวัลที่ 1 <small>(6 หลัก)</small></label><input id="previous-first" ref={firstRef} value={first} inputMode="numeric" maxLength={6} placeholder="เช่น 011781" aria-invalid={!!errors.first} aria-describedby="first-error" onChange={e=>{setFirst(e.target.value);invalidate();}}/><span id="first-error" className="field-error">{errors.first || ''}</span></div><div className="field"><label htmlFor="previous-last">เลขท้าย 2 ตัว</label><input id="previous-last" ref={lastRef} value={last2} inputMode="numeric" maxLength={2} placeholder="เช่น 04" aria-invalid={!!errors.last2} aria-describedby="last-error" onChange={e=>{setLast2(e.target.value);invalidate();}}/><span id="last-error" className="field-error">{errors.last2 || ''}</span></div><div className="field"><label htmlFor="context-date">วันที่งวดก่อนหน้า</label><input id="context-date" ref={dateRef} type="date" value={asOf} max={today()} aria-invalid={!!errors.asOf} aria-describedby="date-error" onChange={e=>{setAsOf(e.target.value);invalidate();}}/><span id="date-error" className="field-error">{errors.asOf || ''}</span></div><button className="calculate-button" type="submit" disabled={busy || !draws.length}><Icon type="spark"/>{busy?'กำลังทดสอบสูตร…':'วิเคราะห์เลขงวดถัดไป'}<Icon type="arrow"/></button></div></form><div className="calculation-note"><Icon type="clock"/><span>ใช้ข้อมูลย้อนหลัง {years} ปี ถึงวันที่งวดที่ระบุเท่านั้น · กรอกงวดเก่าได้โดยไม่ใช้ผลในอนาคต</span></div>
  <div role="status" aria-live="polite">{busy?<div className="analysis-pending">กำลังคำนวณอันดับ และทดสอบสูตรตามจำนวนข้อมูลที่เลือก…</div>:null}{calcError?<p className="error-message">{calcError}</p>:null}</div>
  {result?<Results result={result}/>:!busy?<div className="ready-state"><span className="ready-spark" aria-hidden="true">✧</span><div><strong>ให้ตัวเลขมีที่มา</strong><p>วิเคราะห์เลข 2 ตัว 2 ชุด และเลข 6 ตัว 1 ชุด พร้อม Top 10 ของทั้งสองประเภทและเหตุผลประกอบ</p></div><span className="ready-blocks" aria-hidden="true">▂ ▄ ▆ █</span></div>:null}
  </Panel>
  <FolkFormulas key={`${years}:${asOf}:${first}:${last2}`} draws={draws} years={years} context={{date:asOf,first,last2}}/>
  <details className="methodology" id="methodology"><summary>ข้อมูลมาจากไหน และคำนวณอย่างไร <span>+</span></summary><div className="method-content"><div><h3>แหล่งข้อมูลที่ตรวจสอบได้</h3><p>ข้อมูล GLO {draws.filter(d=>d.source==='glo').length} งวด · ข้อมูลเสริม {draws.filter(d=>d.source!=='glo').length} งวด ข้อมูลใหม่จาก GLO มีลำดับความสำคัญเหนือแหล่งเสริม โดยเก็บเลขศูนย์นำหน้าไว้เสมอ</p><a href="https://gdcatalog.glo.or.th/dataset/dataset_c4-9_01" target="_blank" rel="noreferrer">GLO Open Data ↗</a><a href="https://github.com/zugetor/Machine-Learning-for-thai-Lottery" target="_blank" rel="noreferrer">คลังข้อมูลย้อนหลังเสริม ↗</a></div><div><h3>เลือกสูตรด้วยการทดสอบตามเวลา</h3><p>ใช้ 50% แรกเริ่มฝึก เปรียบเทียบ 4 สูตรในช่วง 30% ถัดไปด้วยค่าความคลาดเคลื่อน Log loss แล้ววัดสูตรที่เลือกกับ 20% สุดท้ายที่กันไว้ ทุกงวดใช้เฉพาะผลก่อนหน้า หากมีข้อมูลน้อยกว่า 60 งวด เลข 2 ตัวใช้ความถี่สะสม ส่วน 6 ตัวใช้ความถี่ปรับเรียบ 10 โดยยังไม่เปรียบเทียบสูตรหรือรายงานผลทดสอบ รางวัลที่หนึ่งเปรียบเทียบ 9 วิธีแยกต่างหาก รวมฐานโอกาสเท่ากัน สูตรเดิม ความถี่ปรับเรียบ งวดใหม่ ความสัมพันธ์หลายระดับ และสูตรผสม เลือกด้วย Log loss รายหลักเฉลี่ยในช่วงเปรียบเทียบ แล้วตรวจชุดหลัก Top 10 และความแม่นรายหลักบนข้อมูล 20% สุดท้ายโดยไม่เปลี่ยนสูตรตามผลทดสอบ</p><p>เป็นแบบจำลองสถิติ ไม่ใช้ AI สนทนาสร้างตัวเลข คะแนนแบบจำลองไม่ใช่โอกาสถูกจริง และยังไม่อ้างว่าชนะการสุ่มได้</p></div></div></details>
  <footer><a className="footer-brand" href="#statistics"><Clover/>LUCKY PIXEL</a><span>อ่านอดีตให้เข้าใจ · ผลงวดหน้ารับประกันไม่ได้</span><span>สร้างไว้ใช้ส่วนตัว <span className="footer-star">✦</span></span></footer></main></>;
}
function TopTenTable({title,rows,six=false}){
  return <section className={`top-ten-panel ${six?'six-ranking':''}`} aria-label={title}>
    <h4>{title}</h4>
    <p className="ranking-explanation">{six?'เรียงผลคูณน้ำหนักของทั้ง 6 หลัก โดยสมมติว่าแต่ละหลักเป็นอิสระ':'เรียงคะแนนจากสูตรเดียวกับเลข 2 ชุดหลัก อันดับ 1–2 คือชุดหลัก'}</p>
    <div className="table-scroll"><table className="ranking-table">
      <caption className="sr-only">{title} เรียงจากคะแนนมากไปน้อย</caption>
      <thead><tr><th scope="col">อันดับ</th><th scope="col">เลข</th><th scope="col">น้ำหนักโมเดล</th><th scope="col">ที่มา</th></tr></thead>
      <tbody>{rows.map((item,index)=><tr key={item.number} className={index<2&&!six?'primary-ranking':''}>
        <td>{index+1}</td><td><strong className="ranked-number">{item.number}</strong></td><td>{(item.score*100).toFixed(six?6:2)}%</td>
        <td><details className="rank-reason"><summary>ดูเหตุผล</summary><p>{item.reason}</p>{!six?<p>เคยออก {item.count} ครั้ง · ล่าสุด {dateLabel(item.latest)}</p>:null}</details></td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}
function SixValidation({result}){
  const validation=result.sixValidation;
  return <section className="six-validation" aria-label="เปรียบเทียบสูตรรางวัลที่หนึ่ง">
    <div className="results-title"><h3><Icon type="trophy"/>เปรียบเทียบสูตรรางวัลที่หนึ่ง 6 ตัว</h3><span>{SIX_MODEL_NAMES[result.sixModel]}</span></div>
    {!validation?<p className="honesty-note">มีข้อมูล {result.trainingCount} งวด ยังไม่ถึง 60 งวด ใช้ความถี่รายหลักปรับเรียบ 10 เป็นสูตรตั้งต้น ยังไม่ได้เลือกสูตรหรือวัดผลกับชุดทดสอบ</p>:<>
      <p className="six-selection-note">เลือกจาก 9 วิธีด้วย Log loss รายหลักเฉลี่ยต่ำสุดในช่วง {dateLabel(validation.selectionFrom)} – {dateLabel(validation.selectionTo)} แล้วตรึงสูตรก่อนทดสอบ {validation.total} งวดสุดท้าย ({dateLabel(validation.holdoutFrom)} – {dateLabel(validation.holdoutTo)}) แต่ละงวดเรียนรู้ได้เฉพาะผลก่อนหน้า</p>
      <p className="six-verdict">{result.sixModel==='uniform'?'ช่วงเปรียบเทียบเลือกฐานโอกาสเท่ากัน ทุกเลข 6 ตัวจึงมีน้ำหนักเสมอกัน ยังจัดอันดับเลขเด่นไม่ได้ จึงไม่แสดงเลขชุดหลักหรือ Top 10 ของฐานนี้':`ชุดทดสอบ: Log loss ของสูตรที่เลือก ${validation.selected.loss<validation.uniform.loss?'ต่ำกว่า':'ไม่ต่ำกว่า'}ฐานโอกาสเท่ากัน และ${validation.selected.loss<validation.legacy.loss?'ต่ำกว่า':'ไม่ต่ำกว่า'}สูตรเดิม ผลนี้ยังไม่พิสูจน์ความได้เปรียบในงวดหน้า`}</p>
      <div className="validation six-metrics">
        <div><span>ถูกครบ 6 ตัว · ชุดหลัก</span><strong>{validation.selected.exactHits}<small> / {validation.total} งวด</small></strong></div>
        <div><span>ถูกครบ 6 ตัว · Top 10</span><strong>{validation.selected.topTenHits}<small> / {validation.total} งวด</small></strong></div>
        <div><span>ถูกเลขตรงตำแหน่ง</span><strong>{(validation.selected.digitHits/(validation.total*6)*100).toFixed(2)}<small>%</small></strong><p>{validation.selected.digitHits} จาก {validation.total*6} ตำแหน่ง · ไม่ใช่อัตราถูกครบ 6 ตัว</p></div>
      </div>
      <div className="table-scroll"><table className="six-holdout-table"><caption>ผลบนงวดทดสอบชุดเดียวกัน · Log loss ยิ่งต่ำยิ่งดี</caption><thead><tr><th scope="col">สูตร</th><th scope="col">Log loss รายหลัก</th><th scope="col">ถูกครบชุดหลัก</th><th scope="col">ถูกครบใน Top 10</th><th scope="col">ถูกตรงตำแหน่ง</th></tr></thead><tbody>
        {[['สูตรที่เลือก',validation.selected],...(result.sixModel==='uniform'?[['สูตรสถิติที่ดีที่สุดในช่วงเปรียบเทียบ (ทดลอง)',validation.statistical]]:[]),['สูตรเดิม',validation.legacy],['ฐานโอกาสเท่ากัน',validation.uniform]].map(([label,item])=><tr key={label}><th scope="row">{label}<small>{SIX_MODEL_NAMES[item.model]}</small></th><td>{item.loss.toFixed(6)}</td><td>{item.exactHits} / {item.total}</td><td>{item.topTenHits} / {item.total}</td><td>{(item.digitHits/(item.total*6)*100).toFixed(2)}%</td></tr>)}
      </tbody></table></div>
      <p className="honesty-note">Log loss คำนวณจากน้ำหนักที่ให้เลขจริงแต่ละหลักแล้วเฉลี่ย ไม่ใช่อัตราถูกรางวัล ฐานเท่าเทียมมีค่า ln(10) ≈ 2.302585 · เมื่อคะแนนเท่ากันเลือกเลขน้อยก่อน รวมถึงฐานเท่าเทียมที่ใช้ 000000 เป็นชุดหลักและ 000000–000009 เป็น Top 10 ในการนับถูก · ภายใต้โอกาสเท่ากัน ชุดหลักหนึ่งชุดมีโอกาส 0.0001% และ 10 ชุดต่างกันรวม 0.001%</p>
      <details className="comparison six-comparison"><summary>ดูทั้ง 9 วิธีและคะแนนที่ใช้เลือกสูตร</summary><div className="table-scroll"><table><thead><tr><th scope="col">วิธี</th><th scope="col">Log loss ช่วงเปรียบเทียบ ↓</th><th scope="col">เหตุผลและค่าที่ใช้</th></tr></thead><tbody>{validation.comparisons.map(item=><tr key={item.model}><th scope="row">{SIX_MODEL_NAMES[item.model]}{item.model===result.sixModel?' · เลือกใช้':''}</th><td>{item.loss.toFixed(6)}</td><td>{SIX_MODEL_DESCRIPTIONS[item.model]}</td></tr>)}</tbody></table></div><p>ช่วงเปรียบเทียบ {validation.comparisons[0].total} งวด · กำหนดสูตรและน้ำหนักไว้ก่อนทดสอบ · ไม่ใช้ผลทดสอบสุดท้ายย้อนกลับมาเลือกสูตร</p></details>
    </>}
  </section>;
}
function Results({result}){
  const v=result.validation;
  const [showAlternative,setShowAlternative]=useState(false);
  const alternative=showAlternative?result.sixAlternative:null;
  const displayedSix=alternative?.topTen || result.sixTopTen;
  const displayedSixModel=alternative?.model || result.sixModel;
  return <div className="results">
    <div className="results-title"><h3><Icon type="spark"/>ผลการวิเคราะห์งวดถัดจาก {dateLabel(result.context.date)}</h3><span>{MODEL_NAMES[result.model]}</span></div>
    {result.manual?<p className="manual-note">ใช้เลขงวดก่อนที่คุณกรอกเอง ยังไม่ตรงกับข้อมูลยืนยันในคลัง · ไม่บันทึกเป็นผลจริง</p>:null}
    <div className="result-grid">
      {result.candidates.map((item,index)=><article className="result-card" key={item.number}><span className="result-caption">เลขท้าย 2 ตัว · ชุดที่ {index+1}</span><strong className="result-number">{item.number}</strong><div className="model-score">น้ำหนักจากแบบจำลอง {(item.score*100).toFixed(2)}%</div><p className="candidate-reason">{item.reason}</p><p>เคยออก {item.count} ครั้ง จาก {result.trainingCount} งวด{item.latest ? ` · ล่าสุด ${dateLabel(item.latest)}` : ' · ยังไม่เคยออกในช่วงนี้'}</p></article>)}
      <article className="result-card six-result"><span className="result-caption">รางวัลที่ 1 · เลข 6 ตัว{alternative?' · ทดลอง':''}</span>{displayedSix.length?<strong className="result-number">{displayedSix[0].number}</strong>:<strong className="no-six-number">ยังไม่มีเลขเด่น</strong>}<div className="model-score">{SIX_MODEL_NAMES[displayedSixModel]}</div><p>{alternative?.description || result.sixDescription}</p>{alternative?<p className="alternative-warning">เลือกดูสูตรสถิติเพื่อทดลอง ยังไม่มีหลักฐานว่าเหนือฐานโอกาสเท่ากัน</p>:null}</article>
    </div>
    <p className="reason">{v?'สูตรที่เลือกมี Log loss ต่ำสุดในช่วงเปรียบเทียบ จาก 4 วิธี':`ช่วงที่เลือกมี ${result.trainingCount} งวด ยังไม่ถึง 60 งวด จึงใช้ความถี่สะสมแทนการเลือกสูตร และยังไม่รายงานผลทดสอบย้อนหลัง`}{result.model==='transition'?` · พบงวดก่อนหน้าที่เลขท้ายตรงกับ ${result.context.last2} จำนวน ${result.transitionSamples} ครั้ง ใช้ร่วมกับความถี่สะสมเพื่อลดผลจากตัวอย่างน้อย`:''} · ข้อมูลถึง {dateLabel(result.asOf)}</p>
    <div className="top-ten-heading"><h3>Top 10 จากคะแนนแบบจำลอง</h3><p>เป็นอันดับทางสถิติ ไม่ใช่โอกาสถูกรางวัลที่ยืนยันแล้ว · คะแนนเท่ากันเรียงเลขน้อยก่อน</p></div>
    <div className="top-ten-grid"><TopTenTable title="เลขท้าย 2 ตัว · Top 10" rows={result.topTen}/><div className="six-ranking-area">
      {result.sixNoRanking?<div className="no-six-ranking" role="status"><h4>ยังจัดอันดับเลขเด่น 6 ตัวไม่ได้</h4><p>ทุกเลขตั้งแต่ 000000 ถึง 999999 มีน้ำหนักเท่ากันในสูตรที่เลือก จึงไม่มี Top 10 ที่เด่นกว่าเลขอื่น</p>{result.sixAlternative?<><button type="button" className="alternative-button" aria-expanded={showAlternative} aria-controls="experimental-six-ranking" onClick={()=>setShowAlternative(value=>!value)}>{showAlternative?'ซ่อนสูตรทดลอง':'ดู Top 10 จากสูตรสถิติ (ทดลอง)'}</button><p>สูตรทดลองเลือกจากคะแนนช่วงเปรียบเทียบเท่านั้น ไม่ได้เลือกจากผลทดสอบสุดท้าย</p></>:null}</div>:null}
      {displayedSix.length?<div id="experimental-six-ranking">{alternative?<div className="alternative-disclosure"><strong>สูตรทดลอง: {SIX_MODEL_NAMES[alternative.model]}</strong><p>Log loss ชุดทดสอบ {alternative.evaluation.loss.toFixed(6)} เทียบฐานเท่าเทียม {result.sixValidation.uniform.loss.toFixed(6)} ({alternative.evaluation.loss<result.sixValidation.uniform.loss?'ต่ำกว่าในชุดทดสอบนี้ แต่ยังไม่พิสูจน์ผลในอนาคต':'ยังไม่เหนือฐานเท่าเทียมในชุดทดสอบนี้'})</p><p>ถูกครบใน Top 10 {alternative.evaluation.topTenHits} / {alternative.evaluation.total} งวด · เป็นผลของสูตรทดลองเท่านั้น</p></div>:null}<TopTenTable title={`รางวัลที่ 1 เลข 6 ตัว · Top 10${alternative?' (ทดลอง)':''}`} rows={displayedSix} six/></div>:null}
    </div></div>
    {v?<>
      <h3 className="validation-heading">ผลทดสอบเลขท้าย 2 ตัว</h3><div className="validation two-validation">
        <div><span>ทดสอบเลข 2 ชุดหลัก</span><strong>{v.hits}<small> / {v.total} งวด</small></strong><p>ถูกตรงอย่างน้อย 1 จาก 2 ชุด · {(v.hits/v.total*100).toFixed(2)}%</p></div>
        <div><span>ทดสอบเลข 2 ตัว Top 10</span><strong>{v.topTenHits}<small> / {v.total} งวด</small></strong><p>ถูกตรงใน 10 ชุด · {(v.topTenHits/v.total*100).toFixed(2)}%</p></div>

      </div>
      <p className="honesty-note">ผลทดสอบจำนวนจำกัดยังสรุปไม่ได้ว่าได้เปรียบในงวดหน้า ค่าอ้างอิงเมื่อออกรางวัลเท่าเทียม: เลือกเลข 2 ตัวต่างกัน 2 ชุด = 2%, 10 ชุด = 10% · เลข 6 ตัวหนึ่งชุด = 0.0001% · ทดสอบ {dateLabel(v.holdoutFrom)} – {dateLabel(v.holdoutTo)}</p>
      <details className="comparison"><summary>เปรียบเทียบสูตรทั้ง 4 วิธี</summary><div className="table-scroll"><table><thead><tr><th>สูตร</th><th>Log loss ↓</th><th>ถูก / งวดเปรียบเทียบ</th></tr></thead><tbody>{v.comparisons.map(item=><tr key={item.model}><td>{MODEL_NAMES[item.model]}{item.model===result.model?' · เลือกใช้':''}</td><td>{item.loss.toFixed(4)}</td><td>{item.hits} / {item.total}</td></tr>)}</tbody></table></div><p>Log loss ต่ำหมายถึงให้คะแนนผลจริงได้ดีกว่าในช่วงเปรียบเทียบ · งวดทดสอบสุดท้ายไม่ได้ใช้เลือกสูตร</p></details>
    </>:<p className="honesty-note">ยังไม่มีผลทดสอบแยกชุดสำหรับช่วงข้อมูลนี้ · เพิ่มจำนวนปีเพื่อเปรียบเทียบสูตรได้เมื่อมีอย่างน้อย 60 งวด คะแนนและอันดับไม่รับรองผลในงวดหน้า</p>}
    <SixValidation result={result}/>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
