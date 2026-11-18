"""
Dashboard API – simulated (in-memory) data endpoints.

These endpoints power the frontend dashboards and return JSON.
They do NOT require PostgreSQL/PostGIS; all data lives in Python dicts.
"""

from __future__ import annotations

import uuid
from copy import deepcopy
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

# ═══════════════════════════════════════════════════════════════════════════
# Pydantic request / response models
# ═══════════════════════════════════════════════════════════════════════════

class MissionCreate(BaseModel):
    organ_type: str
    donor_hospital: str
    recipient_hospital: str
    priority: str = "critical"
    patient_name: Optional[str] = None
    description: Optional[str] = None


class MissionStatusUpdate(BaseModel):
    status: str


class AmbulanceAssign(BaseModel):
    mission_id: str


class JunctionStatusUpdate(BaseModel):
    status: str  # "green_corridor" | "normal" | "manual"


class CorridorCreate(BaseModel):
    mission_id: str
    junction_ids: list[str]
    priority: str = "critical"


# ═══════════════════════════════════════════════════════════════════════════
# In-memory simulated data store
# ═══════════════════════════════════════════════════════════════════════════

_now = datetime.utcnow

MISSIONS: dict[str, dict] = {
    "GC-2024-001": {
        "id": "GC-2024-001",
        "organ_type": "Heart",
        "donor_hospital": "AIIMS Delhi",
        "recipient_hospital": "Fortis Escorts",
        "status": "in_transit",
        "priority": "critical",
        "patient_name": "Rajesh Kumar",
        "ambulance_id": "AMB-001",
        "distance_km": 15.4,
        "eta_minutes": 12,
        "progress_pct": 65,
        "route": [
            {"lat": 28.5672, "lng": 77.2100},
            {"lat": 28.5500, "lng": 77.2200},
            {"lat": 28.5350, "lng": 77.2350},
        ],
        "created_at": (_now() - timedelta(hours=1)).isoformat(),
        "updated_at": _now().isoformat(),
        "description": "Critical heart transplant – green corridor activated.",
    },
    "GC-2024-002": {
        "id": "GC-2024-002",
        "organ_type": "Kidney",
        "donor_hospital": "Safdarjung Hospital",
        "recipient_hospital": "Max Super Speciality",
        "status": "pending",
        "priority": "high",
        "patient_name": "Anita Sharma",
        "ambulance_id": None,
        "distance_km": 22.1,
        "eta_minutes": None,
        "progress_pct": 0,
        "route": [],
        "created_at": (_now() - timedelta(minutes=30)).isoformat(),
        "updated_at": _now().isoformat(),
        "description": "Kidney transport awaiting ambulance assignment.",
    },
    "GC-2024-003": {
        "id": "GC-2024-003",
        "organ_type": "Liver",
        "donor_hospital": "RML Hospital",
        "recipient_hospital": "Apollo Hospital",
        "status": "completed",
        "priority": "critical",
        "patient_name": "Vikram Singh",
        "ambulance_id": "AMB-003",
        "distance_km": 18.7,
        "eta_minutes": 0,
        "progress_pct": 100,
        "route": [
            {"lat": 28.6250, "lng": 77.2050},
            {"lat": 28.6100, "lng": 77.2200},
            {"lat": 28.5900, "lng": 77.2400},
        ],
        "created_at": (_now() - timedelta(hours=5)).isoformat(),
        "updated_at": (_now() - timedelta(hours=4)).isoformat(),
        "description": "Liver transplant mission completed successfully.",
    },
    "GC-2024-004": {
        "id": "GC-2024-004",
        "organ_type": "Cornea",
        "donor_hospital": "GTB Hospital",
        "recipient_hospital": "LHMC Hospital",
        "status": "in_transit",
        "priority": "medium",
        "patient_name": "Priya Patel",
        "ambulance_id": "AMB-004",
        "distance_km": 10.3,
        "eta_minutes": 8,
        "progress_pct": 40,
        "route": [
            {"lat": 28.6800, "lng": 77.3100},
            {"lat": 28.6600, "lng": 77.2900},
        ],
        "created_at": (_now() - timedelta(minutes=45)).isoformat(),
        "updated_at": _now().isoformat(),
        "description": "Cornea transport in progress.",
    },
    "GC-2024-005": {
        "id": "GC-2024-005",
        "organ_type": "Lung",
        "donor_hospital": "Medanta Hospital",
        "recipient_hospital": "BLK Super Speciality",
        "status": "pending",
        "priority": "critical",
        "patient_name": "Suresh Reddy",
        "ambulance_id": None,
        "distance_km": 30.5,
        "eta_minutes": None,
        "progress_pct": 0,
        "route": [],
        "created_at": (_now() - timedelta(minutes=10)).isoformat(),
        "updated_at": _now().isoformat(),
        "description": "Lung transplant – awaiting green corridor approval.",
    },
}

