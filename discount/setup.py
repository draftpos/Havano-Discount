import frappe

def after_install():
    """Create default Discount Settings after install."""
    if not frappe.db.exists("Discount Settings", "Discount Settings"):
        doc = frappe.get_doc({
            "doctype": "Discount Settings",
            "enable_discount": 1,
            "allow_item_discount": 1,
            "allow_order_discount": 1,
            "require_supervisor_auth": 0,
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print("Discount Settings created.")

def after_uninstall():
    """Cleanup on uninstall."""
    pass
