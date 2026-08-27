export interface RiskPredictionInput {
  shiftHours: number; // e.g. 8 - 14 hours
  ambientTemperature: number; // e.g. 28 - 42 °C
  workerFatigueIndex: number; // 0 - 100
  zoneWorkerDensity: number; // 1 - 25 people
  machineVibration: number; // 0 - 10 mm/s
  nearMissCountLast7Days: number;
}

export interface RiskPredictionOutput {
  overallRiskIndex: number; // 0 - 100
  riskCategory: 'low' | 'medium' | 'high' | 'critical';
  predictedInjuryProbabilityPct: number;
  heatStressCategory: 'safe' | 'caution' | 'extreme_danger';
  fatigueImpactMultiplier: number;
  recommendations: {
    th: string[];
    en: string[];
    my: string[];
    km: string[];
    lo: string[];
  };
}

export class SafeSightRiskPredictor {
  // Multi-variable predictive risk calculation algorithm
  public calculateShiftRisk(input: RiskPredictionInput): RiskPredictionOutput {
    // Base risk baseline
    let score = 15;

    // Shift Length Factor: exponentially rises after 8 hours
    if (input.shiftHours > 8) {
      const overtime = input.shiftHours - 8;
      score += Math.pow(overtime, 1.4) * 5;
    }

    // Heat Stress Factor
    let heatCategory: 'safe' | 'caution' | 'extreme_danger' = 'safe';
    if (input.ambientTemperature >= 38) {
      score += (input.ambientTemperature - 35) * 4;
      heatCategory = 'extreme_danger';
    } else if (input.ambientTemperature >= 33) {
      score += (input.ambientTemperature - 30) * 2;
      heatCategory = 'caution';
    }

    // Worker Cumulative Fatigue
    const fatigueMultiplier = 1 + (input.workerFatigueIndex / 100) * 0.8;
    score *= fatigueMultiplier;

    // Congestion & Machinery Vibration Factor
    score += input.zoneWorkerDensity * 0.8;
    score += input.machineVibration * 1.5;
    score += input.nearMissCountLast7Days * 2.2;

    const normalizedRisk = Math.min(100, Math.max(5, Math.round(score)));

    let riskCategory: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (normalizedRisk >= 75) {
      riskCategory = 'critical';
    } else if (normalizedRisk >= 50) {
      riskCategory = 'high';
    } else if (normalizedRisk >= 30) {
      riskCategory = 'medium';
    }

    const predictedInjuryProbabilityPct = parseFloat(
      (0.8 + (normalizedRisk / 100) * 14.5).toFixed(1)
    );

    return {
      overallRiskIndex: normalizedRisk,
      riskCategory,
      predictedInjuryProbabilityPct,
      heatStressCategory: heatCategory,
      fatigueImpactMultiplier: parseFloat(fatigueMultiplier.toFixed(2)),
      recommendations: this.generateRecommendations(riskCategory, heatCategory, input),
    };
  }

  private generateRecommendations(
    risk: 'low' | 'medium' | 'high' | 'critical',
    heat: 'safe' | 'caution' | 'extreme_danger',
    input: RiskPredictionInput
  ) {
    const th: string[] = [];
    const en: string[] = [];
    const my: string[] = [];
    const km: string[] = [];
    const lo: string[] = [];

    if (input.shiftHours >= 10) {
      th.push('จัดให้มีช่วงพักเบรกย่อย 15 นาที และลดการทำงานกับเครื่องจักรกลหนัก');
      en.push('Schedule mandatory 15-min rest break and rotate operators from heavy machinery.');
      my.push('၁၅ မိနစ် အနားယူချိန် သတ်မှတ်ပေးပြီး စက်ယန္တရားကြီးများ မောင်းနှင်မှုကို လျှော့ချပါ။');
      km.push('រៀបចំឱ្យមានពេលសម្រាក ១៥ នាទី និងកាត់បន្ថយការងារជាមួយម៉ាស៊ីនធ្ងន់ៗ');
      lo.push('ຈັດໃຫ້ມີຊ່ວງພັກເບຣກ 15 ນາທີ ແລະ ຫຼຸດການເຮັດວຽກກັບເຄື່ອງຈັກໜັກ');
    }

    if (heat === 'extreme_danger') {
      th.push('ดัชนีความร้อนสูงเกินเกณฑ์ เสี่ยงโรคลมแดด (Heat Stroke) แจกจ่ายน้ำเกลือแร่และเปิดพัดลมไอน้ำ');
      en.push('High thermal index: Risk of Heat Stroke. Distribute electrolyte hydration and activate misting fans.');
      my.push('အပူချိန် အလွန်မြင့်မားသဖြင့် အပူလျှပ်ခြင်းမှ ကာကွယ်ရန် ဓာတ်ဆားရည်များ တိုက်ကျွေးပါ။');
      km.push('សន្ទស្សន៍កម្តៅខ្ពស់ អាចប្រឈមនឹងការខ្យល់គរ សូមចែកទឹកអេឡិចត្រូឡីត និងបើកកង្ហារ');
      lo.push('ດັດຊະນີຄວາມຮ້ອນສູງ ສ່ຽງເປັນລົມແດດ (Heat Stroke) ແຈກຢາຍນ້ຳເກືອແຮ່ ແລະ ເປີດພັດລົມ');
    }

    if (risk === 'critical' || risk === 'high') {
      th.push('เพิ่มความถี่ในการตรวจการณ์ PPE และเปิดใช้งานระบบแจ้งเตือนเสียง AI อัตโนมัติ');
      en.push('Increase PPE patrol frequency and enforce real-time automated AI voice alarms.');
      my.push('PPE စစ်ဆေးမှု ပိုမိုပြုလုပ်ပြီး အလိုအလျောက် AI အသံသတိပေးချက်များကို ဖွင့်ထားပါ။');
      km.push('បង្កើនការត្រួតពិនិត្យ PPE និងបើកប្រព័ន្ធសំឡេងព្រមាន AI ដោយស្វ័យប្រវត្តិ');
      lo.push('ເພີ່ມຄວາມຖີ່ໃນການກວດ PPE ແລະ ເປີດລະບົບສຽງເຕືອນ AI ອັດຕະໂນມັດ');
    } else {
      th.push('สภาวะความปลอดภัยโดยรวมอยู่ในเกณฑ์ดี ให้รักษามาตรฐานการสวมใส่อุปกรณ์คุ้มครองอย่างต่อเนื่อง');
      en.push('Safety indicators nominal. Continue standard operational protocols.');
      my.push('ဘေးကင်းရေး အခြေအနေ ကောင်းမွန်ပါသည်၊ စံသတ်မှတ်ချက်အတိုင်း ဆက်လက်ထိန်းသိမ်းပါ။');
      km.push('ស្ថានភាពសុវត្ថិភាពទូទៅស្ថិតក្នុងកម្រិតល្អ សូមបន្តអនុវត្តតាមស្តង់ដារ');
      lo.push('ສະພາວະຄວາມປອດໄພໂດຍລວມຢູ່ໃນເກນດີ ໃຫ້ຮັກສາມາດຕະຖານຕໍ່ເນື່ອງ');
    }

    return { th, en, my, km, lo };
  }
}

export const riskPredictor = new SafeSightRiskPredictor();