AMBULANCES: dict[str, dict] = {
    "AMB-001": {
        "id": "AMB-001",
        "registration": "DL-01-AB-1234",
        "vehicle_model": "Force Traveller Trauma",
        "type": "ALS",
        "status": "on_mission",
        "current_mission": "GC-2024-001",
        "driver": "Ravi Verma",
        "lat": 28.5550,
        "lng": 77.2180,
        "speed_kmh": 68,
        "last_updated": _now().isoformat(),
    },
    "AMB-002": {
        "id": "AMB-002",
        "registration": "DL-02-CD-5678",
        "vehicle_model": "Tata Winger Ambulance",
        "type": "BLS",
        "status": "available",
        "current_mission": None,
        "driver": "Amit Kumar",
        "lat": 28.6139,
        "lng": 77.2090,
        "speed_kmh": 0,
        "last_updated": _now().isoformat(),
    },
    "AMB-003": {
        "id": "AMB-003",
        "registration": "DL-03-EF-9012",
        "vehicle_model": "Force Traveller Cardiac",
        "type": "ALS",
        "status": "available",
        "current_mission": None,
        "driver": "Sunil Yadav",
        "lat": 28.6350,
        "lng": 77.2250,
        "speed_kmh": 0,
        "last_updated": _now().isoformat(),
    },
    "AMB-004": {
        "id": "AMB-004",
        "registration": "DL-04-GH-3456",
        "vehicle_model": "Mahindra Supro Ambulance",
        "type": "BLS",
        "status": "on_mission",
        "current_mission": "GC-2024-004",
        "driver": "Deepak Chauhan",
        "lat": 28.6700,
        "lng": 77.3000,
        "speed_kmh": 55,
        "last_updated": _now().isoformat(),
    },
    "AMB-005": {
        "id": "AMB-005",
        "registration": "DL-05-IJ-7890",
        "vehicle_model": "Force Traveller ICU",
        "type": "ICU",
        "status": "maintenance",
        "current_mission": None,
        "driver": None,
        "lat": 28.6000,
        "lng": 77.2300,
        "speed_kmh": 0,
        "last_updated": _now().isoformat(),
    },
}

HOSPITALS: list[dict] = [
    {
        "id": "HOSP-001",
        "name": "AIIMS Delhi",
        "address": "Ansari Nagar, New Delhi",
        "city": "New Delhi",
        "phone": "+91-11-26588500",
        "lat": 28.5672,
        "lng": 77.2100,
        "available_beds": 12,
        "total_beds": 50,
        "has_emergency": True,
        "specializations": ["Cardiac", "Neuro", "Transplant"],
        "status": "active",
    },
    {
        "id": "HOSP-002",
        "name": "Fortis Escorts",
        "address": "Okhla Road, New Delhi",
        "city": "New Delhi",
        "phone": "+91-11-47135000",
        "lat": 28.5350,
        "lng": 77.2350,
        "available_beds": 8,
        "total_beds": 35,
        "has_emergency": True,
        "specializations": ["Cardiac", "Transplant"],
        "status": "active",
    },
    {
        "id": "HOSP-003",
        "name": "Safdarjung Hospital",
        "address": "Ansari Nagar West, New Delhi",
        "city": "New Delhi",
        "phone": "+91-11-26707437",
        "lat": 28.5680,
        "lng": 77.2070,
        "available_beds": 20,
        "total_beds": 60,
        "has_emergency": True,
        "specializations": ["General", "Trauma", "Nephrology"],
        "status": "active",
    },
    {
        "id": "HOSP-004",
        "name": "Max Super Speciality",
        "address": "Saket, New Delhi",
        "city": "New Delhi",
        "phone": "+91-11-26515050",
        "lat": 28.5280,
        "lng": 77.2150,
        "available_beds": 5,
        "total_beds": 40,
        "has_emergency": True,
        "specializations": ["Renal", "Cardiac", "Transplant"],
        "status": "active",
    },
    {
        "id": "HOSP-005",
        "name": "Apollo Hospital",
        "address": "Mathura Road, New Delhi",
        "city": "New Delhi",
        "phone": "+91-11-26925858",
        "lat": 28.5900,
        "lng": 77.2400,
        "available_beds": 15,
        "total_beds": 45,
        "has_emergency": True,
        "specializations": ["Hepatology", "Transplant", "Oncology"],
        "status": "active",
    },
    {
        "id": "HOSP-006",
        "name": "BLK Super Speciality",
        "address": "Pusa Road, New Delhi",
        "city": "New Delhi",
        "phone": "+91-11-30403040",
        "lat": 28.6450,
        "lng": 77.1850,
        "available_beds": 10,
        "total_beds": 30,
        "has_emergency": True,
        "specializations": ["Pulmonology", "Transplant", "Cardiac"],
        "status": "active",
    },
]

