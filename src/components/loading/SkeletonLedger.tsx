import React from 'react';

export const SkeletonLedger: React.FC = () => {
	return (
		<table className="wp-list-table widefat striped loyaltybay-animate-pulse">
			<thead>
				<tr>
					{ Array.from( { length: 8 } ).map( ( _, i ) => (
						<th key={ i }>
							<div
								className="loyaltybay-h-3 loyaltybay-bg-gray-200 loyaltybay-rounded"
								style={ { width: '60%' } }
							></div>
						</th>
					) ) }
				</tr>
			</thead>
			<tbody>
				{ Array.from( { length: 10 } ).map( ( rowValue, row ) => (
					<tr key={ row }>
						{ Array.from( { length: 8 } ).map(
							( colValue, col ) => (
								<td key={ col }>
									<div
										className="loyaltybay-h-3 loyaltybay-bg-gray-200 loyaltybay-rounded"
										style={ {
											width: `${
												Math.random() * 30 + 50
											}%`,
										} }
									></div>
								</td>
							)
						) }
					</tr>
				) ) }
			</tbody>
		</table>
	);
};
