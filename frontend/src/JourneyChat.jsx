import React, { useEffect, useRef, useState } from 'react';

const welcome = {role:'assistant', content:'Tell me your starting station and destination. I can find the quickest journey, reduce walking, or look for fewer changes.'};
const examples = ['Waterloo to Bank', 'King’s Cross to Paddington', 'Victoria to Stratford with fewer changes'];

export default function JourneyChat({journey, onJourney, busy, onBusyChange, disabled, sample, onLive}) {
  const [messages, setMessages] = useState([welcome]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(null);
  const end = useRef(null);
  useEffect(()=>{ if(messages.length>1)end.current?.scrollIntoView({block:'nearest',behavior:'smooth'}); },[messages,busy]);
  useEffect(()=>{setPending(null);},[journey?.origin.id,journey?.destination.id,journey?.preference,sample]);

  async function send(text, choice=null) {
    text=text.trim();
    if(!text||busy||disabled||sample)return;
    const history=messages.slice(-6).map(m=>({role:m.role,content:m.content.slice(0,1000)}));
    setMessages(current=>[...current,{role:'user',content:text}]);
    setInput('');onBusyChange(true);
    try {
      const context=journey?{origin:journey.origin.id,destination:journey.destination.id,preference:journey.preference||'fastest'}:null;
      const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history,context,pending,choice})});
      const result=await response.json();
      if(!response.ok)throw new Error(typeof result.detail==='string'?result.detail:'Please try a shorter journey request.');
      setPending(result.pending);
      setMessages(current=>[...current,{role:'assistant',content:result.message,clarification:result.clarification,status:result.status}]);
      if(result.journey)onJourney(result.journey);
    } catch(error) {
      setMessages(current=>[...current,{role:'assistant',content:error.message||'The assistant is unavailable. The guided planner is still available.',status:'unavailable'}]);
    } finally {onBusyChange(false);}
  }

  return <section className="chat-panel" aria-label="Journey assistant">
    <div className="chat-intro"><div className="eyebrow">ASK WAYWISE</div><h2>A journey in your own words.</h2><p>Tell us where you’re going. Refine the route with less walking or fewer changes.</p><span className="chat-context">{journey&&!sample?`Current trip: ${journey.origin.name} → ${journey.destination.name}`:'London stations · Leaving now'}</span><small>Chat history lasts for this page session.</small></div>
    <div className="chat-main"><div className="chat-toolbar"><span><i className="chat-dot"/>Journey assistant</span><button type="button" disabled={busy||messages.length===1} onClick={()=>{setMessages([welcome]);setPending(null);setInput('');}}>Clear chat</button></div>
      <div className="chat-log" role="log" aria-label="Conversation" aria-live="polite">{messages.map((message,index)=><div key={index} className={'chat-message '+message.role}><span className="chat-speaker">{message.role==='user'?'YOU':'WAYWISE'}</span><p>{message.content}</p>
        {message.status==='journey'&&<span className="chat-result-tag">Live journey updated ↓</span>}
        {index===messages.length-1&&message.clarification?.choices?.length>0&&<div className="station-choices" aria-label="Choose a station">{message.clarification.choices.map(station=><button key={station.id} type="button" disabled={busy||disabled||sample} onClick={()=>send(`Use ${station.name}`,{slot:message.clarification.slot,station_id:station.id})}>{station.name}<span>↗</span></button>)}</div>}
      </div>)}{busy&&<div className="chat-message assistant chat-thinking" role="status"><span className="chat-pulse"/>Finding your way…</div>}<div ref={end}/></div>
      {sample?<div className="chat-sample-note">Chat uses live journeys.<button type="button" onClick={onLive}>Switch to live mode →</button></div>:<>
      {messages.length===1&&<div className="chat-examples">{examples.map(example=><button key={example} type="button" disabled={busy||disabled} onClick={()=>send(example)}>{example} ↗</button>)}</div>}
      {journey&&!pending&&<div className="chat-refinements"><span>REFINE THIS TRIP</span><button type="button" disabled={busy||disabled} onClick={()=>send('Same journey, but with less walking')}>Less walking</button><button type="button" disabled={busy||disabled} onClick={()=>send('Same journey, but with fewer changes')}>Fewer changes</button></div>}
      <form className="chat-form" onSubmit={event=>{event.preventDefault();send(input);}}><label className="sr-only" htmlFor="journey-message">Ask for a London journey</label><input id="journey-message" value={input} onChange={event=>setInput(event.target.value)} maxLength={1000} placeholder={pending?.awaiting_slot==='origin'?'Which station are you starting from?':pending?.awaiting_slot==='destination'?'Which station are you travelling to?':'Try “Waterloo to Bank with less walking”'} disabled={busy||disabled} autoComplete="off"/><button type="submit" disabled={busy||disabled||!input.trim()} aria-label="Send journey request">{busy?'…':'↑'}</button></form></>}
    </div>
  </section>;
}