TRAFFIC_JUNCTIONS: list[dict] = [
    {
        "id": "TJ-001",
        "name": "ITO Junction",
        "lat": 28.6289,
        "lng": 77.2405,
        "status": "green_corridor",
        "active_mission": "GC-2024-001",
        "signal_state": "green",
        "avg_wait_seconds": 0,
    },
    {
        "id": "TJ-002",
        "name": "AIIMS Flyover Signal",
        "lat": 28.5680,
        "lng": 77.2100,
        "status": "green_corridor",
        "active_mission": "GC-2024-001",
        "signal_state": "green",
        "avg_wait_seconds": 0,
    },
    {
        "id": "TJ-003",
        "name": "Moolchand Junction",
        "lat": 28.5690,
        "lng": 77.2310,
        "status": "normal",
        "active_mission": None,
        "signal_state": "auto",
        "avg_wait_seconds": 45,
    },
    {
        "id": "TJ-004",
        "name": "Ashram Chowk",
        "lat": 28.5700,
        "lng": 77.2500,
        "status": "normal",
        "active_mission": None,
        "signal_state": "auto",
        "avg_wait_seconds": 60,
    },
    {
        "id": "TJ-005",
        "name": "Nehru Place Signal",
        "lat": 28.5490,
        "lng": 77.2510,
        "status": "normal",
        "active_mission": None,
        "signal_state": "auto",
        "avg_wait_seconds": 35,
    },
    {
        "id": "TJ-006",
        "name": "Saket Metro Junction",
        "lat": 28.5230,
        "lng": 77.2170,
        "status": "green_corridor",
        "active_mission": "GC-2024-004",
        "signal_state": "green",
        "avg_wait_seconds": 0,
    },
]

NOTIFICATIONS: list[dict] = [
    {
        "id": "NOTIF-001",
        "type": "mission_created",
        "title": "New Mission Created",
        "message": "Heart transplant mission GC-2024-001 has been created.",
        "mission_id": "GC-2024-001",
        "severity": "critical",
        "read": False,
        "created_at": (_now() - timedelta(hours=1)).isoformat(),
    },
    {
        "id": "NOTIF-002",
        "type": "ambulance_dispatched",
        "title": "Ambulance Dispatched",
        "message": "AMB-001 dispatched for mission GC-2024-001.",
        "mission_id": "GC-2024-001",
        "severity": "info",
        "read": True,
        "created_at": (_now() - timedelta(minutes=55)).isoformat(),
    },
    {
        "id": "NOTIF-003",
        "type": "corridor_activated",
        "title": "Green Corridor Activated",
        "message": "Green corridor activated on route AIIMS → Fortis Escorts.",
        "mission_id": "GC-2024-001",
        "severity": "warning",
        "read": False,
        "created_at": (_now() - timedelta(minutes=50)).isoformat(),
    },
    {
        "id": "NOTIF-004",
        "type": "mission_completed",
        "title": "Mission Completed",
        "message": "Liver transport mission GC-2024-003 completed successfully.",
        "mission_id": "GC-2024-003",
        "severity": "success",
        "read": True,
        "created_at": (_now() - timedelta(hours=4)).isoformat(),
    },
    {
        "id": "NOTIF-005",
        "type": "eta_update",
        "title": "ETA Updated",
        "message": "Mission GC-2024-004 – ETA updated to 8 minutes.",
        "mission_id": "GC-2024-004",
        "severity": "info",
        "read": False,
        "created_at": (_now() - timedelta(minutes=5)).isoformat(),
    },
]


