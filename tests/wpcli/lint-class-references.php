<?php
/**
 * Static check: every bare `ClassName::` / `new ClassName` in app/ must resolve.
 *
 * Catches a class used without a `use` import (a runtime fatal that `php -l`
 * cannot see). Needs no WordPress.
 *
 * Run: php tests/wpcli/lint-class-references.php
 * Exit code is 1 when any reference is unresolved.
 *
 * @package PointBay
 */

$root     = dirname( __DIR__, 2 ) . '/app';
$it       = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $root, FilesystemIterator::SKIP_DOTS ) );
$declared = array(); // FQCN => true, for every class/interface/trait/enum under app/.
$files    = array();
foreach ( $it as $f ) {
	if ( 'php' === $f->getExtension() ) {
		$files[] = $f->getPathname();
	}
}

$special = array( 'self', 'static', 'parent' );
$parse   = function ( $code ) {
	$ns = '';
	$use = array();
	$classes = array();
	$refs = array();
	$t = token_get_all( $code );
	$n = count( $t );
	$name = function ( &$i ) use ( $t, $n ) {
		$s = '';
		for ( ; $i < $n; $i++ ) {
			$k = is_array( $t[ $i ] ) ? $t[ $i ][0] : null;
			if ( in_array( $k, array( T_STRING, T_NAME_QUALIFIED, T_NAME_FULLY_QUALIFIED, T_NS_SEPARATOR ), true ) ) {
				$s .= $t[ $i ][1];
			} elseif ( T_WHITESPACE !== $k ) {
				break;
			}
		}
		return $s;
	};
	for ( $i = 0; $i < $n; $i++ ) {
		if ( ! is_array( $t[ $i ] ) ) {
			continue;
		}
		$k = $t[ $i ][0];
		if ( T_NAMESPACE === $k ) {
			++$i;
			$ns = $name( $i );
		} elseif ( in_array( $k, array( T_CLASS, T_INTERFACE, T_TRAIT, T_ENUM ), true ) ) {
			$p = $i - 1;
			while ( $p > 0 && is_array( $t[ $p ] ) && T_WHITESPACE === $t[ $p ][0] ) {
				--$p;
			}
			if ( is_array( $t[ $p ] ) && T_DOUBLE_COLON === $t[ $p ][0] ) {
				continue; // Foo::class.
			}
			++$i;
			$classes[] = $name( $i );
		} elseif ( T_STRING === $k || T_NAME_QUALIFIED === $k ) {
			$next = $i + 1;
			while ( $next < $n && is_array( $t[ $next ] ) && T_WHITESPACE === $t[ $next ][0] ) {
				++$next;
			}
			$is_static = is_array( $t[ $next ] ) && T_DOUBLE_COLON === $t[ $next ][0];
			$prev = $i - 1;
			while ( $prev > 0 && is_array( $t[ $prev ] ) && T_WHITESPACE === $t[ $prev ][0] ) {
				--$prev;
			}
			$is_new = is_array( $t[ $prev ] ) && T_NEW === $t[ $prev ][0];
			if ( $is_static || $is_new ) {
				$refs[] = array( $t[ $i ][1], $t[ $i ][2] );
			}
		}
	}
	// `use` imports (simple, group-free) via regex on the source.
	preg_match_all( '/^use\s+([\w\\\\]+)(?:\s+as\s+(\w+))?\s*;/m', $code, $m, PREG_SET_ORDER );
	foreach ( $m as $u ) {
		$base = isset( $u[2] ) && '' !== $u[2] ? $u[2] : substr( strrchr( '\\' . $u[1], '\\' ), 1 );
		$use[ $base ] = ltrim( $u[1], '\\' );
	}
	return array( $ns, $use, $classes, $refs );
};

$parsed = array();
foreach ( $files as $file ) {
	$parsed[ $file ] = $parse( file_get_contents( $file ) );
	list( $ns, , $classes ) = $parsed[ $file ];
	foreach ( $classes as $c ) {
		$declared[ ( $ns ? $ns . '\\' : '' ) . $c ] = true;
	}
}

$bad = 0;
foreach ( $parsed as $file => $p ) {
	list( $ns, $use, , $refs ) = $p;
	foreach ( $refs as $r ) {
		list( $ref, $line ) = $r;
		if ( in_array( strtolower( $ref ), $special, true ) || '\\' === $ref[0] || false !== strpos( $ref, '\\' ) ) {
			continue;
		}
		if ( isset( $use[ $ref ] ) || isset( $declared[ ( $ns ? $ns . '\\' : '' ) . $ref ] ) || class_exists( $ref, false ) ) {
			continue;
		}
		// Built-in PHP classes (DateTime, WP_Error, ...) live in the global namespace.
		if ( class_exists( $ref ) || interface_exists( $ref ) || 0 === strpos( $ref, 'WP_' ) || 0 === strpos( $ref, 'WC_' ) || 0 === strpos( $ref, 'Action' ) ) {
			continue;
		}
		++$bad;
		echo 'UNRESOLVED ' . substr( $file, strlen( dirname( $root ) ) + 1 ) . ':' . $line . '  ' . $ref . "\n";
	}
}
echo $bad ? "FAIL: {$bad} unresolved class reference(s)\n" : "PASS: all class references resolve\n";
exit( $bad ? 1 : 0 );
