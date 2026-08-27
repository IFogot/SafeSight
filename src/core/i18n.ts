import { SupportedLanguage } from './types';

export interface TranslationDict {
  appName: string;
  appTagline: string;
  nav: {
    liveVision: string;
    digitalTwin: string;
    eecRegional: string;
    hazardReporter: string;
    predictiveAi: string;
    iotSensors: string;
    workerAcademy: string;
    emergencyHub: string;
    workerMobile: string;
    auditLog: string;
  };
  roles: {
    safetyOfficer: string;
    worker: string;
    eecAdmin: string;
    switchRole: string;
  };
  status: {
    live: string;
    normal: string;
    warning: string;
    critical: string;
    compliant: string;
    violation: string;
    evacuate: string;
    systemArmed: string;
  };
  vision: {
    title: string;
    subtitle: string;
    modeWebcam: string;
    modeCctvMatrix: string;
    modeMediaScan: string;
    complianceScore: string;
    activeViolations: string;
    peopleDetected: string;
    ppeHardHat: string;
    ppeVest: string;
    ppeGlasses: string;
    ppeGloves: string;
    ppeBoots: string;
    dangerZone: string;
    fallDetected: string;
    triggerSimViolation: string;
    clearViolation: string;
    takeSnapshot: string;
    audioWarningActive: string;
    voiceAlarmOn: string;
    voiceAlarmOff: string;
    zonePetro: string;
    zoneStamping: string;
    zoneWelding: string;
    zoneLogistics: string;
  };
  digitalTwin: {
    title: string;
    subtitle: string;
    zoneA: string;
    zoneB: string;
    zoneC: string;
    zoneD: string;
    heatMapToggle: string;
    workersBadge: string;
    iotSensorsToggle: string;
    evacuationRoutes: string;
    zoneRiskLevel: string;
    activePersonnel: string;
  };
  eecMap: {
    title: string;
    subtitle: string;
    corridorOverview: string;
    totalEstates: string;
    avgSafetyScore: string;
    incidentRate: string;
    migrantLaborCoverage: string;
    viewEstate: string;
    chonburi: string;
    rayong: string;
    chachoengsao: string;
  };
  hazard: {
    title: string;
    subtitle: string;
    voiceReportBtn: string;
    recording: string;
    stopRecording: string;
    uploadPhoto: string;
    category: string;
    locationZone: string;
    description: string;
    submitReport: string;
    recentReports: string;
    translatedToOfficer: string;
    severityLevel: string;
  };
  predictive: {
    title: string;
    subtitle: string;
    shiftRiskIndex: string;
    accidentReduction: string;
    aiAccuracy: string;
    verifiedAlerts: string;
    avgResponseTime: string;
    whatIfSimulator: string;
    shiftLength: string;
    ambientTemp: string;
    fatigueLevel: string;
    zoneCongestion: string;
    calculatedRisk: string;
  };
  iot: {
    title: string;
    subtitle: string;
    toxicGasH2S: string;
    toxicGasCO: string;
    temp: string;
    noise: string;
    vibration: string;
    power: string;
    interlockState: string;
    safeThreshold: string;
  };
  academy: {
    title: string;
    subtitle: string;
    myPoints: string;
    certifiedBadges: string;
    startQuiz: string;
    completed: string;
    claimCertificate: string;
    ruleList: string;
    miniGameTitle: string;
  };
  emergency: {
    title: string;
    subtitle: string;
    triggerEvacuation: string;
    cancelEvacuation: string;
    sirenSounding: string;
    safestRoute: string;
    musterPoint: string;
    accountedWorkers: string;
    missingWorkers: string;
    dispatchLog: string;
  };
  mobile: {
    title: string;
    selfiePpeCheck: string;
    scanMyPpe: string;
    voiceSos: string;
    dailyBriefing: string;
    listenAudio: string;
    mySafetyScore: string;
  };
  audit: {
    title: string;
    subtitle: string;
    filterAll: string;
    exportPdf: string;
    exportCsv: string;
    searchPlaceholder: string;
    incidentLog: string;
  };
}

