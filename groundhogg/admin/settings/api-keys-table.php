<?php

namespace Groundhogg\Admin\Settings;

use function Groundhogg\action_input;
use function Groundhogg\action_url;
use function Groundhogg\get_post_var;
use function Groundhogg\get_request_var;
use Groundhogg\Plugin;
use function Groundhogg\html;
use function Groundhogg\verify_admin_ajax_nonce;

/**
 * API Key Table Class
 *
 * @package     WPGH
 * @subpackage  Admin/Tools/APIKeys
 * @copyright   Copyright (c) 2015, Pippin Williamson
 * @license     http://opensource.org/licenses/gpl-2.0.php GNU Public License
 * @since       2.0
 */

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Load WP_List_Table if not loaded
if ( ! class_exists( 'WP_List_Table' ) ) {
	require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
}

/**
 * WPGH_API_Keys_Table Class
 *
 * Renders the API Keys table
 *
 * @since 2.0
 */
class API_Keys_Table extends \WP_List_Table {

	/**
	 * @var int Number of items per page
	 * @since 2.0
	 */
	public $per_page = 30;

	/**
	 * @var object Query results
	 * @since 2.0
	 */
	private $keys;

	/**
	 * Get things started
	 *
	 * @since 1.5
	 * @see   WP_List_Table::__construct()
	 */
	public function __construct() {
		global $status, $page;

		// Set parent defaults
		parent::__construct( array(
			'singular' => __( 'API Key', 'groundhogg' ),
			'plural'   => __( 'API Keys', 'groundhogg' ),
			'ajax'     => false,
		) );

		$this->query();
	}

	/**
	 * Gets the name of the primary column.
	 *
	 * @return string Name of the primary column.
	 * @since  2.5
	 * @access protected
	 *
	 */
	protected function get_primary_column_name() {
		return 'user';
	}

	/**
	 * This function renders most of the columns in the list table.
	 *
	 * @param array  $item        Contains all the data of the keys
	 * @param string $column_name The name of the column
	 *
	 * @return string Column Name
	 * @since 2.0
	 *
	 */
	public function column_default( $item, $column_name ) {
		return $item[ $column_name ];
	}

	/**
	 * Displays the public key rows
	 *
	 * @param array  $item        Contains all the data of the keys
	 * @param string $column_name The name of the column
	 *
	 * @return string Column Name
	 * @since 2.4
	 *
	 */
	public function column_key( $item ) {
		return '<input onfocus="this.select()" readonly="readonly" type="text" class="large-text" value="' . esc_attr( $item['key'] ) . '"/>';
	}

	/**
	 * Displays the token rows
	 *
	 * @param array  $item        Contains all the data of the keys
	 * @param string $column_name The name of the column
	 *
	 * @return string Column Name
	 * @since 2.4
	 *
	 */
	public function column_token( $item ) {
		return '<input onfocus="this.select()" readonly="readonly" type="text" class="large-text" value="' . esc_attr( $item['token'] ) . '"/>';
	}

	/**
	 * Displays the secret key rows
	 *
	 * @param array  $item        Contains all the data of the keys
	 * @param string $column_name The name of the column
	 *
	 * @return string Column Name
	 * @since 2.4
	 *
	 */
	public function column_secret( $item ) {
		return '<input onfocus="this.select()" readonly="readonly" type="text" class="large-text" value="' . esc_attr( $item['secret'] ) . '"/>';
	}

	/**
	 * Renders the column for the user field
	 *
	 * @return void
	 * @since 2.0
	 */
	public function column_user( $item ) {

		$actions = array();

		$actions['reissue'] = sprintf(
			'<a href="%s" class="wpgh-regenerate-api-key">%s</a>',
			esc_url( action_url( 'reissue_api_key', [ 'user_id' => $item['id'] ] ) ),
			_x( 'Reissue', 'action', 'groundhogg' )
		);
		$actions['revoke']  = sprintf(
			'<a href="%s" class="wpgh-revoke-api-key wpgh-delete">%s</a>',
			esc_url( action_url( 'revoke_api_key', [ 'user_id' => $item['id'] ] ) ),
			_x( 'Revoke', 'action', 'groundhogg' )
		);

		$actions = apply_filters( 'wpgh_api_row_actions', array_filter( $actions ) );

		return sprintf( '%1$s %2$s', $item['user'], $this->row_actions( $actions ) );
	}

	/**
	 * Retrieve the table columns
	 *
	 * @return array $columns Array of all the list table columns
	 * @since 2.0
	 */
	public function get_columns() {
		$columns = array(
			'user'   => _x( 'Username', 'column_title', 'groundhogg' ),
			'key'    => _x( 'Public Key', 'column_title', 'groundhogg' ),
			'token'  => _x( 'Token', 'column_title', 'groundhogg' ),
			'secret' => _x( 'Secret Key', 'column_title', 'groundhogg' ),
		);

		return $columns;
	}

