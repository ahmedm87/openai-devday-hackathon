import React, {useEffect, useRef, useState} from 'react';
import {Icon} from './ui.jsx';

const welcome = {role: 'assistant', content: 'Tell me your starting station and destination. I can help you compare the quickest route, less walking, or fewer changes.'};
const examples = ['Waterloo to Bank', 'Victoria to Stratford with fewer changes'];

export default function JourneyChat({journey, onJourney, busy, onBusyChange, disabled, sample, onLive, aiConfigured}) {
  const [messages, setMessages] = useState([welcome]), [input, setInput] = useState('');
  const [pending, setPending] = useState(null), [expanded, setExpanded] = useState(false);
  const transcript = useRef(null);
  useEffect(() => {if (expanded && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;}, [messages, busy, expanded]);
  useEffect(() => {setPending(null);}, [journey?.origin.id, journey?.destination.id, journey?.preference, sample]);

  async function send(text, choice = null) {
    const message = text.trim();
    if (!message || busy || disabled || sample) return;
    const history = messages.filter(item => item !== welcome).slice(-6).map(({role, content}) => ({role, content: content.slice(0, 1000)}));
    setMessages(previous => [...previous, {role: 'user', content: message}]); setInput(''); setExpanded(true); onBusyChange(true);
    try {
      const context = journey ? {origin: journey.origin.id, destination: journey.destination.id, preference: journey.preference} : null;
      const response = await fetch('/api/chat', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message, history, context, pending, choice})});
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Chat is unavailable. You can still use the station fields.');
      setPending(result.pending);
      setMessages(previous => [...previous, {role: 'assistant', content: result.message, clarification: result.clarification, status: result.status}]);
      if (result.journey) onJourney(result.journey);
    } catch (failure) {setMessages(previous => [...previous, {role: 'assistant', content: failure.message, status: 'error'}]);}
    finally {onBusyChange(false);}
  }
  function clear() {setMessages([welcome]); setPending(null); setInput(''); setExpanded(false);}
  const locked = busy || disabled || sample;
  return <section className="journey-chat panel" aria-label="Conversational journey planner">
    <div className="chat-heading"><h2><Icon name="spark"/>Or, just ask.</h2><div className="chat-tools"><button className="conversation-toggle" type="button" aria-expanded={expanded} aria-controls="conversation-transcript" onClick={() => setExpanded(value => !value)}>Conversation{messages.length > 1 && <span> {messages.length - 1}</span>}<Icon name="chevron"/></button>{messages.length > 1 && <button type="button" className="clear-chat" disabled={busy} onClick={clear}>Clear</button>}</div></div>
    {expanded && <div className="chat-transcript" id="conversation-transcript" ref={transcript} role="log" aria-label="Conversation messages" aria-live="polite">{messages.map((message, index) => <div className={`chat-message ${message.role}${message.status === 'error' ? ' chat-error' : ''}`} key={index}><span className="message-author">{message.role === 'user' ? 'You' : 'Waywise'}</span><p>{message.content}</p>{index === messages.length - 1 && message.clarification?.choices?.length > 0 && <div className="station-choices" aria-label="Station choices">{message.clarification.choices.map(station => <button key={station.id} type="button" disabled={locked} onClick={() => send(station.name, {slot: message.clarification.slot, station_id: station.id})}>{station.name}<Icon name="arrow"/></button>)}</div>}</div>)}{busy && <p className="chat-thinking" role="status">Finding the journey details…</p>}</div>}
    <form className="chat-composer" onSubmit={event => {event.preventDefault(); send(input);}}><label className="sr-only" htmlFor="journey-message">Ask for a journey</label><input id="journey-message" value={input} onChange={event => setInput(event.target.value)} maxLength={1000} placeholder="e.g. Waterloo to Bank" disabled={locked} autoComplete="off"/><button type="submit" disabled={locked || !input.trim()} aria-label="Send journey request"><Icon name="arrow"/></button></form>
    {sample ? <p className="chat-sample-note">Chat uses live station data. <button type="button" disabled={busy || disabled} onClick={onLive}>Switch to Live to chat →</button></p> : <>
      {messages.length === 1 && <div className="chat-examples" aria-label="Example requests">{examples.map(example => <button type="button" disabled={locked} key={example} onClick={() => send(example)}>{example}</button>)}</div>}
      {journey && !pending && <div className="chat-refinements" aria-label="Refine current journey"><span>Same journey:</span><button type="button" disabled={locked} onClick={() => send('Same journey with less walking')}>Less walking</button><button type="button" disabled={locked} onClick={() => send('Same journey with fewer changes')}>Fewer changes</button></div>}
      {aiConfigured === false && <p className="chat-availability">Chat is unavailable until the API connection is configured. Use the station fields to plan.</p>}
    </>}
  </section>;
}
