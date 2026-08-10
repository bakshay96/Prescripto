export type Language = "en" | "mr" | "hi";

export interface TranslationDict {
  hospitalName: str;
  hospitalSub: str;
  prescriptionTitle: str;
  rxNumberLabel: str;
  dateLabel: str;
  patientNameLabel: str;
  ageLabel: str;
  genderLabel: str;
  locationLabel: str;
  diagnosisLabel: str;
  medicinesTableTitle: str;
  colMedicine: str;
  colDosage: str;
  colFrequency: str;
  colTiming: str;
  colDuration: str;
  colInstructions: str;
  afterMeal: str;
  beforeMeal: str;
  withWater: str;
  withWarmWater: str;
  daysUnit: str;
  doctorSigLabel: str;
  disclaimerNotice: str;
  printBtnLabel: str;
}

export const TRANSLATIONS: Record<Language, any> = {
  en: {
    hospitalName: "Apollo Life Care Hospital & Medical Store",
    hospitalSub: "108 Health Avenue • Phone: +91 98765 43210 • Reg: CL-2026-9081",
    prescriptionTitle: "MEDICAL PRESCRIPTION",
    rxNumberLabel: "Prescription No:",
    dateLabel: "Date:",
    patientNameLabel: "Patient Name:",
    ageLabel: "Age:",
    genderLabel: "Gender:",
    locationLabel: "Village / Location:",
    diagnosisLabel: "Clinical Diagnosis:",
    medicinesTableTitle: "Prescribed Medicines & Dosage Instructions",
    colMedicine: "Medicine Name",
    colDosage: "Dosage",
    colFrequency: "Frequency",
    colTiming: "Timing",
    colDuration: "Duration",
    colInstructions: "Instructions",
    afterMeal: "After Meal",
    beforeMeal: "Before Meal",
    withWater: "With Water",
    withWarmWater: "With Warm Water",
    daysUnit: "Days",
    doctorSigLabel: "Doctor's Signature & Stamp",
    disclaimerNotice: "Note: Please consult the doctor if symptoms persist. Do not substitute medicines without advice.",
    printBtnLabel: "Print Prescription",
    freqMap: {
      "1-0-1": "Morning & Night (1-0-1)",
      "1-1-1": "Morning, Afternoon & Night (1-1-1)",
      "1-0-0": "Morning Only (1-0-0)",
      "0-0-1": "Night Only (0-0-1)",
      "0-1-0": "Afternoon Only (0-1-0)",
    }
  },
  mr: {
    hospitalName: "अपोलो लाईफ केअर हॉस्पिटल आणि मेडिकल स्टोअर",
    hospitalSub: "१०८ हेल्थ एव्हेन्यू • फोन: +९१ ९८७६५ ४३२१० • नोंदणी क्र: CL-2026-9081",
    prescriptionTitle: "वैद्यकीय वैद्यकीय चिठ्ठी (प्रिस्क्रिप्शन)",
    rxNumberLabel: "प्रिस्क्रिप्शन क्रमांक:",
    dateLabel: "दिनांक:",
    patientNameLabel: "रुग्णाचे नाव:",
    ageLabel: "वय:",
    genderLabel: "लिंग:",
    locationLabel: "गाव / पत्ता:",
    diagnosisLabel: "निदान (आजाराचे स्वरूप):",
    medicinesTableTitle: "औषधांचा सविस्तर तपशील आणि घेण्याच्या वेळा",
    colMedicine: "औषधाचे नाव",
    colDosage: "मात्रा (डोस)",
    colFrequency: "वेळा (वारंवारता)",
    colTiming: "वेळ",
    colDuration: "कालावधी",
    colInstructions: "खास सूचना",
    afterMeal: "जेवणानंतर",
    beforeMeal: "जेवणापूर्वी",
    withWater: "पाण्यासोबत",
    withWarmWater: "कोमट पाण्यासोबत",
    daysUnit: "दिवस",
    doctorSigLabel: "डॉक्टरांची स्वाक्षरी व शिक्का",
    disclaimerNotice: "सूचना: त्रास जाणवल्यास त्वरित डॉक्टरांशी संपर्क साधावा. सल्ल्याशिवाय औषधे बदलू नयेत.",
    printBtnLabel: "प्रिस्क्रिप्शन प्रिंट करा",
    freqMap: {
      "1-0-1": "सकाळी व रात्री (१-०-१)",
      "1-1-1": "सकाळी, दुपारी व रात्री (१-१-१)",
      "1-0-0": "फक्त सकाळी (१-०-०)",
      "0-0-1": "फक्त रात्री (०-०-१)",
      "0-1-0": "फक्त दुपारी (०-१-०)",
    }
  },
  hi: {
    hospitalName: "अपोलो लाइफ केयर अस्पताल एवं मेडिकल स्टोर",
    hospitalSub: "108 हेल्थ एवेन्यू • फोन: +91 98765 43210 • पंजीकरण सं: CL-2026-9081",
    prescriptionTitle: "चिकित्सकीय पर्चा (प्रिस्क्रिप्शन)",
    rxNumberLabel: "पर्चा संख्या:",
    dateLabel: "दिनांक:",
    patientNameLabel: "मरीज का नाम:",
    ageLabel: "आयु / उम्र:",
    genderLabel: "लिंग:",
    locationLabel: "गांव / स्थान:",
    diagnosisLabel: "रोग निदान:",
    medicinesTableTitle: "दवाइयों का विवरण एवं खुराक के निर्देश",
    colMedicine: "दवा का नाम",
    colDosage: "खुराक (डोज)",
    colFrequency: "बारंबरता (फ्रीक्वेंसी)",
    colTiming: "समय",
    colDuration: "अवधि",
    colInstructions: "विशेष निर्देश",
    afterMeal: "खाने के बाद",
    beforeMeal: "खाने से पहले",
    withWater: "पानी के साथ",
    withWarmWater: "गुनगुने पानी के साथ",
    daysUnit: "दिन",
    doctorSigLabel: "डॉक्टर के हस्ताक्षर एवं मुहर",
    disclaimerNotice: "नोट: बिना डॉक्टर की सलाह के दवाइयां न बदलें। तकलीफ होने पर तुरंत संपर्क करें।",
    printBtnLabel: "पर्चा प्रिंट करें",
    freqMap: {
      "1-0-1": "सुबह एवं रात (1-0-1)",
      "1-1-1": "सुबह, दोपहर एवं रात (1-1-1)",
      "1-0-0": "केवल सुबह (1-0-0)",
      "0-0-1": "केवल रात (0-0-1)",
      "0-1-0": "केवल दोपहर (0-1-0)",
    }
  }
};

export function translateInstruction(text: string, lang: Language): string {
  if (!text) return "";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  if (text.includes("After Meal") || text.includes("after meal")) return t.afterMeal;
  if (text.includes("Before Meal") || text.includes("before meal")) return t.beforeMeal;
  if (text.includes("Warm Water") || text.includes("warm water")) return t.withWarmWater;
  if (text.includes("Water") || text.includes("water")) return t.withWater;

  return text;
}
