/**
 * GREEN CORRIDOR AI PLATFORM - SHARED MISSION DATA & COORDINATION ENGINE
 * Powers all 4 dashboards (Central Control, Ambulance, Hospital, Traffic)
 * Maintains state synchronization via LocalStorage & in-memory store
 */

(function () {
  'use strict';

  // Default Delhi NCR Hospital Database
  const INITIAL_HOSPITALS = [
    {
      id: 'HOSP-001',
      name: 'AIIMS New Delhi',
      address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      phone: '+91-11-26588500',
      email: 'emergency@aiims.edu',
      lat: 28.5672,
      lng: 77.2100,
      type: 'Both',
      availableBeds: 18,
      hasEmergency: true,
      isActive: true,
      incomingMissions: 2,
      organCapabilities: ['Kidney', 'Liver', 'Heart', 'Lungs', 'Cornea', 'Pancreas']
    },
    {
      id: 'HOSP-002',
      name: 'Safdarjung Hospital',
      address: 'Ring Road, Opposite AIIMS, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      phone: '+91-11-26707437',
      email: 'trauma@safdarjung.nic.in',
      lat: 28.5681,
      lng: 77.2065,
      type: 'Donor',
      availableBeds: 24,
      hasEmergency: true,
      isActive: true,
      incomingMissions: 1,
      organCapabilities: ['Kidney', 'Liver', 'Cornea']
    },
    {
      id: 'HOSP-003',
      name: 'Max Super Speciality Hospital, Saket',
      address: '1, 2, Press Enclave Marg, Saket Institutional Area, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      phone: '+91-11-26515050',
      email: 'transplant@maxhealthcare.com',
      lat: 28.5275,
      lng: 77.2135,
      type: 'Recipient',
      availableBeds: 8,
      hasEmergency: true,
      isActive: true,
      incomingMissions: 2,
      organCapabilities: ['Kidney', 'Liver', 'Heart', 'Pancreas']
    },
    {
      id: 'HOSP-004',
      name: 'Fortis Escorts Heart Institute',
      address: 'Okhla Road, Sukhdev Vihar, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      phone: '+91-11-47135000',
      email: 'cardiac.er@fortishealthcare.com',
      lat: 28.5500,
      lng: 77.2250,
      type: 'Recipient',
      availableBeds: 6,
      hasEmergency: true,
      isActive: true,
      incomingMissions: 1,
      organCapabilities: ['Heart', 'Lungs']
    },
    {
      id: 'HOSP-005',
      name: 'Sir Ganga Ram Hospital',
      address: 'Rajinder Nagar, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      phone: '+91-11-25750000',
      email: 'coord@sgrh.com',
      lat: 28.6417,
      lng: 77.1898,
      type: 'Both',
      availableBeds: 12,
      hasEmergency: true,
      isActive: true,
      incomingMissions: 0,
      organCapabilities: ['Kidney', 'Liver', 'Pancreas']
    },
    {
      id: 'HOSP-006',
      name: 'Indraprastha Apollo Hospital',
      address: 'Delhi Mathura Road, Sarita Vihar, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      phone: '+91-11-26925858',
      email: 'er@apollohospitalsdelhi.com',
      lat: 28.5560,
      lng: 77.2840,
      type: 'Both',
      availableBeds: 15,
      hasEmergency: true,
      isActive: true,
      incomingMissions: 1,
      organCapabilities: ['Kidney', 'Liver', 'Heart', 'Lungs']
    },
    {
      id: 'HOSP-007',
      name: 'Medanta - The Medicity',
      address: 'CH Bakhtawar Singh Road, Sector 38, Gurugram',
      city: 'Gurugram',
      state: 'Haryana',
      phone: '+91-124-4141414',
      email: 'transplant@medanta.org',
      lat: 28.4408,
      lng: 77.0420,
      type: 'Both',
      availableBeds: 20,
      hasEmergency: true,
      isActive: true,
      incomingMissions: 1,
      organCapabilities: ['Kidney', 'Liver', 'Heart', 'Lungs', 'Pancreas']
    },
    {
      id: 'HOSP-008',
      name: 'BLK-Max Super Speciality Hospital',
      address: 'Pusa Road, Karol Bagh, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      phone: '+91-11-30403040',
      email: 'contact@blkmax.com',
      lat: 28.6468,
      lng: 77.1856,
      type: 'Both',
      availableBeds: 10,
      hasEmergency: true,
      isActive: true,
      incomingMissions: 0,
      organCapabilities: ['Liver', 'Kidney', 'Heart']
    }
  ];

  // Default Ambulances Fleet
  const INITIAL_AMBULANCES = [
    {
      id: 'AMB-001',
      registration: 'DL-01-EMG-4402',
      vehicleModel: 'Force Traveller Advance Life Support (ALS)',
      ambulanceType: 'ALS',
      driverName: 'Rajesh Kumar Verma',
      driverContact: '+91-98711-23456',
      assignedMissionId: 'GC-2026-DEL-435',
      currentLat: 28.5530,
      currentLng: 77.2140,
      speed: 68,
      etaMinutes: 12,
      status: 'En Route',
      gpsConnected: true,
      coldChain: {
        boxId: 'CC-BOX-881',
        temperature: 4.2,
        connected: true,
        lastSensorUpdate: 'Just now',
        preservationStatus: 'Optimal'
      }
    },
    {
      id: 'AMB-002',
      registration: 'DL-02-CRT-9104',
      vehicleModel: 'Tata Winger Critical Care Unit (CCU)',
      ambulanceType: 'CCU',
      driverName: 'Sanjay Sharma',
      driverContact: '+91-98102-34567',
      assignedMissionId: 'GC-2026-DEL-436',
      currentLat: 28.5600,
      currentLng: 77.2180,
      speed: 72,
      etaMinutes: 9,
      status: 'En Route',
      gpsConnected: true,
      coldChain: {
        boxId: 'CC-BOX-412',
        temperature: 3.8,
        connected: true,
        lastSensorUpdate: '1 min ago',
        preservationStatus: 'Optimal'
      }
    },
    {
      id: 'AMB-003',
      registration: 'DL-01-EMS-1022',
      vehicleModel: 'Force Traveller Trauma Ambulance',
      ambulanceType: 'ALS',
      driverName: 'Vikram Singh Chauhan',
      driverContact: '+91-99580-45678',
      assignedMissionId: null,
      currentLat: 28.5672,
      currentLng: 77.2100,
      speed: 0,
      etaMinutes: 0,
      status: 'Available',
      gpsConnected: true,
      coldChain: {
        boxId: 'CC-BOX-105',
        temperature: 4.0,
        connected: true,
        lastSensorUpdate: '5 mins ago',
        preservationStatus: 'Standby'
      }
    },
    {
      id: 'AMB-004',
      registration: 'DL-03-MED-5561',
      vehicleModel: 'Mahindra Supro Life Support',
      ambulanceType: 'BLS',
      driverName: 'Dharmendra Yadav',
      driverContact: '+91-97110-56789',
      assignedMissionId: 'GC-2026-DEL-437',
      currentLat: 28.5000,
      currentLng: 77.1100,
      speed: 64,
      etaMinutes: 28,
      status: 'En Route',
      gpsConnected: true,
      coldChain: {
        boxId: 'CC-BOX-329',
        temperature: 4.5,
        connected: true,
        lastSensorUpdate: 'Just now',
        preservationStatus: 'Optimal'
      }
    },
    {
      id: 'AMB-005',
      registration: 'DL-04-TRN-7788',
      vehicleModel: 'Force Traveller Cardiac Unit',
      ambulanceType: 'ALS',
      driverName: 'Amit Saxena',
      driverContact: '+91-98730-67890',
      assignedMissionId: null,
      currentLat: 28.6417,
      currentLng: 77.1898,
      speed: 0,
      etaMinutes: 0,
      status: 'Available',
      gpsConnected: true,
      coldChain: {
        boxId: 'CC-BOX-701',
        temperature: 4.1,
        connected: true,
        lastSensorUpdate: '8 mins ago',
        preservationStatus: 'Standby'
      }
    },
    {
      id: 'AMB-006',
      registration: 'DL-02-EMG-3319',
      vehicleModel: 'Tata Winger ICU On Wheels',
      ambulanceType: 'CCU',
      driverName: 'Manish Rawat',
      driverContact: '+91-98990-78901',
      assignedMissionId: 'GC-2026-DEL-438',
      currentLat: 28.6000,
      currentLng: 77.2400,
      speed: 58,
      etaMinutes: 18,
      status: 'Assigned',
      gpsConnected: true,
      coldChain: {
        boxId: 'CC-BOX-550',
        temperature: 4.3,
        connected: true,
        lastSensorUpdate: '2 mins ago',
        preservationStatus: 'Optimal'
      }
    },
    {
      id: 'AMB-007',
      registration: 'DL-05-EMR-8812',
      vehicleModel: 'Force Traveller Trauma ALS',
      ambulanceType: 'ALS',
      driverName: 'Harish Chandra',
      driverContact: '+91-98115-89012',
      assignedMissionId: null,
      currentLat: 28.6468,
      currentLng: 77.1856,
      speed: 0,
      etaMinutes: 0,
      status: 'Offline',
      gpsConnected: false,
      coldChain: {
        boxId: 'CC-BOX-202',
        temperature: 7.2,
        connected: false,
        lastSensorUpdate: '45 mins ago',
        preservationStatus: 'Warning'
      }
    }
  ];

  // Default Traffic Control Junctions
  const INITIAL_TRAFFIC_JUNCTIONS = [
    {
      id: 'JN-001',
      name: 'AIIMS - Ring Road Crossing',
      location: 'Ring Road outside AIIMS Emergency gate',
      lat: 28.5685,
      lng: 77.2110,
      trafficDensity: 'Congested',
      signalStatus: 'Corridor Activated',
      corridorStatus: 'Activated',
      assignedUnit: 'Traffic Unit South-1 (ASI Rakesh)',
      relatedMissionId: 'GC-2026-DEL-435'
    },
    {
      id: 'JN-002',
      name: 'South Extension Flyover Junction',
      location: 'Mahatma Gandhi Marg, South Ex-1',
      lat: 28.5720,
      lng: 77.2200,
      trafficDensity: 'Cleared',
      signalStatus: 'Route Cleared',
      corridorStatus: 'Cleared',
      assignedUnit: 'Traffic Unit South-2 (SI Vinod)',
      relatedMissionId: 'GC-2026-DEL-435'
    },
    {
      id: 'JN-003',
      name: 'Moolchand Underpass Crossing',
      location: 'Ring Road - Lala Lajpat Rai Marg',
      lat: 28.5689,
      lng: 77.2340,
      trafficDensity: 'Medium',
      signalStatus: 'Corridor Activated',
      corridorStatus: 'Activated',
      assignedUnit: 'Traffic Unit South-3 (ASI Manoj)',
      relatedMissionId: 'GC-2026-DEL-435'
    },
    {
      id: 'JN-004',
      name: 'Ashram Chowk Intersection',
      location: 'Ring Road & Mathura Road Junction',
      lat: 28.5710,
      lng: 77.2520,
      trafficDensity: 'High',
      signalStatus: 'Clearance Requested',
      corridorStatus: 'Clearance Requested',
      assignedUnit: 'Traffic Unit South-East (Insp. Sharma)',
      relatedMissionId: 'GC-2026-DEL-435'
    },
    {
      id: 'JN-005',
      name: 'Nehru Place Outer Ring Road',
      location: 'Outer Ring Road, Nehru Place Flyover',
      lat: 28.5490,
      lng: 77.2525,
      trafficDensity: 'Normal',
      signalStatus: 'Normal',
      corridorStatus: 'Normal',
      assignedUnit: 'Traffic Unit South-4 (HC Suresh)',
      relatedMissionId: null
    },
    {
      id: 'JN-006',
      name: 'Saket Metro Intersection',
      location: 'Press Enclave Marg & Mehrauli-Badarpur Rd',
      lat: 28.5230,
      lng: 77.2080,
      trafficDensity: 'Normal',
      signalStatus: 'Corridor Activated',
      corridorStatus: 'Activated',
      assignedUnit: 'Traffic Unit South-Saket (ASI Pradeep)',
      relatedMissionId: 'GC-2026-DEL-435'
    },
    {
      id: 'JN-007',
      name: 'Dhaula Kuan Central Junction',
      location: 'National Highway 48 & Ring Road',
      lat: 28.5920,
      lng: 77.1630,
      trafficDensity: 'High',
      signalStatus: 'Clearance Requested',
      corridorStatus: 'Clearance Requested',
      assignedUnit: 'Traffic Unit West (SI Ashok)',
      relatedMissionId: 'GC-2026-DEL-437'
    },
    {
      id: 'JN-008',
      name: 'Rajiv Chowk Underpass (Gurugram)',
      location: 'NH-48 Rajiv Chowk, Sector 38',
      lat: 28.4550,
      lng: 77.0380,
      trafficDensity: 'Cleared',
      signalStatus: 'Route Cleared',
      corridorStatus: 'Cleared',
      assignedUnit: 'Gurugram Traffic Unit 4 (ASI Pawan)',
      relatedMissionId: 'GC-2026-DEL-437'
    },
    {
      id: 'JN-009',
      name: 'ITO Central Intersection',
      location: 'Vikas Marg & Bahadur Shah Zafar Marg',
      lat: 28.6290,
      lng: 77.2410,
      trafficDensity: 'Normal',
      signalStatus: 'Normal',
      corridorStatus: 'Normal',
      assignedUnit: 'Central Traffic Cell (Insp. R.K. Meena)',
      relatedMissionId: null
    }
  ];

  // Default Active Missions
  const INITIAL_MISSIONS = [
    {
      id: 'GC-2026-DEL-435',
      organType: 'Kidney',
      donorHospital: 'AIIMS New Delhi',
      recipientHospital: 'Max Super Speciality Hospital, Saket',
      ambulanceId: 'AMB-001',
      driverName: 'Rajesh Kumar Verma',
      driverContact: '+91-98711-23456',
      currentLocation: 'Ring Road near Moolchand',
      currentLat: 28.5530,
      currentLng: 77.2140,
      originLat: 28.5672,
      originLng: 77.2100,
      destLat: 28.5275,
      destLng: 77.2135,
      distanceRemaining: 7.2,
      etaMinutes: 12,
      status: 'In Transit',
      priority: 'Critical',
      createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
      harvestTime: new Date(Date.now() - 45 * 60000).toISOString(),
      crossClampTime: new Date(Date.now() - 40 * 60000).toISOString(),
      organPreservationMinutes: 1380, // 23h remaining (Kidney max 24h)
      coldIschemiaMax: 1440,
      corridorStatus: 'Activated',
      donorRefId: 'DONOR-2026-0891',
      recipientRefId: 'RECIP-2026-1142',
      timeline: [
        { title: 'Mission Created', time: '45m ago', done: true, desc: 'Organ retrieval alert authorized by NOTTO' },
        { title: 'Organ Harvested', time: '40m ago', done: true, desc: 'Donor cross-clamp completed in AIIMS OT-4' },
        { title: 'Ambulance Dispatched', time: '35m ago', done: true, desc: 'ALS Vehicle DL-01-EMG-4402 departed AIIMS' },
        { title: 'Green Corridor Activated', time: '30m ago', done: true, desc: 'Delhi Traffic Police activated Corridor #4' },
        { title: 'Organ In Transit', time: 'Active Now', done: true, desc: 'Current speed 68 km/h on Ring Road' },
        { title: 'Hospital Reached', time: 'ETA 12m', done: false, desc: 'Max Saket Trauma Reception standing by' },
        { title: 'Organ Handover Completed', time: 'Pending', done: false, desc: 'Digital QR seal verification' }
      ]
    },
    {
      id: 'GC-2026-DEL-436',
      organType: 'Heart',
      donorHospital: 'Safdarjung Hospital',
      recipientHospital: 'Fortis Escorts Heart Institute',
      ambulanceId: 'AMB-002',
      driverName: 'Sanjay Sharma',
      driverContact: '+91-98102-34567',
      currentLocation: 'Barapullah Corridor Flyover',
      currentLat: 28.5600,
      currentLng: 77.2180,
      originLat: 28.5681,
      originLng: 77.2065,
      destLat: 28.5500,
      destLng: 77.2250,
      distanceRemaining: 5.4,
      etaMinutes: 9,
      status: 'In Transit',
      priority: 'Critical',
      createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
      harvestTime: new Date(Date.now() - 30 * 60000).toISOString(),
      crossClampTime: new Date(Date.now() - 28 * 60000).toISOString(),
      organPreservationMinutes: 210, // 3h 30m remaining (Heart max 4h / 240m)
      coldIschemiaMax: 240,
      corridorStatus: 'Activated',
      donorRefId: 'DONOR-2026-0894',
      recipientRefId: 'RECIP-2026-1145',
      timeline: [
        { title: 'Mission Created', time: '30m ago', done: true, desc: 'Critical heart match confirmed' },
        { title: 'Organ Harvested', time: '28m ago', done: true, desc: 'Cross-clamp initiated in Safdarjung OT' },
        { title: 'Ambulance Dispatched', time: '22m ago', done: true, desc: 'Speed convoy DL-02-CRT-9104 rolling' },
        { title: 'Green Corridor Activated', time: '20m ago', done: true, desc: 'Traffic clearance approved across 4 signals' },
        { title: 'Organ In Transit', time: 'Active Now', done: true, desc: 'Barapullah clear, speed 72 km/h' },
        { title: 'Hospital Reached', time: 'ETA 9m', done: false, desc: 'Fortis Escorts Cardiac OT prepped' },
        { title: 'Organ Handover Completed', time: 'Pending', done: false, desc: 'Transplant surgeon team waiting' }
      ]
    },
    {
      id: 'GC-2026-DEL-437',
      organType: 'Liver',
      donorHospital: 'Medanta - The Medicity',
      recipientHospital: 'AIIMS New Delhi',
      ambulanceId: 'AMB-004',
      driverName: 'Dharmendra Yadav',
      driverContact: '+91-97110-56789',
      currentLocation: 'NH-48 near Mahipalpur Flyover',
      currentLat: 28.5000,
      currentLng: 77.1100,
      originLat: 28.4408,
      originLng: 77.0420,
      destLat: 28.5672,
      destLng: 77.2100,
      distanceRemaining: 18.5,
      etaMinutes: 28,
      status: 'In Transit',
      priority: 'High',
      createdAt: new Date(Date.now() - 50 * 60000).toISOString(),
      harvestTime: new Date(Date.now() - 60 * 60000).toISOString(),
      crossClampTime: new Date(Date.now() - 55 * 60000).toISOString(),
      organPreservationMinutes: 660, // 11h remaining (Liver max 12h / 720m)
      coldIschemiaMax: 720,
      corridorStatus: 'Activated',
      donorRefId: 'DONOR-2026-0888',
      recipientRefId: 'RECIP-2026-1139',
      timeline: [
        { title: 'Mission Created', time: '60m ago', done: true, desc: 'Interstate corridor initialized (HR -> DL)' },
        { title: 'Organ Harvested', time: '55m ago', done: true, desc: 'Liver organ graft preserved in cold perfusion' },
        { title: 'Ambulance Dispatched', time: '48m ago', done: true, desc: 'DL-03-MED-5561 exited Medanta Gurgaon' },
        { title: 'Green Corridor Activated', time: '45m ago', done: true, desc: 'Joint Gurugram & Delhi Police Corridor' },
        { title: 'Organ In Transit', time: 'Active Now', done: true, desc: 'Approaching Dhaula Kuan interchange' },
        { title: 'Hospital Reached', time: 'ETA 28m', done: false, desc: 'AIIMS Liver ICU pre-admission complete' },
        { title: 'Organ Handover Completed', time: 'Pending', done: false, desc: 'Final biometric handover pending' }
      ]
    },
    {
      id: 'GC-2026-DEL-438',
      organType: 'Lungs',
      donorHospital: 'Indraprastha Apollo Hospital',
      recipientHospital: 'Sir Ganga Ram Hospital',
      ambulanceId: 'AMB-006',
      driverName: 'Manish Rawat',
      driverContact: '+91-98990-78901',
      currentLocation: 'Mathura Road at Apollo Exit',
      currentLat: 28.6000,
      currentLng: 77.2400,
      originLat: 28.5560,
      originLng: 77.2840,
      destLat: 28.6417,
      destLng: 77.1898,
      distanceRemaining: 14.8,
      etaMinutes: 22,
      status: 'Dispatched',
      priority: 'Critical',
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      harvestTime: new Date(Date.now() - 20 * 60000).toISOString(),
      crossClampTime: new Date(Date.now() - 18 * 60000).toISOString(),
      organPreservationMinutes: 340, // 5h 40m remaining (Lungs max 6h / 360m)
      coldIschemiaMax: 360,
      corridorStatus: 'Clearance Requested',
      donorRefId: 'DONOR-2026-0899',
      recipientRefId: 'RECIP-2026-1150',
      timeline: [
        { title: 'Mission Created', time: '20m ago', done: true, desc: 'Dual lung harvest completed successfully' },
        { title: 'Organ Harvested', time: '18m ago', done: true, desc: 'Cold preservation canister initialized' },
        { title: 'Ambulance Dispatched', time: '5m ago', done: true, desc: 'DL-02-EMG-3319 departing Apollo Hospital' },
        { title: 'Green Corridor Activated', time: 'In Progress', done: false, desc: 'Clearance pending for ITO junction' },
        { title: 'Organ In Transit', time: 'Pending', done: false, desc: 'En route to central Delhi' },
        { title: 'Hospital Reached', time: 'Pending', done: false, desc: 'Ganga Ram pulmonary OT ready' },
        { title: 'Organ Handover Completed', time: 'Pending', done: false, desc: 'Awaiting arrival' }
      ]
    },
    {
      id: 'GC-2026-DEL-430',
      organType: 'Liver',
      donorHospital: 'BLK-Max Super Speciality Hospital',
      recipientHospital: 'AIIMS New Delhi',
      ambulanceId: 'AMB-003',
      driverName: 'Vikram Singh Chauhan',
      driverContact: '+91-99580-45678',
      currentLocation: 'AIIMS Main OT Gate 3',
      currentLat: 28.5672,
      currentLng: 77.2100,
      originLat: 28.6468,
      originLng: 77.1856,
      destLat: 28.5672,
      destLng: 77.2100,
      distanceRemaining: 0,
      etaMinutes: 0,
      status: 'Completed',
      priority: 'Critical',
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      harvestTime: new Date(Date.now() - 4.5 * 3600000).toISOString(),
      crossClampTime: new Date(Date.now() - 4.2 * 3600000).toISOString(),
      organPreservationMinutes: 0,
      coldIschemiaMax: 720,
      corridorStatus: 'Cleared',
      donorRefId: 'DONOR-2026-0870',
      recipientRefId: 'RECIP-2026-1120',
      timeline: [
        { title: 'Mission Created', time: '4.5h ago', done: true, desc: 'Emergency donor match found' },
        { title: 'Organ Harvested', time: '4.2h ago', done: true, desc: 'Organ retrieved at BLK-Max OT' },
        { title: 'Ambulance Dispatched', time: '3.8h ago', done: true, desc: 'Ambulance rolled with police escort' },
        { title: 'Green Corridor Activated', time: '3.7h ago', done: true, desc: '12-kilometer corridor opened via Patel Nagar' },
        { title: 'Organ In Transit', time: '3.5h ago', done: true, desc: 'Transport time: 24 minutes' },
        { title: 'Hospital Reached', time: '3.1h ago', done: true, desc: 'Arrived at AIIMS Gate 3' },
        { title: 'Organ Handover Completed', time: '3.0h ago', done: true, desc: 'Received & verified by Dr. V. Sen' }
      ]
    }
  ];

  // Default Notifications
  const INITIAL_NOTIFICATIONS = [
    {
      id: 'NOTIF-101',
      type: 'Corridor',
      message: 'Green Corridor activated for Mission GC-2026-DEL-435 (Kidney) on Ring Road route.',
      severity: 'critical',
      timestamp: '5 mins ago',
      read: false
    },
    {
      id: 'NOTIF-102',
      type: 'Ambulance',
      message: 'Ambulance DL-02-CRT-9104 approaching Barapullah flyover with Heart transplant.',
      severity: 'warning',
      timestamp: '12 mins ago',
      read: false
    },
    {
      id: 'NOTIF-103',
      type: 'Hospital',
      message: 'Max Saket has confirmed reception team readiness for incoming kidney.',
      severity: 'info',
      timestamp: '18 mins ago',
      read: false
    },
    {
      id: 'NOTIF-104',
      type: 'Traffic',
      message: 'Traffic Unit South-2 successfully cleared South Extension flyover section.',
      severity: 'info',
      timestamp: '25 mins ago',
      read: true
    },
    {
      id: 'NOTIF-105',
      type: 'Mission',
      message: 'Mission GC-2026-DEL-430 marked COMPLETED with successful organ handover.',
      severity: 'success',
      timestamp: '3 hours ago',
      read: true
    }
  ];

  // Load from LocalStorage or initialize with defaults
  function loadData(key, fallback) {
    try {
      const stored = localStorage.getItem('GC_PLATFORM_' + key);
      return stored ? JSON.parse(stored) : fallback;
    } catch (e) {
      console.warn('LocalStorage read failed, using in-memory fallback:', e);
      return fallback;
    }
  }

  function saveData(key, value) {
    try {
      localStorage.setItem('GC_PLATFORM_' + key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  // Global State Singleton
  window.GC_DATA = {
    missions: loadData('MISSIONS', INITIAL_MISSIONS),
    ambulances: loadData('AMBULANCES', INITIAL_AMBULANCES),
    hospitals: loadData('HOSPITALS', INITIAL_HOSPITALS),
    trafficJunctions: loadData('TRAFFIC', INITIAL_TRAFFIC_JUNCTIONS),
    notifications: loadData('NOTIFS', INITIAL_NOTIFICATIONS),

    // Persistence Methods
    saveAll: function () {
      saveData('MISSIONS', this.missions);
      saveData('AMBULANCES', this.ambulances);
      saveData('HOSPITALS', this.hospitals);
      saveData('TRAFFIC', this.trafficJunctions);
      saveData('NOTIFS', this.notifications);
    },

    resetToDefaults: function () {
      this.missions = JSON.parse(JSON.stringify(INITIAL_MISSIONS));
      this.ambulances = JSON.parse(JSON.stringify(INITIAL_AMBULANCES));
      this.hospitals = JSON.parse(JSON.stringify(INITIAL_HOSPITALS));
      this.trafficJunctions = JSON.parse(JSON.stringify(INITIAL_TRAFFIC_JUNCTIONS));
      this.notifications = JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS));
      this.saveAll();
    },

    // Queries
    getMissionById: function (id) {
      return this.missions.find(m => m.id === id);
    },

    getAmbulanceById: function (id) {
      return this.ambulances.find(a => a.id === id);
    },

    getHospitalById: function (id) {
      return this.hospitals.find(h => h.id === id);
    },

    getStats: function () {
      const total = this.missions.length;
      const active = this.missions.filter(m => m.status === 'In Transit' || m.status === 'Dispatched' || m.status === 'Activated').length;
      const completed = this.missions.filter(m => m.status === 'Completed').length;
      const activeAmbulances = this.ambulances.filter(a => a.status === 'En Route' || a.status === 'Assigned').length;
      const connectedHospitals = this.hospitals.filter(h => h.isActive).length;
      const emergencyAlerts = this.notifications.filter(n => !n.read && n.severity === 'critical').length;

      return {
        totalMissions: total,
        activeMissions: active,
        completedMissions: completed,
        activeAmbulances: activeAmbulances,
        connectedHospitals: connectedHospitals,
        emergencyAlerts: emergencyAlerts || 3,
        successRate: '98.5%',
        avgTransportTime: '24 min'
      };
    },

    // Actions & Interconnected Workflow
    createMission: function (missionData) {
      const year = new Date().getFullYear();
      const randNum = Math.floor(100 + Math.random() * 900);
      const newId = `GC-${year}-DEL-${randNum}`;

      // Max preservation minutes by organ
      const organLimits = {
        'Heart': 240,     // 4h
        'Lungs': 360,     // 6h
        'Liver': 720,     // 12h
        'Pancreas': 720,  // 12h
        'Kidney': 1440,   // 24h
        'Cornea': 2880    // 48h
      };

      const maxLimit = organLimits[missionData.organType] || 720;

      const newMission = {
        id: newId,
        organType: missionData.organType,
        donorHospital: missionData.donorHospital,
        recipientHospital: missionData.recipientHospital,
        ambulanceId: missionData.ambulanceId || null,
        driverName: missionData.driverName || 'Pending Assignment',
        driverContact: missionData.driverContact || 'N/A',
        currentLocation: missionData.donorHospital + ' Premises',
        currentLat: 28.5672,
        currentLng: 77.2100,
        originLat: 28.5672,
        originLng: 77.2100,
        destLat: 28.5275,
        destLng: 77.2135,
        distanceRemaining: 15.0,
        etaMinutes: 20,
        status: 'Created',
        priority: missionData.priority || 'Critical',
        createdAt: new Date().toISOString(),
        harvestTime: new Date().toISOString(),
        crossClampTime: new Date().toISOString(),
        organPreservationMinutes: maxLimit,
        coldIschemiaMax: maxLimit,
        corridorStatus: 'Clearance Requested',
        donorRefId: 'DONOR-' + Math.floor(1000 + Math.random() * 9000),
        recipientRefId: 'RECIP-' + Math.floor(1000 + Math.random() * 9000),
        timeline: [
          { title: 'Mission Created', time: 'Just now', done: true, desc: 'Created in Central Control Room' },
          { title: 'Organ Harvested', time: 'In Progress', done: false, desc: 'Surgical harvesting underway' },
          { title: 'Ambulance Dispatched', time: 'Pending', done: false, desc: 'Awaiting unit dispatch' },
          { title: 'Green Corridor Activated', time: 'Requested', done: false, desc: 'Traffic clearance alert initiated' },
          { title: 'Organ In Transit', time: 'Pending', done: false, desc: 'En route' },
          { title: 'Hospital Reached', time: 'Pending', done: false, desc: 'Arrival confirmation pending' },
          { title: 'Organ Handover Completed', time: 'Pending', done: false, desc: 'Final digital signature' }
        ]
      };

      this.missions.unshift(newMission);

      // 1. Update Ambulance if assigned
      if (missionData.ambulanceId) {
        const amb = this.getAmbulanceById(missionData.ambulanceId);
        if (amb) {
          amb.status = 'Assigned';
          amb.assignedMissionId = newId;
          newMission.status = 'Dispatched';
          newMission.driverName = amb.driverName;
          newMission.driverContact = amb.driverContact;
        }
      }

      // 2. Alert Traffic Control
      this.trafficJunctions.slice(0, 3).forEach(jn => {
        jn.corridorStatus = 'Clearance Requested';
        jn.relatedMissionId = newId;
      });

      // 3. Add Notification
      this.notifications.unshift({
        id: 'NOTIF-' + Date.now(),
        type: 'Mission',
        message: `New mission ${newId} (${newMission.organType}) initiated from ${newMission.donorHospital}.`,
        severity: 'critical',
        timestamp: 'Just now',
        read: false
      });

      this.saveAll();
      return newMission;
    },

    updateMissionStatus: function (missionId, newStatus) {
      const mission = this.getMissionById(missionId);
      if (!mission) return false;

      mission.status = newStatus;

      if (newStatus === 'Completed') {
        mission.distanceRemaining = 0;
        mission.etaMinutes = 0;
        mission.corridorStatus = 'Cleared';
        mission.timeline.forEach(t => t.done = true);

        // Free up assigned ambulance
        if (mission.ambulanceId) {
          const amb = this.getAmbulanceById(mission.ambulanceId);
          if (amb) {
            amb.status = 'Available';
            amb.assignedMissionId = null;
            amb.speed = 0;
          }
        }

        // Release traffic junctions
        this.trafficJunctions.forEach(jn => {
          if (jn.relatedMissionId === missionId) {
            jn.corridorStatus = 'Normal';
            jn.signalStatus = 'Normal';
            jn.relatedMissionId = null;
          }
        });
      } else if (newStatus === 'In Transit') {
        mission.corridorStatus = 'Activated';
      }

      this.notifications.unshift({
        id: 'NOTIF-' + Date.now(),
        type: 'Status',
        message: `Mission ${missionId} updated to status: ${newStatus}`,
        severity: newStatus === 'Completed' ? 'success' : 'info',
        timestamp: 'Just now',
        read: false
      });

      this.saveAll();
      return true;
    },

    assignAmbulance: function (ambulanceId, missionId) {
      const amb = this.getAmbulanceById(ambulanceId);
      const mission = this.getMissionById(missionId);
      if (!amb || !mission) return false;

      amb.status = 'En Route';
      amb.assignedMissionId = missionId;
      amb.speed = 65;

      mission.ambulanceId = ambulanceId;
      mission.driverName = amb.driverName;
      mission.driverContact = amb.driverContact;
      mission.status = 'In Transit';

      this.notifications.unshift({
        id: 'NOTIF-' + Date.now(),
        type: 'Ambulance',
        message: `Ambulance ${amb.registration} assigned to Mission ${missionId}.`,
        severity: 'info',
        timestamp: 'Just now',
        read: false
      });

      this.saveAll();
      return true;
    },

    updateJunctionStatus: function (junctionId, newStatus) {
      const jn = this.trafficJunctions.find(j => j.id === junctionId);
      if (!jn) return false;

      jn.corridorStatus = newStatus;
      jn.signalStatus = newStatus === 'Activated' ? 'Corridor Activated' : (newStatus === 'Cleared' ? 'Route Cleared' : 'Normal');
      if (newStatus === 'Cleared') {
        jn.trafficDensity = 'Cleared';
      }

      this.saveAll();
      return true;
    }
  };

  // Expose helper on window
  window.GC_DATA.saveAll();
})();
