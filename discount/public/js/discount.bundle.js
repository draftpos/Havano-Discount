// Discount App — Havano POS

(function () {
  "use strict";
  if (!window.location.pathname.includes("/dashboard")) return;

  let settings = {};

  async function apiFetch(method, args) {
    const params = new URLSearchParams({ cmd: method, ...args });
    try {
      const r = await fetch("/api/method/" + method, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Frappe-CSRF-Token": window.csrf_token || "" },
        body: params
      });
      const data = await r.json();
      return data?.message ?? data;
    } catch (e) { return null; }
  }

  async function getSettings() {
    const data = await apiFetch("discount.api.get_ha_discount_settings", {});
    settings = data || {};
    return settings;
  }

  function waitFor(selector, cb, retries = 50) {
    const el = document.querySelector(selector);
    if (el) { cb(el); return; }
    if (retries > 0) setTimeout(() => waitFor(selector, cb, retries - 1), 400);
  }

  // ════════════════════════════
  // 1. LAYBY BUTTON
  // ════════════════════════════
  function injectLaybyButton() {
    if (!settings.allow_layby) return;
    if (document.querySelector(".ha-layby-btn")) return;
    const tryInject = (retries = 30) => {
      const labels = [...document.querySelectorAll("label.cursor-pointer")];
      const takeaway = labels.find(l => l.textContent.trim().includes("Take Away"));
      if (!takeaway) { if (retries > 0) setTimeout(() => tryInject(retries - 1), 500); return; }
      const btn = document.createElement("button");
      btn.className = "ha-layby-btn";
      btn.style.cssText = "background:#f59e0b;color:#fff;border:none;padding:4px 14px;border-radius:9999px;font-size:0.875rem;font-weight:500;cursor:pointer;margin-left:8px;";
      btn.textContent = "Layby";
      btn.onmouseenter = () => btn.style.background = "#d97706";
      btn.onmouseleave = () => btn.style.background = "#f59e0b";
      btn.onclick = () => window.open(`${window.location.origin}/app/sales-order/new-sales-order-1?layby=1`, "_blank");
      takeaway.parentNode.insertBefore(btn, takeaway.nextSibling);
    };
    tryInject();
  }

  // ════════════════════════════
  // 2. RECEIPT BUTTON
  // ════════════════════════════
  function injectReceiptButton() {
    if (!settings.allow_receipts) return;
    if (document.querySelector(".ha-receipt-btn")) return;
    const tryInject = (retries = 30) => {
      const anchor = document.querySelector(".ha-layby-btn") ||
        [...document.querySelectorAll("label.cursor-pointer")].find(l => l.textContent.trim().includes("Take Away"));
      if (!anchor) { if (retries > 0) setTimeout(() => tryInject(retries - 1), 500); return; }
      const btn = document.createElement("button");
      btn.className = "ha-receipt-btn";
      btn.style.cssText = "background:#6b7280;color:#fff;border:none;padding:4px 14px;border-radius:9999px;font-size:0.875rem;font-weight:500;cursor:pointer;margin-left:8px;";
      btn.textContent = "Receipt";
      btn.onmouseenter = () => btn.style.background = "#4b5563";
      btn.onmouseleave = () => btn.style.background = "#6b7280";
      btn.onclick = () => openReceiptModal();
      anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    };
    tryInject();
  }

  // ════════════════════════════
  // 3. RECEIPT MODAL
  // ════════════════════════════
  function openReceiptModal() {
    if (document.getElementById("ha-receipt-modal")) return;
    const modal = document.createElement("div");
    modal.id = "ha-receipt-modal";
    modal.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);";
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:460px;margin:16px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.3);">
        <div style="background:#4b5563;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;">
          <h2 style="color:#fff;font-size:1.1rem;font-weight:700;margin:0;">Make Payment</h2>
          <button id="ha-r-close" style="color:#fff;background:none;border:none;font-size:1.5rem;cursor:pointer;">×</button>
        </div>
        <div style="padding:24px;display:flex;flex-direction:column;gap:14px;">
          <div>
            <label style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:4px;">Payment Date *</label>
            <input id="ha-r-date" type="date" value="${new Date().toISOString().split('T')[0]}"
              style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:0.875rem;box-sizing:border-box;"/>
          </div>
          <div style="position:relative;">
            <label style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:4px;">Customer *</label>
            <input id="ha-r-cust-input" type="text" placeholder="Click to select customer..."
              style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:0.875rem;box-sizing:border-box;"/>
            <div id="ha-r-cust-list" style="display:none;position:absolute;z-index:200;width:100%;background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);max-height:200px;overflow-y:auto;margin-top:4px;"></div>
          </div>
          <div style="position:relative;">
            <label style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:4px;">Account Paid To *</label>
            <input id="ha-r-acct-input" type="text" placeholder="Search account..."
              style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:0.875rem;box-sizing:border-box;"/>
            <div id="ha-r-acct-list" style="display:none;position:absolute;z-index:200;width:100%;background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);max-height:160px;overflow-y:auto;margin-top:4px;"></div>
          </div>
          <div>
            <label style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:4px;">Payment Amount *</label>
            <input id="ha-r-amount" type="number" step="0.01" min="0" placeholder="0.00"
              style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:0.875rem;box-sizing:border-box;"/>
          </div>
          <div>
            <label style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:4px;">Balance (Outstanding)</label>
            <input id="ha-r-balance" type="number" step="0.01" placeholder="0.00" readonly
              style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:0.875rem;background:#f9fafb;box-sizing:border-box;"/>
          </div>
          <div style="display:flex;gap:12px;padding-top:4px;">
            <button id="ha-r-cancel" style="flex:1;height:44px;border-radius:12px;border:2px solid #d1d5db;background:#fff;color:#374151;font-weight:600;cursor:pointer;">Cancel</button>
            <button id="ha-r-save" style="flex:2;height:44px;border-radius:12px;background:#4b5563;color:#fff;font-weight:700;border:none;cursor:pointer;">Create Payment</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    let selCustomer = null, selCustomerName = "", selAccount = null, allAccounts = [];
    apiFetch("discount.api.get_cash_bank_accounts", {}).then(r => { allAccounts = r || []; });

    async function loadCustomers(q) {
      const args = { doctype: "Customer", fields: JSON.stringify(["name", "customer_name"]), limit_page_length: 50 };
      if (q && q.length > 1) args.filters = JSON.stringify([["customer_name", "like", "%" + q + "%"]]);
      const r = await apiFetch("frappe.client.get_list", args);
      const customers = Array.isArray(r) ? r : [];
      const list = document.getElementById("ha-r-cust-list");
      list.innerHTML = customers.length === 0
        ? `<p style="padding:12px 16px;font-size:0.875rem;color:#9ca3af;">No customers found</p>`
        : customers.map(c => `<button type="button" data-name="${c.name}" data-label="${c.customer_name}"
            style="display:block;width:100%;text-align:left;padding:10px 16px;font-size:0.875rem;border:none;border-bottom:1px solid #f3f4f6;background:#fff;cursor:pointer;"
            onmouseenter="this.style.background='#f3f4f6'" onmouseleave="this.style.background='#fff'">${c.customer_name}</button>`).join("");
      list.style.display = "block";
      list.querySelectorAll("button[data-name]").forEach(btn => {
        btn.onclick = () => {
          selCustomer = btn.dataset.name; selCustomerName = btn.dataset.label;
          document.getElementById("ha-r-cust-input").value = selCustomerName;
          list.style.display = "none";
          apiFetch("discount.api.get_customer_outstanding", { customer: selCustomer }).then(res => {
            document.getElementById("ha-r-balance").value = parseFloat(res?.outstanding || 0).toFixed(2);
          });
        };
      });
    }

    function renderAccounts(q) {
      const list = document.getElementById("ha-r-acct-list");
      const filtered = q ? allAccounts.filter(a => a.name.toLowerCase().includes(q.toLowerCase())) : allAccounts;
      list.innerHTML = filtered.map(a => `<button type="button" data-name="${a.name}"
        style="display:block;width:100%;text-align:left;padding:8px 12px;font-size:0.875rem;border:none;border-bottom:1px solid #f3f4f6;background:#fff;cursor:pointer;"
        onmouseenter="this.style.background='#f3f4f6'" onmouseleave="this.style.background='#fff'">
        ${a.name}<span style="font-size:0.75rem;color:#9ca3af;margin-left:8px;">${a.account_type}</span></button>`).join("");
      list.style.display = filtered.length ? "block" : "none";
      list.querySelectorAll("button[data-name]").forEach(btn => {
        btn.onclick = () => { selAccount = btn.dataset.name; document.getElementById("ha-r-acct-input").value = selAccount; list.style.display = "none"; };
      });
    }

    document.getElementById("ha-r-cust-input").addEventListener("focus", () => loadCustomers(""));
    document.getElementById("ha-r-cust-input").addEventListener("input", e => loadCustomers(e.target.value));
    document.getElementById("ha-r-acct-input").addEventListener("focus", () => renderAccounts(""));
    document.getElementById("ha-r-acct-input").addEventListener("input", e => renderAccounts(e.target.value));

    const close = () => modal.remove();
    document.getElementById("ha-r-close").onclick = close;
    document.getElementById("ha-r-cancel").onclick = close;
    modal.onclick = e => { if (e.target === modal) close(); };

    document.getElementById("ha-r-save").onclick = async () => {
      const date = document.getElementById("ha-r-date").value;
      const amount = document.getElementById("ha-r-amount").value;
      if (!selCustomer || !selAccount || !amount) { alert("Please fill in Customer, Account Paid To and Amount Paid."); return; }
      const btn = document.getElementById("ha-r-save");
      btn.textContent = "Saving..."; btn.disabled = true;
      const res = await apiFetch("discount.api.create_layby_payment", {
        sales_order: "", paid_to: selAccount, paid_amount: amount,
        mode_of_payment: "Cash", posting_date: date, customer: selCustomer,
        remarks: "Receipt payment", is_receipt: 1
      });
      if (res?.success) {
        const receipt = {
          CompanyName: "", InvoiceNo: res.payment_entry, InvoiceDate: date, CashierName: "",
          CustomerName: selCustomerName || selCustomer, CustomerContact: selCustomerName || "",
          CustomerTradeName: null, CustomerEmail: null, CustomerTIN: null, CustomerVAT: null,
          Customeraddress: null, itemlist: [], AmountTendered: String(amount), Change: 0,
          Currency: "USD", Footer: "Thank you for your payment!",
          MultiCurrencyDetails: [{ Key: "USD", Value: parseFloat(amount) }],
          DeviceID: "", DeviceSerial: "", FiscalDay: "", ReceiptNo: "", CustomerRef: "None",
          VCode: "", QRCode: "", DiscAmt: "0.0", Subtotal: parseFloat(amount),
          TotalVat: "0.0", GrandTotal: parseFloat(amount), TaxType: "Standard VAT",
          PaymentMode: "Cash", ReceiptType: "receipt"
        };
        const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        a.download = "Receipt-" + res.payment_entry + ".txt"; a.click();
        URL.revokeObjectURL(url);
        alert("Payment created successfully!"); close();
      } else {
        alert("Error: " + (res?.message || "Failed to save receipt"));
        btn.textContent = "Create Payment"; btn.disabled = false;
      }
    };
  }

  // ════════════════════════════
  // 4. DISCOUNT in UpdateCartDialog
  // ════════════════════════════
  function injectDiscountIntoDialog(dialogEl) {
    if (!settings.allow_discount) return;
    if (dialogEl.querySelector(".ha-discount-section")) return;

    const priceLabel = [...dialogEl.querySelectorAll("label")].find(l => l.textContent.trim() === "Price");
    if (!priceLabel) return;
    const priceContainer = priceLabel.closest("div");
    if (!priceContainer) return;
    const priceInput = priceContainer.querySelector("input");

    // Pre-fill quantity from selected cart item
    const qtyLabel = [...dialogEl.querySelectorAll("label")].find(l => l.textContent.trim() === "Quantity");
    const qtyInput = qtyLabel ? qtyLabel.closest("div")?.querySelector("input") : null;
    if (qtyInput && window.__ha_selected_item && !qtyInput.value) {
      const currentQty = window.__ha_selected_item.quantity || window.__ha_selected_item.qty || 1;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(qtyInput, String(currentQty));
      qtyInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    const section = document.createElement("div");
    section.className = "ha-discount-section";
    section.style.cssText = "margin-top:12px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;";
    section.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <input type="checkbox" id="ha-disc-chk" style="width:16px;height:16px;accent-color:#374151;"/>
        <label for="ha-disc-chk" style="font-size:0.875rem;font-weight:600;color:#374151;cursor:pointer;user-select:none;">Apply Discount</label>
        <span id="ha-disc-badge" style="display:none;font-size:0.7rem;background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:9999px;font-weight:500;margin-left:auto;"></span>
      </div>
      <div id="ha-disc-no-rule" style="display:none;font-size:0.8rem;color:#9ca3af;font-style:italic;">No discount available for this item.</div>
      <div id="ha-disc-rule-info" style="display:none;font-size:0.75rem;color:#0369a1;background:#e0f2fe;padding:6px 10px;border-radius:4px;margin-top:6px;line-height:1.6;"></div>
      <div id="ha-disc-pin-area" style="display:none;margin-top:10px;padding:10px;border:1px solid #d1d5db;border-radius:8px;background:#fff;">
        <div style="font-size:0.8rem;color:#6b7280;margin-bottom:8px;font-weight:500;">Enter supervisor PIN:</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="ha-pin-input" type="password" placeholder="Enter PIN"
            style="flex:1;border:1px solid #d1d5db;border-radius:6px;padding:8px 12px;font-size:1rem;letter-spacing:4px;box-sizing:border-box;background:#fff;"
            autocomplete="off"/>
          <button id="ha-pin-ok" type="button"
            style="padding:8px 16px;background:#374151;color:#fff;border:none;border-radius:6px;font-size:0.875rem;font-weight:600;cursor:pointer;">Approve</button>
          <button id="ha-pin-cancel" type="button"
            style="padding:8px 12px;background:#fff;color:#6b7280;border:1px solid #d1d5db;border-radius:6px;font-size:0.875rem;cursor:pointer;">Cancel</button>
        </div>
        <div id="ha-pin-err" style="font-size:0.75rem;color:#dc2626;margin-top:6px;display:none;"></div>
      </div>
      <div id="ha-disc-fields" style="display:none;margin-top:10px;">
        <div id="ha-disc-auto-applied" style="padding:10px;border:1px solid #bbf7d0;border-radius:8px;background:#f0fdf4;margin-bottom:10px;display:none;">
          <div style="font-size:0.8rem;color:#059669;font-weight:600;margin-bottom:4px;">✓ Discount Applied (from pricing rule)</div>
          <div id="ha-disc-auto-info" style="font-size:0.85rem;color:#374151;"></div>
        </div>
        <div style="margin-bottom:8px;">
          <label style="font-size:0.75rem;color:#6b7280;margin-bottom:4px;display:block;">Adjust discount (enter new price or leave as applied):</label>
          <input id="ha-disc-adjust" type="number" step="0.01" min="0" placeholder="New price"
            style="width:100%;border:1px solid #d1d5db;border-radius:6px;padding:8px 10px;font-size:0.875rem;box-sizing:border-box;background:#fff;"/>
          <div id="ha-disc-adjust-hint" style="font-size:0.72rem;color:#6b7280;margin-top:3px;"></div>
        </div>
        <div id="ha-disc-adjust-ok" style="font-size:0.8rem;color:#059669;font-weight:500;display:none;margin-top:4px;"></div>
        <div id="ha-disc-adjust-err" style="font-size:0.8rem;color:#dc2626;padding:6px 10px;background:#fef2f2;border-radius:6px;border:1px solid #fecaca;display:none;margin-top:4px;"></div>
      </div>`;

    priceContainer.after(section);

    const chk = section.querySelector("#ha-disc-chk");
    const noRule = section.querySelector("#ha-disc-no-rule");
    const ruleInfo = section.querySelector("#ha-disc-rule-info");
    const badge = section.querySelector("#ha-disc-badge");
    const pinArea = section.querySelector("#ha-disc-pin-area");
    const pinInput = section.querySelector("#ha-pin-input");
    const pinOk = section.querySelector("#ha-pin-ok");
    const pinCancel = section.querySelector("#ha-pin-cancel");
    const pinErr = section.querySelector("#ha-pin-err");
    const fields = section.querySelector("#ha-disc-fields");
    const autoApplied = section.querySelector("#ha-disc-auto-applied");
    const autoInfo = section.querySelector("#ha-disc-auto-info");
    const adjustInput = section.querySelector("#ha-disc-adjust");
    const adjustHint = section.querySelector("#ha-disc-adjust-hint");
    const adjustOk = section.querySelector("#ha-disc-adjust-ok");
    const adjustErr = section.querySelector("#ha-disc-adjust-err");

    let pinApproved = false;
    let ruleData = null;

    function getBase() { return parseFloat(priceInput?.value || 0); }

    function applyToReact(val) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(priceInput, val.toFixed(2));
      priceInput.dispatchEvent(new Event("input", { bubbles: true }));
      priceInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function applyRuleDiscount() {
      if (!ruleData) return;
      const base = getBase();
      let newPrice = base;
      let info = "";

      if (ruleData.rate_or_discount === "Discount Amount" && ruleData.discount_amount > 0) {
        newPrice = base - ruleData.discount_amount;
        info = `${ruleData.discount_amount} off → New price: ${newPrice.toFixed(2)}`;
      } else if (ruleData.discount_value > 0) {
        newPrice = base - (ruleData.discount_value / 100) * base;
        info = `${ruleData.discount_value}% off → New price: ${newPrice.toFixed(2)} (save ${((ruleData.discount_value / 100) * base).toFixed(2)})`;
      }

      if (newPrice < 0) newPrice = 0;
      autoInfo.textContent = info;
      autoApplied.style.display = "block";
      applyToReact(newPrice);

      // Set hint for adjust field
      const minPrice = ruleData.max_discount > 0 ? base - (ruleData.max_discount / 100) * base : 0;
      const maxPrice = base;
      adjustHint.textContent = `Allowed price range: ${minPrice.toFixed(2)} – ${maxPrice.toFixed(2)}`;
      adjustInput.placeholder = newPrice.toFixed(2);
    }

    // Adjust input
    adjustInput.addEventListener("input", () => {
      const base = getBase();
      const newP = parseFloat(adjustInput.value);
      adjustErr.style.display = "none";
      adjustOk.style.display = "none";
      if (isNaN(newP) || adjustInput.value === "") return;

      // Validate against pricing rule limits
      const maxDisc = ruleData?.max_discount || 100;
      const minPrice = base - (maxDisc / 100) * base;

      // Also validate min_amt / max_amt
      if (ruleData?.min_amt > 0 && newP < ruleData.min_amt) {
        adjustErr.textContent = `⚠ Below min amount ${ruleData.min_amt}. Restored.`;
        adjustErr.style.display = "block";
        applyRuleDiscount(); return;
      }
      if (ruleData?.max_amt > 0 && newP > ruleData.max_amt) {
        adjustErr.textContent = `⚠ Above max amount ${ruleData.max_amt}. Restored.`;
        adjustErr.style.display = "block";
        applyRuleDiscount(); return;
      }
      if (newP < minPrice) {
        adjustErr.textContent = `⚠ Max discount is ${maxDisc}%. Min price: ${minPrice.toFixed(2)}. Restored.`;
        adjustErr.style.display = "block";
        applyRuleDiscount(); return;
      }
      if (newP > base) {
        adjustErr.textContent = `⚠ Cannot exceed original price ${base.toFixed(2)}. Restored.`;
        adjustErr.style.display = "block";
        applyRuleDiscount(); return;
      }
      const pct = ((base - newP) / base) * 100;
      adjustOk.textContent = `✓ New price: ${newP.toFixed(2)} (${pct.toFixed(1)}% discount)`;
      adjustOk.style.display = "block";
      applyToReact(newP);
    });

    adjustInput.addEventListener("keydown", e => e.stopPropagation());
    adjustInput.addEventListener("keyup", e => e.stopPropagation());

    // PIN approve
    async function doApprove() {
      const pin = pinInput.value.trim();
      if (!pin) { pinInput.focus(); return; }
      pinOk.textContent = "..."; pinOk.disabled = true;
      pinErr.style.display = "none";
      const res = await apiFetch("discount.api.validate_supervisor_pin", { pin });
      if (res?.valid) {
        pinApproved = true;
        pinArea.style.display = "none";
        chk.checked = true;
        fields.style.display = "block";
        pinInput.value = "";
        applyRuleDiscount();
      } else {
        pinErr.textContent = res?.message || "Invalid PIN.";
        pinErr.style.display = "block";
        pinInput.value = "";
        pinInput.focus();
      }
      pinOk.textContent = "Approve"; pinOk.disabled = false;
    }

    pinOk.onclick = doApprove;
    pinCancel.onclick = () => { pinArea.style.display = "none"; chk.checked = false; pinInput.value = ""; pinErr.style.display = "none"; };
    pinInput.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); doApprove(); } });
    pinInput.addEventListener("keyup", e => e.stopPropagation());

    // Checkbox
    chk.addEventListener("change", () => {
      if (!chk.checked) {
        pinArea.style.display = "none";
        fields.style.display = "none";
        pinApproved = false;
        pinInput.value = "";
        // Restore original price
        if (ruleData) {
          const base = window.__ha_selected_item?.price || window.__ha_selected_item?.standard_rate || getBase();
          applyToReact(parseFloat(base));
        }
        return;
      }
      if (pinApproved) { fields.style.display = "block"; applyRuleDiscount(); return; }
      chk.checked = false;
      pinArea.style.display = "block";
      setTimeout(() => pinInput.focus(), 50);
    });

    // Load pricing rule
    async function loadRule() {
      const code = window.__ha_selected_item_code;
      const res = code ? await apiFetch("discount.api.get_item_discount", { item_code: code }) : null;
      if (!res || !res.has_discount) {
        noRule.style.display = "block";
        chk.disabled = true;
        chk.style.cssText = "width:16px;height:16px;opacity:0.4;cursor:not-allowed;pointer-events:none;";
        const lbl = section.querySelector("label[for='ha-disc-chk']");
        if (lbl) lbl.style.cssText = "font-size:0.875rem;font-weight:600;color:#9ca3af;cursor:not-allowed;user-select:none;pointer-events:none;";
        return;
      }
      ruleData = res;
      if (res.rule_name) { badge.textContent = res.rule_name; badge.style.display = "inline"; }

      // Build rule info text
      let info = [];
      if (res.rate_or_discount === "Discount Amount") {
        info.push(`Discount: ${res.discount_amount} off`);
      } else {
        info.push(`Discount: ${res.discount_value}%`);
      }
      if (res.max_discount > 0) info.push(`Max: ${res.max_discount}%`);
      if (res.min_qty > 0) info.push(`Min qty: ${res.min_qty}`);
      if (res.max_qty > 0) info.push(`Max qty: ${res.max_qty}`);
      if (res.min_amt > 0) info.push(`Min amount: ${res.min_amt}`);
      if (res.max_amt > 0) info.push(`Max amount: ${res.max_amt}`);
      ruleInfo.textContent = info.join(" | ");
      ruleInfo.style.display = "block";
    }
    loadRule();
  }


  // ════════════════════════════
  // 5. WATCH FOR DIALOG
  // ════════════════════════════
  function watchForDialog() {
    if (!settings.allow_discount) return;

    // MutationObserver — catches dialog regardless of event timing
    const observer = new MutationObserver(() => {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      const dialog = dialogs.find(d => d.style.pointerEvents === "auto") || dialogs[dialogs.length - 1];
      if (!dialog || dialog.querySelector(".ha-discount-section")) return;
      const pl = [...dialog.querySelectorAll("label")].find(l => l.textContent.trim() === "Price");
      if (!pl) return;
      // Grab item code from event detail if available, else from dialog heading
      // Get item code from dialog title
      const heading = dialog.querySelector("[data-slot='dialog-title'], h2, .text-lg.font-semibold, .font-semibold");
      if (heading) {
        const itemName = heading.textContent.trim();
        if (itemName) window.__ha_selected_item_code = itemName;
      }
      // Also try from window.__ha_selected_item
      if (window.__ha_selected_item) {
        window.__ha_selected_item_code = window.__ha_selected_item.item_code || window.__ha_selected_item.name || window.__ha_selected_item_code;
      }
      injectDiscountIntoDialog(dialog);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Also keep event listener for item_code capture
    window.addEventListener("ha:cart-dialog-open", (e) => {
      if (e.detail?.item) window.__ha_selected_item_code = e.detail.item.item_code || e.detail.item.name || "";
    });
    window.addEventListener("ha:cart-dialog-close", () => {
      document.querySelectorAll(".ha-discount-section").forEach(el => el.remove());
    });
  }

  // ════════════════════════════
  // 6. ROUTE WATCHER
  // ════════════════════════════
  function watchRoutes() {
    let last = location.pathname;
    setInterval(() => {
      if (location.pathname !== last) {
        last = location.pathname;
        setTimeout(() => { injectLaybyButton(); injectReceiptButton(); }, 1200);
      }
    }, 300);
  }

  // ════════════════════════════
  // BOOT
  // ════════════════════════════
  async function boot() {
    await getSettings();
    console.log("[Discount App] Settings loaded:", settings);
    waitFor("#root > *", () => {
      setTimeout(() => {
        injectLaybyButton();
        injectReceiptButton();
        watchForDialog();
        watchRoutes();
      }, 1500);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