# ═══════════════════════════════════════════════════════════════════════════
# Helper
# ═══════════════════════════════════════════════════════════════════════════

def _next_mission_id() -> str:
    idx = len(MISSIONS) + 1
    return f"GC-2024-{idx:03d}"


def _next_notif_id() -> str:
    idx = len(NOTIFICATIONS) + 1
    return f"NOTIF-{idx:03d}"


# ═══════════════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════════════

# ---- Overall statistics ---------------------------------------------------

@router.get("/stats")
def get_dashboard_stats():
    total = len(MISSIONS)
    active = sum(1 for m in MISSIONS.values() if m["status"] == "in_transit")
    pending = sum(1 for m in MISSIONS.values() if m["status"] == "pending")
    completed = sum(1 for m in MISSIONS.values() if m["status"] == "completed")

    ambulances_available = sum(
        1 for a in AMBULANCES.values() if a["status"] == "available"
    )
    ambulances_on_mission = sum(
        1 for a in AMBULANCES.values() if a["status"] == "on_mission"
    )

    corridor_junctions = sum(
        1 for j in TRAFFIC_JUNCTIONS if j["status"] == "green_corridor"
    )

    return {
        "total_missions": total,
        "active_missions": active,
        "pending_missions": pending,
        "completed_missions": completed,
        "success_rate": round((completed / total * 100) if total else 0, 1),
        "ambulances_total": len(AMBULANCES),
        "ambulances_available": ambulances_available,
        "ambulances_on_mission": ambulances_on_mission,
        "hospitals_total": len(HOSPITALS),
        "green_corridor_junctions": corridor_junctions,
        "total_junctions": len(TRAFFIC_JUNCTIONS),
        "unread_notifications": sum(1 for n in NOTIFICATIONS if not n["read"]),
    }


# ---- Missions -------------------------------------------------------------

@router.get("/missions")
def list_missions(
    status: Optional[str] = None,
    organ_type: Optional[str] = None,
    search: Optional[str] = None,
):
    results = list(MISSIONS.values())

    if status and isinstance(status, str):
        results = [m for m in results if m["status"] == status]
    if organ_type and isinstance(organ_type, str):
        results = [
            m for m in results if m["organ_type"].lower() == organ_type.lower()
        ]
    if search and isinstance(search, str):
        q = search.lower()
        results = [
            m
            for m in results
            if q in m["id"].lower()
            or q in (m.get("patient_name") or "").lower()
            or q in m["donor_hospital"].lower()
            or q in m["recipient_hospital"].lower()
        ]

    return {"missions": results, "total": len(results)}


