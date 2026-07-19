jQuery(function($) {
    function formatPrice(amount) {
        var pos = loyaltybay_checkout_data.currency_pos;
        var sym = loyaltybay_checkout_data.currency_sym;
        var formatted = parseFloat(amount).toFixed(2);
        if (pos === 'left') return sym + formatted;
        if (pos === 'right') return formatted + sym;
        if (pos === 'left_space') return sym + ' ' + formatted;
        if (pos === 'right_space') return formatted + ' ' + sym;
        return sym + formatted;
    }

    function initLoyaltyBay() {
        var $wrapper = $('.loyaltybay-redemption-wrapper');
        var $msg = $('#loyaltybay-redemption-message');
        
        var $range = $('#loyaltybay-points-range');
        var $input = $('#loyaltybay-points-input');
        var $display = $('#loyaltybay-discount-display');
        var pointsValue = parseFloat(loyaltybay_checkout_data.points_value || 0);

        function updateDiscountDisplay(points) {
            var discount = points * pointsValue;
            if ($display.length) {
                // If there's an HTML element inside (like WooCommerce's native formatting span), 
                // just update the text and preserve structure, or simply replace it.
                // We'll replace it entirely with our formatted string to be safe.
                $display.html(formatPrice(discount));
            }
        }

        $range.off('input').on('input', function() {
            var val = $(this).val();
            $input.val(val);
            updateDiscountDisplay(val);
        });

        $input.off('input').on('input', function() {
            var val = parseInt($(this).val()) || 0;
            var max = parseInt($(this).attr('max')) || 0;
            if (val > max) val = max;
            if (val < 0) val = 0;
            $range.val(val);
            updateDiscountDisplay(val);
        });

        $('#loyaltybay-apply-points').off('click').on('click', function(e) {
            e.preventDefault();
            var points = $('#loyaltybay-points-input').val();
            
            if (points === '' || isNaN(points) || points < 0) {
                $msg.text('Please enter a valid amount of points.').show();
                return;
            }

            $wrapper.css('opacity', '0.5');

            $.ajax({
                url: loyaltybay_checkout_data.rest_url,
                method: 'POST',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', loyaltybay_checkout_data.nonce);
                },
                data: { points: points },
                success: function(response) {
                    window.location.reload();
                },
                error: function(xhr) {
                    $wrapper.css('opacity', '1');
                    var res = xhr.responseJSON;
                    $msg.text(res && res.message ? res.message : 'An error occurred.').show();
                }
            });
        });

        $('#loyaltybay-remove-points').off('click').on('click', function(e) {
            e.preventDefault();
            $wrapper.css('opacity', '0.5');

            $.ajax({
                url: loyaltybay_checkout_data.rest_url,
                method: 'DELETE',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', loyaltybay_checkout_data.nonce);
                },
                success: function() {
                    window.location.reload();
                },
                error: function() {
                    $wrapper.css('opacity', '1');
                    $msg.text('An error occurred.').show();
                }
            });
        });
    }

    initLoyaltyBay();
    $(document.body).on('updated_checkout', function() {
        initLoyaltyBay();
    });
});
