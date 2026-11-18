"""
Phase 8 - Simulated Ambulance GPS Movement Engine.

Generates realistic ambulance transit telemetry along predetermined
corridor routes, calculating heading, dynamic speed, and remaining distance/ETA.
Data is explicitly tagged with `is_simulated = True`.
"""

from __future__ import annotations

import asyncio
import math
import logging
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any

from app.schemas.tracking import GPSUpdate, SimulatorConfig
from app.websocket.manager import tracking_ws_manager

logger = logging.getLogger(__name__)

# Predefined realistic Delhi NCR Emergency Corridor Routes
# Coordinates format: (latitude, longitude)
CORRIDOR_ROUTES: Dict[str, List[Tuple[float, float]]] = {
    # Default Route: AIIMS New Delhi -> Max Saket via Sri Aurobindo Marg
    "GC-2024-001": [
        (28.5672, 77.2100),  # AIIMS New Delhi (Donor)
        (28.5630, 77.2090),  # AIIMS Flyover
        (28.5580, 77.2085),  # INA Market Junction
        (28.5520, 77.2078),  # AIIMS trauma center approach
        (28.5470, 77.2070),  # Green Park Metro Junction
        (28.5410, 77.2065),  # Hauz Khas Metro Junction
        (28.5350, 77.2075),  # IIT Flyover Outer Ring Road
        (28.5310, 77.2110),  # Malviya Nagar Crossroad
        (28.5285, 77.2125),  # Press Enclave Marg
        (28.5275, 77.2135),  # Max Super Speciality Hospital, Saket (Recipient)
    ],
    # Route 2: Safdarjung Hospital -> Fortis Escorts, Okhla
    "GC-2024-002": [
        (28.5681, 77.2065),  # Safdarjung Hospital
        (28.5695, 77.2150),  # South Extension
        (28.5690, 77.2280),  # Lajpat Nagar Ring Road
        (28.5675, 77.2450),  # Moolchand Underpass
        (28.5640, 77.2600),  # Ashram Chowk
        (28.5600, 77.2750),  # Fortis Escorts, Okhla
    ],
}


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates initial compass heading/bearing in degrees [0, 360)
    between two GPS coordinates.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)

    bearing_deg = (math.degrees(math.atan2(y, x)) + 360.0) % 360.0
    return round(bearing_deg, 1)


def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance in kilometers using the Haversine formula.
    """
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class GPSSimulator:
    """
    Background simulation task runner for active mission ambulances.
    """

    def __init__(self) -> None:
        # mission_id -> asyncio.Task
        self._tasks: Dict[str, asyncio.Task] = {}
        # mission_id -> last emitted GPSUpdate
        self._latest_telemetry: Dict[str, GPSUpdate] = {}
        # mission_id -> current waypoint index
        self._waypoint_index: Dict[str, int] = {}

    def is_running(self, mission_id: Optional[str] = None) -> bool:
        if mission_id:
            task = self._tasks.get(mission_id)
            return task is not None and not task.done()
        return any(task is not None and not task.done() for task in self._tasks.values())

    def get_status(self) -> dict[str, Any]:
        active_missions = [
            mid for mid, task in self._tasks.items() if task is not None and not task.done()
        ]
        return {
            "is_running": len(active_missions) > 0,
            "active_missions": active_missions,
            "latest_telemetry": {
                mid: telem.model_dump(mode="json")
                for mid, telem in self._latest_telemetry.items()
            },
        }

    async def start(self, config: SimulatorConfig) -> bool:
        """
        Starts a background simulation task along the designated corridor route.
        """
        mission_id = config.mission_id
        if self.is_running(mission_id):
            logger.info("Simulator already running for mission [%s]", mission_id)
            return False

        # Get designated or fallback route
        route = CORRIDOR_ROUTES.get(mission_id)
        if not route:
            # Fallback to route 1 if not explicitly registered
            route = CORRIDOR_ROUTES["GC-2024-001"]

        task = asyncio.create_task(
            self._run_simulation(config, route),
            name=f"gps_sim_{mission_id}",
        )
        self._tasks[mission_id] = task
        logger.info("Started GPS simulator for mission [%s] with %d waypoints", mission_id, len(route))
        return True

    async def stop(self, mission_id: Optional[str] = None) -> bool:
        """
        Stops the simulation task for a specific mission or all active simulations.
        """
        stopped_any = False
        if mission_id:
            task = self._tasks.get(mission_id)
            if task and not task.done():
                task.cancel()
                self._tasks.pop(mission_id, None)
                logger.info("Stopped GPS simulator for mission [%s]", mission_id)
                stopped_any = True
        else:
            for mid, task in list(self._tasks.items()):
                if task and not task.done():
                    task.cancel()
                    stopped_any = True
            self._tasks.clear()
            logger.info("Stopped all running GPS simulators")

        return stopped_any

    async def _run_simulation(self, config: SimulatorConfig, route: List[Tuple[float, float]]) -> None:
        """
        Continuous simulation loop stepping through route waypoints with interpolation.
        """
        mission_id = config.mission_id
        ambulance_id = config.ambulance_id
        num_points = len(route)
        curr_idx = 0

        # Total route length
        total_route_km = sum(
            calculate_distance_km(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1])
            for i in range(num_points - 1)
        )

        try:
            while True:
                p1 = route[curr_idx]
                p2 = route[(curr_idx + 1) % num_points]

                # Interpolate sub-steps between waypoints for smooth marker movement
                sub_steps = 4
                for step in range(sub_steps):
                    fraction = step / float(sub_steps)
                    lat = p1[0] + (p2[0] - p1[0]) * fraction
                    lon = p1[1] + (p2[1] - p1[1]) * fraction

                    heading = calculate_bearing(p1[0], p1[1], p2[0], p2[1])

                    # Calculate remaining distance to destination
                    rem_km = calculate_distance_km(lat, lon, route[-1][0], route[-1][1])
                    speed = config.speed_kmh
                    eta_mins = max(1, int(round((rem_km / max(speed, 10.0)) * 60.0)))

                    update = GPSUpdate(
                        mission_id=mission_id,
                        ambulance_id=ambulance_id,
                        latitude=round(lat, 6),
                        longitude=round(lon, 6),
                        speed=speed,
                        heading=heading,
                        timestamp=datetime.utcnow(),
                        is_simulated=True,
                        eta_minutes=eta_mins,
                        distance_remaining_km=round(rem_km, 2),
                    )

                    self._latest_telemetry[mission_id] = update

                    # Broadcast through WebSocket Manager to all subscribed dashboards
                    await tracking_ws_manager.broadcast_to_mission(
                        mission_id=mission_id,
                        message_data={
                            "type": "gps_update",
                            "data": update.model_dump(mode="json"),
                        },
                    )

                    await asyncio.sleep(config.interval_seconds / float(sub_steps))

                curr_idx += 1
                if curr_idx >= num_points - 1:
                    if config.loop:
                        curr_idx = 0
                    else:
                        break

        except asyncio.CancelledError:
            logger.info("Simulation loop cancelled for mission [%s]", mission_id)
        except Exception as exc:
            logger.error("Simulation loop error for mission [%s]: %s", mission_id, exc)


# Global singleton simulator instance
gps_simulator = GPSSimulator()