@router.get("/missions/{mission_id}")
def get_mission(mission_id: str):
    mission = MISSIONS.get(mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    return deepcopy(mission)


@router.post("/missions", status_code=201)
def create_mission(payload: MissionCreate):
    mid = _next_mission_id()
    mission = {
        "id": mid,
        "organ_type": payload.organ_type,
        "donor_hospital": payload.donor_hospital,
        "recipient_hospital": payload.recipient_hospital,
        "status": "pending",
        "priority": payload.priority,
        "patient_name": payload.patient_name,
        "ambulance_id": None,
        "distance_km": None,
        "eta_minutes": None,
        "progress_pct": 0,
        "route": [],
        "created_at": _now().isoformat(),
        "updated_at": _now().isoformat(),
        "description": payload.description or "",
    }
    MISSIONS[mid] = mission

    # Also push a notification
    nid = _next_notif_id()
    NOTIFICATIONS.append(
        {
            "id": nid,
            "type": "mission_created",
            "title": "New Mission Created",
            "message": f"{payload.organ_type} transport mission {mid} created.",
            "mission_id": mid,
            "severity": "critical",
            "read": False,
            "created_at": _now().isoformat(),
        }
    )

    return mission


@router.put("/missions/{mission_id}/status")
def update_mission_status(mission_id: str, payload: MissionStatusUpdate):
    mission = MISSIONS.get(mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    mission["status"] = payload.status
    mission["updated_at"] = _now().isoformat()

    if payload.status == "completed":
        mission["progress_pct"] = 100
        mission["eta_minutes"] = 0

    return mission


# ---- Ambulances ------------------------------------------------------------

@router.get("/ambulances")
def list_ambulances(
    status: Optional[str] = None,
):
    results = list(AMBULANCES.values())
    if status and isinstance(status, str):
        results = [a for a in results if a["status"] == status]
    return {"ambulances": results, "total": len(results)}


@router.put("/ambulances/{ambulance_id}/assign")
def assign_ambulance(ambulance_id: str, payload: AmbulanceAssign):
    ambulance = AMBULANCES.get(ambulance_id)
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    mission = MISSIONS.get(payload.mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    ambulance["status"] = "on_mission"
    ambulance["current_mission"] = payload.mission_id
    ambulance["last_updated"] = _now().isoformat()

    mission["ambulance_id"] = ambulance_id
    mission["status"] = "in_transit"
    mission["updated_at"] = _now().isoformat()

    # Notification
    nid = _next_notif_id()
    NOTIFICATIONS.append(
        {
            "id": nid,
            "type": "ambulance_dispatched",
            "title": "Ambulance Dispatched",
            "message": f"{ambulance_id} assigned to mission {payload.mission_id}.",
            "mission_id": payload.mission_id,
            "severity": "info",
            "read": False,
            "created_at": _now().isoformat(),
        }
    )

    return {"ambulance": ambulance, "mission": mission}


# ---- Hospitals -------------------------------------------------------------

@router.get("/hospitals")
def list_hospitals():
    return {"hospitals": HOSPITALS, "total": len(HOSPITALS)}


# ---- Traffic junctions -----------------------------------------------------

@router.get("/traffic/junctions")
def list_junctions():
    return {"junctions": TRAFFIC_JUNCTIONS, "total": len(TRAFFIC_JUNCTIONS)}


@router.put("/traffic/junctions/{junction_id}/status")
def update_junction_status(junction_id: str, payload: JunctionStatusUpdate):
    junction = next((j for j in TRAFFIC_JUNCTIONS if j["id"] == junction_id), None)
    if not junction:
        raise HTTPException(status_code=404, detail="Junction not found")

    junction["status"] = payload.status

    if payload.status == "green_corridor":
        junction["signal_state"] = "green"
        junction["avg_wait_seconds"] = 0
    elif payload.status == "normal":
        junction["signal_state"] = "auto"
        junction["avg_wait_seconds"] = 45
    else:
        junction["signal_state"] = "manual"

    return junction


@router.post("/traffic/corridors", status_code=201)
def create_corridor(payload: CorridorCreate):
    mission = MISSIONS.get(payload.mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    activated: list[dict] = []
    for jid in payload.junction_ids:
        junction = next((j for j in TRAFFIC_JUNCTIONS if j["id"] == jid), None)
        if junction:
            junction["status"] = "green_corridor"
            junction["active_mission"] = payload.mission_id
            junction["signal_state"] = "green"
            junction["avg_wait_seconds"] = 0
            activated.append(junction)

    # Notification
    nid = _next_notif_id()
    NOTIFICATIONS.append(
        {
            "id": nid,
            "type": "corridor_activated",
            "title": "Green Corridor Activated",
            "message": (
                f"Green corridor activated for mission {payload.mission_id} "
                f"across {len(activated)} junctions."
            ),
            "mission_id": payload.mission_id,
            "severity": "warning",
            "read": False,
            "created_at": _now().isoformat(),
        }
    )

    return {
        "mission_id": payload.mission_id,
        "activated_junctions": activated,
        "total_activated": len(activated),
    }


# ---- Notifications ---------------------------------------------------------

@router.get("/notifications")
def list_notifications():
    # Return newest first
    sorted_notifs = sorted(
        NOTIFICATIONS, key=lambda n: n["created_at"], reverse=True
    )
    return {"notifications": sorted_notifs, "total": len(sorted_notifs)}
