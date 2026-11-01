import React from 'react';
import {Icon} from '../ui.jsx';

export default function Recommendation({data, number}) {
  const explanation = data.explanation;
  const tradeoffs = explanation?.tradeoffs || [];
  const limitations = explanation?.limitations || [];
  return <section className="recommendation" aria-label={`Why we recommend Option ${number}`}>
    <h3><Icon name="spark"/>Why we recommend Option {number}</h3>
    <p className="recommendation-scope">{data.sample ? 'Fictional sample explanation' : `This explanation applies to Option ${number}, even when you view another route.`}</p>
    <p>{explanation?.summary || data.ranking_rule}</p>
    {tradeoffs.length > 0 && <ul>{tradeoffs.slice(0, 2).map((item, index) => <li key={index}>{item}</li>)}</ul>}
    <p className="essential-uncertainty">Line status is context, not a measured delay. Forecasts cover the endpoints.</p>
    {(tradeoffs.length > 2 || limitations.length > 0) && <details className="recommendation-more"><summary>More context & limitations</summary>{tradeoffs.slice(2).map((item, index) => <p key={`tradeoff-${index}`}>{item}</p>)}{limitations.map((item, index) => <p key={`limit-${index}`}>{item}</p>)}</details>}
  </section>;
}
