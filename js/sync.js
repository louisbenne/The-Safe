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

    const res = await fetch('/api/import', {
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
    const headers = Object.assign({ 'Content-Type': 'application/json' }, window.theSafeAuth ? window.theSafeAuth.getAuthHeader() : {});
    const res = await fetch('/api/items', { headers });
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
    if (!window.inventory || !Array.isArray(window.inventory)) window.inventory = [];

    // Merge: avoid exact duplicates by server id
    const existingIds = new Set(window.inventory.map((i) => i.id));
    let added = 0;
    for (const row of items) {
      const mapped = mapServerItemToLocal(row);
      if (!existingIds.has(mapped.id)) {
        window.inventory.unshift(mapped); // add to front
        existingIds.add(mapped.id);
        added++;
      }
    }

    // Persist and refresh table if helper exists
    try {
      if (typeof persistInventoryAndRefresh === 'function') {
        persistInventoryAndRefresh();
      } else if (typeof saveInventory === 'function') {
        await saveInventory();
      }
    } catch (e) {
      console.error('persist failed', e);
    }
    return { imported: result.imported || 0, added };
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
