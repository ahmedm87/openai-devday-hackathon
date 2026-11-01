import React from 'react';
import {walkingTradeoff,destinationRain} from '../walkingTradeoff.js';
export default function WalkingTradeoff({data,budget,onBudget,onShow,disabled}) {
  const choice=walkingTradeoff(data.routes,budget), rain=destinationRain(data,choice?.winner);
  return <section className="walking-tradeoff" aria-label="Worth the extra minutes?">
    <div className="decision-controls"><h3>Worth the extra minutes?</h3>{data.sample && <small>Fictional sample</small>}<p>How much extra time would you trade for less walking?</p>
    <label className="tradeoff-slider"><span>0 min</span><input type="range" min="0" max="15" step="1" value={budget} disabled={disabled} aria-label="Extra travel minutes for less walking" aria-valuetext={`${budget} extra minutes`} onChange={e=>onBudget(Number(e.target.value))}/><span>15 min</span></label>
    <output className="tradeoff-budget">{budget} min extra</output></div><div className="decision-outcome">
    <div className="tradeoff-comparison" aria-live="polite" aria-atomic="true">{choice?.improved ? <><small>YOUR TRADE-OFF · OPTION {data.routes.findIndex(r=>r.id===choice.winner.id)+1}</small><strong>+{choice.extraMinutes} minutes travelling</strong><strong>−{choice.walkingSaved} minutes of reported walking</strong></> : <p>{choice ? `No returned route reduces reported walking within ${budget} extra minute${budget===1?'':'s'}.` : 'Walking comparison is unavailable for these routes.'}</p>}</div>
    {choice && <button className="tradeoff-show" type="button" disabled={disabled} onClick={()=>onShow(choice.winner.id)}>{choice.improved?'Show this route':'Show fastest returned route'}</button>}
    </div><p className="decision-weather">{rain!==null ? `${data.sample?'Illustrative rain forecast':'Rain forecast'} near your destination: ${rain}%.` : 'Rain forecast near your destination unavailable for this arrival hour.'}</p><p className="tradeoff-note">Compares the returned options only. Walking means reported walking legs; movement inside stations may be unreported.</p>
  </section>;
}
