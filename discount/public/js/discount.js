
// Discount App - injects discount config into window for POS to use
(function() {
    function loadDiscountConfig() {
        frappe.call({
            method: "discount.api.check_discount_enabled",
            callback: function(r) {
                window.__discount_enabled = r.message && r.message.enabled ? true : false;
            }
        });
    }
    frappe.after_ajax(function() {
        loadDiscountConfig();
    });
})();
