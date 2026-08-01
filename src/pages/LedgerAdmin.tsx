import { FC, useState, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { ClassicTable } from '../components/classics/ClassicTable';
import { ClassicButton } from '../components/classics/ClassicButton';
import { ClassicInput } from '../components/classics/ClassicInput';
import { ClassicSelect } from '../components/classics/ClassicSelect';
import { ClassicMultiSelect } from '../components/classics/ClassicMultiSelect';
import { SkeletonLedger } from '../components/loading/SkeletonLedger';
import CustomModal from '../components/common/CustomModal';
import {
	ClassicSettingsTable,
	SettingsField,
} from '../components/classics/ClassicSettingsTable';
import { useToast } from '../store/toast/use-toast';

interface LedgerEntry {
	id: number;
	user_id: number;
	user_email: string;
	user_name: string;
	amount: number;
	transaction_type: 'credit' | 'debit';
	reference_type: string;
	description: string;
	created_at: string;
}

const REFERENCE_TYPE_LABELS: Record< string, string > = {
	order: 'Order',
	order_reversal: 'Order Reversal',
	refund: 'Refund',
	review: 'Review',
	admin: 'Manual Adjustment',
};

// Turns an unmapped snake_case reference type into a readable label,
// e.g. 'referral_signup' -> 'Referral Signup'.
const toTitleCase = ( value: string ) =>
	value
		.split( '_' )
		.filter( Boolean )
		.map( ( word ) => word.charAt( 0 ).toUpperCase() + word.slice( 1 ) )
		.join( ' ' );

const referenceTypeLabel = ( value: string ) =>
	REFERENCE_TYPE_LABELS[ value ] || toTitleCase( value ) || value;

const LedgerAdmin: FC = () => {
	const [ data, setData ] = useState< LedgerEntry[] >( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ page, setPage ] = useState( 1 );
	const [ pageInput, setPageInput ] = useState( '1' );
	const [ loading, setLoading ] = useState( false );
	const [ adjustOpen, setAdjustOpen ] = useState( false );
	const [ adjUserId, setAdjUserId ] = useState( '' );
	const [ adjAmount, setAdjAmount ] = useState( '' );
	const [ adjType, setAdjType ] = useState( 'credit' );
	const [ adjReason, setAdjReason ] = useState( '' );
	const { addToast } = useToast();

	const [ search, setSearch ] = useState( '' );
	const [ searchInput, setSearchInput ] = useState( '' );
	const [ transactionType, setTransactionType ] = useState( '' );
	const [ referenceType, setReferenceType ] = useState( '' );
	const [ pendingTransactionType, setPendingTransactionType ] =
		useState( '' );
	const [ pendingReferenceType, setPendingReferenceType ] = useState( '' );
	const [ orderby, setOrderby ] = useState( 'id' );
	const [ order, setOrder ] = useState< 'asc' | 'desc' >( 'desc' );
	const [ selected, setSelected ] = useState< Array< string | number > >(
		[]
	);
	const [ bulkAction, setBulkAction ] = useState( '' );

	const perPage = 20;
	const totalPages = Math.max( 1, Math.ceil( total / perPage ) );

	const buildLedgerParams = (
		overridePage?: number,
		overridePerPage?: number
	) => {
		const params = new URLSearchParams( {
			page: String( overridePage ?? page ),
			per_page: String( overridePerPage ?? perPage ),
			orderby,
			order,
		} );
		if ( search ) params.set( 'search', search );
		if ( transactionType )
			params.set( 'transaction_type', transactionType );
		if ( referenceType ) params.set( 'reference_type', referenceType );
		return params;
	};

	const fetchData = async () => {
		setLoading( true );
		try {
			const params = buildLedgerParams();

			const res: any = await apiFetch( {
				path: `/pointbay/v1/ledger?${ params.toString() }`,
			} );
			setData( res.data );
			setTotal( res.total );
			setSelected( [] );
		} catch ( e: any ) {
			addToast( e.message || 'Error fetching ledger.', 'error' );
		}
		setLoading( false );
	};

	useEffect( () => {
		fetchData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ page, orderby, order, search, transactionType, referenceType ] );

	useEffect( () => {
		setPageInput( String( page ) );
	}, [ page ] );

	const handleAdjust = async ( e: React.FormEvent ) => {
		e.preventDefault();
		const userId = parseInt( adjUserId, 10 );
		const amount = parseInt( adjAmount, 10 );
		if ( Number.isNaN( userId ) || Number.isNaN( amount ) ) {
			addToast(
				'Please select a user and enter a valid amount.',
				'error'
			);
			return;
		}
		try {
			await apiFetch( {
				path: `/pointbay/v1/user-points`,
				method: 'POST',
				data: {
					user_id: userId,
					amount: amount,
					type: adjType,
					reason: adjReason,
				},
			} );
			addToast( 'Points adjusted successfully.', 'success' );
			setAdjustOpen( false );
			setAdjUserId( '' );
			setAdjAmount( '' );
			setAdjReason( '' );
			fetchData();
		} catch ( e: any ) {
			addToast( e.message || 'Error adjusting points.', 'error' );
		}
	};

	const exportRows = ( rows: LedgerEntry[], filenameSuffix: string ) => {
		if ( ! rows || rows.length === 0 ) {
			addToast( 'No data to export.', 'error' );
			return;
		}
		const headers = [
			'ID',
			'User ID',
			'User Name',
			'User Email',
			'Type',
			'Amount',
			'Reference',
			'Description',
			'Date',
		];
		const csvRows = rows.map( ( row ) => [
			row.id,
			row.user_id,
			row.user_name,
			row.user_email,
			row.transaction_type.toUpperCase(),
			row.amount,
			referenceTypeLabel( row.reference_type ),
			`"${ row.description.replace( /"/g, '""' ) }"`,
			row.created_at,
		] );
		const csvContent = [
			headers.join( ',' ),
			...csvRows.map( ( r ) => r.join( ',' ) ),
		].join( '\n' );
		const blob = new Blob( [ csvContent ], {
			type: 'text/csv;charset=utf-8;',
		} );
		const url = URL.createObjectURL( blob );
		const link = document.createElement( 'a' );
		link.setAttribute( 'href', url );
		link.setAttribute(
			'download',
			`pointbay_ledger_${ filenameSuffix }_${
				new Date().toISOString().split( 'T' )[ 0 ]
			}.csv`
		);
		document.body.appendChild( link );
		link.click();
		document.body.removeChild( link );
		URL.revokeObjectURL( url );
		addToast( 'Export successful.', 'success' );
	};

	const handleExportAllCSV = async () => {
		try {
			const params = buildLedgerParams( 1, 99999 );
			const res: any = await apiFetch( {
				path: `/pointbay/v1/ledger?${ params.toString() }`,
			} );
			exportRows( res.data, 'export' );
		} catch ( e: any ) {
			addToast( e.message || 'Error exporting data.', 'error' );
		}
	};

	const handleApplyBulkAction = () => {
		if ( bulkAction === 'export_selected' ) {
			const rows = data.filter( ( row ) => selected.includes( row.id ) );
			exportRows( rows, 'selected' );
		}
		setBulkAction( '' );
	};

	const handleSort = ( columnKey: string ) => {
		if ( orderby === columnKey ) {
			setOrder( order === 'asc' ? 'desc' : 'asc' );
		} else {
			setOrderby( columnKey );
			setOrder( 'desc' );
		}
		setPage( 1 );
	};

	const handleApplyFilters = ( e: React.FormEvent ) => {
		e.preventDefault();
		setSearch( searchInput );
		setTransactionType( pendingTransactionType );
		setReferenceType( pendingReferenceType );
		setPage( 1 );
	};

	const handlePageInputSubmit = ( e: React.FormEvent ) => {
		e.preventDefault();
		const target = parseInt( pageInput, 10 );
		if ( ! Number.isNaN( target ) ) {
			setPage( Math.min( Math.max( target, 1 ), totalPages ) );
		}
	};

	const columns = [
		{ key: 'id', label: 'ID', sortable: true },
		{ key: 'user', label: 'User' },
		{ key: 'type', label: 'Type' },
		{ key: 'amount', label: 'Amount', sortable: true },
		{ key: 'reference', label: 'Reference' },
		{ key: 'description', label: 'Description' },
		{ key: 'date', label: 'Date', sortable: true },
	];

	const columnKeyMap: Record< string, string > = {
		id: 'id',
		amount: 'amount',
		date: 'created_at',
	};
	const backendFieldToColumnKey: Record< string, string > = {
		id: 'id',
		amount: 'amount',
		created_at: 'date',
	};

	const renderTablenav = ( position: 'top' | 'bottom' ) => (
		<div className={ `tablenav ${ position }` }>
			{ position === 'top' && (
				<div className="alignleft actions bulkactions">
					<label
						htmlFor="bulk-action-selector-top"
						className="screen-reader-text"
					>
						{ __( 'Select bulk action', 'pointbay-loyalty-points-referral-rewards-woo' ) }
					</label>
					<select
						id="bulk-action-selector-top"
						value={ bulkAction }
						onChange={ ( e ) => setBulkAction( e.target.value ) }
					>
						<option value="">
							{ __( 'Bulk actions', 'pointbay-loyalty-points-referral-rewards-woo' ) }
						</option>
						<option value="export_selected">
							{ __( 'Export Selected', 'pointbay-loyalty-points-referral-rewards-woo' ) }
						</option>
					</select>
					<ClassicButton
						variant="secondary"
						className="action"
						disabled={ ! bulkAction || selected.length === 0 }
						onClick={ handleApplyBulkAction }
					>
						{ __( 'Apply', 'pointbay-loyalty-points-referral-rewards-woo' ) }
					</ClassicButton>
				</div>
			) }
			<div className="tablenav-pages">
				<span className="displaying-num">
					{ total === 1
						? __( '1 item', 'pointbay-loyalty-points-referral-rewards-woo' )
						: `${ total } ${ __( 'items', 'pointbay-loyalty-points-referral-rewards-woo' ) }` }
				</span>
				<span className="pagination-links">
					<button
						className={ `button first-page ${
							page === 1 ? 'disabled' : ''
						}` }
						disabled={ page === 1 }
						onClick={ () => setPage( 1 ) }
					>
						<span className="screen-reader-text">
							{ __( 'First page', 'pointbay-loyalty-points-referral-rewards-woo' ) }
						</span>
						<span aria-hidden="true">«</span>
					</button>
					<button
						className={ `button prev-page ${
							page === 1 ? 'disabled' : ''
						}` }
						disabled={ page === 1 }
						onClick={ () => setPage( page - 1 ) }
					>
						<span className="screen-reader-text">
							{ __( 'Previous page', 'pointbay-loyalty-points-referral-rewards-woo' ) }
						</span>
						<span aria-hidden="true">‹</span>
					</button>
					<span className="paging-input">
						<form
							onSubmit={ handlePageInputSubmit }
							className="pointbay-inline"
						>
							<label
								htmlFor={ `current-page-selector-${ position }` }
								className="screen-reader-text"
							>
								{ __( 'Current Page', 'pointbay-loyalty-points-referral-rewards-woo' ) }
							</label>
							<input
								id={ `current-page-selector-${ position }` }
								className="current-page"
								type="text"
								size={ 2 }
								value={ pageInput }
								onChange={ ( e ) =>
									setPageInput( e.target.value )
								}
							/>
							<span className="tablenav-paging-text">
								{ ' ' }
								{ __( 'of', 'pointbay-loyalty-points-referral-rewards-woo' ) }{ ' ' }
								<span className="total-pages">
									{ totalPages }
								</span>
							</span>
						</form>
					</span>
					<button
						className={ `button next-page ${
							page >= totalPages ? 'disabled' : ''
						}` }
						disabled={ page >= totalPages }
						onClick={ () => setPage( page + 1 ) }
					>
						<span className="screen-reader-text">
							{ __( 'Next page', 'pointbay-loyalty-points-referral-rewards-woo' ) }
						</span>
						<span aria-hidden="true">›</span>
					</button>
					<button
						className={ `button last-page ${
							page >= totalPages ? 'disabled' : ''
						}` }
						disabled={ page >= totalPages }
						onClick={ () => setPage( totalPages ) }
					>
						<span className="screen-reader-text">
							{ __( 'Last page', 'pointbay-loyalty-points-referral-rewards-woo' ) }
						</span>
						<span aria-hidden="true">»</span>
					</button>
				</span>
			</div>
		</div>
	);

	const adjustFields: SettingsField[] = [
		{
			id: 'pointbay-adjust-user',
			label: __( 'User', 'pointbay-loyalty-points-referral-rewards-woo' ),
			render: () => (
				<ClassicMultiSelect
					id="pointbay-adjust-user"
					differentDropdownWidth
					value={ adjUserId ? [ parseInt( adjUserId ) ] : [] }
					onChange={ ( val ) =>
						setAdjUserId(
							val.length > 0
								? val[ val.length - 1 ].toString()
								: ''
						)
					}
					endpoint="/pointbay/v1/user-points/search-users"
					placeholder={ __( 'Search users…', 'pointbay-loyalty-points-referral-rewards-woo' ) }
					size="regular"
				/>
			),
		},
		{
			id: 'pointbay-adjust-type',
			label: __( 'Type', 'pointbay-loyalty-points-referral-rewards-woo' ),
			render: () => (
				<ClassicSelect
					id="pointbay-adjust-type"
					value={ adjType }
					onChange={ ( val ) => setAdjType( val as string ) }
					options={ [
						{ value: 'credit', label: 'Credit (+)' },
						{ value: 'debit', label: 'Debit (-)' },
					] }
					size="short"
				/>
			),
		},
		{
			id: 'pointbay-adjust-amount',
			label: __( 'Amount', 'pointbay-loyalty-points-referral-rewards-woo' ),
			render: () => (
				<ClassicInput
					id="pointbay-adjust-amount"
					type="number"
					min="1"
					value={ adjAmount }
					onChange={ ( e ) => setAdjAmount( e.target.value ) }
					required
					size="small"
				/>
			),
		},
		{
			id: 'pointbay-adjust-reason',
			label: __( 'Reason', 'pointbay-loyalty-points-referral-rewards-woo' ),
			render: () => (
				<ClassicInput
					id="pointbay-adjust-reason"
					type="text"
					value={ adjReason }
					onChange={ ( e ) => setAdjReason( e.target.value ) }
					required
					size="regular"
				/>
			),
		},
	];

	return (
		<div className="wrap pointbay-ledger-page">
			<div className="pointbay-flex pointbay-items-center pointbay-justify-between">
				<h1 className="wp-heading-inline pointbay-ignore-preflight">
					{ __( 'Points History', 'pointbay-loyalty-points-referral-rewards-woo' ) }
				</h1>
				<div className="pointbay-flex pointbay-gap-2">
					<ClassicButton
						variant="secondary"
						onClick={ handleExportAllCSV }
					>
						{ __( 'Export to CSV', 'pointbay-loyalty-points-referral-rewards-woo' ) }
					</ClassicButton>
					<ClassicButton
						variant="primary"
						onClick={ () => setAdjustOpen( true ) }
					>
						{ __( 'Adjust Points', 'pointbay-loyalty-points-referral-rewards-woo' ) }
					</ClassicButton>
				</div>
			</div>
			<hr className="wp-header-end" />

			<CustomModal
				isOpen={ adjustOpen }
				onClose={ () => setAdjustOpen( false ) }
				title={ __( 'Adjust Points', 'pointbay-loyalty-points-referral-rewards-woo' ) }
				classNames={ { body: '!pointbay-overflow-visible' } }
				footer={
					<ClassicButton
						variant="primary"
						type="submit"
						form="pointbay-adjust-points-form"
					>
						{ __( 'Submit', 'pointbay-loyalty-points-referral-rewards-woo' ) }
					</ClassicButton>
				}
			>
				<form id="pointbay-adjust-points-form" onSubmit={ handleAdjust }>
					<ClassicSettingsTable fields={ adjustFields } />
				</form>
			</CustomModal>

			<form
				onSubmit={ handleApplyFilters }
				className="tablenav top pointbay-mt-4"
			>
				<div className="alignleft actions pointbay-flex pointbay-gap-2 pointbay-items-center">
					<label
						className="screen-reader-text"
						htmlFor="ledger-search-input"
					>
						{ __( 'Search Ledger', 'pointbay-loyalty-points-referral-rewards-woo' ) }
					</label>
					<input
						type="search"
						id="ledger-search-input"
						value={ searchInput }
						onChange={ ( e ) => setSearchInput( e.target.value ) }
						placeholder={ __(
							'Search by user name or email',
							'pointbay-loyalty-points-referral-rewards-woo'
						) }
					/>

					<label
						htmlFor="filter-by-type"
						className="screen-reader-text"
					>
						{ __( 'Filter by type', 'pointbay-loyalty-points-referral-rewards-woo' ) }
					</label>
					<select
						id="filter-by-type"
						value={ pendingTransactionType }
						onChange={ ( e ) =>
							setPendingTransactionType( e.target.value )
						}
					>
						<option value="">
							{ __( 'All types', 'pointbay-loyalty-points-referral-rewards-woo' ) }
						</option>
						<option value="credit">
							{ __( 'Credit', 'pointbay-loyalty-points-referral-rewards-woo' ) }
						</option>
						<option value="debit">
							{ __( 'Debit', 'pointbay-loyalty-points-referral-rewards-woo' ) }
						</option>
					</select>

					<label
						htmlFor="filter-by-reference"
						className="screen-reader-text"
					>
						{ __( 'Filter by reference', 'pointbay-loyalty-points-referral-rewards-woo' ) }
					</label>
					<select
						id="filter-by-reference"
						value={ pendingReferenceType }
						onChange={ ( e ) =>
							setPendingReferenceType( e.target.value )
						}
					>
						<option value="">
							{ __( 'All references', 'pointbay-loyalty-points-referral-rewards-woo' ) }
						</option>
						{ Object.entries( REFERENCE_TYPE_LABELS ).map(
							( [ value, label ] ) => (
								<option key={ value } value={ value }>
									{ label }
								</option>
							)
						) }
					</select>
					<input
						type="submit"
						className="button"
						value={ __( 'Apply Filters', 'pointbay-loyalty-points-referral-rewards-woo' ) }
					/>
				</div>
			</form>

			{ loading ? (
				<SkeletonLedger />
			) : (
				<>
					{ renderTablenav( 'top' ) }
					<ClassicTable
						columns={ columns }
						data={ data }
						keyField="id"
						orderby={ backendFieldToColumnKey[ orderby ] }
						order={ order }
						onSort={ ( columnKey ) =>
							handleSort( columnKeyMap[ columnKey ] || columnKey )
						}
						selectable
						selectedKeys={ selected }
						onToggleSelect={ ( key ) =>
							setSelected( ( prev ) =>
								prev.includes( key )
									? prev.filter( ( k ) => k !== key )
									: [ ...prev, key ]
							)
						}
						onToggleSelectAll={ ( all ) =>
							setSelected( all ? data.map( ( d ) => d.id ) : [] )
						}
						renderCell={ ( item, columnKey ) => {
							if ( columnKey === 'user' )
								return (
									<>
										{ item.user_name } ({ item.user_email })
									</>
								);
							if ( columnKey === 'type' )
								return (
									<span
										className={ `pointbay-status-pill pointbay-status-pill--${ item.transaction_type }` }
									>
										{ item.transaction_type === 'credit'
											? __( 'Credit', 'pointbay-loyalty-points-referral-rewards-woo' )
											: __( 'Debit', 'pointbay-loyalty-points-referral-rewards-woo' ) }
									</span>
								);
							if ( columnKey === 'reference' )
								return (
									<span
										className={ `pointbay-status-pill pointbay-status-pill--reference` }
									>
										{ referenceTypeLabel(
											item.reference_type
										) }
									</span>
								);
							if ( columnKey === 'date' )
								return (
									<>
										{ new Date(
											item.created_at
										).toLocaleString() }
									</>
								);
							return (
								<>{ item[ columnKey as keyof LedgerEntry ] }</>
							);
						} }
					/>
					{ renderTablenav( 'bottom' ) }
				</>
			) }
		</div>
	);
};

export default LedgerAdmin;
