<?php
/**
 * Plugin Name: Eclolink — Statut mises à jour
 * Description: Endpoint REST minimal, lecture seule, pour l'annuaire Eclolink
 *              (mise à jour WordPress core disponible + nombre de plugins à
 *              mettre à jour). Ne permet aucune action, aucune écriture.
 * Version: 1.0
 */

add_action('rest_api_init', function () {
    register_rest_route('eclolink/v1', '/status', [
        'methods'             => 'GET',
        'callback'            => 'eclolink_status_callback',
        'permission_callback' => 'eclolink_status_permission',
    ]);
});

function eclolink_status_permission(WP_REST_Request $request) {
    if (!defined('ECLOLINK_STATUS_KEY') || !ECLOLINK_STATUS_KEY) {
        return false;
    }
    $provided = $request->get_header('x-eclolink-key');
    return is_string($provided) && hash_equals(ECLOLINK_STATUS_KEY, $provided);
}

function eclolink_status_callback() {
    $plugin_updates = get_site_transient('update_plugins');
    $plugin_count = ($plugin_updates && !empty($plugin_updates->response))
        ? count($plugin_updates->response)
        : 0;

    return [
        'core_version'   => get_bloginfo('version'),
        'plugin_updates' => $plugin_count,
    ];
}
