(() => {
  // ../discount/discount/public/js/pos_extend.js
  console.log("\u{1F680} Test Layby extension loading...");
  $(document).on("frappe-ready", function() {
    console.log("\u{1F4F1} Frappe ready event fired");
    function addButton() {
      console.log("\u{1F50D} Looking for takeaway button...");
      var takeaway = $('[data-mode="takeaway"]');
      console.log("Takeaway button found:", takeaway.length);
      if (takeaway.length > 0 && !$(".test-layby").length) {
        console.log("\u2705 Adding test button");
        var btn = $('<button class="btn btn-success test-layby" style="margin-left:10px">TEST LAYBY</button>');
        takeaway.after(btn);
        btn.click(function() {
          alert("Test button works!");
        });
        console.log("\u2705 Test button added");
      } else {
        console.log("\u23F0 Retrying in 2 seconds...");
        setTimeout(addButton, 2e3);
      }
    }
    setTimeout(addButton, 3e3);
  });
  console.log("\u2705 Test extension loaded");

  // ../discount/discount/public/js/discount.bundle.js
  frappe.ui.form.on("Sales Order", {
    onload: function(frm) {
      if (sessionStorage.getItem("layby_pending") !== "1")
        return;
      frm.enable_save();
      frm.set_intro("Fill in the Layby details then click Save & Process Payment", "blue");
    },
    refresh: function(frm) {
      if (sessionStorage.getItem("layby_pending") !== "1")
        return;
      frm.enable_save();
      var btnLabel = frm.is_new() ? "Save & Process Payment" : "Process Layby Payment";
      frm.add_custom_button(btnLabel, function() {
        if (frm.is_new()) {
          frm.save("Save", function() {
            showLaybyPayment(frm);
          });
        } else {
          showLaybyPayment(frm);
        }
      }).addClass("btn-primary").css({ "background": "#e65100", "color": "white", "font-weight": "bold" });
    }
  });
  function showLaybyPayment(frm) {
    var grand_total = frm.doc.grand_total || 0;
    var d = new frappe.ui.Dialog({
      title: "Process Layby Payment",
      fields: [
        { label: "Total Amount", fieldname: "total_amount", fieldtype: "Currency", default: grand_total, read_only: 1 },
        { label: "Payment Mode", fieldname: "payment_mode", fieldtype: "Select", options: "Cash\nCard\nMobile Money\nBank Transfer", default: "Cash", reqd: 1 },
        { label: "Deposit Amount", fieldname: "deposit_amount", fieldtype: "Currency", reqd: 1, description: "Amount paid now as deposit" },
        { label: "Balance Due", fieldname: "balance_due", fieldtype: "Currency", read_only: 1, default: grand_total },
        { label: "Notes", fieldname: "notes", fieldtype: "Small Text" }
      ],
      primary_action_label: "Confirm & Download Receipt",
      primary_action: function(values) {
        var balance = Math.max(0, grand_total - (values.deposit_amount || 0));
        d.hide();
        var items = frm.doc.items || [];
        var lines = [
          "=============================",
          "         LAYBY RECEIPT       ",
          "=============================",
          "Order     : " + frm.doc.name,
          "Date      : " + frm.doc.transaction_date,
          "Customer  : " + (frm.doc.customer_name || frm.doc.customer || "Walk-in"),
          "-----------------------------",
          "ITEMS:"
        ];
        items.forEach(function(i) {
          lines.push("  " + i.item_name + " x" + i.qty + "  @  " + i.rate + "  =  " + i.amount);
        });
        lines = lines.concat([
          "-----------------------------",
          "TOTAL     : " + frm.doc.currency + " " + grand_total,
          "PAYMENT   : " + values.payment_mode,
          "DEPOSIT   : " + frm.doc.currency + " " + (values.deposit_amount || 0),
          "BALANCE   : " + frm.doc.currency + " " + balance,
          values.notes ? "NOTES     : " + values.notes : "",
          "=============================",
          "  Thank you for your Layby!  ",
          "  Please keep this receipt.  ",
          "============================="
        ].filter(Boolean));
        var blob = new Blob([lines.join("\n")], { type: "text/plain" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "Layby-" + frm.doc.name + ".txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        sessionStorage.removeItem("layby_pending");
        frappe.show_alert({ message: "Receipt downloaded! Closing...", indicator: "green" }, 3);
        setTimeout(function() {
          window.close();
        }, 2500);
      }
    });
    d.fields_dict.deposit_amount.$input.on("change", function() {
      var dep = parseFloat(d.get_value("deposit_amount")) || 0;
      d.set_value("balance_due", Math.max(0, grand_total - dep));
    });
    d.show();
  }
})();
//# sourceMappingURL=discount.bundle.XRUFLQAZ.js.map
