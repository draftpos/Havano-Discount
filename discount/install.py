import frappe

def after_install():
    """Add discount/layby/receipts fields to HA POS Settings when discount app is installed"""
    add_ha_pos_settings_fields()
    frappe.db.commit()

def add_ha_pos_settings_fields():
    import json, os

    json_path = frappe.get_app_path(
        "havano_restaurant_pos",
        "havano_restaurant_pos", "doctype", "ha_pos_settings", "ha_pos_settings.json"
    )

    if not os.path.exists(json_path):
        frappe.log_error("HA POS Settings JSON not found", "Discount Install")
        return

    with open(json_path, "r") as f:
        doc = json.load(f)

    existing = {field["fieldname"] for field in doc["fields"]}
    existing_order = set(doc.get("field_order", []))

    FIELDS = [
        {
            "default": "0",
            "fieldname": "allow_discount",
            "fieldtype": "Check",
            "label": "Allow Discount",
            "description": "Enable discount feature in cart item edit dialog. Requires Discount app."
        },
        {
            "default": "0",
            "fieldname": "allow_layby",
            "fieldtype": "Check",
            "label": "Allow Layby",
            "description": "Enable Layby button in POS. Requires Discount app."
        },
        {
            "default": "0",
            "fieldname": "allow_receipts",
            "fieldtype": "Check",
            "label": "Allow Receipts",
            "description": "Enable Receipt button in POS. Requires Discount app."
        },
        {
            "default": "0",
            "fieldname": "item_view_per_cost_center",
            "fieldtype": "Check",
            "label": "Item View Per Cost Center",
        },
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
        print(f"✓ Added fields to ha_pos_settings.json")

    # Force re-sync fields from JSON into tabDocField, then reload
    try:
        frappe.db.sql("DELETE FROM `tabDocField` WHERE parent='HA POS Settings'")
        frappe.db.commit()
        frappe.reload_doc("havano_restaurant_pos", "doctype", "ha_pos_settings", force=True)
        frappe.clear_cache(doctype="HA POS Settings")
        frappe.db.commit()
        print("✓ HA POS Settings DocType reloaded")
    except Exception as e:
        frappe.log_error(str(e), "Discount Install - reload_doc")

    # Ensure tabSingles has rows for these fields
    defaults = {
        "allow_discount": "0",
        "allow_layby": "0",
        "allow_receipts": "0",
        "item_view_per_cost_center": "0",
    }
    for field, val in defaults.items():
        existing_row = frappe.db.sql(
            "SELECT value FROM `tabSingles` WHERE doctype=%s AND field=%s",
            ("HA POS Settings", field)
        )
        if not existing_row or existing_row[0][0] is None:
            frappe.db.sql(
                """INSERT INTO `tabSingles` (doctype, field, value)
                   VALUES (%s, %s, %s)
                   ON DUPLICATE KEY UPDATE value=value""",
                ("HA POS Settings", field, val)
            )
            print(f"  Inserted HA POS Settings.{field} = {val}")
