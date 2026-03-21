import frappe
import os

def after_install():
    """Run after discount app is installed"""
    setup_ha_discount_settings()
    patch_pos_dashboard()
    frappe.db.commit()

def setup_ha_discount_settings():
    """Create default HA Discount Settings"""
    try:
        frappe.reload_doc("discount", "doctype", "ha_discount_settings", force=True)
        frappe.reload_doc("discount", "doctype", "ha_layby_transaction", force=True)
        frappe.reload_doc("discount", "doctype", "ha_receipt_transaction", force=True)
        defaults = {
            "allow_discount": "0",
            "allow_layby": "0",
            "allow_receipts": "0",
            "require_pin_for_discount": "1",
            "min_discount_pct": "0",
            "max_discount_pct": "100",
        }
        for field, val in defaults.items():
            existing = frappe.db.sql(
                "SELECT value FROM `tabSingles` WHERE doctype=%s AND field=%s",
                ("HA Discount Settings", field)
            )
            if not existing or existing[0][0] is None:
                frappe.db.sql(
                    "INSERT INTO `tabSingles` (doctype, field, value) VALUES (%s,%s,%s) ON DUPLICATE KEY UPDATE value=value",
                    ("HA Discount Settings", field, val)
                )
        print("✓ HA Discount Settings initialized")
    except Exception as e:
        frappe.log_error(str(e), "Discount Install - setup")

def patch_pos_dashboard():
    """
    Inject discount bundle script tag into the POS dashboard HTML.
    Works with Havano Restaurant POS app.
    The script tag uses onerror to silently fail if discount app is uninstalled.
    """
    try:
        # Find the dashboard HTML in havano_restaurant_pos
        www_path = frappe.get_app_path("havano_restaurant_pos", "www", "dashboard.html")
        if not os.path.exists(www_path):
            print("POS dashboard.html not found — skipping patch")
            return

        with open(www_path, "r") as f:
            content = f.read()

        script_tag = '<script src="/assets/discount/js/discount.bundle.js" onerror="this.remove()"></script>'

        if script_tag in content:
            print("✓ POS dashboard already patched")
            return

        # Inject before </body>
        if "</body>" in content:
            content = content.replace("</body>", f"    {script_tag}\n  </body>")
            with open(www_path, "w") as f:
                f.write(content)
            print("✓ POS dashboard patched with discount bundle")

            # Also patch the vite source index.html so it survives npm builds
            vite_index = frappe.get_app_path(
                "havano_restaurant_pos", "..", "dashboard", "index.html"
            )
            if os.path.exists(vite_index):
                with open(vite_index, "r") as f:
                    vite_content = f.read()
                if script_tag not in vite_content:
                    vite_content = vite_content.replace("</body>", f"    {script_tag}\n  </body>")
                    with open(vite_index, "w") as f:
                        f.write(vite_content)
                    print("✓ Vite index.html patched")
        else:
            print("Could not find </body> in dashboard.html")

    except Exception as e:
        frappe.log_error(str(e), "Discount Install - patch_pos_dashboard")
        print(f"Warning: Could not patch POS dashboard: {e}")