export const translations: Record<SupportedLanguage, TranslationDict> = {
  th: {
    appName: 'SafeSight (เซฟไซต์)',
    appTagline: 'ระบบเฝ้าระวังและแจ้งเตือนความปลอดภัยแรงงานอัจฉริยะพหุภาษา สำหรับเขตพัฒนาพิเศษภาคตะวันออก (EEC)',
    nav: {
      liveVision: 'กล้องตรวจจับ AI เรียลไทม์',
      digitalTwin: 'ดิจิทัลทวินผังโรงงาน 2.5D',
      eecRegional: 'ภาพรวมนิคมอุตสาหกรรม EEC',
      hazardReporter: 'แจ้งเตือนเหตุและ Near-Miss พหุภาษา',
      predictiveAi: 'AI คาดการณ์ความเสี่ยงล่วงหน้า',
      iotSensors: 'เซนเซอร์ตรวจวัดสิ่งแวดล้อม IoT',
      workerAcademy: 'ศูนย์การเรียนรู้ความปลอดภัย',
      emergencyHub: 'ศูนย์บัญชาการอพยพฉุกเฉิน',
      workerMobile: 'โหมดหน้าจอมือถือคนงาน',
      auditLog: 'บันทึกประวัติและเอกสารรับรอง',
    },
    roles: {
      safetyOfficer: 'เจ้าหน้าที่ความปลอดภัย (จป.)',
      worker: 'แรงงานภาคปฏิบัติการ',
      eecAdmin: 'ผู้บริหารนิคม / ภาครัฐ EEC',
      switchRole: 'สลับบทบาทผู้ใช้งาน',
    },
    status: {
      live: 'ถ่ายทอดสด AI',
      normal: 'ความปลอดภัยปกติ',
      warning: 'เฝ้าระวังความเสี่ยง',
      critical: 'อันตรายร้ายแรง',
      compliant: 'สวมใส่อุปกรณ์ถูกต้อง',
      violation: 'พบการละเมิดความปลอดภัย',
      evacuate: 'คำสั่งอพยพด่วน',
      systemArmed: 'ระบบ AI พร้อมทำงาน 24/7',
    },
    vision: {
      title: 'ศูนย์วิเคราะห์ภาพและตรวจจับความปลอดภัย AI',
      subtitle: 'ตรวจจับการสวมใส่อุปกรณ์ PPE (หมวก, เสื้อสะท้อนแสง, แว่น, ถุงมือ, รองเท้า) และการบุกรุกพื้นที่อันตรายแบบเรียลไทม์',
      modeWebcam: 'กล้องอุปกรณ์สด (Webcam AI)',
      modeCctvMatrix: 'ระบบ CCTV 4 ช่องจำลองโรงงาน',
      modeMediaScan: 'อัปโหลดภาพ/วิดีโอตรวจวิเคราะห์',
      complianceScore: 'ดัชนีความสอดคล้อง PPE รวม',
      activeViolations: 'จุดที่ตรวจพบการละเมิด',
      peopleDetected: 'จำนวนคนงานที่ตรวจพบ',
      ppeHardHat: 'หมวกนิรภัย',
      ppeVest: 'เสื้อสะท้อนแสง',
      ppeGlasses: 'แว่นตานิรภัย',
      ppeGloves: 'ถุงมือกันบาด',
      ppeBoots: 'รองเท้าหัวเหล็ก',
      dangerZone: 'พื้นที่หวงห้าม/รัศมีเครื่องจักร',
      fallDetected: 'ตรวจพบคนงานลื่นล้ม/ตกจากที่สูง',
      triggerSimViolation: 'จำลองเหตุการณ์ละเมิด PPE',
      clearViolation: 'ล้างสถานะการจำลอง',
      takeSnapshot: 'บันทึกภาพหลักฐาน AI',
      audioWarningActive: 'ระบบเสียงแจ้งเตือนอัตโนมัติทำงาน',
      voiceAlarmOn: 'เปิดเสียงเตือน AI',
      voiceAlarmOff: 'ปิดเสียงเตือน',
      zonePetro: 'โซน A: หน่วยกลั่นปิโตรเคมี',
      zoneStamping: 'โซน B: สายการผลิตปั๊มขึ้นรูปโลหะ',
      zoneWelding: 'โซน C: เซลล์หุ่นยนต์เชื่อมประกอบ',
      zoneLogistics: 'โซน D: คลังสินค้าและทางรถโฟล์กลิฟต์',
    },
    digitalTwin: {
      title: 'แบบจำลองดิจิทัลทวินและแผนที่ความร้อน (Digital Twin)',
      subtitle: 'แผนผังพื้นที่ปฏิบัติการ 2.5D แบบอินเทอร์แอคทีฟ เชื่อมโยงข้อมูลตำแหน่งคนงานและระดับความเสี่ยงแบบเรียลไทม์',
      zoneA: 'โซนเคมีและแรงดันสูง (Zone A)',
      zoneB: 'โซนเครื่องจักรกลหนัก (Zone B)',
      zoneC: 'โซนหุ่นยนต์อัตโนมัติ (Zone C)',
      zoneD: 'โซนคลังสินค้าและการขนถ่าย (Zone D)',
      heatMapToggle: 'แสดงแผนที่ความร้อน (Risk Heatmap)',
      workersBadge: 'แสดงตำแหน่งคนงาน (Beacons)',
      iotSensorsToggle: 'แสดงจุดติดตั้งเซนเซอร์ IoT',
      evacuationRoutes: 'แสดงเส้นทางหนีไฟฉุกเฉิน',
      zoneRiskLevel: 'ระดับความเสี่ยงประจำโซน',
      activePersonnel: 'คนงานในพื้นที่ปัจจุบัน',
    },
    eecMap: {
      title: 'ศูนย์บัญชาการความปลอดภัยแรงงานระดับภูมิภาค EEC',
      subtitle: 'ติดตามสถานะความปลอดภัยและการคุ้มครองแรงงานข้ามชาติ ครอบคลุม ชลบุรี ระยอง และฉะเชิงเทรา',
      corridorOverview: 'สรุปภาพรวมเขตพัฒนาพิเศษภาคตะวันออก',
      totalEstates: 'นิคมอุตสาหกรรมในเครือข่าย',
      avgSafetyScore: 'คะแนนความปลอดภัยเฉลี่ย',
      incidentRate: 'อัตราอุบัติเหตุต่อ 1,000 คน',
      migrantLaborCoverage: 'แรงงานข้ามชาติที่ได้รับความคุ้มครอง',
      viewEstate: 'ดูรายละเอียดนิคม',
      chonburi: 'ชลบุรี',
      rayong: 'ระยอง',
      chachoengsao: 'ฉะเชิงเทรา',
    },
    hazard: {
      title: 'ระบบรายงานเหตุอันตรายและเหตุเฉียดพหุภาษา (Near-Miss)',
      subtitle: 'รายงานง่ายด้วยเสียงในภาษาแม่ หรือถ่ายภาพ พร้อมระบบแปลภาษาอัตโนมัติส่งตรงถึง จป. ทันที',
      voiceReportBtn: 'กดค้างเพื่อบันทึกเสียงรายงาน',
      recording: 'กำลังรับฟังเสียงของคุณ...',
      stopRecording: 'ปล่อยเพื่อประมวลผลคำพูด',
      uploadPhoto: 'ถ่ายภาพหรือแนบรูปถ่ายหน้างาน',
      category: 'หมวดหมู่อันตราย',
      locationZone: 'ระบุตำแหน่ง / โซนที่พบ',
      description: 'รายละเอียดเหตุการณ์',
      submitReport: 'ส่งรายงานเข้าศูนย์ความปลอดภัย',
      recentReports: 'รายการรายงานล่าสุด',
      translatedToOfficer: 'แปลเป็นภาษาไทยสำหรับเจ้าหน้าที่ความปลอดภัย',
      severityLevel: 'ระดับความรุนแรงที่ประเมินโดย AI',
    },
    predictive: {
      title: 'ระบบวิเคราะห์และทำนายแนวโน้มความเสี่ยง AI',
      subtitle: 'อัลกอริทึม Machine Learning คาดการณ์ความน่าจะเป็นของการเกิดอุบัติเหตุล่วงหน้าจากปัจจัยแวดล้อม',
      shiftRiskIndex: 'ดัชนีความเสี่ยงกะปัจจุบัน',
      accidentReduction: 'อัตราการลดลงของอุบัติเหตุ',
      aiAccuracy: 'ความแม่นยำโมเดลตรวจจับ PPE',
      verifiedAlerts: 'การแจ้งเตือนที่ถูกต้องแม่นยำ',
      avgResponseTime: 'เวลาตอบสนองต่อเหตุเฉลี่ย',
      whatIfSimulator: 'เครื่องมือจำลองสถานการณ์ความเสี่ยง (What-If Analysis)',
      shiftLength: 'ชั่วโมงทำงานต่อเนื่องในกะ (ชั่วโมง)',
      ambientTemp: 'อุณหภูมิและความชื้นสัมพัทธ์ในโรงงาน (°C)',
      fatigueLevel: 'ระดับความเหนื่อยล้าสะสมของคนงาน',
      zoneCongestion: 'ความหนาแน่นคนงานในจุดเสี่ยง',
      calculatedRisk: 'โอกาสเกิดอุบัติเหตุที่คำนวณได้โดย AI',
    },
    iot: {
      title: 'ระบบโทรมาตรสิ่งแวดล้อมและพลังงานเครื่องจักร IoT',
      subtitle: 'ตรวจวัดก๊าซพิษ อุณหภูมิ เสียง การสั่นสะเทือน และระบบตัดการทำงานอัตโนมัติเพื่อความปลอดภัย',
      toxicGasH2S: 'ก๊าซไฮโดรเจนซัลไฟด์ (H2S)',
      toxicGasCO: 'ก๊าซคาร์บอนมอนอกไซด์ (CO)',
      temp: 'อุณหภูมิแวดล้อม (°C)',
      noise: 'ระดับความดังเสียง (dBA)',
      vibration: 'การสั่นสะเทือนเครื่องจักร (mm/s)',
      power: 'กำลังไฟฟ้าที่ใช้ (kW)',
      interlockState: 'สถานะระบบนิรภัยอัตโนมัติ (Safety Interlock)',
      safeThreshold: 'เกณฑ์ความปลอดภัยมาตรฐานสากล',
    },
    academy: {
      title: 'ศูนย์อบรมความปลอดภัยพหุภาษาและเกมทดสอบ (Academy)',
      subtitle: 'บทเรียนไมโครเลิร์นนิงพร้อมภาพประกอบและเสียงบรรยาย 5 ภาษา สะสมแต้มและรับเหรียญความปลอดภัย',
      myPoints: 'คะแนนความปลอดภัยสะสม (Safety XP)',
      certifiedBadges: 'เหรียญตราความเชี่ยวชาญ',
      startQuiz: 'เริ่มทำแบบทดสอบวัดความรู้',
      completed: 'ผ่านการอบรมแล้ว',
      claimCertificate: 'ดาวน์โหลดใบประกาศนียบัตรดิจิทัล',
      ruleList: 'กฎเหล็กความปลอดภัย 3 ข้อสำคัญ',
      miniGameTitle: 'เกมจับผิดจุดเสี่ยงอันตราย (Hazard Spotter)',
    },
    emergency: {
      title: 'ศูนย์สั่งการและแจ้งเตือนอพยพภัยฉุกเฉิน (Emergency Command)',
      subtitle: 'เปิดสัญญาณไซเรนพหุภาษา วางเส้นทางอพยพที่ปลอดภัยที่สุด และกระจายแจ้งเตือนผ่าน LINE / SMS',
      triggerEvacuation: 'เปิดสัญญาณเตือนภัยอพยพด่วน',
      cancelEvacuation: 'ยกเลิกสถานะฉุกเฉิน / สู่ภาวะปกติ',
      sirenSounding: 'สัญญาณเตือนภัยและเสียงประกาศพหุภาษากำลังทำงาน!',
      safestRoute: 'เส้นทางหนีภัยที่แนะนำโดย AI',
      musterPoint: 'จุดรวมพลหลัก (Muster Point A)',
      accountedWorkers: 'คนงานที่เช็คชื่อครบแล้ว',
      missingWorkers: 'คนงานที่ยังไม่อยู่ที่จุดรวมพล',
      dispatchLog: 'บันทึกการส่งข้อความฉุกเฉินอัตโนมัติ (LINE/SMS/PA)',
    },
    mobile: {
      title: 'SafeSight สำหรับคนงานภาคสนาม (Worker Companion)',
      selfiePpeCheck: 'สแกนตรวจ PPE ประจำวันด้วยกล้องหน้า',
      scanMyPpe: 'เปิดกล้องตรวจความพร้อม PPE',
      voiceSos: 'ปุ่มฉุกเฉิน SOS (กดทันทีเมื่อมีภัย)',
      dailyBriefing: 'ฟังข้อปฏิบัติความปลอดภัยประจำวัน',
      listenAudio: 'กดเพื่อฟังเสียงบรรยาย',
      mySafetyScore: 'คะแนนการปฏิบัติงานปลอดภัยของฉัน',
    },
    audit: {
      title: 'บันทึกประวัติการตรวจการณ์และเอกสารรับรองมาตรฐาน',
      subtitle: 'ตรวจสอบประวัติย้อนหลัง รองรับการส่งรายงานตามมาตรฐาน กรมสวัสดิการและคุ้มครองแรงงาน',
      filterAll: 'ทั้งหมด',
      exportPdf: 'ส่งออกรายงานความปลอดภัย (PDF)',
      exportCsv: 'ดาวน์โหลดข้อมูลดิบ (CSV)',
      searchPlaceholder: 'ค้นหาด้วยรหัสเหตุการณ์, โซน หรือประเภท...',
      incidentLog: 'ตารางบันทึกเหตุการณ์ความปลอดภัย',
    },
  },

  en: {
    appName: 'SafeSight',
    appTagline: 'AI-Powered Multilingual Workplace Safety Monitoring Web Platform for the Eastern Economic Corridor (EEC)',
    nav: {
      liveVision: 'Live AI Vision Hub',
      digitalTwin: '2.5D Digital Twin Floor',
      eecRegional: 'EEC Regional Overview',
      hazardReporter: 'Multilingual Hazard Reporter',
      predictiveAi: 'Predictive AI Analytics',
      iotSensors: 'IoT Environmental Telemetry',
      workerAcademy: 'Safety Academy & Drills',
      emergencyHub: 'Emergency Evacuation Hub',
      workerMobile: 'Mobile Worker Companion',
      auditLog: 'Audit Log & Compliance',
    },
    roles: {
      safetyOfficer: 'Safety Officer (SHE)',
      worker: 'Frontline Worker',
      eecAdmin: 'EEC Industrial Admin',
      switchRole: 'Switch Role',
    },
    status: {
      live: 'LIVE AI FEED',
      normal: 'NORMAL STATUS',
      warning: 'WARNING - WATCH',
      critical: 'CRITICAL HAZARD',
      compliant: 'PPE COMPLIANT',
      violation: 'SAFETY BREACH',
      evacuate: 'EVACUATION ORDER',
      systemArmed: 'AI Engine Active 24/7',
    },
    vision: {
      title: 'AI Computer Vision Safety Hub',
      subtitle: 'Real-time detection for PPE compliance (helmets, vests, goggles, gloves, boots) and danger zone intrusions',
      modeWebcam: 'Live Device Webcam AI',
      modeCctvMatrix: '4-Split Industrial CCTV Matrix',
      modeMediaScan: 'Upload Photo/Video Scan',
      complianceScore: 'Overall PPE Compliance',
      activeViolations: 'Active Violations',
      peopleDetected: 'Workers In View',
      ppeHardHat: 'Safety Helmet',
      ppeVest: 'Hi-Vis Safety Vest',
      ppeGlasses: 'Protective Goggles',
      ppeGloves: 'Cut-Resistant Gloves',
      ppeBoots: 'Steel-Toe Boots',
      dangerZone: 'Restricted Machine Zone',
      fallDetected: 'Slip & Fall Detected',
      triggerSimViolation: 'Simulate PPE Breach',
      clearViolation: 'Clear Simulation',
      takeSnapshot: 'Capture AI Evidence',
      audioWarningActive: 'Auto Voice Alert Armed',
      voiceAlarmOn: 'Enable Voice Alert',
      voiceAlarmOff: 'Mute Voice Alert',
      zonePetro: 'Zone A: Petrochemical Cracking Unit',
      zoneStamping: 'Zone B: Heavy Stamping Press Line',
      zoneWelding: 'Zone C: Robotic Welding Cell',
      zoneLogistics: 'Zone D: High-Bay Logistics & Forklifts',
    },
    digitalTwin: {
      title: 'Factory Digital Twin & Risk Heatmap',
      subtitle: 'Interactive 2.5D floor plan synchronizing real-time worker beacons, hazard hotspots, and telemetry',
      zoneA: 'Zone A: High Pressure Petrochemical',
      zoneB: 'Zone B: Heavy Stamping Machinery',
      zoneC: 'Zone C: Automated Robotic Cell',
      zoneD: 'Zone D: Logistics & Loading Bay',
      heatMapToggle: 'Toggle Risk Heatmap',
      workersBadge: 'Show Worker Beacons',
      iotSensorsToggle: 'Show IoT Sensor Nodes',
      evacuationRoutes: 'Show Emergency Escape Routes',
      zoneRiskLevel: 'Zone Risk Level',
      activePersonnel: 'Personnel Inside Zone',
    },
    eecMap: {
      title: 'EEC Regional Industrial Safety Oversight',
      subtitle: 'Regional monitoring and migrant worker protection across Chonburi, Rayong, and Chachoengsao industrial zones',
      corridorOverview: 'Eastern Economic Corridor Overview',
      totalEstates: 'Connected Industrial Estates',
      avgSafetyScore: 'Average Safety Index',
      incidentRate: 'Incidents per 1,000 Workers',
      migrantLaborCoverage: 'Protected Migrant Workers',
      viewEstate: 'Inspect Estate',
      chonburi: 'Chonburi',
      rayong: 'Rayong',
      chachoengsao: 'Chachoengsao',
    },
    hazard: {
      title: 'Multilingual Hazard & Near-Miss Reporter',
      subtitle: 'Report hazards via voice in your native language or take photos, instantly translated for safety officers',
      voiceReportBtn: 'Hold to Record Voice Report',
      recording: 'Listening to your voice...',
      stopRecording: 'Release to Transcribe & Translate',
      uploadPhoto: 'Snap or Upload Hazard Photo',
      category: 'Hazard Category',
      locationZone: 'Select Zone / Workstation',
      description: 'Incident Details',
      submitReport: 'Dispatch Hazard Ticket',
      recentReports: 'Recent Near-Miss Reports',
      translatedToOfficer: 'Instant Translation for Safety Officers',
      severityLevel: 'AI Severity Assessment',
    },
    predictive: {
      title: 'AI Predictive Safety & Risk Forecasting',
      subtitle: 'Machine learning algorithms forecasting accident probabilities from environmental and shift factors',
      shiftRiskIndex: 'Current Shift Risk Index',
      accidentReduction: 'Accident Reduction Rate',
      aiAccuracy: 'PPE Detection Model Accuracy',
      verifiedAlerts: 'Verified Accurate Alerts',
      avgResponseTime: 'Average Incident Response Time',
      whatIfSimulator: 'What-If Risk Scenario Simulator',
      shiftLength: 'Continuous Shift Duration (Hours)',
      ambientTemp: 'Factory Heat & Humidity (°C)',
      fatigueLevel: 'Worker Cumulative Fatigue',
      zoneCongestion: 'Zone Worker Density',
      calculatedRisk: 'AI-Forecasted Injury Probability',
    },
    iot: {
      title: 'IoT Environmental & Energy Telemetry',
      subtitle: 'Continuous monitoring of toxic gases, thermal index, acoustic noise, vibration, and safety cutoffs',
      toxicGasH2S: 'Hydrogen Sulfide (H2S)',
      toxicGasCO: 'Carbon Monoxide (CO)',
      temp: 'Ambient Temperature (°C)',
      noise: 'Acoustic Noise (dBA)',
      vibration: 'Machine Vibration (mm/s)',
      power: 'Power Draw (kW)',
      interlockState: 'Safety Interlock Status',
      safeThreshold: 'International Safety Limit',
    },
    academy: {
      title: 'Multilingual Worker Academy & Drills',
      subtitle: 'Micro-learning modules with voice narrations in 5 languages, gamified drills, and digital certificates',
      myPoints: 'Safety Experience Points (XP)',
      certifiedBadges: 'Mastery Badges Earned',
      startQuiz: 'Start Safety Quiz',
      completed: 'Certified & Completed',
      claimCertificate: 'Download Digital Certificate',
      ruleList: '3 Essential Safety Rules',
      miniGameTitle: 'Interactive Hazard Spotter Drill',
    },
    emergency: {
      title: 'Emergency Dispatch & Evacuation Hub',
      subtitle: 'Trigger multilingual industrial sirens, compute safest escape paths, and broadcast alerts via LINE & SMS',
      triggerEvacuation: 'TRIGGER EMERGENCY EVACUATION',
      cancelEvacuation: 'Cancel Alarm / All Clear',
      sirenSounding: 'EMERGENCY SIREN & MULTILINGUAL ANNOUNCEMENT ACTIVE',
      safestRoute: 'AI-Optimized Safe Escape Route',
      musterPoint: 'Primary Assembly Point (Muster A)',
      accountedWorkers: 'Accounted Personnel',
      missingWorkers: 'Missing / In-Transit Workers',
      dispatchLog: 'Automated Broadcast Dispatch Log',
    },
    mobile: {
      title: 'SafeSight Field Worker Companion',
      selfiePpeCheck: 'Daily Pre-Shift Selfie PPE Check',
      scanMyPpe: 'Launch Camera for PPE Check',
      voiceSos: 'EMERGENCY SOS PANIC BUTTON',
      dailyBriefing: 'Today\'s Safety Audio Briefing',
      listenAudio: 'Tap to Play Audio Briefing',
      mySafetyScore: 'My Personal Safety Rating',
    },
    audit: {
      title: 'Compliance Audit Log & Official Records',
      subtitle: 'Tamper-evident log of all AI detections, sensor triggers, and regulatory compliance reports',
      filterAll: 'All Records',
      exportPdf: 'Export Safety Report (PDF)',
      exportCsv: 'Download Raw Data (CSV)',
      searchPlaceholder: 'Search by ticket ID, zone, category...',
      incidentLog: 'Safety Incident Audit Table',
    },
  },

  my: {
    appName: 'SafeSight (ဆေဖ်ဆိုက်)',
    appTagline: 'အရှေ့ပိုင်းစီးပွားရေးစင်္ကြံ (EEC) အတွက် ဘာသာစကားစုံ AI အလုပ်ခွင်ဘေးကင်းရေး ဝဘ်စနစ်',
    nav: {
      liveVision: 'တိုက်ရိုက် AI ကင်မရာ စောင့်ကြည့်စနစ်',
      digitalTwin: '၂.၅D စက်ရုံ ဒစ်ဂျစ်တယ်ပုံစံ',
      eecRegional: 'EEC စက်မှုဇုန် ဒေသဆိုင်ရာ မြေပုံ',
      hazardReporter: 'ဘာသာစကားစုံ အန္တရာယ် သတင်းပို့ချက်',
      predictiveAi: 'AI ဘေးအန္တရာယ် ကြိုတင်ခန့်မှန်းချက်',
      iotSensors: 'IoT ပတ်ဝန်းကျင် အာရုံခံကိရိယာများ',
      workerAcademy: 'ဘေးကင်းရေး လေ့လာရေးစင်တာ',
      emergencyHub: 'အရေးပေါ် ရွှေ့ပြောင်းရေး ဌာနချုပ်',
      workerMobile: 'အလုပ်သမား မိုဘိုင်းမျက်နှာပြင်',
      auditLog: 'စစ်ဆေးရေး မှတ်တမ်းနှင့် အစီရင်ခံစာ',
    },
    roles: {
      safetyOfficer: 'လုံခြုံရေးအရာရှိ (Safety Officer)',
      worker: 'စက်ရုံအလုပ်သမား',
      eecAdmin: 'EEC စက်မှုဇုန် အုပ်ချုပ်ရေးမှူး',
      switchRole: 'အသုံးပြုသူအခန်းကဏ္ဍ ပြောင်းရန်',
    },
    status: {
      live: 'တိုက်ရိုက် AI စောင့်ကြည့်နေသည်',
      normal: 'ပုံမှန်ဘေးကင်းသည်',
      warning: 'သတိပြုရန် လိုအပ်သည်',
      critical: 'အလွန်အန္တရာယ်ကြီးသည်',
      compliant: 'PPE ကိရိယာ ပြည့်စုံသည်',
      violation: 'စည်းကမ်းဖောက်ဖျက်မှု တွေ့ရှိသည်',
      evacuate: 'အရေးပေါ် ရွှေ့ပြောင်းပါ',
      systemArmed: 'AI စနစ် ၂၄ နာရီ အသင့်ရှိသည်',
    },
    vision: {
      title: 'AI မျက်စိဖြင့် ဘေးကင်းရေး စစ်ဆေးရေးဌာန',
      subtitle: 'ဦးထုပ်၊ အင်္ကျီ၊ မျက်မှန်၊ လက်အိတ်၊ ဖိနပ် ဝတ်ဆင်မှုနှင့် အန္တရာယ်ဇုန် ချိုးဖောက်မှုများကို အချိန်နှင့်တပြေးညီ စစ်ဆေးသည်',
      modeWebcam: 'တိုက်ရိုက် ဝဘ်ကင်မရာ AI',
      modeCctvMatrix: 'စက်ရုံ CCTV ၄ လိုင်း စနစ်',
      modeMediaScan: 'ဓာတ်ပုံ/ဗီဒီယို တင်၍ စစ်ဆေးရန်',
      complianceScore: 'စုစုပေါင်း PPE လိုက်နာမှု ရမှတ်',
      activeViolations: 'စည်းကမ်းဖောက်ဖျက်မှု အရေအတွက်',
      peopleDetected: 'တွေ့ရှိရသော အလုပ်သမားဦးရေ',
      ppeHardHat: 'ဘေးကင်းရေးဦးထုပ်',
      ppeVest: 'ရောင်ပြန်အင်္ကျီ',
      ppeGlasses: 'ကာကွယ်ရေးမျက်မှန်',
      ppeGloves: 'လက်အိတ်',
      ppeBoots: 'ဘေးကင်းရေးဖိနပ်',
      dangerZone: 'တားမြစ်ထားသော စက်ယန္တရားဧရိယာ',
      fallDetected: 'ချော်လဲခြင်း သို့မဟုတ် ပြုတ်ကျခြင်း တွေ့ရှိသည်',
      triggerSimViolation: 'PPE ချိုးဖောက်မှု စမ်းသပ်ရန်',
      clearViolation: 'စမ်းသပ်မှု ပယ်ဖျက်ရန်',
      takeSnapshot: 'AI သက်သေပုံ ရိုက်ယူရန်',
      audioWarningActive: 'အလိုအလျောက် အသံသတိပေးချက် ဖွင့်ထားသည်',
      voiceAlarmOn: 'အသံသတိပေးချက် ဖွင့်မည်',
      voiceAlarmOff: 'အသံသတိပေးချက် ပိတ်မည်',
      zonePetro: 'ဇုန် A: ရေနံဓာတု စက်ရုံခွဲ',
      zoneStamping: 'ဇုန် B: သတ္တုပုံသွင်း စက်လိုင်း',
      zoneWelding: 'ဇုန် C: စက်ရုပ် ဂဟေဆက် ဧရိယာ',
      zoneLogistics: 'ဇုန် D: သိုလှောင်ရုံနှင့် ဖော့ကားလမ်း',
    },
    digitalTwin: {
      title: 'စက်ရုံ ဒစ်ဂျစ်တယ်ပုံစံနှင့် အန္တရာယ်ပြမြေပုံ',
      subtitle: 'အလုပ်သမားတည်နေရာနှင့် အန္တရာယ်အဆင့်များကို ၂.၅D ဖြင့် တိုက်ရိုက်ပြသသည်',
      zoneA: 'ဓာတုနှင့် ဖိအားမြင့်ဇုန် (Zone A)',
      zoneB: 'စက်ယန္တရားကြီးများဇုန် (Zone B)',
      zoneC: 'စက်ရုပ်အလိုအလျောက်ဇုန် (Zone C)',
      zoneD: 'သိုလှောင်ရုံဇုန် (Zone D)',
      heatMapToggle: 'အန္တရာယ်အပူချိန်မြေပုံ ပြရန်',
      workersBadge: 'အလုပ်သမားတည်နေရာများ ပြရန်',
      iotSensorsToggle: 'IoT အာရုံခံကိရိယာများ ပြရန်',
      evacuationRoutes: 'အရေးပေါ်ထွက်ပေါက်လမ်းကြောင်းများ ပြရန်',
      zoneRiskLevel: 'ဇုန်အလိုက် အန္တရာယ်အဆင့်',
      activePersonnel: 'ဧရိယာအတွင်းရှိ လူဦးရေ',
    },
    eecMap: {
      title: 'EEC ဒေသဆိုင်ရာ အလုပ်သမား ဘေးကင်းရေး စောင့်ကြည့်မှု',
      subtitle: 'ချွန်ဘူရီ၊ ရယောင်းနှင့် ချချိန်းဆောင်ရှိ စက်မှုဇုန်များနှင့် ရွှေ့ပြောင်းအလုပ်သမားများကို ကာကွယ်စောင့်ရှောက်သည်',
      corridorOverview: 'အရှေ့ပိုင်း စီးပွားရေးစင်္ကြံ ခြုံငုံသုံးသပ်ချက်',
      totalEstates: 'ချိတ်ဆက်ထားသော စက်မှုဇုန်များ',
      avgSafetyScore: 'ပျမ်းမျှ ဘေးကင်းရေး အဆင့်အတန်း',
      incidentRate: 'လူ ၁,၀၀၀ လျှင် ထိခိုက်မှုနှုန်း',
      migrantLaborCoverage: 'အကာအကွယ်ရရှိသော ရွှေ့ပြောင်းအလုပ်သမားများ',
      viewEstate: 'စက်မှုဇုန် အသေးစိတ်ကြည့်ရန်',
      chonburi: 'ချွန်ဘူရီ',
      rayong: 'ရယောင်း',
      chachoengsao: 'ချချိန်းဆောင်',
    },
    hazard: {
      title: 'ဘာသာစကားစုံ အန္တရာယ်နှင့် ထိလုနီးပါး သတင်းပို့စနစ်',
      subtitle: 'မိခင်ဘာသာစကားဖြင့် အသံသွင်း၍ဖြစ်စေ၊ ဓာတ်ပုံရိုက်၍ဖြစ်စေ လုံခြုံရေးအရာရှိထံသို့ တိုက်ရိုက် သတင်းပို့ပါ',
      voiceReportBtn: 'အသံသွင်းရန် ဖိထားပါ',
      recording: 'သင့်အသံကို နားထောင်နေသည်...',
      stopRecording: 'ဘာသာပြန်ရန် လွှတ်လိုက်ပါ',
      uploadPhoto: 'အန္တရာယ်ရှိသောနေရာ ဓာတ်ပုံရိုက်တင်ပါ',
      category: 'အန္တရာယ်အမျိုးအစား',
      locationZone: 'တွေ့ရှိသည့် နေရာ/ဇုန်',
      description: 'ဖြစ်စဉ် အသေးစိတ်',
      submitReport: 'သတင်းပို့ချက် ပေးပို့မည်',
      recentReports: 'လတ်တလော သတင်းပို့ချက်များ',
      translatedToOfficer: 'လုံခြုံရေးအရာရှိအတွက် ထိုင်းဘာသာသို့ အလိုအလျောက် ပြန်ဆိုချက်',
      severityLevel: 'AI မှ သတ်မှတ်သော အန္တရာယ်အဆင့်',
    },
    predictive: {
      title: 'AI ဘေးအန္တရာယ် ကြိုတင်ခန့်မှန်းချက်နှင့် ခွဲခြမ်းစိတ်ဖြာမှု',
      subtitle: 'ပတ်ဝန်းကျင်အခြေအနေများနှင့် အလုပ်ချိန်များမှ မတော်တဆဖြစ်နိုင်ခြေကို ကြိုတင်တွက်ချက်သည်',
      shiftRiskIndex: 'လက်ရှိအလုပ်ချိန် အန္တရာယ်အညွှန်းကိန်း',
      accidentReduction: 'မတော်တဆမှု လျော့ကျနှုန်း',
      aiAccuracy: 'PPE စစ်ဆေးမှု တိကျမှုနှုန်း',
      verifiedAlerts: 'မှန်ကန်သော သတိပေးချက်များ',
      avgResponseTime: 'ပျမ်းမျှ တုံ့ပြန်ချိန်',
      whatIfSimulator: 'အခြေအနေ စမ်းသပ်မှု ကိရိယာ (What-If Analysis)',
      shiftLength: 'ဆက်တိုက်အလုပ်လုပ်ချိန် (နာရီ)',
      ambientTemp: 'စက်ရုံအတွင်း အပူချိန် (°C)',
      fatigueLevel: 'ပင်ပန်းနွမ်းနယ်မှု အဆင့်',
      zoneCongestion: 'လူဦးရေ သိပ်သည်းဆ',
      calculatedRisk: 'AI မှ ခန့်မှန်းသော အန္တရာယ်ဖြစ်နိုင်ခြေ',
    },
    iot: {
      title: 'IoT ပတ်ဝန်းကျင်နှင့် စက်ယန္တရား စောင့်ကြည့်စနစ်',
      subtitle: 'အဆိပ်ဓာတ်ငွေ့၊ အပူချိန်၊ ဆူညံသံနှင့် တုန်ခါမှုများကို စဉ်ဆက်မပြတ် တိုင်းတာသည်',
      toxicGasH2S: 'ဟိုက်ဒရိုဂျင်ဆာလ်ဖိုက် ဓာတ်ငွေ့ (H2S)',
      toxicGasCO: 'ကာဗွန်မိုနောက်ဆိုဒ် ဓာတ်ငွေ့ (CO)',
      temp: 'ပတ်ဝန်းကျင် အပူချိန် (°C)',
      noise: 'ဆူညံသံအဆင့် (dBA)',
      vibration: 'စက်တုန်ခါမှု (mm/s)',
      power: 'သုံးစွဲသော လျှပ်စစ်ဓာတ်အား (kW)',
      interlockState: 'အလိုအလျောက် ဘေးကင်းရေး ဖြတ်တောက်စနစ်',
      safeThreshold: 'နိုင်ငံတကာ သတ်မှတ် ဘေးကင်းရေး အတိုင်းအတာ',
    },
    academy: {
      title: 'ဘာသာစကားစုံ အလုပ်သမား ဘေးကင်းရေး သင်တန်းကျောင်း',
      subtitle: 'ဘာသာစကား ၅ မျိုးဖြင့် ရှင်းပြထားသော သင်ခန်းစာများနှင့် ဆုတံဆိပ်များ',
      myPoints: 'ဘေးကင်းရေး အတွေ့အကြုံ ရမှတ် (XP)',
      certifiedBadges: 'ရရှိထားသော ဘေးကင်းရေး တံဆိပ်များ',
      startQuiz: 'အမေးအဖြေ စတင်မည်',
      completed: 'အောင်မြင်ပြီးပါပြီ',
      claimCertificate: 'ဒစ်ဂျစ်တယ် အသိအမှတ်ပြုလက်မှတ် ရယူရန်',
      ruleList: 'မဖြစ်မနေ လိုက်နာရမည့် ဘေးကင်းရေး စည်းမျဉ်း ၃ ချက်',
      miniGameTitle: 'အန္တရာယ်ရှာဖွေရေး ဂိမ်း',
    },
    emergency: {
      title: 'အရေးပေါ် ရွှေ့ပြောင်းရေး ဌာနချုပ် (Emergency Hub)',
      subtitle: 'အရေးပေါ် ဥဩဆွဲသံနှင့် ဘာသာစကားစုံ အသံလွှင့်ချက်ဖြင့် ဘေးကင်းစွာ ရွှေ့ပြောင်းပါ',
      triggerEvacuation: 'အရေးပေါ် ရွှေ့ပြောင်းရန် ဥဩသံဖွင့်မည်',
      cancelEvacuation: 'အရေးပေါ်အခြေအနေ ရုပ်သိမ်းမည်',
      sirenSounding: 'အရေးပေါ်ဥဩသံနှင့် ဘာသာစကားစုံ သတိပေးသံ မြည်နေသည်!',
      safestRoute: 'AI မှ ညွှန်ပြသော အလုံခြုံဆုံး ထွက်ပေါက်လမ်းကြောင်း',
      musterPoint: 'အဓိက လူစုဝေးရာနေရာ (Muster Point A)',
      accountedWorkers: 'စာရင်းစစ်ပြီးသူ ဦးရေ',
      missingWorkers: 'စာရင်းမပေါက်သေးသူ ဦးရေ',
      dispatchLog: 'အလိုအလျောက် သတင်းပို့ မှတ်တမ်း (LINE/SMS)',
    },
    mobile: {
      title: 'SafeSight အလုပ်သမား မိုဘိုင်းလက်စွဲ',
      selfiePpeCheck: 'အလုပ်မဆင်းမီ မိမိကိုယ်ကို PPE စစ်ဆေးရန်',
      scanMyPpe: 'ကင်မရာဖွင့်၍ PPE စစ်ဆေးမည်',
      voiceSos: 'အရေးပေါ် SOS ခလုတ် (အန္တရာယ်ရှိပါက ချက်ချင်းနှိပ်ပါ)',
      dailyBriefing: 'ယနေ့အတွက် ဘေးကင်းရေး ညွှန်ကြားချက် နားထောင်ရန်',
      listenAudio: 'အသံနားထောင်ရန် နှိပ်ပါ',
      mySafetyScore: 'ကျွန်ုပ်၏ ဘေးကင်းရေး ရမှတ်',
    },
    audit: {
      title: 'စစ်ဆေးရေး မှတ်တမ်းနှင့် အသိအမှတ်ပြု အထောက်အထား',
      subtitle: 'မှတ်တမ်းများကို ပြန်လည်စစ်ဆေးပြီး အစီရင်ခံစာ ထုတ်ယူနိုင်ပါသည်',
      filterAll: 'အားလုံး',
      exportPdf: 'PDF အစီရင်ခံစာ ထုတ်ယူရန်',
      exportCsv: 'CSV ဒေတာ ဒေါင်းလုဒ်လုပ်ရန်',
      searchPlaceholder: 'ကုဒ်၊ ဇုန် သို့မဟုတ် အမျိုးအစားဖြင့် ရှာဖွေပါ...',
      incidentLog: 'ဘေးကင်းရေး ဖြစ်စဉ် မှတ်တမ်းဇယား',
    },
  },

  km: {
    appName: 'SafeSight (សេហ្វសាយ)',
    appTagline: 'វេទិកាគេហទំព័រត្រួតពិនិត្យសុវត្ថិភាពការងារពហុភាសាដោយ AI សម្រាប់តំបន់ច្រករបៀងសេដ្ឋកិច្ចពិសេសភាគខាងកើត (EEC)',
    nav: {
      liveVision: 'កាមេរ៉ា AI ពិនិត្យផ្ទាល់',
      digitalTwin: 'ប្លង់រោងចក្រ 2.5D Digital Twin',
      eecRegional: 'ទិដ្ឋភាពតំបន់ឧស្សាហកម្ម EEC',
      hazardReporter: 'រាយការណ៍គ្រោះថ្នាក់ពហុភាសា',
      predictiveAi: 'AI ព្យាករណ៍ហានិភ័យទុកជាមុន',
      iotSensors: 'ឧបករណ៍ចាប់សញ្ញា IoT បរិស្ថាន',
      workerAcademy: 'មជ្ឈមណ្ឌលបណ្តុះបណ្តាលសុវត្ថិភាព',
      emergencyHub: 'មជ្ឈមណ្ឌលជម្លៀសបន្ទាន់',
      workerMobile: 'ផ្ទាំងអេក្រង់សម្រាប់កម្មករចល័ត',
      auditLog: 'កំណត់ត្រា និងឯកសារបញ្ជាក់',
    },
    roles: {
      safetyOfficer: 'មន្ត្រីសុវត្ថិភាពការងារ (SHE)',
      worker: 'កម្មករប្រតិបត្តិការ',
      eecAdmin: 'អ្នកគ្រប់គ្រងតំបន់ឧស្សាហកម្ម EEC',
      switchRole: 'ប្តូរតួនាទីអ្នកប្រើប្រាស់',
    },
    status: {
      live: 'ការផ្សាយផ្ទាល់ AI',
      normal: 'សុវត្ថិភាពធម្មតា',
      warning: 'ការព្រមានប្រុងប្រយ័ត្ន',
      critical: 'គ្រោះថ្នាក់កម្រិតធ្ងន់ធ្ងរ',
      compliant: 'ពាក់ឧបករណ៍ត្រឹមត្រូវ',
      violation: 'បានរកឃើញការបំពានច្បាប់សុវត្ថិភាព',
      evacuate: 'បញ្ជាឱ្យជម្លៀសជាបន្ទាន់',
      systemArmed: 'ប្រព័ន្ធ AI ដំណើរការ ២៤ ម៉ោង',
    },
    vision: {
      title: 'មជ្ឈមណ្ឌល AI ពិនិត្យសុវត្ថិភាព និងឧបករណ៍ PPE',
      subtitle: 'ពិនិត្យមើលការពាក់មួក អាវឆ្លុះពន្លឺ វ៉ែនតា ស្រោមដៃ ស្បែកជើង និងការចូលតំបន់ហាមឃាត់ភ្លាមៗ',
      modeWebcam: 'កាមេរ៉ាផ្ទាល់ (Webcam AI)',
      modeCctvMatrix: 'ប្រព័ន្ធកាមេរ៉ា CCTV ៤ បណ្តាញ',
      modeMediaScan: 'បញ្ចូលរូបភាព/វីដេអូដើម្បីស្កេន',
      complianceScore: 'ពិន្ទុអនុលោមភាព PPE សរុប',
      activeViolations: 'ចំនួនការបំពានដែលបានរកឃើញ',
      peopleDetected: 'ចំនួនកម្មករក្នុងកាមេរ៉ា',
      ppeHardHat: 'មួកសុវត្ថិភាព',
      ppeVest: 'អាវឆ្លុះពន្លឺសុវត្ថិភាព',
      ppeGlasses: 'វ៉ែនតាការពារភ្នែក',
      ppeGloves: 'ស្រោមដៃការពារកាត់',
      ppeBoots: 'ស្បែកជើងសុវត្ថិភាពក្បាលដែក',
      dangerZone: 'តំបន់ម៉ាស៊ីនគ្រោះថ្នាក់ហាមឃាត់',
      fallDetected: 'រកឃើញការរអិលដួល ឬធ្លាក់ពីទីខ្ពស់',
      triggerSimViolation: 'ក្លែងបន្លំការបំពាន PPE',
      clearViolation: 'លុបការក្លែងបន្លំ',
      takeSnapshot: 'ថតយករូបភាពភស្តុតាង AI',
      audioWarningActive: 'ប្រព័ន្ធសំឡេងព្រមានដំណើរការ',
      voiceAlarmOn: 'បើកសំឡេងព្រមាន',
      voiceAlarmOff: 'បិទសំឡេងព្រមាន',
      zonePetro: 'តំបន់ A: រោងចក្រចម្រាញ់ប្រេងគីមី',
      zoneStamping: 'តំបន់ B: ខ្សែសង្វាក់ម៉ាស៊ីនកាត់ដែក',
      zoneWelding: 'តំបន់ C: រ៉ូបូតផ្សារស្វ័យប្រវត្តិ',
      zoneLogistics: 'តំបន់ D: ឃ្លាំងផ្ទុកទំនិញ និងផ្លូវឡានលើក',
    },
    digitalTwin: {
      title: 'ប្លង់ឌីជីថលរោងចក្រ 2.5D និងផែនទីកម្តៅហានិភ័យ',
      subtitle: 'បង្ហាញទីតាំងកម្មករ និងកម្រិតហានិភ័យជាក់ស្តែងតាមតំបន់',
      zoneA: 'តំបន់គីមី និងសម្ពាធខ្ពស់ (Zone A)',
      zoneB: 'តំបន់គ្រឿងចក្រធុនធ្ងន់ (Zone B)',
      zoneC: 'តំបន់រ៉ូបូតស្វ័យប្រវត្តិ (Zone C)',
      zoneD: 'តំបន់ឃ្លាំង និងដឹកជញ្ជូន (Zone D)',
      heatMapToggle: 'បង្ហាញផែនទីកម្តៅហានិភ័យ (Heatmap)',
      workersBadge: 'បង្ហាញទីតាំងកម្មករ (Beacons)',
      iotSensorsToggle: 'បង្ហាញឧបករណ៍ចាប់សញ្ញា IoT',
      evacuationRoutes: 'បង្ហាញផ្លូវរត់គេចខ្លួនបន្ទាន់',
      zoneRiskLevel: 'កម្រិតហានិភ័យក្នុងតំបន់',
      activePersonnel: 'ចំនួនកម្មករក្នុងតំបន់បច្ចុប្បន្ន',
    },
    eecMap: {
      title: 'ការត្រួតពិនិត្យសុវត្ថិភាពការងារប្រចាំតំបន់ EEC',
      subtitle: 'ការពារ និងតាមដានសុវត្ថិភាពពលករចំណាកស្រុកនៅឈុនបុរី រ៉ាក់យ៉ង និងឆាក់ឆឺងសៅ',
      corridorOverview: 'ទិដ្ឋភាពទូទៅនៃច្រករបៀងសេដ្ឋកិច្ចពិសេសភាគខាងកើត',
      totalEstates: 'តំបន់ឧស្សាហកម្មក្នុងបណ្តាញ',
      avgSafetyScore: 'ពិន្ទុសុវត្ថិភាពជាមធ្យម',
      incidentRate: 'អត្រាគ្រោះថ្នាក់ក្នុង ១,០០០ នាក់',
      migrantLaborCoverage: 'ពលករចំណាកស្រុកដែលទទួលបានការការពារ',
      viewEstate: 'មើលព័ត៌មានលម្អិត',
      chonburi: 'ឈុនបុរី (Chonburi)',
      rayong: 'រ៉ាក់យ៉ង (Rayong)',
      chachoengsao: 'ឆាក់ឆឺងសៅ (Chachoengsao)',
    },
    hazard: {
      title: 'ប្រព័ន្ធរាយការណ៍គ្រោះថ្នាក់ពហុភាសា (Near-Miss)',
      subtitle: 'រាយការណ៍ដោយសំឡេងជាភាសាជាតិរបស់អ្នក ឬថតរូប បកប្រែជូនមន្ត្រីសុវត្ថិភាពភ្លាមៗ',
      voiceReportBtn: 'សង្កត់ដើម្បីថតសំឡេងរាយការណ៍',
      recording: 'កំពុងស្តាប់សំឡេងរបស់អ្នក...',
      stopRecording: 'លែងដៃដើម្បីបកប្រែពាក្យសំដី',
      uploadPhoto: 'ថតរូបភាព ឬភ្ជាប់រូបថតកន្លែងកើតហេតុ',
      category: 'ប្រភេទគ្រោះថ្នាក់',
      locationZone: 'ទីតាំង / តំបន់ដែលបានរកឃើញ',
      description: 'ព័ត៌មានលម្អិតនៃហេតុការណ៍',
      submitReport: 'បញ្ជូនរបាយការណ៍',
      recentReports: 'បញ្ជីរាយការណ៍ថ្មីៗ',
      translatedToOfficer: 'បកប្រែជាភាសាថៃជូនមន្ត្រីសុវត្ថិភាពដោយស្វ័យប្រវត្តិ',
      severityLevel: 'កម្រិតហានិភ័យវាយតម្លៃដោយ AI',
    },
    predictive: {
      title: 'ប្រព័ន្ធវិភាគ និងព្យាករណ៍ហានិភ័យ AI',
      subtitle: 'ក្បួនដោះស្រាយ Machine Learning ព្យាករណ៍លទ្ធភាពកើតគ្រោះថ្នាក់ទុកជាមុន',
      shiftRiskIndex: 'សន្ទស្សន៍ហានិភ័យវេនបច្ចុប្បន្ន',
      accidentReduction: 'អត្រាកាត់បន្ថយគ្រោះថ្នាក់',
      aiAccuracy: 'ភាពត្រឹមត្រូវនៃម៉ូដែល PPE',
      verifiedAlerts: 'ការជូនដំណឹងត្រឹមត្រូវ',
      avgResponseTime: 'រយៈពេលឆ្លើយតបជាមធ្យម',
      whatIfSimulator: 'ឧបករណ៍សាកល្បងស្ថានភាពហានិភ័យ (What-If Analysis)',
      shiftLength: 'ម៉ោងធ្វើការបន្តក្នុងវេន (ម៉ោង)',
      ambientTemp: 'សីតុណ្ហភាពក្នុងរោងចក្រ (°C)',
      fatigueLevel: 'កម្រិតហត់នឿយរបស់កម្មករ',
      zoneCongestion: 'ដង់ស៊ីតេមនុស្សក្នុងតំបន់',
      calculatedRisk: 'ឱកាសកើតគ្រោះថ្នាក់គណនាដោយ AI',
    },
    iot: {
      title: 'ប្រព័ន្ធតាមដានបរិស្ថាន និងថាមពល IoT',
      subtitle: 'វាស់ឧស្ម័នពុល សីតុណ្ហភាព សំឡេង រំញ័រ និងប្រព័ន្ធកាត់ផ្តាច់ស្វ័យប្រវត្តិដើម្បីសុវត្ថិភាព',
      toxicGasH2S: 'ឧស្ម័នអ៊ីដ្រូសែនស៊ុលហ្វីត (H2S)',
      toxicGasCO: 'ឧស្ម័នកាបូនម៉ូណូអុកស៊ីត (CO)',
      temp: 'សីតុណ្ហភាពបរិស្ថាន (°C)',
      noise: 'កម្រិតសំឡេង (dBA)',
      vibration: 'ការរំញ័រម៉ាស៊ីន (mm/s)',
      power: 'ថាមពលអគ្គិសនីប្រើប្រាស់ (kW)',
      interlockState: 'ស្ថានភាពប្រព័ន្ធសុវត្ថិភាពស្វ័យប្រវត្តិ',
      safeThreshold: 'កម្រិតសុវត្ថិភាពស្តង់ដារអន្តរជាតិ',
    },
    academy: {
      title: 'សាលាបណ្តុះបណ្តាលសុវត្ថិភាពពហុភាសា (Academy)',
      subtitle: 'មេរៀនខ្លីៗជាសំឡេង ៥ ភាសា ប្រកួតប្រជែងពិន្ទុ និងទទួលបានមេដាយសុវត្ថិភាព',
      myPoints: 'ពិន្ទុបទពិសោធន៍សុវត្ថិភាព (XP)',
      certifiedBadges: 'មេដាយកិត្តិយសសុវត្ថិភាព',
      startQuiz: 'ចាប់ផ្តើមធ្វើតេស្តសាកល្បង',
      completed: 'បានបញ្ចប់ដោយជោគជ័យ',
      claimCertificate: 'ទាញយកវិញ្ញាបនបត្រឌីជីថល',
      ruleList: 'វិធានសុវត្ថិភាពសំខាន់ៗ ៣ យ៉ាង',
      miniGameTitle: 'ល្បែងស្វែងរកចំណុចគ្រោះថ្នាក់',
    },
    emergency: {
      title: 'មជ្ឈមណ្ឌលបញ្ជាជម្លៀសបន្ទាន់ (Emergency Hub)',
      subtitle: 'បន្លឺសំឡេងស៊ីរ៉ែនពហុភាសា ផ្តល់ផ្លូវរត់គេចខ្លួនសុវត្ថិភាព និងផ្ញើសារតាម LINE/SMS',
      triggerEvacuation: 'ចុចបន្លឺសំឡេងជម្លៀសជាបន្ទាន់',
      cancelEvacuation: 'លុបចោលស្ថានភាពអាសន្ន',
      sirenSounding: 'សំឡេងស៊ីរ៉ែន និងសារប្រកាសពហុភាសាកំពុងដំណើរការ!',
      safestRoute: 'ផ្លូវរត់គេចខ្លួនសុវត្ថិភាពបំផុតណែនាំដោយ AI',
      musterPoint: 'ចំណុចប្រមូលផ្តុំធំ (Muster Point A)',
      accountedWorkers: 'ចំនួនកម្មករដែលបានចុះឈ្មោះរួច',
      missingWorkers: 'ចំនួនកម្មករដែលមិនទាន់មកដល់',
      dispatchLog: 'កំណត់ត្រាផ្ញើសារអាសន្នស្វ័យប្រវត្តិ (LINE/SMS)',
    },
    mobile: {
      title: 'SafeSight សម្រាប់កម្មករក្នុងរោងចក្រ',
      selfiePpeCheck: 'ស្កេនពិនិត្យ PPE ដោយកាមេរ៉ាមុខមុនចូលធ្វើការ',
      scanMyPpe: 'បើកកាមេរ៉ាស្កេន PPE',
      voiceSos: 'ប៊ូតុងអាសន្ន SOS (ចុចភ្លាមៗពេលមានគ្រោះថ្នាក់)',
      dailyBriefing: 'ស្តាប់ការណែនាំសុវត្ថិភាពប្រចាំថ្ងៃ',
      listenAudio: 'ចុចដើម្បីស្តាប់សំឡេង',
      mySafetyScore: 'ពិន្ទុសុវត្ថិភាពផ្ទាល់ខ្លួនរបស់ខ្ញុំ',
    },
    audit: {
      title: 'កំណត់ត្រាសវនកម្ម និងឯកសារផ្លូវការ',
      subtitle: 'ពិនិត្យប្រវត្តិ និងទាញយករបាយការណ៍ស្របតាមស្តង់ដារក្រសួងការងារ',
      filterAll: 'ទាំងអស់',
      exportPdf: 'ទាញយករបាយការណ៍ (PDF)',
      exportCsv: 'ទាញយកទិន្នន័យ (CSV)',
      searchPlaceholder: 'ស្វែងរកតាមលេខកូដ តំបន់ ឬប្រភេទ...',
      incidentLog: 'តារាងកំណត់ត្រាព្រឹត្តិការណ៍សុវត្ថិភាព',
    },
  },

  lo: {
    appName: 'SafeSight (ເຊຟໄຊຕ໌)',
    appTagline: 'ລະບົບເຝົ້າລະວັງ ແລະ ແຈ້ງເຕືອນຄວາມປອດໄພແຮງງານອັດສະລິຍະຫຼາຍພາສາ ສຳລັບເຂດພັດທະນາພິເສດພາກຕາເວັນອອກ (EEC)',
    nav: {
      liveVision: 'ກ້ອງກວດຈັບ AI ແບບສົດໆ',
      digitalTwin: 'ຜັງໂຮງງານ 2.5D Digital Twin',
      eecRegional: 'ພາບລວມເຂດນິຄົມອຸດສາຫະກຳ EEC',
      hazardReporter: 'ແຈ້ງເຫດອັນຕະລາຍຫຼາຍພາສາ',
      predictiveAi: 'AI ຄາດຄະເນຄວາມສ່ຽງລ່ວງໜ້າ',
      iotSensors: 'ເຊັນເຊີກວດວັດສິ່ງແວດລ້ອມ IoT',
      workerAcademy: 'ສູນການຮຽນຮູ້ຄວາມປອດໄພ',
      emergencyHub: 'ສູນບັນຊາການອົບພະຍົບສຸກເສີນ',
      workerMobile: 'ໂໝດໜ້າຈໍມືຖືສຳລັບຄົນງານ',
      auditLog: 'ບັນທຶກປະຫວັດ ແລະ ເອກະສານຢັ້ງຢືນ',
    },
    roles: {
      safetyOfficer: 'ເຈົ້າໜ້າທີ່ຄວາມປອດໄພ (ຈປ.)',
      worker: 'ແຮງງານພາກປະຕິບັດຕົວຈິງ',
      eecAdmin: 'ຜູ້ບໍລິຫານນິຄົມ / ພາກລັດ EEC',
      switchRole: 'ປ່ຽນບົດບາດຜູ້ໃຊ້ງານ',
    },
    status: {
      live: 'ຖ່າຍທອດສົດ AI',
      normal: 'ຄວາມປອດໄພປົກກະຕິ',
      warning: 'ເຝົ້າລະວັງຄວາມສ່ຽງ',
      critical: 'ອັນຕະລາຍຮ້າຍແຮງ',
      compliant: 'ໃສ່ອຸປະກອນຖືກຕ້ອງ',
      violation: 'ພົບການລະເມີດຄວາມປອດໄພ',
      evacuate: 'ຄຳສັ່ງອົບພະຍົບດ່ວນ',
      systemArmed: 'ລະບົບ AI ພ້ອມເຮັດວຽກ 24/7',
    },
    vision: {
      title: 'ສູນວິເຄາະພາບ ແລະ ກວດຈັບຄວາມປອດໄພ AI',
      subtitle: 'ກວດຈັບການໃສ່ໝວກ, ເສື້ອສະທ້ອນແສງ, ແວ່ນຕາ, ຖົງມື, ເກີບ ແລະ ການເຂົ້າເຂດອັນຕະລາຍແບບສົດໆ',
      modeWebcam: 'ກ້ອງອຸປະກອນສົດ (Webcam AI)',
      modeCctvMatrix: 'ລະບົບ CCTV 4 ຊ່ອງຈຳລອງໂຮງງານ',
      modeMediaScan: 'ອັບໂຫຼດຮູບພາບ/ວິດີໂອກວດວິເຄາະ',
      complianceScore: 'ຄະແນນຄວາມສອດຄ່ອງ PPE ລວມ',
      activeViolations: 'ຈຸດທີ່ກວດພົບການລະເມີດ',
      peopleDetected: 'ຈຳນວນຄົນງານທີ່ກວດພົບ',
      ppeHardHat: 'ໝວກນິລະໄພ',
      ppeVest: 'ເສື້ອສະທ້ອນແສງ',
      ppeGlasses: 'ແວ່ນຕານິລະໄພ',
      ppeGloves: 'ຖົງມືກັນບາດ',
      ppeBoots: 'ເກີບນິລະໄພຫົວເຫຼັກ',
      dangerZone: 'ເຂດຫວງຫ້າມ/ລັດສະໝີເຄື່ອງຈັກ',
      fallDetected: 'ກວດພົບຄົນງານມື່ນລົ້ມ/ຕົກຈາກບ່ອນສູງ',
      triggerSimViolation: 'ຈຳລອງເຫດການລະເມີດ PPE',
      clearViolation: 'ລຶບສະຖານະການຈຳລອງ',
      takeSnapshot: 'ບັນທຶກຮູບຫຼັກຖານ AI',
      audioWarningActive: 'ລະບົບສຽງແຈ້ງເຕືອນອັດຕະໂນມັດເຮັດວຽກ',
      voiceAlarmOn: 'ເປີດສຽງເຕືອນ AI',
      voiceAlarmOff: 'ປິດສຽງເຕືອນ',
      zonePetro: 'ໂຊນ A: ໜ່ວຍກັ່ນປິໂຕຣເຄມີ',
      zoneStamping: 'ໂຊນ B: ສາຍການຜະລິດປ້ຳຂຶ້ນຮູບໂລຫະ',
      zoneWelding: 'ໂຊນ C: ຫຸ່ນຍົນຈອດປະກອບ',
      zoneLogistics: 'ໂຊນ D: ຄັງສິນຄ້າ ແລະ ທາງລົດຍົກ',
    },
    digitalTwin: {
      title: 'ແບບຈຳລອງດິຈິທັລທວິນ ແລະ ແຜນທີ່ຄວາມຮ້ອນ',
      subtitle: 'ແຜນຜັງພື້ນທີ່ປະຕິບັດງານ 2.5D ແບບອິນເຕີແອັກທີບ ເຊື່ອມຕໍ່ຂໍ້ມູນຕຳແໜ່ງຄົນງານແບບສົດໆ',
      zoneA: 'ໂຊນເຄມີ ແລະ ແຮງດັນສູງ (Zone A)',
      zoneB: 'ໂຊນເຄື່ອງຈັກໜັກ (Zone B)',
      zoneC: 'ໂຊນຫຸ່ນຍົນອັດຕະໂນມັດ (Zone C)',
      zoneD: 'ໂຊນຄັງສິນຄ້າ ແລະ ຂົນສົ່ງ (Zone D)',
      heatMapToggle: 'ສະແດງແຜນທີ່ຄວາມຮ້ອນຄວາມສ່ຽງ (Heatmap)',
      workersBadge: 'ສະແດງຕຳແໜ່ງຄົນງານ (Beacons)',
      iotSensorsToggle: 'ສະແດງຈຸດຕິດຕັ້ງເຊັນເຊີ IoT',
      evacuationRoutes: 'ສະແດງເສັ້ນທາງໜີໄຟສຸກເສີນ',
      zoneRiskLevel: 'ລະດັບຄວາມສ່ຽງປະຈຳໂຊນ',
      activePersonnel: 'ຄົນງານໃນພື້ນທີ່ປັດຈຸບັນ',
    },
    eecMap: {
      title: 'ສູນບັນຊາການຄວາມປອດໄພແຮງງານລະດັບພາກ EEC',
      subtitle: 'ຕິດຕາມສະຖານະຄວາມປອດໄພ ແລະ ການຄຸ້ມຄອງແຮງງານຂ້າມຊາດ ຄອບຄຸມ ຊົນບຸຣີ ລະຍອງ ແລະ ສະເຊີງເຊົາ',
      corridorOverview: 'ສະຫຼຸບພາບລວມເຂດພັດທະນາພິເສດພາກຕາເວັນອອກ',
      totalEstates: 'ນິຄົມອຸດສາຫະກຳໃນເຄືອຂ່າຍ',
      avgSafetyScore: 'ຄະແນນຄວາມປອດໄພສະເລ່ຍ',
      incidentRate: 'ອັດຕາອຸບັດຕິເຫດຕໍ່ 1,000 ຄົນ',
      migrantLaborCoverage: 'ແຮງງານຂ້າມຊາດທີ່ໄດ້ຮັບການຄຸ້ມຄອງ',
      viewEstate: 'ເບິ່ງລາຍລະອຽດນິຄົມ',
      chonburi: 'ຊົນບຸຣີ (Chonburi)',
      rayong: 'ລະຍອງ (Rayong)',
      chachoengsao: 'ສະເຊີງເຊົາ (Chachoengsao)',
    },
    hazard: {
      title: 'ລະບົບລາຍງານເຫດອັນຕະລາຍ ແລະ ເຫດເກືອບພາດຫຼາຍພາສາ (Near-Miss)',
      subtitle: 'ລາຍງານງ່າຍດ້ວຍສຽງໃນພາສາແມ່ ຫຼື ຖ່າຍຮູບ ພ້ອມລະບົບແປພາສາອັດຕະໂນມັດເຖິງ ຈປ. ທັນທີ',
      voiceReportBtn: 'ກົດຄ້າງເພື່ອບັນທຶກສຽງລາຍງານ',
      recording: 'ກຳລັງຮັບຟັງສຽງຂອງທ່ານ...',
      stopRecording: 'ປ່ອຍເພື່ອແປພາສາຄຳເວົ້າ',
      uploadPhoto: 'ຖ່າຍຮູບ ຫຼື ແນບຮູບໜ້າວຽກ',
      category: 'ໝວດໝູ່ອັນຕະລາຍ',
      locationZone: 'ລະບຸຕຳແໜ່ງ / ໂຊນທີ່ພົບ',
      description: 'ລາຍລະອຽດເຫດການ',
      submitReport: 'ສົ່ງລາຍງານເຂົ້າສູນຄວາມປອດໄພ',
      recentReports: 'ລາຍການລາຍງານຫຼ້າສຸດ',
      translatedToOfficer: 'ແປເປັນພາສາໄທສຳລັບເຈົ້າໜ້າທີ່ຄວາມປອດໄພ',
      severityLevel: 'ລະດັບຄວາມຮຸນແຮງທີ່ປະເມີນໂດຍ AI',
    },
    predictive: {
      title: 'ລະບົບວິເຄາະ ແລະ ທຳນາຍແນວໂນ້ມຄວາມສ່ຽງ AI',
      subtitle: 'Machine Learning ຄາດການຄວາມເປັນໄປໄດ້ຂອງການເກີດອຸບັດຕິເຫດລ່ວງໜ້າຈາກປັດໄຈແວດລ້ອມ',
      shiftRiskIndex: 'ດັດຊະນີຄວາມສ່ຽງກະປັດຈຸບັນ',
      accidentReduction: 'ອັດຕາການຫຼຸດລົງຂອງອຸບັດຕິເຫດ',
      aiAccuracy: 'ຄວາມຖືກຕ້ອງຂອງໂມເດວ PPE',
      verifiedAlerts: 'ການແຈ້ງເຕືອນທີ່ຖືກຕ້ອງ',
      avgResponseTime: 'ເວລາຕອບສະໜອງຕໍ່ເຫດສະເລ່ຍ',
      whatIfSimulator: 'ເຄື່ອງມືຈຳລອງສະຖານະການຄວາມສ່ຽງ (What-If Analysis)',
      shiftLength: 'ຊົ່ວໂມງເຮັດວຽກຕໍ່ເນື່ອງໃນກະ (ຊົ່ວໂມງ)',
      ambientTemp: 'ອຸນຫະພູມໃນໂຮງງານ (°C)',
      fatigueLevel: 'ລະດັບຄວາມເມື່ອຍລ້າຂອງຄົນງານ',
      zoneCongestion: 'ຄວາມໜາແໜ້ນຄົນງານໃນຈຸດສ່ຽງ',
      calculatedRisk: 'ໂອກາດເກີດອຸບັດຕິເຫດຄຳນວນໂດຍ AI',
    },
    iot: {
      title: 'ລະບົບໂທລະມາດສິ່ງແວດລ້ອມ ແລະ ພະລັງງານ IoT',
      subtitle: 'ກວດວັດອາຍພິດ ອຸນຫະພູມ ສຽງ ການສັ່ນສະເທືອນ ແລະ ລະບົບຕັດການເຮັດວຽກອັດຕະໂນມັດ',
      toxicGasH2S: 'ອາຍພິດໄຮໂດຣເຈນຊັນໄຟດ໌ (H2S)',
      toxicGasCO: 'ອາຍພິດກາກບອນມອນນອກໄຊດ໌ (CO)',
      temp: 'ອຸນຫະພູມແວດລ້ອມ (°C)',
      noise: 'ລະດັບຄວາມດັງສຽງ (dBA)',
      vibration: 'ການສັ່ນສະເທືອນເຄື່ອງຈັກ (mm/s)',
      power: 'ພະລັງງານໄຟຟ້າທີ່ໃຊ້ (kW)',
      interlockState: 'ສະຖານະລະບົບນິລະໄພອັດຕະໂນມັດ',
      safeThreshold: 'ເກນຄວາມປອດໄພມາດຕະຖານສາກົນ',
    },
    academy: {
      title: 'ສູນອົບຮົມຄວາມປອດໄພຫຼາຍພາສາ (Academy)',
      subtitle: 'ບົດຮຽນສັ້ນພ້ອມສຽງບັນຍາຍ 5 ພາສາ ສະສົມຄະແນນ ແລະ ຮັບຫຼຽນຄວາມປອດໄພ',
      myPoints: 'ຄະແນນປະສົບການຄວາມປອດໄພ (XP)',
      certifiedBadges: 'ຫຼຽນກຽດຕິຍົດຄວາມປອດໄພ',
      startQuiz: 'ເລີ່ມເຮັດແບບທົດສອບ',
      completed: 'ຜ່ານການອົບຮົມແລ້ວ',
      claimCertificate: 'ດາວໂຫຼດໃບຢັ້ງຢືນດິຈິທັລ',
      ruleList: 'ກົດເຫຼັກຄວາມປອດໄພ 3 ຂໍ້ສຳຄັນ',
      miniGameTitle: 'ເກມຊອກຫາຈຸດສ່ຽງອັນຕະລາຍ',
    },
    emergency: {
      title: 'ສູນສັ່ງການ ແລະ ແຈ້ງເຕືອນອົບພະຍົບສຸກເສີນ (Emergency Hub)',
      subtitle: 'ເປີດສັນຍານໄຊເຣນຫຼາຍພາສາ ວາງເສັ້ນທາງອົບພະຍົບທີ່ປອດໄພທີ່ສຸດ ແລະ ແຈ້ງເຕືອນຜ່ານ LINE/SMS',
      triggerEvacuation: 'ເປີດສັນຍານເຕືອນໄພອົບພະຍົບດ່ວນ',
      cancelEvacuation: 'ຍົກເລີກສະຖານະສຸກເສີນ / ສູ່ພາວະປົກກະຕິ',
      sirenSounding: 'ສັນຍານເຕືອນໄພ ແລະ ສຽງປະກາດຫຼາຍພາສາກຳລັງເຮັດວຽກ!',
      safestRoute: 'ເສັ້ນທາງໜີໄພທີ່ແນະນຳໂດຍ AI',
      musterPoint: 'ຈຸດລວມພົນຫຼັກ (Muster Point A)',
      accountedWorkers: 'ຄົນງານທີ່ເຊັກຊື່ຄົບແລ້ວ',
      missingWorkers: 'ຄົນງານທີ່ຍັງບໍ່ມາຮອດຈຸດລວມພົນ',
      dispatchLog: 'ບັນທຶກການສົ່ງຂໍ້ຄວາມສຸກເສີນອັດຕະໂນມັດ (LINE/SMS)',
    },
    mobile: {
      title: 'SafeSight ສຳລັບຄົນງານພາກສະໜາມ',
      selfiePpeCheck: 'ສະແກນກວດ PPE ປະຈຳວັນດ້ວຍກ້ອງໜ້າ',
      scanMyPpe: 'ເປີດກ້ອງກວດຄວາມພ້ອມ PPE',
      voiceSos: 'ປຸ່ມສຸກເສີນ SOS (ກົດທັນທີເມື່ອມີໄພ)',
      dailyBriefing: 'ຟັງຂໍ້ປະຕິບັດຄວາມປອດໄພປະຈຳວັນ',
      listenAudio: 'ກົດເພື່ອຟັງສຽງບັນຍາຍ',
      mySafetyScore: 'ຄະແນນຄວາມປອດໄພສ່ວນຕົວຂອງຂ້ອຍ',
    },
    audit: {
      title: 'ບັນທຶກປະຫວັດການກວດກາ ແລະ ເອກະສານຢັ້ງຢືນ',
      subtitle: 'ກວດສອບປະຫວັດຍ້ອນຫຼັງ ແລະ ດາວໂຫຼດລາຍງານຕາມມາດຕະຖານແຮງງານ',
      filterAll: 'ທັງໝົດ',
      exportPdf: 'ດາວໂຫຼດລາຍງານຄວາມປອດໄພ (PDF)',
      exportCsv: 'ດາວໂຫຼດຂໍ້ມູນດິບ (CSV)',
      searchPlaceholder: 'ຄົ້ນຫາດ້ວຍລະຫັດ, ໂຊນ ຫຼື ປະເພດ...',
      incidentLog: 'ຕາຕະລາງບັນທຶກເຫດການຄວາມປອດໄພ',
    },
  },
};
