import frappe
import os

def after_install():
    """Called after app is installed - enable all features automatically"""
    try:
        # Wait for DocTypes to be ready then enable everything
        enable_all_features()
        patch_pos_dashboard()
        frappe.db.commit()
    except Exception as e:
        frappe.log_error(str(e), "Discount Install Error")

def enable_all_features():
    """Force enable all discount features after install"""
    try:
        frappe.reload_doc("discount", "doctype", "ha_discount_settings", force=True)
        frappe.reload_doc("discount", "doctype", "ha_layby_transaction", force=True)
        frappe.reload_doc("discount", "doctype", "ha_receipt_transaction", force=True)
        frappe.db.commit()

        # Use frappe.db.set_value for Single DocType — most reliable method
        settings_values = {
            "allow_discount": 1,
            "allow_layby": 1,
            "allow_receipts": 1,
            "require_pin_for_discount": 1,
            "min_discount_pct": 0,
            "max_discount_pct": 100,
        }

        for field, value in settings_values.items():
            frappe.db.set_value("HA Discount Settings", "HA Discount Settings", field, value)

        frappe.db.commit()
        frappe.clear_cache(doctype="HA Discount Settings")
        print("✓ HA Discount Settings: all features enabled")
    except Exception as e:
        # Fallback: direct SQL
        try:
            for field, value in {
                "allow_discount": "1",
                "allow_layby": "1",
                "allow_receipts": "1",
                "require_pin_for_discount": "1",
                "min_discount_pct": "0",
                "max_discount_pct": "100",
            }.items():
                frappe.db.sql(
                    "INSERT INTO `tabSingles` (doctype, field, value) VALUES (%s,%s,%s) ON DUPLICATE KEY UPDATE value=VALUES(value)",
                    ("HA Discount Settings", field, value)
                )
            frappe.db.commit()
            print("✓ HA Discount Settings: enabled via SQL fallback")
        except Exception as e2:
            frappe.log_error(str(e2), "Discount Install SQL Fallback Error")

def patch_pos_dashboard():
    """Inject discount bundle into POS dashboard HTML"""
    try:
        www_path = frappe.get_app_path("havano_restaurant_pos", "www", "dashboard.html")
        if not os.path.exists(www_path):
            print("POS dashboard.html not found - skipping patch")
            return

        with open(www_path, "r") as f:
            content = f.read()

        script_tag = '<script src="/assets/discount/js/discount.bundle.js" onerror="this.remove()"></script>'

        if script_tag in content:
            print("✓ POS dashboard already patched")
        else:
            content = content.replace("</body>", f"    {script_tag}\n  </body>")
            with open(www_path, "w") as f:
                f.write(content)
            print("✓ POS dashboard patched")

        # Also patch vite source index.html
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
        frappe.log_error(str(e), "Discount Install - patch_pos_dashboard")
        print(f"Warning: Could not patch POS dashboard: {e}")
