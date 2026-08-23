export type Language = "en" | "mr" | "hi";

export const TRANSLATIONS: Record<Language, any> = {
  en: {
    appTitle: "Prescripto",
    appSub: "Doctor Prescription & Pharmacy Inventory System",
    clinicDefault: "City Care Hospital & Medical Store",
    clinicSub: "108 Health Avenue • Reg: CL-2026-9081",
    doctorView: "Doctor View",
    pharmacistView: "Pharmacist View",
    stockPageView: "Stock & Restock Ledger",
    themeLight: "Light Mode",
    themeDark: "Dark Mode",
    backendConnected: "Backend API Connected",

    // Doctor Dashboard
    patientMgmtTitle: "Patient Management",
    dynamicAgeBadge: "Calculates Age Dynamically",
    patientName: "Patient Name",
    villageLocation: "Village / Location",
    dob: "Date of Birth",
    gender: "Gender",
    phone: "Phone Number",
    medicalHistory: "Medical History / Allergies",
    calcAgeTitle: "Calculated Age:",
    calcAgePlaceholder: "Select Date of Birth to view age",
    regPatientBtn: "Register Patient",
    searchPatients: "Search patients by name or village...",
    thName: "Name",
    thVillage: "Village/Location",
    thDob: "Date of Birth",
    thAge: "Dynamic Age",
    thAction: "Action",

    // Prescription Generator
    createRxTitle: "Create Prescription",
    doctorAccessBadge: "Doctor Access Only",
    selectPatient: "Select Patient",
    clinicalDiagnosis: "Clinical Diagnosis",
    doctorNotes: "Doctor Notes / Dietary Advice",
    prescribedMedsTitle: "Prescribed Medicines",
    addMedRowBtn: "Add Medicine",
    generateRxBtn: "Generate & Issue Prescription",
    rxHistoryTitle: "Prescriptions History",
    filterAll: "All",
    filterPending: "Pending",
    filterDispensed: "Dispensed",

    // Pharmacist Dashboard & Inventory
    medStoreTitle: "Medical Store Inventory",
    addMedBtn: "Add New Medicine",
    searchInventory: "Search medicine name, batch, or HSN...",
    allCategories: "All Categories",
    totalMedsMetric: "Total Medicines",
    lowStockMetric: "Low Stock Alerts",
    expiringMetric: "Expiring Soon / Red Flag",
    pendingRxMetric: "Pending Dispenses",
    dispenseQueueTitle: "Pharmacy Dispense Queue",
    liveStockBadge: "Live Stock Deduction",

    // Inventory Table Headers
    thImg: "Image",
    thMedName: "Medicine Name",
    thCategory: "Category",
    thStockQty: "Stock Quantity",
    thPrice: "Unit Price",
    thExpiry: "Expiry Date",
    thBatchHsn: "Batch / HSN",
    thProvider: "Supplier / Provider",
    thStatus: "Status",
    thActions: "Actions",

    // Status Pills
    statusAvailable: "Available",
    statusLowStock: "Low Stock Alert",
    statusExpiredRedFlag: "EXPIRED (Red Flag)",
    statusOutOfStock: "Out of Stock",

    // Modals
    addMedModalTitle: "Add New Medicine to Store",
    restockModalTitle: "Restock Medicine & Update Inventory",
    medNameLabel: "Medicine Name",
    categoryLabel: "Category",
    initialStockLabel: "Stock Quantity",
    priceLabel: "Unit Price (₹)",
    expiryLabel: "Expiry Date",
    batchLabel: "Batch Number",
    unitLabel: "Unit Type",
    alertLabel: "Min Stock Alert Threshold",
    imgUrlLabel: "Medicine Image URL",
    providerNameLabel: "Supplier / Provider Name",
    providerContactLabel: "Provider Phone / Contact",
    hsnCodeLabel: "HSN Code",
    rackLocationLabel: "Rack / Shelf Location",

    // Dedicated Stock Page
    stockLedgerTitle: "Inventory Stock Ledger & Restock Portal",
    stockLedgerSub: "Track provider details, HSN codes, shelf locations, and audit logs",
    restockBtn: "Restock Item",
    adjustStockBtn: "Adjust Stock",

    // Print & i18n Template
    prescriptionPrintTitle: "Prescription Print Preview",
    printBtn: "Print Prescription",
    closeBtn: "Close",

    hospitalName: "City Care Hospital & Medical Store",
    hospitalSub: "108 Health Avenue • Phone: +91 98765 43210 • Reg: CL-2026-9081",
    title: "MEDICAL PRESCRIPTION",
    rxNum: "Prescription No:",
    date: "Date:",
    colMed: "Medicine Name",
    colDosage: "Dosage",
    colFreq: "Frequency",
    colDuration: "Duration",
    colInstructions: "Instructions",
    docSig: "Doctor's Signature & Stamp",
    disclaimer: "Note: Please consult doctor if symptoms persist. Take medicines strictly as prescribed.",
    freqMap: {
      "1-0-1": "Morning & Night (1-0-1)",
      "1-1-1": "Morning, Afternoon & Night (1-1-1)",
      "1-0-0": "Morning Only (1-0-0)",
      "0-0-1": "Night Only (0-0-1)"
    }
  },

  mr: {
    appTitle: "प्रिस्क्रिप्टो",
    appSub: "डॉक्टर प्रिस्क्रिप्शन आणि मेडिकल स्टोअर इन्व्हेंटरी सिस्टम",
    clinicDefault: "सिटी केअर हॉस्पिटल आणि मेडिकल स्टोअर",
    clinicSub: "१०८ हेल्थ एव्हेन्यू • नोंदणी क्र: CL-2026-9081",
    doctorView: "डॉक्टर पॅनेल",
    pharmacistView: "फार्मासिस्ट पॅनेल",
    stockPageView: "स्टॉक आणि रीस्टॉक नोंदवही",
    themeLight: "लाइट मोड",
    themeDark: "डार्क मोड",
    backendConnected: "बॅकएंड एपीआय कनेक्टेड",

    // Doctor Dashboard
    patientMgmtTitle: "रुग्ण व्यवस्थापन (पेशंट मॅनेजमेंट)",
    dynamicAgeBadge: "वय आपोआप (डायनॅमिकली) गणित होते",
    patientName: "रुग्णाचे नाव",
    villageLocation: "गाव / पत्ता",
    dob: "जन्म तारीख",
    gender: "लिंग",
    phone: "फोन नंबर",
    medicalHistory: "वैद्यकीय इतिहास / ॲलर्जी",
    calcAgeTitle: "गणित केलेले वय:",
    calcAgePlaceholder: "वय पाहण्यासाठी जन्म तारीख निवडा",
    regPatientBtn: "रुग्णाची नोंदणी करा",
    searchPatients: "नावाने किंवा गावाने रुग्ण शोधा...",
    thName: "नाव",
    thVillage: "गाव / पत्ता",
    thDob: "जन्म तारीख",
    thAge: "डायनॅमिक वय",
    thAction: "कृती",

    // Prescription Generator
    createRxTitle: "प्रिस्क्रिप्शन (औषध चिठ्ठी) तयार करा",
    doctorAccessBadge: "फक्त डॉक्टरांसाठी प्रवेश",
    selectPatient: "रुग्ण निवडा",
    clinicalDiagnosis: "निदान (आजाराचे स्वरूप)",
    doctorNotes: "डॉक्टरांचा सल्ला / पथ्य",
    prescribedMedsTitle: "दिलेली औषधे",
    addMedRowBtn: "औषध जोडा",
    generateRxBtn: "प्रिस्क्रिप्शन जारी करा",
    rxHistoryTitle: "प्रिस्क्रिप्शन इतिहास",
    filterAll: "सर्व",
    filterPending: "प्रलंबित",
    filterDispensed: "औषध दिले (डिस्पेंस्ड)",

    // Pharmacist Dashboard & Inventory
    medStoreTitle: "मेडिकल स्टोअर औषध साठा",
    addMedBtn: "नवीन औषध साठ्यात जोडा",
    searchInventory: "औषधाचे नाव, बॅच किंवा HSN ने शोधा...",
    allCategories: "सर्व वर्ग (कॅटेगरी)",
    totalMedsMetric: "एकूण औषधे",
    lowStockMetric: "कमी साठा इशारे (ॲलर्ट)",
    expiringMetric: "मुदत संपणारी / लाल फ्लॅग",
    pendingRxMetric: "प्रलंबित प्रिस्क्रिप्शन",
    dispenseQueueTitle: "फार्मसी औषध वाटप रांग",
    liveStockBadge: "साठ्यातून तत्काळ वजावट",

    // Inventory Table Headers
    thImg: "चित्र",
    thMedName: "औषधाचे नाव",
    thCategory: "वर्ग (कॅटेगरी)",
    thStockQty: "शिल्लक साठा",
    thPrice: "किंमत (₹)",
    thExpiry: "मुदत समाप्ती तारीख",
    thBatchHsn: "बॅच / HSN",
    thProvider: "पुरवठादार / व्हेंडर",
    thStatus: "स्थिती (स्टेटस)",
    thActions: "कृती",

    // Status Pills
    statusAvailable: "उपलब्ध साठा",
    statusLowStock: "कमी साठा ॲलर्ट",
    statusExpiredRedFlag: "🔴 मुदत संपली (लाल फ्लॅग)",
    statusOutOfStock: "साठा संपला",

    // Modals
    addMedModalTitle: "मेडिकल स्टोअरमध्ये नवीन औषध जोडा",
    restockModalTitle: "औषध रीस्टॉक करा आणि साठा वाढवा",
    medNameLabel: "औषधाचे नाव",
    categoryLabel: "वर्ग (कॅटेगरी)",
    initialStockLabel: "शिल्लक संख्या",
    priceLabel: "दर / किंमत (₹)",
    expiryLabel: "मुदत तारीख",
    batchLabel: "बॅच नंबर",
    unitLabel: "एकक प्रकार (युनिट)",
    alertLabel: "किमान साठा इशारा मर्यादा",
    imgUrlLabel: "औषधाचे चित्र (URL)",
    providerNameLabel: "पुरवठादार / व्हेंडर नाव",
    providerContactLabel: "पुरवठादार संपर्क नंबर",
    hsnCodeLabel: "HSN कोड",
    rackLocationLabel: "रॅक / कपाटाचे स्थान",

    // Dedicated Stock Page
    stockLedgerTitle: "औषध साठा नोंदवही आणि रीस्टॉक पोर्टल",
    stockLedgerSub: "पुरवठादार तपशील, HSN कोड, रॅक स्थान आणि व्यवहार इतिहास तपासा",
    restockBtn: "साठा वाढवा (रीस्टॉक)",
    adjustStockBtn: "साठा ॲडजस्ट करा",

    // Print & i18n Template
    prescriptionPrintTitle: "प्रिस्क्रिप्शन प्रिंट पूर्वदृश्य",
    printBtn: "प्रिस्क्रिप्शन प्रिंट करा",
    closeBtn: "बंद करा",

    hospitalName: "सिटी केअर हॉस्पिटल आणि मेडिकल स्टोअर",
    hospitalSub: "१०८ हेल्थ एव्हेन्यू • फोन: +९१ ९८७६५ ४३२१० • नोंदणी क्र: CL-2026-9081",
    title: "वैद्यकीय चिठ्ठी (प्रिस्क्रिप्शन)",
    rxNum: "प्रिस्क्रिप्शन क्रमांक:",
    date: "दिनांक:",
    colMed: "औषधाचे नाव",
    colDosage: "मात्रा (डोस)",
    colFreq: "वेळा (वारंवारता)",
    colDuration: "कालावधी",
    colInstructions: "खास सूचना",
    docSig: "डॉक्टरांची स्वाक्षरी व शिक्का",
    disclaimer: "सूचना: औषधे दिलेल्या वेळेत व सूचनेनुसारच घ्यावीत. डॉक्टरांच्या सल्ल्याशिवाय औषधे बदलू नयेत.",
    freqMap: {
      "1-0-1": "सकाळी व रात्री (१-०-१)",
      "1-1-1": "सकाळी, दुपारी व रात्री (१-१-१)",
      "1-0-0": "फक्त सकाळी (१-०-०)",
      "0-0-1": "फक्त रात्री (०-०-१)"
    }
  },

  hi: {
    appTitle: "प्रिस्क्रिप्टो",
    appSub: "डॉक्टर प्रिस्क्रिप्शन एवं मेडिकल स्टोर इन्वेंटरी सिस्टम",
    clinicDefault: "सिटी केयर अस्पताल एवं मेडिकल स्टोर",
    clinicSub: "108 हेल्थ एवेन्यू • पंजीकरण सं: CL-2026-9081",
    doctorView: "डॉक्टर पैनल",
    pharmacistView: "फार्मासिस्ट पैनल",
    stockPageView: "स्टॉक एवं रीस्टॉक बहीखाता",
    themeLight: "लाइट मोड",
    themeDark: "डार्क मोड",
    backendConnected: "बैकएंड एपीआई कनेक्टेड",

    // Doctor Dashboard
    patientMgmtTitle: "मरीज प्रबंधन (पेशेंट मैनेजमेंट)",
    dynamicAgeBadge: "आयु स्वचालित (डायनेमिक) गणना होती है",
    patientName: "मरीज का नाम",
    villageLocation: "गांव / स्थान",
    dob: "जन्म तिथि",
    gender: "लिंग",
    phone: "फोन नंबर",
    medicalHistory: "चिकित्सा इतिहास / एलर्जी",
    calcAgeTitle: "गणना की गई आयु:",
    calcAgePlaceholder: "आयु देखने के लिए जन्म तिथि चुनें",
    regPatientBtn: "मरीज का पंजीकरण करें",
    searchPatients: "नाम या गांव से मरीज खोजें...",
    thName: "नाम",
    thVillage: "गांव / स्थान",
    thDob: "जन्म तिथि",
    thAge: "डायनेमिक आयु",
    thAction: "कार्रवाई",

    // Prescription Generator
    createRxTitle: "चिकित्सकीय पर्चा (प्रिस्क्रिप्शन) बनाएं",
    doctorAccessBadge: "केवल डॉक्टरों के लिए पहुंच",
    selectPatient: "मरीज चुनें",
    clinicalDiagnosis: "रोग निदान",
    doctorNotes: "डॉक्टर की सलाह / परहेज",
    prescribedMedsTitle: "दी गई दवाइयां",
    addMedRowBtn: "दवा जोड़ें",
    generateRxBtn: "प्रिस्क्रिप्शन जारी करें",
    rxHistoryTitle: "प्रिस्क्रिप्शन इतिहास",
    filterAll: "सभी",
    filterPending: "लंबित",
    filterDispensed: "दवा दे दी गई (डिस्पेंस्ड)",

    // Pharmacist Dashboard & Inventory
    medStoreTitle: "मेडिकल स्टोर दवा स्टॉक",
    addMedBtn: "स्टॉक में नई दवा जोड़ें",
    searchInventory: "दवा का नाम, बैच या HSN से खोजें...",
    allCategories: "सभी श्रेणियां",
    totalMedsMetric: "कुल दवाइयां",
    lowStockMetric: "कम स्टॉक चेतावनी",
    expiringMetric: "समाप्त होने वाली / लाल फ्लैग",
    pendingRxMetric: "लंबित प्रिस्क्रिप्शन",
    dispenseQueueTitle: "फार्मेसी दवा वितरण पंक्ति",
    liveStockBadge: "स्टॉक से तुरंत कटौती",

    // Inventory Table Headers
    thImg: "चित्र",
    thMedName: "दवा का नाम",
    thCategory: "श्रेणी",
    thStockQty: "उपलब्ध स्टॉक",
    thPrice: "मूल्य (₹)",
    thExpiry: "समाप्ति तिथि",
    thBatchHsn: "बैच / HSN",
    thProvider: "आपूर्तिकर्ता / वेंडर",
    thStatus: "स्थिति (स्टेटस)",
    thActions: "कार्रवाई",

    // Status Pills
    statusAvailable: "उपलब्ध स्टॉक",
    statusLowStock: "कम स्टॉक अलर्ट",
    statusExpiredRedFlag: "🔴 समय समाप्त (लाल फ्लैग)",
    statusOutOfStock: "स्टॉक समाप्त",

    // Modals
    addMedModalTitle: "मेडिकल स्टोर में नई दवा जोड़ें",
    restockModalTitle: "दवा रीस्टॉक करें और स्टॉक बढ़ाएं",
    medNameLabel: "दवा का नाम",
    categoryLabel: "श्रेणी",
    initialStockLabel: "प्रारंभिक स्टॉक संख्या",
    priceLabel: "मूल्य (₹)",
    expiryLabel: "समाप्ति तिथि",
    batchLabel: "बैच संख्या",
    unitLabel: "इकाई प्रकार (यूनिट)",
    alertLabel: "न्यूनतम स्टॉक चेतावनी सीमा",
    imgUrlLabel: "दवा का चित्र (URL)",
    providerNameLabel: "आपूर्तिकर्ता / वेंडर का नाम",
    providerContactLabel: "वेंडर संपर्क नंबर",
    hsnCodeLabel: "HSN कोड",
    rackLocationLabel: "रैक / शेल्फ स्थान",

    // Dedicated Stock Page
    stockLedgerTitle: "दवा स्टॉक बहीखाता एवं रीस्टॉक पोर्टल",
    stockLedgerSub: "आपूर्तिकर्ता विवरण, HSN कोड, शेल्फ स्थान और लेन-देन इतिहास देखें",
    restockBtn: "स्टॉक बढ़ाएं (रीस्टॉक)",
    adjustStockBtn: "स्टॉक समायोजित करें",

    // Print & i18n Template
    prescriptionPrintTitle: "प्रिस्क्रिप्शन प्रिंट पूर्वावलोकन",
    printBtn: "प्रिस्क्रिप्शन प्रिंट करें",
    closeBtn: "बंद करें",

    hospitalName: "सिटी केयर अस्पताल एवं मेडिकल स्टोर",
    hospitalSub: "108 हेल्थ एवेन्यू • फोन: +91 98765 43210 • पंजीकरण सं: CL-2026-9081",
    title: "चिकित्सकीय पर्चा (प्रिस्क्रिप्शन)",
    rxNum: "पर्चा संख्या:",
    date: "दिनांक:",
    colMed: "दवा का नाम",
    colDosage: "खुराक (डोज)",
    colFreq: "बारंबरता (फ्रीक्वेंसी)",
    colDuration: "अवधि",
    colInstructions: "विशेष निर्देश",
    docSig: "डॉक्टर के हस्ताक्षर एवं मुहर",
    disclaimer: "नोट: दवाइयां बताई गई समयावधि और निर्देशानुसार ही लें। बिना सलाह दवाइयां न बदलें।",
    freqMap: {
      "1-0-1": "सुबह एवं रात (1-0-1)",
      "1-1-1": "सुबह, दोपहर एवं रात (1-1-1)",
      "1-0-0": "केवल सुबह (1-0-0)",
      "0-0-1": "केवल रात (0-0-1)"
    }
  }
};

export function translateInstruction(text: string, lang: Language): string {
  if (!text) return "";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  if (text.includes("Before") || text.includes("before")) return t.beforeMeal || "Before Meal";
  if (text.includes("After") || text.includes("after")) return t.afterMeal || "After Meal";
  return text;
}
