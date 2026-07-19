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
	referral: 'Referral',
	referral_signup: 'Referral Signup',
	referral_reversal: 'Referral Reversal',
	referral_signup_reversal: 'Referral Signup Reversal',
	admin: 'Manual Adjustment',
};

const referenceTypeLabel = ( value: string ) =>
	REFERENCE_TYPE_LABELS[ value ] || value;

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
				path: `/loyaltybay/v1/ledger?${ params.toString() }`,
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
				path: `/loyaltybay/v1/user-points`,
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
			`loyaltybay_ledger_${ filenameSuffix }_${
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
				path: `/loyaltybay/v1/ledger?${ params.toString() }`,
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
						{ __( 'Select bulk action', 'loyaltybay' ) }
					</label>
					<select
						id="bulk-action-selector-top"
						value={ bulkAction }
						onChange={ ( e ) => setBulkAction( e.target.value ) }
					>
						<option value="">
							{ __( 'Bulk actions', 'loyaltybay' ) }
						</option>
						<option value="export_selected">
							{ __( 'Export Selected', 'loyaltybay' ) }
						</option>
					</select>
					<ClassicButton
						variant="secondary"
						className="action"
						disabled={ ! bulkAction || selected.length === 0 }
						onClick={ handleApplyBulkAction }
					>
						{ __( 'Apply', 'loyaltybay' ) }
					</ClassicButton>
				</div>
			) }
			<div className="tablenav-pages">
				<span className="displaying-num">
					{ total === 1
						? __( '1 item', 'loyaltybay' )
						: `${ total } ${ __( 'items', 'loyaltybay' ) }` }
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
							{ __( 'First page', 'loyaltybay' ) }
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
							{ __( 'Previous page', 'loyaltybay' ) }
						</span>
						<span aria-hidden="true">‹</span>
					</button>
					<span className="paging-input">
						<form
							onSubmit={ handlePageInputSubmit }
							className="lb-inline"
						>
							<label
								htmlFor={ `current-page-selector-${ position }` }
								className="screen-reader-text"
							>
								{ __( 'Current Page', 'loyaltybay' ) }
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
								{ __( 'of', 'loyaltybay' ) }{ ' ' }
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
							{ __( 'Next page', 'loyaltybay' ) }
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
							{ __( 'Last page', 'loyaltybay' ) }
						</span>
						<span aria-hidden="true">»</span>
					</button>
				</span>
			</div>
		</div>
	);

	const adjustFields: SettingsField[] = [
		{
			id: 'lb-adjust-user',
			label: __( 'User', 'loyaltybay' ),
			render: () => (
				<ClassicMultiSelect
					id="lb-adjust-user"
					differentDropdownWidth
					value={ adjUserId ? [ parseInt( adjUserId ) ] : [] }
					onChange={ ( val ) =>
						setAdjUserId(
							val.length > 0
								? val[ val.length - 1 ].toString()
								: ''
						)
					}
					endpoint="/loyaltybay/v1/user-points/search-users"
					placeholder={ __( 'Search users…', 'loyaltybay' ) }
					size="regular"
				/>
			),
		},
		{
			id: 'lb-adjust-type',
			label: __( 'Type', 'loyaltybay' ),
			render: () => (
				<ClassicSelect
					id="lb-adjust-type"
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
			id: 'lb-adjust-amount',
			label: __( 'Amount', 'loyaltybay' ),
			render: () => (
				<ClassicInput
					id="lb-adjust-amount"
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
			id: 'lb-adjust-reason',
			label: __( 'Reason', 'loyaltybay' ),
			render: () => (
				<ClassicInput
					id="lb-adjust-reason"
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
		<div className="wrap lb-ledger-page">
			<div className="lb-flex lb-items-center lb-justify-between">
				<h1 className="wp-heading-inline lb-ignore-preflight">
					{ __( 'Points History', 'loyaltybay' ) }
				</h1>
				<div className="lb-flex lb-gap-2">
					<ClassicButton
						variant="secondary"
						onClick={ handleExportAllCSV }
					>
						{ __( 'Export to CSV', 'loyaltybay' ) }
					</ClassicButton>
					<ClassicButton
						variant="primary"
						onClick={ () => setAdjustOpen( true ) }
					>
						{ __( 'Adjust Points', 'loyaltybay' ) }
					</ClassicButton>
				</div>
			</div>
			<hr className="wp-header-end" />

			<CustomModal
				isOpen={ adjustOpen }
				onClose={ () => setAdjustOpen( false ) }
				title={ __( 'Adjust Points', 'loyaltybay' ) }
				classNames={ { body: '!lb-overflow-visible' } }
				footer={
					<ClassicButton
						variant="primary"
						type="submit"
						form="lb-adjust-points-form"
					>
						{ __( 'Submit', 'loyaltybay' ) }
					</ClassicButton>
				}
			>
				<form id="lb-adjust-points-form" onSubmit={ handleAdjust }>
					<ClassicSettingsTable fields={ adjustFields } />
				</form>
			</CustomModal>

			<form
				onSubmit={ handleApplyFilters }
				className="tablenav top lb-mt-4"
			>
				<div className="alignleft actions lb-flex lb-gap-2 lb-items-center">
					<label
						className="screen-reader-text"
						htmlFor="ledger-search-input"
					>
						{ __( 'Search Ledger', 'loyaltybay' ) }
					</label>
					<input
						type="search"
						id="ledger-search-input"
						value={ searchInput }
						onChange={ ( e ) => setSearchInput( e.target.value ) }
						placeholder={ __(
							'Search by user name or email',
							'loyaltybay'
						) }
					/>

					<label
						htmlFor="filter-by-type"
						className="screen-reader-text"
					>
						{ __( 'Filter by type', 'loyaltybay' ) }
					</label>
					<select
						id="filter-by-type"
						value={ pendingTransactionType }
						onChange={ ( e ) =>
							setPendingTransactionType( e.target.value )
						}
					>
						<option value="">
							{ __( 'All types', 'loyaltybay' ) }
						</option>
						<option value="credit">
							{ __( 'Credit', 'loyaltybay' ) }
						</option>
						<option value="debit">
							{ __( 'Debit', 'loyaltybay' ) }
						</option>
					</select>

					<label
						htmlFor="filter-by-reference"
						className="screen-reader-text"
					>
						{ __( 'Filter by reference', 'loyaltybay' ) }
					</label>
					<select
						id="filter-by-reference"
						value={ pendingReferenceType }
						onChange={ ( e ) =>
							setPendingReferenceType( e.target.value )
						}
					>
						<option value="">
							{ __( 'All references', 'loyaltybay' ) }
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
						value={ __( 'Apply Filters', 'loyaltybay' ) }
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
										className={ `lb-status-pill lb-status-pill--${ item.transaction_type }` }
									>
										{ item.transaction_type === 'credit'
											? __( 'Credit', 'loyaltybay' )
											: __( 'Debit', 'loyaltybay' ) }
									</span>
								);
							if ( columnKey === 'reference' )
								return (
									<span
										className={ `lb-status-pill lb-status-pill--reference` }
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
