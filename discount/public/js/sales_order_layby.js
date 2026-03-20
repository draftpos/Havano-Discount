
frappe.ui.form.on("Sales Order", {
    onload: function(frm) {
        if (sessionStorage.getItem("layby_pending") !== "1") return;
        // Force edit mode
        if (frm.is_new()) {
            frm.enable_save();
            frm.set_intro("Fill in the details and click Save & Process Payment", "blue");
        }
    },

    refresh: function(frm) {
        if (sessionStorage.getItem("layby_pending") !== "1") return;

        // Force form into edit mode
        frm.enable_save();

        // Remove the print-only button and add proper action buttons
        if (frm.is_new()) {
            frm.add_custom_button("Save & Process Payment", function() {
                frm.save("Save", function() {
                    showPaymentDialog(frm);
                });
            }).addClass("btn-primary").css({
                "background-color": "#ff5722",
                "color": "white",
                "font-weight": "bold"
            });
        } else {
            // Already saved, show payment dialog
            frm.add_custom_button("Process Layby Payment", function() {
                showPaymentDialog(frm);
            }).addClass("btn-primary").css({
                "background-color": "#ff5722",
                "color": "white",
                "font-weight": "bold"
            });
        }
    }
});

function showPaymentDialog(frm) {
    var grand_total = frm.doc.grand_total || 0;
    var currency = frm.doc.currency || "USD";

    var d = new frappe.ui.Dialog({
        title: "Process Layby Payment",
        fields: [
            {
                label: "Total Amount",
                fieldname: "total_amount",
                fieldtype: "Currency",
                default: grand_total,
                read_only: 1
            },
            {
                label: "Payment Mode",
                fieldname: "payment_mode",
                fieldtype: "Select",
                options: "Cash\nCard\nMobile Money\nBank Transfer",
                default: "Cash",
                reqd: 1
            },
            {
                label: "Deposit Amount (Initial Payment)",
                fieldname: "deposit_amount",
                fieldtype: "Currency",
                reqd: 1,
                description: "Amount paid now as deposit"
            },
            {
                label: "Balance Due",
                fieldname: "balance_due",
                fieldtype: "Currency",
                read_only: 1,
                default: grand_total
            },
            {
                label: "Notes",
                fieldname: "notes",
                fieldtype: "Small Text",
                placeholder: "Any additional notes..."
            }
        ],
        primary_action_label: "Confirm & Download Receipt",
        primary_action: function(values) {
            var balance = (grand_total - (values.deposit_amount || 0));
            d.hide();
            downloadLaybyReceipt(frm, values, balance);
        }
    });

    // Auto calculate balance when deposit changes
    d.fields_dict.deposit_amount.df.onchange = function() {
        var deposit = d.get_value("deposit_amount") || 0;
        var balance = grand_total - deposit;
        d.set_value("balance_due", balance < 0 ? 0 : balance);
    };

    d.show();
}

function downloadLaybyReceipt(frm, payment, balance) {
    var items = frm.doc.items || [];
    var lines = [
        "=============================",
        "         LAYBY RECEIPT       ",
        "=============================",
        "Order     : " + frm.doc.name,
        "Date      : " + frm.doc.transaction_date,
        "Customer  : " + (frm.doc.customer_name || frm.doc.customer || "Walk-in"),
        "-----------------------------",
        "ITEMS:",
    ];

    items.forEach(function(item) {
        lines.push("  " + item.item_name + " x" + item.qty + "  @  " + item.rate + "  =  " + item.amount);
    });

    lines = lines.concat([
        "-----------------------------",
        "SUBTOTAL  : " + frm.doc.currency + " " + frm.doc.total,
        "TOTAL     : " + frm.doc.currency + " " + frm.doc.grand_total,
        "-----------------------------",
        "PAYMENT   : " + payment.payment_mode,
        "DEPOSIT   : " + frm.doc.currency + " " + (payment.deposit_amount || 0),
        "BALANCE   : " + frm.doc.currency + " " + balance,
        "-----------------------------",
        payment.notes ? "NOTES: " + payment.notes : "",
        "=============================",
        "  Thank you for your Layby!  ",
        "  Please keep this receipt.  ",
        "=============================",
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

    frappe.show_alert({ message: "Layby receipt downloaded! Closing tab...", indicator: "green" }, 3);
    setTimeout(function() { window.close(); }, 2500);
}
