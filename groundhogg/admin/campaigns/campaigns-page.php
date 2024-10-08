<?php

namespace Groundhogg\Admin\Campaigns;

use Groundhogg\Admin\Admin_Page;
use Groundhogg\Campaign;
use function Groundhogg\action_input;
use function Groundhogg\get_db;
use function Groundhogg\get_post_var;
use function Groundhogg\get_request_var;
use function Groundhogg\html;

class Campaigns_Page extends Admin_Page {

	public function get_slug() {
		return 'gh_campaigns';
	}

	public function get_name() {
		return 'Campaigns';
	}

	public function get_cap() {
		return 'manage_campaigns';
	}

	public function get_item_type() {
		return 'campaign';
	}

	public function scripts() {
		// TODO: Implement scripts() method.
	}

	public function help() {
		// TODO: Implement help() method.
	}

	public function get_priority() {
		return 70;
	}

	public function view() {

		$table = new Campaigns_Table();

		?>
		<p></p>
		<div class="display-flex" style="gap: 40px">
			<div class="left col-wrap">
				<h2><?php _e( 'Add a new Campaign', 'groundhogg' ); ?></h2>
				<form method="post" class="display-flex column gap-10 form-wrap">
					<?php

					action_input( 'add', true, true );

					echo html()->e( 'div', [
						'class' => 'display-flex column'
					], [
						html()->e( 'label', [ 'for' => 'campaign-name' ], __( 'Name' ) ),
						html()->input( [
							'id'   => 'campaign-name',
							'name' => 'name'
						] ),
						html()->description( __( 'A recognizable name for the campaign.', 'groundhogg' ) )
					] );

					echo html()->e( 'div', [
						'class' => 'display-flex column'
					], [
						html()->e( 'label', [ 'for' => 'campaign-slug' ], __( 'Slug' ) ),
						html()->input( [
							'id'   => 'campaign-slug',
							'name' => 'slug'
						] ),
						html()->description( __( 'The “slug” is the URL-friendly version of the name. It is usually all lowercase and contains only letters, numbers, and hyphens' ) )
					] );

					?>
					<script>
                      ( ($) => {
                        $('#campaign-name').on('input', e => {
                          $('#campaign-slug').val(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))
                        })
                      } )(jQuery)
					</script>
					<?php

					echo html()->e( 'div', [
						'class' => 'display-flex column'
					], [
						html()->e( 'label', [ 'for' => 'campaign-name' ], __( 'Description' ) ),
						html()->textarea( [
							'id'   => 'campaign-description',
							'name' => 'description',
							'rows' => 3
						] ),
						html()->description( __( 'A description of the assets that will be assigned to this campaign.', 'groundhogg' ) )
					] );

					echo html()->e( 'div', [
						'class' => 'space-between'
					], [
						html()->e( 'label', [
							'for' => 'is-public'
						], __( 'Make this campaign publicly available?', 'groundhogg' ), false ),
						html()->toggle( [
							'id'       => 'is-public',
							'name'     => 'public',
							'onLabel'  => __( 'Yes' ),
							'offLabel' => __( 'No' ),
						] )
					] );

					echo html()->e( 'div', [], html()->button( [
						'type'  => 'submit',
						'class' => 'gh-button primary',
						'text'  => __( 'Add Campaign', 'groundhogg' )
					] ) );

					?>

				</form>
			</div>
			<div>
				<?php
				$this->search_form( __( 'Search Campaigns', 'groundhogg' ) );
				?>

