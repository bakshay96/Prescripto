"""
prescription_html.py — Pure-Python prescription HTML generator.

Generates a self-contained, print-ready HTML document matching the
Suyog Hospital reference prescription format exactly:
  - Header: gradient hospital name + ECG line + doctor block
  - Left sidebar: उपलब्ध सुविधा list + timing box
  - Main Rx area: patient info + medicines (2-line format) + advice + signature
  - Footer: address + phone
"""
from __future__ import annotations


# ─────────────────────────────────────────────
LABELS = {
    "en": {
        "morning": "Morning",
        "afternoon": "Afternoon",
        "night": "Night",
        "days": "Days",
        "services": "Our Services",
        "hours": "OPD Hours",
        "before_meal": "Before Meal",
        "after_meal": "After Meal",
        "with_meal": "With Meal",
        "advice": "Advice",
        "suchna": "Notes",
        "sig": "Doctor's Signature",
        "sunday": "Closed on Sundays.",
        "pname": "Name",
        "date_lbl": "Date",
        "dose_unit": {"Tab": "tab", "Cap": "cap", "Syp": "ml",
                      "Inj": "inj", "Oint": "app", "Drop": "drops"},
    },
    "mr": {
        "morning": "सकाळी",
        "afternoon": "दुपारी",
        "night": "रात्री",
        "days": "दिवस",
        "services": "उपलब्ध सुविधा",
        "hours": "वेळ",
        "before_meal": "जेवनाआधी",
        "after_meal": "जेवनानंतर",
        "with_meal": "जेवणासोबत",
        "advice": "Advice",
        "suchna": "सूचना",
        "sig": "डॉक्टरांची सही व शिक्का",
        "sunday": "दर रविवारला दवाखाना बंद राहील.",
        "pname": "Name",
        "date_lbl": "Date",
        "dose_unit": {"Tab": "गोळी", "Cap": "गोळी", "Syp": "चमचा",
                      "Inj": "इंजे.", "Oint": "लेप", "Drop": "थेंब"},
    },
    "hi": {
        "morning": "सुबह",
        "afternoon": "दोपहर",
        "night": "रात",
        "days": "दिन",
        "services": "उपलब्ध सेवाएं",
        "hours": "समय",
        "before_meal": "खाने से पहले",
        "after_meal": "खाने के बाद",
        "with_meal": "खाने के साथ",
        "advice": "Advice",
        "suchna": "सलाह",
        "sig": "डॉक्टर के हस्ताक्षर",
        "sunday": "रविवार को बंद रहेगा।",
        "pname": "Name",
        "date_lbl": "Date",
        "dose_unit": {"Tab": "गोली", "Cap": "गोली", "Syp": "चम्मच",
                      "Inj": "इंजे.", "Oint": "लेप", "Drop": "बूंद"},
    },
}

