from . import __version__ as app_version

app_name = "discount"
app_title = "Discount"
app_publisher = "Your Name"
app_description = "Discount Management for POS"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "your@email.com"
app_license = "MIT"

# Inject into POS dashboard
web_include_js = ["/assets/discount/dist/js/discount.bundle.js"]
app_include_js = ["/assets/discount/dist/js/discount.bundle.js"]

after_install = "discount.install.after_install"
after_migrate = ["discount.install.after_install"]

fixtures = [
    {
        "dt": "Client Script",
        "filters": [["module", "=", "Discount"]]
    }
]
