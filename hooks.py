from . import __version__ as app_version

app_name = "discount"
app_title = "Discount"
app_publisher = "Your Name"
app_description = "Discount Management for POS"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "your@email.com"
app_license = "MIT"

# Include JS for POS
app_include_js = ["discount.bundle.js"]

# Specifically for POS
pos_include_js = ["discount.bundle.js"]