CSS = """
@page{size:A4 portrait;margin:8mm 10mm}
*,*::before,*::after{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
body{margin:0;padding:0;background:white;font-family:'Noto Sans Devanagari',Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:12px;line-height:1.4}
.rx{width:190mm;margin:0 auto;border:2.5px solid #1a237e;background:white}
/* HEADER */
.hdr{display:flex;align-items:flex-start;gap:10px;padding:10px 14px 8px;border-bottom:3px double #1a237e}
.hosp{flex:0 0 46%}
.hname{font-family:'Noto Serif Devanagari','Noto Sans Devanagari',serif;font-size:32px;font-weight:900;line-height:1.1;letter-spacing:-0.5px;background:linear-gradient(135deg,#c8a000 0%,#e06500 45%,#c41e3a 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ecg{width:100%;height:22px;margin:5px 0 2px;display:block}
.doc{flex:1;border-left:2px solid #d0d0d0;padding-left:14px}
.dname{font-size:24px;font-weight:900;color:#1a237e;line-height:1.2;font-family:'Noto Sans Devanagari',Arial,sans-serif}
.dqual{font-size:11px;color:#333;margin-top:3px;font-weight:600}
.dreg{font-size:10px;color:#777;margin-top:2px}
.dspec{font-size:12px;font-weight:800;color:#1a237e;margin-top:5px;line-height:1.5;font-family:'Noto Sans Devanagari',Arial,sans-serif}
/* BODY */
.body{display:flex;min-height:560px}
/* SIDEBAR */
.sb{width:130px;flex-shrink:0;border-right:2px solid #1a237e;background:#fffde7;display:flex;flex-direction:column}
.sb-title{background:linear-gradient(135deg,#ff8f00,#e65100);color:white;text-align:center;padding:7px 5px;font-size:10.5px;font-weight:800;font-family:'Noto Sans Devanagari',Arial,sans-serif;letter-spacing:.2px}
.sb-list{list-style:none;margin:0;padding:8px 7px;flex:1}
.sb-list li{font-size:10px;color:#333;margin-bottom:5.5px;line-height:1.35;font-family:'Noto Sans Devanagari',Arial,sans-serif;display:flex;align-items:flex-start;gap:5px}
.sb-list li::before{content:'●';color:#c41e3a;flex-shrink:0;font-size:8px;margin-top:2px}
.sb-time{background:#c41e3a;color:white;padding:8px 6px;text-align:center;font-size:10px;font-weight:700;line-height:1.7;font-family:'Noto Sans Devanagari',Arial,sans-serif}
.sb-sun{padding:6px 7px 8px;font-size:9.5px;color:#333;font-family:'Noto Sans Devanagari',Arial,sans-serif;line-height:1.4;display:flex;align-items:flex-start;gap:4px}
.sb-sun::before{content:'●';color:#333;font-size:8px;flex-shrink:0;margin-top:2px}
/* MAIN RX */
.main{flex:1;padding:12px 16px;position:relative;overflow:hidden}
.rxsym{font-family:'Times New Roman',Georgia,serif;font-style:italic;font-size:34px;font-weight:900;color:#1a1a1a;display:block;margin-bottom:8px}
.pat{display:flex;align-items:baseline;gap:6px;border-bottom:1px solid #444;padding-bottom:5px;margin-bottom:3px;font-size:11.5px}
.pl{color:#555;font-weight:600}
.pn{font-weight:900;font-size:13px;text-transform:uppercase;font-family:'Noto Sans Devanagari',Arial,sans-serif}
.pv{font-weight:800;font-size:12px;text-transform:uppercase;flex:1}
.pd{font-size:11px;color:#333}
.uhid{display:flex;justify-content:flex-end;font-size:11.5px;font-weight:700;color:#333;margin-bottom:10px}
/* MEDICINE */
.med{margin-bottom:10px}
.med-r1{display:flex;align-items:baseline;gap:4px;font-size:12px;font-weight:700}
.mtype{min-width:32px;font-weight:900}
.mname{flex:1;font-family:'Noto Sans Devanagari',Arial,sans-serif;font-weight:700}
.mtotal{min-width:24px;text-align:right;color:#333}
.med-r2{display:flex;align-items:center;gap:5px;margin-top:2px;padding-left:20px;font-size:11px;font-family:'Noto Sans Devanagari',Arial,sans-serif}
.mtiming{min-width:78px;color:#333}
.mdose{min-width:46px;font-weight:700}
.mslot{min-width:38px;text-align:center;color:#bbb;font-size:10.5px}
.mslot.on{color:#1a1a1a;font-weight:800;font-size:11px}
.mdur{margin-left:auto;font-weight:800}
hr.ms{border:none;border-top:1px dashed #ccc;margin:8px 0}
/* ADVICE */
.adv{border-top:1px solid #444;margin-top:12px;padding-top:7px}
.adv-en{font-size:12px;font-weight:800;color:#1a1a1a}
.adv-mr{font-family:'Noto Sans Devanagari',Arial,sans-serif;font-size:11.5px;color:#444;margin-top:2px}
.adv-txt{font-family:'Noto Sans Devanagari',Arial,sans-serif;font-size:11.5px;color:#222;line-height:1.85;margin-top:5px;min-height:55px}
/* SIG */
.sig{position:absolute;bottom:20px;right:18px;text-align:center}
.sig-mark{font-family:'Times New Roman',serif;font-style:italic;font-size:36px;color:#333;line-height:1}
.sig-line{width:140px;height:1px;background:#666;margin:6px auto}
.sig-name{font-size:10.5px;color:#444;font-family:'Noto Sans Devanagari',Arial,sans-serif;font-weight:600}
.sig-lbl{font-size:9.5px;color:#888;font-family:'Noto Sans Devanagari',Arial,sans-serif;margin-top:2px}
/* FOOTER */
.ftr{border-top:2.5px solid #1a237e;display:flex;justify-content:space-between;align-items:center;padding:7px 14px;background:#e8eaf6}
.ft-addr{font-size:11.5px;color:#1a237e;font-weight:600;font-family:'Noto Sans Devanagari',Arial,sans-serif}
.ft-phone{font-size:13px;font-weight:800;color:#c41e3a;font-family:'Noto Sans Devanagari',Arial,sans-serif}
/* PRINT BUTTON (hidden on print) */
@media print{.no-print{display:none!important}}
.print-btn{position:fixed;bottom:20px;right:20px;padding:12px 24px;background:#c41e3a;color:white;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 4px 16px rgba(196,30,58,.4);z-index:100}
"""


def _active(val) -> bool:
    """Returns True if a dose value counts as 'active' (non-zero, non-empty)."""
    if val is None:
        return False
    try:
        return float(str(val)) > 0
    except Exception:
        return bool(val)


