const crypto = require("node:crypto");
const os = require("node:os");
const LICENSE_VALIDATION_URL = "__NLPLUGINS_LICENSE_VALIDATE_URL__";
const PRODUCT_ID = "__NLPLUGINS_PRODUCT_ID__";
function isLicenseValidationConfigured() { return !LICENSE_VALIDATION_URL.includes("__NLPLUGINS_") && !PRODUCT_ID.includes("__NLPLUGINS_"); }
function buildMachineId() { return crypto.createHash("sha256").update(`${os.hostname()}:${os.platform()}:${os.arch()}`).digest("hex").slice(0, 16); }
async function validateLicense(key) {
  if (!key || key === "your-license-key") { console.warn("⚠️  Evaluation mode."); return { valid: false, mode: "evaluation" }; }
  if (!isLicenseValidationConfigured()) { console.warn("⚠️  License validation not configured. Evaluation mode."); return { valid: false, mode: "evaluation" }; }
  try {
    const res = await fetch(LICENSE_VALIDATION_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, product_id: PRODUCT_ID, machine_id: buildMachineId() }) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.valid) { console.log("✅ Licensed"); return { valid: true }; }
  } catch (e) { console.warn("⚠️  Offline mode"); }
  return { valid: false, mode: "evaluation" };
}
module.exports = { validateLicense };
