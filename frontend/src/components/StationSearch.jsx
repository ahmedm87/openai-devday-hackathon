import React, {useEffect, useId, useRef, useState} from 'react';

export default function StationSearch({label, stations, value, onChange, disabled}) {
  const id = useId(), focused = useRef(false);
  const [text, setText] = useState(''), [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const selected = stations.find(station => station.id === value);
  useEffect(() => {
    if (selected) setText(selected.name);
    else if (!focused.current) setText('');
  }, [value, stations]);
  const query = text.toLocaleLowerCase().replace(/[’']/g, '');
  const matches = stations.filter(station => station.name.toLocaleLowerCase().replace(/[’']/g, '').includes(query)).slice(0, 7);
  function choose(station) {setText(station.name); onChange(station.id); setOpen(false); setActive(-1);}
  function keyboard(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      setActive(index => Math.max(0, Math.min(matches.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
    } else if (event.key === 'Enter' && open && !selected) {
      event.preventDefault();
      if (active >= 0 && matches[active]) choose(matches[active]);
      else if (matches.length === 1) choose(matches[0]);
    } else if (event.key === 'Escape' && open) {event.preventDefault(); event.stopPropagation(); setOpen(false);}
  }
  return <div className="station-search">
    <label htmlFor={id}>{label}</label>
    <input id={id} role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-suggestions`} aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
      value={text} placeholder="Search London stations" autoComplete="off" disabled={disabled}
      onFocus={() => {focused.current = true; setOpen(true); setActive(-1);}}
      onBlur={() => {focused.current = false; setOpen(false); if (!value) setText('');}}
      onChange={event => {setText(event.target.value); if (value) onChange(''); setOpen(true); setActive(-1);}}
      onKeyDown={keyboard}/>
    {open && !disabled && <ul className="station-suggestions" id={`${id}-suggestions`} role="listbox" aria-label={`${label} suggestions`}>
      {matches.map((station, index) => <li id={`${id}-${index}`} key={station.id} role="option" aria-selected={index === active || station.id === value} onMouseDown={event => event.preventDefault()} onClick={() => choose(station)}>{station.name}</li>)}
      {!matches.length && <li role="presentation">No matching station. Try a station name, not an address.</li>}
    </ul>}
  </div>;
}