	/**
	 * Retrieve the current page number
	 *
	 * @return int Current page number
	 * @since 2.0
	 */
	public function get_paged() {
		return isset( $_GET['paged'] ) ? absint( $_GET['paged'] ) : 1;
	}

	/**
	 * Performs the key query
	 *
	 * @return array
	 * @since 2.0
	 */
	public function query() {
		$users = get_users( array(
			'meta_key' => 'wpgh_user_secret_key',
			'number'   => $this->per_page,
			'offset'   => $this->per_page * ( $this->get_paged() - 1 ),
		) );
		$keys  = array();

		foreach ( $users as $user ) {
			$keys[ $user->ID ]['id']    = $user->ID;
			$keys[ $user->ID ]['email'] = $user->user_email;
			$keys[ $user->ID ]['user']  = '<a href="' . add_query_arg( 'user_id', $user->ID, 'user-edit.php' ) . '"><strong>' . $user->user_login . '</strong></a>';

			$keys[ $user->ID ]['key']    = get_user_meta( $user->ID, 'wpgh_user_public_key', true );
			$keys[ $user->ID ]['secret'] = get_user_meta( $user->ID, 'wpgh_user_secret_key', true );
			$keys[ $user->ID ]['token']  = $this->get_token( $user->ID );
		}

		return $keys;
	}


	/**
	 * Retrieve count of total users with keys
	 *
	 * @return int
	 * @since 2.0
	 */
	public function total_items() {
		global $wpdb;

		if ( ! get_transient( 'wpgh_total_api_keys' ) ) {
			$total_items = $wpdb->get_var( "SELECT count(user_id) FROM $wpdb->usermeta WHERE meta_value='wpgh_user_secret_key'" );

			set_transient( 'wpgh_total_api_keys', $total_items, 60 * 60 );
		}

		return get_transient( 'wpgh_total_api_keys' );
	}

	/**
	 * Setup the final data for the table
	 *
	 * @return void
	 * @since 2.0
	 */
	public function prepare_items() {

		$columns = $this->get_columns();

		$hidden   = array(); // No hidden columns
		$sortable = array(); // Not sortable... for now

		$this->_column_headers = array( $columns, $hidden, $sortable, 'user' );

		$data = $this->query();

		$total_items = $this->total_items();

		$this->items = $data;

		$this->set_pagination_args( array(
				'total_items' => $total_items,
				'per_page'    => $this->per_page,
				'total_pages' => ceil( $total_items / $this->per_page ),
			)
		);
	}

	/**
	 * Generate an api key and store it in user meta
	 *
	 * @param int $user_id
	 *
	 * @return bool
	 */
	public static function generate_api_key( $user_id = 0 ) {

		if ( empty( $user_id ) ) {
			return false;
		}

		$user = get_userdata( $user_id );

		if ( ! $user ) {
			return false;
		}

		//generate new keys
		$new_public_key = self::generate_public_key( $user->user_email );
		$new_secret_key = self::generate_private_key( $user->ID );

		//update meta
		update_user_meta( $user_id, 'wpgh_user_public_key', $new_public_key );
		update_user_meta( $user_id, 'wpgh_user_secret_key', $new_secret_key );

		return true;
	}

	/**
	 * Generate the public key for a user
	 *
	 * @access private
	 *
	 * @param string $user_email
	 *
	 * @return string
	 * @since  1.9.9
	 */
	public static function generate_public_key( $user_email = '' ) {

		$auth_key = defined( 'AUTH_KEY' ) ? AUTH_KEY : '';

		return hash( 'md5', $user_email . $auth_key . date( 'U' ) );
	}

	/**
	 * Generate the secret key for a user
	 *
	 * @access private
	 *
	 * @param int $user_id
	 *
	 * @return string
	 * @since  1.9.9
	 */
	public static function generate_private_key( $user_id = 0 ) {
		$auth_key = defined( 'AUTH_KEY' ) ? AUTH_KEY : '';

		return hash( 'md5', $user_id . $auth_key . date( 'U' ) );
	}

	/**
	 * Retrieve the user's token
	 *
	 * @access private
	 *
	 * @param int $user_id
	 *
	 * @return string
	 * @since  1.9.9
	 */
	public static function get_token( $user_id = 0 ) {
		return hash( 'md5', get_user_meta( $user_id, 'wpgh_user_secret_key', true ) . get_user_meta( $user_id, 'wpgh_user_public_key', true ) );
	}
}