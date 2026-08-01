<?php
/**
 * Base Model class for interacting with custom database tables.
 * Provides a simple Eloquent-like wrapper over $wpdb.
 *
 * @package    PointBay
 * @subpackage Models
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace PointBay\Models;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Base Model class.
 */
abstract class Model {
	/**
	 * The table associated with the model (without prefix).
	 *
	 * @var string
	 */
	protected $table;

	/**
	 * The primary key for the model.
	 *
	 * @var string
	 */
	protected $primary_key = 'id';

	/**
	 * Model attributes.
	 *
	 * @var array
	 */
	protected $attributes = array();

	/**
	 * Create a new model instance.
	 *
	 * @param array $attributes Attributes to fill.
	 */
	public function __construct( array $attributes = array() ) {
		$this->fill( $attributes );
	}

	/**
	 * Get the full table name including the WordPress prefix.
	 *
	 * @return string
	 */
	public function get_table() {
		global $wpdb;
		return $wpdb->prefix . $this->table;
	}

	/**
	 * Fill the model with an array of attributes.
	 *
	 * @param array $attributes The attributes.
	 * @return $this
	 */
	public function fill( array $attributes ) {
		foreach ( $attributes as $key => $value ) {
			$this->attributes[ $key ] = $value;
		}
		return $this;
	}

	/**
	 * Magic getter for attributes.
	 *
	 * @param string $key Attribute name.
	 * @return mixed|null
	 */
	public function __get( $key ) {
		return isset( $this->attributes[ $key ] ) ? $this->attributes[ $key ] : null;
	}

	/**
	 * Magic setter for attributes.
	 *
	 * @param string $key   Attribute name.
	 * @param mixed  $value Value.
	 */
	public function __set( $key, $value ) {
		$this->attributes[ $key ] = $value;
	}

	/**
	 * Get all attributes.
	 *
	 * @return array
	 */
	public function to_array() {
		return $this->attributes;
	}

	/**
	 * Save the model to the database.
	 *
	 * @return bool|int True/ID on success, false on failure.
	 */
	public function save() {
		global $wpdb;
		$table = $this->get_table();
		$pk    = $this->primary_key;

		// Set timestamps if they exist
		$now = current_time( 'mysql' );
		if ( ! isset( $this->attributes['created_at'] ) && ! isset( $this->attributes[ $pk ] ) ) {
			$this->attributes['created_at'] = $now;
		}

		if ( isset( $this->attributes[ $pk ] ) && ! empty( $this->attributes[ $pk ] ) ) {
			// Update
			$id   = $this->attributes[ $pk ];
			$data = $this->attributes;
			unset( $data[ $pk ] ); // Don't update primary key

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; writes must not be cached.
			$result = $wpdb->update(
				$table,
				$data,
				array( $pk => $id )
			);

			return false === $result ? false : true;
		} else {
			// Insert
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; writes must not be cached.
			$result = $wpdb->insert(
				$table,
				$this->attributes
			);

			if ( $result ) {
				$this->attributes[ $pk ] = $wpdb->insert_id;
				return $this->attributes[ $pk ];
			}
			return false;
		}
	}

	/**
	 * Delete the model from the database.
	 *
	 * @return bool
	 */
	public function delete() {
		global $wpdb;
		$pk = $this->primary_key;

		if ( ! isset( $this->attributes[ $pk ] ) ) {
			return false;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; deletes must not be cached.
		$result = $wpdb->delete(
			$this->get_table(),
			array( $pk => $this->attributes[ $pk ] )
		);

		return false !== $result;
	}

	/**
	 * Find a model by its primary key.
	 *
	 * @param int $id The ID.
	 * @return static|null
	 */
	public static function find( $id ) {
		global $wpdb;
		$instance = new static();
		$table    = $instance->get_table();
		$pk       = $instance->primary_key;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; reads are request-scoped.
		$row = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM %i WHERE %i = %d', $table, $pk, $id ), ARRAY_A );

		if ( $row ) {
			return new static( $row );
		}

		return null;
	}

	/**
	 * Get all records.
	 *
	 * @return static[]
	 */
	public static function all() {
		global $wpdb;
		$instance = new static();
		$table    = $instance->get_table();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; reads are request-scoped.
		$results = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM %i', $table ), ARRAY_A );

		$models = array();
		foreach ( $results as $row ) {
			$models[] = new static( $row );
		}

		return $models;
	}
}
