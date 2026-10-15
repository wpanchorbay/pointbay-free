import React, { useState } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import apiFetch from '../../utils/apiFetch';
import { useToast } from '../../store/toast/use-toast';
import { ClassicButton } from '../classics';

const PER_PAGE = 25;

interface SkipCounts {
	guest: number;
	already_awarded: number;
	refunded: number;
	zero_points: number;
}

interface BatchResult {
	page: number;
	total_pages: number;
	total_orders: number;
	scanned: number;
	credited_orders: number;
	points: number;
	customer_ids: number[];
	skipped: SkipCounts;
	done: boolean;
}

interface Totals {
	orders: number;
	points: number;
	customers: number;
	skipped: SkipCounts;
}

type Phase = 'idle' | 'previewing' | 'previewed' | 'committing' | 'done';

const emptySkips = (): SkipCounts => ( {
	guest: 0,
	already_awarded: 0,
	refunded: 0,
	zero_points: 0,
} );

const BackfillTool: React.FC = () => {
	const { addToast } = useToast();
	const [ startDate, setStartDate ] = useState( '' );
	const [ endDate, setEndDate ] = useState( '' );
	const [ phase, setPhase ] = useState< Phase >( 'idle' );
	const [ checked, setChecked ] = useState( 0 );
	const [ totalOrders, setTotalOrders ] = useState( 0 );
	const [ totals, setTotals ] = useState< Totals | null >( null );
	const [ error, setError ] = useState( '' );

	const busy = phase === 'previewing' || phase === 'committing';

	const resetState = () => {
		setPhase( 'idle' );
		setTotals( null );
		setChecked( 0 );
		setTotalOrders( 0 );
		setError( '' );
	};

	const onStartChange = ( value: string ) => {
		setStartDate( value );
		resetState();
	};

	const onEndChange = ( value: string ) => {
		setEndDate( value );
		resetState();
	};

	/**
	 * Walks every page of the date range, sequentially, and sums the results.
	 */
	const runBatches = async ( commit: boolean ): Promise< Totals > => {
		const customers = new Set< number >();
		const totalsAcc: Totals = {
			orders: 0,
			points: 0,
			customers: 0,
			skipped: emptySkips(),
		};
		let page = 1;
		let scanned = 0;

		setChecked( 0 );
		setTotalOrders( 0 );

		for ( ;; ) {
			const data: any = await apiFetch( {
				path: 'backfill/batch',
				method: 'POST',
				data: {
					start_date: startDate,
					end_date: endDate || undefined,
					page,
					per_page: PER_PAGE,
					commit,
				},
			} );
			const batch = data as BatchResult;

			scanned += batch.scanned;
			totalsAcc.orders += batch.credited_orders;
			totalsAcc.points += batch.points;
			batch.customer_ids.forEach( ( id ) => customers.add( id ) );
			( Object.keys( totalsAcc.skipped ) as Array< keyof SkipCounts > ).forEach(
				( key ) => {
					totalsAcc.skipped[ key ] += batch.skipped[ key ] || 0;
				}
			);
			setChecked( scanned );
			setTotalOrders( batch.total_orders );

			if ( batch.done || batch.scanned === 0 ) {
				break;
			}
			page += 1;
		}

		totalsAcc.customers = customers.size;
		return totalsAcc;
	};

	const run = async ( commit: boolean ) => {
		setError( '' );
		setPhase( commit ? 'committing' : 'previewing' );
		try {
			const result = await runBatches( commit );
			setTotals( result );
			setPhase( commit ? 'done' : 'previewed' );
			if ( commit ) {
				addToast(
					__( 'Points awarded for past orders.', 'pointbay-loyalty-points-referral-rewards-woo' ),
					'success'
				);
			}
		} catch ( e: any ) {
			const message =
				( e && e.message ) ||
				__( 'Something went wrong. Please try again.', 'pointbay-loyalty-points-referral-rewards-woo' );
			setError( message );
			setPhase( 'idle' );
			addToast( message, 'error' );
		}
	};

	const datesInvalid =
		! startDate || ( endDate !== '' && endDate < startDate );

	const percent =
		totalOrders > 0 ? Math.min( 100, Math.round( ( checked / totalOrders ) * 100 ) ) : 0;

	const skipLabels: Array< [ keyof SkipCounts, string ] > = [
		[ 'guest', __( 'Guest orders', 'pointbay-loyalty-points-referral-rewards-woo' ) ],
		[ 'already_awarded', __( 'Already awarded', 'pointbay-loyalty-points-referral-rewards-woo' ) ],
		[ 'refunded', __( 'Fully refunded', 'pointbay-loyalty-points-referral-rewards-woo' ) ],
		[ 'zero_points', __( 'Would earn zero', 'pointbay-loyalty-points-referral-rewards-woo' ) ],
	];

	const renderSkips = ( t: Totals ) => (
		<ul style={ { margin: '8px 0 0 18px', listStyle: 'disc' } }>
			{ skipLabels.map( ( [ key, label ] ) => (
				<li key={ key }>
					{ label }: { t.skipped[ key ] }
				</li>
			) ) }
		</ul>
	);

	return (
		<div
			className="pointbay-backfill-tool"
			style={ {
				background: '#fff',
				border: '1px solid #c3c4c7',
				borderRadius: 4,
				padding: 16,
				maxWidth: 720,
				marginTop: 16,
			} }
		>
			<h3 style={ { marginTop: 0 } }>
				{ __( 'Award points for past orders', 'pointbay-loyalty-points-referral-rewards-woo' ) }
			</h3>
			<p>
				{ __(
					'Give points for completed orders placed before you installed PointBay or before earning was set up. Guest orders, orders that were already awarded and fully refunded orders are skipped. Each order is only ever credited once, so it is safe to run this again.',
					'pointbay-loyalty-points-referral-rewards-woo'
				) }
			</p>

			<div style={ { display: 'flex', gap: 16, flexWrap: 'wrap', margin: '12px 0' } }>
				<label>
					<div>{ __( 'Start date (required)', 'pointbay-loyalty-points-referral-rewards-woo' ) }</div>
					<input
						type="date"
						value={ startDate }
						max={ endDate || undefined }
						disabled={ busy }
						onChange={ ( e ) => onStartChange( e.target.value ) }
					/>
				</label>
				<label>
					<div>{ __( 'End date (optional)', 'pointbay-loyalty-points-referral-rewards-woo' ) }</div>
					<input
						type="date"
						value={ endDate }
						min={ startDate || undefined }
						disabled={ busy }
						onChange={ ( e ) => onEndChange( e.target.value ) }
					/>
				</label>
			</div>

			{ ( phase === 'idle' || phase === 'previewing' ) && (
				<ClassicButton
					type="button"
					variant="secondary"
					loading={ phase === 'previewing' }
					disabled={ datesInvalid || busy }
					onClick={ () => run( false ) }
				>
					{ __( 'Preview', 'pointbay-loyalty-points-referral-rewards-woo' ) }
				</ClassicButton>
			) }

			{ busy && (
				<div style={ { marginTop: 12 } } role="status" aria-live="polite">
					<div
						style={ {
							background: '#dcdcde',
							borderRadius: 4,
							height: 8,
							overflow: 'hidden',
							maxWidth: 360,
						} }
					>
						<div
							style={ {
								background: '#2271b1',
								width: `${ percent }%`,
								height: '100%',
							} }
						/>
					</div>
					<p>
						{ sprintf(
							/* translators: 1: orders checked so far, 2: total orders in the date range. */
							__( 'Checked %1$s of %2$s orders', 'pointbay-loyalty-points-referral-rewards-woo' ),
							String( checked ),
							String( totalOrders )
						) }
					</p>
				</div>
			) }

			{ error && (
				<div className="notice notice-error inline" role="alert">
					<p>{ error }</p>
				</div>
			) }

			{ phase === 'previewed' && totals && (
				<div style={ { marginTop: 12 } }>
					{ totals.orders === 0 ? (
						<p>
							<strong>
								{ __( 'Nothing to award for this date range.', 'pointbay-loyalty-points-referral-rewards-woo' ) }
							</strong>
						</p>
					) : (
						<>
							<p>
								{ sprintf(
									/* translators: 1: number of orders, 2: number of customers, 3: total points. */
									__( '%1$s orders from %2$s customers will earn %3$s points in total.', 'pointbay-loyalty-points-referral-rewards-woo' ),
									String( totals.orders ),
									String( totals.customers ),
									String( totals.points )
								) }
							</p>
							<p>
								<strong>
									{ sprintf(
										/* translators: 1: total points, 2: number of customers, 3: number of orders. */
										__( 'This will add %1$s points to %2$s customers for %3$s orders. This cannot be undone in bulk.', 'pointbay-loyalty-points-referral-rewards-woo' ),
										String( totals.points ),
										String( totals.customers ),
										String( totals.orders )
									) }
								</strong>
							</p>
						</>
					) }
					<p style={ { marginBottom: 0 } }>{ __( 'Skipped:', 'pointbay-loyalty-points-referral-rewards-woo' ) }</p>
					{ renderSkips( totals ) }
					<div style={ { display: 'flex', gap: 8, marginTop: 12 } }>
						{ totals.orders > 0 && (
							<ClassicButton
								type="button"
								variant="primary"
								onClick={ () => run( true ) }
							>
								{ __( 'Confirm and award points', 'pointbay-loyalty-points-referral-rewards-woo' ) }
							</ClassicButton>
						) }
						<ClassicButton
							type="button"
							variant="secondary"
							onClick={ resetState }
						>
							{ totals.orders > 0
								? __( 'Cancel', 'pointbay-loyalty-points-referral-rewards-woo' )
								: __( 'Back', 'pointbay-loyalty-points-referral-rewards-woo' ) }
						</ClassicButton>
					</div>
				</div>
			) }

			{ phase === 'done' && totals && (
				<div className="notice notice-success inline" style={ { marginTop: 12 } }>
					<p>
						{ sprintf(
							/* translators: 1: orders credited, 2: customers credited, 3: points awarded. */
							__( 'Done: %1$s orders credited, %2$s customers, %3$s points', 'pointbay-loyalty-points-referral-rewards-woo' ),
							String( totals.orders ),
							String( totals.customers ),
							String( totals.points )
						) }
					</p>
					{ renderSkips( totals ) }
				</div>
			) }
		</div>
	);
};

export default BackfillTool;
