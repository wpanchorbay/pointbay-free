import { createRoot } from 'react-dom/client';
import './styles/index.scss';
import SettingsApp from './SettingsApp';
import { registerLoyaltyBayRegistry } from './registry';

registerLoyaltyBayRegistry();

const rootElement = document.getElementById( 'loyaltybay' );
if ( rootElement ) {
	createRoot( rootElement ).render( <SettingsApp /> );
}
