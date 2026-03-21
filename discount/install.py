import frappe
import os

def after_install():
    setup_ha_discount_settings()
    patch_pos_dashboard()
    frappe.db.commit()

def setup_ha_discount_settings():
    try:
        frappe.reload_doc("discount", "doctype", "ha_discount_settings", force=True)
        frappe.reload_doc("discount", "doctype", "ha_layby_transaction", force=True)
        frappe.reload_doc("discount", "doctype", "ha_receipt_transaction", force=True)
        # Force enable all features on install
        defaults = {
            "allow_discount": "1",
            "allow_layby": "1",
            "allow_receipts": "1",
            "require_pin_for_discount": "1",
            "min_discount_pct": "0",
            "max_discount_pct": "100",
        }
        for field, val in defaults.items():
            frappe.db.sql(
                """INSERT INTO `tabSingles` (doctype, field, value)
                   VALUES (%s, %s, %s)
                   ON DUPLICATE KEY UPDATE value=VALUES(value)""",
                ("HA Discount Settings", field, val)
            )
        frappe.db.commit()
        print("✓ HA Discount Settings initialized")
    except Exception as e:
        frappe.log_error(str(e), "Discount Install - setup")

def patch_pos_dashboard():
    try:
        www_path = frappe.get_app_path("havano_restaurant_pos", "www", "dashboard.html")
        if not os.path.exists(www_path):
            print("POS dashboard.html not found")
            return
        with open(www_path, "r") as f:
            content = f.read()
        script_tag = '<script src="/assets/discount/js/discount.bundle.js" onerror="this.remove()"></script>'
        if script_tag in content:
            print("✓ POS dashboard already patched")
            return
        if "</body>" in content:
            content = content.replace("</body>", f"    {script_tag}\n  </body>")
            with open(www_path, "w") as f:
                f.write(content)
            print("✓ POS dashboard patched")
        # Also patch vite source
        vite_index = os.path.join(
            frappe.get_app_path("havano_restaurant_pos"), "..", "dashboard", "index.html"
        )
        if os.path.exists(vite_index):
            with open(vite_index, "r") as f:
                vc = f.read()
            if script_tag not in vc:
                vc = vc.replace("</body>", f"    {script_tag}\n  </body>")
                with open(vite_index, "w") as f:
                    f.write(vc)
                print("✓ Vite index.html patched")
    except Exception as e:
        frappe.log_error(str(e), "Discount Install - patch")
        print(f"Warning: {e}")
