// Simple test for Layby button
console.log('🚀 Test Layby extension loading...');

$(document).on('frappe-ready', function() {
    console.log('📱 Frappe ready event fired');
    
    function addButton() {
        console.log('🔍 Looking for takeaway button...');
        var takeaway = $('[data-mode="takeaway"]');
        console.log('Takeaway button found:', takeaway.length);
        
        if (takeaway.length > 0 && !$('.test-layby').length) {
            console.log('✅ Adding test button');
            
            var btn = $('<button class="btn btn-success test-layby" style="margin-left:10px">TEST LAYBY</button>');
            takeaway.after(btn);
            
            btn.click(function() {
                alert('Test button works!');
            });
            
            console.log('✅ Test button added');
        } else {
            console.log('⏰ Retrying in 2 seconds...');
            setTimeout(addButton, 2000);
        }
    }
    
    setTimeout(addButton, 3000);
});

console.log('✅ Test extension loaded');