				<form id="posts-filter" method="post">
					<?php
					$table->prepare_items();
					$table->display();
					?>
				</form>
			</div>
		</div>
		<?php
	}

	public function process_add() {
		if ( ! current_user_can( 'manage_campaigns' ) ) {
			$this->wp_die_no_access();
		}

		$name        = sanitize_text_field( get_post_var( 'name' ) );
		$description = sanitize_textarea_field( get_post_var( 'description' ) );
		$slug        = sanitize_title( get_post_var( 'slug' ) );

		if ( empty( $name ) ) {
			return new \WP_Error( 'invalid', __( 'Name can\'t be empty', 'groundhogg' ) );
		}

		if ( empty( $slug ) ) {
			$slug = sanitize_title( $name );
		}

		if ( get_db( 'campaigns' )->exists( [ 'slug' => $slug ] ) ) {
			return new \WP_Error( 'in_use', __( 'The given slug is already in use by another campaign.', 'groundhogg' ) );
		}

		$campaign = new Campaign( [
			'name'        => $name,
			'slug'        => $slug,
			'description' => $description,
			'visibility'  => get_post_var( 'public' ) ? 'public' : 'hidden'
		] );

		if ( ! $campaign->exists() ) {
			return new \WP_Error( 'oops', __( 'Something went wrong.' ) );
		}

		$this->add_notice( 'new-campaign', __( 'Campaign created!', 'groundhogg' ) );

		return false;
	}

	/**
	 * @return bool|\WP_Error
	 */
	public function process_edit() {

		if ( ! current_user_can( 'manage_campaigns' ) ) {
			$this->wp_die_no_access();
		}

		$id = absint( get_request_var( 'campaign' ) );

		// The current campaign
		$campaign = new Campaign( $id );

		$name        = sanitize_text_field( get_post_var( 'name' ) );
		$description = sanitize_textarea_field( get_post_var( 'description' ) );
		$slug        = sanitize_title( get_post_var( 'slug' ) );

		if ( empty( $name ) ) {
			return new \WP_Error( 'invalid', __( 'Name can\'t be empty', 'groundhogg' ) );
		}

		if ( empty( $slug ) ) {
			$slug = sanitize_title( $name );
		}

		// Slug changed
		if ( $slug !== $campaign->get_slug() ) {

			// Make sure it's not too long
			if ( strlen( $slug ) > get_db( 'campaigns' )->get_max_index_length() ) {
				return new \WP_Error( 'too_long', __( sprintf( "Maximum length for a campaign name is %d characters.", get_db( 'campaigns' )->get_max_index_length() ), 'groundhogg' ) );
			}

			// Check if the slug is in use
			if ( get_db( 'campaigns' )->exists( [ 'slug' => $slug ] ) ) {
				return new \WP_Error( 'in_use', __( 'The given slug is already in use by another campaign.', 'groundhogg' ) );
			}
		}

		$campaign->update( [
			'name'        => $name,
			'description' => $description,
			'slug'        => $slug,
			'visibility'  => get_post_var( 'public' ) ? 'public' : 'hidden'
		] );

		$this->add_notice( 'updated', _x( 'Campaign updated.', 'notice', 'groundhogg' ) );

		do_action( 'groundhogg/admin/tags/edit', $id );

		return true;

	}

	/**
	 * Delete campaigns from the admin
	 *
	 * @return bool|\WP_Error
	 */
	public function process_delete() {
		if ( ! current_user_can( 'manage_campaigns' ) ) {
			$this->wp_die_no_access();
		}

		foreach ( $this->get_items() as $id ) {

			$campaign = new Campaign( $id );

			if ( ! $campaign->delete() ) {
				return new \WP_Error( 'unable_to_delete', "Something went wrong deleting the campaign." );
			}
		}

		$this->add_notice(
			'deleted',
			sprintf( _nx( '%d campaign deleted', '%d campaigns deleted', count( $this->get_items() ), 'notice', 'groundhogg' ),
				count( $this->get_items() )
			)
		);

		return false;
	}

	public function edit() {
		if ( ! current_user_can( 'manage_campaigns' ) ) {
			$this->wp_die_no_access();
		}

		include __DIR__ . '/edit.php';
	}

	protected function add_ajax_actions() {
		// TODO: Implement add_ajax_actions() method.
	}

	protected function add_additional_actions() {
		// TODO: Implement add_additional_actions() method.
	}
}