def _parse_frequency(frequency: str) -> dict:
    """
    Parses frequency strings like:
      '1-0-1'  → {morning:'1', afternoon:'0', night:'1', timing:''}
      '1-1-1 after meals' → {morning:'1', afternoon:'1', night:'1', timing:'after meals'}
      'BID'    → {morning:'1', afternoon:'0', night:'1', timing:''}
    Returns a dict with keys: morning, afternoon, night, timing
    """
    parts = frequency.strip().split()
    timing = ""
    schedule = "1-0-1"

    # Detect timing keyword
    freq_lower = frequency.lower()
    if "before" in freq_lower:
        timing = "before_meal"
    elif "after" in freq_lower:
        timing = "after_meal"
    elif "with" in freq_lower:
        timing = "with_meal"

    # Find M-A-N pattern
    for p in parts:
        if p.count("-") >= 1 and all(c.isdigit() or c in ("-", ".") for c in p):
            schedule = p
            break

    segs = schedule.split("-")
    morning = segs[0] if len(segs) > 0 else "1"
    afternoon = segs[1] if len(segs) > 1 else "0"
    night = segs[2] if len(segs) > 2 else "0"
    return {"morning": morning, "afternoon": afternoon, "night": night, "timing": timing}


def _calc_total(frequency: str, duration_days: int, quantity_prescribed: int) -> int:
    """Return the quantity_prescribed value (already calculated on creation)."""
    return quantity_prescribed


def _med_type_from_dosage(dosage: str) -> str:
    """Guess medicine type prefix from dosage string."""
    d = (dosage or "").lower()
    if "syp" in d or "ml" in d:
        return "Syp"
    if "cap" in d:
        return "Cap"
    if "inj" in d:
        return "Inj"
    if "drop" in d:
        return "Drop"
    if "oint" in d or "cream" in d or "gel" in d:
        return "Oint"
    return "Tab"


def _facilities_html(facilities: list) -> str:
    if not facilities:
        facilities = ["General Medicine"]
    return "\n".join(f"<li>{f}</li>" for f in facilities)


def _medicine_rows(items, t: dict, lang: str) -> str:
    rows = []
    for idx, item in enumerate(items):
        med = item.medicine
        med_name = med.name if med else (item.instructions or "Custom Drug")
        med_type = _med_type_from_dosage(item.dosage)
        total = item.quantity_prescribed

        freq = _parse_frequency(item.frequency)
        m_on = _active(freq["morning"])
        a_on = _active(freq["afternoon"])
        n_on = _active(freq["night"])

        timing_key = freq.get("timing", "after_meal") or "after_meal"
        timing_lbl = t.get(timing_key, t["after_meal"])

        # dose amount (first non-zero value)
        dose_val = freq["morning"] if m_on else (freq["afternoon"] if a_on else freq["night"])
        try:
            dose_display = "½" if float(dose_val) == 0.5 else str(int(float(dose_val))) if float(dose_val) == int(float(dose_val)) else dose_val
        except Exception:
            dose_display = dose_val or "1"

        unit = t["dose_unit"].get(med_type, "dose")

        sep = '<hr class="ms">' if idx < len(items) - 1 else ""
        rows.append(f"""
<div class="med">
  <div class="med-r1">
    <span class="mtype">{med_type}.</span>
    <span class="mname">{med_name} {item.dosage or ""}</span>
    <span class="mtotal">{total}</span>
  </div>
  <div class="med-r2">
    <span class="mtiming">{timing_lbl}</span>
    <span class="mdose">{dose_display}&nbsp;{unit}</span>
    <span class="mslot{' on' if m_on else ''}">{t["morning"]}</span>
    <span class="mslot{' on' if a_on else ''}">{t["afternoon"]}</span>
    <span class="mslot{' on' if n_on else ''}">{t["night"]}</span>
    <span class="mdur">{item.duration_days}&nbsp;{t["days"]}</span>
  </div>
</div>{sep}""")
    return "\n".join(rows)


