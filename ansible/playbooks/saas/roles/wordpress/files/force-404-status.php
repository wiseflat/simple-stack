<?php
/**
 * Force proper HTTP 404 status code on WordPress 404 pages.
 *
 * When WordPress can't resolve a pretty permalink, it falls back to
 * the front page with HTTP 200 instead of returning 404. This mu-plugin
 * detects that case by comparing the requested URI to the real front
 * page path and forces a 404 when appropriate.
 */
add_action('template_redirect', function () {
    global $wp_query;

    if (is_404()) {
        status_header(404);
        nocache_headers();
        return;
    }

    // Detect false front page: WordPress resolved to front page but the
    // request URI doesn't match the actual front page URL
    if (
        is_front_page()
        && $wp_query->is_main_query()
        && !empty($_SERVER['REQUEST_URI'])
    ) {
        $request_path = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
        $home_path = rtrim(parse_url(home_url('/'), PHP_URL_PATH), '/');

        if ($request_path !== '' && $request_path !== $home_path) {
            $wp_query->set_404();
            status_header(404);
            nocache_headers();
            return;
        }
    }

    // Catch other cases: main query with no results on non-special pages
    if (
        $wp_query->is_main_query()
        && !$wp_query->found_posts
        && !is_home()
        && !is_front_page()
        && !is_search()
        && !is_archive()
        && !is_feed()
        && !is_robots()
    ) {
        $wp_query->set_404();
        status_header(404);
        nocache_headers();
    }
});
