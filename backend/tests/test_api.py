"""HTTP contract tests that never call Supabase or OrcaRouter."""

from uuid import UUID


def test_profile_and_person_crud(client):
    profile = client.patch("/api/profile", json={"name": "自分", "interests": ["映画"]})
    assert profile.status_code == 200
    assert profile.json()["name"] == "自分"

    created = client.post(
        "/api/persons", json={"relationship": "友人", "known_information": "映画が好き"}
    )
    assert created.status_code == 201
    person = created.json()
    assert person["name"] == "名前不明"
    assert UUID(person["id"])

    listed = client.get("/api/persons", params={"q": "映画"})
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    fetched = client.get(f"/api/persons/{person['id']}")
    assert fetched.status_code == 200


def test_conversation_and_memory_are_scoped_to_person(client):
    person = client.post("/api/persons", json={"relationship": "同僚"}).json()
    conversation = client.post(
        "/api/conversations",
        json={
            "person_id": person["id"],
            "purpose": "雑談",
            "situation": "休憩中",
            "rating": "good",
        },
    )
    assert conversation.status_code == 201
    memory = client.post(
        f"/api/persons/{person['id']}/memories",
        json={"content": "最近ランニングを始めた"},
    )
    assert memory.status_code == 201
    assert memory.json()["person_id"] == person["id"]


def test_deck_generation_is_available_without_external_services(client):
    response = client.post(
        "/api/deck/generate",
        json={"user": {}, "context": {"purpose": "雑談", "situation": "会場"}},
    )
    assert response.status_code == 200
    assert 3 <= len(response.json()["cards"]) <= 5


def test_deck_generation_requires_authentication(unauthenticated_client):
    response = unauthenticated_client.post(
        "/api/deck/generate",
        json={"user": {}, "context": {"purpose": "雑談", "situation": "会場"}},
    )
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_validation_and_not_found_errors_are_safe(client):
    invalid = client.post("/api/persons", json={"relationship": " "})
    assert invalid.status_code == 422
    assert invalid.json()["code"] == "validation_error"
    assert client.get("/api/persons/00000000-0000-0000-0000-000000000099").status_code == 404


def test_cors_allows_configured_frontend_origin(client):
    response = client.options(
        "/api/profile",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_api_responses_include_security_headers(client):
    response = client.get("/api/persons")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["cache-control"] == "no-store"


def test_memories_can_be_listed_with_a_limit(client):
    person = client.post("/api/persons", json={"relationship": "友人"}).json()
    client.post(
        f"/api/persons/{person['id']}/memories",
        json={"content": "確認済みの記憶"},
    )
    response = client.get(f"/api/persons/{person['id']}/memories", params={"limit": 1})
    assert response.status_code == 200
    assert len(response.json()) == 1
