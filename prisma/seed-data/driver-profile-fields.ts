/**
 * The driver onboarding checklist — the information every driver's profile
 * holds. Source: the business's "Onboarding Checklist" workbook ("Driver
 * Database" sheet, Aug 2026), field for field, in its column order.
 *
 * Deliberately NOT carried over from the sheet:
 *   - employee number, name, home plant, work group — already first-class
 *     Driver fields in the app;
 *   - the "full address" / combined emergency-contact columns — spreadsheet
 *     concatenations of the component fields either side of them.
 *
 * Kinds: TEXT (free text), DATE (date picker), YESNO (tick box). Codes are
 * stable identities; labels are editable in Setup.
 */
export interface ProfileFieldSeed {
  code: string;
  label: string;
  section: string;
  kind: "TEXT" | "DATE" | "YESNO";
}

const EMPLOYMENT = "Employment";
const IDENTITY = "Identity";
const LICENCE = "Licence";
const WHITE_CARD = "White card";
const TRAINER = "Trainer & assessor";
const ASSESSMENTS = "Training & assessments";
const CONTACT = "Contact";
const LOD = "LOD";
const ADDRESS = "Home address";
const EMERGENCY = "Emergency contact";
const COURSES = "Site setups & courses";

export const DRIVER_PROFILE_FIELDS: ProfileFieldSeed[] = [
  { code: "WORK_STATUS", label: "Work status", section: EMPLOYMENT, kind: "TEXT" },
  { code: "LOD_TRUCK", label: "LOD truck number", section: EMPLOYMENT, kind: "TEXT" },

  { code: "GENDER", label: "Male / female", section: IDENTITY, kind: "TEXT" },
  { code: "DOB", label: "Date of birth", section: IDENTITY, kind: "DATE" },
  { code: "PHOTO", label: "Photo on file — head and shoulders, no headwear, no glasses, plain background", section: IDENTITY, kind: "YESNO" },

  { code: "LIC_EXPIRY", label: "Licence expiry date", section: LICENCE, kind: "DATE" },
  { code: "LIC_CLASS", label: "Licence class", section: LICENCE, kind: "TEXT" },
  { code: "LIC_NUMBER", label: "Licence number", section: LICENCE, kind: "TEXT" },
  { code: "LIC_COND_VISA", label: 'Licence condition "Q" / visa expiry', section: LICENCE, kind: "TEXT" },
  { code: "LIC_SCAN", label: "Colour scan of both sides (or full-length image of E licence) on file", section: LICENCE, kind: "YESNO" },

  { code: "WC_NUMBER", label: "White card #", section: WHITE_CARD, kind: "TEXT" },
  { code: "WC_ISSUED", label: "White card issue date", section: WHITE_CARD, kind: "DATE" },
  { code: "WC_SCAN", label: "Colour scan of both sides on file", section: WHITE_CARD, kind: "YESNO" },

  { code: "TRAINER", label: "Accredited driver trainer", section: TRAINER, kind: "YESNO" },
  { code: "ASSESSOR", label: "Accredited driver assessor", section: TRAINER, kind: "YESNO" },

  { code: "ACCESS_EGRESS", label: "Access egress competency sign-off", section: ASSESSMENTS, kind: "DATE" },
  { code: "TRAIN_PLAN_10D", label: "10 day training plan", section: ASSESSMENTS, kind: "DATE" },
  { code: "NEW_DRIVER_ASSESS", label: "New driver assessment", section: ASSESSMENTS, kind: "DATE" },
  { code: "ASSESS_6M_DUE", label: "6 months assessment due", section: ASSESSMENTS, kind: "DATE" },
  { code: "ASSESS_6M_DONE", label: "6 months assessment completed", section: ASSESSMENTS, kind: "DATE" },
  { code: "LAST_ASSESS", label: "Last driver assessment", section: ASSESSMENTS, kind: "DATE" },

  { code: "MOBILE", label: "Mobile phone number", section: CONTACT, kind: "TEXT" },
  { code: "USI", label: "USI number", section: CONTACT, kind: "TEXT" },
  { code: "EMAIL", label: "Email address", section: CONTACT, kind: "TEXT" },

  { code: "LOD_VENDOR_ID", label: "LOD vendor ID", section: LOD, kind: "TEXT" },
  { code: "LOD_COMPANY", label: "LOD company name", section: LOD, kind: "TEXT" },

  { code: "ADDR_STREET", label: "Street", section: ADDRESS, kind: "TEXT" },
  { code: "ADDR_SUBURB", label: "Suburb", section: ADDRESS, kind: "TEXT" },
  { code: "ADDR_STATE", label: "State", section: ADDRESS, kind: "TEXT" },
  { code: "ADDR_POSTCODE", label: "Post code", section: ADDRESS, kind: "TEXT" },

  { code: "EC_NAME", label: "Name", section: EMERGENCY, kind: "TEXT" },
  { code: "EC_RELATION", label: "Relationship", section: EMERGENCY, kind: "TEXT" },
  { code: "EC_STREET", label: "Street address", section: EMERGENCY, kind: "TEXT" },
  { code: "EC_SUBURB", label: "Suburb", section: EMERGENCY, kind: "TEXT" },
  { code: "EC_STATE", label: "State", section: EMERGENCY, kind: "TEXT" },
  { code: "EC_POSTCODE", label: "Post code", section: EMERGENCY, kind: "TEXT" },
  { code: "EC_MOBILE", label: "Mobile phone", section: EMERGENCY, kind: "TEXT" },

  { code: "VERSAFLOW_DEC", label: "Versaflow dec complete (tunnel drivers only)", section: COURSES, kind: "YESNO" },
  { code: "SMIC_TAFE", label: "SMIC TAFE certificate", section: COURSES, kind: "TEXT" },
  { code: "DSS3_SETUP", label: "Basic 3DSS set up", section: COURSES, kind: "YESNO" },
  { code: "DAMSTRA_CARD", label: "Basic Damstra set up — card number", section: COURSES, kind: "TEXT" },
  { code: "SILICA_TAFE", label: "Silica awareness and safety (TAFE NSW)", section: COURSES, kind: "YESNO" },
  { code: "SPIRO_AUDIO", label: "Spirometry and audio tests", section: COURSES, kind: "YESNO" },
  { code: "VRU", label: "VRU course uploaded", section: COURSES, kind: "YESNO" },
  { code: "M6_ONLINE_SETUP", label: "M6 online setup", section: COURSES, kind: "YESNO" },
  { code: "M6_ONLINE_DONE", label: "M6 online completed", section: COURSES, kind: "YESNO" },
  { code: "M6_F2F_BOOKED", label: "M6 F2F date booked", section: COURSES, kind: "DATE" },
  { code: "M6_F2F_DONE", label: "M6 F2F complete", section: COURSES, kind: "YESNO" },
  { code: "WFU_SETUP", label: "WFU basic set up", section: COURSES, kind: "YESNO" },
  { code: "WFU_ONLINE_SETUP", label: "WFU online set up", section: COURSES, kind: "YESNO" },
  { code: "WFU_ONLINE_DONE", label: "WFU online induction complete", section: COURSES, kind: "YESNO" },
  { code: "WFU_F2F_BOOKED", label: "WFU F2F date booked", section: COURSES, kind: "DATE" },
  { code: "WFU_F2F_DONE", label: "WFU F2F complete", section: COURSES, kind: "YESNO" },
  { code: "WHT_SETUP", label: "WHT basic set up", section: COURSES, kind: "YESNO" },
  { code: "WHT_ONLINE_SETUP", label: "WHT online set up", section: COURSES, kind: "YESNO" },
  { code: "WHT_ONLINE_DONE", label: "WHT online complete", section: COURSES, kind: "YESNO" },
  { code: "WHT_CARD", label: "WHT card issued", section: COURSES, kind: "TEXT" },
  { code: "WHT_VERSAFLOW", label: "WHT Versaflow form", section: COURSES, kind: "YESNO" },
  { code: "WHT_F2F_BOOKED", label: "WHT F2F date booked", section: COURSES, kind: "DATE" },
  { code: "WHT_F2F_DONE", label: "WHT F2F complete", section: COURSES, kind: "YESNO" },
  { code: "WCX_ONLINE_DONE", label: "WCX online complete", section: COURSES, kind: "YESNO" },
  { code: "USC_SETUP", label: "USC WTP basic set up", section: COURSES, kind: "YESNO" },
  { code: "USC_ONLINE_SETUP", label: "USC WTP online set up", section: COURSES, kind: "YESNO" },
  { code: "USC_ONLINE_DONE", label: "USC WTP online complete", section: COURSES, kind: "YESNO" },
  { code: "USC_F2F_BOOKED", label: "USC WTP F2F date booked", section: COURSES, kind: "DATE" },
  { code: "USC_F2F_DONE", label: "USC WTP F2F complete", section: COURSES, kind: "YESNO" },
  { code: "FHDAT_SETUP", label: "FH / DAT basic set up", section: COURSES, kind: "YESNO" },
  { code: "FHDAT_ONLINE_SETUP", label: "FH / DAT online set up", section: COURSES, kind: "YESNO" },
  { code: "FHDAT_ONLINE_DONE", label: "FH / DAT online complete", section: COURSES, kind: "YESNO" },
  { code: "FHDAT_F2F_BOOKED", label: "FH / DAT F2F date booked", section: COURSES, kind: "DATE" },
  { code: "FHDAT_F2F_DONE", label: "FH / DAT F2F complete", section: COURSES, kind: "YESNO" },
  { code: "BEAKON_SW", label: "Beakon Sydney Water online complete", section: COURSES, kind: "YESNO" },
  { code: "DSS3_NWHA_DONE", label: "3DSS NWHA online complete", section: COURSES, kind: "YESNO" },
  { code: "ADDITIONAL_MODULE", label: "Additional module completed", section: COURSES, kind: "YESNO" },
  { code: "DSS3_ONLINE_SETUP", label: "3DSS online set up", section: COURSES, kind: "YESNO" },
  { code: "VOC", label: "VOC uploaded", section: COURSES, kind: "YESNO" },
  { code: "PPTP_ONLINE_DONE", label: "PPTP online complete", section: COURSES, kind: "YESNO" },
  { code: "PPTP_F2F_BOOKED", label: "PPTP F2F date booked", section: COURSES, kind: "DATE" },
  { code: "PPTP_F2F_DONE", label: "PPTP F2F complete", section: COURSES, kind: "YESNO" },
];
