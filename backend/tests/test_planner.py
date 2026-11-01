import asyncio
import pytest
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
from backend import app as module


client = TestClient(module.app)


def test_stop_sequence_preserves_intermediates_and_deduplicates_the_arrival():
    leg = {'departurePoint': {'naptanId':'A','commonName':'Waterloo','lat':51.5,'lon':-.1},
           'arrivalPoint': {'naptanId':'C','commonName':'Elephant & Castle','lat':51.49,'lon':-.09},
           'path': {'stopPoints':[{'id':'B','name':'Lambeth North'},{'id':'C','name':'Elephant & Castle'}]}}
    stops, available = module.normalize_stops(leg, {'B':{'lat':51.495,'lon':-.095}})
    assert available is True
    assert [s['name'] for s in stops] == ['Waterloo','Lambeth North','Elephant & Castle']
    assert stops[1]['lat'] == 51.495
    assert stops[-1]['lon'] == -.09


def test_missing_stop_data_keeps_endpoints_without_inventing_intermediates():
    stops, available = module.normalize_stops({'departurePoint':{'commonName':'A'},'arrivalPoint':{'commonName':'B'}})
    assert available is False
    assert [s['name'] for s in stops] == ['A','B']
    assert all(s['lat'] is None for s in stops)


def test_malformed_stops_do_not_erase_valid_stops_or_collapse_a_loop():
    stops, available = module.normalize_stops({'departurePoint':{'id':'A','name':'A'},'path':{'stopPoints':[None,{'id':[],'name':'X','lat':float('nan'),'lon':0},{'id':'A','name':'A'}]}})
    assert available is False
    assert [s['name'] for s in stops] == ['A','X','A']
    assert stops[1]['lat'] is None


def test_tfl_normalization_extracts_nested_line_and_converts_geometry():
    route = module.normalize_journey({'duration': 12, 'startDateTime': '2026-07-01T13:00:00',
        'arrivalDateTime': '2026-07-01T13:12:00', 'legs': [{'duration': 12, 'mode': {'id': 'tube'},
        'routeOptions': [{'name': 'Jubilee', 'lineIdentifier': {'id': 'jubilee'}}],
        'path': {'lineString': '[[51.5,-0.1],[51.51,-0.11]]'}}]}, 0)
    assert route['legs'][0]['lines'][0]['id'] == 'jubilee'
    assert route['legs'][0]['geometry'][0] == [-0.1, 51.5]
    assert route['departure'].endswith('+01:00')


def test_sample_never_calls_live_sources(monkeypatch):
    network = AsyncMock(side_effect=AssertionError('Sample must not call providers'))
    monkeypatch.setattr(module, 'get_json', network)
    response = client.post('/api/plan', json={'origin': 'sample-waterloo', 'destination': 'sample-bank', 'sample': True})
    assert response.status_code == 200
    body = response.json()
    assert body['sample'] is True
    assert body['explanation']['status'] == 'sample'
    assert body['sources'] == []
    assert 'fictional' in body['warnings'][0]
    network.assert_not_called()


def test_sample_rejects_unknown_pair():
    assert client.post('/api/plan', json={'origin': 'bad', 'destination': 'worse', 'sample': True}).status_code == 422


