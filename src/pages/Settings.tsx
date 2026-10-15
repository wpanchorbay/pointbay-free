import React, { useState, useEffect } from 'react';
import {
	ClassicSettingsTable,
	ClassicInput,
	ClassicSelect,
	ClassicCheckbox,
} from '../components/classics';
import { useToast } from '../store/toast/use-toast';
import { __ } from '@wordpress/i18n';
import { applyFilters } from '@wordpress/hooks';
import { SkeletonSettings } from '../components/loading/SkeletonSettings';
import { TopProgressBar } from '../components/loading/TopProgressBar';
import apiFetch from '../utils/apiFetch';
import { BuyProLock } from '../components/common/BuyProLock';
import { VipTiersPreview } from '../components/upsell/VipTiersPreview';
import { LicenseSettingsPreview } from '../components/upsell/LicenseSettingsPreview';
import { usePointBayStore } from '../store/pointbayStore';
import { EarningBandsField } from '../components/settings/EarningBandsField';

interface SettingsData {
	earning_pointsPerDollar: number;
	earning_pointsForRegistration: number;
	earning_pointsForReview: number;
	earning_orderStatusTrigger: string;
	earning_basis: string;
	earning_flatPointsPerOrder: number;
	earning_firstOrderBonus: number;
	earning_bands: any[];
	earning_bandMode: string;
	earning_multiplyFlatBonus: boolean;
	earning_multiplyFirstOrderBonus: boolean;
	earning_reverseOnCancel: boolean;
	earning_minCartSpend: number;
	earning_pointsForComment: number;
	earning_commentRequireApproval: boolean;
	earning_commentDailyLimit: number;
	redemption_pointsValue: number;
	redemption_mode: string;
	redemption_minPoints: number;
	redemption_allowPartial: boolean;
	redemption_hideCouponForm: boolean;
	referrals_enabled: boolean;
	referrals_bonusPoints: number;
	display_guestNoticeEnabled: boolean;
	display_productNoticeEnabled: boolean;
	display_minSpendMessage: string;
	display_commentNoticeEnabled: boolean;
	display_menuBalanceEnabled: boolean;
	display_menuBalanceLocation: string;
	display_menuBalanceFormat: string;
	display_showAdminMenu: boolean;
	advanced_deleteAllOnUninstall: boolean;
	debug_enableMode: boolean;
	[ key: string ]: any;
}

