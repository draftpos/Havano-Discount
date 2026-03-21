import frappe
import json
from discount.api.layby import create_layby_sales_order

# ── Helper: get HA Discount Settings ──
def get_discount_settings():
    try:
        return frappe.get_single("HA Discount Settings")
    except Exception:
        return None

@frappe.whitelist()
def check_discount_enabled():
    s = get_discount_settings()
    return {"enabled": bool(s and s.allow_discount)}

@frappe.whitelist()
def get_ha_discount_settings():
    """Return all discount settings for the POS frontend"""
    s = get_discount_settings()
    if not s:
        return {"allow_discount": 0, "allow_layby": 0, "allow_receipts": 0,
                "require_pin": 1, "min_discount_pct": 0, "max_discount_pct": 100}
    return {
        "allow_discount": s.allow_discount or 0,
        "allow_layby": s.allow_layby or 0,
        "allow_receipts": s.allow_receipts or 0,
        "require_pin": s.require_pin_for_discount or 1,
        "min_discount_pct": s.min_discount_pct or 0,
        "max_discount_pct": s.max_discount_pct or 100,
    }

@frappe.whitelist()
def get_item_discount(item_code):
    if not item_code:
        return {"has_discount": False}
    s = get_discount_settings()
    if not s or not s.allow_discount:
        return {"has_discount": False, "reason": "Discount not enabled"}
    # Try to resolve item_name to item_code
    resolved = frappe.db.get_value("Item", {"item_name": item_code}, "name")
    if resolved:
        item_code = resolved
    # Also try direct lookup
    if not frappe.db.exists("Item", item_code):
        resolved2 = frappe.db.get_value("Item", {"item_code": item_code}, "name")
        if resolved2:
            item_code = resolved2
    today = frappe.utils.today()
    rule = None
    item_rules = frappe.db.sql("""
        SELECT pr.name, pr.title, pr.rate_or_discount, pr.discount_percentage,
               pr.discount_amount, pr.rate, pr.rule_description,
               pr.threshold_percentage, pr.valid_from, pr.valid_upto,
               pr.min_qty, pr.max_qty
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
                       pr.threshold_percentage, pr.valid_from, pr.valid_upto,
                       pr.min_qty, pr.max_qty
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
        # Use global min/max from HA Discount Settings if set
        global_min = float(s.min_discount_pct or 0)
        global_max = float(s.max_discount_pct or 100)
        rule_min = max(global_min, max(0, discount_value - threshold) if threshold else global_min)
        rule_max = min(global_max, discount_value + threshold if threshold else global_max)
        return {
            "has_discount": True,
            "rule_name": rule.get("title") or rule.get("name"),
            "pricing_rule": rule.get("name"),
            "discount_type": discount_type,
            "discount_value": discount_value,
            "min_discount": rule_min,
            "max_discount": rule_max,
            "min_qty": float(rule.get("min_qty") or 0),
            "max_qty": float(rule.get("max_qty") or 0),
            "description": rule.get("rule_description") or "",
            "match_type": rule.get("match_type"),
        }
    # No pricing rule found for this item
    return {"has_discount": False, "reason": "No pricing rule for this item"}

@frappe.whitelist()
def validate_supervisor_pin(pin):
    if not pin:
        return {"valid": False, "message": "PIN is required"}
    try:
        # Check HA Discount Settings PIN first
        s = get_discount_settings()
        if s and s.discount_pin:
            import hashlib
            stored = s.get_password("discount_pin")
            if str(stored).strip() == str(pin).strip():
                return {"valid": True, "supervisor": frappe.session.user, "message": "Approved"}
            return {"valid": False, "message": "Invalid PIN. Please try again."}
        # Fall back to HA POS Settings user mapping passwords
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
def check_user_discount_permission():
    user = frappe.session.user
    try:
        settings = frappe.get_single("HA POS Settings")
        for row in settings.user_mapping:
            if row.user == user:
                return {"has_permission": bool(row.allow_add_discount)}
        return {"has_permission": False}
    except Exception:
        return {"has_permission": False}

@frappe.whitelist()
def save_discount_log(**kwargs):
    log = {
        "applied_by": frappe.session.user,
        "item_code": kwargs.get("item_code", ""),
        "item_name": kwargs.get("item_name", ""),
        "discount_amount": float(kwargs.get("discount_amount", 0) or 0),
        "discount_pct": float(kwargs.get("discount_pct", 0) or 0),
        "original_price": float(kwargs.get("original_price", 0) or 0),
        "final_price": float(kwargs.get("final_price", 0) or 0),
    }
    frappe.log_error(json.dumps(log, indent=2), "Discount Applied - " + log["item_name"])
    return {"success": True}

@frappe.whitelist()
def create_layby_payment(sales_order, paid_to, paid_amount, mode_of_payment,
                          posting_date, paid_from=None, reference_no="",
                          remarks="", customer=None, is_receipt=0):
    """Create Payment Entry for layby or receipt"""
    if frappe.utils.cint(is_receipt) and customer and not sales_order:
        pe = frappe.get_doc({
            "doctype": "Payment Entry",
            "payment_type": "Receive",
            "posting_date": posting_date,
            "party_type": "Customer",
            "party": customer,
            "paid_from": paid_from or frappe.db.get_value(
                "Company", frappe.defaults.get_user_default("Company"),
                "default_receivable_account"),
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
        # Record in HA Receipt Transaction
        try:
            frappe.get_doc({
                "doctype": "HA Receipt Transaction",
                "payment_entry": pe.name,
                "customer": customer,
                "date": posting_date,
                "amount": frappe.utils.flt(paid_amount),
                "account_paid_to": paid_to,
                "mode_of_payment": mode_of_payment,
            }).insert(ignore_permissions=True)
        except Exception:
            pass
        frappe.db.commit()
        return {"success": True, "payment_entry": pe.name}

    so = frappe.get_doc("Sales Order", sales_order)
    paid_amount = float(paid_amount)
    already_paid = frappe.db.sql("""
        SELECT COALESCE(SUM(per.allocated_amount), 0)
        FROM `tabPayment Entry Reference` per
        INNER JOIN `tabPayment Entry` pe ON pe.name = per.parent
        WHERE per.reference_doctype = 'Sales Order'
        AND per.reference_name = %s AND pe.docstatus = 1
    """, sales_order)[0][0] or 0

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
    # Record in HA Layby Transaction
    try:
        existing = frappe.db.get_value("HA Layby Transaction", {"sales_order": sales_order})
        if existing:
            doc = frappe.get_doc("HA Layby Transaction", existing)
            doc.paid_amount = (doc.paid_amount or 0) + new_payment
            doc.status = "Paid" if doc.paid_amount >= so.grand_total else "Partially Paid"
            doc.save(ignore_permissions=True)
        else:
            frappe.get_doc({
                "doctype": "HA Layby Transaction",
                "sales_order": sales_order,
                "customer": so.customer,
                "date": posting_date,
                "total_amount": so.grand_total,
                "paid_amount": new_payment,
                "status": "Partially Paid" if new_payment < so.grand_total else "Paid",
            }).insert(ignore_permissions=True)
    except Exception:
        pass
    frappe.db.commit()
    return {"success": True, "payment_entry": pe.name}

@frappe.whitelist()
def get_customer_outstanding(customer):
    result = frappe.db.sql("""
        SELECT COALESCE(SUM(so.grand_total - so.advance_paid), 0) as outstanding
        FROM `tabSales Order` so
        WHERE so.docstatus = 1 AND so.customer = %s
        AND (so.grand_total - so.advance_paid) > 0
    """, customer, as_dict=True)
    return {"outstanding": float(result[0].outstanding) if result else 0}

@frappe.whitelist()
def get_cash_bank_accounts():
    accounts = frappe.db.sql("""
        SELECT name, account_type, account_currency
        FROM `tabAccount`
        WHERE account_type IN ('Cash', 'Bank')
        AND is_group = 0 AND company = %s
        ORDER BY account_type, name
    """, frappe.defaults.get_user_default("Company"), as_dict=True)
    return accounts

@frappe.whitelist()
def get_discount_settings_for_pos():
    """Combined settings for POS — reads from HA Discount Settings"""
    return get_ha_discount_settings()
