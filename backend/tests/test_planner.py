import asyncio
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
from backend import app as module


client = TestClient(module.app)


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
