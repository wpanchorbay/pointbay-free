import React from 'react';

interface ClassicTableColumn {
	key: string;
	label: string;
	className?: string;
	sortable?: boolean;
}

interface ClassicTableProps< T > {
	columns: ClassicTableColumn[];
	data: T[];
	renderCell: ( item: T, columnKey: string ) => React.ReactNode;
	keyField: keyof T;
	className?: string;
	orderby?: string;
	order?: 'asc' | 'desc';
	onSort?: ( columnKey: string ) => void;
	selectable?: boolean;
	selectedKeys?: Array< string | number >;
	onToggleSelect?: ( key: string | number ) => void;
	onToggleSelectAll?: ( selected: boolean ) => void;
}

/**
 * WordPress admin list table using `wp-list-table`, `widefat`, `striped`.
 */
export function ClassicTable< T >( {
	columns,
	data,
	renderCell,
	keyField,
	className = '',
	orderby,
	order,
	onSort,
	selectable = false,
	selectedKeys = [],
	onToggleSelect,
	onToggleSelectAll,
}: ClassicTableProps< T > ) {
	const allSelected = data.length > 0 && selectedKeys.length === data.length;

	return (
		<table className={ `wp-list-table widefat striped ${ className }` }>
			<thead>
				<tr>
					{ selectable && (
						<td className="manage-column column-cb check-column">
							<input
								type="checkbox"
								checked={ allSelected }
								onChange={ ( e ) =>
									onToggleSelectAll?.( e.target.checked )
								}
							/>
						</td>
					) }
					{ columns.map( ( col ) => {
						if ( ! col.sortable ) {
							return (
								<th
									key={ col.key }
									className={ col.className || '' }
								>
									{ col.label }
								</th>
							);
						}
						const isSorted = orderby === col.key;
						const sortStateClass = isSorted
							? `sorted ${ order === 'asc' ? 'asc' : 'desc' }`
							: 'sortable desc';
						return (
							<th
								key={ col.key }
								className={ `manage-column ${ sortStateClass } ${
									col.className || ''
								}` }
							>
								<a
									href="#"
									onClick={ ( e ) => {
										e.preventDefault();
										onSort?.( col.key );
									} }
								>
									<span>{ col.label }</span>
									<span className="sorting-indicator"></span>
								</a>
							</th>
						);
					} ) }
				</tr>
			</thead>
			<tbody>
				{ data.length === 0 ? (
					<tr>
						<td colSpan={ columns.length + ( selectable ? 1 : 0 ) }>
							No items found.
						</td>
					</tr>
				) : (
					data.map( ( item ) => {
						const key = item[ keyField ] as unknown as
							| string
							| number;
						return (
							<tr key={ String( key ) }>
								{ selectable && (
									<th scope="row" className="check-column">
										<input
											type="checkbox"
											checked={ selectedKeys.includes(
												key
											) }
											onChange={ () =>
												onToggleSelect?.( key )
											}
										/>
									</th>
								) }
								{ columns.map( ( col ) => (
									<td
										key={ col.key }
										className={ col.className || '' }
									>
										{ renderCell( item, col.key ) }
									</td>
								) ) }
							</tr>
						);
					} )
				) }
			</tbody>
		</table>
	);
}
