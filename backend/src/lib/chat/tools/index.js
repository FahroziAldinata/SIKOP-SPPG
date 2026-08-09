'use strict';

// =============================================================================
// Tool Registry Index v1 — Central Registry Chatbot Tools
// =============================================================================

const giziMenu = require('./giziMenuStatus');
const akuntanRab = require('./akuntanRabStatus');
const mitraPo = require('./mitraPoStatus');
const aslapInput = require('./aslapInputStatus');

const modules = [giziMenu, akuntanRab, mitraPo, aslapInput];

// Daftar semua definisi tool yang diperkaya dengan property resourceStatus
const ALL_TOOL_DEFINITIONS = [];

// Map resolver: toolName -> { fn, resourceStatus }
const RESOLVER_MAP = {};

// Map lookup cepat: toolName -> resourceStatus
const TOOL_RESOURCE_MAP = {};

modules.forEach((mod) => {
  const resourceStatus = mod.RESOURCE_KODE;
  if (mod.TOOL_DEFINITIONS && Array.isArray(mod.TOOL_DEFINITIONS)) {
    mod.TOOL_DEFINITIONS.forEach((def) => {
      const enrichedDef = {
        ...def,
        resourceStatus
      };
      ALL_TOOL_DEFINITIONS.push(enrichedDef);

      const toolName = def.function.name;
      TOOL_RESOURCE_MAP[toolName] = resourceStatus;
    });
  }
});

// Peta eksplisit fungsi resolver
RESOLVER_MAP['cek_status_menu_harian'] = { fn: giziMenu.cekStatusMenuHarian, resourceStatus: giziMenu.RESOURCE_KODE };
RESOLVER_MAP['hitung_menu_pending'] = { fn: giziMenu.hitungMenuPending, resourceStatus: giziMenu.RESOURCE_KODE };

RESOLVER_MAP['cek_status_rab_harian'] = { fn: akuntanRab.cekStatusRabHarian, resourceStatus: akuntanRab.RESOURCE_KODE };
RESOLVER_MAP['hitung_rab_pending'] = { fn: akuntanRab.hitungRabPending, resourceStatus: akuntanRab.RESOURCE_KODE };

RESOLVER_MAP['hitung_po_pending'] = { fn: mitraPo.hitungPoPending, resourceStatus: mitraPo.RESOURCE_KODE };
RESOLVER_MAP['cek_status_po_supplier'] = { fn: mitraPo.cekStatusPoSupplier, resourceStatus: mitraPo.RESOURCE_KODE };

RESOLVER_MAP['cek_status_input_pm'] = { fn: aslapInput.cekStatusInputPm, resourceStatus: aslapInput.RESOURCE_KODE };

module.exports = {
  ALL_TOOL_DEFINITIONS,
  RESOLVER_MAP,
  TOOL_RESOURCE_MAP
};
