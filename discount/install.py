import frappe

def after_install():
    """Run after discount app is installed"""
    setup_ha_discount_settings()
    add_ha_pos_settings_fields()
    frappe.db.commit()

def setup_ha_discount_settings():
    """Create default HA Discount Settings if not exists"""
    try:
        frappe.reload_doc("discount", "doctype", "ha_discount_settings", force=True)
        frappe.reload_doc("discount", "doctype", "ha_layby_transaction", force=True)
        frappe.reload_doc("discount", "doctype", "ha_receipt_transaction", force=True)
        # Insert defaults into tabSingles
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
                    "INSERT INTO `tabSingles` (doctype, field, value) VALUES (%s, %s, %s) ON DUPLICATE KEY UPDATE value=value",
                    ("HA Discount Settings", field, val)
                )
        print("✓ HA Discount Settings initialized")
    except Exception as e:
        frappe.log_error(str(e), "Discount Install - setup_ha_discount_settings")

def add_ha_pos_settings_fields():
    """Add allow_discount field to HA POS Settings if restaurant app is installed"""
    import json, os
    try:
        json_path = frappe.get_app_path(
            "havano_restaurant_pos",
            "havano_restaurant_pos", "doctype", "ha_pos_settings", "ha_pos_settings.json"
        )
        if not os.path.exists(json_path):
            return
        with open(json_path, "r") as f:
            doc = json.load(f)
        existing = {field["fieldname"] for field in doc["fields"]}
        existing_order = set(doc.get("field_order", []))
        FIELDS = [
            {"default": "0", "fieldname": "allow_discount", "fieldtype": "Check",
             "label": "Allow Discount", "description": "Requires Discount app."},
        ]
        changed = False
        for field_def in FIELDS:
            fname = field_def["fieldname"]
            if fname not in existing:
                doc["fields"].append(field_def)
                existing.add(fname)
                changed = True
            if fname not in existing_order:
                doc["field_order"].append(fname)
                existing_order.add(fname)
                changed = True
        if changed:
            with open(json_path, "w") as f:
                json.dump(doc, f, indent=1, ensure_ascii=False)
                f.write("\n")
        frappe.db.sql("DELETE FROM `tabDocField` WHERE parent='HA POS Settings'")
        frappe.db.commit()
        frappe.reload_doc("havano_restaurant_pos", "doctype", "ha_pos_settings", force=True)
        frappe.clear_cache(doctype="HA POS Settings")
        frappe.db.commit()
        print("✓ HA POS Settings updated")
    except Exception as e:
        frappe.log_error(str(e), "Discount Install - add_ha_pos_settings_fields")
