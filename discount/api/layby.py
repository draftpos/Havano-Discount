import frappe
from frappe.utils import nowdate, add_days, flt
import json

@frappe.whitelist()
def create_layby_sales_order(items, customer=None, pos_profile=None):
    """
    Create a Sales Order from POS cart items with layby status
    """
    try:
        # Parse items if they're sent as string
        if isinstance(items, str):
            items = json.loads(items)
        
        if not items:
            frappe.throw("No items to create Sales Order")
        
        # Get POS Profile details
        pos_profile_doc = frappe.get_doc("POS Profile", pos_profile) if pos_profile else None
        
        # Get or create customer
        if not customer:
            if pos_profile_doc and pos_profile_doc.customer:
                customer = pos_profile_doc.customer
            else:
                # Create walk-in customer
                customer = create_walk_in_customer()
        
        # Create new Sales Order
        sales_order = frappe.new_doc("Sales Order")
        sales_order.customer = customer
        sales_order.transaction_date = nowdate()
        sales_order.delivery_date = add_days(nowdate(), 30)
        sales_order.order_type = "Sales"
        
        if pos_profile_doc:
            sales_order.company = pos_profile_doc.company
        
        # Add items
        for item in items:
            rate = flt(item.get('rate'))
            discount_percentage = flt(item.get('discount_percentage', 0))
            
            if discount_percentage:
                rate = rate * (1 - discount_percentage/100)
            
            sales_order.append("items", {
                "item_code": item.get('item_code'),
                "item_name": item.get('item_name') or item.get('item_code'),
                "qty": flt(item.get('qty', 1)),
                "rate": rate,
                "amount": flt(item.get('amount')),
                "warehouse": item.get('warehouse')
            })
        
        # Add comment
        sales_order.add_comment("Info", f"Created from POS as Layby by {frappe.session.user}")
        
        # Save
        sales_order.flags.ignore_permissions = True
        sales_order.insert()
        frappe.db.commit()
        
        return {
            "name": sales_order.name,
            "status": sales_order.status,
            "total": sales_order.grand_total,
            "currency": sales_order.currency
        }
        
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Layby Error")
        frappe.throw(f"Error creating layby: {str(e)}")

def create_walk_in_customer():
    """Create walk-in customer"""
    customer_name = "Walk-in Customer (Layby)"
    existing = frappe.db.exists("Customer", {"customer_name": customer_name})
    if existing:
        return existing
    
    customer = frappe.new_doc("Customer")
    customer.customer_name = customer_name
    customer.customer_type = "Individual"
    customer.customer_group = "Individual"
    customer.territory = "All Territories"
    customer.flags.ignore_permissions = True
    customer.insert()
    return customer.name
