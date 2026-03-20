import frappe
import json
from discount.api.layby import create_layby_sales_order

@frappe.whitelist()
def check_discount_enabled():
    """Check if discount is enabled in POS settings"""
    try:
        val = frappe.db.get_single_value("HA POS Settings", "allow_discount")
        return {"enabled": bool(val)}
    except Exception:
        return {"enabled": True}

@frappe.whitelist()
def get_item_discount(item_code):
    if not item_code:
        return {"has_discount": False}
    try:
        val = frappe.db.get_single_value("HA POS Settings", "allow_discount")
        if not val:
            return {"has_discount": False, "reason": "Discount not enabled"}
    except Exception:
        pass
    today = frappe.utils.today()
    rule = None
    item_rules = frappe.db.sql("""
        SELECT pr.name, pr.title, pr.rate_or_discount, pr.discount_percentage,
               pr.discount_amount, pr.rate, pr.rule_description,
               pr.threshold_percentage, pr.valid_from, pr.valid_upto
        FROM `tabPricing Rule` pr
        INNER JOIN `tabPricing Rule Item Code` pri ON pri.parent = pr.name
        WHERE pr.disable = 0 AND pr.selling = 1
          AND pr.price_or_product_discount = 'Price'
          AND pri.item_code = %(item_code)s
          AND (pr.valid_from IS NULL OR pr.valid_from <= %(today)s)
          AND (pr.valid_upto IS NULL OR pr.valid_upto >= %(today)s)
        ORDER BY pr.priority DESC, pr.creation DESC LIMIT 1
    """, {"item_code": item_code, "today": today}, as_dict=True)
    if item_rules:
        rule = item_rules[0]
        rule["match_type"] = "Item"
    if not rule:
        item_group = frappe.db.get_value("Item", item_code, "item_group")
        if item_group:
            group_rules = frappe.db.sql("""
                SELECT pr.name, pr.title, pr.rate_or_discount, pr.discount_percentage,
                       pr.discount_amount, pr.rate, pr.rule_description,
                       pr.threshold_percentage, pr.valid_from, pr.valid_upto
                FROM `tabPricing Rule` pr
                INNER JOIN `tabPricing Rule Item Group` prig ON prig.parent = pr.name
                WHERE pr.disable = 0 AND pr.selling = 1
                  AND pr.price_or_product_discount = 'Price'
                  AND prig.item_group = %(item_group)s
                  AND (pr.valid_from IS NULL OR pr.valid_from <= %(today)s)
                  AND (pr.valid_upto IS NULL OR pr.valid_upto >= %(today)s)
                ORDER BY pr.priority DESC, pr.creation DESC LIMIT 1
            """, {"item_group": item_group, "today": today}, as_dict=True)
            if group_rules:
                rule = group_rules[0]
                rule["match_type"] = "Item Group"
    if rule:
        rate_or_discount = rule.get("rate_or_discount", "Discount Percentage")
        if rate_or_discount == "Discount Percentage":
            discount_type = "Percentage"
            discount_value = float(rule.get("discount_percentage") or 0)
        elif rate_or_discount == "Discount Amount":
            discount_type = "Fixed Amount"
            discount_value = float(rule.get("discount_amount") or 0)
        else:
            discount_type = "Rate"
            discount_value = float(rule.get("rate") or 0)
        threshold = float(rule.get("threshold_percentage") or 0)
        min_discount = max(0, discount_value - threshold) if threshold else 0
        max_discount = discount_value + threshold if threshold else discount_value
        return {
            "has_discount": True,
            "rule_name": rule.get("title") or rule.get("name"),
            "pricing_rule": rule.get("name"),
            "discount_type": discount_type,
            "discount_value": discount_value,
            "min_discount": min_discount,
            "max_discount": max_discount,
            "description": rule.get("rule_description") or "",
            "match_type": rule.get("match_type"),
            "valid_from": str(rule.get("valid_from") or ""),
            "valid_upto": str(rule.get("valid_upto") or ""),
        }
    return {"has_discount": False, "reason": "No active Pricing Rule found"}

@frappe.whitelist()
def save_discount_log(**kwargs):
    log = {
        "applied_by": frappe.session.user,
        "item_code": kwargs.get("item_code", ""),
        "item_name": kwargs.get("item_name", ""),
        "quantity": float(kwargs.get("quantity", 1) or 1),
        "original_price": float(kwargs.get("original_price", 0) or 0),
        "final_price": float(kwargs.get("final_price", 0) or 0),
        "discount_mode": kwargs.get("discount_mode", ""),
        "discount_amount": float(kwargs.get("discount_amount", 0) or 0),
        "cart_total": float(kwargs.get("cart_total", 0) or 0),
        "grand_total": float(kwargs.get("grand_total", 0) or 0),
        "pricing_rule": kwargs.get("pricing_rule", ""),
    }
    frappe.log_error(json.dumps(log, indent=2), "Discount Applied - " + log["item_name"])
    return {"success": True}

