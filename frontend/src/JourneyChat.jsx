import React, {useEffect, useImperativeHandle, useRef, useState} from 'react';
import {Icon} from './ui.jsx';

const welcome = {role: 'assistant', content: 'Which London stations are you travelling between? I can compare quickest, less walking or fewer changes.'};

export default function JourneyChat({requestRef, journey, onJourney, busy, onBusyChange, disabled, sample, onLive, aiConfigured, onOpen, onSent, acquire, release}) {
  const [messages, setMessages] = useState([welcome]), [pending, setPending] = useState(null);
  const transcript = useRef(null), sending = useRef(false);
  useEffect(() => {if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;}, [messages, busy]);
  useEffect(() => {setPending(null);}, [journey?.origin.id, journey?.destination.id, journey?.preference, sample]);
  useImperativeHandle(requestRef, () => ({send}));

  async function send(text, choice = null) {
    const message = text.trim();
    if (!message || sending.current || busy || disabled || sample || aiConfigured === false || !acquire()) return;
    sending.current = true;
    const history = messages.filter(item => item !== welcome).slice(-6).map(({role, content}) => ({role, content: content.slice(0, 1000)}));
    setMessages(previous => [...previous, {role: 'user', content: message}]); onSent(); onOpen(); onBusyChange(true);
    try {
      const context = journey ? {origin: journey.origin.id, destination: journey.destination.id, preference: journey.preference} : null;
      const response = await fetch('/api/chat', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message, history, context, pending, choice})});
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Chat is unavailable. Use Journey to select stations.');
      setPending(result.pending);
      setMessages(previous => [...previous, {role: 'assistant', content: result.message, clarification: result.clarification, status: result.status}]);
      if (result.journey) onJourney(result.journey); else onOpen();
    } catch (failure) {setMessages(previous => [...previous, {role: 'assistant', content: failure.message, status: 'error'}]); onOpen();}
    finally {sending.current = false; onBusyChange(false); release();}
  }
  const locked = busy || disabled || sample || aiConfigured === false;
  return <section className="journey-chat" aria-label="Conversational journey planner">
    {sample ? <p className="chat-note">Chat is disabled for this fictional example. <button type="button" disabled={busy || disabled} onClick={onLive}>Switch to Live</button></p> : aiConfigured === false ? <p className="chat-note" role="status">Ask AI is unavailable until the API connection is configured. Use Journey to select London stations.</p> : <>
      <div className="chat-transcript" ref={transcript} role="log" aria-label="Conversation messages" aria-live="polite">{messages.map((message, index) => <div className={`chat-message ${message.role}${message.status === 'error' ? ' chat-error' : ''}`} key={index}><span className="message-author">{message.role === 'user' ? 'You' : 'Waywise'}</span><p>{message.content}</p>{index === messages.length - 1 && message.clarification?.choices?.length > 0 && <div className="station-choices" aria-label="Station choices">{message.clarification.choices.map(station => <button key={station.id} type="button" disabled={locked} onClick={() => send(station.name, {slot: message.clarification.slot, station_id: station.id})}>{station.name}<Icon name="arrow"/></button>)}</div>}</div>)}{busy && <p className="chat-thinking" role="status">Finding the journey details…</p>}</div>
      {messages.length === 1 && <div className="chat-examples">{['Waterloo to Bank', 'Victoria to Stratford with fewer changes'].map(example => <button type="button" disabled={locked} key={example} onClick={() => send(example)}>{example}</button>)}</div>}
      {journey && !pending && <div className="chat-refinements"><span>Same journey:</span><button type="button" disabled={locked} onClick={() => send('Same journey with less walking')}>Less walking</button><button type="button" disabled={locked} onClick={() => send('Same journey with fewer changes')}>Fewer changes</button></div>}
    </>}
    {messages.length > 1 && <button className="text-button clear-chat" type="button" disabled={busy} onClick={() => {setMessages([welcome]); setPending(null); onSent();}}>Clear conversation</button>}
  </section>;
}
