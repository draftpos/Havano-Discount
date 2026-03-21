from . import __version__ as app_version

app_name = "discount"
app_title = "Discount"
app_publisher = "Havano"
app_description = "Discount, Layby and Receipt management for Havano POS"
app_icon = "octicon octicon-tag"
app_color = "grey"
app_email = "info@havano.com"
app_license = "MIT"

# Inject into all web pages and desk
web_include_js = ["/assets/discount/js/discount.bundle.js"]
app_include_js = ["/assets/discount/js/discount.bundle.js"]

after_install = "discount.install.after_install"
after_migrate = ["discount.install.after_install"]
