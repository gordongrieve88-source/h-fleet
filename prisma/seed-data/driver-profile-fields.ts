/**
 * The driver onboarding checklist — the information every driver's profile
 * holds. Source: the business's "Onboarding Checklist" workbook ("Driver
 * Database" sheet, Aug 2026), field for field, in its column order.
 *
 * Deliberately NOT carried over from the sheet:
 *   - employee number, name, home plant, work group — already first-class
 *     Driver fields in the app;
 *   - the "full address" / combined emergency-contact columns — spreadsheet
 *     concatenations of the component fields either side of them;
 *   - the "Site setups & courses" columns — region-specific, so they live as
 *     state-scoped competencies instead (see ./site-courses.ts).
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
];