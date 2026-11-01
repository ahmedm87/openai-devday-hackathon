import React, {useEffect, useRef} from 'react';
import JourneyControls from './JourneyControls.jsx';
import JourneyChat from '../JourneyChat.jsx';
import {Icon} from '../ui.jsx';

export default function SearchDock({mode, onMode, open, onOpen, journey, chatRef, chatProps, controlsProps, working}) {
  const [message, setMessage] = React.useState('');
  const input = useRef(null), trigger = useRef(null);
  useEffect(() => {if (open && mode === 'chat') input.current?.focus();}, [mode, open]);
  function close() {onOpen(false); (mode === 'chat' ? input : trigger).current?.focus();}
  return <section className="search-dock" data-map-overlay="top" aria-label="Journey search">
    <div className="search-surface">
      <Icon name={mode === 'chat' ? 'spark' : 'search'}/>
      {mode === 'journey' ? <button ref={trigger} type="button" className="search-trigger" aria-expanded={open} aria-controls="search-panel" onClick={() => onOpen(!open)}><strong>{journey ? `${journey.origin.name} → ${journey.destination.name}` : 'Where would you like to go?'}</strong><small>London stations · leave now</small></button>
        : <form className="ask-surface" onSubmit={event => {event.preventDefault(); chatRef.current?.send(message);}}><label className="sr-only" htmlFor="map-question">Ask Waywise for a journey</label><input ref={input} id="map-question" value={message} maxLength={1000} onFocus={() => onOpen(true)} onChange={event => setMessage(event.target.value)} placeholder="Ask Waywise for a journey…" disabled={working || chatProps.sample || chatProps.aiConfigured === false}/><button type="submit" aria-label="Send journey request" disabled={working || !message.trim() || chatProps.sample || chatProps.aiConfigured === false}><Icon name="arrow"/></button></form>}
      {mode === 'journey' && <button className="icon-button search-expand" type="button" aria-label={open ? 'Close journey search' : 'Open journey search'} onClick={() => open ? close() : onOpen(true)}><Icon name="chevron"/></button>}
    </div>
    <div className="search-tabs" role="tablist" aria-label="Search mode"><button role="tab" aria-selected={mode === 'journey'} type="button" onClick={() => {onMode('journey'); onOpen(true);}}><Icon name="pin"/>Journey</button><button role="tab" aria-selected={mode === 'chat'} type="button" onClick={() => {onMode('chat'); onOpen(true);}}><Icon name="spark"/>Ask AI</button><span>London time</span></div>
    <div id="search-panel" className="search-popover" hidden={!open}>
      <div className="popover-heading"><span>{mode === 'journey' ? 'Plan between London stations' : 'Conversation'}</span><button type="button" className="icon-button" aria-label="Close search panel" onClick={close}>×</button></div>
      <div hidden={mode !== 'journey'}><JourneyControls {...controlsProps}/></div>
      <div hidden={mode !== 'chat'}><JourneyChat {...chatProps} requestRef={chatRef} journey={journey} onOpen={() => onOpen(true)} onSent={() => setMessage('')}/></div>
    </div>
  </section>;
}
