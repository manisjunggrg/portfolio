(function ($) {

    skel.init({
        reset: 'full',
        breakpoints: {
            global: { href: 'css/style.css', containers: '35em', grid: { gutters: ['1.5em', 0] } },
            large: { media: '(max-width: 1680px)', href: 'css/style-large.css' },
            medium: { media: '(max-width: 980px)', href: 'css/style-medium.css', containers: '80%', viewport: { scalable: false } },
            small: { media: '(max-width: 736px)', href: 'css/style-small.css', grid: { gutters: ['1em', 0] } },
            xsmall: { media: '(max-width: 480px)', href: 'css/style-xsmall.css', containers: '100%' }
        }
    });

    $(function () {

        var $window = $(window),
            $body = $('body'),
            $html = $('html');

        // Disable animations/transitions until the page has loaded.
        $html.addClass('is-loading');

        $window.on('load', function () {
            window.setTimeout(function () {
                $html.removeClass('is-loading');
            }, 0);

            // Initialize Swiper.js slider
            var swiper = new Swiper('.swiper-container', {
                loop: true,
                autoplay: {
                    delay: 3000,
                    disableOnInteraction: false,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
            });
        });

        // Other existing logic for scrolly, forms, header, and sections...

        $('.main').each(function () {
            // Your existing logic...
        });
    });

})(jQuery);
