jQuery(function($) {
    function formatPrice(amount) {
        var pos = pointbay_checkout_data.currency_pos;
        var sym = pointbay_checkout_data.currency_sym;
        var formatted = parseFloat(amount).toFixed(2);
        if (pos === 'left') return sym + formatted;
        if (pos === 'right') return formatted + sym;
        if (pos === 'left_space') return sym + ' ' + formatted;
        if (pos === 'right_space') return formatted + ' ' + sym;
        return sym + formatted;
    }

    function initPointBay() {
        var $wrapper = $('.pointbay-redemption-wrapper');
        var $msg = $('#pointbay-redemption-message');
        
        var $range = $('#pointbay-points-range');
        var $input = $('#pointbay-points-input');
        var $display = $('#pointbay-discount-display');
        var pointsValue = parseFloat(pointbay_checkout_data.points_value || 0);

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

        $('#pointbay-apply-points').off('click').on('click', function(e) {
            e.preventDefault();
            var points = $('#pointbay-points-input').val();
            
            if (points === '' || isNaN(points) || points < 0) {
                $msg.text('Please enter a valid amount of points.').show();
                return;
            }

            $wrapper.css('opacity', '0.5');

            $.ajax({
                url: pointbay_checkout_data.rest_url,
                method: 'POST',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', pointbay_checkout_data.nonce);
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

        $('#pointbay-remove-points').off('click').on('click', function(e) {
            e.preventDefault();
            $wrapper.css('opacity', '0.5');

            $.ajax({
                url: pointbay_checkout_data.rest_url,
                method: 'DELETE',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', pointbay_checkout_data.nonce);
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

    initPointBay();
    $(document.body).on('updated_checkout', function() {
        initPointBay();
    });
});
