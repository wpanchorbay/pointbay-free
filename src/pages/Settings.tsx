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

interface SettingsData {
	earning_pointsPerDollar: number;
	earning_pointsForRegistration: number;
	earning_pointsForReview: number;
	earning_orderStatusTrigger: string;
	redemption_pointsValue: number;
	redemption_mode: string;
	redemption_minPoints: number;
	referrals_enabled: boolean;
	referrals_bonusPoints: number;
	display_guestNoticeEnabled: boolean;
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
								onChange={ ( e ) =>
									setSettings( {
										...settings,
										earning_orderStatusTrigger:
											e.target.value,
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
				] }
			/>

			<ClassicSettingsTable
				title={ __( 'Redemption Rules', 'pointbay-loyalty-points-referral-rewards-woo' ) }
				description={ __(
					'Configure how points are converted to discounts.',
					'pointbay-loyalty-points-referral-rewards-woo'
				) }
				fields={ [
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
								onChange={ ( e ) =>
									setSettings( {
										...settings,
										redemption_mode: e.target.value,
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
				] }
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
				] }
			/>

			{
				applyFilters(
					'pointbay_settings_sections',
					null,
					settings,
					setSettings
				) as React.ReactNode
			}
		</div>
	);
};

export default Settings;
