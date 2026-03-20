frappe.pages['discount'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Discount Manager',
		single_column: true
	});
}