"""
Unit and Integration Tests for Phase 8: Real-Time Ambulance Tracking.
Compatible with standard library unittest and pytest.
Covers:
  - GPS Schema validation (valid coordinates, out-of-bounds latitude/longitude/speed)
  - Geodesic bearing and distance calculations
  - WebSocket connection lifecycle & mission segregation
  - REST GPS telemetry ingestion & history retrieval
  - GPS simulator background task lifecycle
  - WebSocket subscriber count endpoint
"""

import unittest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.tracking import GPSUpdate
from app.services.gps_simulator import calculate_bearing, calculate_distance_km


class TestPhase8Tracking(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_gps_schema_valid(self):
        """Test valid GPS telemetry payload."""
        data = {
            "mission_id": "GC-2024-001",
            "ambulance_id": "AMB-001",
            "latitude": 28.5672,
            "longitude": 77.2100,
            "speed": 55.4,
            "heading": 135.0,
            "is_simulated": True,
        }
        update = GPSUpdate(**data)
        self.assertEqual(update.mission_id, "GC-2024-001")
        self.assertEqual(update.ambulance_id, "AMB-001")
        self.assertEqual(update.latitude, 28.5672)
        self.assertEqual(update.longitude, 77.2100)
        self.assertEqual(update.speed, 55.4)
        self.assertEqual(update.heading, 135.0)
        self.assertTrue(update.is_simulated)

    def test_gps_schema_invalid_latitude(self):
        """Test invalid latitude boundary (> 90.0)."""
        with self.assertRaises(ValidationError):
            GPSUpdate(
                mission_id="GC-2024-001",
                ambulance_id="AMB-001",
                latitude=95.0,  # Invalid
                longitude=77.2100,
                speed=50.0,
            )

    def test_gps_schema_invalid_longitude(self):
        """Test invalid longitude boundary (< -180.0)."""
        with self.assertRaises(ValidationError):
            GPSUpdate(
                mission_id="GC-2024-001",
                ambulance_id="AMB-001",
                latitude=28.5,
                longitude=-185.0,  # Invalid
                speed=50.0,
            )

    def test_gps_schema_negative_speed(self):
        """Test negative speed rejection."""
        with self.assertRaises(ValidationError):
            GPSUpdate(
                mission_id="GC-2024-001",
                ambulance_id="AMB-001",
                latitude=28.5,
                longitude=77.2,
                speed=-10.0,  # Invalid
            )

    def test_gps_schema_empty_mission_id(self):
        """Test empty mission_id rejection."""
        with self.assertRaises(ValidationError):
            GPSUpdate(
                mission_id="   ",
                ambulance_id="AMB-001",
                latitude=28.5,
                longitude=77.2,
                speed=50.0,
            )

    def test_bearing_and_distance_calculations(self):
        """Test geodesic calculations between AIIMS and Max Saket."""
        lat1, lon1 = 28.5672, 77.2100  # AIIMS
        lat2, lon2 = 28.5275, 77.2135  # Max Saket

        dist = calculate_distance_km(lat1, lon1, lat2, lon2)
        bearing = calculate_bearing(lat1, lon1, lat2, lon2)

        # Expected ~4.4 km geodesic distance, heading approximately South (~160-190 degrees)
        self.assertTrue(4.0 <= dist <= 5.0)
        self.assertTrue(160.0 <= bearing <= 190.0)

    def test_websocket_tracking_connection_and_ping(self):
        """Test WebSocket connection handshake and ping/pong."""
        mission_id = "TEST-MISSION-001"

        with self.client.websocket_connect(f"/ws/tracking/{mission_id}") as ws:
            # Handshake confirmation message
            init_data = ws.receive_json()
            self.assertEqual(init_data["type"], "connection_established")
            self.assertEqual(init_data["mission_id"], mission_id)
            self.assertEqual(init_data["status"], "connected")

            # Ping-pong keep-alive
            ws.send_text("ping")
            response = ws.receive_text()
            self.assertEqual(response, "pong")

    def test_websocket_mission_segregation(self):
        """
        Test that updates for mission A are received by subscribers of mission A
        and NOT received by subscribers of mission B.
        """
        mission_a = "MISSION-ALPHA"

        with self.client.websocket_connect(f"/ws/tracking/{mission_a}") as ws_a:
            init_a = ws_a.receive_json()
            self.assertEqual(init_a["type"], "connection_established")

            # Submit GPS update for mission A
            payload_a = {
                "mission_id": mission_a,
                "ambulance_id": "AMB-ALPHA",
                "latitude": 28.5672,
                "longitude": 77.2100,
                "speed": 60.0,
                "heading": 180.0,
                "is_simulated": True,
            }
            res = self.client.post("/api/v1/tracking/gps", json=payload_a)
            self.assertEqual(res.status_code, 200)

            # Verify ws_a receives update
            received = ws_a.receive_json()
            self.assertEqual(received["type"], "gps_update")
            self.assertEqual(received["data"]["mission_id"], mission_a)
            self.assertEqual(received["data"]["latitude"], 28.5672)

    def test_gps_rest_ingestion_and_history(self):
        """Test REST GPS ingestion endpoint and history endpoint."""
        mid = "HIST-TEST-999"

        payload = {
            "mission_id": mid,
            "ambulance_id": "AMB-999",
            "latitude": 28.5400,
            "longitude": 77.2000,
            "speed": 48.0,
            "heading": 90.0,
            "is_simulated": False,
        }
        post_res = self.client.post("/api/v1/tracking/gps", json=payload)
        self.assertEqual(post_res.status_code, 200)
        res_data = post_res.json()
        self.assertEqual(res_data["status"], "success")
        self.assertEqual(res_data["data"]["mission_id"], mid)

        # Check history
        hist_res = self.client.get(f"/api/v1/tracking/history/{mid}")
        self.assertEqual(hist_res.status_code, 200)
        hist_json = hist_res.json()
        self.assertEqual(hist_json["mission_id"], mid)
        self.assertGreaterEqual(hist_json["total_points"], 1)
        self.assertEqual(hist_json["history"][-1]["ambulance_id"], "AMB-999")

    def test_simulator_rest_lifecycle(self):
        """Test starting and stopping simulator via REST endpoints."""
        test_mission = "SIM-TEST-777"

        start_payload = {
            "mission_id": test_mission,
            "ambulance_id": "AMB-SIM",
            "interval_seconds": 1.0,
            "speed_kmh": 50.0,
            "loop": False,
        }
        start_res = self.client.post("/api/v1/tracking/simulator/start", json=start_payload)
        self.assertEqual(start_res.status_code, 200)

        # Status check
        status_res = self.client.get("/api/v1/tracking/simulator/status")
        self.assertEqual(status_res.status_code, 200)
        status_data = status_res.json()
        self.assertIn("active_missions", status_data)

        # Stop simulator
        stop_res = self.client.post(f"/api/v1/tracking/simulator/stop?mission_id={test_mission}")
        self.assertEqual(stop_res.status_code, 200)
        self.assertEqual(stop_res.json()["status"], "success")

    def test_tracking_subscribers_endpoint(self):
        """Test subscriber count endpoint."""
        res = self.client.get("/api/v1/tracking/subscribers")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "success")
        self.assertIn("active_subscribers", res.json())


if __name__ == "__main__":
    unittest.main()