@frappe.whitelist()
def get_discount_settings():
    try:
        val = frappe.db.get_single_value("HA POS Settings", "allow_discount")
        return {
            "enable_discount": bool(val),
            "allow_item_discount": True,
            "allow_order_discount": True,
            "require_supervisor_auth": False,
        }
    except Exception:
        return {
            "enable_discount": False,
            "allow_item_discount": False,
            "allow_order_discount": False,
            "require_supervisor_auth": False,
        }

@frappe.whitelist()
def check_user_discount_permission():
    user = frappe.session.user
    try:
        settings = frappe.get_single("HA POS Settings")
        for row in settings.user_mapping:
            if row.user == user:
                return {
                    "has_permission": bool(row.allow_add_discount),
                    "requires_approval": bool(row.allow_add_discount),
                }
        return {"has_permission": False, "requires_approval": False}
    except Exception:
        return {"has_permission": False, "requires_approval": False}

@frappe.whitelist()
def validate_supervisor_pin(pin):
    if not pin:
        return {"valid": False, "message": "PIN is required"}
    try:
        settings = frappe.get_single("HA POS Settings")
        for row in settings.user_mapping:
            if not row.password:
                continue
            if str(row.password).strip() == str(pin).strip():
                return {"valid": True, "supervisor": row.user, "message": "Approved"}
        return {"valid": False, "message": "Invalid PIN. Please try again."}
    except Exception as e:
        frappe.log_error(str(e), "validate_supervisor_pin error")
        return {"valid": False, "message": str(e)}

@frappe.whitelist()
def create_layby_payment(sales_order, paid_to, paid_amount, mode_of_payment, posting_date, paid_from=None, reference_no="", remarks="", customer=None, is_receipt=0):
    """Create and submit a Payment Entry linked to a Sales Order"""
    import json
    
    if frappe.utils.cint(is_receipt) and customer and not sales_order:
        pe = frappe.get_doc({
            "doctype": "Payment Entry",
            "payment_type": "Receive",
            "posting_date": posting_date,
            "party_type": "Customer",
            "party": customer,
            "paid_from": paid_from or frappe.db.get_value("Company", frappe.defaults.get_user_default("Company"), "default_receivable_account"),
            "paid_to": paid_to,
            "paid_amount": frappe.utils.flt(paid_amount),
            "received_amount": frappe.utils.flt(paid_amount),
            "mode_of_payment": mode_of_payment,
            "reference_no": reference_no,
            "remarks": remarks or "Receipt payment",
        })
        pe.flags.ignore_permissions = True
        pe.insert()
        pe.submit()
        frappe.db.commit()
        return {"success": True, "payment_entry": pe.name}

    so = frappe.get_doc("Sales Order", sales_order)
    paid_amount = float(paid_amount)
    
    # Check already paid
    already_paid = frappe.db.sql("""
        SELECT COALESCE(SUM(per.allocated_amount), 0)
        FROM `tabPayment Entry Reference` per
        INNER JOIN `tabPayment Entry` pe ON pe.name = per.parent
        WHERE per.reference_doctype = 'Sales Order'
        AND per.reference_name = %s
        AND pe.docstatus = 1
    """, sales_order)[0][0] or 0

    if already_paid >= paid_amount:
        return {"success": False, "message": "Payment already exists for this amount"}

    new_payment = paid_amount - already_paid
    outstanding = so.grand_total - already_paid

    pe = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Receive",
        "posting_date": posting_date,
        "party_type": "Customer",
        "party": so.customer,
        "party_name": so.customer_name,
        "paid_from": frappe.db.get_value("Company", so.company, "default_receivable_account"),
        "paid_to": paid_to,
        "paid_amount": new_payment,
        "received_amount": new_payment,
        "mode_of_payment": mode_of_payment,
        "reference_no": reference_no,
        "remarks": remarks or ("Layby payment for " + sales_order),
        "references": [{
            "reference_doctype": "Sales Order",
            "reference_name": sales_order,
            "allocated_amount": new_payment,
            "total_amount": so.grand_total,
            "outstanding_amount": outstanding
        }]
    })
    pe.flags.ignore_permissions = True
    pe.insert()
    pe.submit()
    frappe.db.commit()
    
    return {"success": True, "payment_entry": pe.name}

@frappe.whitelist()
def get_customer_outstanding(customer):
    """Get total outstanding amount for a customer from Sales Orders"""
    result = frappe.db.sql("""
        SELECT COALESCE(SUM(so.grand_total - so.advance_paid), 0) as outstanding
        FROM `tabSales Order` so
        WHERE so.docstatus = 1
        AND so.customer = %s
        AND (so.grand_total - so.advance_paid) > 0
    """, customer, as_dict=True)
    return {"outstanding": float(result[0].outstanding) if result else 0}

@frappe.whitelist()
def get_cash_bank_accounts():
    """Get all Cash and Bank accounts"""
    accounts = frappe.db.sql("""
        SELECT name, account_type, account_currency
        FROM `tabAccount`
        WHERE account_type IN ('Cash', 'Bank')
        AND is_group = 0
        AND company = %s
        ORDER BY account_type, name
    """, frappe.defaults.get_user_default("Company"), as_dict=True)
    return accounts
