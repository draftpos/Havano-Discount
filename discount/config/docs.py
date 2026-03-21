from frappe import _

def get_data():
    return {
        "modules": [
            {
                "label": _("Settings"),
                "items": [
                    {
                        "type": "doctype",
                        "name": "HA Discount Settings",
                        "label": _("HA Discount Settings"),
                        "description": _("Configure discount, layby and receipt settings"),
                        "onboard": 1,
                    }
                ]
            },
            {
                "label": _("Transactions"),
                "items": [
                    {
                        "type": "doctype",
                        "name": "HA Layby Transaction",
                        "label": _("Layby Transactions"),
                    },
                    {
                        "type": "doctype",
                        "name": "HA Receipt Transaction",
                        "label": _("Receipt Transactions"),
                    }
                ]
            }
        ]
    }