const Settings: React.FC = () => {
	const [ settings, setSettings ] = useState< SettingsData | null >( null );
	const [ originalSettings, setOriginalSettings ] =
		useState< SettingsData | null >( null );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ isLoading, setIsLoading ] = useState( true );
	const { addToast } = useToast();
	const store = usePointBayStore();

	useEffect( () => {
		fetchSettings();
	}, [] );

	useEffect( () => {
		const form = document.getElementById( 'mainform' ) as HTMLFormElement;
		if ( ! form ) return;

		const onFormSubmit = ( e: Event ) => {
			e.preventDefault();
			handleSave();
		};

		form.addEventListener( 'submit', onFormSubmit );
		return () => form.removeEventListener( 'submit', onFormSubmit );
	}, [ settings, originalSettings ] );

	const fetchSettings = async () => {
		try {
			const response: any = await apiFetch( {
				path: 'settings',
			} );
			if ( response.success ) {
				setSettings( response.data );
				setOriginalSettings(
					JSON.parse( JSON.stringify( response.data ) )
				);
			}
		} catch ( error ) {
			addToast( __( 'Failed to load settings.', 'pointbay-loyalty-points-referral-rewards-woo' ), 'error' );
		} finally {
			setIsLoading( false );
		}
	};

	const handleSave = async () => {
		if ( ! settings ) return;
		setIsSaving( true );
		try {
			const response: any = await apiFetch( {
				path: 'settings',
				method: 'POST',
				data: settings,
			} );
			if ( response.success ) {
				setSettings( response.data );
				setOriginalSettings(
					JSON.parse( JSON.stringify( response.data ) )
				);
				addToast(
					__( 'Settings saved successfully.', 'pointbay-loyalty-points-referral-rewards-woo' ),
					'success'
				);

				const nativeSaveButton = document.querySelector(
					'button[name="save"]'
				);
				if ( nativeSaveButton ) {
					( nativeSaveButton as HTMLButtonElement ).disabled = true;
				}
				window.onbeforeunload = null;
			}
		} catch ( error ) {
			addToast( __( 'Failed to save settings.', 'pointbay-loyalty-points-referral-rewards-woo' ), 'error' );
		} finally {
			setIsSaving( false );
			const nativeSaveButton = document.querySelector(
				'button[name="save"]'
			);
			if ( nativeSaveButton ) {
				nativeSaveButton.classList.remove( 'is-busy' );
			}
		}
	};

	const hasChanges =
		JSON.stringify( settings ) !== JSON.stringify( originalSettings );

	useEffect( () => {
		const nativeSaveButton = document.querySelector(
			'button[name="save"]'
		);
		if ( nativeSaveButton ) {
			( nativeSaveButton as HTMLButtonElement ).disabled = ! hasChanges;
		}
	}, [ hasChanges ] );

	if ( isLoading ) {
		return (
			<div className="pointbay-p-page-default">
				<SkeletonSettings />
			</div>
		);
	}

	if ( ! settings ) {
		return (
			<div className="pointbay-p-page-default">
				<p>{ __( 'Failed to load settings.', 'pointbay-loyalty-points-referral-rewards-woo' ) }</p>
			</div>
		);
	}

	// Pro registers this filter at module load time (see pro-extensions.tsx),
	// so a null result here means Pro's script never ran — i.e. Pro isn't
	// active. Used below to decide between rendering Pro's real sections and
	// this file's own locked previews of them.
	const proSections = applyFilters(
		'pointbay_settings_sections',
		null,
		settings,
		setSettings
	) as React.ReactNode;
	const isProActive = proSections !== null;

	return (
		<div className="pointbay-p-page-default pointbay-ignore-preflight">
			<input
				type="hidden"
				name="pointbay_has_changes"
				value={ hasChanges ? '1' : '0' }
			/>
			<TopProgressBar isSaving={ isSaving } />

			<ClassicSettingsTable
				title={ __( 'Earning Points', 'pointbay-loyalty-points-referral-rewards-woo' ) }
				description={ __(
					'Configure how customers earn loyalty points.',
					'pointbay-loyalty-points-referral-rewards-woo'
				) }
				fields={ [
					{
						id: 'earning_pointsPerDollar',
						label: __( 'Points Per Dollar', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicInput
								type="number"
								min="0"
								value={ settings.earning_pointsPerDollar }
								onChange={ ( e ) =>
									setSettings( {
										...settings,
										earning_pointsPerDollar:
											parseInt( e.target.value ) || 0,
									} )
								}
								description={ __(
									'How many points the customer earns for every $1 spent.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
								size="small"
							/>
						),
					},
					{
						id: 'earning_pointsForRegistration',
						label: __( 'Points for Registration', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicInput
								type="number"
								min="0"
								value={ settings.earning_pointsForRegistration }
								onChange={ ( e ) =>
									setSettings( {
										...settings,
										earning_pointsForRegistration:
											parseInt( e.target.value ) || 0,
									} )
								}
								description={ __(
									'Give new users this many points when they register.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
								size="small"
							/>
						),
					},
					{
						id: 'earning_pointsForReview',
						label: __( 'Points for Product Review', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicInput
								type="number"
								min="0"
								value={ settings.earning_pointsForReview }
								onChange={ ( e ) =>
									setSettings( {
										...settings,
										earning_pointsForReview:
											parseInt( e.target.value ) || 0,
									} )
								}
								description={ __(
									'Reward points for an approved product review.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
								size="small"
							/>
						),
					},
					{
						id: 'earning_orderStatusTrigger',
						label: __( 'Order Status Trigger', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicSelect
								value={
									settings.earning_orderStatusTrigger ||
									'completed'
								}
								onChange={ ( value ) =>
									setSettings( {
										...settings,
										earning_orderStatusTrigger:
											value,
									} )
								}
								options={ [
									{ label: 'Completed', value: 'completed' },
									{
										label: 'Processing',
										value: 'processing',
									},
									{ label: 'On Hold', value: 'on-hold' },
								] }
								description={ __(
									'The WooCommerce order status that triggers points crediting.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
					{
						id: 'earning_basis',
						label: __( 'Earn On', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicSelect
								value={ settings.earning_basis }
								onChange={ ( value ) =>
									setSettings( {
										...settings,
										earning_basis: String( value ),
									} )
								}
								options={ [
									{
										label: __( 'Order total (includes shipping and tax)', 'pointbay-loyalty-points-referral-rewards-woo' ),
										value: 'total',
									},
									{
										label: __( 'Subtotal only (excludes shipping and tax)', 'pointbay-loyalty-points-referral-rewards-woo' ),
										value: 'subtotal',
									},
								] }
								description={ __(
									'Which part of the order points are calculated against. Most stores want the subtotal, so customers are not rewarded for expensive shipping. Points paid with redeemed points never earn points back: only the part of the order paid with money counts, in both modes.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
					{
						id: 'earning_flatPointsPerOrder',
						label: __( 'Flat Points Per Order', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicInput
								type="number"
								min="0"
								value={ settings.earning_flatPointsPerOrder }
								onChange={ ( e ) =>
									setSettings( {
										...settings,
										earning_flatPointsPerOrder:
											parseInt( e.target.value ) || 0,
									} )
								}
								description={ __(
									'A fixed bonus on every order, added on top of the points earned from the order value. Set to 0 to disable.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
								size="small"
							/>
						),
					},
					{
						id: 'earning_multiplyFlatBonus',
						label: __( 'Apply Tier Multiplier to Flat Bonus', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicCheckbox
								checked={ !! settings.earning_multiplyFlatBonus }
								onChange={ ( checked ) =>
									setSettings( {
										...settings,
										earning_multiplyFlatBonus: checked,
									} )
								}
								description={ __(
									'When on, a customer on a higher tier earns a proportionally larger flat bonus.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
					{
						id: 'earning_firstOrderBonus',
						label: __( 'First Order Bonus', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicInput
								type="number"
								min="0"
								value={ settings.earning_firstOrderBonus }
								onChange={ ( e ) =>
									setSettings( {
										...settings,
										earning_firstOrderBonus:
											parseInt( e.target.value ) || 0,
									} )
								}
								description={ __(
									"A one-time bonus on a customer's very first order. Awarded once per customer, for life. Set to 0 to disable.",
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
								size="small"
							/>
						),
					},
					{
						id: 'earning_multiplyFirstOrderBonus',
						label: __( 'Apply Tier Multiplier to First Order Bonus', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicCheckbox
								checked={ !! settings.earning_multiplyFirstOrderBonus }
								onChange={ ( checked ) =>
									setSettings( {
										...settings,
										earning_multiplyFirstOrderBonus: checked,
									} )
								}
								description={ __(
									'Usually left off, so the signup bonus you advertise is the amount every new customer actually receives.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
					{
						id: 'earning_reverseOnCancel',
						label: __( 'Take Back Points When an Order Is Cancelled', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicCheckbox
								checked={ settings.earning_reverseOnCancel !== false }
								onChange={ ( checked ) =>
									setSettings( {
										...settings,
										earning_reverseOnCancel: checked,
									} )
								}
								description={ __(
									'When a completed order is cancelled, take back the points earned on it. Cash on delivery orders always do this. If the order is reopened, the points are given back.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
					{
						id: 'earning_minCartSpend',
						label: __( 'Minimum order amount to earn points', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicInput
								type="number"
								min="0"
								step="0.01"
								value={ settings.earning_minCartSpend ?? 0 }
								onChange={ ( e ) =>
									setSettings( {
										...settings,
										earning_minCartSpend:
											parseFloat( e.target.value ) || 0,
									} )
								}
								description={ __(
									'Orders below this amount earn no points at all (flat and first-order bonuses included). Leave 0 to turn this off. Measured the same way points are calculated, so it follows the "points basis" setting above and ignores the part paid with points.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
								size="small"
							/>
						),
					},
					{
						id: 'earning_pointsForComment',
						label: __( 'Points for blog comments', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicInput
								type="number"
								min="0"
								value={ settings.earning_pointsForComment ?? 0 }
								onChange={ ( e ) =>
									setSettings( {
										...settings,
										earning_pointsForComment:
											parseInt( e.target.value ) || 0,
									} )
								}
								description={ __(
									'Points a logged-in customer earns for a comment on a blog post. 0 turns this off. Product reviews are rewarded separately above.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
								size="small"
							/>
						),
					},
					{
						id: 'earning_commentRequireApproval',
						label: __( 'Require comment approval before earning', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicCheckbox
								checked={ !! settings.earning_commentRequireApproval }
								disabled={ ! settings.earning_pointsForComment }
								onChange={ ( val ) =>
									setSettings( {
										...settings,
										earning_commentRequireApproval: val,
									} )
								}
								description={ __(
									'On: points are given when the comment is approved. Off: points are given as soon as the comment is posted (spam never earns). Points are taken back if the comment is later marked as spam, trashed or deleted.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
					{
						id: 'earning_commentDailyLimit',
						label: __( 'Comments that can earn per day', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicInput
								type="number"
								min="0"
								disabled={ ! settings.earning_pointsForComment }
								value={ settings.earning_commentDailyLimit ?? 0 }
								onChange={ ( e ) =>
									setSettings( {
										...settings,
										earning_commentDailyLimit:
											parseInt( e.target.value ) || 0,
									} )
								}
								description={ __(
									'Per customer, per day. 0 means no limit.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
								size="small"
							/>
						),
					},
					{
						id: 'earning_bandMode',
						label: __( 'Band Type', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicSelect
								value={ settings.earning_bandMode }
								onChange={ ( value ) =>
									setSettings( {
										...settings,
										earning_bandMode: String( value ),
									} )
								}
								options={ [
									{
										label: __( 'A fixed number of points', 'pointbay-loyalty-points-referral-rewards-woo' ),
										value: 'fixed',
									},
									{
										label: __( 'A points-per-dollar rate', 'pointbay-loyalty-points-referral-rewards-woo' ),
										value: 'rate',
									},
								] }
								description={ __(
									'What each band below awards. Fixed gives every order in the band the same points; rate multiplies the order value by the band figure.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
					{
						id: 'earning_bands',
						label: __( 'Order Value Bands', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<EarningBandsField
								bands={ settings.earning_bands || [] }
								bandMode={ settings.earning_bandMode }
								onChange={ ( bands ) =>
									setSettings( {
										...settings,
										earning_bands: bands,
									} )
								}
							/>
						),
					},
				] }
			/>

			<ClassicSettingsTable
				title={ __( 'Redemption Rules', 'pointbay-loyalty-points-referral-rewards-woo' ) }
				description={ __(
					'Configure how points are converted to discounts.',
					'pointbay-loyalty-points-referral-rewards-woo'
				) }
				fields={
					applyFilters(
						'pointbay_redemption_settings_fields',
						[
							{
								id: 'redemption_pointsValue',
								label: __( 'Point Value ($)', 'pointbay-loyalty-points-referral-rewards-woo' ),
								render: () => (
									<ClassicInput
										type="number"
										step="0.01"
										min="0.01"
										value={ settings.redemption_pointsValue }
										onChange={ ( e ) =>
											setSettings( {
												...settings,
												redemption_pointsValue:
													parseFloat( e.target.value ) ||
													0.01,
											} )
										}
										description={ __(
											'The monetary value of a single point.',
											'pointbay-loyalty-points-referral-rewards-woo'
										) }
										size="small"
									/>
								),
							},
							{
								id: 'redemption_mode',
								label: __( 'Redemption Mode', 'pointbay-loyalty-points-referral-rewards-woo' ),
								render: () => (
									<ClassicSelect
										value={ settings.redemption_mode }
										onChange={ ( value ) =>
											setSettings( {
												...settings,
												redemption_mode: value,
											} )
										}
										options={ [
											{
												label: __(
													'Cart Fee (WC_Fee)',
													'pointbay-loyalty-points-referral-rewards-woo'
												),
												value: 'fee',
											},
											{
												label: __(
													'Virtual Coupon (WC_Coupon)',
													'pointbay-loyalty-points-referral-rewards-woo'
												),
												value: 'coupon',
											},
										] }
										description={ __(
											'How the discount is applied to the cart.',
											'pointbay-loyalty-points-referral-rewards-woo'
										) }
									/>
								),
							},
							{
								id: 'redemption_minPoints',
								label: __( 'Minimum Points to Redeem', 'pointbay-loyalty-points-referral-rewards-woo' ),
								render: () => (
									<ClassicInput
										type="number"
										min="0"
										value={ settings.redemption_minPoints }
										onChange={ ( e ) =>
											setSettings( {
												...settings,
												redemption_minPoints:
													parseInt( e.target.value ) || 0,
											} )
										}
										description={ __(
											'The minimum amount of points needed before the redemption form is shown.',
											'pointbay-loyalty-points-referral-rewards-woo'
										) }
										size="small"
									/>
								),
							},
							{
								id: 'redemption_allowPartial',
								label: __( 'Let Customers Choose the Amount', 'pointbay-loyalty-points-referral-rewards-woo' ),
								render: () => (
									<ClassicCheckbox
										checked={ !! settings.redemption_allowPartial }
										onChange={ ( checked ) =>
											setSettings( {
												...settings,
												redemption_allowPartial: checked,
											} )
										}
										description={ __(
											'When on, the checkout shows a slider so the customer can spend part of their balance. When off, redemption is all-or-nothing.',
											'pointbay-loyalty-points-referral-rewards-woo'
										) }
									/>
								),
							},
							{
								id: 'redemption_hideCouponForm',
								label: __( 'Hide Coupon Form While Points Are Applied', 'pointbay-loyalty-points-referral-rewards-woo' ),
								render: () => (
									<ClassicCheckbox
										checked={ !! settings.redemption_hideCouponForm }
										onChange={ ( checked ) =>
											setSettings( {
												...settings,
												redemption_hideCouponForm: checked,
											} )
										}
										description={ __(
											'Stops customers stacking a coupon on top of a points discount by hiding the coupon box once points are applied.',
											'pointbay-loyalty-points-referral-rewards-woo'
										) }
									/>
								),
							},
						],
						settings,
						setSettings
					) as any[]
				}
			/>

			<ClassicSettingsTable
				title={ __( 'Referrals', 'pointbay-loyalty-points-referral-rewards-woo' ) }
				description={ __(
					'Reward customers for referring their friends.',
					'pointbay-loyalty-points-referral-rewards-woo'
				) }
				fields={
					applyFilters(
						'pointbay_referral_settings_fields',
						[
							...( isProActive
								? []
								: [
										{
											id: 'referrals_newCustomerPoints_locked',
											label: __(
												'New Customer Bonus Points',
												'pointbay-loyalty-points-referral-rewards-woo'
											),
											render: () => (
												<BuyProLock
													feature={ __(
														'Reward the new customer too, not just the referrer — only in PointBay Pro',
														'pointbay-loyalty-points-referral-rewards-woo'
													) }
												>
													<input
														type="number"
														value={ 100 }
														disabled
														readOnly
														className="small-text"
													/>
													<p className="description pointbay-block pointbay-mt-1">
														{ __(
															"Points awarded to the new customer themselves after their first purchase via a referral link.",
															'pointbay-loyalty-points-referral-rewards-woo'
														) }
													</p>
												</BuyProLock>
											),
										},
									] ),
							{
								id: 'referrals_enabled',
								label: __( 'Enable Referrals', 'pointbay-loyalty-points-referral-rewards-woo' ),
								render: () => (
									<ClassicCheckbox
										checked={ settings.referrals_enabled }
										onChange={ ( val ) =>
											setSettings( {
												...settings,
												referrals_enabled: val,
											} )
										}
										label={ __(
											'Turn on the referral program',
											'pointbay-loyalty-points-referral-rewards-woo'
										) }
										description={ __(
											'Gives every customer a shareable link that credits them when a friend they refer completes a first order.',
											'pointbay-loyalty-points-referral-rewards-woo'
										) }
									/>
								),
							},
							{
								id: 'referrals_bonusPoints',
								label: __( 'Referral Bonus Points', 'pointbay-loyalty-points-referral-rewards-woo' ),
								render: () => (
									<ClassicInput
										type="number"
										min="0"
										disabled={ ! settings.referrals_enabled }
										value={ settings.referrals_bonusPoints }
										onChange={ ( e ) =>
											setSettings( {
												...settings,
												referrals_bonusPoints:
													parseInt( e.target.value ) || 0,
											} )
										}
										description={ __(
											"Points awarded to the referrer after the new customer's first purchase.",
											'pointbay-loyalty-points-referral-rewards-woo'
										) }
										size="small"
									/>
								),
							},
						],
						settings,
						setSettings
					) as any[]
				}
			/>

			<ClassicSettingsTable
				title={ __( 'Display & System', 'pointbay-loyalty-points-referral-rewards-woo' ) }
				description={ __(
					'Additional display and maintenance options.',
					'pointbay-loyalty-points-referral-rewards-woo'
				) }
				fields={ [
					{
						id: 'display_guestNoticeEnabled',
						label: __( 'Guest Notice', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicCheckbox
								checked={ settings.display_guestNoticeEnabled }
								onChange={ ( val ) =>
									setSettings( {
										...settings,
										display_guestNoticeEnabled: val,
									} )
								}
								label={ __(
									'Show login/register prompt on checkout',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
					{
						id: 'display_productNoticeEnabled',
						label: __( 'Product Page Earn Notice', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicCheckbox
								checked={ !! settings.display_productNoticeEnabled }
								onChange={ ( val ) =>
									setSettings( {
										...settings,
										display_productNoticeEnabled: val,
									} )
								}
								label={ __(
									'Show how many points a product will earn',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
								description={ __(
									'Displays the points figure under the price on each product page.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
					{
						id: 'display_minSpendMessage',
						label: __( 'Minimum spend message', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicInput
								type="text"
								value={ settings.display_minSpendMessage || '' }
								placeholder={ __( 'Spend {amount} more to earn {points} points.', 'pointbay-loyalty-points-referral-rewards-woo' ) }
								onChange={ ( e ) =>
									setSettings( {
										...settings,
										display_minSpendMessage:
											e.target.value,
									} )
								}
								description={ __(
									'Shown on the product page, cart and checkout when the order is below the minimum. Use {amount} for what is left to spend and {points} for the points they will earn once the minimum is reached. Leave empty for the default.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
								size="regular"
							/>
						),
					},
					{
						id: 'display_commentNoticeEnabled',
						label: __( 'Comment Form Earn Notice', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicCheckbox
								checked={ !! settings.display_commentNoticeEnabled }
								onChange={ ( val ) =>
									setSettings( {
										...settings,
										display_commentNoticeEnabled: val,
									} )
								}
								label={ __( 'Show points notice on the comment form', 'pointbay-loyalty-points-referral-rewards-woo' ) }
								description={ __(
									'Tells logged-in customers how many points a blog comment earns.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
					{
						id: 'display_menuBalanceEnabled',
						label: __( 'Balance in Site Menu', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicCheckbox
								checked={ !! settings.display_menuBalanceEnabled }
								onChange={ ( val ) =>
									setSettings( {
										...settings,
										display_menuBalanceEnabled: val,
									} )
								}
								label={ __(
									"Show the customer's balance in the navigation and toolbar",
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
								description={ __(
									'Block themes do not use classic navigation menus. On those, use the toolbar entry or place the [pointbay_balance] shortcode in a header block.',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
					{
						id: 'display_menuBalanceLocation',
						label: __( 'Menu Location', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicInput
								type="text"
								disabled={ ! settings.display_menuBalanceEnabled }
								value={ settings.display_menuBalanceLocation || '' }
								onChange={ ( e ) =>
									setSettings( {
										...settings,
										display_menuBalanceLocation: e.target.value,
									} )
								}
								description={ __(
									"The theme menu location to append the balance to, e.g. 'primary'.",
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
								size="regular"
							/>
						),
					},
					{
						id: 'display_menuBalanceFormat',
						label: __( 'Balance Format', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicInput
								type="text"
								disabled={ ! settings.display_menuBalanceEnabled }
								value={ settings.display_menuBalanceFormat || '' }
								onChange={ ( e ) =>
									setSettings( {
										...settings,
										display_menuBalanceFormat: e.target.value,
									} )
								}
								description={ __(
									'How the balance reads. {points} is replaced with the number, e.g. "{points} pts".',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
								size="regular"
							/>
						),
					},
					{
						id: 'display_showAdminMenu',
						label: __( 'Admin Sidebar Menu', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicCheckbox
								checked={ settings.display_showAdminMenu }
								onChange={ ( val ) =>
									setSettings( {
										...settings,
										display_showAdminMenu: val,
									} )
								}
								label={ __(
									'Show a dedicated PointBay menu in the WordPress admin sidebar (Points History and Loyalty settings stay available under WooCommerce either way)',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
					{
						id: 'setup_wizard',
						label: __( 'Setup Wizard', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<a
								href={ store.pluginData?.setup_wizard_url }
								className="button"
							>
								{ __(
									'Run Setup Wizard',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							</a>
						),
					},
					{
						id: 'advanced_deleteAllOnUninstall',
						label: __( 'Delete Data on Uninstall', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicCheckbox
								checked={
									settings.advanced_deleteAllOnUninstall
								}
								onChange={ ( val ) =>
									setSettings( {
										...settings,
										advanced_deleteAllOnUninstall: val,
									} )
								}
								label={ __(
									'Purge all ledger data upon deletion',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
					{
						id: 'debug_enableMode',
						label: __( 'Debug Logging', 'pointbay-loyalty-points-referral-rewards-woo' ),
						render: () => (
							<ClassicCheckbox
								checked={ settings.debug_enableMode }
								onChange={ ( val ) =>
									setSettings( {
										...settings,
										debug_enableMode: val,
									} )
								}
								label={ __(
									'Write diagnostic messages to the WordPress debug log',
									'pointbay-loyalty-points-referral-rewards-woo'
								) }
							/>
						),
					},
				] }
			/>

			{ isProActive ? (
				proSections
			) : (
				<>
					<VipTiersPreview />
					<LicenseSettingsPreview />
				</>
			) }
		</div>
	);
};

export default Settings;
