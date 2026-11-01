import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import openai
import pytest
from fastapi.testclient import TestClient

from backend import app as module
from backend.chat import station_matches

client = TestClient(module.app)
STATIONS = [
    {'id':'waterloo','name':'Waterloo Underground Station','lat':51.50,'lon':-0.11},
    {'id':'bank-u','name':'Bank Underground Station','lat':51.51,'lon':-0.08},
    {'id':'bank-d','name':'Bank DLR Station','lat':51.51,'lon':-0.08},
    {'id':'kings-cross','name':"King's Cross St. Pancras Underground Station",'lat':51.53,'lon':-0.12},
]


@pytest.fixture
def assistant(monkeypatch):
    intent = {'origin':'Waterloo','destination':'Bank','preference':'fastest','unsupported':False}
    call = SimpleNamespace(type='function_call',name='plan_journey',arguments=json.dumps(intent))
    response = SimpleNamespace(output=[call])
    create = AsyncMock(return_value=response)
    class FakeClient:
        responses = SimpleNamespace(create=create)
        async def __aenter__(self):
            return self
        async def __aexit__(self,*args):
            return False
    async def fake_plan(request):
        by_id={station['id']:station for station in STATIONS}
        return {'routes':[{'id':'route-1'}], 'origin':by_id[request.origin],
                'destination':by_id[request.destination], 'preference':request.preference}
    planner = AsyncMock(side_effect=fake_plan)
    monkeypatch.setenv('OPENAI_API_KEY','test-placeholder')
    monkeypatch.setattr(module,'reserve_ai_call',lambda:True)
    monkeypatch.setattr(module,'stations',AsyncMock(return_value={'stations':STATIONS}))
    monkeypatch.setattr(module,'plan',planner)
    monkeypatch.setattr(openai,'AsyncOpenAI',lambda **kwargs:FakeClient())
    return SimpleNamespace(call=call,response=response,create=create,planner=planner,intent=intent)


def test_station_names_preserve_ambiguity_and_explicit_modes():
    assert len(station_matches('Bank',STATIONS)) == 2
    assert station_matches('Bank Underground',STATIONS)[0]['id'] == 'bank-u'
    assert station_matches('Kings Cross',STATIONS)[0]['id'] == 'kings-cross'
    assert station_matches('Manchester',STATIONS) == []


def test_ambiguous_station_choice_reuses_pending_journey_without_another_ai_call(assistant):
    response=client.post('/api/chat',json={'message':'Waterloo to Bank'})
    assert response.status_code == 200
    body=response.json()
    assert body['status'] == 'clarification'
    assert body['clarification']['slot'] == 'destination'
    assert len(body['clarification']['choices']) == 2
    assistant.planner.assert_not_called()
    resolved=client.post('/api/chat',json={'message':'Use Bank Underground Station','pending':body['pending'],
        'choice':{'slot':'destination','station_id':'bank-u'}}).json()
    assert resolved['status'] == 'journey'
    assert resolved['journey']['origin']['id'] == 'waterloo'
    assert resolved['journey']['destination']['id'] == 'bank-u'
    assert assistant.create.await_count == 1


def test_missing_start_is_requested_instead_of_invented(assistant):
    assistant.call.arguments=json.dumps({**assistant.intent,'origin':''})
    body=client.post('/api/chat',json={'message':'Get me to Bank'}).json()
    assert body['status'] == 'clarification'
    assert body['clarification']['slot'] == 'origin'
    assert body['pending']['destination'] == 'Bank'
    assistant.planner.assert_not_called()


def test_followup_preference_reaches_shared_planner(assistant):
    assistant.call.arguments=json.dumps({**assistant.intent,'origin':'waterloo','destination':'bank-u','preference':'fewer_changes'})
    body=client.post('/api/chat',json={'message':'Same journey, fewer changes',
        'context':{'origin':'waterloo','destination':'bank-u','preference':'fastest'}}).json()
    assert body['status'] == 'journey'
    assert assistant.planner.await_args.args[0].preference == 'fewer_changes'
    assert body['journey']['preference'] == 'fewer_changes'


def test_unsupported_constraints_are_not_silently_ignored(assistant):
    assistant.call.arguments=json.dumps({**assistant.intent,'unsupported':True})
    body=client.post('/api/chat',json={'message':'Waterloo to Bank, step-free only'}).json()
    assert body['status'] == 'unsupported'
    assistant.planner.assert_not_called()


def test_multiple_model_tool_calls_are_not_executed(assistant):
    assistant.response.output=[assistant.call,assistant.call]
    body=client.post('/api/chat',json={'message':'Waterloo to Bank'}).json()
    assert body['status'] == 'unavailable'
    assistant.planner.assert_not_called()


def test_station_choice_must_belong_to_the_clarification(assistant):
    body=client.post('/api/chat',json={'message':'Use Waterloo',
        'pending':{'origin':'waterloo','destination':'Bank','preference':'fastest','awaiting_slot':'destination'},
        'choice':{'slot':'destination','station_id':'waterloo'}}).json()
    assert body['status'] == 'clarification'
    assistant.planner.assert_not_called()
    assistant.create.assert_not_called()


def test_preferences_select_different_recommendations_from_returned_routes():
    routes=[{'id':'fast','duration':10,'walking_minutes':5,'changes':1},
            {'id':'little-walking','duration':12,'walking_minutes':0,'changes':2},
            {'id':'direct','duration':20,'walking_minutes':3,'changes':0}]
    assert module.rank_routes(routes,'fastest')[0]['id'] == 'fast'
    assert module.rank_routes(routes,'less_walking')[0]['id'] == 'little-walking'
    assert module.rank_routes(routes,'fewer_changes')[0]['id'] == 'direct'
