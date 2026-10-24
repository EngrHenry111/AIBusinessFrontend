export { money, fmtDate, fmtDateTime, toInputDate, todayInput, fullName, errMsg } from '../school/schoolConstants';

export const HOSPITAL_ROLES = {
  admin: 'Admin',
  doctor: 'Doctor',
  nurse: 'Nurse',
  pharmacist: 'Pharmacist',
  lab: 'Lab scientist',
  cashier: 'Cashier',
  records: 'Records / front desk',
};

export const VISIT_STATUS = {
  waiting: { label: 'Waiting', badge: 'warning' },
  triaged: { label: 'Seen by nurse', badge: 'info' },
  in_consultation: { label: 'With doctor', badge: 'brand' },
  completed: { label: 'Completed', badge: 'success' },
  admitted: { label: 'Admitted', badge: 'danger' },
  cancelled: { label: 'Cancelled', badge: 'neutral' },
};

export const VISIT_TYPES = { outpatient: 'Outpatient', emergency: 'Emergency', follow_up: 'Follow-up', antenatal: 'Antenatal', inpatient: 'Inpatient' };
export const PRIORITY = { normal: { label: 'Normal', badge: 'neutral' }, urgent: { label: 'Urgent', badge: 'warning' }, emergency: { label: 'Emergency', badge: 'danger' } };

export const LAB_STATUS = {
  requested: { label: 'Awaiting sample', badge: 'warning' },
  collected: { label: 'In progress', badge: 'info' },
  completed: { label: 'Results ready', badge: 'success' },
  cancelled: { label: 'Cancelled', badge: 'neutral' },
};

export const RX_STATUS = {
  pending: { label: 'To price', badge: 'warning' },
  billed: { label: 'Priced, to dispense', badge: 'info' },
  dispensed: { label: 'Dispensed', badge: 'success' },
  cancelled: { label: 'Cancelled', badge: 'neutral' },
};

export const BILL_STATUS = {
  unpaid: { label: 'Unpaid', badge: 'danger' },
  partial: { label: 'Part paid', badge: 'warning' },
  paid: { label: 'Paid', badge: 'success' },
  cancelled: { label: 'Cancelled', badge: 'neutral' },
};

export const CLAIM_STATUS = {
  pending: { label: 'Not claimed', badge: 'warning' },
  submitted: { label: 'Submitted', badge: 'info' },
  paid: { label: 'Paid', badge: 'success' },
  rejected: { label: 'Rejected', badge: 'danger' },
};

export const PAYMENT_METHODS = { cash: 'Cash', pos: 'POS', bank_transfer: 'Bank transfer', cheque: 'Cheque', online: 'Online' };

export const CHARGE_CATEGORIES = {
  registration: 'Registration', consultation: 'Consultation', nursing: 'Nursing', procedure: 'Procedure',
  lab: 'Laboratory', pharmacy: 'Pharmacy', bed: 'Bed / ward', other: 'Other',
};

export const WARD_TYPES = { general: 'General', male: 'Male', female: 'Female', children: 'Children', maternity: 'Maternity', icu: 'ICU', private: 'Private', isolation: 'Isolation', other: 'Other' };
export const BED_STATUS = { available: { label: 'Free', badge: 'success' }, occupied: { label: 'Occupied', badge: 'danger' }, cleaning: { label: 'Cleaning', badge: 'warning' }, maintenance: { label: 'Out of use', badge: 'neutral' } };

export const OUTCOMES = { improved: 'Improved', recovered: 'Recovered', referred: 'Referred', against_advice: 'Left against medical advice', deceased: 'Deceased', other: 'Other' };

export const DRUG_FORMS = ['tablet', 'capsule', 'syrup', 'suspension', 'injection', 'infusion', 'cream', 'drops', 'inhaler', 'suppository', 'consumable', 'other'];
export const FREQUENCIES = [['od', 'Once daily'], ['bd', 'Twice daily'], ['tds', '3 times daily'], ['qds', '4 times daily'], ['nocte', 'At night'], ['stat', 'Once now'], ['prn', 'When needed'], ['weekly', 'Weekly']];
export const ROUTES = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Rectal', 'Inhaled', 'Eye', 'Ear', 'Nasal', 'Vaginal'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const GENOTYPES = ['AA', 'AS', 'AC', 'SS', 'SC'];

// Common diagnoses in Nigerian practice, with ICD-10 codes, for quick entry.
export const COMMON_DIAGNOSES = [
  ['B54', 'Malaria'], ['B50.9', 'Plasmodium falciparum malaria'], ['A01.0', 'Typhoid fever'], ['J06.9', 'Upper respiratory tract infection'],
  ['J18.9', 'Pneumonia'], ['J45.9', 'Asthma'], ['N39.0', 'Urinary tract infection'], ['A09', 'Gastroenteritis'],
  ['K29.7', 'Gastritis'], ['K27.9', 'Peptic ulcer disease'], ['I10', 'Hypertension'], ['E11.9', 'Type 2 diabetes mellitus'],
  ['E10.9', 'Type 1 diabetes mellitus'], ['D64.9', 'Anaemia'], ['D57.1', 'Sickle cell disease (crisis)'], ['B20', 'HIV disease'],
  ['B18.1', 'Chronic hepatitis B'], ['A15.9', 'Pulmonary tuberculosis'], ['L08.9', 'Skin infection'], ['B35.9', 'Fungal skin infection (tinea)'],
  ['H10.9', 'Conjunctivitis'], ['H66.9', 'Otitis media'], ['J02.9', 'Pharyngitis / tonsillitis'], ['R50.9', 'Fever, cause not yet known'],
  ['R51', 'Headache'], ['M54.5', 'Low back pain'], ['M19.9', 'Osteoarthritis'], ['K35.8', 'Acute appendicitis'],
  ['N76.0', 'Vaginitis'], ['A54.9', 'Gonorrhoea'], ['A53.9', 'Syphilis'], ['O80', 'Normal delivery'],
  ['Z34.9', 'Antenatal care (normal pregnancy)'], ['O14.9', 'Pre-eclampsia'], ['O20.0', 'Threatened miscarriage'], ['E43', 'Severe malnutrition'],
  ['E86', 'Dehydration'], ['T14.1', 'Open wound'], ['S06.0', 'Concussion / head injury'], ['F32.9', 'Depression'],
];

export const ageOf = (dob) => {
  if (!dob) return '';
  const d = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) years -= 1;
  if (years >= 2) return `${years}y`;
  const months = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth() - (now.getDate() < d.getDate() ? 1 : 0);
  return months >= 1 ? `${months}m` : `${Math.max(0, Math.floor((now - d) / 86400000))}d`;
};

export const sexAge = (p) => [p?.gender === 'male' ? 'M' : p?.gender === 'female' ? 'F' : '', ageOf(p?.dateOfBirth)].filter(Boolean).join(' · ');

export const bp = (v) => (v?.systolic && v?.diastolic ? `${v.systolic}/${v.diastolic}` : '');