def test_keyless_explanation_is_explicit(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    assert asyncio.run(module.explain({}))['status'] == 'not_configured'


def test_partial_provider_failures_keep_real_routes(monkeypatch):
    async def station_list():
        return {'stations': [{'id': 'a', 'name': 'A', 'lat': 51.5, 'lon': -0.1},
                             {'id': 'b', 'name': 'B', 'lat': 51.51, 'lon': -0.11}]}
    async def source(client, url, params=None):
        if '/Journey/' in url:
            return {'journeys': [{'duration': 10, 'startDateTime': '2026-11-01T13:00:00',
                'arrivalDateTime': '2026-11-01T13:10:00', 'legs': [{'duration': 10,
                'mode': {'id': 'tube'}, 'routeOptions': [{'name': 'Jubilee', 'lineIdentifier': {'id': 'jubilee'}}]}]}]}
        raise module.httpx.ConnectError('Provider unavailable')
    monkeypatch.setattr(module, 'stations', station_list)
    monkeypatch.setattr(module, 'get_json', source)
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    response = client.post('/api/plan', json={'origin': 'a', 'destination': 'b'})
    assert response.status_code == 200
    body = response.json()
    assert len(body['routes']) == 1 and body['sample'] is False
    assert body['weather'] == []
    assert body['routes'][0]['status_available'] is False
    assert body['explanation']['status'] == 'not_configured'
    assert len(body['warnings']) >= 3


def test_missing_journeys_returns_actionable_error(monkeypatch):
    async def station_list():
        return {'stations': [{'id':'a'}, {'id':'b'}]}
    monkeypatch.setattr(module, 'stations', station_list)
    monkeypatch.setattr(module, 'get_json', AsyncMock(return_value={'journeys': []}))
    response = client.post('/api/plan', json={'origin':'a','destination':'b'})
    assert response.status_code == 503
    assert 'TfL' in response.json()['detail']


def test_rank_tiebreaker_and_relevant_statuses():
    a = {'id':'a','duration':12,'changes':1,'walking_minutes':2,'legs':[{'lines':[{'id':'jubilee'}]}]}
    b = {'id':'b','duration':12,'changes':0,'walking_minutes':4,'legs':[]}
    assert module.rank_routes([a,b])[0]['id'] == 'b'
    assert module.relevant_statuses(a,[{'id':'jubilee'},{'id':'central'}]) == [{'id':'jubilee'}]


def test_forecast_window_converts_london_summer_time(monkeypatch):
    monkeypatch.setattr(module, 'get_json', AsyncMock(return_value={'hourly': {
        'time': ['2026-07-01T11:00', '2026-07-01T12:00', '2026-07-01T13:00'],
        'temperature_2m': [18, 19, 20], 'precipitation_probability': [10, 20, 30],
        'wind_speed_10m': [5, 6, 7]}}))
    result = asyncio.run(module.weather_at(None, {'name': 'A', 'lat': 51.5, 'lon': -0.1},
                                          '2026-07-01T13:10:00', '2026-07-01T13:40:00'))
    assert len(result['hours']) == 1
    assert result['hours'][0]['time'] == '2026-07-01T12:00:00+00:00'
    assert result['hours'][0]['rain_probability'] == 20


def test_geometry_rejects_invalid_or_missing_values():
    assert module.parse_geometry(None) == []
    assert module.parse_geometry('broken json') == []
    assert module.parse_geometry('[[500,0],[51.5,-0.1]]') == [[-0.1, 51.5]]


def test_ai_request_cap_preserves_routes_without_calling_provider(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-placeholder')
    monkeypatch.setenv('AI_REQUESTS_PER_MINUTE', '0')
    result = asyncio.run(module.explain({}))
    assert result['status'] == 'rate_limited'
    assert 'route facts remain available' in result['summary']


def test_ai_can_only_select_evidence_backed_wording():
    from backend.sample import sample_plan
    payload = sample_plan()
    selection = module.ExplanationSelection(context_ids=['rain_forecast'], tradeoff_ids=['alternative_2'], limitation_ids=[])
    result = module.render_explanation(payload, selection)
    assert '70%' in result['summary']
    assert 'no walking is needed' not in result['summary']
    assert any('do not prove' in item for item in result['limitations'])
    assert any('16 minutes' in item for item in result['tradeoffs'])


def test_unknown_ai_evidence_is_rejected():
    from backend.sample import sample_plan
    selection = module.ExplanationSelection(context_ids=['clear_weather_and_no_delays'], tradeoff_ids=[], limitation_ids=[])
    with pytest.raises(ValueError, match='unknown evidence'):
        module.render_explanation(sample_plan(), selection)