def render_prescription_html(rx, profile, lang: str = "mr") -> str:
    """
    Generate a complete, self-contained HTML prescription document.

    Args:
        rx:      Prescription ORM object (with .patient, .doctor, .items loaded)
        profile: ClinicProfile ORM object (or None → uses defaults)
        lang:    'en' | 'mr' | 'hi'
    Returns:
        str: complete HTML string (UTF-8)
    """
    if lang not in LABELS:
        lang = "mr"
    t = LABELS[lang]

    # Profile defaults if not set
    hos_name = (profile.hospital_name_mr if lang == "mr" and profile and profile.hospital_name_mr
                else (profile.hospital_name_en if profile else "Suyog Hospital"))
    doc_name = (profile.doctor_name_mr if lang == "mr" and profile and profile.doctor_name_mr
                else (profile.doctor_name_en if profile else "Dr. Vikas Va. Karande"))
    quals = profile.qualifications if profile else "M.B.B.S. (MUHS NASIK)"
    reg = profile.reg_number if profile else "06/2002/2451"
    spec = profile.specialties if profile else "जनरल फिजीशियन व सर्जन बालरोग व क्षीरोग चिकित्सक"
    hours = profile.clinic_hours if profile else "सकाळी ९ ते सायं. ६ वाजेपर्यंत"
    address = profile.address if profile else "तहसिल समोर, बुलडाणा रोड, मोताळा"
    phone = profile.phone if profile else "7757003800"
    uhid_prefix = profile.uhid_prefix if profile else "U.H.I.D."
    facilities = profile.facilities if profile else []
    if not facilities:
        facilities = ["हृदय रोग", "ब्लड प्रेशर", "दमा", "टि.बी.", "छातीचे विकार",
                      "मधुमेह", "एड्स सहा", "नेफ्युलायझेशन",
                      "त्वचारोग विषयक सहा", "आहार विषयक सहा",
                      "आलेरग्णो विभाग (भरतीची व्यवस्था)"]

    patient = rx.patient
    pat_name = patient.name.upper() if patient else "PATIENT"
    pat_village = patient.village_location.upper() if patient else ""
    pat_age = patient.age.get("formatted", "") if patient else ""

    rx_date = rx.created_at.strftime("%d-%m-%Y") if rx.created_at else ""
    uhid_val = rx.prescription_number

    # Medicine rows
    med_rows = _medicine_rows(rx.items, t, lang)
    notes_html = (rx.notes or "").replace("\n", "<br>") or "&nbsp;"
    facilities_html = _facilities_html(facilities)

    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prescription — {rx.prescription_number}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800;900&family=Noto+Serif+Devanagari:wght@700;900&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨 Print</button>

<div class="rx">

  <!-- HEADER -->
  <div class="hdr">
    <div class="hosp">
      <div class="hname">{hos_name}</div>
      <svg class="ecg" viewBox="0 0 320 22" xmlns="http://www.w3.org/2000/svg">
        <polyline points="0,11 55,11 65,4 70,18 75,2 81,20 87,11 200,11 210,5 218,17 222,11 320,11"
          fill="none" stroke="#c41e3a" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="doc">
      <div class="dname">{doc_name}</div>
      {f'<div class="dqual">{quals}</div>' if quals else ''}
      {f'<div class="dreg">Reg. No. {reg}</div>' if reg else ''}
      {f'<div class="dspec">{spec}</div>' if spec else ''}
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- SIDEBAR -->
    <div class="sb">
      <div class="sb-title">✦ {t["services"]} ✦</div>
      <ul class="sb-list">{facilities_html}</ul>
      {f'<div class="sb-time">☸ {t["hours"]} ☸<br>{hours}</div>' if hours else ''}
      <div class="sb-sun">{t["sunday"]}</div>
    </div>

    <!-- MAIN RX -->
    <div class="main">
      <span class="rxsym">R<sub style="font-size:18px">x</sub></span>

      <!-- Patient bar -->
      <div class="pat">
        <span class="pl">{t["pname"]}</span>
        <span class="pn">{pat_name}</span>
        <span class="pv">{pat_village}</span>
        <span class="pd">{t["date_lbl"]} : &nbsp;{rx_date}</span>
      </div>
      <div class="uhid">
        {uhid_prefix} :&nbsp;<strong>{uhid_val}</strong>
        {f'&nbsp;&nbsp;Age: {pat_age}' if pat_age else ''}
      </div>

      <!-- Medicines -->
      {med_rows}

      <!-- Advice -->
      <div class="adv">
        <div class="adv-en">{t["advice"]}</div>
        <div class="adv-mr">{t["suchna"]} :</div>
        <div class="adv-txt">{notes_html}</div>
      </div>

      <!-- Signature -->
      <div class="sig">
        {f'<img src="{profile.signature_data_url}" alt="Signature" style="max-width:160px;max-height:60px;object-fit:contain;display:block;margin:0 auto 4px;">' if profile and profile.signature_data_url else '<div class="sig-mark">)</div>'}
        <div class="sig-line"></div>
        <div class="sig-name">{doc_name}</div>
        <div class="sig-lbl">{t["sig"]}</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="ftr">
    <div class="ft-addr">📍 {address}</div>
    <div class="ft-phone">मोबा. नं. {phone}</div>
  </div>

</div>

<script>
// Auto-print after fonts load
document.addEventListener('DOMContentLoaded', function() {{
  if (document.fonts && document.fonts.ready) {{
    document.fonts.ready.then(function() {{
      setTimeout(function() {{ window.print(); }}, 800);
    }});
  }} else {{
    setTimeout(function() {{ window.print(); }}, 1500);
  }}
}});
</script>
</body>
</html>"""
