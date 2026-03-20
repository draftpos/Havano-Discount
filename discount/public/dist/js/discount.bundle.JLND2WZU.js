(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };

  // ../discount/discount/public/js/discount.bundle.js
  (function() {
    "use strict";
    if (!window.location.pathname.includes("/dashboard"))
      return;
    let settings = {};
    async function apiFetch(method, args) {
      var _a;
      const params = new URLSearchParams(__spreadValues({ cmd: method }, args));
      try {
        const r = await fetch("/api/method/" + method, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Frappe-CSRF-Token": getCsrfFromMeta() },
          body: params
        });
        const data = await r.json();
        return (_a = data == null ? void 0 : data.message) != null ? _a : data;
      } catch (e) {
        return null;
      }
    }
    function getCsrf() {
      var _a;
      return window.csrf_token || window.__csrf_token || ((_a = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("csrf_token="))) == null ? void 0 : _a.split("=")[1]) || "";
    }
    function getCsrfFromMeta() {
      var _a;
      return ((_a = document.querySelector('meta[name="csrf-token"]')) == null ? void 0 : _a.getAttribute("content")) || getCsrf();
    }
    async function getSettings() {
      const data = await apiFetch("havano_restaurant_pos.api.get_ha_pos_settings", {});
      settings = (data == null ? void 0 : data.data) || {};
      return settings;
    }
    function waitFor(selector, cb, retries = 50) {
      const el = document.querySelector(selector);
      if (el) {
        cb(el);
        return;
      }
      if (retries > 0)
        setTimeout(() => waitFor(selector, cb, retries - 1), 400);
    }
    function injectLaybyButton() {
      if (!settings.allow_layby)
        return;
      if (document.querySelector(".ha-layby-btn"))
        return;
      const tryInject = (retries = 30) => {
        const labels = [...document.querySelectorAll("label.cursor-pointer")];
        const takeaway = labels.find((l) => l.textContent.trim().includes("Take Away"));
        if (!takeaway) {
          if (retries > 0)
            setTimeout(() => tryInject(retries - 1), 500);
          return;
        }
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
    function injectReceiptButton() {
      if (!settings.allow_receipts)
        return;
      if (document.querySelector(".ha-receipt-btn"))
        return;
      const tryInject = (retries = 30) => {
        const anchor = document.querySelector(".ha-layby-btn") || [...document.querySelectorAll("label.cursor-pointer")].find((l) => l.textContent.trim().includes("Take Away"));
        if (!anchor) {
          if (retries > 0)
            setTimeout(() => tryInject(retries - 1), 500);
          return;
        }
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
    function openReceiptModal() {
      if (document.getElementById("ha-receipt-modal"))
        return;
      const modal = document.createElement("div");
      modal.id = "ha-receipt-modal";
      modal.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);";
      modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:460px;margin:16px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.3);">
        <div style="background:#4b5563;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;">
          <h2 style="color:#fff;font-size:1.1rem;font-weight:700;margin:0;">Make Payment</h2>
          <button id="ha-r-close" style="color:#fff;background:none;border:none;font-size:1.5rem;cursor:pointer;">\xD7</button>
        </div>
        <div style="padding:24px;display:flex;flex-direction:column;gap:14px;">
          <div>
            <label style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:4px;">Payment Date *</label>
            <input id="ha-r-date" type="date" value="${new Date().toISOString().split("T")[0]}"
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
      apiFetch("discount.api.get_cash_bank_accounts", {}).then((r) => {
        allAccounts = r || [];
      });
      async function loadCustomers(q) {
        const args = { doctype: "Customer", fields: JSON.stringify(["name", "customer_name"]), limit_page_length: 50 };
        if (q && q.length > 1)
          args.filters = JSON.stringify([["customer_name", "like", "%" + q + "%"]]);
        const r = await apiFetch("frappe.client.get_list", args);
        const customers = Array.isArray(r) ? r : [];
        const list = document.getElementById("ha-r-cust-list");
        list.innerHTML = customers.length === 0 ? `<p style="padding:12px 16px;font-size:0.875rem;color:#9ca3af;">No customers found</p>` : customers.map((c) => `<button type="button" data-name="${c.name}" data-label="${c.customer_name}"
              style="display:block;width:100%;text-align:left;padding:10px 16px;font-size:0.875rem;border:none;border-bottom:1px solid #f3f4f6;background:#fff;cursor:pointer;"
              onmouseenter="this.style.background='#f3f4f6'" onmouseleave="this.style.background='#fff'">
              ${c.customer_name}</button>`).join("");
        list.style.display = "block";
        list.querySelectorAll("button[data-name]").forEach((btn) => {
          btn.onclick = () => {
            selCustomer = btn.dataset.name;
            selCustomerName = btn.dataset.label;
            document.getElementById("ha-r-cust-input").value = selCustomerName;
            list.style.display = "none";
            apiFetch("discount.api.get_customer_outstanding", { customer: selCustomer }).then((res) => {
              document.getElementById("ha-r-balance").value = parseFloat((res == null ? void 0 : res.outstanding) || 0).toFixed(2);
            });
          };
        });
      }
      function renderAccounts(q) {
        const list = document.getElementById("ha-r-acct-list");
        const filtered = q ? allAccounts.filter((a) => a.name.toLowerCase().includes(q.toLowerCase())) : allAccounts;
        list.innerHTML = filtered.map((a) => `<button type="button" data-name="${a.name}"
          style="display:block;width:100%;text-align:left;padding:8px 12px;font-size:0.875rem;border:none;border-bottom:1px solid #f3f4f6;background:#fff;cursor:pointer;"
          onmouseenter="this.style.background='#f3f4f6'" onmouseleave="this.style.background='#fff'">
          ${a.name}<span style="font-size:0.75rem;color:#9ca3af;margin-left:8px;">${a.account_type}</span>
        </button>`).join("");
        list.style.display = filtered.length ? "block" : "none";
        list.querySelectorAll("button[data-name]").forEach((btn) => {
          btn.onclick = () => {
            selAccount = btn.dataset.name;
            document.getElementById("ha-r-acct-input").value = selAccount;
            list.style.display = "none";
          };
        });
      }
      document.getElementById("ha-r-cust-input").addEventListener("focus", () => loadCustomers(""));
      document.getElementById("ha-r-cust-input").addEventListener("input", (e) => loadCustomers(e.target.value));
      document.getElementById("ha-r-acct-input").addEventListener("focus", () => renderAccounts(""));
      document.getElementById("ha-r-acct-input").addEventListener("input", (e) => renderAccounts(e.target.value));
      const close = () => modal.remove();
      document.getElementById("ha-r-close").onclick = close;
      document.getElementById("ha-r-cancel").onclick = close;
      modal.onclick = (e) => {
        if (e.target === modal)
          close();
      };
      document.getElementById("ha-r-save").onclick = async () => {
        const date = document.getElementById("ha-r-date").value;
        const amount = document.getElementById("ha-r-amount").value;
        if (!selCustomer || !selAccount || !amount) {
          alert("Please fill in Customer, Account Paid To and Amount Paid.");
          return;
        }
        const btn = document.getElementById("ha-r-save");
        btn.textContent = "Saving...";
        btn.disabled = true;
        const res = await apiFetch("discount.api.create_layby_payment", {
          sales_order: "",
          paid_to: selAccount,
          paid_amount: amount,
          mode_of_payment: "Cash",
          posting_date: date,
          customer: selCustomer,
          remarks: "Receipt payment",
          is_receipt: 1
        });
        if (res == null ? void 0 : res.success) {
          const receipt = {
            CompanyName: "",
            InvoiceNo: res.payment_entry,
            InvoiceDate: date,
            CashierName: "",
            CustomerName: selCustomerName || selCustomer,
            CustomerContact: selCustomerName || "",
            CustomerTradeName: null,
            CustomerEmail: null,
            CustomerTIN: null,
            CustomerVAT: null,
            Customeraddress: null,
            itemlist: [],
            AmountTendered: String(amount),
            Change: 0,
            Currency: "USD",
            Footer: "Thank you for your payment!",
            MultiCurrencyDetails: [{ Key: "USD", Value: parseFloat(amount) }],
            DeviceID: "",
            DeviceSerial: "",
            FiscalDay: "",
            ReceiptNo: "",
            CustomerRef: "None",
            VCode: "",
            QRCode: "",
            DiscAmt: "0.0",
            Subtotal: parseFloat(amount),
            TotalVat: "0.0",
            GrandTotal: parseFloat(amount),
            TaxType: "Standard VAT",
            PaymentMode: "Cash",
            ReceiptType: "receipt"
          };
          const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "Receipt-" + res.payment_entry + ".txt";
          a.click();
          URL.revokeObjectURL(url);
          alert("Payment created successfully!");
          close();
        } else {
          alert("Error: " + ((res == null ? void 0 : res.message) || "Failed to save receipt"));
          btn.textContent = "Create Payment";
          btn.disabled = false;
        }
      };
    }
    function injectDiscountIntoDialog(dialogEl) {
      if (!settings.allow_discount)
        return;
      if (dialogEl.querySelector(".ha-discount-section"))
        return;
      const priceLabel = [...dialogEl.querySelectorAll("label")].find((l) => l.textContent.trim() === "Price");
      if (!priceLabel)
        return;
      const priceContainer = priceLabel.closest("div");
      if (!priceContainer)
        return;
      const priceInput = priceContainer.querySelector("input");
      const section = document.createElement("div");
      section.className = "ha-discount-section";
      section.style.cssText = "margin-top:12px;";
      section.innerHTML = `
      <label style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:6px;color:#374151;">Discount</label>
      <div style="display:flex;gap:8px;align-items:flex-end;">
        <div style="flex:1;">
          <label style="font-size:0.75rem;color:#6b7280;margin-bottom:2px;display:block;">Amount (\u2212)</label>
          <input id="ha-disc-amount" type="number" step="0.01" min="0" placeholder="0.00"
            style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 10px;font-size:0.875rem;box-sizing:border-box;"/>
        </div>
        <div style="padding-bottom:10px;color:#9ca3af;font-weight:600;">or</div>
        <div style="flex:1;">
          <label style="font-size:0.75rem;color:#6b7280;margin-bottom:2px;display:block;">Percentage (%)</label>
          <input id="ha-disc-pct" type="number" step="0.01" min="0" max="100" placeholder="0"
            style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 10px;font-size:0.875rem;box-sizing:border-box;"/>
        </div>
      </div>
      <div id="ha-disc-preview" style="margin-top:6px;font-size:0.8rem;color:#059669;display:none;">
        New price: <strong id="ha-disc-new-price"></strong>
      </div>
      <div id="ha-disc-error" style="margin-top:4px;font-size:0.8rem;color:#dc2626;display:none;"></div>`;
      priceContainer.after(section);
      const amtInput = section.querySelector("#ha-disc-amount");
      const pctInput = section.querySelector("#ha-disc-pct");
      const preview = section.querySelector("#ha-disc-preview");
      const newPriceEl = section.querySelector("#ha-disc-new-price");
      const errorEl = section.querySelector("#ha-disc-error");
      function getBase() {
        return parseFloat((priceInput == null ? void 0 : priceInput.value) || 0);
      }
      function updatePreview(newPrice) {
        if (newPrice < 0) {
          errorEl.textContent = "Discount cannot exceed item price.";
          errorEl.style.display = "block";
          preview.style.display = "none";
          return false;
        }
        errorEl.style.display = "none";
        newPriceEl.textContent = newPrice.toFixed(2);
        preview.style.display = "block";
        return true;
      }
      function applyToReact(newPrice) {
        if (newPrice < 0 || !priceInput)
          return;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(priceInput, newPrice.toFixed(2));
        priceInput.dispatchEvent(new Event("input", { bubbles: true }));
        priceInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      amtInput.addEventListener("input", () => {
        const base = getBase(), amt = parseFloat(amtInput.value || 0);
        if (base > 0) {
          pctInput.value = (amt / base * 100).toFixed(2);
          updatePreview(base - amt);
          applyToReact(base - amt);
        }
      });
      pctInput.addEventListener("input", () => {
        const base = getBase(), pct = parseFloat(pctInput.value || 0);
        if (base > 0) {
          const d = pct / 100 * base;
          amtInput.value = d.toFixed(2);
          updatePreview(base - d);
          applyToReact(base - d);
        }
      });
    }
    function watchForDialog() {
      if (!settings.allow_discount)
        return;
      const observer = new MutationObserver(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog && dialog.offsetParent !== null) {
          injectDiscountIntoDialog(dialog);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    function watchRoutes() {
      let last = location.pathname;
      setInterval(() => {
        if (location.pathname !== last) {
          last = location.pathname;
          setTimeout(() => {
            injectLaybyButton();
            injectReceiptButton();
          }, 1200);
        }
      }, 300);
    }
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
})();
//# sourceMappingURL=discount.bundle.JLND2WZU.js.map
