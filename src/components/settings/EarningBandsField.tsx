import React from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { ClassicRepeater, ClassicInput } from '../classics';

export interface EarningBand {
	id: string;
	min: number;
	max: number | null;
	points: number;
}

interface EarningBandsFieldProps {
	bands: EarningBand[];
	bandMode: string;
	onChange: ( bands: EarningBand[] ) => void;
}

/**
 * Formats one band as its accordion heading, e.g. "$50.00 – $99.99 → 200 points".
 */
const bandTitle = ( band: EarningBand, bandMode: string ): string => {
	const min = Number( band.min ?? 0 ).toFixed( 2 );
	const max =
		band.max === null || band.max === undefined || band.max === ( '' as any )
			? __( 'and above', 'pointbay-loyalty-points-referral-rewards-woo' )
			: `$${ Number( band.max ).toFixed( 2 ) }`;

	const range =
		max === __( 'and above', 'pointbay-loyalty-points-referral-rewards-woo' )
			? `$${ min } ${ max }`
			: `$${ min } – ${ max }`;

	const award =
		bandMode === 'rate'
			? sprintf(
					/* translators: %s: points awarded per currency unit. */
					__( '%s points per $1', 'pointbay-loyalty-points-referral-rewards-woo' ),
					String( band.points ?? 0 )
			  )
			: sprintf(
					/* translators: %s: number of points awarded. */
					__( '%s points', 'pointbay-loyalty-points-referral-rewards-woo' ),
					String( band.points ?? 0 )
			  );

	return `${ range } → ${ award }`;
};

/**
 * Returns the indexes of bands that overlap the one before them.
 *
 * Advisory only. The server sorts and resolves overlaps on save regardless of
 * what this reports — showing the operator the problem is the point, not
 * gating the save on it.
 */
const overlappingIndexes = ( bands: EarningBand[] ): number[] => {
	const sorted = [ ...bands ]
		.map( ( band, index ) => ( { band, index } ) )
		.sort( ( a, b ) => Number( a.band.min ?? 0 ) - Number( b.band.min ?? 0 ) );

	const flagged: number[] = [];

	for ( let i = 1; i < sorted.length; i++ ) {
		const prev = sorted[ i - 1 ].band;
		const curr = sorted[ i ].band;

		if ( prev.max === null || prev.max === undefined ) {
			flagged.push( sorted[ i ].index );
			continue;
		}

		if ( Number( curr.min ?? 0 ) < Number( prev.max ) ) {
			flagged.push( sorted[ i ].index );
		}
	}

	return flagged;
};

/**
 * Repeatable editor for the order-value earning bands.
 */
export const EarningBandsField: React.FC< EarningBandsFieldProps > = ( {
	bands,
	bandMode,
	onChange,
} ) => {
	const rows = Array.isArray( bands ) ? bands : [];
	const overlaps = overlappingIndexes( rows );

	const update = ( index: number, patch: Partial< EarningBand > ) => {
		const next = rows.map( ( band, i ) =>
			i === index ? { ...band, ...patch } : band
		);
		onChange( next );
	};

	const add = () => {
		const highest = rows.reduce(
			( acc, band ) =>
				band.max === null || band.max === undefined
					? acc
					: Math.max( acc, Number( band.max ) ),
			0
		);

		onChange( [
			...rows,
			{
				id: `band_${ Date.now() }`,
				min: highest,
				max: null,
				points: 0,
			},
		] );
	};

	const remove = ( id: string ) => {
		onChange( rows.filter( ( band ) => band.id !== id ) );
	};

	// Sorting on blur rather than on every keystroke: re-ordering mid-edit
	// would move the row out from under the operator's cursor.
	const sortRows = () => {
		onChange(
			[ ...rows ].sort(
				( a, b ) => Number( a.min ?? 0 ) - Number( b.min ?? 0 )
			)
		);
	};

	const items = rows.map( ( band, index ) => ( {
		...band,
		id: band.id || `band_${ index }`,
		title: bandTitle( band, bandMode ),
	} ) );

	return (
		<div className="pointbay-earning-bands">
			<ClassicRepeater
				items={ items }
				onAdd={ add }
				onRemove={ remove }
				addLabel={ __(
					'Add band',
					'pointbay-loyalty-points-referral-rewards-woo'
				) }
				renderItem={ ( _item, index ) => (
					<div>
						{ overlaps.includes( index ) && (
							<p className="pointbay-band-warning" style={ { color: '#b32d2e' } }>
								{ __(
									'This band overlaps the one below it. On save, its lower bound will be moved up to remove the overlap.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							</p>
						) }
						<ClassicInput
							type="number"
							min="0"
							step="0.01"
							label={ __(
								'From ($)',
								'pointbay-loyalty-points-referral-rewards-woo'
							) }
							value={ rows[ index ]?.min ?? 0 }
							onBlur={ sortRows }
							onChange={ ( e ) =>
								update( index, {
									min: parseFloat( e.target.value ) || 0,
								} )
							}
							size="small"
						/>
						<ClassicInput
							type="number"
							min="0"
							step="0.01"
							label={ __(
								'To ($)',
								'pointbay-loyalty-points-referral-rewards-woo'
							) }
							value={
								rows[ index ]?.max === null ||
								rows[ index ]?.max === undefined
									? ''
									: rows[ index ].max
							}
							onChange={ ( e ) =>
								update( index, {
									max:
										e.target.value === ''
											? null
											: parseFloat( e.target.value ),
								} )
							}
							description={ __(
								'Leave empty for the top band, which covers every order above "From".',
								'pointbay-loyalty-points-referral-rewards-woo'
							) }
							size="small"
						/>
						<ClassicInput
							type="number"
							min="0"
							step={ bandMode === 'rate' ? '0.01' : '1' }
							label={
								bandMode === 'rate'
									? __(
											'Points per $1',
											'pointbay-loyalty-points-referral-rewards-woo'
									  )
									: __(
											'Points awarded',
											'pointbay-loyalty-points-referral-rewards-woo'
									  )
							}
							value={ rows[ index ]?.points ?? 0 }
							onChange={ ( e ) =>
								update( index, {
									points: parseFloat( e.target.value ) || 0,
								} )
							}
							size="small"
						/>
					</div>
				) }
			/>
			{ rows.length > 0 && (
				<p className="description">
					{ __(
						'While any band is defined, the per-dollar rate above is not used. An order that falls outside every band earns nothing, so make sure the ladder starts at $0.',
						'pointbay-loyalty-points-referral-rewards-woo'
					) }
				</p>
			) }
		</div>
	);
};
