// Removed: Encrypted vault (.stvault) export/import disabled for Vault fork.
// The original vault.js implemented AES-256-GCM backup/restore flows and
// Diff/restore UI. For the Vault fork these flows are removed from the
// application's surface and storage model. Keep a minimal stub to avoid
// runtime ReferenceErrors from callers that haven't yet been fully removed.

function collectVaultData() {
  // Vault export removed in Vault fork — return null to indicate no data.
  return null;
}

async function vaultDecryptToData() {
  throw new Error("Encrypted vault import is disabled in this fork.");
}

// Export minimal API to preserve imports
window.collectVaultData = collectVaultData;
window.vaultDecryptToData = vaultDecryptToData;
