import {useEffect, useRef, useState} from 'react';

export default function useWeatherField(active, sample) {
  const cached = useRef(null);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({status: 'idle', data: null, error: ''});
  useEffect(() => {
    if (sample) {setState({status: 'sample', data: null, error: ''}); return;}
    if (!active) return;
    const now = Date.now(), windowStart = new Date().toISOString().slice(0, 13);
    if (cached.current && now - cached.current.time < 600000 && cached.current.windowStart === windowStart) {setState({status: 'ready', data: cached.current.data, error: ''}); return;}
    const controller = new AbortController();
    setState({status: 'loading', data: null, error: ''});
    (async () => {
      try {
        const response = await fetch('/api/map/weather?area=london-demo', {signal: controller.signal});
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'The area forecast is unavailable.');
        if (controller.signal.aborted) return;
        cached.current = {time: Date.now(), windowStart, data};
        setState({status: 'ready', data, error: ''});
      } catch (error) {if (!controller.signal.aborted) setState({status: 'error', data: null, error: error.message});}
    })();
    return () => controller.abort();
  }, [active, sample, retry]);
  return {...(sample ? {status: 'sample', data: null, error: ''} : state), retry: () => {cached.current = null; setRetry(value => value + 1);}};
}
