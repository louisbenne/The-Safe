/* js/sync.js — Minimal import integration with THE SAFE backend
   - submits XLSX/CSV file to /api/import (authenticated)
   - on success fetches /api/items and merges into local inventory, then refreshes UI
*/
(function () {
  'use strict';

  async function submitImportFile(file) {
    if (!file) throw new Error('no_file');
    const fd = new FormData();
    fd.append('file', file);

    const headers = Object.assign({}, window.theSafeAuth ? window.theSafeAuth.getAuthHeader() : {});

    const url = window.THE_SAFE_SERVER_URL ? window.THE_SAFE_SERVER_URL.replace(/\/$/, '') + '/api/import' : '/api/import';
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: fd,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error('import_failed: ' + txt);
    }
    return res.json();
  }

  async function fetchServerItems() {
    const url = window.THE_SAFE_SERVER_URL ? window.THE_SAFE_SERVER_URL.replace(/\/$/, '') + '/api/items' : '/api/items';
    const headers = Object.assign({ 'Content-Type': 'application/json' }, window.theSafeAuth ? window.theSafeAuth.getAuthHeader() : {});
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    return res.json();
  }

  function mapServerItemToLocal(row) {
    // Basic mapping — keep minimal to avoid breaking existing schemas
    return {
      id: `srv-${row.id}`,
      orderId: row.order_id || '',
      name: row.name || '',
      metal: row.metal || '',
      weight: row.weight_oz || 0,
      dateBought: row.date_bought || null,
      pricePaid: row.price_paid_gbp || 0,
      notes: row.notes || '',
    };
  }

  async function importAndMerge(file) {
    const result = await submitImportFile(file);
    // fetch items and merge
    const items = await fetchServerItems();
    if (!Array.isArray(items) || items.length === 0) return result;

    // Map server rows into the app's import JSON shape and use the existing
    // importJsonFromText pipeline so items receive proper UUID/serial stamping
    const mapped = items.map((row) => {
      return {
        // Minimal safe mapping; inventory-import.js will sanitize and supply defaults
        name: row.name || row['Name / Type'] || row['Name'] || '',
        type: row.type || '',
        metal: row.metal || '',
        weight: row.weight_oz || row['Weight (oz)'] || row.weight || 0,
        weightUnit: 'oz',
        date: row.date_bought || row['Date Bought'] || row.date || null,
        price: row.price_paid_gbp || row['Price Paid (£)'] || row.price || 0,
        notes: row.notes || row.Notes || '',
        importSource: 'server',
      };
    });

    try {
      if (typeof importJsonFromText === 'function') {
        // importJsonFromText expects JSON text and an override flag
        await importJsonFromText(JSON.stringify(mapped), false);
        return { imported: result.imported || 0, added: mapped.length };
      } else if (typeof importJson === 'function') {
        // fallback: call importJson using a Blob
        const blob = new Blob([JSON.stringify(mapped)], { type: 'application/json' });
        const file = new File([blob], 'server-import.json', { type: 'application/json' });
        await importJson(file, false);
        return { imported: result.imported || 0, added: mapped.length };
      } else {
        // as a last resort, push minimal mapped items with srv- ids (legacy path)
        if (!window.inventory || !Array.isArray(window.inventory)) window.inventory = [];
        const existingKeys = new Set(window.inventory.map((i) => i.id || i.uuid || ''));
        let added = 0;
        for (const m of mapped) {
          const sid = "srv-" + Math.random().toString(36).slice(2, 9);
          if (!existingKeys.has(sid)) {
            const local = Object.assign({ id: sid }, m);
            window.inventory.unshift(local);
            existingKeys.add(sid);
            added++;
          }
        }
        if (typeof persistInventoryAndRefresh === 'function') persistInventoryAndRefresh();
        return { imported: result.imported || 0, added };
      }
    } catch (err) {
      console.error('server import apply failed', err);
      throw err;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const importForm = document.getElementById('serverImportForm');
    if (!importForm) return;
    const fileInput = document.getElementById('importFileInput');
    const importBtn = document.getElementById('importSubmitBtn');
    const importStatus = document.getElementById('importStatus');

    importForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!fileInput.files || fileInput.files.length === 0) return alert('Select a file to import');
      const file = fileInput.files[0];
      importBtn.disabled = true;
      importStatus.textContent = 'Uploading...';
      try {
        const r = await importAndMerge(file);
        importStatus.textContent = `Server imported ${r.imported || 0}, added ${r.added || 0} items.`;
      } catch (err) {
        console.error(err);
        importStatus.textContent = 'Import failed';
        alert('Import failed: ' + (err && err.message ? err.message : String(err)));
      } finally {
        importBtn.disabled = false;
      }
    });
  });

  window.theSafeSync = { importAndMerge, submitImportFile, fetchServerItems };
})();
